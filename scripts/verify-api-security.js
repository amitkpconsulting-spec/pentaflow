/**
 * PentaFlow — APIsecurity.md Pre-Build & Pre-Flight Security Gate
 * Enforces:
 * 1. Zero hardcoded Google/Gemini API keys (AIzaSy...) across source, config, and batch launchers.
 * 2. Zero client-side bundle exposure (no GEMINI_API_KEY in vite.config.ts or src/).
 * 3. Mandatory .gitignore protection for .env* files to safeguard developer & user BYOK keys.
 * 4. BYOK (Bring Your Own Key) readiness verification for current and upcoming builds.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const requireKey = args.includes('--require-key');

const PLACEHOLDER_KEYS = new Set([
  '',
  'MY_GEMINI_API_KEY',
  'YOUR_GEMINI_API_KEY',
  'YOUR_GEMINI_API_KEY_HERE',
  'REPLACE_WITH_YOUR_GEMINI_API_KEY',
  'PLACEHOLDER',
  'changeme',
]);

// Regex for literal Google Cloud / Gemini API keys (starts with AIza followed by 35 base64url chars)
const GOOGLE_API_KEY_REGEX = /AIza[0-9A-Za-z\-_]{35}/g;

const violations = [];

function walkFiles(dirPath, collected = []) {
  if (!fs.existsSync(dirPath)) return collected;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === 'build' ||
      entry.name === '.git' ||
      entry.name === 'bin'
    ) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, collected);
    } else if (/\.(ts|tsx|js|json|bat|html|md|example)$/i.test(entry.name)) {
      collected.push(fullPath);
    }
  }
  return collected;
}

// 1. Verify APIsecurity.md specification exists
const apiSecurityDocPath = path.join(ROOT_DIR, 'APIsecurity.md');
if (!fs.existsSync(apiSecurityDocPath)) {
  violations.push('Missing mandatory skill specification file: APIsecurity.md');
}

// 2. Scan repository files for hardcoded Google/Gemini API keys
const filesToScan = [
  ...walkFiles(path.join(ROOT_DIR, 'src')),
  ...walkFiles(path.join(ROOT_DIR, 'scripts')),
  path.join(ROOT_DIR, 'server.ts'),
  path.join(ROOT_DIR, 'vite.config.ts'),
  path.join(ROOT_DIR, 'setup.bat'),
  path.join(ROOT_DIR, 'start.bat'),
  path.join(ROOT_DIR, '.env.example'),
  path.join(ROOT_DIR, 'index.html'),
].filter((f) => fs.existsSync(f));

for (const filePath of filesToScan) {
  const relPath = path.relative(ROOT_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for hardcoded AIza... keys
  const matches = content.match(GOOGLE_API_KEY_REGEX);
  if (matches && matches.length > 0) {
    violations.push(
      `[HARDCODED_KEY] Literal Google/Gemini API key detected in "${relPath}". Hardcoding developer keys is strictly prohibited by APIsecurity.md.`
    );
  }

  // Check client-side files (src/**) for forbidden direct env key access
  if (relPath.startsWith(`src${path.sep}`) || relPath.startsWith('src/')) {
    if (content.includes('process.env.GEMINI_API_KEY') || content.includes('VITE_GEMINI_API_KEY')) {
      violations.push(
        `[CLIENT_BUNDLE_LEAK] "${relPath}" references GEMINI_API_KEY directly in client code. All Gemini calls must route through server.ts (/api/*).`
      );
    }
  }
}

// 3. Check vite.config.ts for define block key injection
const viteConfigPath = path.join(ROOT_DIR, 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  const viteContent = fs.readFileSync(viteConfigPath, 'utf8');
  const uncommentedLines = viteContent
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
    .join('\n');
  if (uncommentedLines.includes('GEMINI_API_KEY')) {
    violations.push(
      '[VITE_DEFINE_LEAK] vite.config.ts exposes GEMINI_API_KEY to the client bundle. Remove any define mapping for GEMINI_API_KEY.'
    );
  }
}

// 4. Verify .gitignore protects .env
const gitignorePath = path.join(ROOT_DIR, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  if (!gitignoreContent.includes('.env')) {
    violations.push('[GITIGNORE_MISSING] .gitignore must exclude .env* files to protect BYOK credentials.');
  }
}

// 5. Inspect BYOK status in .env or process.env
let resolvedKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const envFilePath = path.join(ROOT_DIR, '.env');
if (!resolvedKey && fs.existsSync(envFilePath)) {
  const envLines = fs.readFileSync(envFilePath, 'utf8').split(/\r?\n/);
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^GEMINI_API_KEY\s*=\s*(.*)$/);
    if (match) {
      resolvedKey = match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
}

const isByokConfigured = Boolean(resolvedKey && !PLACEHOLDER_KEYS.has(resolvedKey) && resolvedKey.length >= 20);

if (requireKey && !isByokConfigured) {
  violations.push(
    '[BYOK_REQUIRED] GEMINI_API_KEY is not populated in .env or environment secrets. Populate your own BYOK key before running with --require-key.'
  );
}

if (violations.length > 0) {
  console.error('\n============================================================================');
  console.error('  [APIsecurity.md] SECURITY VERIFICATION FAILED');
  console.error('============================================================================');
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  console.error('============================================================================\n');
  process.exit(1);
}

console.log('[APIsecurity] Zero hardcoded keys verified across source & build configuration.');
console.log('[APIsecurity] Server-side proxy isolation verified (no client-side GEMINI_API_KEY exposure).');
if (isByokConfigured) {
  const masked = `${resolvedKey.slice(0, 4)}...${resolvedKey.slice(-4)}`;
  console.log(`[APIsecurity] Custom BYOK GEMINI_API_KEY detected (${masked}) — Server-side Gemini AI enabled.`);
} else {
  console.log(
    '[APIsecurity] BYOK GEMINI_API_KEY is currently unset in .env — Requirement: set GEMINI_API_KEY in .env (or Secrets) to enable cloud Gemini AI; Air-Gapped Deterministic Engine remains active.'
  );
}
process.exit(0);

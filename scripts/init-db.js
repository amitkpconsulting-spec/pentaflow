/**
 * PentaFlow — Idempotent Local Storage & Catalog Provisioning Script
 * Verifies required directories (data/, logs/, uploads/) and initializes
 * the local catalog store (data/pentaflow_catalog.json) if not present.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DIRS = ['data', 'logs', 'uploads'];
const DB_FILE = path.join(ROOT_DIR, 'data', 'pentaflow_catalog.json');

try {
  for (const dir of DIRS) {
    const fullPath = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`[INIT] Created directory: ${dir}/`);
    }
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialCatalog = {
      schemaVersion: '2.1.0',
      application: 'PentaFlow - Enterprise Structured Data Flow & DQ DAMA Studio',
      storageEngine: 'local-json-and-browser-localstorage',
      browserStorageKey: 'enterprise_dfd_custom_flow_templates',
      initializedAt: new Date().toISOString(),
      defaultEngine: 'airgapped-deterministic',
      presets: [
        'fin-cross-border-settlement',
        'tx-credit-card-payment',
        'retail-customer-onboarding',
        'kyc-aml-identity-verification',
        'hipaa-clinical-telemetry'
      ],
      customFlows: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialCatalog, null, 2), 'utf8');
    console.log(`[INIT] Provisioned local catalog store: ${DB_FILE}`);
  } else {
    console.log(`[INIT] Verified existing catalog store: ${DB_FILE}`);
  }

  console.log('[INIT] Storage provisioning complete (Idempotent OK).');
  process.exit(0);
} catch (err) {
  console.error('[INIT ERROR] Failed to provision local storage:', err);
  process.exit(1);
}

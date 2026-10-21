import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;

/**
 * APIsecurity.md — Mandatory BYOK (Bring Your Own Key) Validation Gate
 * Ensures no developer key is ever hardcoded and rejects empty/placeholder strings.
 */
const PLACEHOLDER_KEYS = new Set([
  '',
  'MY_GEMINI_API_KEY',
  'YOUR_GEMINI_API_KEY',
  'YOUR_GEMINI_API_KEY_HERE',
  'REPLACE_WITH_YOUR_GEMINI_API_KEY',
  'PLACEHOLDER',
  'changeme',
]);

export function getByokGeminiConfig(): {
  apiKey: string | null;
  model: string;
  configured: boolean;
} {
  const rawKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  const apiKey = !rawKey || PLACEHOLDER_KEYS.has(rawKey) || rawKey.length < 20 ? null : rawKey;
  const model = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim().replace(/^["']|["']$/g, '');
  return {
    apiKey,
    model: model || 'gemini-3.8-flash',
    configured: Boolean(apiKey),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Safe Server-Side BYOK Readiness Endpoint (never exposes the key to the client)
  app.get('/api/ai/security-status', (_req, res) => {
    const config = getByokGeminiConfig();
    res.json({
      securitySkill: 'APIsecurity.md',
      byokConfigured: config.configured,
      model: config.model,
      keyHardcoded: false,
      requirementNote: config.configured
        ? 'Custom BYOK GEMINI_API_KEY is active on server.'
        : 'GEMINI_API_KEY is required in .env or Platform Secrets to enable cloud AI; using Air-Gapped Deterministic Engine.',
    });
  });

  // AI Context Ingestion Endpoint for the 10-Dimension Ingestion Channel
  app.post('/api/ai/ingest-architecture', async (req, res) => {
    const { narrative, currentChannel, systemName } = req.body || {};

    if (!narrative || typeof narrative !== 'string') {
      res.status(400).json({ error: 'Missing context narrative.' });
      return;
    }

    const { apiKey, model, configured } = getByokGeminiConfig();
    if (!configured || !apiKey) {
      // Let client use its built-in deterministic semantic engine when no BYOK API key is configured
      res.status(503).json({
        byokRequired: true,
        securitySkill: 'APIsecurity.md',
        error:
          'BYOK GEMINI_API_KEY not configured in .env or Secrets; falling back to local deterministic semantic engine.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `You are the PentaFlow & DPDP-TRACE Regulatory Data Flow & Topology Architect.
Ingest the following Context of Processing narrative for system "${systemName || 'Enterprise Architecture'}" and return ONLY a valid JSON object matching the 10-Dimension IngestionChannelData schema.

CONTEXT NARRATIVE:
"""
${narrative}
"""

CURRENT BASE DATA:
${JSON.stringify(currentChannel || {}, null, 2)}

Return ONLY valid JSON with this structure:
{
  "summary": "1-sentence summary of ingested assets, privacy controls, cross-border zones, and RoPA scope",
  "channel": {
    "rawContextNarrative": "string",
    "contextOfProcessing": {
      "businessPurpose": "string",
      "sector": "SEC_FINTECH | SEC_HEALTH | SEC_RETAIL | SEC_TECH | SEC_GOV",
      "entityScope": "Application | AI_Launch | Project | Enterprise_Process",
      "lawfulBasis": "Consent (Sec 6) | Legitimate Use (Sec 7) | Contractual Delivery | Statutory Obligation | None - Non-Compliant",
      "dataPrincipalCohort": ["string"],
      "processesChildData": false
    },
    "dataUsage": {
      "processingActivities": ["string"],
      "usesAiMlModels": false,
      "aiModelDetails": "string",
      "automatedDecisioning": false
    },
    "dataMovement": {
      "ingressChannels": ["string"],
      "transitProtocols": ["string"],
      "isEncryptedInTransit": true,
      "movementCadence": "Real-time (<150ms) | Streaming (<1s) | Micro-batch (15m) | Daily Batch 00:00"
    },
    "dataStorage": {
      "repositories": ["string"],
      "encryptionAtRest": "AES-256-GCM + HSM | AES-256-GCM | TDE Standard | Unencrypted",
      "primaryRegion": "string",
      "retentionSchedule": "string"
    },
    "dataPrivacy": {
      "piiCategories": ["string"],
      "consentManager": "string",
      "privacyControls": ["string"],
      "readinessGates": {
        "noticeItemisation": "Pass | Partial | Fail",
        "consentWithdrawalParity": "Pass | Partial | Fail",
        "childTrackingProhibition": "Pass | Partial | Fail",
        "erasureOnPurposeExhaustion": "Pass | Partial | Fail",
        "dpbi72HrBreachReadiness": "Pass | Partial | Fail",
        "nominationFacility": "Pass | Partial | Fail"
      }
    },
    "infrastructureComponent": {
      "hostingClusters": ["string"],
      "securityZones": ["string"]
    },
    "crossBorderComponent": {
      "hasCrossBorderTransfer": false,
      "destinationJurisdictions": ["IN"],
      "foreignCloudRegions": ["string"],
      "transferSafeguard": "Sovereign Whitelist (Sec 16) | Standard Contractual Clauses | Unverified Transfer"
    },
    "trustedAppsAndSources": [
      {
        "id": "APP-01",
        "name": "string",
        "category": "Web/Mobile App | Core DB | Cloud Lake | AI Model | TPRM Processor",
        "risk": "HIGH | MEDIUM | LOW",
        "piiTypes": "string",
        "trusted": true,
        "protocol": "string",
        "location": "string"
      }
    ],
    "thirdPartyInvolvement": {
      "hasThirdPartyProcessors": true,
      "processors": [
        {
          "id": "TPRM-01",
          "name": "string",
          "role": "Data Processor | Sub-Processor | Third-Party SDK | External Partner API",
          "purpose": "string",
          "contractStatus": "Signed Sec 8(2) DPA | Pending Review | No Formal Contract",
          "destinationCountry": "IN"
        }
      ]
    },
    "ropaMapping": {
      "isHighVolumeProcessing": true,
      "ropaRecordId": "ROPA-2026-01",
      "estimatedVolume": "string",
      "assessedRole": "Data Fiduciary | Significant Data Fiduciary",
      "dpiaMandatory": true,
      "dpoSignOffStatus": "Ready for Sign-Off | Conditional Approval | Remediation Required"
    }
  }
}`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const rawText = response.text || '';
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err) {
      console.error('AI Ingestion error:', err);
      res.status(500).json({
        error: (err as Error).message || 'AI ingestion failed.',
      });
    }
  });

  // Mount Vite middleware in development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PentaFlow Server listening on http://localhost:${PORT}`);
  });
}

startServer();

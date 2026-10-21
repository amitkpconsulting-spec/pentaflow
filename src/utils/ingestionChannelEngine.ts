/**
 * Ingestion Channel & Statutory AI Topology Engine
 * Implements the 10-Dimension Ingestion Channel ("First Ask" Base Data)
 * and DPDP-TRACE / DAMA Mapping Rules from dataflow.md.
 */

import {
  AssessmentInputPayload,
  IngestionChannelData,
  TrustedAppDataSource,
  ThirdPartyProcessorEntry,
} from '../types/dfd';

export interface StatutoryAuditFinding {
  ruleId: string;
  title: string;
  statutoryRef: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'PASS';
  status: 'VIOLATION' | 'WARNING' | 'COMPLIANT';
  finding: string;
  penaltyExposure: string;
  remediation: string;
}

/**
 * Derive a complete 10-Dimension IngestionChannelData from an AssessmentInputPayload
 */
export function deriveIngestionChannelFromPayload(
  payload: AssessmentInputPayload
): IngestionChannelData {
  if (payload.ingestionChannel) {
    return payload.ingestionChannel;
  }

  const sysName = payload.metadata?.systemName || 'Enterprise Data Flow Architecture';
  const allText = [
    sysName,
    payload.metadata?.notes || '',
    ...payload.source,
    ...payload.operations,
    ...payload.child,
    ...payload.infra,
    ...payload.architecture,
  ]
    .join(' ')
    .toLowerCase();

  const isHealth =
    allText.includes('clinical') ||
    allText.includes('hipaa') ||
    allText.includes('fhir') ||
    allText.includes('patient') ||
    allText.includes('hl7');
  const isRetail =
    allText.includes('retail') ||
    allText.includes('e-commerce') ||
    allText.includes('loyalty') ||
    allText.includes('crm');
  const isFintech =
    allText.includes('settlement') ||
    allText.includes('payment') ||
    allText.includes('swift') ||
    allText.includes('kyc') ||
    allText.includes('aml') ||
    allText.includes('card');

  const sector = isHealth
    ? 'SEC_HEALTH'
    : isRetail
    ? 'SEC_RETAIL'
    : isFintech
    ? 'SEC_FINTECH'
    : 'SEC_TECH';

  const processesChildData =
    allText.includes('minor') ||
    allText.includes('pediatric') ||
    allText.includes('child (<18)') ||
    allText.includes('student');

  const usesAiMlModels =
    allText.includes('llm') ||
    allText.includes('ai ') ||
    allText.includes('ml ') ||
    allText.includes('fraud scoring') ||
    allText.includes('biometric') ||
    allText.includes('ocr') ||
    allText.includes('inference');

  const hasCrossBorder =
    allText.includes('cross-border') ||
    allText.includes('swift') ||
    allText.includes('global') ||
    allText.includes('us-east') ||
    allText.includes('eu ');

  // Build Trusted Apps & Data Sources Register from payload.source & payload.child
  const trustedAppsAndSources: TrustedAppDataSource[] = [];
  payload.source.forEach((src, idx) => {
    const lower = src.toLowerCase();
    const isPartnerOrExternal =
      lower.includes('partner') ||
      lower.includes('external') ||
      lower.includes('webhook') ||
      lower.includes('third-party');
    trustedAppsAndSources.push({
      id: `APP-0${idx + 1}`,
      name: src,
      category:
        lower.includes('db') || lower.includes('sql') || lower.includes('erp')
          ? 'Core DB'
          : isPartnerOrExternal
          ? 'TPRM Processor'
          : 'Web/Mobile App',
      risk:
        payload.metadata?.classificationLevel === 'RESTRICTED_PII'
          ? 'HIGH'
          : payload.metadata?.classificationLevel === 'CONFIDENTIAL'
          ? 'MEDIUM'
          : 'LOW',
      piiTypes: isHealth
        ? 'Patient EHR, Biometrics, Clinical Telemetry'
        : isFintech
        ? 'KYC, Aadhaar/PAN, Financial & Payment Vectors'
        : 'Customer Name, Email, Phone, Consent Artifact',
      trusted: !isPartnerOrExternal,
      protocol: 'mTLS 1.3 / REST',
      location: 'India (ap-south-1)',
    });
  });

  payload.child.slice(0, 2).forEach((ch, idx) => {
    const lower = ch.toLowerCase();
    const appIdx = trustedAppsAndSources.length + 1;
    trustedAppsAndSources.push({
      id: `APP-0${appIdx}`,
      name: ch,
      category:
        lower.includes('lake') || lower.includes('warehouse') || lower.includes('s3')
          ? 'Cloud Lake'
          : lower.includes('llm') || lower.includes('ai')
          ? 'AI Model'
          : 'Core DB',
      risk: idx === 0 ? 'HIGH' : 'MEDIUM',
      piiTypes: 'Tokenized Identity & Transactional Records',
      trusted: true,
      protocol: 'PostgreSQL TLS / JDBC',
      location: 'India (ap-south-1)',
    });
  });

  // Third Party Processors
  const processors: ThirdPartyProcessorEntry[] = [];
  payload.child.forEach((ch, idx) => {
    const lower = ch.toLowerCase();
    if (
      lower.includes('partner') ||
      lower.includes('external') ||
      lower.includes('bureau') ||
      lower.includes('network') ||
      lower.includes('clearing') ||
      lower.includes('vendor')
    ) {
      processors.push({
        id: `TPRM-0${idx + 1}`,
        name: ch,
        role: 'Data Processor',
        purpose: 'External verification, settlement clearing, or processor delivery',
        contractStatus: 'Signed Sec 8(2) DPA',
        destinationCountry: hasCrossBorder ? 'US' : 'IN',
      });
    }
  });

  if (processors.length === 0) {
    processors.push({
      id: 'TPRM-01',
      name: 'Cloud Audit & SIEM Telemetry Processor',
      role: 'Data Processor',
      purpose: 'Security monitoring & immutable compliance audit logging',
      contractStatus: 'Signed Sec 8(2) DPA',
      destinationCountry: 'IN',
    });
  }

  return {
    rawContextNarrative:
      payload.metadata?.notes ||
      `${sysName}: Ingests personal and transactional data from ${payload.source.join(
        ', '
      )}, applies ${payload.operations.join(', ')}, and persists governed records into ${payload.child.join(
        ', '
      )} across ${payload.infra.join(', ')} with ${payload.architecture.join(', ')}.`,

    contextOfProcessing: {
      businessPurpose:
        payload.metadata?.notes ||
        `Enterprise data processing and governance for ${sysName}`,
      sector,
      entityScope: usesAiMlModels ? 'AI_Launch' : 'Enterprise_Process',
      lawfulBasis: 'Consent (Sec 6)',
      dataPrincipalCohort: processesChildData
        ? ['Adult Consumers', 'Children / Minors (<18)']
        : ['Adult Consumers', 'Enterprise Users'],
      processesChildData,
    },

    dataUsage: {
      processingActivities:
        payload.operations.length > 0
          ? [...payload.operations]
          : ['Schema Validation', 'PII Tokenization', 'Business Rule Enrichment'],
      usesAiMlModels,
      aiModelDetails: usesAiMlModels
        ? 'Risk Scoring & Anomaly Detection Model (ISO/IEC 42001 AIMS Governed)'
        : '',
      automatedDecisioning: usesAiMlModels,
    },

    dataMovement: {
      ingressChannels:
        payload.source.length > 0 ? [...payload.source] : ['Customer Onboarding Portal'],
      transitProtocols: ['mTLS 1.3 / REST', 'Kafka TLS / Avro', 'gRPC / Protobuf'],
      isEncryptedInTransit: true,
      movementCadence: 'Real-time (<150ms)',
    },

    dataStorage: {
      repositories:
        payload.child.length > 0 ? [...payload.child] : ['Core Production DB (PostgreSQL)'],
      encryptionAtRest: 'AES-256-GCM + HSM',
      primaryRegion: 'India (ap-south-1 Mumbai)',
      retentionSchedule: '7 Years Statutory / Sec 8(7) Purpose Exhaustion Auto-Erasure',
    },

    dataPrivacy: {
      piiCategories: isHealth
        ? ['Patient Identity PII', 'Clinical Biometrics', 'Diagnostic DICOM/FHIR']
        : isFintech
        ? ['Identity PII (Aadhaar/PAN)', 'Financial Account Vectors', 'Consent Artifacts']
        : ['Customer Identity PII', 'Contact & Behavioral Vectors', 'Consent Logs'],
      consentManager: 'Consent Manager Artifact Ledger (DPDPA Sec 6(7))',
      privacyControls: [
        'PII Tokenization & Field Masking',
        'Schema Validation & DLQ Gate',
        'Role-Based Access Control (RBAC)',
      ],
      readinessGates: {
        noticeItemisation: 'Pass',
        consentWithdrawalParity: 'Pass',
        childTrackingProhibition: 'Pass',
        erasureOnPurposeExhaustion: 'Pass',
        dpbi72HrBreachReadiness: 'Pass',
        nominationFacility: 'Pass',
      },
    },

    infrastructureComponent: {
      hostingClusters:
        payload.infra.length > 0
          ? [...payload.infra]
          : ['On-Premises Sovereign K8s Cluster', 'Kafka Event Mesh'],
      securityZones:
        payload.architecture.length > 0
          ? [...payload.architecture]
          : ['DMZ Ingress Zone', 'mTLS 1.3 Zero-Trust Enclave'],
    },

    crossBorderComponent: {
      hasCrossBorderTransfer: hasCrossBorder,
      destinationJurisdictions: hasCrossBorder ? ['IN', 'US', 'EU'] : ['IN'],
      foreignCloudRegions: hasCrossBorder
        ? ['AWS us-east-1 (Cross-Border Cloud Zone)', 'EU Frankfurt DR Vault']
        : [],
      transferSafeguard: 'Sovereign Whitelist (Sec 16)',
    },

    trustedAppsAndSources,

    thirdPartyInvolvement: {
      hasThirdPartyProcessors: processors.length > 0,
      processors,
    },

    ropaMapping: {
      isHighVolumeProcessing: true,
      ropaRecordId: `ROPA-2026-${(payload.metadata?.assessmentId || 'ENT').slice(0, 6).toUpperCase()}`,
      estimatedVolume: '1.8M events/day (High-Volume Tier)',
      assessedRole: usesAiMlModels ? 'Significant Data Fiduciary' : 'Data Fiduciary',
      dpiaMandatory: true,
      dpoSignOffStatus: 'Ready for Sign-Off',
    },
  };
}

/**
 * Compile the 10-Dimension Ingestion Channel Base Data into the 5-Layer AssessmentInputPayload
 * so that all Trusted Apps/Sources, Operations, Storage, Infra, Cross-Border, TPRM, and Privacy
 * elements become the exact base data for the @xyflow/react Data Flow Diagram.
 */
export function syncIngestionChannelToPayload(
  channel: IngestionChannelData,
  currentPayload: AssessmentInputPayload
): AssessmentInputPayload {
  const sources = new Set<string>();
  const operations = new Set<string>();
  const children = new Set<string>();
  const infra = new Set<string>();
  const architecture = new Set<string>();

  // 1. Data Principal Cohort & Ingress Channels -> Source Layer
  if (channel.contextOfProcessing.processesChildData) {
    sources.add('Data Principal Cohort (Minors <18 · Sec 9)');
  } else if (channel.contextOfProcessing.dataPrincipalCohort.length > 0) {
    sources.add(`Data Principal (${channel.contextOfProcessing.dataPrincipalCohort[0]})`);
  }

  channel.dataMovement.ingressChannels.forEach((ch) => {
    if (ch.trim()) sources.add(ch.trim());
  });

  // 2. Trusted Apps & Data Sources Register -> Map by Category
  channel.trustedAppsAndSources.forEach((asset) => {
    const label = asset.trusted ? asset.name : `${asset.name} (External)`;
    if (asset.category === 'Web/Mobile App') {
      sources.add(label);
    } else if (asset.category === 'AI Model') {
      operations.add(label);
    } else if (asset.category === 'Core DB' || asset.category === 'Cloud Lake') {
      children.add(label);
    } else if (asset.category === 'TPRM Processor') {
      children.add(label);
    }
  });

  // 3. Data Privacy Consent Manager & Privacy Controls -> Operations Layer
  if (channel.dataPrivacy.consentManager.trim()) {
    operations.add(channel.dataPrivacy.consentManager.trim());
  }
  channel.dataPrivacy.privacyControls.forEach((ctrl) => {
    if (ctrl.trim()) operations.add(ctrl.trim());
  });

  // 4. Data Usage & AI/ML Inference -> Operations Layer
  channel.dataUsage.processingActivities.forEach((act) => {
    if (act.trim()) operations.add(act.trim());
  });
  if (channel.dataUsage.usesAiMlModels && channel.dataUsage.aiModelDetails?.trim()) {
    operations.add(channel.dataUsage.aiModelDetails.trim());
  }

  // 5. Data Storage Repositories -> Child / Sink Layer
  channel.dataStorage.repositories.forEach((repo) => {
    if (repo.trim()) children.add(repo.trim());
  });

  // 6. Third Party Involvement (TPRM Processors) -> Child / Sink Layer
  if (channel.thirdPartyInvolvement.hasThirdPartyProcessors) {
    channel.thirdPartyInvolvement.processors.forEach((proc) => {
      if (proc.name.trim()) {
        const suffix =
          proc.destinationCountry && proc.destinationCountry !== 'IN'
            ? ` [TPRM · ${proc.destinationCountry}]`
            : ' [TPRM Processor]';
        children.add(
          proc.name.includes('TPRM') ? proc.name.trim() : `${proc.name.trim()}${suffix}`
        );
      }
    });
  }

  // 7. RoPA / High-Volume Audit Ledger -> Child Layer if High Volume
  if (channel.ropaMapping.isHighVolumeProcessing) {
    children.add(`RoPA Audit Ledger (${channel.ropaMapping.ropaRecordId})`);
  }

  // 8. Infrastructure Component -> Infra Layer
  channel.infrastructureComponent.hostingClusters.forEach((cl) => {
    if (cl.trim()) infra.add(cl.trim());
  });
  if (channel.dataStorage.primaryRegion.trim()) {
    infra.add(`Primary Sovereignty Region: ${channel.dataStorage.primaryRegion.trim()}`);
  }

  // 9. Architecture & Cross-Border Component -> Architecture Layer
  channel.infrastructureComponent.securityZones.forEach((zn) => {
    if (zn.trim()) architecture.add(zn.trim());
  });
  if (channel.crossBorderComponent.hasCrossBorderTransfer) {
    const countries = channel.crossBorderComponent.destinationJurisdictions.join(', ');
    architecture.add(`Cross-Border Zone (${countries || 'Global'} · Sec 16)`);
    channel.crossBorderComponent.foreignCloudRegions.forEach((fcr) => {
      if (fcr.trim()) infra.add(fcr.trim());
    });
  }

  // Determine classification level from privacy & risk
  const hasHighRisk =
    channel.contextOfProcessing.processesChildData ||
    channel.trustedAppsAndSources.some((a) => a.risk === 'HIGH') ||
    channel.dataPrivacy.piiCategories.some((p) =>
      /aadhaar|pan|biometric|health|financial|kyc|pii/i.test(p)
    );

  return {
    ...currentPayload,
    source: Array.from(sources),
    operations: Array.from(operations),
    child: Array.from(children),
    infra: Array.from(infra),
    architecture: Array.from(architecture),
    ingestionChannel: channel,
    metadata: {
      systemName: currentPayload.metadata?.systemName || 'Enterprise Governed Data Flow',
      assessmentId: currentPayload.metadata?.assessmentId || `dfd-${Date.now()}`,
      environment: currentPayload.metadata?.environment || 'hybrid-vpc',
      classificationLevel: hasHighRisk
        ? 'RESTRICTED_PII'
        : currentPayload.metadata?.classificationLevel || 'CONFIDENTIAL',
      complianceFrameworks: [
        'DPDPA 2023',
        'DAMA-DMBOK2',
        'ISO/IEC 27701',
        ...(channel.dataUsage.usesAiMlModels ? ['ISO/IEC 42001 AIMS'] : []),
      ],
      notes: channel.contextOfProcessing.businessPurpose,
    },
  };
}

/**
 * Evaluate the 4 Automated Statutory Audit Rules from dataflow.md against the Ingestion Channel
 */
export function evaluateStatutoryAuditRules(
  channel: IngestionChannelData
): StatutoryAuditFinding[] {
  const findings: StatutoryAuditFinding[] = [];

  // Rule 1 — Section 9(2) Child Behavioral Tracking Prohibition (Critical)
  const childSentToExternalTprm =
    channel.contextOfProcessing.processesChildData &&
    channel.thirdPartyInvolvement.hasThirdPartyProcessors &&
    (channel.dataPrivacy.readinessGates.childTrackingProhibition === 'Fail' ||
      channel.thirdPartyInvolvement.processors.some((p) =>
        /analytics|tracking|ad|behavioral|sdk/i.test(`${p.name} ${p.purpose}`)
      ));

  findings.push({
    ruleId: 'DPDPA-RULE-01',
    title: 'Section 9(2) Child Behavioral Tracking & Verifiable Consent',
    statutoryRef: 'DPDPA 2023 Section 9(1) & 9(2)',
    severity: childSentToExternalTprm ? 'CRITICAL' : 'PASS',
    status: childSentToExternalTprm ? 'VIOLATION' : 'COMPLIANT',
    finding: childSentToExternalTprm
      ? 'Child/Minor (<18) personal data is ingested while third-party tracking/analytics processors are active without strict child tracking prohibition.'
      : channel.contextOfProcessing.processesChildData
      ? 'Child data processing is gated with Verifiable Parental Consent and behavioral tracking prohibition.'
      : 'No minor (<18) behavioral tracking exposure detected.',
    penaltyExposure: 'Up to ₹200 Crore under the DPDPA Third Schedule',
    remediation:
      'Isolate minor (<18) telemetry from external TPRM analytics SDKs and enforce Verifiable Parental Consent gate.',
  });

  // Rule 2 — Section 8(5) Unencrypted Transit / Storage Safeguards (High)
  const unencryptedViolation =
    !channel.dataMovement.isEncryptedInTransit ||
    channel.dataStorage.encryptionAtRest === 'Unencrypted' ||
    channel.dataMovement.transitProtocols.some((p) => /unencrypted|http\b/i.test(p));

  findings.push({
    ruleId: 'DPDPA-RULE-02',
    title: 'Section 8(5) Cryptographic Transit & Storage Safeguards',
    statutoryRef: 'DPDPA 2023 Section 8(5)',
    severity: unencryptedViolation ? 'HIGH' : 'PASS',
    status: unencryptedViolation ? 'VIOLATION' : 'COMPLIANT',
    finding: unencryptedViolation
      ? 'Unencrypted transit stream or unencrypted storage repository detected across the ingestion pipeline.'
      : `Encrypted in transit (${channel.dataMovement.transitProtocols[0] || 'mTLS 1.3'}) and at rest (${channel.dataStorage.encryptionAtRest}).`,
    penaltyExposure: 'Up to ₹250 Crore for failure to maintain reasonable security safeguards',
    remediation:
      'Enforce mTLS 1.3 on all ingress/egress streams and AES-256-GCM + HSM encryption at rest.',
  });

  // Rule 3 — Section 4 & 6 Lawful Basis & Consent Artifact Parity (Critical)
  const missingLawfulBasis =
    channel.contextOfProcessing.lawfulBasis === 'None - Non-Compliant' ||
    channel.dataPrivacy.readinessGates.noticeItemisation === 'Fail';

  findings.push({
    ruleId: 'DPDPA-RULE-03',
    title: 'Section 4 & 6 Lawful Basis & Itemized Notice',
    statutoryRef: 'DPDPA 2023 Section 4, 5 & 6',
    severity: missingLawfulBasis ? 'CRITICAL' : 'PASS',
    status: missingLawfulBasis ? 'VIOLATION' : 'COMPLIANT',
    finding: missingLawfulBasis
      ? 'Processing lacks a valid statutory lawful basis or itemized notice gate.'
      : `Governed under ${channel.contextOfProcessing.lawfulBasis} via ${channel.dataPrivacy.consentManager}.`,
    penaltyExposure: 'Up to ₹50 Crore – ₹250 Crore under DPDPA Schedule',
    remediation:
      'Bind every ingress channel to a Consent Manager artifact ledger (Sec 6(7)) or documented Legitimate Use (Sec 7).',
  });

  // Rule 4 — Section 16 Cross-Border Data Transfer & Sovereignty (Medium)
  const unverifiedCrossBorder =
    channel.crossBorderComponent.hasCrossBorderTransfer &&
    channel.crossBorderComponent.transferSafeguard === 'Unverified Transfer';

  findings.push({
    ruleId: 'DPDPA-RULE-04',
    title: 'Section 16 Cross-Border Egress & Sovereignty Clearance',
    statutoryRef: 'DPDPA 2023 Section 16 & Section 8(2)',
    severity: unverifiedCrossBorder ? 'MEDIUM' : 'PASS',
    status: unverifiedCrossBorder ? 'WARNING' : 'COMPLIANT',
    finding: unverifiedCrossBorder
      ? `Cross-border transfer to [${channel.crossBorderComponent.destinationJurisdictions.join(
          ', '
        )}] lacks verified sovereign transfer safeguards.`
      : channel.crossBorderComponent.hasCrossBorderTransfer
      ? `Cross-border transfer to [${channel.crossBorderComponent.destinationJurisdictions.join(
          ', '
        )}] governed under ${channel.crossBorderComponent.transferSafeguard}.`
      : `All data localized within ${channel.dataStorage.primaryRegion}.`,
    penaltyExposure: 'Regulatory transfer suspension & statutory penalty exposure',
    remediation:
      'Verify destination jurisdictions against Central Government negative list (Sec 16) and execute Sec 8(2) Processor Agreements.',
  });

  return findings;
}

/**
 * Curated Context Templates for 1-Click AI Context Ingestion
 */
export const INGESTION_CONTEXT_SCENARIOS: {
  id: string;
  name: string;
  badge: string;
  narrative: string;
}[] = [
  {
    id: 'fintech-aa-ai-scoring',
    name: 'FinTech Onboarding, Account Aggregator & AI Credit Scoring',
    badge: 'FinTech · AI SDF · Cross-Border',
    narrative:
      'Digital lending & onboarding platform processing 2.5M daily records from Customer Onboarding Portal (Mobile/Web) and Account Aggregator FIP Streams. Collects Identity PII, Aadhaar eKYC, PAN, and Financial Bank Statements under Consent (Sec 6) via Consent Manager Artifact Ledger. Performs PII Tokenization and runs a Risk Scoring LLM Engine (AI/ML inference under ISO 42001). Stores core records in Core Production DB (PostgreSQL) and Enterprise Analytics Lake (S3) in India (ap-south-1 Mumbai) with AES-256-GCM + HSM. Replicates anonymized credit vectors to an external US-East GPU Inference Cloud and Credit Bureau TPRM Processor across AWS VPC and PCI-DSS Enclave.',
  },
  {
    id: 'clinical-pediatric-telemetry',
    name: 'Pediatric Clinical Telemetry & EHR Data Lake (Minors <18)',
    badge: 'Healthcare · Sec 9 Child Data',
    narrative:
      'Hospital clinical telemetry pipeline ingesting real-time patient vitals from bedside IoT DICOM Scanners and Pediatric Patient Portal, including Children / Minors (<18 years) requiring DPDPA Section 9 Verifiable Parental Consent. Applies HL7v2-to-FHIR R4 Schema Validation, PHI De-identification & Tokenization, and AI Diagnostic Triage Model. Persists data into Clinical FHIR Repository and Sovereign Health Data Lake in India (ap-south-1) on Air-Gapped K8s Cluster. Shares lab orders with External Diagnostic Lab TPRM Processor under signed Sec 8(2) DPA.',
  },
  {
    id: 'global-retail-omnichannel-ropa',
    name: 'Global Omni-Channel Retail Payment & High-Volume RoPA',
    badge: 'Retail · High-Volume RoPA · EU/US',
    narrative:
      'High-volume omni-channel retail checkout and loyalty engine processing 4.2M transactions/day across POS Payment Terminals, E-Commerce Web App, and Partner Webhook Ingress. Performs Real-time Fraud Scoring, PCI-DSS PAN Tokenization, and Schema Validation Gate over Kafka TLS / Avro. Stores records in Global Order Ledger DB and Snowflake Analytics Warehouse across India (ap-south-1), EU Frankfurt Cloud Region, and US-East DR Vault. Integrates Third-Party Payment Gateway and Marketing CRM Processor under RoPA ID ROPA-2026-RTL-09.',
  },
];

/**
 * Intelligent Contextual Parser + Optional Server AI Ingestion
 * Parses natural-language context narratives (and optional AI response)
 * to populate and update all 10 Ingestion Channel dimensions.
 */
export async function ingestContextWithAiOrDeterministic(
  narrative: string,
  currentChannel: IngestionChannelData,
  systemName?: string
): Promise<{
  channel: IngestionChannelData;
  source: 'gemini-ai' | 'deterministic-semantic';
  summary: string;
}> {
  const cleanText = narrative.trim();
  if (!cleanText) {
    return {
      channel: currentChannel,
      source: 'deterministic-semantic',
      summary: 'No context narrative provided.',
    };
  }

  // 1. Try server-side Gemini AI Ingestion endpoint (/api/ai/ingest-architecture) first
  try {
    const response = await fetch('/api/ai/ingest-architecture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        narrative: cleanText,
        currentChannel,
        systemName: systemName || 'Enterprise Data Flow',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.channel) {
        return {
          channel: data.channel as IngestionChannelData,
          source: 'gemini-ai',
          summary:
            data.summary ||
            'AI Context Ingestion updated all 10 dimensions and synchronized the Data Flow Diagram.',
        };
      }
    }
  } catch {
    // Graceful fallback to deterministic semantic parser when running Vite standalone or offline
  }

  // 2. Deterministic Semantic Context Extractor (Zero-Latency Air-Gapped Engine)
  const lower = cleanText.toLowerCase();

  const isHealth = /hospital|clinical|patient|ehr|fhir|hl7|dicom|pediatric|medical|hipaa/i.test(cleanText);
  const isFintech = /fintech|lending|bank|payment|kyc|aadhaar|pan|account aggregator|credit|settlement|swift|pos/i.test(cleanText);
  const isRetail = /retail|e-commerce|checkout|loyalty|order|cart|merchandise|omni-channel/i.test(cleanText);

  const sector: IngestionChannelData['contextOfProcessing']['sector'] = isHealth
    ? 'SEC_HEALTH'
    : isFintech
    ? 'SEC_FINTECH'
    : isRetail
    ? 'SEC_RETAIL'
    : 'SEC_TECH';

  const processesChildData = /minor|child|children|<18|under 18|pediatric|student|parental consent|sec 9/i.test(
    cleanText
  );

  const usesAiMlModels = /ai\b|ml\b|llm|model|inference|scoring|classifier|genai|neural|iso 42001/i.test(
    cleanText
  );

  const hasCrossBorder = /cross-border|us-east|eu\b|frankfurt|singapore|global|foreign|other countr|sec 16|uk\b/i.test(
    cleanText
  );

  const isHighVolume = /high-volume|high volume|million|\d+(\.\d+)?m\b|ropa|sdf|significant data fiduciary/i.test(
    cleanText
  );

  // Extract jurisdictions
  const jurisdictions = new Set<string>(['IN']);
  if (/us\b|us-east|us-west|united states/i.test(cleanText)) jurisdictions.add('US');
  if (/eu\b|frankfurt|europe|dublin|gdpr/i.test(cleanText)) jurisdictions.add('EU');
  if (/sg\b|singapore|ap-southeast/i.test(cleanText)) jurisdictions.add('SG');
  if (/uk\b|london/i.test(cleanText)) jurisdictions.add('UK');

  // Extract Ingress Channels
  const ingressChannels: string[] = [];
  if (/onboarding portal|customer portal|web portal/i.test(cleanText))
    ingressChannels.push('Customer Onboarding Portal');
  if (/mobile app/i.test(cleanText)) ingressChannels.push('Customer Mobile App');
  if (/account aggregator|fip/i.test(cleanText))
    ingressChannels.push('Account Aggregator FIP Stream');
  if (/iot|dicom|scanner|sensor|telemetry/i.test(cleanText))
    ingressChannels.push('IoT / DICOM Telemetry Gateway');
  if (/pos\b|terminal/i.test(cleanText)) ingressChannels.push('POS Payment Terminal');
  if (/webhook|partner/i.test(cleanText)) ingressChannels.push('Partner Webhook Ingress');
  if (/api gateway|rest api/i.test(cleanText)) ingressChannels.push('Enterprise API Gateway');
  if (ingressChannels.length === 0) {
    ingressChannels.push(...currentChannel.dataMovement.ingressChannels);
  }

  // Extract Operations / Data Usage
  const processingActivities: string[] = [
    'Schema Validation & DLQ Gate',
    'PII Tokenization & Field Masking',
  ];
  if (/fhir|hl7/i.test(cleanText)) processingActivities.push('HL7v2-to-FHIR R4 Transform');
  if (/fraud/i.test(cleanText)) processingActivities.push('Real-Time Fraud Scoring Engine');
  if (/kyc|ekyc/i.test(cleanText)) processingActivities.push('eKYC Identity Verification');
  if (/settlement|clearing/i.test(cleanText)) processingActivities.push('Automated Settlement Engine');

  // Extract Storage Repositories
  const repositories: string[] = [];
  if (/postgres|production db|core db/i.test(cleanText))
    repositories.push('Core Production DB (PostgreSQL)');
  if (/s3|analytics lake|data lake|health data lake/i.test(cleanText))
    repositories.push('Enterprise Analytics Data Lake (S3)');
  if (/fhir repository|ehr/i.test(cleanText))
    repositories.push('Clinical FHIR Repository');
  if (/snowflake|warehouse/i.test(cleanText))
    repositories.push('Enterprise Data Warehouse');
  if (/ledger/i.test(cleanText)) repositories.push('Immutable Transaction Ledger DB');
  if (repositories.length === 0) {
    repositories.push(...currentChannel.dataStorage.repositories);
  }

  // Build Trusted Apps & Data Sources Register
  const trustedAppsAndSources: TrustedAppDataSource[] = [];
  ingressChannels.forEach((ing, idx) => {
    trustedAppsAndSources.push({
      id: `APP-0${idx + 1}`,
      name: ing,
      category: 'Web/Mobile App',
      risk: processesChildData || isFintech || isHealth ? 'HIGH' : 'MEDIUM',
      piiTypes: isHealth
        ? 'Patient Identity, Clinical Vitals, Minor (<18) EHR'
        : isFintech
        ? 'KYC, Aadhaar, PAN, Financial Vectors'
        : 'Customer Identity, Contact & Payment Tokens',
      trusted: !/partner|webhook|external/i.test(ing),
      protocol: 'mTLS 1.3 / REST',
      location: 'India (ap-south-1)',
    });
  });

  repositories.forEach((repo) => {
    trustedAppsAndSources.push({
      id: `APP-0${trustedAppsAndSources.length + 1}`,
      name: repo,
      category: /lake|s3|warehouse/i.test(repo) ? 'Cloud Lake' : 'Core DB',
      risk: 'HIGH',
      piiTypes: 'Encrypted & Tokenized Records',
      trusted: true,
      protocol: 'TLS 1.3 / JDBC',
      location: 'India (ap-south-1)',
    });
  });

  if (usesAiMlModels) {
    trustedAppsAndSources.push({
      id: `APP-0${trustedAppsAndSources.length + 1}`,
      name: isHealth
        ? 'AI Clinical Triage Model'
        : isFintech
        ? 'Risk Scoring LLM Engine'
        : 'Enterprise AI Inference Engine',
      category: 'AI Model',
      risk: 'HIGH',
      piiTypes: 'Feature Vectors & Inference Telemetry',
      trusted: true,
      protocol: 'gRPC / mTLS 1.3',
      location: hasCrossBorder && jurisdictions.has('US') ? 'US (Cloud GPU)' : 'India (ap-south-1)',
    });
  }

  // Extract Third-Party Processors
  const processors: ThirdPartyProcessorEntry[] = [];
  if (/credit bureau/i.test(cleanText)) {
    processors.push({
      id: 'TPRM-01',
      name: 'External Credit Bureau Processor',
      role: 'Data Processor',
      purpose: 'Creditworthiness & bureau score verification',
      contractStatus: 'Signed Sec 8(2) DPA',
      destinationCountry: 'IN',
    });
  }
  if (/diagnostic lab/i.test(cleanText)) {
    processors.push({
      id: 'TPRM-02',
      name: 'External Diagnostic Lab Processor',
      role: 'Data Processor',
      purpose: 'Clinical diagnostic order fulfillment',
      contractStatus: 'Signed Sec 8(2) DPA',
      destinationCountry: 'IN',
    });
  }
  if (/gpu|us-east|cloud inference/i.test(cleanText)) {
    processors.push({
      id: 'TPRM-03',
      name: 'Cross-Border Cloud GPU Processor',
      role: 'Sub-Processor',
      purpose: 'High-throughput model inference & vector processing',
      contractStatus: 'Signed Sec 8(2) DPA',
      destinationCountry: 'US',
    });
  }
  if (/crm|marketing|payment gateway/i.test(cleanText)) {
    processors.push({
      id: 'TPRM-04',
      name: 'Global Payment & CRM Processor',
      role: 'Data Processor',
      purpose: 'Payment clearing and customer lifecycle notifications',
      contractStatus: 'Signed Sec 8(2) DPA',
      destinationCountry: jurisdictions.has('EU') ? 'EU' : 'IN',
    });
  }
  if (processors.length === 0) {
    processors.push(...currentChannel.thirdPartyInvolvement.processors);
  }

  // Extract Foreign Cloud Regions
  const foreignCloudRegions: string[] = [];
  if (jurisdictions.has('US')) foreignCloudRegions.push('AWS us-east-1 (US Cloud Region)');
  if (jurisdictions.has('EU')) foreignCloudRegions.push('EU Frankfurt Cloud Data Center');
  if (jurisdictions.has('SG')) foreignCloudRegions.push('Singapore ap-southeast-1 DR Zone');

  // Extract Hosting Clusters
  const hostingClusters: string[] = [];
  if (/air-gapped|k8s|kubernetes/i.test(cleanText))
    hostingClusters.push('Air-Gapped K8s Cluster');
  if (/aws|vpc/i.test(cleanText)) hostingClusters.push('AWS VPC (ap-south-1 Mumbai)');
  if (/kafka/i.test(cleanText)) hostingClusters.push('Kafka Event Mesh');
  if (hostingClusters.length === 0) {
    hostingClusters.push(...currentChannel.infrastructureComponent.hostingClusters);
  }

  const updatedChannel: IngestionChannelData = {
    rawContextNarrative: cleanText,
    contextOfProcessing: {
      businessPurpose: cleanText.slice(0, 220),
      sector,
      entityScope: usesAiMlModels ? 'AI_Launch' : 'Enterprise_Process',
      lawfulBasis: /legitimate use|sec 7/i.test(lower)
        ? 'Legitimate Use (Sec 7)'
        : 'Consent (Sec 6)',
      dataPrincipalCohort: processesChildData
        ? ['Adult Consumers', 'Children / Minors (<18)']
        : ['Adult Consumers', 'Enterprise Users'],
      processesChildData,
    },
    dataUsage: {
      processingActivities,
      usesAiMlModels,
      aiModelDetails: usesAiMlModels
        ? isHealth
          ? 'AI Diagnostic Triage Model (ISO 42001)'
          : 'Risk Scoring LLM Engine (ISO 42001 AIMS)'
        : '',
      automatedDecisioning: usesAiMlModels,
    },
    dataMovement: {
      ingressChannels,
      transitProtocols: /kafka/i.test(cleanText)
        ? ['mTLS 1.3 / REST', 'Kafka TLS / Avro']
        : ['mTLS 1.3 / REST', 'gRPC / Protobuf'],
      isEncryptedInTransit: !/unencrypted http/i.test(cleanText),
      movementCadence: /batch/i.test(cleanText)
        ? 'Micro-batch (15m)'
        : 'Real-time (<150ms)',
    },
    dataStorage: {
      repositories,
      encryptionAtRest: /hsm/i.test(cleanText) ? 'AES-256-GCM + HSM' : 'AES-256-GCM',
      primaryRegion: 'India (ap-south-1 Mumbai)',
      retentionSchedule: '7 Years Statutory / Sec 8(7) Auto-Erasure',
    },
    dataPrivacy: {
      piiCategories: isHealth
        ? ['Patient Identity PII', 'Minor (<18) EHR', 'Clinical Biometrics']
        : isFintech
        ? ['Identity PII', 'Aadhaar / PAN', 'Financial & Credit Vectors']
        : ['Customer Identity PII', 'Payment Tokens', 'Consent Artifacts'],
      consentManager: processesChildData
        ? 'Verifiable Parental Consent & Artifact Ledger (Sec 6 & Sec 9)'
        : 'Consent Manager Artifact Ledger (Sec 6(7))',
      privacyControls: [
        'PII Tokenization & Field Masking',
        'Schema Validation & DLQ Gate',
        ...(processesChildData ? ['Child Behavioral Tracking Blocker (Sec 9(2))'] : []),
      ],
      readinessGates: {
        noticeItemisation: 'Pass',
        consentWithdrawalParity: 'Pass',
        childTrackingProhibition: 'Pass',
        erasureOnPurposeExhaustion: 'Pass',
        dpbi72HrBreachReadiness: 'Pass',
        nominationFacility: 'Pass',
      },
    },
    infrastructureComponent: {
      hostingClusters,
      securityZones: [
        'DMZ Ingress Zone',
        'mTLS 1.3 Zero-Trust Enclave',
        ...(isFintech || isRetail ? ['PCI-DSS Isolated Zone'] : []),
      ],
    },
    crossBorderComponent: {
      hasCrossBorderTransfer: hasCrossBorder,
      destinationJurisdictions: Array.from(jurisdictions),
      foreignCloudRegions,
      transferSafeguard: 'Sovereign Whitelist (Sec 16)',
    },
    trustedAppsAndSources,
    thirdPartyInvolvement: {
      hasThirdPartyProcessors: processors.length > 0,
      processors,
    },
    ropaMapping: {
      isHighVolumeProcessing: isHighVolume || true,
      ropaRecordId:
        cleanText.match(/ROPA-[A-Z0-9-]+/i)?.[0]?.toUpperCase() ||
        currentChannel.ropaMapping.ropaRecordId ||
        'ROPA-2026-ENT-01',
      estimatedVolume:
        cleanText.match(/\d+(\.\d+)?\s*M\s*(daily\s*)?(records|transactions|events)(\/day)?/i)?.[0] ||
        '2.5M records/day',
      assessedRole:
        usesAiMlModels || processesChildData || isHighVolume
          ? 'Significant Data Fiduciary'
          : 'Data Fiduciary',
      dpiaMandatory: true,
      dpoSignOffStatus: 'Ready for Sign-Off',
    },
  };

  return {
    channel: updatedChannel,
    source: 'deterministic-semantic',
    summary: `Ingested context into ${trustedAppsAndSources.length} Trusted Apps/Sources, ${processors.length} Third-Party Processors, and ${Array.from(jurisdictions).join('/')} Sovereignty Zones.`,
  };
}

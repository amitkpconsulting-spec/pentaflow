/**
 * NIST SP 800-53 Rev 5 (OSCAL v1.4.0) Automatic Control Mapping & Evaluation Engine
 *
 * Reference Catalog:
 * https://github.com/usnistgov/oscal-content/tree/v1.4.0/src/nist.gov/SP800-53
 *
 * Automatically maps, evaluates, and showcases NIST SP 800-53 Rev 5 Security and Privacy
 * Controls across all 5 layers of PentaFlow Data Flows (Source, Operations, Child, Infra,
 * Architecture), Data-in-Transit Edges, and the 10-Dimension Ingestion Channel.
 */

import {
  CustomDfdNode,
  CustomDfdEdge,
  DfdNodeData,
  DfdEdgeData,
  IngestionChannelData,
} from '../types/dfd';

export const NIST_OSCAL_REPO_URL =
  'https://github.com/usnistgov/oscal-content/tree/v1.4.0/src/nist.gov/SP800-53';

export const NIST_OSCAL_VERSION = 'OSCAL v1.4.0 · NIST SP 800-53 Rev 5';

export type NistControlFamily =
  | 'AC' // Access Control
  | 'AU' // Audit and Accountability
  | 'CA' // Assessment, Authorization, and Monitoring
  | 'CM' // Configuration Management
  | 'CP' // Contingency Planning
  | 'IA' // Identification and Authentication
  | 'IR' // Incident Response
  | 'PT' // PII Processing and Transparency
  | 'RA' // Risk Assessment
  | 'SA' // System and Services Acquisition
  | 'SC' // System and Communications Protection
  | 'SI' // System and Information Integrity
  | 'SR'; // Supply Chain Risk Management

export type NistControlStatus = 'IMPLEMENTED' | 'PARTIAL' | 'GAP';

export interface NistCatalogControl {
  id: string; // e.g. 'SC-8(1)'
  family: NistControlFamily;
  familyName: string;
  title: string;
  shortLabel: string;
  baseline: ('LOW' | 'MODERATE' | 'HIGH' | 'PRIVACY')[];
  description: string;
  damaCrosswalk: string;
  dpdpaCrosswalk: string;
  oscalCatalogPath: string;
}

export interface ResolvedNistControl extends NistCatalogControl {
  status: NistControlStatus;
  evidence: string;
}

/**
 * Curated Enterprise Catalog of Key NIST SP 800-53 Rev 5 Controls (OSCAL v1.4.0)
 * relevant to Data Flow Diagrams, Data Quality Governance, and Privacy Architecture.
 */
export const NIST_SP800_53_CATALOG: Record<string, NistCatalogControl> = {
  'AC-3': {
    id: 'AC-3',
    family: 'AC',
    familyName: 'Access Control',
    title: 'Access Enforcement',
    shortLabel: 'RBAC / Access Enforcement',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Enforces approved authorizations for logical access to information and system resources in accordance with applicable access control policies.',
    damaCrosswalk: 'Data Security & Access Governance',
    dpdpaCrosswalk: 'Sec 8(4) Technical & Organisational Measures',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'AC-4': {
    id: 'AC-4',
    family: 'AC',
    familyName: 'Access Control',
    title: 'Information Flow Enforcement',
    shortLabel: 'Flow Enforcement',
    baseline: ['MODERATE', 'HIGH'],
    description:
      'Enforces approved authorizations for controlling the flow of information within the system and between interconnected systems across trust boundaries.',
    damaCrosswalk: 'Validity & Lineage Contract Control',
    dpdpaCrosswalk: 'Sec 8(5) Data Flow Safeguards',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'AC-17': {
    id: 'AC-17',
    family: 'AC',
    familyName: 'Access Control',
    title: 'Remote Access',
    shortLabel: 'External / Remote Ingress',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Establishes usage restrictions, configuration/connection requirements, and cryptographic protection for each type of remote or external ingress access.',
    damaCrosswalk: 'Source Ingress Governance',
    dpdpaCrosswalk: 'Sec 8(5) Reasonable Security Safeguards',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'AU-2': {
    id: 'AU-2',
    family: 'AU',
    familyName: 'Audit and Accountability',
    title: 'Event Logging',
    shortLabel: 'Audit Event Logging',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Identifies the types of events that the system is capable of logging in support of the audit function and coordinates event logging with RoPA / SIEM.',
    damaCrosswalk: 'Completeness & Audit Lineage',
    dpdpaCrosswalk: 'Sec 10(2) Significant Data Fiduciary Audit',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'AU-9': {
    id: 'AU-9',
    family: 'AU',
    familyName: 'Audit and Accountability',
    title: 'Protection of Audit Information',
    shortLabel: 'Immutable Audit Trail',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Protects audit information and audit logging tools from unauthorized access, modification, and deletion using WORM or cryptographic hashing.',
    damaCrosswalk: 'Consistency & Non-Repudiation',
    dpdpaCrosswalk: 'Sec 6(7) Consent Artifact Integrity',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'AU-12': {
    id: 'AU-12',
    family: 'AU',
    familyName: 'Audit and Accountability',
    title: 'Audit Record Generation',
    shortLabel: 'RoPA / Record Generation',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Provides audit record generation capability for the event types defined in AU-2 at system components where data processing occurs.',
    damaCrosswalk: 'Completeness & Metadata Management',
    dpdpaCrosswalk: 'Sec 10 RoPA & Periodic Audit',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'CA-3': {
    id: 'CA-3',
    family: 'CA',
    familyName: 'Assessment, Authorization, and Monitoring',
    title: 'Information Exchange',
    shortLabel: 'Inter-System / Cross-Border Exchange',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Approves and manages the exchange of information between the system and other external or cross-border systems using interface security agreements.',
    damaCrosswalk: 'Data Integration & Interoperability',
    dpdpaCrosswalk: 'Sec 16 Cross-Border Data Transfer',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'CA-7': {
    id: 'CA-7',
    family: 'CA',
    familyName: 'Assessment, Authorization, and Monitoring',
    title: 'Continuous Monitoring',
    shortLabel: 'Continuous DQ & SIEM Monitoring',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Develops a continuous monitoring strategy and implements continuous telemetry and automated compliance assessments across data pipelines.',
    damaCrosswalk: 'Timeliness & Data Quality Monitoring',
    dpdpaCrosswalk: 'Sec 8(5) Continuous Safeguard Verification',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'CM-8': {
    id: 'CM-8',
    family: 'CM',
    familyName: 'Configuration Management',
    title: 'System Component Inventory',
    shortLabel: 'Trusted Asset Inventory',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Develops and documents an inventory of system components, data sources, and cover applications that accurately reflects the system.',
    damaCrosswalk: 'Reference & Master Asset Inventory',
    dpdpaCrosswalk: 'Stage 4 Trusted App & Data Source Discovery',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'CP-9': {
    id: 'CP-9',
    family: 'CP',
    familyName: 'Contingency Planning',
    title: 'System Backup',
    shortLabel: 'Encrypted Backup & DR Vault',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Conducts backups of user-level and system-level information and protects the confidentiality, integrity, and availability of backup information.',
    damaCrosswalk: 'Data Storage & Operations Continuity',
    dpdpaCrosswalk: 'Sec 8(5) Availability & Resilience',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'CP-10': {
    id: 'CP-10',
    family: 'CP',
    familyName: 'Contingency Planning',
    title: 'System Recovery and Reconstitution',
    shortLabel: 'DLQ Quarantine & Recovery',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Provides for the recovery and reconstitution of the system to a known state after a disruption, compromise, or failed message via Dead-Letter Queue (DLQ).',
    damaCrosswalk: 'Consistency & Exception Handling',
    dpdpaCrosswalk: 'Sec 8(3) Completeness & Consistency',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'IA-2': {
    id: 'IA-2',
    family: 'IA',
    familyName: 'Identification and Authentication',
    title: 'Identification and Authentication (Organizational Users)',
    shortLabel: 'OIDC / MFA Authentication',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Uniquely identifies and authenticates organizational users and processes acting on behalf of users via strong identity tokens (OIDC / OAuth 2.0 / MFA).',
    damaCrosswalk: 'Access & Identity Verification',
    dpdpaCrosswalk: 'Sec 8(5) Access Authentication',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'IA-3': {
    id: 'IA-3',
    family: 'IA',
    familyName: 'Identification and Authentication',
    title: 'Device Identification and Authentication',
    shortLabel: 'mTLS Device / Service Auth',
    baseline: ['MODERATE', 'HIGH'],
    description:
      'Uniquely identifies and authenticates devices and upstream microservices before establishing a local, remote, or network connection (e.g., mTLS 1.3).',
    damaCrosswalk: 'Accuracy & Source Authenticity',
    dpdpaCrosswalk: 'Sec 8(5) Mutual Cryptographic Auth',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'IR-4': {
    id: 'IR-4',
    family: 'IR',
    familyName: 'Incident Response',
    title: 'Incident Handling',
    shortLabel: 'Breach & Incident Handling',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Implements an incident handling capability for security and privacy incidents including preparation, detection, analysis, containment, and recovery.',
    damaCrosswalk: 'Data Breach Containment',
    dpdpaCrosswalk: 'Sec 8(6) Personal Data Breach Response',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'IR-6': {
    id: 'IR-6',
    family: 'IR',
    familyName: 'Incident Response',
    title: 'Incident Reporting',
    shortLabel: '72-Hr Breach Notification',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Requires personnel and automated pipelines to report suspected security and privacy incidents within statutory timeframes (e.g. DPBI / CERT-In 72-Hr).',
    damaCrosswalk: 'Regulatory Breach Reporting',
    dpdpaCrosswalk: 'Sec 8(6) Intimation to DPBI & Data Principal',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'PT-2': {
    id: 'PT-2',
    family: 'PT',
    familyName: 'PII Processing and Transparency',
    title: 'Authority to Process Personally Identifiable Information',
    shortLabel: 'Lawful Basis & Authority',
    baseline: ['PRIVACY'],
    description:
      'Determines and documents the legal authority that permits the collection, use, maintenance, and sharing of personally identifiable information (PII).',
    damaCrosswalk: 'Data Governance & Lawful Mandate',
    dpdpaCrosswalk: 'Sec 4 & Sec 6/7 Lawful Purpose',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'PT-3': {
    id: 'PT-3',
    family: 'PT',
    familyName: 'PII Processing and Transparency',
    title: 'Personally Identifiable Information Processing Purposes',
    shortLabel: 'Purpose Limitation',
    baseline: ['PRIVACY'],
    description:
      'Identifies and documents the specific purpose(s) for processing personally identifiable information and restricts processing to compatible purposes.',
    damaCrosswalk: 'Contextual Data Usage Governance',
    dpdpaCrosswalk: 'Sec 5 & Sec 6(1) Specified Purpose',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'PT-4': {
    id: 'PT-4',
    family: 'PT',
    familyName: 'PII Processing and Transparency',
    title: 'Consent',
    shortLabel: 'Consent Artifact & Withdrawal',
    baseline: ['PRIVACY'],
    description:
      'Implements tools and mechanisms (Consent Manager) for individuals to provide, manage, and withdraw consent for the processing of their PII.',
    damaCrosswalk: 'Consent Lifecycle Management',
    dpdpaCrosswalk: 'Sec 6(4) & Sec 6(7) Consent Manager',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'PT-5': {
    id: 'PT-5',
    family: 'PT',
    familyName: 'PII Processing and Transparency',
    title: 'Privacy Notice',
    shortLabel: 'Itemised Privacy Notice',
    baseline: ['PRIVACY'],
    description:
      'Provides effective, itemised notice to the public and individuals regarding PII collection, processing purposes, and Data Principal rights.',
    damaCrosswalk: 'Metadata Transparency',
    dpdpaCrosswalk: 'Sec 5 Itemised Notice & Sec 9 Parental Notice',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'PT-7': {
    id: 'PT-7',
    family: 'PT',
    familyName: 'PII Processing and Transparency',
    title: 'Specific Categories of Personally Identifiable Information',
    shortLabel: 'Sensitive / Child PII Safeguards',
    baseline: ['PRIVACY'],
    description:
      'Applies heightened processing conditions and safeguards for specific categories of PII such as biometrics, financial vectors, and children (<18) data.',
    damaCrosswalk: 'Sensitivity & Classification Control',
    dpdpaCrosswalk: 'Sec 9 Processing of Personal Data of Children',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'RA-3': {
    id: 'RA-3',
    family: 'RA',
    familyName: 'Risk Assessment',
    title: 'Risk Assessment',
    shortLabel: 'DPIA & Algorithmic Risk Assessment',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Conducts a comprehensive assessment of risk (including Data Protection Impact Assessments and AI/ML model risk) arising from the processing of information.',
    damaCrosswalk: 'Enterprise Data Risk Management',
    dpdpaCrosswalk: 'Sec 10(2)(c) Mandatory DPIA for SDF',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SA-9': {
    id: 'SA-9',
    family: 'SA',
    familyName: 'System and Services Acquisition',
    title: 'External System Services',
    shortLabel: 'Third-Party Processor (TPRM) Control',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Requires providers of external system services (Data Processors / Sub-Processors) to comply with organizational security and privacy requirements via binding contracts.',
    damaCrosswalk: 'External Vendor & Processor Contract',
    dpdpaCrosswalk: 'Sec 8(2) Valid Data Processor Contract',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SC-7': {
    id: 'SC-7',
    family: 'SC',
    familyName: 'System and Communications Protection',
    title: 'Boundary Protection',
    shortLabel: 'Trust Zone Boundary Protection',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Monitors and controls communications at the external interface to the system and at key internal trust boundaries (DMZ, PCI-DSS Enclave, Air-Gapped K8s).',
    damaCrosswalk: 'Architecture & Perimeter Segmentation',
    dpdpaCrosswalk: 'Sec 8(4) Network Boundary Isolation',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SC-8': {
    id: 'SC-8',
    family: 'SC',
    familyName: 'System and Communications Protection',
    title: 'Transmission Confidentiality and Integrity',
    shortLabel: 'Transit Confidentiality & Integrity',
    baseline: ['MODERATE', 'HIGH'],
    description:
      'Protects the confidentiality and integrity of transmitted information across all internal and external data flows.',
    damaCrosswalk: 'Accuracy & Transit Security',
    dpdpaCrosswalk: 'Sec 8(5) Transit Safeguards',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SC-8(1)': {
    id: 'SC-8(1)',
    family: 'SC',
    familyName: 'System and Communications Protection',
    title: 'Transmission Confidentiality and Integrity | Cryptographic Protection',
    shortLabel: 'TLS 1.3 / mTLS Encryption in Transit',
    baseline: ['MODERATE', 'HIGH'],
    description:
      'Implements cryptographic mechanisms (TLS 1.3, mTLS 1.3, IPSec) to prevent unauthorized disclosure and detect changes to information during transmission.',
    damaCrosswalk: 'Cryptographic Data-in-Transit Contract',
    dpdpaCrosswalk: 'Sec 8(5) Encryption in Transit',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SC-12': {
    id: 'SC-12',
    family: 'SC',
    familyName: 'System and Communications Protection',
    title: 'Cryptographic Key Establishment and Management',
    shortLabel: 'HSM / KMS Key Management',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Establishes and manages cryptographic keys when cryptography is employed within the system using Hardware Security Modules (HSM) or KMS vaults.',
    damaCrosswalk: 'Cryptographic Key Governance',
    dpdpaCrosswalk: 'Sec 8(5) Key Custody & Rotation',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SC-13': {
    id: 'SC-13',
    family: 'SC',
    familyName: 'System and Communications Protection',
    title: 'Cryptographic Protection',
    shortLabel: 'FIPS 140-3 / AES-256 Cryptography',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Implements required cryptographic uses and types of cryptography in accordance with applicable standards (FIPS 140-3, AES-256-GCM, SHA-256).',
    damaCrosswalk: 'Cryptographic Standard Compliance',
    dpdpaCrosswalk: 'Sec 8(5) Cryptographic Safeguards',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SC-28': {
    id: 'SC-28',
    family: 'SC',
    familyName: 'System and Communications Protection',
    title: 'Protection of Information at Rest',
    shortLabel: 'Storage Protection at Rest',
    baseline: ['MODERATE', 'HIGH'],
    description:
      'Protects the confidentiality and integrity of information at rest in databases, analytical data lakes, and persistent queues.',
    damaCrosswalk: 'Storage & Persistence Integrity',
    dpdpaCrosswalk: 'Sec 8(5) Storage Safeguards',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SC-28(1)': {
    id: 'SC-28(1)',
    family: 'SC',
    familyName: 'System and Communications Protection',
    title: 'Protection of Information at Rest | Cryptographic Protection',
    shortLabel: 'AES-256-GCM Encryption at Rest',
    baseline: ['MODERATE', 'HIGH'],
    description:
      'Implements cryptographic mechanisms (AES-256-GCM, TDE, Envelope Encryption) to prevent unauthorized disclosure and modification of information at rest.',
    damaCrosswalk: 'Encrypted Persistence Contract',
    dpdpaCrosswalk: 'Sec 8(5) Encryption at Rest',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SI-4': {
    id: 'SI-4',
    family: 'SI',
    familyName: 'System and Information Integrity',
    title: 'System Monitoring',
    shortLabel: 'Anomaly & Fraud Monitoring',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Monitors the system to detect attacks, unauthorized connections, anomalous transactions, and potential indicators of compromise.',
    damaCrosswalk: 'Accuracy & Real-Time Anomaly Detection',
    dpdpaCrosswalk: 'Sec 8(5) Intrusion & Anomaly Detection',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SI-10': {
    id: 'SI-10',
    family: 'SI',
    familyName: 'System and Information Integrity',
    title: 'Information Input Validation',
    shortLabel: 'Schema & Input Validation Gate',
    baseline: ['MODERATE', 'HIGH'],
    description:
      'Checks the validity of information inputs (JSON Schema, Avro, Protobuf, ISO 8583) before downstream processing or persistence.',
    damaCrosswalk: 'Validity & Schema Enforcement',
    dpdpaCrosswalk: 'Sec 8(3) Data Completeness & Accuracy',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SI-12': {
    id: 'SI-12',
    family: 'SI',
    familyName: 'System and Information Integrity',
    title: 'Information Management and Retention',
    shortLabel: 'Retention & Purpose-Exhaustion Erasure',
    baseline: ['LOW', 'MODERATE', 'HIGH', 'PRIVACY'],
    description:
      'Manages and retains information within the system and output from the system in accordance with applicable laws, and erases data upon purpose exhaustion.',
    damaCrosswalk: 'Data Lifecycle & Retention Governance',
    dpdpaCrosswalk: 'Sec 8(7) Erasure on Purpose Exhaustion',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SI-19': {
    id: 'SI-19',
    family: 'SI',
    familyName: 'System and Information Integrity',
    title: 'De-identification',
    shortLabel: 'PII Masking & Tokenization',
    baseline: ['PRIVACY'],
    description:
      'Removes, masks, tokenizes, or pseudonymizes direct identifiers from datasets prior to downstream analytics, AI training, or lower-trust persistence.',
    damaCrosswalk: 'PII Masking & Classification Downgrade Control',
    dpdpaCrosswalk: 'Sec 8(4) Data Minimisation & Pseudonymisation',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
  'SR-3': {
    id: 'SR-3',
    family: 'SR',
    familyName: 'Supply Chain Risk Management',
    title: 'Supply Chain Controls and Processes',
    shortLabel: 'Trusted Source & Supply Chain Verification',
    baseline: ['LOW', 'MODERATE', 'HIGH'],
    description:
      'Establishes a process to identify, assess, and mitigate supply chain and untrusted data source risks across upstream feeds and SDKs.',
    damaCrosswalk: 'Source Lineage & Provenance Trust',
    dpdpaCrosswalk: 'Sec 8(2) Processor & Source Integrity',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  },
};

function makeResolved(
  controlId: string,
  status: NistControlStatus,
  evidence: string
): ResolvedNistControl {
  const base = NIST_SP800_53_CATALOG[controlId] || {
    id: controlId,
    family: 'SC' as NistControlFamily,
    familyName: 'System and Communications Protection',
    title: controlId,
    shortLabel: controlId,
    baseline: ['MODERATE'],
    description: 'NIST SP 800-53 Rev 5 Control (OSCAL v1.4.0)',
    damaCrosswalk: 'Enterprise Data Governance',
    dpdpaCrosswalk: 'Sec 8(5) Safeguards',
    oscalCatalogPath: `${NIST_OSCAL_REPO_URL}/rev5/json`,
  };
  return {
    ...base,
    status,
    evidence,
  };
}

/**
 * Automatically resolves and evaluates the key NIST SP 800-53 Rev 5 (OSCAL v1.4.0)
 * controls for any DFD node based on its layer, label, protocol, classification, and DQ rules.
 */
export function resolveNodeNistControls(data: DfdNodeData): ResolvedNistControl[] {
  const metadata = data.metadata || {};
  const label = (data.label || '').toLowerCase();
  const protocol = (metadata.protocol || '').toLowerCase();
  const tech = (metadata.technology || '').toLowerCase();
  const pType = (metadata.processType || '').toLowerCase();
  const classification = metadata.dataClassification || 'INTERNAL';
  const dq = data.dataQuality;
  const hasCriticalRule = dq?.rules?.some((r) => r.status === 'CRITICAL');
  const controls: ResolvedNistControl[] = [];

  // Allow explicit overrides/additions from metadata.nistControls first
  const seen = new Set<string>();
  const addControl = (id: string, status: NistControlStatus, evidence: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    controls.push(makeResolved(id, status, evidence));
  };

  if (data.category === 'Source') {
    // 1. SC-8(1): Transmission Cryptographic Protection
    const isStrongTls =
      protocol.includes('mtls') ||
      protocol.includes('tls 1.3') ||
      protocol.includes('ipsec') ||
      protocol.includes('https');
    const isPlainHttp = protocol.includes('plain') || protocol === 'http';
    addControl(
      'SC-8(1)',
      isPlainHttp ? 'GAP' : isStrongTls ? 'IMPLEMENTED' : 'PARTIAL',
      isPlainHttp
        ? 'Unencrypted ingress protocol detected (Plain HTTP)'
        : `Ingress protected via ${metadata.protocol || 'TLS 1.3 / HTTPS'}`
    );

    // 2. IA-3 / IA-2: Device or User Authentication
    if (protocol.includes('mtls') || label.includes('pos') || label.includes('iot') || label.includes('gateway')) {
      addControl(
        'IA-3',
        protocol.includes('mtls') ? 'IMPLEMENTED' : 'PARTIAL',
        protocol.includes('mtls')
          ? 'Mutual TLS (mTLS 1.3) device/service authentication active'
          : 'Recommend upgrading ingress to mTLS 1.3 for mutual service authentication'
      );
    } else {
      addControl(
        'IA-2',
        !hasCriticalRule ? 'IMPLEMENTED' : 'PARTIAL',
        `Identity & session authentication on ${data.label}`
      );
    }

    // 3. CM-8 / SR-3: Trusted Component Inventory & Supply Chain Trust
    const isTrusted = metadata.trustedSource !== false;
    addControl(
      isTrusted ? 'CM-8' : 'SR-3',
      isTrusted ? 'IMPLEMENTED' : 'PARTIAL',
      isTrusted
        ? `Registered in Trusted Apps & Data Sources inventory (${metadata.assetId || 'Verified'})`
        : 'External / Untrusted source requires supply chain & schema gate verification'
    );

    // 4. Privacy controls for Restricted PII or Children's data
    if (classification === 'RESTRICTED_PII' || metadata.isChildData) {
      addControl(
        metadata.isChildData ? 'PT-7' : 'PT-5',
        hasCriticalRule ? 'GAP' : 'IMPLEMENTED',
        metadata.isChildData
          ? 'Minor (<18) data collection requires verifiable parental consent & no tracking'
          : 'Itemised Privacy Notice at PII collection point'
      );
    }
  } else if (data.category === 'Operations') {
    // 1. Consent Manager / Privacy Notice & Consent
    if (label.includes('consent') || metadata.dpdpaRole === 'Consent Manager') {
      addControl('PT-4', 'IMPLEMENTED', 'Consent Manager artifact ledger & withdrawal parity');
      addControl('PT-2', 'IMPLEMENTED', 'Verifies lawful authority prior to downstream processing');
      addControl('AU-9', 'IMPLEMENTED', 'Immutable consent artifact audit protection');
    }

    // 2. PII Masking / Tokenization / Cryptography
    if (
      pType.includes('mask') ||
      pType.includes('crypto') ||
      label.includes('mask') ||
      label.includes('token') ||
      label.includes('encrypt') ||
      label.includes('pii') ||
      label.includes('hsm')
    ) {
      addControl('SI-19', 'IMPLEMENTED', 'De-identification / PII masking & tokenization active');
      addControl('SC-13', 'IMPLEMENTED', 'FIPS 140-3 / AES-256-GCM cryptographic transformation');
      if (label.includes('hsm') || label.includes('key') || label.includes('vault')) {
        addControl('SC-12', 'IMPLEMENTED', 'HSM / KMS cryptographic key management');
      }
    }

    // 3. Validation / Schema Gate
    if (
      pType.includes('validation') ||
      label.includes('valid') ||
      label.includes('schema') ||
      label.includes('iso 8583') ||
      label.includes('sanitiz')
    ) {
      addControl(
        'SI-10',
        hasCriticalRule ? 'PARTIAL' : 'IMPLEMENTED',
        'Information input schema & payload validation gate'
      );
    }

    // 4. AI / ML / Fraud Scoring / Anomaly Detection
    if (
      label.includes('ai') ||
      label.includes('llm') ||
      label.includes('ml') ||
      label.includes('fraud') ||
      label.includes('scoring') ||
      label.includes('neural') ||
      label.includes('biometric')
    ) {
      addControl('RA-3', 'IMPLEMENTED', 'Algorithmic / AI model risk assessment & DPIA oversight');
      addControl('SI-4', 'IMPLEMENTED', 'Real-time transaction & behavioral anomaly monitoring');
      addControl('PT-3', 'IMPLEMENTED', 'Specified PII processing purpose enforcement');
    }

    // 5. DLQ / Recovery (CP-10)
    const hasDlq = dq?.hasQuarantineDLQ !== false;
    addControl(
      'CP-10',
      hasDlq ? 'IMPLEMENTED' : 'GAP',
      hasDlq
        ? 'Quarantine Dead-Letter Queue (DLQ) configured for safe recovery'
        : 'Missing Quarantine DLQ for failed transformation recovery'
    );

    // Fallback if general ETL/Operation
    if (controls.length < 3) {
      addControl('AC-4', 'IMPLEMENTED', 'Regulated information flow transformation stage');
      addControl('SI-10', hasCriticalRule ? 'PARTIAL' : 'IMPLEMENTED', 'Pipeline input integrity check');
    }
  } else if (data.category === 'Child') {
    // 1. Third-Party Processor / TPRM
    if (
      metadata.dpdpaRole === 'Data Processor' ||
      label.includes('processor') ||
      label.includes('third-party') ||
      label.includes('vendor') ||
      label.includes('scheme') ||
      label.includes('bureau')
    ) {
      const hasDpa = !label.includes('no contract') && !hasCriticalRule;
      addControl(
        'SA-9',
        hasDpa ? 'IMPLEMENTED' : 'GAP',
        hasDpa
          ? 'External System Service governed by Sec 8(2) Data Processing Agreement'
          : 'External processor missing verified Sec 8(2) DPA contract'
      );
    }

    // 2. Cross-Border Cloud / Foreign Jurisdiction
    if (
      metadata.statutoryMandate?.includes('16') ||
      (metadata.location && !metadata.location.toLowerCase().includes('india') && metadata.location !== 'IN') ||
      label.includes('cross-border') ||
      label.includes('us-') ||
      label.includes('eu-')
    ) {
      addControl(
        'CA-3',
        hasCriticalRule ? 'GAP' : 'IMPLEMENTED',
        `Cross-border information exchange control (${metadata.location || 'External Region'})`
      );
    }

    // 3. Audit / RoPA / SIEM Ledger
    if (label.includes('audit') || label.includes('ropa') || label.includes('siem') || label.includes('log')) {
      addControl('AU-2', 'IMPLEMENTED', 'Centralized compliance & security event logging');
      addControl('AU-12', 'IMPLEMENTED', 'Automated RoPA & audit record generation');
      addControl('AU-9', 'IMPLEMENTED', 'Tamper-evident WORM audit storage');
    }

    // 4. Storage Encryption at Rest & Access Enforcement
    const isUnencrypted =
      tech.includes('unencrypted') ||
      (metadata.securityControls || []).some((c) => c.toLowerCase().includes('unencrypted'));
    addControl(
      'SC-28(1)',
      isUnencrypted || hasCriticalRule ? 'GAP' : 'IMPLEMENTED',
      isUnencrypted
        ? 'Storage repository lacks cryptographic protection at rest'
        : `Encrypted at rest (${metadata.technology || 'AES-256-GCM'})`
    );
    addControl(
      'AC-3',
      hasCriticalRule ? 'PARTIAL' : 'IMPLEMENTED',
      `Role-based access enforcement on ${data.label}`
    );
    addControl(
      'SI-12',
      'IMPLEMENTED',
      'Information retention schedule & purpose-exhaustion erasure policy'
    );
  } else {
    // Infra & Architecture Trust Boundaries
    addControl(
      'SC-7',
      'IMPLEMENTED',
      `Network & trust boundary segmentation (${metadata.securityZone || data.label})`
    );
    addControl(
      'AC-4',
      'IMPLEMENTED',
      'Cross-zone information flow enforcement policy'
    );
    addControl(
      'CA-7',
      'IMPLEMENTED',
      'Continuous boundary telemetry & posture monitoring'
    );
  }

  // Append any custom control IDs explicitly stored on metadata.nistControls
  if (metadata.nistControls && metadata.nistControls.length > 0) {
    metadata.nistControls.forEach((ctrlId) => {
      addControl(ctrlId, 'IMPLEMENTED', 'Explicitly assigned NIST SP 800-53 Rev 5 control');
    });
  }

  return controls.slice(0, 4);
}

/**
 * Automatically resolves and evaluates the key NIST SP 800-53 Rev 5 (OSCAL v1.4.0)
 * controls for any Data-in-Transit Edge.
 */
export function resolveEdgeNistControls(edgeData?: DfdEdgeData): ResolvedNistControl[] {
  const d = edgeData || {};
  const enc = (d.encryption || '').toLowerCase();
  const proto = (d.protocol || '').toLowerCase();
  const isEncrypted =
    d.encryptionAtRestAndTransit !== false &&
    d.isEncryptedInTransit !== false &&
    !enc.includes('none') &&
    !proto.includes('plain');
  const hasViolations = (d.dqViolations && d.dqViolations.length > 0) || d.dqStatus === 'CRITICAL';

  const list: ResolvedNistControl[] = [
    makeResolved(
      'SC-8(1)',
      isEncrypted ? 'IMPLEMENTED' : 'GAP',
      isEncrypted
        ? `Cryptographic transport active (${d.encryption || d.protocol || 'TLS 1.3'})`
        : 'Unencrypted data-in-transit link violates SC-8(1)'
    ),
    makeResolved(
      'AC-4',
      hasViolations ? 'GAP' : 'IMPLEMENTED',
      hasViolations
        ? 'Information flow contract violation detected on edge'
        : 'Authorized information flow contract enforced'
    ),
    makeResolved(
      'SI-10',
      d.schemaContract && d.schemaContract !== 'Unvalidated' ? 'IMPLEMENTED' : 'PARTIAL',
      `Payload schema contract: ${d.schemaContract || d.payloadFormat || 'JSON Schema'}`
    ),
  ];

  if (d.isCrossBorder) {
    list.push(
      makeResolved(
        'CA-3',
        d.dqStatus === 'CRITICAL' ? 'GAP' : 'IMPLEMENTED',
        `Cross-border information exchange to ${d.destinationCountry || 'Foreign Region'}`
      )
    );
  }

  return list;
}

/**
 * Evaluates the 10-Dimension Ingestion Channel against NIST SP 800-53 Rev 5 (OSCAL v1.4.0)
 */
export function evaluateIngestionChannelNistPosture(
  channel: IngestionChannelData
): ResolvedNistControl[] {
  const results: ResolvedNistControl[] = [];

  // 1. PT-2: Lawful Authority to Process PII
  const validBasis = channel.contextOfProcessing.lawfulBasis !== 'None - Non-Compliant';
  results.push(
    makeResolved(
      'PT-2',
      validBasis ? 'IMPLEMENTED' : 'GAP',
      `Lawful authority: ${channel.contextOfProcessing.lawfulBasis}`
    )
  );

  // 2. PT-4: Consent Management
  const consentPass = channel.dataPrivacy.readinessGates.consentWithdrawalParity === 'Pass';
  results.push(
    makeResolved(
      'PT-4',
      consentPass ? 'IMPLEMENTED' : 'PARTIAL',
      `${channel.dataPrivacy.consentManager} (Withdrawal Parity: ${channel.dataPrivacy.readinessGates.consentWithdrawalParity})`
    )
  );

  // 3. PT-7: Specific Categories of PII (Child / Sensitive)
  if (channel.contextOfProcessing.processesChildData) {
    const childPass = channel.dataPrivacy.readinessGates.childTrackingProhibition === 'Pass';
    results.push(
      makeResolved(
        'PT-7',
        childPass ? 'IMPLEMENTED' : 'GAP',
        childPass
          ? 'Child (<18) data safeguards & tracking prohibition active'
          : 'Child (<18) data processed without behavioral tracking prohibition'
      )
    );
  }

  // 4. SC-8(1): Encryption in Transit
  results.push(
    makeResolved(
      'SC-8(1)',
      channel.dataMovement.isEncryptedInTransit ? 'IMPLEMENTED' : 'GAP',
      channel.dataMovement.isEncryptedInTransit
        ? `Transit encrypted (${channel.dataMovement.transitProtocols.join(', ')})`
        : 'Unencrypted data movement in transit'
    )
  );

  // 5. SC-28(1): Encryption at Rest
  const encryptedRest = channel.dataStorage.encryptionAtRest !== 'Unencrypted';
  results.push(
    makeResolved(
      'SC-28(1)',
      encryptedRest ? 'IMPLEMENTED' : 'GAP',
      `Storage encryption: ${channel.dataStorage.encryptionAtRest}`
    )
  );

  // 6. SI-19: De-identification / Tokenization
  const hasMasking = channel.dataPrivacy.privacyControls.some(
    (c) =>
      c.toLowerCase().includes('mask') ||
      c.toLowerCase().includes('token') ||
      c.toLowerCase().includes('pseudonym')
  );
  results.push(
    makeResolved(
      'SI-19',
      hasMasking ? 'IMPLEMENTED' : 'PARTIAL',
      hasMasking
        ? `Active privacy controls: ${channel.dataPrivacy.privacyControls.slice(0, 2).join(', ')}`
        : 'No tokenization or PII masking control listed in privacy controls'
    )
  );

  // 7. CM-8: System Component Inventory (Trusted Apps & Sources)
  const untrustedCount = channel.trustedAppsAndSources.filter((s) => !s.trusted).length;
  results.push(
    makeResolved(
      'CM-8',
      untrustedCount === 0 ? 'IMPLEMENTED' : 'PARTIAL',
      `${channel.trustedAppsAndSources.length} registered Cover Apps & Data Sources (${
        untrustedCount === 0 ? '100% Trusted' : `${untrustedCount} Untrusted`
      })`
    )
  );

  // 8. SA-9: External System Services (Third Party Processors)
  if (channel.thirdPartyInvolvement.hasThirdPartyProcessors) {
    const unsigned = channel.thirdPartyInvolvement.processors.some(
      (p) => p.contractStatus !== 'Signed Sec 8(2) DPA'
    );
    results.push(
      makeResolved(
        'SA-9',
        unsigned ? 'GAP' : 'IMPLEMENTED',
        unsigned
          ? 'One or more third-party processors lack a signed Sec 8(2) DPA'
          : `${channel.thirdPartyInvolvement.processors.length} processor(s) governed by signed Sec 8(2) DPA`
      )
    );
  }

  // 9. CA-3: Cross-Border Information Exchange
  if (channel.crossBorderComponent.hasCrossBorderTransfer) {
    const unverified = channel.crossBorderComponent.transferSafeguard === 'Unverified Transfer';
    results.push(
      makeResolved(
        'CA-3',
        unverified ? 'GAP' : 'IMPLEMENTED',
        `Cross-border transfer (${channel.crossBorderComponent.destinationJurisdictions.join(
          ', '
        )}) · ${channel.crossBorderComponent.transferSafeguard}`
      )
    );
  }

  // 10. AU-12 & RA-3: RoPA & High-Volume DPIA
  results.push(
    makeResolved(
      'AU-12',
      'IMPLEMENTED',
      `RoPA Ledger ${channel.ropaMapping.ropaRecordId} (${channel.ropaMapping.estimatedVolume})`
    )
  );

  if (channel.dataUsage.usesAiMlModels || channel.ropaMapping.dpiaMandatory) {
    results.push(
      makeResolved(
        'RA-3',
        channel.ropaMapping.dpoSignOffStatus === 'Remediation Required' ? 'PARTIAL' : 'IMPLEMENTED',
        `Mandatory DPIA & AI Risk Assessment (${channel.ropaMapping.assessedRole})`
      )
    );
  }

  // 11. SI-12: Retention & Erasure
  const erasurePass = channel.dataPrivacy.readinessGates.erasureOnPurposeExhaustion === 'Pass';
  results.push(
    makeResolved(
      'SI-12',
      erasurePass ? 'IMPLEMENTED' : 'PARTIAL',
      `Retention: ${channel.dataStorage.retentionSchedule}`
    )
  );

  return results;
}

export interface GraphNistSummary {
  oscalVersion: string;
  catalogUrl: string;
  totalControlsEvaluated: number;
  implementedCount: number;
  partialCount: number;
  gapCount: number;
  coverageScore: number;
  controlsByFamily: Record<string, number>;
  uniqueControls: ResolvedNistControl[];
}

/**
 * Computes an aggregate NIST SP 800-53 Rev 5 (OSCAL v1.4.0) Control Summary across all
 * @xyflow/react nodes and edges in the Data Flow Diagram.
 */
export function evaluateGraphNistSummary(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[]
): GraphNistSummary {
  const controlMap = new Map<string, ResolvedNistControl>();
  const controlsByFamily: Record<string, number> = {};

  const mergeControl = (ctrl: ResolvedNistControl) => {
    const existing = controlMap.get(ctrl.id);
    if (!existing) {
      controlMap.set(ctrl.id, ctrl);
      controlsByFamily[ctrl.family] = (controlsByFamily[ctrl.family] || 0) + 1;
    } else {
      // Worst status wins so any GAP across the flow is surfaced
      const rank = { GAP: 3, PARTIAL: 2, IMPLEMENTED: 1 };
      if (rank[ctrl.status] > rank[existing.status]) {
        controlMap.set(ctrl.id, ctrl);
      }
    }
  };

  nodes.forEach((node) => {
    const resolved = resolveNodeNistControls(node.data);
    resolved.forEach(mergeControl);
  });

  edges.forEach((edge) => {
    const resolved = resolveEdgeNistControls(edge.data);
    resolved.forEach(mergeControl);
  });

  const uniqueControls = Array.from(controlMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  const implementedCount = uniqueControls.filter((c) => c.status === 'IMPLEMENTED').length;
  const partialCount = uniqueControls.filter((c) => c.status === 'PARTIAL').length;
  const gapCount = uniqueControls.filter((c) => c.status === 'GAP').length;
  const total = uniqueControls.length || 1;
  const coverageScore = Math.round(
    ((implementedCount + partialCount * 0.5) / total) * 100
  );

  return {
    oscalVersion: NIST_OSCAL_VERSION,
    catalogUrl: NIST_OSCAL_REPO_URL,
    totalControlsEvaluated: uniqueControls.length,
    implementedCount: implementedCount,
    partialCount: partialCount,
    gapCount: gapCount,
    coverageScore: coverageScore,
    controlsByFamily: controlsByFamily,
    uniqueControls: uniqueControls,
  };
}

export interface NodeNistOverlayEvaluation {
  controls: ResolvedNistControl[];
  implementedCount: number;
  partialCount: number;
  gapCount: number;
  coverageScore: number;
  severity: 'CRITICAL' | 'WARNING' | 'COMPLIANT';
  severityLabel: 'Critical' | 'Warning' | 'Compliant';
  statusHex: '#EF4444' | '#F59E0B' | '#10B981';
  cardBorderClass: string;
  headerBadgeClass: string;
  gapSummary: string;
}

/**
 * Evaluates a single DFD node's NIST SP 800-53 Rev 5 control coverage and maps it
 * to the existing Data Quality severity color system (Critical / Warning / Compliant).
 */
export function evaluateNodeNistOverlay(data: DfdNodeData): NodeNistOverlayEvaluation {
  const controls = resolveNodeNistControls(data);
  const implementedCount = controls.filter((c) => c.status === 'IMPLEMENTED').length;
  const partialCount = controls.filter((c) => c.status === 'PARTIAL').length;
  const gapCount = controls.filter((c) => c.status === 'GAP').length;
  const total = Math.max(controls.length, 1);
  const coverageScore = Math.round(((implementedCount + partialCount * 0.5) / total) * 100);

  const severity: 'CRITICAL' | 'WARNING' | 'COMPLIANT' =
    gapCount > 0 ? 'CRITICAL' : partialCount > 0 ? 'WARNING' : 'COMPLIANT';

  const severityLabel: 'Critical' | 'Warning' | 'Compliant' =
    severity === 'CRITICAL' ? 'Critical' : severity === 'WARNING' ? 'Warning' : 'Compliant';

  const statusHex: '#EF4444' | '#F59E0B' | '#10B981' =
    severity === 'CRITICAL' ? '#EF4444' : severity === 'WARNING' ? '#F59E0B' : '#10B981';

  const cardBorderClass =
    severity === 'CRITICAL'
      ? 'border-rose-500/90 ring-2 ring-rose-500/35 shadow-rose-500/20'
      : severity === 'WARNING'
      ? 'border-amber-500/85 ring-2 ring-amber-500/30 shadow-amber-500/20'
      : 'border-emerald-500/80 ring-2 ring-emerald-500/25 shadow-emerald-500/15';

  const headerBadgeClass =
    severity === 'CRITICAL'
      ? 'bg-rose-600/30 text-rose-200 border-rose-500/60'
      : severity === 'WARNING'
      ? 'bg-amber-500/25 text-amber-200 border-amber-500/50'
      : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50';

  const gapControls = controls.filter((c) => c.status === 'GAP').map((c) => c.id);
  const partialControls = controls.filter((c) => c.status === 'PARTIAL').map((c) => c.id);

  let gapSummary = `All ${controls.length} NIST 800-53 controls compliant`;
  if (gapControls.length > 0) {
    gapSummary = `Compliance Gap: ${gapControls.join(', ')}${
      partialControls.length > 0 ? ` · Partial: ${partialControls.join(', ')}` : ''
    }`;
  } else if (partialControls.length > 0) {
    gapSummary = `Partial Coverage: ${partialControls.join(', ')}`;
  }

  return {
    controls,
    implementedCount,
    partialCount,
    gapCount,
    coverageScore,
    severity,
    severityLabel,
    statusHex,
    cardBorderClass,
    headerBadgeClass,
    gapSummary,
  };
}


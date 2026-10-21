/**
 * Enterprise Data Flow Diagram (DFD) Types & Schema
 * Extended with DAMA Data Quality (DQ) Governance, Data Contracts, Linter Diagnostics,
 * and the 10-Dimension Ingestion Channel (DPDP-TRACE + Enterprise 5-Layer Base Data).
 */

import { Node, Edge } from '@xyflow/react';

/**
 * 6 Core DAMA Data Quality Dimensions
 */
export type DqDimension =
  | 'Completeness'
  | 'Accuracy'
  | 'Validity'
  | 'Consistency'
  | 'Uniqueness'
  | 'Timeliness';

/**
 * Data Quality Governance Severity Level
 */
export type DqSeverity = 'PASS' | 'WARN' | 'CRITICAL' | 'UNCHECKED';

/**
 * Specific Data Quality Rule attached to a node or pipeline stage
 */
export interface DataQualityRule {
  dimension: DqDimension;
  ruleDescription: string;
  status: DqSeverity;
}

/**
 * DPDP-TRACE / Statutory Roles from dataflow.md
 */
export type DpdpaRole =
  | 'Data Principal'
  | 'Data Fiduciary'
  | 'Significant Data Fiduciary'
  | 'Data Processor'
  | 'Sub-Processor'
  | 'Consent Manager'
  | 'DPBI';

/**
 * Input Source A — Trusted Apps & Data Sources Register Item (Stage 4 Discovery)
 */
export type TrustedAssetCategory =
  | 'Web/Mobile App'
  | 'Core DB'
  | 'Cloud Lake'
  | 'AI Model'
  | 'TPRM Processor';

export interface TrustedAppDataSource {
  id: string; // e.g., 'APP-01'
  name: string; // e.g., 'Customer Onboarding Portal'
  category: TrustedAssetCategory;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  piiTypes: string; // e.g., 'KYC, Aadhaar, Financial'
  trusted: boolean; // Trusted internal source vs external
  protocol?: string; // e.g., 'mTLS 1.3 / REST'
  location?: string; // e.g., 'India (ap-south-1)'
}

/**
 * Third-Party Involvement / TPRM Processor Entry (Sec 8(2))
 */
export interface ThirdPartyProcessorEntry {
  id: string;
  name: string;
  role: 'Data Processor' | 'Sub-Processor' | 'Third-Party SDK' | 'External Partner API';
  purpose: string;
  contractStatus: 'Signed Sec 8(2) DPA' | 'Pending Review' | 'No Formal Contract';
  destinationCountry: string; // e.g., 'IN', 'US', 'EU', 'SG'
}

/**
 * The 10-Dimension Ingestion Channel Schema (Base Data for Data Flow Diagram)
 */
export interface IngestionChannelData {
  // Free-form or AI-assisted narrative context
  rawContextNarrative: string;

  // 1. Context of Data Processing
  contextOfProcessing: {
    businessPurpose: string;
    sector: 'SEC_FINTECH' | 'SEC_HEALTH' | 'SEC_RETAIL' | 'SEC_TECH' | 'SEC_GOV';
    entityScope: 'Application' | 'AI_Launch' | 'Project' | 'Enterprise_Process';
    lawfulBasis:
      | 'Consent (Sec 6)'
      | 'Legitimate Use (Sec 7)'
      | 'Contractual Delivery'
      | 'Statutory Obligation'
      | 'None - Non-Compliant';
    dataPrincipalCohort: string[]; // e.g., ['Adult Consumers', 'Employees', 'Children / Minors (<18)']
    processesChildData: boolean; // DPDPA Sec 9 trigger
  };

  // 2. Data Usage
  dataUsage: {
    processingActivities: string[]; // e.g., ['KYC Verification', 'Fraud Scoring', 'Settlement']
    usesAiMlModels: boolean; // ISO/IEC 42001 AIMS & DPDPA Sec 10 SDF trigger
    aiModelDetails?: string; // e.g., 'Risk Scoring LLM Engine / Real-time Fraud Classifier'
    automatedDecisioning: boolean;
  };

  // 3. Data Movement
  dataMovement: {
    ingressChannels: string[]; // e.g., ['Mobile App Portal', 'API Gateway', 'Account Aggregator']
    transitProtocols: string[]; // e.g., ['mTLS 1.3 / REST', 'Kafka TLS / Avro', 'gRPC']
    isEncryptedInTransit: boolean; // DPDPA Sec 8(5)
    movementCadence: 'Real-time (<150ms)' | 'Streaming (<1s)' | 'Micro-batch (15m)' | 'Daily Batch 00:00';
  };

  // 4. Data Storage
  dataStorage: {
    repositories: string[]; // e.g., ['Core Production DB (PostgreSQL)', 'Enterprise Analytics Lake (S3)']
    encryptionAtRest: 'AES-256-GCM + HSM' | 'AES-256-GCM' | 'TDE Standard' | 'Unencrypted';
    primaryRegion: string; // e.g., 'India (ap-south-1 Mumbai)'
    retentionSchedule: string; // e.g., '7 Years Regulatory / Sec 8(7) Purpose Exhaustion'
  };

  // 5. Data Privacy
  dataPrivacy: {
    piiCategories: string[]; // e.g., ['Identity PII', 'Aadhaar / PAN', 'Financial Vectors', 'Biometric']
    consentManager: string; // e.g., 'Consent Manager Artifact Ledger (Sec 6(7))'
    privacyControls: string[]; // e.g., ['PII Tokenization Vault', 'Field-Level Masking', 'RBAC']
    readinessGates: {
      noticeItemisation: 'Pass' | 'Partial' | 'Fail';
      consentWithdrawalParity: 'Pass' | 'Partial' | 'Fail';
      childTrackingProhibition: 'Pass' | 'Partial' | 'Fail';
      erasureOnPurposeExhaustion: 'Pass' | 'Partial' | 'Fail';
      dpbi72HrBreachReadiness: 'Pass' | 'Partial' | 'Fail';
      nominationFacility: 'Pass' | 'Partial' | 'Fail';
    };
  };

  // 6. Infrastructure Component
  infrastructureComponent: {
    hostingClusters: string[]; // e.g., ['Air-Gapped K8s Cluster', 'AWS VPC (ap-south-1)', 'Kafka Event Mesh']
    securityZones: string[]; // e.g., ['DMZ Edge', 'PCI-DSS Enclave', 'mTLS 1.3 Trust Boundary']
  };

  // 7. Cross Border Component (Cloud / Data Center in other countries)
  crossBorderComponent: {
    hasCrossBorderTransfer: boolean; // DPDPA Sec 16
    destinationJurisdictions: string[]; // e.g., ['IN', 'US', 'EU', 'SG']
    foreignCloudRegions: string[]; // e.g., ['US-East GPU Inference Cloud', 'EU Frankfurt DR Vault']
    transferSafeguard: 'Sovereign Whitelist (Sec 16)' | 'Standard Contractual Clauses' | 'Unverified Transfer';
  };

  // 8. Trusted Apps & Data Sources Register (Stage 4 Inventory)
  trustedAppsAndSources: TrustedAppDataSource[];

  // 9. Third Party Involvement (TPRM / Sec 8(2))
  thirdPartyInvolvement: {
    hasThirdPartyProcessors: boolean;
    processors: ThirdPartyProcessorEntry[];
  };

  // 10. Data Mapping / RoPA (High Volume Processing)
  ropaMapping: {
    isHighVolumeProcessing: boolean;
    ropaRecordId: string; // e.g., 'ROPA-2026-FIN-01'
    estimatedVolume: string; // e.g., '2.5M transactions/day'
    assessedRole: 'Data Fiduciary' | 'Significant Data Fiduciary';
    dpiaMandatory: boolean; // Sec 10 SDF
    dpoSignOffStatus: 'Ready for Sign-Off' | 'Conditional Approval' | 'Remediation Required';
  };
}

/**
 * The 5 Core Dimensions of Data Flow captured by the enterprise assessment form,
 * backed by the 10-Dimension Ingestion Channel base data.
 */
export interface AssessmentInputPayload {
  // 1. Origin of data/trigger (e.g. User Portal, ERP, API Gateway, IoT Sensor)
  source: string[];
  // 2. Downstream targets, dependencies, consumer services (e.g. Analytics DB, Payment Processor, Sub-ledger)
  child: string[];
  // 3. Underlying hosting & network infrastructure (e.g. On-Prem VMware, Air-gapped K8s Cluster, AWS VPC, Kafka Broker)
  infra: string[];
  // 4. Business logic, batch jobs, transformations, human processes (e.g. Daily ETL, PII Masking, Invoice Approval)
  operations: string[];
  // 5. Security zones, protocols, compliance boundaries (e.g. DMZ, mTLS, REST/gRPC, PCI-DSS Zone)
  architecture: string[];

  // Base Data from the 10-Dimension Ingestion Channel
  ingestionChannel?: IngestionChannelData;

  // Assessment Context Metadata
  metadata?: {
    systemName: string;
    assessmentId: string;
    environment: 'air-gapped-production' | 'on-prem-dmz' | 'classified' | 'hybrid-vpc';
    classificationLevel: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED_PII';
    complianceFrameworks?: string[];
    notes?: string;
  };
}

/**
 * Standard categories matching the 5 assessment dimensions
 */
export type DfdCategory = 'Source' | 'Child' | 'Infra' | 'Operations' | 'Architecture';

/**
 * Node Types supported by the custom @xyflow/react diagram canvas
 */
export type DfdNodeType = 'sourceNode' | 'childNode' | 'operationNode' | 'group';

/**
 * Metadata attached to DFD nodes (extended with DPDP-TRACE attributes)
 */
export interface DfdNodeMetadata {
  infraType?: string;
  securityZone?: string;
  processType?:
    | 'ETL'
    | 'Transformation'
    | 'Real-time Stream'
    | 'Batch Job'
    | 'Human Review'
    | 'Validation'
    | 'Cryptographic Masking'
    | 'API Gateway'
    | string;
  dataClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED_PII';
  protocol?: string;
  technology?: string;
  sla?: string;
  criticality?: 'Low' | 'Medium' | 'High' | 'Mission-Critical';
  description?: string;
  // DPDP-TRACE Statutory & Ingestion Metadata
  dpdpaRole?: DpdpaRole;
  statutoryMandate?: string; // e.g., 'Sec 5 / Sec 9', 'Sec 8(5) & 8(7)', 'Sec 8(2) TPRM', 'Sec 16 Cross-Border'
  dataStored?: string[];
  isChildData?: boolean;
  securityControls?: string[];
  location?: string; // e.g., 'India (ap-south-1)' | 'US' | 'EU' | 'SG'
  trustedSource?: boolean;
  assetId?: string;
  // NIST SP 800-53 Rev 5 (OSCAL v1.4.0) Key Controls
  nistControls?: string[];
}

/**
 * Node Data with Data Quality Overlay
 */
export interface DfdNodeData extends Record<string, unknown> {
  label: string;
  category: DfdCategory;
  metadata?: DfdNodeMetadata;
  dataQuality?: {
    score?: number;
    slaLatency?: string;
    hasQuarantineDLQ?: boolean;
    rules?: DataQualityRule[];
  };
  showNistOverlay?: boolean;
  collapsed?: boolean;
  width?: number;
  height?: number;
}

/**
 * React Flow Node with DfdNodeData
 */
export type CustomDfdNode = Node<DfdNodeData, DfdNodeType>;

/**
 * Custom Edge Data for Data-in-Transit Contracts & Governance
 */
export interface DfdEdgeData extends Record<string, unknown> {
  protocol?: string;
  schemaContract?: string;
  timelinessSla?: string;
  encryptionAtRestAndTransit?: boolean;
  // Governance & Linter Attributes
  dqStatus?: DqSeverity;
  dqViolations?: string[];
  payloadFormat?: 'JSON' | 'Avro' | 'Protobuf' | 'XML' | 'CSV' | 'Binary';
  encryption?: 'mTLS' | 'TLS 1.3' | 'IPSec' | 'None (Air-gapped)' | 'AES-256 GCM';
  frequency?: 'Continuous' | 'Batch 15m' | 'Daily 00:00' | 'On-Demand';
  dataVolume?: string;
  notes?: string;
  // DPDP-TRACE Edge Attributes
  payloadCategories?: string[];
  isEncryptedInTransit?: boolean;
  isCrossBorder?: boolean;
  destinationCountry?: string;
  lawfulBasis?: string;
  violationNotes?: string;
}

/**
 * React Flow Edge with DfdEdgeData
 */
export type CustomDfdEdge = Edge<DfdEdgeData>;

/**
 * Canonical JSON schema expected from LLM inference
 */
export interface RawLlmGraphOutput {
  nodes: Array<{
    id: string;
    type: 'group' | 'sourceNode' | 'operationNode' | 'childNode';
    parentId?: string;
    extent?: 'parent';
    position?: { x: number; y: number };
    data: {
      label: string;
      category: DfdCategory;
      metadata?: DfdNodeMetadata;
      dataQuality?: {
        score?: number;
        slaLatency?: string;
        hasQuarantineDLQ?: boolean;
        rules: DataQualityRule[];
      };
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
    type?: string;
    data?: DfdEdgeData;
  }>;
}

/**
 * Endpoint provider configurations for Air-Gapped Local LLM
 */
export type LlmProviderType =
  | 'ollama'
  | 'lmstudio'
  | 'unsloth'
  | 'custom'
  | 'airgapped-deterministic'
  | 'gemini-fallback';

export interface LlmConfig {
  provider: LlmProviderType;
  endpointUrl: string;
  modelName: string;
  temperature: number;
  timeoutMs: number;
  retryAttempts: number;
  apiKey?: string;
}

/**
 * Architecture Validation Rule & Result
 */
export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  nodeIds?: string[];
  edgeIds?: string[];
  recommendation?: string;
}

export interface ValidationSummary {
  passed: boolean;
  issues: ValidationIssue[];
  totalNodes: number;
  totalEdges: number;
  orphanNodes: number;
  unsecuredCrossings: number;
}

export type ContractMismatchType =
  | 'CLASSIFICATION_DOWNGRADE'
  | 'DIRECT_INGESTION_BYPASS'
  | 'SCHEMA_SERIALIZATION_MISMATCH'
  | 'TIMELINESS_SLA_MISMATCH'
  | 'BOUNDARY_ENCRYPTION_VIOLATION'
  | 'MISSING_DLQ_QUARANTINE'
  | 'DATA_SINKHOLE'
  | 'UNFED_TARGET';

export interface SourceChildContractMismatch {
  id: string;
  sourceNodeId: string;
  sourceLabel: string;
  childNodeId: string;
  childLabel: string;
  pathNodeIds: string[];
  pathLabels: string[];
  mismatchType: ContractMismatchType;
  severity: DqSeverity;
  dimension: DqDimension;
  title: string;
  message: string;
  sourceContract: {
    classification?: string;
    format?: string;
    sla?: string;
    zone?: string;
  };
  childContract: {
    classification?: string;
    format?: string;
    sla?: string;
    zone?: string;
  };
  recommendation: string;
}

/**
 * Data Quality Graph Linter Diagnostic & Result
 */
export interface DqLinterDiagnostic {
  id: string;
  type: 'edge' | 'node';
  targetId: string;
  severity: DqSeverity;
  ruleName: string;
  message: string;
  recommendation: string;
  dimension?: DqDimension;
  sourceNodeId?: string;
  childNodeId?: string;
  pathNodeIds?: string[];
  mismatchType?: ContractMismatchType;
}

export interface DqLinterResult {
  nodes: CustomDfdNode[];
  edges: CustomDfdEdge[];
  summary: {
    criticalCount: number;
    warnCount: number;
    passCount: number;
    totalChecked: number;
    overallHealthScore: number;
    sourceChildContractViolationCount?: number;
  };
  diagnostics: DqLinterDiagnostic[];
  sourceChildMismatches?: SourceChildContractMismatch[];
}

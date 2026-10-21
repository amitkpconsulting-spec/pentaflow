/**
 * Compliance, Onboarding, Bulk Remediation & Immutable Activity Log Types
 */

import { SourceChildContractMismatch, DqLinterDiagnostic } from './dfd';

export type ComplianceSeverity = 'CRITICAL' | 'WARNING' | 'COMPLIANT';

/**
 * Consistent Hex Codes across all screens (Epic 2 Acceptance Criteria)
 * Critical (Red): #EF4444
 * Warning (Yellow): #F59E0B
 * Compliant/Resolved (Green): #10B981
 */
export const COMPLIANCE_STATUS_HEX: Record<ComplianceSeverity, string> = {
  CRITICAL: '#EF4444',
  WARNING: '#F59E0B',
  COMPLIANT: '#10B981',
};

export const COMPLIANCE_STATUS_LABEL: Record<ComplianceSeverity, string> = {
  CRITICAL: 'Critical',
  WARNING: 'Warning',
  COMPLIANT: 'Compliant',
};

export interface OnboardingProfile {
  companyName: string;
  userName: string;
  region: string;
  industry: string;
  completed: boolean;
  skipped: boolean;
  configuredAt?: string;
}

export interface ComplianceAlertItem {
  id: string;
  severity: ComplianceSeverity;
  originalSeverity: ComplianceSeverity;
  statusHex: string;
  /** Single-line plain-English summary (Progressive Disclosure) */
  plainSummary: string;
  /** Specific legal regulation mapped to region/industry */
  legalRegulation: string;
  /** Exact error description in clear language */
  exactError: string;
  /** Actionable recommended fix */
  recommendedFix: string;
  sourceNodeId: string;
  sourceLabel: string;
  targetNodeId?: string;
  targetLabel?: string;
  dimension: string;
  isResolved: boolean;
  resolvedAt?: string;
  mismatch?: SourceChildContractMismatch;
  diagnostic?: DqLinterDiagnostic;
}

/**
 * Strictly Immutable Activity Log Entry (Epic 4 Acceptance Criteria)
 * Entries cannot be edited or deleted by any user, including Admins.
 */
export interface ActivityLogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly userName: string;
  readonly actionTaken: string;
  readonly statusChange: string;
  readonly severity: ComplianceSeverity;
}

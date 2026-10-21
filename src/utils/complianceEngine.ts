/**
 * Compliance Prioritization, Plain-Language Translation, Audit Export (.PDF & .CSV),
 * and Immutable Activity Log Engine
 */

import { jsPDF } from 'jspdf';
import {
  CustomDfdNode,
  CustomDfdEdge,
  DqLinterResult,
  SourceChildContractMismatch,
} from '../types/dfd';
import {
  ComplianceAlertItem,
  ComplianceSeverity,
  COMPLIANCE_STATUS_HEX,
  OnboardingProfile,
  ActivityLogEntry,
} from '../types/compliance';
import { ENTERPRISE_ASSESSMENT_PRESETS, AssessmentPreset } from '../data/sampleAssessments';
import { downloadFile } from './dfdExport';

const ONBOARDING_STORAGE_KEY = 'pentaflow_onboarding_profile_v1';
const ACTIVITY_LOG_STORAGE_KEY = 'pentaflow_immutable_activity_log_v1';

export const REGION_OPTIONS = [
  {
    value: 'EU_GDPR',
    label: 'European Union (GDPR / DORA / NIS2)',
    primaryRegulation: 'EU GDPR Art. 25, Art. 30 & Art. 32; DORA Art. 11',
  },
  {
    value: 'US_FEDERAL',
    label: 'United States (HIPAA / CCPA / SOX / GLBA)',
    primaryRegulation: 'HIPAA 45 CFR §164.312, CCPA §1798.100 & SOX Sec. 404',
  },
  {
    value: 'APAC_INDIA',
    label: 'India & APAC (DPDP Act 2023 / RBI / MAS TRM)',
    primaryRegulation: 'India DPDP Act 2023 Sec. 8, RBI Cyber Security Framework & MAS TRM',
  },
  {
    value: 'UK_FCA',
    label: 'United Kingdom (UK-GDPR / FCA Operational Resilience)',
    primaryRegulation: 'UK-GDPR Art. 32 & FCA SYSC 15A Operational Resilience',
  },
  {
    value: 'GLOBAL_ISO',
    label: 'Global Cross-Border (ISO/IEC 27001 / DAMA-DMBOK2)',
    primaryRegulation: 'ISO/IEC 27001:2022 Annex A.8 & DAMA-DMBOK2 Data Governance Standard',
  },
];

export const INDUSTRY_OPTIONS = [
  {
    value: 'FINANCE_BANKING',
    label: 'Banking & Capital Markets (SWIFT / ISO 20022)',
    presetId: 'fin-cross-border-settlement',
    frameworks: ['PCI-DSS v4.0', 'SWIFT CSP', 'BCBS 239', 'DAMA-DMBOK2'],
  },
  {
    value: 'PAYMENTS_CARDS',
    label: 'Payment Processing & Card Schemes (PCI-DSS / ISO 8583)',
    presetId: 'tx-credit-card-payment',
    frameworks: ['PCI-DSS v4.0 Req. 3 & 4', 'ISO 8583', 'SOC2 Type II'],
  },
  {
    value: 'RETAIL_ONBOARDING',
    label: 'Retail & Digital Customer Onboarding (PII / Consumer)',
    presetId: 'retail-customer-onboarding',
    frameworks: ['GDPR Art. 30', 'CCPA / CPRA', 'SOC2 Type II'],
  },
  {
    value: 'IDENTITY_KYC',
    label: 'Identity Verification, Biometrics & AML (KYC / eIDAS)',
    presetId: 'kyc-aml-identity-verification',
    frameworks: ['FATF AML Rec. 10', 'GDPR Art. 9 Biometrics', 'ISO 27701'],
  },
  {
    value: 'HEALTHCARE_CLINICAL',
    label: 'Healthcare & Clinical Life Sciences (HIPAA / HL7 FHIR)',
    presetId: 'hipaa-clinical-telemetry',
    frameworks: ['HIPAA Security Rule', 'HL7 FHIR R4', 'FDA 21 CFR Part 11'],
  },
];

export function loadOnboardingProfile(): OnboardingProfile | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingProfile;
  } catch {
    return null;
  }
}

export function saveOnboardingProfile(profile: OnboardingProfile): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save onboarding profile:', err);
  }
}

export function getSmartDefaultsForOnboarding(
  regionValue: string,
  industryValue: string,
  companyName: string
): {
  preset: AssessmentPreset;
  complianceFrameworks: string[];
  regionLabel: string;
  industryLabel: string;
} {
  const regionObj =
    REGION_OPTIONS.find((r) => r.value === regionValue) || REGION_OPTIONS[0];
  const industryObj =
    INDUSTRY_OPTIONS.find((i) => i.value === industryValue) || INDUSTRY_OPTIONS[0];

  const basePreset =
    ENTERPRISE_ASSESSMENT_PRESETS.find((p) => p.id === industryObj.presetId) ||
    ENTERPRISE_ASSESSMENT_PRESETS[0];

  const clonedPreset: AssessmentPreset = JSON.parse(JSON.stringify(basePreset));
  const combinedFrameworks = Array.from(
    new Set([regionObj.primaryRegulation.split(';')[0], ...industryObj.frameworks])
  );

  if (clonedPreset.payload.metadata) {
    clonedPreset.payload.metadata.systemName = companyName
      ? `${companyName} — ${basePreset.payload.metadata?.systemName || basePreset.name}`
      : basePreset.payload.metadata?.systemName || basePreset.name;
    clonedPreset.payload.metadata.complianceFrameworks = combinedFrameworks;
  }

  return {
    preset: clonedPreset,
    complianceFrameworks: combinedFrameworks,
    regionLabel: regionObj.label,
    industryLabel: industryObj.label,
  };
}

/**
 * Load Immutable Activity Logs (frozen array of frozen entries)
 */
export function loadActivityLogs(): readonly ActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_STORAGE_KEY);
    if (!raw) {
      const seedLogs: ActivityLogEntry[] = [
        Object.freeze({
          id: 'log-seed-1',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          userName: 'System Governance Engine',
          actionTaken: 'Initialized 5-Layer Source-to-Child Data Contract Scanner',
          statusChange: 'Baseline Initialized -> Green',
          severity: 'COMPLIANT',
        }),
        Object.freeze({
          id: 'log-seed-2',
          timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
          userName: 'Compliance Auditor (Lead)',
          actionTaken: 'Flagged Source-Child PII Classification & Validation Gate Alerts',
          statusChange: 'Detected Critical & Warning Risks (Red / Yellow)',
          severity: 'CRITICAL',
        }),
      ];
      localStorage.setItem(ACTIVITY_LOG_STORAGE_KEY, JSON.stringify(seedLogs));
      return Object.freeze(seedLogs);
    }
    const parsed = JSON.parse(raw) as ActivityLogEntry[];
    return Object.freeze(parsed.map((item) => Object.freeze({ ...item })));
  } catch {
    return Object.freeze([]);
  }
}

/**
 * Append a new immutable entry to the chronological Activity Log.
 * No update or delete methods exist by design (Epic 4 Immutability Criteria).
 */
export function appendImmutableActivityLog(params: {
  userName: string;
  actionTaken: string;
  statusChange: string;
  severity: ComplianceSeverity;
}): readonly ActivityLogEntry[] {
  const existing = loadActivityLogs();
  const newEntry: ActivityLogEntry = Object.freeze({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    userName: params.userName || 'Compliance Manager',
    actionTaken: params.actionTaken,
    statusChange: params.statusChange,
    severity: params.severity,
  });

  const updated = Object.freeze([newEntry, ...existing]);
  try {
    localStorage.setItem(ACTIVITY_LOG_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to persist immutable activity log:', err);
  }
  return updated;
}

/**
 * Translate a technical SourceChildContractMismatch into Plain English + Region-Aware Regulation
 */
function translateMismatchToPlainEnglish(
  m: SourceChildContractMismatch,
  regionValue?: string
): {
  plainSummary: string;
  legalRegulation: string;
  exactError: string;
  recommendedFix: string;
} {
  const regionObj =
    REGION_OPTIONS.find((r) => r.value === regionValue) || REGION_OPTIONS[0];

  switch (m.mismatchType) {
    case 'DIRECT_INGESTION_BYPASS':
      return {
        plainSummary: `Raw data from "${m.sourceLabel}" saves directly into "${m.childLabel}" without a validation check.`,
        legalRegulation: `${regionObj.primaryRegulation} — Mandatory Input Validation & Data Integrity Control (DAMA Validity)`,
        exactError: `Source "${m.sourceLabel}" is wired directly to storage "${m.childLabel}" with zero intermediate validation, schema checking, or sanitization gates.`,
        recommendedFix: `Insert an automated Schema Validation & Sanitization step between "${m.sourceLabel}" and "${m.childLabel}".`,
      };

    case 'CLASSIFICATION_DOWNGRADE':
      return {
        plainSummary: `Sensitive customer data from "${m.sourceLabel}" enters lower-security storage "${m.childLabel}" without masking.`,
        legalRegulation: `${regionObj.primaryRegulation} & PCI-DSS v4.0 Req. 3.4 — Cryptographic Protection & PII Masking`,
        exactError: `High-sensitivity data (${m.sourceContract.classification || 'RESTRICTED_PII'}) from "${m.sourceLabel}" flows into "${m.childLabel}" (${m.childContract.classification || 'INTERNAL'}) without field-level tokenization or PII scrubbing.`,
        recommendedFix: `Add a PII Masking & Tokenization step on the outbound route from "${m.sourceLabel}" before data reaches "${m.childLabel}".`,
      };

    case 'BOUNDARY_ENCRYPTION_VIOLATION':
      return {
        plainSummary: `Data moving from "${m.sourceLabel}" to "${m.childLabel}" crosses a security boundary without encryption.`,
        legalRegulation: `${regionObj.primaryRegulation} & PCI-DSS v4.0 Req. 4.2.1 — Strong Cryptography Across Untrusted Networks`,
        exactError: `Traffic leaves zone "${m.sourceContract.zone || 'External Zone'}" and enters "${m.childContract.zone || 'Core Enclave'}" over an unverified or unencrypted connection.`,
        recommendedFix: `Enable mutual TLS (mTLS 1.3) encryption on all connections originating from "${m.sourceLabel}".`,
      };

    case 'SCHEMA_SERIALIZATION_MISMATCH':
      return {
        plainSummary: `Data format from "${m.sourceLabel}" (${m.sourceContract.format || 'Binary'}) does not match "${m.childLabel}" (${m.childContract.format || 'JSON'}).`,
        legalRegulation: `${regionObj.primaryRegulation} — Cross-System Data Interoperability & Schema Consistency`,
        exactError: `Origin "${m.sourceLabel}" emits ${m.sourceContract.format || 'Binary'} records while target "${m.childLabel}" requires ${m.childContract.format || 'JSON'} without a format converter.`,
        recommendedFix: `Insert a Format Conversion step (${m.sourceContract.format || 'Binary'} to ${m.childContract.format || 'JSON'}) downstream of "${m.sourceLabel}".`,
      };

    case 'TIMELINESS_SLA_MISMATCH':
      return {
        plainSummary: `Delivery speed from "${m.sourceLabel}" does not match the real-time requirement of "${m.childLabel}".`,
        legalRegulation: `${regionObj.primaryRegulation} — Operational Timeliness & Availability SLA Governance`,
        exactError: m.message,
        recommendedFix: `Upgrade "${m.sourceLabel}" to real-time event streaming with a Kafka staging buffer.`,
      };

    case 'MISSING_DLQ_QUARANTINE':
      return {
        plainSummary: `Pipeline from "${m.sourceLabel}" to "${m.childLabel}" has no backup queue for failed records.`,
        legalRegulation: `${regionObj.primaryRegulation} & SOC2 CC7.2 — Exception Quarantine & Zero Silent Data Loss`,
        exactError: `Processing steps between "${m.sourceLabel}" and "${m.childLabel}" lack a Dead-Letter Queue (DLQ). Malformed records will be dropped or halt the pipeline.`,
        recommendedFix: `Enable an automated Dead-Letter Queue (DLQ) quarantine bucket on the processing step for "${m.sourceLabel}".`,
      };

    case 'DATA_SINKHOLE':
      return {
        plainSummary: `Source "${m.sourceLabel}" collects data but is not connected to any destination.`,
        legalRegulation: `${regionObj.primaryRegulation} — Data Lineage Completeness & Orphaned Collection Prevention`,
        exactError: `Source node "${m.sourceLabel}" has 0 outgoing connections, leaving collected data unrouted.`,
        recommendedFix: `Connect "${m.sourceLabel}" to a validation step and downstream storage destination.`,
      };

    case 'UNFED_TARGET':
      return {
        plainSummary: `Destination "${m.childLabel}" has no incoming data source connected to it.`,
        legalRegulation: `${regionObj.primaryRegulation} — Architectural Completeness & Storage Auditability`,
        exactError: `Storage node "${m.childLabel}" expects incoming records but has 0 inbound routes.`,
        recommendedFix: `Connect an active Source or processing step into "${m.childLabel}".`,
      };

    default:
      return {
        plainSummary: m.title,
        legalRegulation: regionObj.primaryRegulation,
        exactError: m.message,
        recommendedFix: m.recommendation,
      };
  }
}

/**
 * Build the Risk-Prioritized Compliance Alert List:
 * Strictly sorted: Critical (Red #EF4444) -> Warning (Yellow #F59E0B) -> Compliant/Resolved (Green #10B981)
 */
export function buildPrioritizedComplianceAlerts(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[],
  dqResult: DqLinterResult,
  resolvedRecords: Record<string, { resolvedAt: string; previousSeverity: ComplianceSeverity; itemSnapshot: ComplianceAlertItem }>,
  profile?: OnboardingProfile | null
): ComplianceAlertItem[] {
  const regionVal = profile?.region || 'EU_GDPR';
  const regionObj =
    REGION_OPTIONS.find((r) => r.value === regionVal) || REGION_OPTIONS[0];

  const activeItems: ComplianceAlertItem[] = [];
  const seenIds = new Set<string>();

  // 1. Convert active Source-Child Contract Mismatches
  (dqResult.sourceChildMismatches || []).forEach((m) => {
    const severity: ComplianceSeverity =
      m.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
    const translated = translateMismatchToPlainEnglish(m, regionVal);

    const item: ComplianceAlertItem = {
      id: m.id,
      severity,
      originalSeverity: severity,
      statusHex: COMPLIANCE_STATUS_HEX[severity],
      plainSummary: translated.plainSummary,
      legalRegulation: translated.legalRegulation,
      exactError: translated.exactError,
      recommendedFix: translated.recommendedFix,
      sourceNodeId: m.sourceNodeId,
      sourceLabel: m.sourceLabel,
      targetNodeId: m.childNodeId,
      targetLabel: m.childLabel,
      dimension: m.dimension,
      isResolved: false,
      mismatch: m,
    };
    activeItems.push(item);
    seenIds.add(item.id);
  });

  // 2. Include previously resolved items as Green (COMPLIANT) so users see their resolved records
  Object.entries(resolvedRecords).forEach(([id, record]) => {
    if (!seenIds.has(id)) {
      activeItems.push({
        ...record.itemSnapshot,
        id,
        severity: 'COMPLIANT',
        statusHex: COMPLIANCE_STATUS_HEX.COMPLIANT,
        isResolved: true,
        resolvedAt: record.resolvedAt,
      });
      seenIds.add(id);
    }
  });

  // 3. Add verified Compliant Source routes (Green #10B981)
  const sourceNodes = nodes.filter(
    (n) => n.type === 'sourceNode' || n.data?.category === 'Source'
  );
  sourceNodes.forEach((src) => {
    const hasActiveViolation = activeItems.some(
      (i) => !i.isResolved && i.sourceNodeId === src.id
    );
    if (!hasActiveViolation) {
      const outEdges = edges.filter((e) => e.source === src.id);
      if (outEdges.length > 0) {
        const compId = `compliant-source-${src.id}`;
        if (!seenIds.has(compId)) {
          activeItems.push({
            id: compId,
            severity: 'COMPLIANT',
            originalSeverity: 'COMPLIANT',
            statusHex: COMPLIANCE_STATUS_HEX.COMPLIANT,
            plainSummary: `Source "${src.data.label}" is governed with validated schema contracts and encrypted transport.`,
            legalRegulation: `${regionObj.primaryRegulation} — Verified Source Origin Compliance`,
            exactError: `No errors detected. Outbound routes from "${src.data.label}" pass all 6 DAMA Data Quality checks.`,
            recommendedFix: `No action needed. Continue periodic audit monitoring.`,
            sourceNodeId: src.id,
            sourceLabel: src.data.label,
            dimension: 'Completeness & Validity',
            isResolved: true,
          });
          seenIds.add(compId);
        }
      }
    }
  });

  // 4. Sort strictly by Risk Hierarchy: CRITICAL (0) -> WARNING (1) -> COMPLIANT (2)
  const rank: Record<ComplianceSeverity, number> = {
    CRITICAL: 0,
    WARNING: 1,
    COMPLIANT: 2,
  };

  return activeItems.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/**
 * Epic 4: Export Audit-Ready CSV Report retaining strict risk hierarchy (Critical first)
 */
export function exportComplianceStatusCsv(
  alerts: ComplianceAlertItem[],
  profile?: OnboardingProfile | null,
  systemName = 'PentaFlow Enterprise Architecture'
): void {
  const exportedAt = new Date().toISOString();
  const company = profile?.companyName || systemName;
  const region =
    REGION_OPTIONS.find((r) => r.value === profile?.region)?.label ||
    'Global / EU GDPR Default';
  const industry =
    INDUSTRY_OPTIONS.find((i) => i.value === profile?.industry)?.label ||
    'Enterprise Data Architecture';

  const escapeCsv = (val: string | undefined) => {
    const clean = (val || '').replace(/"/g, '""');
    return `"${clean}"`;
  };

  const headers = [
    'Export Timestamp',
    'Company / Organization',
    'Regulatory Region',
    'Industry Vertical',
    'Risk Severity',
    'Status Color Hex',
    'Source System',
    'Target System',
    'Plain-Language Summary',
    'Specific Legal Regulation',
    'Exact Error Detail',
    'Recommended Fix',
  ];

  const rows = alerts.map((item) =>
    [
      escapeCsv(exportedAt),
      escapeCsv(company),
      escapeCsv(region),
      escapeCsv(industry),
      escapeCsv(item.severity),
      escapeCsv(item.statusHex),
      escapeCsv(item.sourceLabel),
      escapeCsv(item.targetLabel || 'Downstream Pipeline'),
      escapeCsv(item.plainSummary),
      escapeCsv(item.legalRegulation),
      escapeCsv(item.exactError),
      escapeCsv(item.recommendedFix),
    ].join(',')
  );

  const csvContent = [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const datePart = exportedAt.slice(0, 10);
  downloadFile(csvContent, `${slug}-compliance-audit-${datePart}.csv`, 'text/csv;charset=utf-8');
}

/**
 * Epic 4: Export Audit-Ready PDF Report including export timestamp, company name,
 * and retaining the strict risk hierarchy (Critical issues listed first)
 */
export function exportComplianceStatusPdf(
  alerts: ComplianceAlertItem[],
  profile?: OnboardingProfile | null,
  systemName = 'PentaFlow Enterprise Architecture'
): void {
  const exportedAt = new Date().toISOString();
  const company = profile?.companyName || systemName;
  const region =
    REGION_OPTIONS.find((r) => r.value === profile?.region)?.label ||
    'European Union (GDPR / DORA)';
  const industry =
    INDUSTRY_OPTIONS.find((i) => i.value === profile?.industry)?.label ||
    'Enterprise Data Architecture';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('PentaFlow — Executive Compliance & Risk Audit Report', margin, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Company / Organization: ${company}`, margin, y);
  doc.text(`Export Timestamp: ${exportedAt}`, pageWidth - margin, y, { align: 'right' });

  y += 6;
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Region: ${region}   |   Industry: ${industry}`, margin, y);

  y = 46;

  // Summary Counts Bar
  const critCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warnCount = alerts.filter((a) => a.severity === 'WARNING').length;
  const compCount = alerts.filter((a) => a.severity === 'COMPLIANT').length;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(239, 68, 68); // #EF4444 Critical
  doc.text(`CRITICAL (RED): ${critCount}`, margin + 6, y + 10);

  doc.setTextColor(245, 158, 11); // #F59E0B Warning
  doc.text(`WARNINGS (YELLOW): ${warnCount}`, margin + 68, y + 10);

  doc.setTextColor(16, 185, 129); // #10B981 Compliant
  doc.text(`COMPLIANT / RESOLVED (GREEN): ${compCount}`, margin + 128, y + 10);

  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Prioritized Compliance Findings (Sorted: Critical -> Warning -> Compliant)', margin, y);
  y += 6;

  alerts.forEach((item, index) => {
    if (y > pageHeight - 42) {
      doc.addPage();
      y = 18;
    }

    // Card container
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 32, 2, 2, 'FD');

    // Status Tag in top-right (matching exact hex codes)
    if (item.severity === 'CRITICAL') {
      doc.setFillColor(239, 68, 68); // #EF4444
    } else if (item.severity === 'WARNING') {
      doc.setFillColor(245, 158, 11); // #F59E0B
    } else {
      doc.setFillColor(16, 185, 129); // #10B981
    }
    doc.roundedRect(pageWidth - margin - 28, y + 3, 25, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(item.severity, pageWidth - margin - 15.5, y + 6.8, { align: 'center' });

    // Plain Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const summaryLines = doc.splitTextToSize(
      `${index + 1}. ${item.plainSummary}`,
      pageWidth - margin * 2 - 34
    );
    doc.text(summaryLines[0], margin + 4, y + 7);

    // Regulation
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Regulation: ${item.legalRegulation}`.slice(0, 105), margin + 4, y + 13.5);

    // Exact Error
    doc.setTextColor(51, 65, 85);
    doc.text(`Issue: ${item.exactError}`.slice(0, 110), margin + 4, y + 19.5);

    // Recommended Fix
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(30, 64, 175);
    doc.text(`Recommended Fix: ${item.recommendedFix}`.slice(0, 110), margin + 4, y + 25.5);

    y += 36;
  });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Generated by PentaFlow Compliance & DQ DAMA Studio  •  Advisory: www.technoscope.co.in',
    margin,
    pageHeight - 8
  );

  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const datePart = exportedAt.slice(0, 10);
  doc.save(`${slug}-compliance-audit-${datePart}.pdf`);
}

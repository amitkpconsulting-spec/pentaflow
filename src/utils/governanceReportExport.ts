/**
 * Data Governance Assessment Report Exporter (Markdown & JSON)
 * Exports @xyflow/react nodes, edges, and LinterSummary into formatted
 * Markdown (.md) and structured JSON (.json) Data Governance Assessment Reports.
 */

import {
  CustomDfdNode,
  CustomDfdEdge,
  DqLinterResult,
  DqLinterDiagnostic,
  SourceChildContractMismatch,
} from '../types/dfd';
import { runDeterministicDqLinter } from './dqGraphLinter';
import { computeDamaDimensionsScorecard } from './dqPdfDossier';
import { downloadFile } from './dfdExport';
import { evaluateGraphNistSummary, GraphNistSummary } from './nistOscalEngine';

export type DamaDimensionScorecard = ReturnType<typeof computeDamaDimensionsScorecard>[number];

export type LinterSummaryInput = DqLinterResult['summary'] | DqLinterResult;

export interface GovernanceReportOptions {
  systemName?: string;
  auditorName?: string;
  classification?: string;
  environment?: string;
  complianceFrameworks?: string[];
  includeMermaidDiagram?: boolean;
  includeRawGraphTopology?: boolean;
}

export interface DataGovernanceAssessmentReportJson {
  $schema: string;
  reportType: 'PentaFlow-Data-Governance-Assessment-Report';
  schemaVersion: '2.1.0';
  reportMetadata: {
    reportId: string;
    systemName: string;
    generatedAt: string;
    auditorName: string;
    environment: string;
    classification: string;
    complianceFrameworks: string[];
    repositoryUrl: string;
    advisoryContact: string;
  };
  executiveSummary: {
    overallHealthScore: number;
    complianceStatus: 'COMPLIANT' | 'CONDITIONAL_WARN' | 'NON_COMPLIANT_CRITICAL';
    riskRating: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    criticalCount: number;
    warnCount: number;
    passCount: number;
    totalChecked: number;
    sourceChildContractViolationCount: number;
  };
  damaDimensionsScorecard: DamaDimensionScorecard[];
  fiveLayerArchitectureInventory: {
    counts: {
      totalNodes: number;
      totalEdges: number;
      sources: number;
      operations: number;
      children: number;
      infra: number;
      architecture: number;
    };
    sourceLayer: Array<{
      id: string;
      label: string;
      protocol: string;
      technology: string;
      classification: string;
      sla: string;
      trustZone: string;
      dqScore: number;
      status: string;
    }>;
    operationsLayer: Array<{
      id: string;
      label: string;
      processType: string;
      technology: string;
      sla: string;
      hasQuarantineDLQ: boolean;
      dqScore: number;
      status: string;
    }>;
    childLayer: Array<{
      id: string;
      label: string;
      technology: string;
      classification: string;
      sla: string;
      trustZone: string;
      dqScore: number;
      status: string;
    }>;
    infraAndArchitectureZones: Array<{
      id: string;
      label: string;
      layer: string;
      securityZone: string;
      technology: string;
      containedNodeIds: string[];
    }>;
  };
  dataInTransitContracts: Array<{
    edgeId: string;
    sourceId: string;
    sourceLabel: string;
    targetId: string;
    targetLabel: string;
    protocol: string;
    encryption: string;
    encryptedInTransit: boolean;
    payloadFormat: string;
    schemaContract: string;
    timelinessSla: string;
    governanceStatus: string;
    violations: string[];
  }>;
  sourceChildContractMismatches: SourceChildContractMismatch[];
  linterDiagnostics: DqLinterDiagnostic[];
  nistSp80053ControlSummary: GraphNistSummary;
  rawGraphTopology?: {
    nodes: CustomDfdNode[];
    edges: CustomDfdEdge[];
  };
}

/**
 * Normalize either a DqLinterResult or a raw LinterSummary into a complete DqLinterResult
 */
function resolveLinterResult(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[],
  linterInput?: LinterSummaryInput
): DqLinterResult {
  const computed = runDeterministicDqLinter(nodes, edges);
  if (!linterInput) {
    return computed;
  }
  if ('summary' in linterInput && 'diagnostics' in linterInput) {
    return linterInput;
  }
  return {
    ...computed,
    summary: {
      ...computed.summary,
      ...linterInput,
    },
  };
}

/**
 * Build a Mermaid.js flowchart string representing the current @xyflow/react topology
 */
export function buildMermaidTopologyBlock(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[]
): string {
  const lines: string[] = ['flowchart LR'];
  const groups = nodes.filter(
    (n) => n.type === 'group' || n.data?.category === 'Infra' || n.data?.category === 'Architecture'
  );

  groups.forEach((grp) => {
    const gId = grp.id.replace(/[^a-zA-Z0-9_]/g, '_');
    const gLabel = (grp.data?.label || grp.id).replace(/"/g, "'");
    lines.push(`  subgraph ${gId} ["${gLabel} (${grp.data?.category || 'Zone'})"]`);
    const children = nodes.filter((n) => n.parentId === grp.id);
    children.forEach((c) => {
      const cId = c.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const cLabel = (c.data?.label || c.id).replace(/"/g, "'");
      lines.push(`    ${cId}["${cLabel} [${c.data?.category || 'Node'}]"]`);
    });
    lines.push('  end');
  });

  nodes
    .filter((n) => n.type !== 'group' && !n.parentId)
    .forEach((n) => {
      const nId = n.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const nLabel = (n.data?.label || n.id).replace(/"/g, "'");
      lines.push(`  ${nId}["${nLabel} [${n.data?.category || 'Node'}]"]`);
    });

  edges.forEach((e) => {
    const sId = e.source.replace(/[^a-zA-Z0-9_]/g, '_');
    const tId = e.target.replace(/[^a-zA-Z0-9_]/g, '_');
    const rawLabel =
      e.data?.protocol || (typeof e.label === 'string' ? e.label : '') || 'Flow';
    const cleanLabel = rawLabel.replace(/\|/g, '/').replace(/"/g, "'");
    lines.push(`  ${sId} -->|${cleanLabel}| ${tId}`);
  });

  return lines.join('\n');
}

/**
 * Generate a structured JSON Data Governance Assessment Report from @xyflow/react nodes, edges, and LinterSummary
 */
export function generateGovernanceAssessmentJsonReport(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[],
  linterSummary?: LinterSummaryInput,
  options: GovernanceReportOptions = {}
): DataGovernanceAssessmentReportJson {
  const fullLinter = resolveLinterResult(nodes, edges, linterSummary);
  const { summary, diagnostics, sourceChildMismatches = [] } = fullLinter;
  const damaScorecards = computeDamaDimensionsScorecard(nodes, edges, fullLinter);

  const nodeMap = new Map<string, CustomDfdNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const systemName = options.systemName || 'Enterprise Structured Data Flow';
  const auditorName = options.auditorName || 'PentaFlow DQ DAMA Governance Engine';
  const classification = options.classification || 'CONFIDENTIAL / RESTRICTED_PII';
  const environment = options.environment || 'air-gapped-production';
  const complianceFrameworks = options.complianceFrameworks || [
    'NIST SP 800-53 Rev 5 (OSCAL v1.4.0)',
    'DAMA-DMBOK2 (6 Core DQ Dimensions)',
    'India DPDP Act 2023 (DPDP-TRACE)',
    'GDPR Art. 30 & Art. 32',
    'PCI-DSS v4.0',
  ];
  const nistSummary = evaluateGraphNistSummary(nodes, edges);

  const complianceStatus =
    summary.criticalCount > 0
      ? 'NON_COMPLIANT_CRITICAL'
      : summary.warnCount > 0
      ? 'CONDITIONAL_WARN'
      : 'COMPLIANT';

  const riskRating =
    summary.overallHealthScore >= 90 && summary.criticalCount === 0
      ? 'LOW'
      : summary.overallHealthScore >= 70 && summary.criticalCount === 0
      ? 'MODERATE'
      : summary.overallHealthScore >= 45
      ? 'HIGH'
      : 'CRITICAL';

  const sourceNodes = nodes.filter(
    (n) => n.type === 'sourceNode' || n.data?.category === 'Source'
  );
  const operationNodes = nodes.filter(
    (n) => n.type === 'operationNode' || n.data?.category === 'Operations'
  );
  const childNodes = nodes.filter(
    (n) => n.type === 'childNode' || n.data?.category === 'Child'
  );
  const zoneNodes = nodes.filter(
    (n) =>
      n.type === 'group' ||
      n.data?.category === 'Infra' ||
      n.data?.category === 'Architecture'
  );

  const getWorstNodeStatus = (n: CustomDfdNode): string => {
    const rules = n.data?.dataQuality?.rules || [];
    if (rules.some((r) => r.status === 'CRITICAL')) return 'CRITICAL';
    if (rules.some((r) => r.status === 'WARN')) return 'WARN';
    return 'PASS';
  };

  return {
    $schema: 'https://github.com/amitkpconsulting-spec/pentaflow/schemas/governance-report-v2.1.json',
    reportType: 'PentaFlow-Data-Governance-Assessment-Report',
    schemaVersion: '2.1.0',
    reportMetadata: {
      reportId: `DAMA-GOV-${Date.now().toString(36).toUpperCase()}`,
      systemName,
      generatedAt: new Date().toISOString(),
      auditorName,
      environment,
      classification,
      complianceFrameworks,
      repositoryUrl: 'https://github.com/amitkpconsulting-spec/pentaflow',
      advisoryContact: 'https://www.technoscope.co.in',
    },
    executiveSummary: {
      overallHealthScore: summary.overallHealthScore,
      complianceStatus,
      riskRating,
      criticalCount: summary.criticalCount,
      warnCount: summary.warnCount,
      passCount: summary.passCount,
      totalChecked: summary.totalChecked,
      sourceChildContractViolationCount:
        summary.sourceChildContractViolationCount ?? sourceChildMismatches.length,
    },
    damaDimensionsScorecard: damaScorecards,
    fiveLayerArchitectureInventory: {
      counts: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        sources: sourceNodes.length,
        operations: operationNodes.length,
        children: childNodes.length,
        infra: nodes.filter((n) => n.data?.category === 'Infra').length,
        architecture: nodes.filter((n) => n.data?.category === 'Architecture').length,
      },
      sourceLayer: sourceNodes.map((n) => ({
        id: n.id,
        label: n.data?.label || n.id,
        protocol: n.data?.metadata?.protocol || 'HTTPS / REST',
        technology: n.data?.metadata?.technology || 'Ingress Gateway',
        classification: n.data?.metadata?.dataClassification || 'INTERNAL',
        sla: n.data?.metadata?.sla || 'Real-time (<500ms)',
        trustZone: n.parentId ? nodeMap.get(n.parentId)?.data?.label || n.parentId : 'Unassigned',
        dqScore: n.data?.dataQuality?.score ?? 100,
        status: getWorstNodeStatus(n),
      })),
      operationsLayer: operationNodes.map((n) => ({
        id: n.id,
        label: n.data?.label || n.id,
        processType: n.data?.metadata?.processType || 'Transformation & Validation',
        technology: n.data?.metadata?.technology || 'Processing Engine',
        sla: n.data?.dataQuality?.slaLatency || n.data?.metadata?.sla || 'Real-time (<500ms)',
        hasQuarantineDLQ: Boolean(n.data?.dataQuality?.hasQuarantineDLQ),
        dqScore: n.data?.dataQuality?.score ?? 100,
        status: getWorstNodeStatus(n),
      })),
      childLayer: childNodes.map((n) => ({
        id: n.id,
        label: n.data?.label || n.id,
        technology: n.data?.metadata?.technology || 'Data Store',
        classification: n.data?.metadata?.dataClassification || 'INTERNAL',
        sla: n.data?.metadata?.sla || 'Real-time (<500ms)',
        trustZone: n.parentId ? nodeMap.get(n.parentId)?.data?.label || n.parentId : 'Unassigned',
        dqScore: n.data?.dataQuality?.score ?? 100,
        status: getWorstNodeStatus(n),
      })),
      infraAndArchitectureZones: zoneNodes.map((z) => ({
        id: z.id,
        label: z.data?.label || z.id,
        layer: z.data?.category || 'Infra',
        securityZone: z.data?.metadata?.securityZone || 'Protected Enclave',
        technology: z.data?.metadata?.technology || 'Cluster / VPC',
        containedNodeIds: nodes.filter((n) => n.parentId === z.id).map((n) => n.id),
      })),
    },
    dataInTransitContracts: edges.map((e) => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      return {
        edgeId: e.id,
        sourceId: e.source,
        sourceLabel: src?.data?.label || e.source,
        targetId: e.target,
        targetLabel: tgt?.data?.label || e.target,
        protocol: e.data?.protocol || (typeof e.label === 'string' ? e.label : 'HTTPS / REST'),
        encryption: e.data?.encryption || (e.data?.encryptionAtRestAndTransit ? 'TLS 1.3' : 'None'),
        encryptedInTransit: Boolean(e.data?.encryptionAtRestAndTransit),
        payloadFormat: e.data?.payloadFormat || 'JSON',
        schemaContract: e.data?.schemaContract || 'JSON Schema Draft-07',
        timelinessSla: e.data?.timelinessSla || 'Real-time (<500ms)',
        governanceStatus: e.data?.dqStatus || 'PASS',
        violations: e.data?.dqViolations || [],
      };
    }),
    sourceChildContractMismatches: sourceChildMismatches,
    linterDiagnostics: diagnostics,
    nistSp80053ControlSummary: nistSummary,
    ...(options.includeRawGraphTopology !== false
      ? {
          rawGraphTopology: {
            nodes,
            edges,
          },
        }
      : {}),
  };
}

/**
 * Generate a formatted Markdown (.md) Data Governance Assessment Report from @xyflow/react nodes, edges, and LinterSummary
 */
export function generateGovernanceAssessmentMarkdownReport(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[],
  linterSummary?: LinterSummaryInput,
  options: GovernanceReportOptions = {}
): string {
  const report = generateGovernanceAssessmentJsonReport(nodes, edges, linterSummary, options);
  const {
    reportMetadata: meta,
    executiveSummary: exec,
    damaDimensionsScorecard: scorecards,
    fiveLayerArchitectureInventory: inv,
    dataInTransitContracts: contracts,
    sourceChildContractMismatches: mismatches,
    linterDiagnostics: diagnostics,
  } = report;

  const lines: string[] = [];

  // 1. Report Title & Metadata Banner
  lines.push(`# Data Governance & DAMA Architecture Assessment Report`);
  lines.push(`> **System**: \`${meta.systemName}\` | **Report ID**: \`${meta.reportId}\` | **Generated**: \`${meta.generatedAt}\``);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 2. Executive Summary
  lines.push('## 1. Executive Governance Summary');
  lines.push('');
  lines.push('| Metric / Attribute | Value |');
  lines.push('| :--- | :--- |');
  lines.push(`| **System Name** | ${meta.systemName} |`);
  lines.push(`| **Overall DAMA Health Score** | **${exec.overallHealthScore}%** |`);
  lines.push(`| **Governance Compliance Tier** | \`${exec.complianceStatus}\` |`);
  lines.push(`| **Enterprise Risk Rating** | \`${exec.riskRating}\` |`);
  lines.push(`| **Security Classification** | \`${meta.classification}\` |`);
  lines.push(`| **Target Environment** | \`${meta.environment}\` |`);
  lines.push(`| **Lead Auditor / Engine** | ${meta.auditorName} |`);
  lines.push(`| **Total Topology Elements Audited** | ${exec.totalChecked} (${inv.counts.totalNodes} Nodes, ${inv.counts.totalEdges} Edges) |`);
  lines.push(`| **Critical Violations** | ${exec.criticalCount} |`);
  lines.push(`| **Governance Warnings** | ${exec.warnCount} |`);
  lines.push(`| **Passed Governance Contracts** | ${exec.passCount} |`);
  lines.push(`| **Source-Child Contract Mismatches** | ${exec.sourceChildContractViolationCount} |`);
  lines.push(`| **Compliance Frameworks** | ${meta.complianceFrameworks.join(', ')} |`);
  lines.push('');

  // 3. DAMA-DMBOK 6 Core Data Quality Dimensions Scorecard
  lines.push('---');
  lines.push('');
  lines.push('## 2. DAMA-DMBOK 6 Core Data Quality Dimensions Scorecard');
  lines.push('');
  lines.push('| DAMA Dimension | Score | Status | Violations | Governance Audit Focus |');
  lines.push('| :--- | :---: | :---: | :---: | :--- |');
  scorecards.forEach((sc) => {
    lines.push(
      `| **${sc.dimension}** | **${sc.score}%** | \`${sc.status}\` | ${sc.violationCount} | ${sc.checksSummary} |`
    );
  });
  lines.push('');

  // 4. Architecture Diagram (Mermaid.js)
  if (options.includeMermaidDiagram !== false) {
    lines.push('---');
    lines.push('');
    lines.push('## 3. Structured 5-Layer Data Flow Topology (Mermaid.js)');
    lines.push('');
    lines.push('```mermaid');
    lines.push(buildMermaidTopologyBlock(nodes, edges));
    lines.push('```');
    lines.push('');
  }

  // 5. Enterprise 5-Layer Architecture Inventory
  lines.push('---');
  lines.push('');
  lines.push('## 4. Enterprise 5-Layer Architecture Inventory');
  lines.push('');

  // 5.1 Source Layer
  lines.push(`### 4.1 Source Layer (${inv.sourceLayer.length} Origin Systems)`);
  if (inv.sourceLayer.length === 0) {
    lines.push('_No Source Layer nodes defined._');
  } else {
    lines.push('| ID | Source Label | Protocol | Technology | Classification | SLA | Trust Zone | DQ Score | Status |');
    lines.push('| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :---: | :---: |');
    inv.sourceLayer.forEach((s) => {
      lines.push(
        `| \`${s.id}\` | **${s.label}** | \`${s.protocol}\` | ${s.technology} | \`${s.classification}\` | ${s.sla} | ${s.trustZone} | ${s.dqScore}% | \`${s.status}\` |`
      );
    });
  }
  lines.push('');

  // 5.2 Operations Layer
  lines.push(`### 4.2 Operations Layer (${inv.operationsLayer.length} Processing & Validation Gates)`);
  if (inv.operationsLayer.length === 0) {
    lines.push('_No Operations Layer nodes defined._');
  } else {
    lines.push('| ID | Operation Label | Process Type | Technology | SLA | DLQ Quarantine | DQ Score | Status |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |');
    inv.operationsLayer.forEach((op) => {
      lines.push(
        `| \`${op.id}\` | **${op.label}** | ${op.processType} | ${op.technology} | ${op.sla} | ${op.hasQuarantineDLQ ? 'YES (DLQ)' : 'NO'} | ${op.dqScore}% | \`${op.status}\` |`
      );
    });
  }
  lines.push('');

  // 5.3 Child Layer
  lines.push(`### 4.3 Child / Sink Layer (${inv.childLayer.length} Downstream Data Consumers)`);
  if (inv.childLayer.length === 0) {
    lines.push('_No Child Layer nodes defined._');
  } else {
    lines.push('| ID | Child Sink Label | Technology | Classification | SLA | Trust Zone | DQ Score | Status |');
    lines.push('| :--- | :--- | :--- | :---: | :--- | :--- | :---: | :---: |');
    inv.childLayer.forEach((c) => {
      lines.push(
        `| \`${c.id}\` | **${c.label}** | ${c.technology} | \`${c.classification}\` | ${c.sla} | ${c.trustZone} | ${c.dqScore}% | \`${c.status}\` |`
      );
    });
  }
  lines.push('');

  // 5.4 Infra & Architecture Trust Boundaries
  lines.push(`### 4.4 Infra & Architecture Trust Boundaries (${inv.infraAndArchitectureZones.length} Enclaves)`);
  if (inv.infraAndArchitectureZones.length === 0) {
    lines.push('_No Infra or Architecture boundary containers defined._');
  } else {
    lines.push('| ID | Zone Label | Layer | Security Perimeter | Contained Nodes |');
    lines.push('| :--- | :--- | :---: | :--- | :--- |');
    inv.infraAndArchitectureZones.forEach((z) => {
      lines.push(
        `| \`${z.id}\` | **${z.label}** | \`${z.layer}\` | ${z.securityZone} | ${z.containedNodeIds.length > 0 ? z.containedNodeIds.map((id) => `\`${id}\``).join(', ') : '_None_'} |`
      );
    });
  }
  lines.push('');

  // 6. Data-in-Transit Contract Matrix
  lines.push('---');
  lines.push('');
  lines.push(`## 5. Data-in-Transit Contract Matrix (${contracts.length} Routes)`);
  lines.push('');
  if (contracts.length === 0) {
    lines.push('_No data flow edges defined._');
  } else {
    lines.push('| Edge ID | Source → Target | Protocol | Encryption | Format | Schema Contract | Timeliness SLA | Status |');
    lines.push('| :--- | :--- | :--- | :---: | :---: | :--- | :--- | :---: |');
    contracts.forEach((c) => {
      lines.push(
        `| \`${c.edgeId}\` | **${c.sourceLabel}** → **${c.targetLabel}** | \`${c.protocol}\` | \`${c.encryption}\` | \`${c.payloadFormat}\` | ${c.schemaContract} | ${c.timelinessSla} | \`${c.governanceStatus}\` |`
      );
    });
  }
  lines.push('');

  // 7. Source-Child Contract Mismatches & Remediation Register
  lines.push('---');
  lines.push('');
  lines.push(`## 6. Source–Child Data Contract Mismatches (${mismatches.length} Findings)`);
  lines.push('');
  if (mismatches.length === 0) {
    lines.push('✅ **Zero Source–Child Contract Mismatches Detected.** All origin-to-sink data routes enforce schema validation, classification integrity, and SLA alignment.');
  } else {
    mismatches.forEach((m, idx) => {
      lines.push(`### 6.${idx + 1} [${m.severity}] ${m.title}`);
      lines.push(`- **Mismatch Type**: \`${m.mismatchType}\` | **DAMA Dimension**: \`${m.dimension}\``);
      lines.push(`- **Source Origin**: \`${m.sourceLabel}\` (${m.sourceContract.classification || 'INTERNAL'}, ${m.sourceContract.format || 'JSON'}, SLA: ${m.sourceContract.sla || '<500ms'})`);
      lines.push(`- **Target Child Sink**: \`${m.childLabel}\` (${m.childContract.classification || 'INTERNAL'}, ${m.childContract.format || 'JSON'}, SLA: ${m.childContract.sla || '<500ms'})`);
      lines.push(`- **Traversal Path**: ${m.pathLabels.map((p) => `\`${p}\``).join(' → ')}`);
      lines.push(`- **Finding Details**: ${m.message}`);
      lines.push(`- **Engineering Remediation**: _${m.recommendation}_`);
      lines.push('');
    });
  }

  // 8. Full Linter Diagnostics Log
  lines.push('---');
  lines.push('');
  lines.push(`## 7. Governance Linter Diagnostics Log (${diagnostics.length} Entries)`);
  lines.push('');
  if (diagnostics.length === 0) {
    lines.push('✅ **Zero Governance Diagnostics Flagged.**');
  } else {
    lines.push('| Severity | Dimension | Target | Rule | Diagnostic Message | Recommended Action |');
    lines.push('| :---: | :---: | :--- | :--- | :--- | :--- |');
    diagnostics.forEach((d) => {
      lines.push(
        `| \`${d.severity}\` | \`${d.dimension || 'Governance'}\` | \`${d.type}:${d.targetId}\` | **${d.ruleName}** | ${d.message.replace(/\|/g, '/')} | ${(d.recommendation || '-').replace(/\|/g, '/')} |`
      );
    });
  }
  lines.push('');

  // 8.5 NIST SP 800-53 Rev 5 (OSCAL v1.4.0) Automatic Control Crosswalk
  const nist = report.nistSp80053ControlSummary;
  lines.push('---');
  lines.push('');
  lines.push(`## 8. NIST SP 800-53 Rev 5 (OSCAL v1.4.0) Automatic Control Crosswalk`);
  lines.push('');
  lines.push(`- **OSCAL Catalog Reference**: [${nist.oscalVersion}](${nist.catalogUrl})`);
  lines.push(`- **Control Coverage Score**: **${nist.coverageScore}%** (${nist.implementedCount} Implemented, ${nist.partialCount} Partial, ${nist.gapCount} Gap across ${nist.totalControlsEvaluated} Active Controls)`);
  lines.push('');
  lines.push('| Control ID | Family | Control Title | Status | DAMA Crosswalk | DPDPA Crosswalk | Topology Evidence |');
  lines.push('| :--- | :---: | :--- | :---: | :--- | :--- | :--- |');
  nist.uniqueControls.forEach((c) => {
    lines.push(
      `| **\`${c.id}\`** | \`${c.family}\` | ${c.title} | \`${c.status}\` | ${c.damaCrosswalk} | ${c.dpdpaCrosswalk} | ${c.evidence.replace(/\|/g, '/')} |`
    );
  });
  lines.push('');

  // 9. Attestation Footer
  lines.push('---');
  lines.push('');
  lines.push('### Attestation & Advisory');
  lines.push(`- **Generated By**: PentaFlow Enterprise 5-Layer Structured Data Flow & DQ DAMA Studio`);
  lines.push(`- **NIST OSCAL Reference**: [${nist.catalogUrl}](${nist.catalogUrl})`);
  lines.push(`- **Repository**: [${meta.repositoryUrl}](${meta.repositoryUrl})`);
  lines.push(`- **Enterprise Architecture & DAMA Advisory**: [Technoscope (www.technoscope.co.in)](${meta.advisoryContact})`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Export the current @xyflow/react nodes, edges, and LinterSummary as downloadable
 * Markdown (.md) and/or JSON (.json) Data Governance Assessment Report files.
 */
export function exportGovernanceAssessmentReport(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[],
  linterSummary?: LinterSummaryInput,
  format: 'markdown' | 'json' | 'both' = 'both',
  options: GovernanceReportOptions = {}
): {
  markdown: string;
  json: DataGovernanceAssessmentReportJson;
  jsonString: string;
} {
  const json = generateGovernanceAssessmentJsonReport(nodes, edges, linterSummary, options);
  const jsonString = JSON.stringify(json, null, 2);
  const markdown = generateGovernanceAssessmentMarkdownReport(nodes, edges, linterSummary, options);

  const slug = (options.systemName || 'pentaflow-governance-report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const dateStamp = new Date().toISOString().slice(0, 10);

  if (format === 'markdown' || format === 'both') {
    downloadFile(
      markdown,
      `${slug}-governance-assessment-${dateStamp}.md`,
      'text/markdown;charset=utf-8'
    );
  }

  if (format === 'json' || format === 'both') {
    downloadFile(
      jsonString,
      `${slug}-governance-assessment-${dateStamp}.json`,
      'application/json;charset=utf-8'
    );
  }

  return {
    markdown,
    json,
    jsonString,
  };
}

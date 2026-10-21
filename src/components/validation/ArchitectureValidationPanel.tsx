import React, { useState } from 'react';
import {
  ValidationSummary,
  ValidationIssue,
  DqLinterResult,
  DqLinterDiagnostic,
  SourceChildContractMismatch,
} from '../../types/dfd';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldCheck,
  ShieldAlert,
  X,
  ArrowRight,
  Database,
  FileCheck2,
  Clock,
  Layers,
  FileText,
  FileDown,
  GitFork,
  Sparkles,
  Wrench,
} from 'lucide-react';

interface ArchitectureValidationPanelProps {
  summary: ValidationSummary;
  dqResult?: DqLinterResult;
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onExportPdfDossier?: () => void;
  onExportGovernanceReport?: () => void;
  onActUponMismatch?: (mismatch: SourceChildContractMismatch) => void;
  onRemediateAllSources?: () => void;
}

export const ArchitectureValidationPanel: React.FC<ArchitectureValidationPanelProps> = ({
  summary,
  dqResult,
  isOpen,
  onClose,
  onSelectNode,
  onSelectEdge,
  onExportPdfDossier,
  onExportGovernanceReport,
  onActUponMismatch,
  onRemediateAllSources,
}) => {
  const [activeTab, setActiveTab] = useState<'contracts' | 'dq' | 'topology'>('contracts');

  if (!isOpen) return null;

  const sourceChildMismatches = dqResult?.sourceChildMismatches || [];
  const hasDqCritical = (dqResult?.summary.criticalCount || 0) > 0;
  const hasDqWarn = (dqResult?.summary.warnCount || 0) > 0;

  return (
    <div className="absolute bottom-6 right-6 z-30 w-112 md:w-120 rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md p-4 text-slate-100 max-h-[540px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          {hasDqCritical ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </span>
          ) : hasDqWarn ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
          )}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              DQ DAMA Governance &amp; Contract Linter
            </h4>
            <span className="text-[10px] text-slate-400">
              Source-Child Contract Verification • DAMA 6 Dimensions Topology Linter
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onRemediateAllSources && sourceChildMismatches.length > 0 && (
            <button
              type="button"
              onClick={onRemediateAllSources}
              className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[10px] font-semibold transition cursor-pointer"
              title="Act upon all Sources to remediate active DAMA contract mismatches"
            >
              <Sparkles className="w-3 h-3 text-emerald-300" />
              <span>Act Upon All Sources</span>
            </button>
          )}

          {onExportPdfDossier && (
            <button
              type="button"
              onClick={onExportPdfDossier}
              className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-semibold transition cursor-pointer"
              title="Export official DAMA Data Quality & Governance Dossier to PDF"
            >
              <FileDown className="w-3 h-3 text-indigo-300" />
              <span>Dossier PDF</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 Tabs */}
      <div className="flex rounded-lg bg-slate-950 p-0.5 text-xs mb-3 border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('contracts')}
          className={`flex-1 py-1 rounded text-center font-medium transition ${
            activeTab === 'contracts'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Source-Child ({sourceChildMismatches.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dq')}
          className={`flex-1 py-1 rounded text-center font-medium transition ${
            activeTab === 'dq'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Diagnostics ({dqResult?.diagnostics.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('topology')}
          className={`flex-1 py-1 rounded text-center font-medium transition ${
            activeTab === 'topology'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Topology ({summary.issues.length})
        </button>
      </div>

      {/* TAB 1: SOURCE-CHILD CONTRACT MISMATCHES */}
      {activeTab === 'contracts' && (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-4 gap-1.5 mb-2.5 text-center">
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Mismatches</span>
              <span className={`text-xs font-mono font-bold ${sourceChildMismatches.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {sourceChildMismatches.length}
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Classification</span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {sourceChildMismatches.filter((m) => m.mismatchType === 'CLASSIFICATION_DOWNGRADE').length}
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Bypass/SLA</span>
              <span className="text-xs font-mono font-bold text-slate-300">
                {sourceChildMismatches.filter((m) => m.mismatchType === 'DIRECT_INGESTION_BYPASS' || m.mismatchType === 'TIMELINESS_SLA_MISMATCH').length}
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Health</span>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {dqResult?.summary.overallHealthScore ?? 100}%
              </span>
            </div>
          </div>

          {/* Mismatches List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {sourceChildMismatches.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-200">Zero Contract Mismatches</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  All Source-Child ingestion routes enforce classification integrity, validation gates, format compatibility, and timeliness SLAs.
                </p>
              </div>
            ) : (
              sourceChildMismatches.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl border text-xs transition ${
                    m.severity === 'CRITICAL'
                      ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                      : 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                  }`}
                >
                  {/* Title & Dimension */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {m.severity === 'CRITICAL' ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="font-bold text-slate-100 text-[11px]">
                        {m.title}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                      {m.dimension}
                    </span>
                  </div>

                  {/* Flow Route Box */}
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 my-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-300 font-medium truncate max-w-[170px]" title={m.sourceLabel}>
                        🟢 Source: {m.sourceLabel}
                      </span>
                      <span className="font-mono text-indigo-400 text-[9px]">
                        {m.sourceContract.classification || 'INTERNAL'} • {m.sourceContract.format || 'JSON'}
                      </span>
                    </div>

                    <div className="flex items-center justify-center text-[10px] text-slate-500 font-mono">
                      <span>↓ {m.pathLabels.length > 2 ? `${m.pathLabels.length - 2} operations` : 'Direct Path'}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-300 font-medium truncate max-w-[170px]" title={m.childLabel}>
                        🔴 Child: {m.childLabel}
                      </span>
                      <span className="font-mono text-indigo-400 text-[9px]">
                        {m.childContract.classification || 'INTERNAL'} • {m.childContract.format || 'JSON'}
                      </span>
                    </div>

                    {m.pathLabels.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-mono truncate pt-1 border-t border-slate-900">
                        Path: {m.pathLabels.join(' → ')}
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {m.message}
                  </p>

                  {/* Recommendation */}
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    💡 {m.recommendation}
                  </p>

                  {/* Action buttons */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {onActUponMismatch && (
                      <button
                        type="button"
                        onClick={() => onActUponMismatch(m)}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 transition font-semibold cursor-pointer"
                        title="Act upon Source to automatically remediate this contract violation"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Act Upon Source (Auto-Remediate)</span>
                      </button>
                    )}
                    {m.sourceNodeId !== 'NONE' && (
                      <button
                        type="button"
                        onClick={() => onSelectNode(m.sourceNodeId)}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 transition font-mono cursor-pointer"
                      >
                        Locate Source
                      </button>
                    )}
                    {m.childNodeId !== 'NONE' && (
                      <button
                        type="button"
                        onClick={() => onSelectNode(m.childNodeId)}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 transition font-mono cursor-pointer"
                      >
                        Locate Target
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* TAB 2: ALL DIAGNOSTICS */}
      {activeTab === 'dq' && (
        <>
          {/* DQ Metrics Row */}
          <div className="grid grid-cols-4 gap-1.5 mb-3 text-center">
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Health</span>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {dqResult?.summary.overallHealthScore ?? 100}%
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Critical</span>
              <span className={`text-xs font-mono font-bold ${hasDqCritical ? 'text-rose-400' : 'text-slate-400'}`}>
                {dqResult?.summary.criticalCount ?? 0}
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Warnings</span>
              <span className={`text-xs font-mono font-bold ${hasDqWarn ? 'text-amber-400' : 'text-slate-400'}`}>
                {dqResult?.summary.warnCount ?? 0}
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Contracts</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {dqResult?.summary.passCount ?? 0}
              </span>
            </div>
          </div>

          {/* DQ Diagnostics List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {!dqResult || dqResult.diagnostics.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-200">Zero Governance Violations</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  All pipelines enforce schema validation, timeliness SLAs, and trust boundaries.
                </p>
              </div>
            ) : (
              dqResult.diagnostics.map((diag) => (
                <div
                  key={diag.id}
                  className={`p-2.5 rounded-xl border text-xs transition ${
                    diag.severity === 'CRITICAL'
                      ? 'border-rose-500/40 bg-rose-950/25 text-rose-200'
                      : diag.severity === 'WARN'
                      ? 'border-amber-500/40 bg-amber-950/25 text-amber-200'
                      : 'border-emerald-500/40 bg-emerald-950/25 text-emerald-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {diag.severity === 'CRITICAL' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : diag.severity === 'WARN' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-slate-100 block">
                          {diag.ruleName}
                        </span>
                        {diag.dimension && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                            {diag.dimension}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        {diag.message}
                      </p>
                      {diag.recommendation && (
                        <p className="text-[10px] text-slate-400 mt-1 italic">
                          💡 {diag.recommendation}
                        </p>
                      )}

                      <div className="mt-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (diag.type === 'edge') {
                              onSelectEdge(diag.targetId);
                            } else {
                              onSelectNode(diag.targetId);
                            }
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-900 text-indigo-300 transition font-mono"
                        >
                          Locate {diag.type}: {diag.targetId}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* TAB 3: TOPOLOGY */}
      {activeTab === 'topology' && (
        <>
          {/* Topology Metrics Row */}
          <div className="grid grid-cols-4 gap-1.5 mb-3 text-center">
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Nodes</span>
              <span className="text-xs font-mono font-bold text-slate-200">{summary.totalNodes}</span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Edges</span>
              <span className="text-xs font-mono font-bold text-slate-200">{summary.totalEdges}</span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Orphans</span>
              <span className={`text-xs font-mono font-bold ${summary.orphanNodes > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {summary.orphanNodes}
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-400">Unencrypted</span>
              <span className={`text-xs font-mono font-bold ${summary.unsecuredCrossings > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {summary.unsecuredCrossings}
              </span>
            </div>
          </div>

          {/* Topology Issues List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {summary.issues.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-300">All Flow Validation Checks Passed</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Nodes are cleanly routed, trust boundaries are contained, and protocols are verified.
                </p>
              </div>
            ) : (
              summary.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-2.5 rounded-xl border text-xs transition ${
                    issue.severity === 'error'
                      ? 'border-red-500/40 bg-red-950/25 text-red-200'
                      : issue.severity === 'warning'
                      ? 'border-amber-500/40 bg-amber-950/25 text-amber-200'
                      : 'border-blue-500/40 bg-blue-950/25 text-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {issue.severity === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    {issue.severity === 'warning' && (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    {issue.severity === 'info' && (
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1">
                      <span className="font-semibold text-slate-100 block">
                        {issue.title}
                      </span>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                        {issue.description}
                      </p>
                      {issue.recommendation && (
                        <p className="text-[10px] text-slate-400 mt-1 italic">
                          💡 {issue.recommendation}
                        </p>
                      )}

                      <div className="mt-1.5 flex gap-1">
                        {issue.nodeIds?.map((nid) => (
                          <button
                            key={nid}
                            type="button"
                            onClick={() => onSelectNode(nid)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 hover:bg-indigo-900 transition font-mono"
                          >
                            Locate: {nid}
                          </button>
                        ))}
                        {issue.edgeIds?.map((eid) => (
                          <button
                            key={eid}
                            type="button"
                            onClick={() => onSelectEdge(eid)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 hover:bg-indigo-900 transition font-mono"
                          >
                            Locate Edge
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Bottom Action Footer */}
      <div className="pt-2.5 mt-2.5 border-t border-slate-800 flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>DAMA-DMBOK 6 Dimensions</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onExportGovernanceReport && (
            <button
              type="button"
              onClick={onExportGovernanceReport}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 font-medium text-[11px] shadow-sm transition cursor-pointer"
              title="Export formatted Markdown (.md) and JSON (.json) Data Governance Assessment Reports"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>MD / JSON Report</span>
            </button>
          )}
          {onExportPdfDossier && (
            <button
              type="button"
              onClick={onExportPdfDossier}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] shadow-sm transition cursor-pointer"
              title="Download executive audit report dossier in PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Generate PDF Dossier</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

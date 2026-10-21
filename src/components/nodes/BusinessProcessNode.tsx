import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Cpu, RefreshCw, ShieldCheck, CheckCircle2, Clock, GitFork, ScanFace, Search, Zap, CreditCard } from 'lucide-react';
import { CustomDfdNode } from '../../types/dfd';
import { evaluateNodeNistOverlay } from '../../utils/nistOscalEngine';

const getProcessIcon = (processType?: string, label?: string) => {
  const text = `${processType || ''} ${label || ''}`.toLowerCase();
  if (text.includes('liveness') || text.includes('biometric') || text.includes('ocr') || text.includes('hologram')) {
    return <ScanFace className="w-4 h-4 text-purple-400" />;
  }
  if (text.includes('sanction') || text.includes('pep') || text.includes('watchlist') || text.includes('screen')) {
    return <Search className="w-4 h-4 text-amber-400" />;
  }
  if (text.includes('fraud') || text.includes('scoring') || text.includes('neural')) {
    return <Zap className="w-4 h-4 text-amber-400" />;
  }
  if (text.includes('card') || text.includes('pin') || text.includes('cvv') || text.includes('hold')) {
    return <CreditCard className="w-4 h-4 text-teal-400" />;
  }
  if (text.includes('mask') || text.includes('crypto') || text.includes('pii') || text.includes('encrypt')) {
    return <ShieldCheck className="w-4 h-4 text-amber-400" />;
  }
  if (text.includes('batch') || text.includes('etl') || text.includes('pipeline') || text.includes('sync') || text.includes('settlement')) {
    return <RefreshCw className="w-4 h-4 text-orange-400 animate-spin-slow" />;
  }
  if (text.includes('review') || text.includes('approval') || text.includes('human') || text.includes('officer')) {
    return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  }
  return <Cpu className="w-4 h-4 text-amber-400" />;
};

export const BusinessProcessNode = memo(({ data, selected }: NodeProps<CustomDfdNode>) => {
  const metadata = data.metadata || {};
  const processType = metadata.processType || 'Transformation';
  const dq = data.dataQuality;
  const showNistOverlay = Boolean(data.showNistOverlay);
  const nistEval = evaluateNodeNistOverlay(data);
  const nistControls = nistEval.controls;

  const statusColors = {
    PASS: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    WARN: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    CRITICAL: 'bg-rose-600/30 text-rose-300 border-rose-500/50 animate-pulse',
    UNCHECKED: 'bg-slate-800 text-slate-400 border-slate-700',
  };

  const worstStatus = dq?.rules?.some((r) => r.status === 'CRITICAL')
    ? 'CRITICAL'
    : dq?.rules?.some((r) => r.status === 'WARN')
    ? 'WARN'
    : dq?.rules?.length
    ? 'PASS'
    : 'UNCHECKED';

  return (
    <div
      className={`relative min-w-[230px] max-w-[285px] rounded-xl border bg-slate-900/95 backdrop-blur-md px-3.5 py-3 shadow-xl transition-all duration-200 ${
        selected
          ? 'border-amber-400 ring-2 ring-amber-500/40 shadow-amber-500/20'
          : showNistOverlay
          ? nistEval.cardBorderClass
          : 'border-amber-500/30 hover:border-amber-400/60'
      }`}
    >
      {/* NIST 800-53 Severity Top Accent Bar when Overlay is Active */}
      {showNistOverlay && (
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
          style={{ backgroundColor: nistEval.statusHex }}
        />
      )}

      {/* Category Tag Header */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/20 text-amber-300">
            {getProcessIcon(processType, data.label)}
          </span>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-400">
            Operation / Process
          </span>
        </div>

        <div className="flex items-center gap-1">
          {showNistOverlay ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-xs font-mono tabular-nums"
              style={{ backgroundColor: nistEval.statusHex }}
              title={`NIST 800-53 Coverage: ${nistEval.severityLabel} (${nistEval.coverageScore}%) · ${nistEval.gapSummary}`}
            >
              <span>NIST {nistEval.severityLabel}</span>
              <span>·</span>
              <span>{nistEval.coverageScore}%</span>
            </span>
          ) : (
            <>
              {dq && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusColors[worstStatus]}`}
                  title={`Data Quality Score: ${dq.score ?? 100}%\nWorst Status: ${worstStatus}`}
                >
                  DQ: {dq.score ?? 100}%
                </span>
              )}
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
                {processType}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Node Label */}
      <div className="text-sm font-semibold text-slate-100 truncate" title={data.label}>
        {data.label}
      </div>

      {/* Missing DLQ / Quarantine Warning Banner */}
      {dq && !dq.hasQuarantineDLQ && (
        <div className="mt-1.5 text-[9.5px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30 flex items-center justify-between">
          <span>⚠️ No DLQ / Quarantine defined</span>
          <span className="font-mono text-[8px] text-amber-400/80">RISK</span>
        </div>
      )}

      {/* SLA / Schedule / Criticality */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1 truncate text-slate-300">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="truncate">{metadata.sla || 'Continuous'}</span>
        </div>
        {metadata.criticality && (
          <span className="text-[10px] font-semibold text-amber-300/90">
            {metadata.criticality}
          </span>
        )}
      </div>

      {/* Automatic NIST SP 800-53 Rev 5 (OSCAL v1.4.0) Key Controls Strip */}
      {nistControls.length > 0 && (
        <div
          className={`mt-1.5 pt-1.5 border-t transition-colors ${
            showNistOverlay
              ? nistEval.severity === 'CRITICAL'
                ? 'border-rose-500/50 bg-rose-950/35 -mx-2 px-2 py-1.5 rounded-lg'
                : nistEval.severity === 'WARNING'
                ? 'border-amber-500/40 bg-amber-950/30 -mx-2 px-2 py-1.5 rounded-lg'
                : 'border-emerald-500/40 bg-emerald-950/25 -mx-2 px-2 py-1.5 rounded-lg'
              : 'border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between gap-1 text-[9px] font-mono">
            <span
              className={`uppercase tracking-wider shrink-0 font-semibold ${
                showNistOverlay
                  ? nistEval.severity === 'CRITICAL'
                    ? 'text-rose-300'
                    : nistEval.severity === 'WARNING'
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                  : 'text-slate-500'
              }`}
            >
              NIST 800-53:
            </span>
            <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 truncate">
              {nistControls.map((ctrl, idx) => (
                <span
                  key={ctrl.id}
                  title={`NIST SP 800-53 Rev 5 (${ctrl.id} · ${ctrl.title})\nStatus: ${ctrl.status}\n${ctrl.evidence}`}
                  className={
                    ctrl.status === 'GAP'
                      ? 'text-rose-400 font-bold'
                      : ctrl.status === 'PARTIAL'
                      ? 'text-amber-300 font-semibold'
                      : showNistOverlay
                      ? 'text-emerald-300 font-semibold'
                      : 'text-cyan-300 font-medium'
                  }
                >
                  {ctrl.id}
                  {showNistOverlay && (
                    <span className="ml-0.5 text-[8px]">
                      {ctrl.status === 'GAP' ? '!' : ctrl.status === 'PARTIAL' ? '~' : '✓'}
                    </span>
                  )}
                  {idx < nistControls.length - 1 && (
                    <span className="text-slate-700 ml-1.5" aria-hidden="true">·</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          {showNistOverlay && (
            <div
              className={`mt-1 text-[8.5px] font-mono truncate ${
                nistEval.severity === 'CRITICAL'
                  ? 'text-rose-300'
                  : nistEval.severity === 'WARNING'
                  ? 'text-amber-200'
                  : 'text-emerald-300'
              }`}
              title={nistEval.gapSummary}
            >
              {nistEval.gapSummary}
            </div>
          )}
        </div>
      )}

      {/* DQ Dimension Strip */}
      {dq?.rules && dq.rules.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-mono">
          {dq.rules.map((r, idx) => (
            <span
              key={idx}
              title={`${r.dimension}: ${r.ruleDescription}`}
              className={
                r.status === 'CRITICAL'
                  ? 'text-rose-400 font-semibold'
                  : r.status === 'WARN'
                  ? 'text-amber-300'
                  : 'text-slate-400'
              }
            >
              {r.dimension}
              {idx < (dq.rules?.length ?? 0) - 1 && (
                <span className="text-slate-700 ml-2" aria-hidden="true">·</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
});

BusinessProcessNode.displayName = 'BusinessProcessNode';

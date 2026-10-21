import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Database,
  Globe,
  Smartphone,
  Radio,
  Shield,
  CreditCard,
  ScanFace,
  Monitor,
  ShieldCheck,
  Lock,
  Activity,
  GitBranch,
  Clock,
} from 'lucide-react';
import { CustomDfdNode } from '../../types/dfd';
import { SourceDirectActionType } from '../../utils/dqGraphLinter';
import { evaluateNodeNistOverlay } from '../../utils/nistOscalEngine';

const getSourceIcon = (label: string, tech?: string) => {
  const text = `${label} ${tech || ''}`.toLowerCase();
  if (text.includes('pos') || text.includes('card payment'))
    return <CreditCard className="w-4 h-4 text-emerald-400" />;
  if (text.includes('teller') || text.includes('terminal') || text.includes('kiosk'))
    return <Monitor className="w-4 h-4 text-cyan-400" />;
  if (text.includes('selfie') || text.includes('biometric') || text.includes('ocr'))
    return <ScanFace className="w-4 h-4 text-purple-400" />;
  if (text.includes('iot') || text.includes('sensor') || text.includes('telemetry'))
    return <Radio className="w-4 h-4 text-cyan-400" />;
  if (text.includes('mobile') || text.includes('app') || text.includes('portal') || text.includes('user'))
    return <Smartphone className="w-4 h-4 text-indigo-400" />;
  if (text.includes('db') || text.includes('sql') || text.includes('lake') || text.includes('cdc'))
    return <Database className="w-4 h-4 text-blue-400" />;
  return <Globe className="w-4 h-4 text-sky-400" />;
};

const getClassificationTextStyle = (level?: string) => {
  switch (level) {
    case 'RESTRICTED_PII':
      return 'text-rose-300';
    case 'CONFIDENTIAL':
      return 'text-amber-300';
    case 'PUBLIC':
      return 'text-emerald-300';
    default:
      return 'text-sky-300';
  }
};

export const SourceNode = memo(({ id, data, selected }: NodeProps<CustomDfdNode>) => {
  const metadata = data.metadata || {};
  const classification = metadata.dataClassification || 'INTERNAL';
  const dq = data.dataQuality;
  const sla = metadata.sla || dq?.slaLatency || 'Real-time (<500ms)';
  const protocol = metadata.protocol || 'HTTPS / REST';
  const isSecureMtls = protocol.toLowerCase().includes('mtls') || protocol.toLowerCase().includes('tls 1.3');
  const showNistOverlay = Boolean(data.showNistOverlay);
  const nistEval = evaluateNodeNistOverlay(data);
  const nistControls = nistEval.controls;

  const worstStatus = dq?.rules?.some((r) => r.status === 'CRITICAL')
    ? 'CRITICAL'
    : dq?.rules?.some((r) => r.status === 'WARN')
    ? 'WARN'
    : 'PASS';

  const statusHex = showNistOverlay
    ? nistEval.statusHex
    : worstStatus === 'CRITICAL'
    ? '#EF4444'
    : worstStatus === 'WARN'
    ? '#F59E0B'
    : '#10B981';

  const statusLabel = showNistOverlay
    ? nistEval.severityLabel
    : worstStatus === 'CRITICAL'
    ? 'Critical'
    : worstStatus === 'WARN'
    ? 'Warning'
    : 'Compliant';

  const dispatchQuickAction = (e: React.MouseEvent, action: SourceDirectActionType | 'trace-lineage') => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('pentaflow:source-action', {
        detail: { sourceNodeId: id, sourceLabel: data.label, action },
      })
    );
  };

  return (
    <div
      className={`group relative min-w-[245px] max-w-[290px] rounded-xl border bg-slate-900/95 backdrop-blur-md px-3.5 py-3 shadow-xl transition-all duration-200 ${
        selected
          ? 'border-indigo-400 ring-2 ring-indigo-500/40 shadow-indigo-500/20'
          : showNistOverlay
          ? nistEval.cardBorderClass
          : worstStatus === 'CRITICAL'
          ? 'border-rose-500/50 hover:border-rose-400/80'
          : worstStatus === 'WARN'
          ? 'border-amber-500/40 hover:border-amber-400/70'
          : 'border-indigo-500/35 hover:border-indigo-400/70'
      }`}
    >
      {/* NIST 800-53 Severity Top Accent Bar when Overlay is Active */}
      {showNistOverlay && (
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
          style={{ backgroundColor: nistEval.statusHex }}
        />
      )}

      {/* Category Header & Compliance Status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {getSourceIcon(data.label, metadata.technology)}
          </span>
          <div>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-400 block leading-none">
              Flow Source Origin
            </span>
            <span className={`text-[9px] font-mono ${getClassificationTextStyle(classification)}`}>
              {classification}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-xs font-mono tabular-nums"
            style={{ backgroundColor: statusHex }}
            title={
              showNistOverlay
                ? `NIST 800-53 Coverage: ${nistEval.severityLabel} (${nistEval.coverageScore}%) · ${nistEval.gapSummary}`
                : `Compliance Status: ${statusLabel} (${dq?.score ?? 100}% DQ) · ${classification}`
            }
          >
            <span>{showNistOverlay ? `NIST ${statusLabel}` : statusLabel}</span>
            <span>·</span>
            <span>{showNistOverlay ? `${nistEval.coverageScore}%` : `${dq?.score ?? 100}%`}</span>
          </span>
        </div>
      </div>

      {/* Main Node Label */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="text-sm font-semibold text-slate-100 truncate" title={data.label}>
          {data.label}
        </div>
        {metadata.assetId && (
          <span className="text-[9px] font-mono text-indigo-400 shrink-0">
            {metadata.assetId}
          </span>
        )}
      </div>

      {/* Unboxed Metadata Row: Protocol · Technology · Trusted Status */}
      <div className="mt-1.5 flex items-center flex-wrap gap-1.5 text-[10px] text-slate-400 font-mono">
        <span
          className={`inline-flex items-center gap-1 ${
            isSecureMtls ? 'text-emerald-300' : 'text-slate-300'
          }`}
          title="Ingress Protocol"
        >
          <Shield className="w-3 h-3 shrink-0 opacity-80" />
          <span className="truncate max-w-[110px]">{protocol}</span>
        </span>
        {metadata.technology && (
          <>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-indigo-300 truncate max-w-[85px]">{metadata.technology}</span>
          </>
        )}
        {metadata.trustedSource !== undefined && (
          <>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span
              className={
                metadata.trustedSource ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'
              }
            >
              {metadata.trustedSource ? 'Trusted' : 'Untrusted'}
            </span>
          </>
        )}
      </div>

      {/* Statutory Mandate / Role Line (from Ingestion Channel) */}
      {(metadata.statutoryMandate || metadata.dpdpaRole) && (
        <div className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-slate-400 truncate">
          {metadata.dpdpaRole && (
            <span className="text-indigo-300">{metadata.dpdpaRole}</span>
          )}
          {metadata.dpdpaRole && metadata.statutoryMandate && (
            <span className="text-slate-600">·</span>
          )}
          {metadata.statutoryMandate && (
            <span className="text-slate-400 truncate" title={metadata.statutoryMandate}>
              {metadata.statutoryMandate}
            </span>
          )}
        </div>
      )}

      {/* Emission Cadence / SLA Line */}
      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1 text-slate-400">
          <Clock className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
          <span className="truncate max-w-[140px]">{sla}</span>
        </span>
        <button
          type="button"
          onClick={(e) => dispatchQuickAction(e, 'trace-lineage')}
          className="nodrag inline-flex items-center gap-1 text-[9.5px] font-medium text-indigo-400 hover:text-indigo-200 transition cursor-pointer"
          title="Highlight downstream lineage from this Flow Source"
        >
          <GitBranch className="w-2.5 h-2.5" />
          <span>Trace Flow</span>
        </button>
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

      {/* DQ Dimension Status Strip */}
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

      {/* Interactive Quick-Action Bar on Hover or Selection */}
      <div
        className={`nodrag mt-2 pt-2 border-t border-slate-800/90 grid grid-cols-3 gap-1 transition-all duration-150 ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
        }`}
      >
        <button
          type="button"
          onClick={(e) => dispatchQuickAction(e, 'insert-validator')}
          className="flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-slate-800/90 hover:bg-indigo-600 text-[9px] font-medium text-slate-200 hover:text-white border border-slate-700/80 transition cursor-pointer"
          title="Insert Schema Validator & DLQ Gate downstream of this Source"
        >
          <ShieldCheck className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
          <span className="truncate">+Validator</span>
        </button>

        <button
          type="button"
          onClick={(e) => dispatchQuickAction(e, 'insert-masking')}
          className="flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-slate-800/90 hover:bg-indigo-600 text-[9px] font-medium text-slate-200 hover:text-white border border-slate-700/80 transition cursor-pointer"
          title="Insert PII Masking & Tokenizer node downstream of this Source"
        >
          <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
          <span className="truncate">+Masking</span>
        </button>

        <button
          type="button"
          onClick={(e) => dispatchQuickAction(e, 'enforce-mtls')}
          className="flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-slate-800/90 hover:bg-indigo-600 text-[9px] font-medium text-slate-200 hover:text-white border border-slate-700/80 transition cursor-pointer"
          title="Enforce mTLS 1.3 encryption on all outbound contracts from this Source"
        >
          <Activity className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
          <span className="truncate">mTLS 1.3</span>
        </button>
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
});

SourceNode.displayName = 'SourceNode';

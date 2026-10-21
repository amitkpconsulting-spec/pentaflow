import React, { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Shield, Network, Lock, Server, Cloud, Container } from 'lucide-react';
import { CustomDfdNode } from '../../types/dfd';
import { evaluateNodeNistOverlay } from '../../utils/nistOscalEngine';

const getGroupIcon = (label: string, category: string) => {
  const text = label.toLowerCase();
  if (text.includes('pci') || text.includes('vault') || text.includes('secure') || text.includes('air-gap')) {
    return <Lock className="w-4 h-4 text-purple-400" />;
  }
  if (text.includes('dmz') || text.includes('firewall') || text.includes('zone')) {
    return <Shield className="w-4 h-4 text-indigo-400" />;
  }
  if (text.includes('k8s') || text.includes('cluster') || text.includes('container')) {
    return <Container className="w-4 h-4 text-sky-400" />;
  }
  if (text.includes('cloud') || text.includes('vpc') || text.includes('aws') || text.includes('azure')) {
    return <Cloud className="w-4 h-4 text-blue-400" />;
  }
  return <Network className="w-4 h-4 text-purple-400" />;
};

export const InfraGroupNode = memo(({ data, selected }: NodeProps<CustomDfdNode>) => {
  const metadata = data.metadata || {};
  const isArchitecture = data.category === 'Architecture';
  const showNistOverlay = Boolean(data.showNistOverlay);
  const nistEval = evaluateNodeNistOverlay(data);
  const nistControls = nistEval.controls;

  return (
    <div
      className={`group relative h-full w-full rounded-2xl border-2 border-dashed transition-all duration-200 ${
        selected
          ? 'border-purple-400/80 bg-purple-950/20 shadow-2xl shadow-purple-900/30 ring-2 ring-purple-500/30'
          : showNistOverlay
          ? nistEval.severity === 'CRITICAL'
            ? 'border-rose-500/75 bg-rose-950/15 ring-1 ring-rose-500/30'
            : nistEval.severity === 'WARNING'
            ? 'border-amber-500/75 bg-amber-950/15 ring-1 ring-amber-500/30'
            : 'border-emerald-500/65 bg-emerald-950/15 ring-1 ring-emerald-500/25'
          : isArchitecture
          ? 'border-purple-500/35 bg-purple-950/15 hover:border-purple-400/50'
          : 'border-slate-600/40 bg-slate-900/30 hover:border-slate-500/60'
      }`}
      style={{
        width: '100%',
        height: '100%',
        minWidth: 260,
        minHeight: 160,
      }}
    >
      {/* Group Header Banner */}
      <div className="flex items-center justify-between border-b border-purple-500/20 bg-slate-900/70 px-4 py-2.5 backdrop-blur-md rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
            {getGroupIcon(data.label, data.category)}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-wide uppercase text-slate-200">
                {data.label}
              </span>
              <span className="text-[10px] font-mono text-purple-300">
                · {data.category === 'Architecture' ? 'Trust Zone' : 'Infra Boundary'}
              </span>
            </div>
            {metadata.securityZone && (
              <span className="text-[10px] text-slate-400">
                Zone: {metadata.securityZone}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {nistControls.length > 0 && (
            <span
              className={`text-[9.5px] font-mono ${
                showNistOverlay
                  ? nistEval.severity === 'CRITICAL'
                    ? 'text-rose-300 font-bold'
                    : nistEval.severity === 'WARNING'
                    ? 'text-amber-300 font-bold'
                    : 'text-emerald-300 font-bold'
                  : 'text-cyan-300'
              }`}
              title={`NIST SP 800-53 Rev 5 Boundary Controls: ${nistControls
                .map((c) => `${c.id} (${c.title})`)
                .join(', ')}`}
            >
              NIST {nistControls.map((c) => c.id).join(' · ')}
            </span>
          )}
          {showNistOverlay && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-xs font-mono tabular-nums"
              style={{ backgroundColor: nistEval.statusHex }}
              title={`Boundary NIST 800-53 Status: ${nistEval.severityLabel} (${nistEval.coverageScore}%)`}
            >
              <span>{nistEval.severityLabel}</span>
              <span>·</span>
              <span>{nistEval.coverageScore}%</span>
            </span>
          )}
          {!showNistOverlay && metadata.infraType && (
            <span className="text-[10px] font-mono text-slate-400">
              · {metadata.infraType}
            </span>
          )}
        </div>
      </div>

      {/* Subtle Grid Watermark / Background Texture */}
      <div className="pointer-events-none absolute inset-0 opacity-5 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]" />
    </div>
  );
});

InfraGroupNode.displayName = 'InfraGroupNode';

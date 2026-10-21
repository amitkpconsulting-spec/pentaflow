/**
 * DataContractEdge - Custom @xyflow/react Edge for Data Quality & Governance
 * Visualizes data-in-transit contracts with dynamic stroke styling, pulsing violation pills,
 * and interactive contract popovers for CRITICAL, WARN, and PASS states.
 */

import React, { memo, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  FileCode2,
  Clock,
  Lock,
  X,
  Zap,
} from 'lucide-react';
import { CustomDfdEdge, DqSeverity } from '../../types/dfd';

export const DataContractEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  animated,
  data,
  selected,
}: EdgeProps<CustomDfdEdge>) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const dqStatus: DqSeverity = data?.dqStatus || 'PASS';
  const violations: string[] = data?.dqViolations || [];
  const protocol = data?.protocol || (typeof label === 'string' ? label : 'HTTPS / REST');
  const schemaContract = data?.schemaContract || 'Schema Contract Inferred';
  const timelinessSla = data?.timelinessSla || 'Real-time (<500ms)';

  // Determine path appearance based on DQ Severity
  let strokeColor = '#10b981'; // PASS emerald
  let strokeWidth = selected ? 2.5 : 1.8;
  let pillStyles = 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200';
  let isPulsing = false;

  if (dqStatus === 'CRITICAL') {
    strokeColor = '#e11d48'; // Bold Rose/Red
    strokeWidth = selected ? 3.5 : 2.5;
    pillStyles = 'border-rose-500 bg-rose-950/95 text-rose-200 shadow-rose-950/50 shadow-lg';
    isPulsing = true;
  } else if (dqStatus === 'WARN') {
    strokeColor = '#d97706'; // Amber
    strokeWidth = selected ? 2.8 : 2.0;
    pillStyles = 'border-amber-500/80 bg-amber-950/90 text-amber-200';
  } else if (selected) {
    strokeColor = '#818cf8';
    pillStyles = 'border-indigo-400 bg-indigo-950 text-indigo-200';
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: isPulsing || animated ? '6 4' : undefined,
          animation: isPulsing
            ? 'dashdraw 0.5s linear infinite'
            : animated
            ? 'dashdraw 0.8s linear infinite'
            : undefined,
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {/* Main Contract Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPopoverOpen((prev) => !prev);
              }}
              className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium shadow-md backdrop-blur-md transition-all duration-200 cursor-pointer ${pillStyles} hover:scale-105`}
              title="Click to view Data Contract & Governance Audit"
            >
              {dqStatus === 'CRITICAL' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="font-bold tracking-wide uppercase text-[9px] text-rose-300">
                    Ungoverned Flow
                  </span>
                </>
              ) : dqStatus === 'WARN' ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold text-[10px] text-amber-200 max-w-[120px] truncate">
                    {protocol}
                  </span>
                  <span className="text-[8px] font-mono px-1 rounded bg-amber-500/20 text-amber-300">
                    SLA Gap
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="font-mono text-[10px] text-emerald-200 max-w-[130px] truncate">
                    {protocol}
                  </span>
                </>
              )}
            </button>

            {/* Interactive Governance Popover */}
            {isPopoverOpen && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md text-xs text-slate-100 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {dqStatus === 'CRITICAL' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ) : dqStatus === 'WARN' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="font-bold text-[11px] text-slate-100">
                      Data-in-Transit Contract
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPopoverOpen(false)}
                    className="text-slate-400 hover:text-white p-0.5 rounded transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Protocol</span>
                    <span className="font-mono text-slate-200">{protocol}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Schema Contract</span>
                    <div className="flex items-center gap-1 text-slate-200 font-mono">
                      <FileCode2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{schemaContract}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Timeliness SLA</span>
                    <div className="flex items-center gap-1 text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{timelinessSla}</span>
                    </div>
                  </div>

                  {/* Violations List */}
                  {violations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-rose-400 block">
                        Governance Violations ({violations.length})
                      </span>
                      {violations.map((v, i) => (
                        <div
                          key={i}
                          className="p-1.5 rounded bg-rose-950/40 border border-rose-500/30 text-rose-200 text-[10px] leading-tight"
                        >
                          ⚠️ {v}
                        </div>
                      ))}
                    </div>
                  )}

                  {violations.length === 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Data Contract verified compliant with enterprise architecture.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

DataContractEdge.displayName = 'DataContractEdge';

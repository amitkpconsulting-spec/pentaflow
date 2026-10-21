import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import { Lock, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { CustomDfdEdge } from '../../types/dfd';

export const CustomDataEdge = memo(({
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

  const protocol = (data?.protocol || label || 'HTTPS / REST') as string;
  const isEncrypted =
    protocol.toLowerCase().includes('tls') ||
    protocol.toLowerCase().includes('ssl') ||
    protocol.toLowerCase().includes('pci') ||
    protocol.toLowerCase().includes('crypto') ||
    data?.encryption;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 2.5 : 1.8,
          stroke: selected ? '#818cf8' : '#64748b',
          strokeDasharray: animated ? '6 4' : undefined,
          animation: animated ? 'dashdraw 0.8s linear infinite' : undefined,
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
          <div
            className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium shadow-md backdrop-blur-md transition-all duration-150 ${
              selected
                ? 'border-indigo-400 bg-indigo-950 text-indigo-200 ring-2 ring-indigo-500/30'
                : 'border-slate-700/80 bg-slate-900/90 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
            }`}
            title={`Edge ID: ${id}\nProtocol: ${protocol}\nEncryption: ${data?.encryption || 'Standard'}`}
          >
            {isEncrypted ? (
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
            )}
            <span className="font-mono tracking-tight text-[10px] max-w-[130px] truncate">
              {protocol}
            </span>
            {animated && (
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

CustomDataEdge.displayName = 'CustomDataEdge';

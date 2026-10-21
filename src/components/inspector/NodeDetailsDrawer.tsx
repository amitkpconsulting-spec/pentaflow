import React from 'react';
import { CustomDfdNode, CustomDfdEdge, DfdCategory } from '../../types/dfd';
import { SourceDirectActionType } from '../../utils/dqGraphLinter';
import {
  X,
  Trash2,
  Lock,
  Layers,
  Database,
  Cpu,
  Clock,
  Shield,
  Zap,
  ArrowRight,
  FolderOpen,
  ShieldCheck,
  Sparkles,
  GitBranchPlus,
  Activity,
  ExternalLink,
  Plus,
} from 'lucide-react';
import {
  resolveNodeNistControls,
  resolveEdgeNistControls,
  NIST_SP800_53_CATALOG,
  NIST_OSCAL_REPO_URL,
} from '../../utils/nistOscalEngine';

interface NodeDetailsDrawerProps {
  selectedNode: CustomDfdNode | null;
  selectedEdge: CustomDfdEdge | null;
  allGroups: CustomDfdNode[];
  onClose: () => void;
  onUpdateNode: (updatedNode: CustomDfdNode) => void;
  onUpdateEdge: (updatedEdge: CustomDfdEdge) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onExecuteSourceAction?: (sourceNodeId: string, action: SourceDirectActionType) => void;
}

export const NodeDetailsDrawer: React.FC<NodeDetailsDrawerProps> = ({
  selectedNode,
  selectedEdge,
  allGroups,
  onClose,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
  onExecuteSourceAction,
}) => {
  if (!selectedNode && !selectedEdge) return null;

  return (
    <div className="absolute top-4 right-4 z-30 w-84 rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md p-4 text-slate-100 max-h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          {selectedNode ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400">
              {selectedNode.type === 'operationNode' ? (
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
              ) : selectedNode.type === 'group' ? (
                <Shield className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <Database className="w-3.5 h-3.5 text-indigo-400" />
              )}
            </span>
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
            </span>
          )}
          <div>
            <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
              Structured Flow Inspector
            </div>
            <span className="text-xs font-semibold text-slate-200">
              {selectedNode ? selectedNode.data.label : `Edge: ${selectedEdge?.id}`}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* NODE INSPECTOR */}
      {selectedNode && (
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Node Label
            </label>
            <input
              type="text"
              value={selectedNode.data.label}
              onChange={(e) =>
                onUpdateNode({
                  ...selectedNode,
                  data: { ...selectedNode.data, label: e.target.value },
                })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                5-Layer Taxonomy
              </label>
              <select
                value={selectedNode.data.category}
                onChange={(e) =>
                  onUpdateNode({
                    ...selectedNode,
                    data: {
                      ...selectedNode.data,
                      category: e.target.value as DfdCategory,
                    },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Source">1. Source Layer</option>
                <option value="Operations">2. Operations Layer</option>
                <option value="Child">3. Child / Sink Layer</option>
                <option value="Infra">4. Infra Layer</option>
                <option value="Architecture">5. Architecture Layer</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Classification
              </label>
              <select
                value={selectedNode.data.metadata?.dataClassification || 'INTERNAL'}
                onChange={(e) =>
                  onUpdateNode({
                    ...selectedNode,
                    data: {
                      ...selectedNode.data,
                      metadata: {
                        ...selectedNode.data.metadata,
                        dataClassification: e.target.value as any,
                      },
                    },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="RESTRICTED_PII">RESTRICTED_PII</option>
                <option value="PUBLIC">PUBLIC</option>
              </select>
            </div>
          </div>

          {/* Parent Trust Zone / Container selection */}
          {selectedNode.type !== 'group' && (
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Parent Trust Zone (Infra / Architecture)
              </label>
              <select
                value={selectedNode.parentId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateNode({
                    ...selectedNode,
                    parentId: val || undefined,
                    extent: val ? 'parent' : undefined,
                  });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="">(None - Top Level)</option>
                {allGroups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.data.label} ({grp.data.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SOURCE ORIGIN PARAMETERS & ACT UPON SOURCE PANEL */}
          {(selectedNode.type === 'sourceNode' || selectedNode.data.category === 'Source') && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[10px] uppercase font-bold text-indigo-400 block mb-1.5">
                  Source Origin Parameters
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Ingress Protocol</label>
                    <input
                      type="text"
                      value={selectedNode.data.metadata?.protocol || ''}
                      onChange={(e) =>
                        onUpdateNode({
                          ...selectedNode,
                          data: {
                            ...selectedNode.data,
                            metadata: {
                              ...selectedNode.data.metadata,
                              protocol: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="e.g. mTLS 1.3 / REST"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Technology</label>
                    <input
                      type="text"
                      value={selectedNode.data.metadata?.technology || ''}
                      onChange={(e) =>
                        onUpdateNode({
                          ...selectedNode,
                          data: {
                            ...selectedNode.data,
                            metadata: {
                              ...selectedNode.data.metadata,
                              technology: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="e.g. API Gateway"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Emission Cadence / SLA</label>
                  <select
                    value={selectedNode.data.metadata?.sla || 'Real-time (<500ms)'}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        data: {
                          ...selectedNode.data,
                          metadata: {
                            ...selectedNode.data.metadata,
                            sla: e.target.value,
                          },
                          dataQuality: {
                            ...selectedNode.data.dataQuality,
                            slaLatency: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                  >
                    <option value="Real-time (<150ms)">Real-time (&lt;150ms)</option>
                    <option value="Real-time (<500ms)">Real-time (&lt;500ms)</option>
                    <option value="Streaming (<1s)">Streaming (&lt;1s)</option>
                    <option value="Micro-batch (5m)">Micro-batch (5m)</option>
                    <option value="Hourly Batch">Hourly Batch</option>
                    <option value="Daily Batch 00:00">Daily Batch 00:00</option>
                  </select>
                </div>

                {/* Trusted Cover App & Statutory Mandate controls */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">DPDPA Role</label>
                    <select
                      value={selectedNode.data.metadata?.dpdpaRole || 'Data Principal'}
                      onChange={(e) =>
                        onUpdateNode({
                          ...selectedNode,
                          data: {
                            ...selectedNode.data,
                            metadata: {
                              ...selectedNode.data.metadata,
                              dpdpaRole: e.target.value as any,
                            },
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                    >
                      <option value="Data Principal">Data Principal</option>
                      <option value="Data Fiduciary">Data Fiduciary</option>
                      <option value="Consent Manager">Consent Manager</option>
                      <option value="Data Processor">Data Processor</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Trusted Source</label>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateNode({
                          ...selectedNode,
                          data: {
                            ...selectedNode.data,
                            metadata: {
                              ...selectedNode.data.metadata,
                              trustedSource: !(selectedNode.data.metadata?.trustedSource ?? true),
                            },
                          },
                        })
                      }
                      className={`w-full rounded border px-2 py-1 text-xs font-mono font-semibold transition cursor-pointer ${
                        selectedNode.data.metadata?.trustedSource ?? true
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {selectedNode.data.metadata?.trustedSource ?? true ? 'Trusted App' : 'Untrusted / External'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ACT UPON SOURCE — GOVERNANCE & PIPELINE ACTIONS */}
              {onExecuteSourceAction && (
                <div className="rounded-xl bg-indigo-950/30 border border-indigo-500/30 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-indigo-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Act Upon Source
                    </span>
                    <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800">
                      1-Click Governance
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onExecuteSourceAction(selectedNode.id, 'insert-validator')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-900/60 text-slate-200 hover:text-white border border-slate-700/80 hover:border-indigo-500/50 transition text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Insert Schema Validator &amp; DLQ Gate</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onExecuteSourceAction(selectedNode.id, 'insert-masking')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-900/60 text-slate-200 hover:text-white border border-slate-700/80 hover:border-indigo-500/50 transition text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Insert PII Masking &amp; Tokenizer</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onExecuteSourceAction(selectedNode.id, 'enforce-mtls')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-900/60 text-slate-200 hover:text-white border border-slate-700/80 hover:border-indigo-500/50 transition text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Enforce mTLS 1.3 Outbound Contracts</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onExecuteSourceAction(selectedNode.id, 'upgrade-streaming')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-900/60 text-slate-200 hover:text-white border border-slate-700/80 hover:border-indigo-500/50 transition text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Upgrade to Real-Time Kafka Stream</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onExecuteSourceAction(selectedNode.id, 'route-sinkhole')}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-900/60 text-slate-200 hover:text-white border border-slate-700/80 hover:border-indigo-500/50 transition text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <GitBranchPlus className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Auto-Route Source to Downstream</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Process / Operation Details */}
          {selectedNode.type === 'operationNode' && (
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <label className="text-[10px] uppercase font-semibold text-amber-400 block">
                Operation Parameters
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Process Type</label>
                  <input
                    type="text"
                    value={selectedNode.data.metadata?.processType || ''}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        data: {
                          ...selectedNode.data,
                          metadata: {
                            ...selectedNode.data.metadata,
                            processType: e.target.value as any,
                          },
                        },
                      })
                    }
                    placeholder="e.g. ETL, Masking"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">SLA / Schedule</label>
                  <input
                    type="text"
                    value={selectedNode.data.metadata?.sla || ''}
                    onChange={(e) =>
                      onUpdateNode({
                        ...selectedNode,
                        data: {
                          ...selectedNode.data,
                          metadata: {
                            ...selectedNode.data.metadata,
                            sla: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="e.g. Daily 00:00"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* AUTOMATIC NIST SP 800-53 REV 5 (OSCAL v1.4.0) KEY CONTROLS */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-cyan-300">
                NIST SP 800-53 Rev 5 Controls (Auto)
              </span>
              <a
                href={NIST_OSCAL_REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[9.5px] font-mono text-indigo-400 hover:text-indigo-300 underline"
                title="View US NIST OSCAL v1.4.0 SP 800-53 Catalog"
              >
                <span>OSCAL v1.4.0</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="space-y-1.5">
              {resolveNodeNistControls(selectedNode.data).map((ctrl) => (
                <div
                  key={ctrl.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/90 p-2 text-[11px]"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono font-bold text-cyan-300">
                      {ctrl.id} · {ctrl.shortLabel}
                    </span>
                    <span
                      className={`text-[9.5px] font-mono font-semibold ${
                        ctrl.status === 'GAP'
                          ? 'text-rose-400'
                          : ctrl.status === 'PARTIAL'
                          ? 'text-amber-300'
                          : 'text-emerald-400'
                      }`}
                    >
                      {ctrl.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                    {ctrl.evidence}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    {ctrl.familyName} · {ctrl.dpdpaCrosswalk}
                  </div>
                </div>
              ))}
            </div>

            {/* Attach additional NIST SP 800-53 Control to this Node */}
            <div className="pt-1">
              <label className="text-[10px] text-slate-400 block mb-0.5">
                + Pin Additional NIST SP 800-53 Control
              </label>
              <select
                value=""
                onChange={(e) => {
                  const ctrlId = e.target.value;
                  if (!ctrlId) return;
                  const existing = selectedNode.data.metadata?.nistControls || [];
                  if (existing.includes(ctrlId)) return;
                  onUpdateNode({
                    ...selectedNode,
                    data: {
                      ...selectedNode.data,
                      metadata: {
                        ...selectedNode.data.metadata,
                        nistControls: [...existing, ctrlId],
                      },
                    },
                  });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
              >
                <option value="">Select OSCAL Control to pin...</option>
                {Object.values(NIST_SP800_53_CATALOG).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Delete Action */}
          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => onDeleteNode(selectedNode.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 text-red-300 border border-red-800/60 hover:bg-red-900/50 transition text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Node</span>
            </button>
          </div>
        </div>
      )}

      {/* EDGE INSPECTOR */}
      {selectedEdge && (
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Protocol / Data Label
            </label>
            <input
              type="text"
              value={typeof selectedEdge.label === 'string' ? selectedEdge.label : ''}
              onChange={(e) =>
                onUpdateEdge({
                  ...selectedEdge,
                  label: e.target.value,
                  data: { ...selectedEdge.data, protocol: e.target.value },
                })
              }
              placeholder="e.g. mTLS / REST, Kafka Stream"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Encryption
              </label>
              <select
                value={selectedEdge.data?.encryption || 'mTLS'}
                onChange={(e) =>
                  onUpdateEdge({
                    ...selectedEdge,
                    data: {
                      ...selectedEdge.data,
                      encryption: e.target.value as any,
                    },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="mTLS">mTLS (Mutual TLS)</option>
                <option value="TLS 1.3">TLS 1.3</option>
                <option value="IPSec">IPSec Tunnel</option>
                <option value="AES-256 GCM">AES-256 GCM</option>
                <option value="None (Air-gapped)">None (Air-gapped)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Payload Format
              </label>
              <select
                value={selectedEdge.data?.payloadFormat || 'JSON'}
                onChange={(e) =>
                  onUpdateEdge({
                    ...selectedEdge,
                    data: {
                      ...selectedEdge.data,
                      payloadFormat: e.target.value as any,
                    },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="JSON">JSON</option>
                <option value="Avro">Avro</option>
                <option value="Protobuf">Protobuf</option>
                <option value="XML">XML</option>
                <option value="Binary">Binary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Schema Contract
              </label>
              <input
                type="text"
                value={selectedEdge.data?.schemaContract || ''}
                onChange={(e) =>
                  onUpdateEdge({
                    ...selectedEdge,
                    data: { ...selectedEdge.data, schemaContract: e.target.value },
                  })
                }
                placeholder="e.g. Avro v2.1, JSON Schema"
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Timeliness SLA
              </label>
              <input
                type="text"
                value={selectedEdge.data?.timelinessSla || ''}
                onChange={(e) =>
                  onUpdateEdge({
                    ...selectedEdge,
                    data: { ...selectedEdge.data, timelinessSla: e.target.value },
                  })
                }
                placeholder="e.g. Real-time (<500ms)"
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
          </div>

          {/* DQ Governance Status in Edge Inspector */}
          {selectedEdge.data?.dqStatus && (
            <div
              className={`p-2 rounded-lg border text-[11px] ${
                selectedEdge.data.dqStatus === 'CRITICAL'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : selectedEdge.data.dqStatus === 'WARN'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[10px] uppercase mb-1">
                <span>Governance State</span>
                <span className="font-mono">{selectedEdge.data.dqStatus}</span>
              </div>
              {selectedEdge.data.dqViolations?.map((v, i) => (
                <div key={i} className="text-[10px] leading-tight mt-1 opacity-90">
                  • {v}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-300">Active Stream Pulse</span>
            <input
              type="checkbox"
              checked={selectedEdge.animated ?? true}
              onChange={(e) =>
                onUpdateEdge({
                  ...selectedEdge,
                  animated: e.target.checked,
                })
              }
              className="accent-indigo-500 w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Edge NIST SP 800-53 Rev 5 Controls */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-cyan-300">
                Transit NIST SP 800-53 Controls
              </span>
              <span className="text-[9.5px] font-mono text-slate-400">OSCAL v1.4.0</span>
            </div>
            {resolveEdgeNistControls(selectedEdge.data).map((ctrl) => (
              <div
                key={ctrl.id}
                className="rounded-lg border border-slate-800 bg-slate-950/90 p-2 text-[11px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-300">
                    {ctrl.id} · {ctrl.shortLabel}
                  </span>
                  <span
                    className={`text-[9.5px] font-mono font-semibold ${
                      ctrl.status === 'GAP'
                        ? 'text-rose-400'
                        : ctrl.status === 'PARTIAL'
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                    }`}
                  >
                    {ctrl.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{ctrl.evidence}</div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => onDeleteEdge(selectedEdge.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 text-red-300 border border-red-800/60 hover:bg-red-900/50 transition text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Connection</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

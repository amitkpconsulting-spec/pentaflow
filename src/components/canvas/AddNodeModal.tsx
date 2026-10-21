import React, { useState, useEffect } from 'react';
import { CustomDfdNode, DfdCategory, DfdNodeType } from '../../types/dfd';
import { X, Plus, Database, Cpu, Layers, Shield, Sparkles, Clock, Globe } from 'lucide-react';

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (node: CustomDfdNode, autoConnectSource?: boolean) => void;
  groups: CustomDfdNode[];
  initialNodeType?: DfdNodeType;
}

const FLOW_SOURCE_PRESETS: {
  label: string;
  protocol: string;
  technology: string;
  sla: string;
  classification: 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED_PII' | 'PUBLIC';
}[] = [
  {
    label: 'Customer Mobile App Portal',
    protocol: 'mTLS 1.3 / REST',
    technology: 'OAuth2 / OIDC Gateway',
    sla: 'Real-time (<150ms)',
    classification: 'RESTRICTED_PII',
  },
  {
    label: 'Kafka CDC Event Stream',
    protocol: 'Kafka TLS / Avro',
    technology: 'Debezium / Confluent',
    sla: 'Streaming (<1s)',
    classification: 'CONFIDENTIAL',
  },
  {
    label: 'POS Card Payment Terminal',
    protocol: 'mTLS 1.3 / ISO-8583',
    technology: 'PCI-PTS Hardware',
    sla: 'Real-time (<150ms)',
    classification: 'RESTRICTED_PII',
  },
  {
    label: 'Partner Webhook Ingress',
    protocol: 'HTTPS / REST',
    technology: 'HMAC-SHA256 API',
    sla: 'Real-time (<500ms)',
    classification: 'CONFIDENTIAL',
  },
  {
    label: 'Clinical HL7 / FHIR Ingress',
    protocol: 'mTLS 1.3 / FHIR R4',
    technology: 'EHR Integration Engine',
    sla: 'Real-time (<500ms)',
    classification: 'RESTRICTED_PII',
  },
  {
    label: 'SFTP Partner Batch Dropzone',
    protocol: 'SSH / SFTP v2',
    technology: 'PGP Encrypted CSV',
    sla: 'Daily Batch 00:00',
    classification: 'CONFIDENTIAL',
  },
];

export const AddNodeModal: React.FC<AddNodeModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  groups,
  initialNodeType = 'sourceNode',
}) => {
  const [nodeType, setNodeType] = useState<DfdNodeType>(initialNodeType);
  const [label, setLabel] = useState('');
  const [parentId, setParentId] = useState('');
  const [technology, setTechnology] = useState('');
  const [protocol, setProtocol] = useState('mTLS 1.3 / REST');
  const [sla, setSla] = useState('Real-time (<150ms)');
  const [processType, setProcessType] = useState('Transformation');
  const [classification, setClassification] = useState<
    'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED_PII' | 'PUBLIC'
  >('INTERNAL');
  const [autoConnectSource, setAutoConnectSource] = useState(true);

  useEffect(() => {
    if (isOpen && initialNodeType) {
      setNodeType(initialNodeType);
    }
  }, [isOpen, initialNodeType]);

  if (!isOpen) return null;

  const handleApplySourcePreset = (preset: (typeof FLOW_SOURCE_PRESETS)[0]) => {
    setNodeType('sourceNode');
    setLabel(preset.label);
    setProtocol(preset.protocol);
    setTechnology(preset.technology);
    setSla(preset.sla);
    setClassification(preset.classification);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const id = `${
      nodeType === 'group'
        ? 'grp'
        : nodeType === 'sourceNode'
        ? 'src'
        : nodeType === 'childNode'
        ? 'child'
        : 'op'
    }-${Date.now().toString().slice(-4)}`;

    let category: DfdCategory = 'Operations';
    if (nodeType === 'sourceNode') category = 'Source';
    else if (nodeType === 'childNode') category = 'Child';
    else if (nodeType === 'group') category = 'Architecture';

    const newNode: CustomDfdNode = {
      id,
      type: nodeType,
      parentId: nodeType !== 'group' && parentId ? parentId : undefined,
      extent: nodeType !== 'group' && parentId ? 'parent' : undefined,
      position: { x: 80 + Math.random() * 60, y: 100 + Math.random() * 80 },
      data: {
        label: label.trim(),
        category,
        metadata: {
          technology: technology || undefined,
          protocol: nodeType === 'sourceNode' ? protocol : undefined,
          sla: nodeType === 'sourceNode' ? sla : undefined,
          processType: nodeType === 'operationNode' ? (processType as any) : undefined,
          dataClassification: classification,
          securityZone: nodeType === 'group' ? label.trim() : undefined,
        },
        dataQuality:
          nodeType === 'sourceNode'
            ? {
                score: 100,
                slaLatency: sla,
                rules: [],
              }
            : undefined,
      },
    };

    onAdd(newNode, nodeType === 'sourceNode' ? autoConnectSource : false);
    setLabel('');
    setTechnology('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Plus className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {nodeType === 'sourceNode'
                  ? 'Add Enterprise Flow Source Node'
                  : 'Add Structured Data Flow Node'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Enterprise 5-Layer Architecture Taxonomy · Contract &amp; Lineage Ready
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Node Type Selector */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
              Enterprise 5-Layer Taxonomy / Node Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNodeType('sourceNode')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                  nodeType === 'sourceNode'
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200 shadow-sm'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Database className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="font-semibold text-xs text-white">1. Flow Source</div>
                  <div className="text-[10px] text-slate-400">Origin / Ingress Trigger</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNodeType('operationNode')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                  nodeType === 'operationNode'
                    ? 'border-amber-500 bg-amber-500/15 text-amber-200 shadow-sm'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold text-xs text-white">2. Operation Node</div>
                  <div className="text-[10px] text-slate-400">Process / Transform</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNodeType('childNode')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                  nodeType === 'childNode'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200 shadow-sm'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-xs text-white">3. Child / Sink Node</div>
                  <div className="text-[10px] text-slate-400">Downstream Store / Sink</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNodeType('group')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                  nodeType === 'group'
                    ? 'border-purple-500 bg-purple-500/15 text-purple-200 shadow-sm'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="font-semibold text-xs text-white">4/5. Boundary Group</div>
                  <div className="text-[10px] text-slate-400">Infra / Trust Zone Container</div>
                </div>
              </button>
            </div>
          </div>

          {/* Curated Flow Source Archetypes when 1. Flow Source is selected */}
          {nodeType === 'sourceNode' && (
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-950/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-indigo-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  1-Click Flow Source Archetypes
                </span>
                <span className="text-[10px] text-slate-400">Auto-fills contract metadata</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {FLOW_SOURCE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplySourcePreset(preset)}
                    className={`px-2.5 py-1.5 rounded-lg border text-left transition cursor-pointer ${
                      label === preset.label
                        ? 'border-indigo-400 bg-indigo-600/30 text-white'
                        : 'border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-medium text-[11px] truncate text-slate-100">
                      {preset.label}
                    </div>
                    <div className="text-[9.5px] font-mono text-indigo-300 truncate">
                      {preset.protocol} · {preset.classification}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Node Label */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              {nodeType === 'sourceNode' ? 'Flow Source Display Name' : 'Node Display Name'}
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                nodeType === 'sourceNode'
                  ? 'e.g. Customer Mobile App Portal, Kafka CDC Stream, Partner Webhook'
                  : 'e.g. Tokenization Vault, Fraud Scoring Engine, Analytics Lake'
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Source-specific Ingress Protocol & SLA */}
          {nodeType === 'sourceNode' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  <Globe className="w-3 h-3 inline mr-1 text-indigo-400" />
                  Ingress Protocol
                </label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value="mTLS 1.3 / REST">mTLS 1.3 / REST</option>
                  <option value="Kafka TLS / Avro">Kafka TLS / Avro</option>
                  <option value="gRPC / Protobuf">gRPC / Protobuf</option>
                  <option value="HTTPS / REST">HTTPS / REST</option>
                  <option value="mTLS 1.3 / ISO-8583">mTLS 1.3 / ISO-8583</option>
                  <option value="mTLS 1.3 / FHIR R4">mTLS 1.3 / FHIR R4</option>
                  <option value="SSH / SFTP v2">SSH / SFTP v2</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  <Clock className="w-3 h-3 inline mr-1 text-indigo-400" />
                  Emission Cadence / SLA
                </label>
                <select
                  value={sla}
                  onChange={(e) => setSla(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value="Real-time (<150ms)">Real-time (&lt;150ms)</option>
                  <option value="Real-time (<500ms)">Real-time (&lt;500ms)</option>
                  <option value="Streaming (<1s)">Streaming (&lt;1s)</option>
                  <option value="Micro-batch (5m)">Micro-batch (5m)</option>
                  <option value="Hourly Batch">Hourly Batch</option>
                  <option value="Daily Batch 00:00">Daily Batch 00:00</option>
                </select>
              </div>
            </div>
          )}

          {/* Parent Container (if not a group) */}
          {nodeType !== 'group' && (
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Containment Boundary (Parent Zone)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="">(Top-Level / No Parent Group)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.data.label} ({g.data.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tech / Classification */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Technology Stack
              </label>
              <input
                type="text"
                value={technology}
                onChange={(e) => setTechnology(e.target.value)}
                placeholder="e.g. OAuth2 Gateway, Confluent, PostgreSQL"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Data Classification
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
              >
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="RESTRICTED_PII">RESTRICTED_PII</option>
                <option value="PUBLIC">PUBLIC</option>
              </select>
            </div>
          </div>

          {/* Auto-connect toggle for new Flow Sources */}
          {nodeType === 'sourceNode' && (
            <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 cursor-pointer">
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  Auto-connect to Operations Pipeline &amp; Run Dagre Layout
                </span>
                <span className="text-[10px] text-slate-400">
                  Immediately wires outbound mTLS data contract and positions node on canvas
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoConnectSource}
                onChange={(e) => setAutoConnectSource(e.target.checked)}
                className="accent-indigo-500 w-4 h-4 cursor-pointer"
              />
            </label>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md transition text-xs cursor-pointer"
            >
              {nodeType === 'sourceNode' ? 'Add Flow Source to Canvas' : 'Add to Canvas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

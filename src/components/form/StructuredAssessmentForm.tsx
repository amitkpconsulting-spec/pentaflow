import React, { useState } from 'react';
import {
  AssessmentInputPayload,
  LlmConfig,
} from '../../types/dfd';
import { SourceDirectActionType } from '../../utils/dqGraphLinter';
import {
  Sparkles,
  Plus,
  X,
  Layers,
  Database,
  Server,
  Cpu,
  Shield,
  Sliders,
  ShieldCheck,
  Lock,
  Activity,
  GitBranch,
  Crosshair,
  Globe,
  Smartphone,
  Radio,
  CreditCard,
  ScanFace,
  Monitor,
  Wrench,
  LayoutList,
  Tags,
} from 'lucide-react';
import { ENTERPRISE_ASSESSMENT_PRESETS } from '../../data/sampleAssessments';
import { IngestionChannelPanel } from './IngestionChannelPanel';

export interface SourceLiveTelemetry {
  nodeId: string;
  label: string;
  severity: 'CRITICAL' | 'WARNING' | 'COMPLIANT';
  hex: string;
  dqScore: number;
  protocol: string;
  technology?: string;
  classification: string;
  sla: string;
  downstreamCount: number;
}

interface StructuredAssessmentFormProps {
  payload: AssessmentInputPayload;
  onChange: (payload: AssessmentInputPayload) => void;
  onGenerate: () => void;
  onUpdatePayloadAndCompile?: (nextPayload: AssessmentInputPayload, triggerCompile?: boolean) => void;
  onSelectPreset?: (preset: (typeof ENTERPRISE_ASSESSMENT_PRESETS)[0]) => void;
  isGenerating: boolean;
  statusMessage?: string;
  llmConfig: LlmConfig;
  onOpenLlmConfig: () => void;
  onFocusSource?: (sourceLabel: string) => void;
  onTraceSource?: (sourceLabel: string) => void;
  activeTracedSourceLabel?: string | null;
  onExecuteSourceActionByLabel?: (sourceLabel: string, action: SourceDirectActionType) => void;
  onRemediateAllSources?: () => void;
  sourceStatusMap?: Record<string, SourceLiveTelemetry>;
}

const getSourceDomainIcon = (label: string) => {
  const text = label.toLowerCase();
  if (text.includes('pos') || text.includes('card') || text.includes('payment'))
    return <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (text.includes('teller') || text.includes('terminal') || text.includes('kiosk'))
    return <Monitor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
  if (text.includes('selfie') || text.includes('biometric') || text.includes('ocr') || text.includes('kyc'))
    return <ScanFace className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
  if (text.includes('iot') || text.includes('sensor') || text.includes('telemetry') || text.includes('edge'))
    return <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
  if (text.includes('mobile') || text.includes('app') || text.includes('portal') || text.includes('user'))
    return <Smartphone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
  if (text.includes('db') || text.includes('sql') || text.includes('lake') || text.includes('cdc') || text.includes('erp'))
    return <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  return <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
};

const SOURCE_CATALOG_CATEGORIES: {
  id: string;
  label: string;
  items: { name: string; desc: string }[];
}[] = [
  {
    id: 'api',
    label: 'API & Portals',
    items: [
      { name: 'REST API Gateway', desc: 'mTLS 1.3 · JSON' },
      { name: 'Customer Mobile App', desc: 'OIDC · Real-time' },
      { name: 'Partner Webhook', desc: 'HMAC · HTTPS' },
      { name: 'GraphQL Edge Ingress', desc: 'TLS 1.3 · Schema' },
    ],
  },
  {
    id: 'streaming',
    label: 'Streams & IoT',
    items: [
      { name: 'Kafka Event Stream', desc: 'Avro · <1s SLA' },
      { name: 'IoT Telemetry Gateway', desc: 'MQTT TLS · Edge' },
      { name: 'Clickstream Collector', desc: 'Protobuf · Stream' },
      { name: 'gRPC Microservice Ingress', desc: 'mTLS · Protobuf' },
    ],
  },
  {
    id: 'db',
    label: 'Core DB & CDC',
    items: [
      { name: 'Debezium Postgres CDC', desc: 'WAL Stream · Avro' },
      { name: 'SAP ERP OData Source', desc: 'TLS 1.3 · Batch/REST' },
      { name: 'Mainframe DB2 Replication', desc: 'EBCDIC · MQ' },
      { name: 'SFTP Partner Dropzone', desc: 'SSH · Daily Batch' },
    ],
  },
  {
    id: 'regulated',
    label: 'Regulated & POS',
    items: [
      { name: 'POS Terminal', desc: 'PCI-DSS · ISO-8583' },
      { name: 'Biometric eKYC Capture', desc: 'Restricted PII' },
      { name: 'HL7v2 / FHIR Clinical Feed', desc: 'HIPAA · FHIR R4' },
      { name: 'SWIFT ISO-20022 Gateway', desc: 'mTLS · XML' },
    ],
  },
];

const DIMENSION_CONFIGS: {
  key: keyof Pick<AssessmentInputPayload, 'source' | 'child' | 'infra' | 'operations' | 'architecture'>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  placeholder: string;
  accent: string;
  tagColor: string;
}[] = [
  {
    key: 'source',
    label: '1. Source Layer (Flow Sources & Ingress Triggers)',
    icon: Database,
    description: 'Originating systems, portals, streaming topics, IoT sensors, or partner ingress gateways',
    placeholder: 'Add custom Flow Source (e.g. Core Banking CDC, Partner API)...',
    accent: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    tagColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
  },
  {
    key: 'operations',
    label: '2. Operations Layer (Business Logic & Transformations)',
    icon: Cpu,
    description: 'Data transformations, PII masking, tokenization, daily ETL, validations, approvals',
    placeholder: 'e.g. PII Masking, HL7-to-FHIR Transform, Settlement Batch, Fraud Scoring...',
    accent: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    tagColor: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
  },
  {
    key: 'child',
    label: '3. Child Layer (Downstream Sinks & Data Consumers)',
    icon: Layers,
    description: 'Target databases, external partners, sub-ledgers, analytics warehouses, audit lakes',
    placeholder: 'e.g. Analytics Data Lake, Token Vault, Core Ledger, Regulatory Feed...',
    accent: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    tagColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
  },
  {
    key: 'infra',
    label: '4. Infra Layer (Hosting Clusters & Message Buses)',
    icon: Server,
    description: 'Underlying hardware, VMware, air-gapped K8s clusters, Kafka event mesh, HSM',
    placeholder: 'e.g. On-Prem VMware, Air-Gapped K8s, Hardware Diode, Kafka Mesh...',
    accent: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    tagColor: 'bg-sky-950/80 text-sky-300 border-sky-500/40',
  },
  {
    key: 'architecture',
    label: '5. Architecture Layer (Trust Boundaries & Security Zones)',
    icon: Shield,
    description: 'Security zones, network boundaries, mTLS, encryption rules, compliance enclaves',
    placeholder: 'e.g. DMZ Edge, PCI-DSS Isolated Zone, mTLS 1.3 Boundary, Air Gap...',
    accent: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    tagColor: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
  },
];

export const StructuredAssessmentForm: React.FC<StructuredAssessmentFormProps> = ({
  payload,
  onChange,
  onGenerate,
  onUpdatePayloadAndCompile,
  onSelectPreset,
  isGenerating,
  statusMessage,
  llmConfig,
  onOpenLlmConfig,
  onFocusSource,
  onTraceSource,
  activeTracedSourceLabel,
  onExecuteSourceActionByLabel,
  onRemediateAllSources,
  sourceStatusMap,
}) => {
  const [activeTab, setActiveTab] = useState<'ingestion' | 'visual' | 'raw-json'>('ingestion');
  const [sourceViewStyle, setSourceViewStyle] = useState<'cards' | 'compact'>('cards');
  const [sourceCatalogTab, setSourceCatalogTab] = useState<string>('api');
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({
    source: '',
    child: '',
    infra: '',
    operations: '',
    architecture: '',
  });

  const handleAddTag = (
    key: keyof Pick<AssessmentInputPayload, 'source' | 'child' | 'infra' | 'operations' | 'architecture'>
  ) => {
    const val = inputValues[key]?.trim();
    if (!val) return;
    if (payload[key].includes(val)) return;

    onChange({
      ...payload,
      [key]: [...payload[key], val],
    });
    setInputValues((prev) => ({ ...prev, [key]: '' }));
  };

  const handleRemoveTag = (
    key: keyof Pick<AssessmentInputPayload, 'source' | 'child' | 'infra' | 'operations' | 'architecture'>,
    indexToRemove: number
  ) => {
    onChange({
      ...payload,
      [key]: payload[key].filter((_, idx) => idx !== indexToRemove),
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    key: keyof Pick<AssessmentInputPayload, 'source' | 'child' | 'infra' | 'operations' | 'architecture'>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(key);
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = ENTERPRISE_ASSESSMENT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      if (onSelectPreset) {
        onSelectPreset(preset);
      } else {
        onChange(JSON.parse(JSON.stringify(preset.payload)));
      }
    }
  };

  // Compute aggregate source health metrics
  const sourceItems = payload.source || [];
  const sourceHealthCounts = sourceItems.reduce(
    (acc, item) => {
      const st = sourceStatusMap?.[item.toLowerCase()];
      if (!st || st.severity === 'COMPLIANT') acc.compliant += 1;
      else if (st.severity === 'CRITICAL') acc.critical += 1;
      else acc.warning += 1;
      return acc;
    },
    { compliant: 0, warning: 0, critical: 0 }
  );

  return (
    <div className="flex h-full flex-col bg-slate-900 border-r border-slate-800 text-slate-100 overflow-y-auto">
      {/* Assessment Header */}
      <div className="border-b border-slate-800 p-4 bg-slate-950/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-400 font-mono text-xs font-bold border border-indigo-500/30">
              DFD
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">
                Structured Descriptive Data Flow
              </h2>
              <p className="text-[10px] text-indigo-400 font-medium">
                Enterprise 5-Layer Architecture Taxonomy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenLlmConfig}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              title="Configure Air-Gapped Local LLM (Ollama, LM Studio, Unsloth)"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono text-[11px] font-medium capitalize">
                {llmConfig.provider === 'airgapped-deterministic' ? 'Rule Engine' : llmConfig.provider}
              </span>
            </button>
          </div>
        </div>

        {/* System Meta Inputs */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800/80 text-xs">
          <div>
            <label className="text-[11px] text-slate-400 block mb-0.5">System Name</label>
            <input
              type="text"
              value={payload.metadata?.systemName || ''}
              onChange={(e) =>
                onChange({
                  ...payload,
                  metadata: {
                    ...payload.metadata!,
                    systemName: e.target.value,
                  },
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Ingestion Pipeline"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-0.5">Classification</label>
            <select
              value={payload.metadata?.classificationLevel || 'INTERNAL'}
              onChange={(e) =>
                onChange({
                  ...payload,
                  metadata: {
                    ...payload.metadata!,
                    classificationLevel: e.target.value as any,
                  },
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="INTERNAL">INTERNAL</option>
              <option value="CONFIDENTIAL">CONFIDENTIAL</option>
              <option value="RESTRICTED_PII">RESTRICTED_PII</option>
              <option value="PUBLIC">PUBLIC</option>
            </select>
          </div>
        </div>

        {/* Quick Enterprise Archetypes */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            <span>Enterprise Process Templates</span>
            <span className="text-[9px] text-slate-500 font-mono">1-Click Load</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            {ENTERPRISE_ASSESSMENT_PRESETS.map((preset) => {
              const isActive = payload.metadata?.assessmentId === preset.payload.metadata?.assessmentId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                  }`}
                  title={`${preset.name}: ${preset.description}`}
                >
                  <span>{preset.badge}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 space-y-4">
        {/* Toggle Mode Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-2">
          <div>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
              {activeTab === 'ingestion'
                ? 'First Ask: Ingestion Channel'
                : 'Enterprise 5-Layer Taxonomy'}
            </span>
            <span className="text-[10px] text-slate-400">
              {activeTab === 'ingestion'
                ? '10-Dimension Base Data & AI Context Ingestion'
                : 'Interactive Flow Sources & Architecture Inputs'}
            </span>
          </div>
          <div className="flex rounded-md bg-slate-800 p-0.5 text-[11px] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('ingestion')}
              className={`px-2 py-1 rounded font-semibold transition cursor-pointer ${
                activeTab === 'ingestion'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="First Ask: 10-Dimension Ingestion Channel Base Data & AI Context Ingestion"
            >
              1. Ingestion Channel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                activeTab === 'visual'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="5-Layer Architecture Taxonomy Builder"
            >
              2. 5-Layer Taxonomy
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw-json')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                activeTab === 'raw-json'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Raw JSON Assessment Spec"
            >
              JSON
            </button>
          </div>
        </div>

        {activeTab === 'ingestion' ? (
          <IngestionChannelPanel
            payload={payload}
            isGenerating={isGenerating}
            onUpdatePayloadAndCompile={(nextPayload, triggerCompile) => {
              if (onUpdatePayloadAndCompile) {
                onUpdatePayloadAndCompile(nextPayload, triggerCompile);
              } else {
                onChange(nextPayload);
                if (triggerCompile) {
                  setTimeout(() => onGenerate(), 50);
                }
              }
            }}
          />
        ) : activeTab === 'visual' ? (
          <div className="space-y-4">
            {DIMENSION_CONFIGS.map((dim) => {
              const Icon = dim.icon;
              const items = payload[dim.key] || [];
              const isSourceLayer = dim.key === 'source';

              return (
                <div
                  key={dim.key}
                  className={`rounded-xl border p-3.5 space-y-2.5 transition ${
                    isSourceLayer
                      ? 'border-indigo-500/35 bg-gradient-to-b from-indigo-950/25 via-slate-950/60 to-slate-950/60 shadow-lg shadow-indigo-950/10'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  {/* Dimension Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-4 h-4 ${isSourceLayer ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-semibold text-slate-100">
                        {dim.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSourceLayer && (
                        <div className="flex items-center rounded-md bg-slate-900 border border-slate-800 p-0.5">
                          <button
                            type="button"
                            onClick={() => setSourceViewStyle('cards')}
                            className={`p-1 rounded text-[10px] transition cursor-pointer ${
                              sourceViewStyle === 'cards'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Rich Flow Source Cards with 1-Click Governance"
                          >
                            <LayoutList className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSourceViewStyle('compact')}
                            className={`p-1 rounded text-[10px] transition cursor-pointer ${
                              sourceViewStyle === 'compact'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Compact Source Tags"
                          >
                            <Tags className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <span className="text-[10px] font-mono tabular-nums text-slate-400">
                        {items.length} {isSourceLayer ? (items.length === 1 ? 'source' : 'sources') : (items.length === 1 ? 'item' : 'items')}
                      </span>
                    </div>
                  </div>

                  {/* Source Layer Health Telemetry Summary Bar */}
                  {isSourceLayer && items.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 pb-1 border-b border-slate-800/80 text-[10px]">
                      <div className="flex items-center gap-2 font-mono tabular-nums text-slate-400">
                        <span className="text-emerald-400 font-medium">
                          {sourceHealthCounts.compliant} Compliant
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={sourceHealthCounts.warning > 0 ? 'text-amber-400 font-medium' : 'text-slate-500'}>
                          {sourceHealthCounts.warning} Warn
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={sourceHealthCounts.critical > 0 ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                          {sourceHealthCounts.critical} Critical
                        </span>
                      </div>

                      {(sourceHealthCounts.critical > 0 || sourceHealthCounts.warning > 0) &&
                        onRemediateAllSources && (
                          <button
                            type="button"
                            onClick={onRemediateAllSources}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 font-semibold transition cursor-pointer"
                            title="Automatically remediate all Source-Child contract violations on Canvas"
                          >
                            <Wrench className="w-2.5 h-2.5" />
                            <span>Heal Sources</span>
                          </button>
                        )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 leading-tight">
                    {dim.description}
                  </p>

                  {/* 1. SOURCE LAYER RICH INTERACTIVE CARDS */}
                  {isSourceLayer && sourceViewStyle === 'cards' ? (
                    <div className="space-y-2 pt-1">
                      {items.map((item, idx) => {
                        const telemetry = sourceStatusMap?.[item.toLowerCase()];
                        const isTraced =
                          activeTracedSourceLabel &&
                          activeTracedSourceLabel.toLowerCase() === item.toLowerCase();
                        const severity = telemetry?.severity || 'COMPLIANT';
                        const dqScore = telemetry?.dqScore ?? 100;
                        const protocol = telemetry?.protocol || 'HTTPS / REST';
                        const classification = telemetry?.classification || payload.metadata?.classificationLevel || 'INTERNAL';
                        const sla = telemetry?.sla || 'Real-time (<500ms)';

                        return (
                          <div
                            key={idx}
                            className={`rounded-xl border p-2.5 transition-all ${
                              isTraced
                                ? 'border-indigo-400 bg-indigo-950/40 ring-1 ring-indigo-400/40'
                                : severity === 'CRITICAL'
                                ? 'border-rose-500/40 bg-slate-900/90 hover:border-rose-400/60'
                                : severity === 'WARNING'
                                ? 'border-amber-500/40 bg-slate-900/90 hover:border-amber-400/60'
                                : 'border-slate-800 bg-slate-900/80 hover:border-indigo-500/40'
                            }`}
                          >
                            {/* Top Row: Source Icon + Name + Status + Remove */}
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => onFocusSource?.(item)}
                                className="flex items-center gap-2 text-left group/title min-w-0 flex-1 cursor-pointer"
                                title={`Click to locate & inspect "${item}" on Canvas`}
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/80 group-hover/title:border-indigo-500/50 transition">
                                  {getSourceDomainIcon(item)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-slate-100 group-hover/title:text-indigo-300 truncate transition">
                                    {item}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 truncate">
                                    <span>{protocol}</span>
                                    <span aria-hidden="true">·</span>
                                    <span
                                      className={
                                        classification === 'RESTRICTED_PII'
                                          ? 'text-rose-300'
                                          : classification === 'CONFIDENTIAL'
                                          ? 'text-amber-300'
                                          : 'text-sky-300'
                                      }
                                    >
                                      {classification}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="truncate">{sla}</span>
                                  </div>
                                </div>
                              </button>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`text-[10px] font-mono tabular-nums font-semibold ${
                                    severity === 'CRITICAL'
                                      ? 'text-rose-400'
                                      : severity === 'WARNING'
                                      ? 'text-amber-300'
                                      : 'text-emerald-400'
                                  }`}
                                  title={`Data Quality Score: ${dqScore}% (${severity})`}
                                >
                                  {dqScore}% DQ
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag('source', idx)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                                  title="Remove Flow Source"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Bottom Row: Direct Flow Source Actions */}
                            <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                {onFocusSource && (
                                  <button
                                    type="button"
                                    onClick={() => onFocusSource(item)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-[10px] font-medium text-slate-200 hover:text-white transition cursor-pointer"
                                    title="Focus & open Source Inspector on Canvas"
                                  >
                                    <Crosshair className="w-2.5 h-2.5 text-indigo-400" />
                                    <span>Inspect</span>
                                  </button>
                                )}

                                {onTraceSource && (
                                  <button
                                    type="button"
                                    onClick={() => onTraceSource(item)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                                      isTraced
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-800 hover:bg-indigo-600/80 text-slate-300 hover:text-white'
                                    }`}
                                    title="Highlight downstream data lineage from this Flow Source on Canvas"
                                  >
                                    <GitBranch className="w-2.5 h-2.5 text-cyan-400" />
                                    <span>{isTraced ? 'Tracing Flow' : 'Trace Flow'}</span>
                                  </button>
                                )}
                              </div>

                              {onExecuteSourceActionByLabel && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onExecuteSourceActionByLabel(item, 'insert-validator')
                                    }
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-950 hover:bg-emerald-950/80 text-[9.5px] font-mono text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer"
                                    title="Insert Schema Validator & DLQ Gate downstream of this Source"
                                  >
                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                    <span>+Gate</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      onExecuteSourceActionByLabel(item, 'insert-masking')
                                    }
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-950 hover:bg-amber-950/80 text-[9.5px] font-mono text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer"
                                    title="Insert PII Masking & Tokenizer downstream of this Source"
                                  >
                                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                                    <span>+Mask</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      onExecuteSourceActionByLabel(item, 'enforce-mtls')
                                    }
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-950 hover:bg-indigo-950/80 text-[9.5px] font-mono text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 transition cursor-pointer"
                                    title="Enforce mTLS 1.3 encryption on outbound contracts from this Source"
                                  >
                                    <Activity className="w-2.5 h-2.5 text-indigo-400" />
                                    <span>mTLS</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {items.length === 0 && (
                        <div className="rounded-lg border border-dashed border-slate-800 p-3 text-center text-[11px] text-slate-500">
                          No Flow Sources defined yet. Pick from the catalog below or type a custom origin.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* COMPACT TAG LIST (Used for Layers 2-5 or when Source Layer is in Compact mode) */
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {items.map((item, idx) => {
                        const srcStatus =
                          isSourceLayer
                            ? sourceStatusMap?.[item.toLowerCase()]
                            : undefined;
                        return (
                          <span
                            key={idx}
                            className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${dim.tagColor}`}
                          >
                            {isSourceLayer && onFocusSource ? (
                              <button
                                type="button"
                                onClick={() => onFocusSource(item)}
                                className="truncate max-w-[180px] text-left hover:text-white hover:underline cursor-pointer flex items-center gap-1.5"
                                title={`Click to locate & act upon Source "${item}" on Canvas`}
                              >
                                <span>{item}</span>
                                {srcStatus && (
                                  <span className="text-[9px] font-mono tabular-nums opacity-85">
                                    {srcStatus.dqScore}%
                                  </span>
                                )}
                              </button>
                            ) : (
                              <span className="truncate max-w-[200px]">{item}</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(dim.key, idx)}
                              className="opacity-70 hover:opacity-100 hover:text-red-400 transition cursor-pointer"
                              title="Remove item"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}

                      {items.length === 0 && (
                        <span className="text-[11px] italic text-slate-500 py-0.5">
                          No entries yet. Add entries below.
                        </span>
                      )}
                    </div>
                  )}

                  {/* Categorized Enterprise Flow Source Catalog for 1. Source Layer */}
                  {isSourceLayer && (
                    <div className="rounded-xl bg-slate-900/70 border border-slate-800/90 p-2.5 space-y-2 mt-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Flow Source Catalog
                        </span>
                        <div className="flex items-center gap-1 overflow-x-auto">
                          {SOURCE_CATALOG_CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setSourceCatalogTab(cat.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                                sourceCatalogTab === cat.id
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {SOURCE_CATALOG_CATEGORIES.find((c) => c.id === sourceCatalogTab)?.items.map(
                          (suggestion) => {
                            const alreadyIn = items.includes(suggestion.name);
                            return (
                              <button
                                key={suggestion.name}
                                type="button"
                                disabled={alreadyIn}
                                onClick={() =>
                                  onChange({
                                    ...payload,
                                    source: [...payload.source, suggestion.name],
                                  })
                                }
                                className={`px-2 py-1 rounded-lg border text-left transition flex items-center justify-between gap-1 ${
                                  alreadyIn
                                    ? 'border-slate-800/50 bg-slate-950/30 text-slate-600 cursor-default'
                                    : 'border-slate-800 bg-slate-950 hover:bg-slate-800/90 hover:border-indigo-500/40 text-slate-200 cursor-pointer'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-[10.5px] font-medium truncate">
                                    {alreadyIn ? `✓ ${suggestion.name}` : `+ ${suggestion.name}`}
                                  </div>
                                  <div className="text-[9px] font-mono text-slate-500 truncate">
                                    {suggestion.desc}
                                  </div>
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {/* Add Input */}
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      value={inputValues[dim.key] || ''}
                      onChange={(e) =>
                        setInputValues((prev) => ({
                          ...prev,
                          [dim.key]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => handleKeyDown(e, dim.key)}
                      placeholder={dim.placeholder}
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(dim.key)}
                      className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Direct JSON representation of the 5-dimension assessment payload:
            </p>
            <textarea
              value={JSON.stringify(payload, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange(parsed);
                } catch {
                  // Wait for valid JSON typing
                }
              }}
              rows={24}
              className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-lg p-3 text-emerald-400 focus:outline-none focus:border-indigo-500"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* Footer / Generate Action */}
      <div className="border-t border-slate-800 p-4 bg-slate-950/80 space-y-2">
        {statusMessage && (
          <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 px-3 py-2 rounded-lg">
            <span className="font-mono text-[11px] truncate">{statusMessage}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-indigo-200" />
          <span>
            {isGenerating
              ? 'Compiling Structured Flow...'
              : 'Compile & Layout Structured Data Flow'}
          </span>
        </button>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>Air-Gapped Ready</span>
          <span className="font-mono text-[10px] text-slate-400">
            {llmConfig.provider === 'airgapped-deterministic'
              ? 'Rule Engine (0ms)'
              : `${llmConfig.modelName}`}
          </span>
        </div>
      </div>
    </div>
  );
};

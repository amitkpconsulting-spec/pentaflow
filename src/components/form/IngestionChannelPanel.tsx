import React, { useState, useMemo } from 'react';
import {
  AssessmentInputPayload,
  IngestionChannelData,
  TrustedAppDataSource,
  TrustedAssetCategory,
  ThirdPartyProcessorEntry,
} from '../../types/dfd';
import {
  deriveIngestionChannelFromPayload,
  syncIngestionChannelToPayload,
  evaluateStatutoryAuditRules,
  ingestContextWithAiOrDeterministic,
  INGESTION_CONTEXT_SCENARIOS,
} from '../../utils/ingestionChannelEngine';
import {
  evaluateIngestionChannelNistPosture,
  NIST_OSCAL_REPO_URL,
  NIST_OSCAL_VERSION,
} from '../../utils/nistOscalEngine';
import {
  Sparkles,
  Plus,
  X,
  Database,
  Cpu,
  Shield,
  Globe,
  Lock,
  Server,
  FileText,
  Users,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

interface IngestionChannelPanelProps {
  payload: AssessmentInputPayload;
  onUpdatePayloadAndCompile: (nextPayload: AssessmentInputPayload, triggerCompile?: boolean) => void;
  isGenerating: boolean;
}

export const IngestionChannelPanel: React.FC<IngestionChannelPanelProps> = ({
  payload,
  onUpdatePayloadAndCompile,
  isGenerating,
}) => {
  const channel: IngestionChannelData = useMemo(
    () => deriveIngestionChannelFromPayload(payload),
    [payload]
  );

  const [isAiIngesting, setIsAiIngesting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    s1: true,
    s2: true,
    s3: true,
    s4: true,
    s5: true,
    s6: true,
    s7: true,
    s8: true,
    s9: true,
    s10: true,
  });

  // Quick-add input states for tag lists
  const [newUsageActivity, setNewUsageActivity] = useState('');
  const [newIngressChannel, setNewIngressChannel] = useState('');
  const [newStorageRepo, setNewStorageRepo] = useState('');
  const [newPiiCategory, setNewPiiCategory] = useState('');
  const [newPrivacyControl, setNewPrivacyControl] = useState('');
  const [newHostingCluster, setNewHostingCluster] = useState('');
  const [newSecurityZone, setNewSecurityZone] = useState('');
  const [newForeignRegion, setNewForeignRegion] = useState('');

  // Quick-add state for Trusted Apps & Data Sources Register (Section 8)
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState<TrustedAssetCategory>('Web/Mobile App');
  const [newAssetRisk, setNewAssetRisk] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [newAssetPii, setNewAssetPii] = useState('KYC, Identity PII, Consent');
  const [newAssetTrusted, setNewAssetTrusted] = useState(true);

  // Quick-add state for Third-Party Involvement (Section 9)
  const [newTprmName, setNewTprmName] = useState('');
  const [newTprmRole, setNewTprmRole] =
    useState<ThirdPartyProcessorEntry['role']>('Data Processor');
  const [newTprmCountry, setNewTprmCountry] = useState('IN');
  const [newTprmContract, setNewTprmContract] =
    useState<ThirdPartyProcessorEntry['contractStatus']>('Signed Sec 8(2) DPA');

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Update channel and sync to base AssessmentInputPayload
  const updateChannel = (
    updater: (prev: IngestionChannelData) => IngestionChannelData,
    compileNow = false
  ) => {
    const nextChannel = updater(channel);
    const syncedPayload = syncIngestionChannelToPayload(nextChannel, payload);
    onUpdatePayloadAndCompile(syncedPayload, compileNow);
  };

  // Run AI / Semantic Context Ingestion on the narrative
  const handleRunAiContextIngestion = async (overrideNarrative?: string) => {
    const textToIngest =
      overrideNarrative !== undefined ? overrideNarrative : channel.rawContextNarrative;
    if (!textToIngest.trim()) return;

    setIsAiIngesting(true);
    setAiFeedback('Ingesting context across all 10 dimensions & mapping @xyflow/react topology...');
    try {
      const result = await ingestContextWithAiOrDeterministic(
        textToIngest,
        channel,
        payload.metadata?.systemName
      );
      const syncedPayload = syncIngestionChannelToPayload(result.channel, payload);
      onUpdatePayloadAndCompile(syncedPayload, true);
      setAiFeedback(`✓ ${result.summary}`);
      setTimeout(() => setAiFeedback(null), 5000);
    } catch (err) {
      setAiFeedback(`Ingestion notice: ${(err as Error).message}`);
    } finally {
      setIsAiIngesting(false);
    }
  };

  // Add a new Trusted App / Data Source to Section 8
  const handleAddTrustedAsset = () => {
    if (!newAssetName.trim()) return;
    const nextIdx = channel.trustedAppsAndSources.length + 1;
    const newAsset: TrustedAppDataSource = {
      id: `APP-0${nextIdx}`,
      name: newAssetName.trim(),
      category: newAssetCategory,
      risk: newAssetRisk,
      piiTypes: newAssetPii.trim() || 'Identity & Operational PII',
      trusted: newAssetTrusted,
      protocol: newAssetCategory === 'Core DB' ? 'PostgreSQL TLS' : 'mTLS 1.3 / REST',
      location: channel.dataStorage.primaryRegion || 'India (ap-south-1)',
    };
    updateChannel((prev) => ({
      ...prev,
      trustedAppsAndSources: [...prev.trustedAppsAndSources, newAsset],
    }), true);
    setNewAssetName('');
  };

  // Add a new Third-Party Processor to Section 9
  const handleAddTprmProcessor = () => {
    if (!newTprmName.trim()) return;
    const nextIdx = channel.thirdPartyInvolvement.processors.length + 1;
    const newProc: ThirdPartyProcessorEntry = {
      id: `TPRM-0${nextIdx}`,
      name: newTprmName.trim(),
      role: newTprmRole,
      purpose: 'External processing & API integration',
      contractStatus: newTprmContract,
      destinationCountry: newTprmCountry,
    };
    updateChannel((prev) => ({
      ...prev,
      thirdPartyInvolvement: {
        hasThirdPartyProcessors: true,
        processors: [...prev.thirdPartyInvolvement.processors, newProc],
      },
    }), true);
    setNewTprmName('');
  };

  const statutoryFindings = useMemo(
    () => evaluateStatutoryAuditRules(channel),
    [channel]
  );

  const nistPosture = useMemo(
    () => evaluateIngestionChannelNistPosture(channel),
    [channel]
  );

  return (
    <div className="space-y-3.5 text-xs">
      {/* AI CONTEXT INGESTION ENGINE BANNER */}
      <div className="rounded-xl border border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-950 p-3.5 shadow-lg space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-white tracking-tight">
                AI Context Ingestion &amp; Base Data Engine
              </h3>
              <p className="text-[10px] text-indigo-300">
                Describe context or load a scenario to populate all 10 base dimensions &amp; Data Flow
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const allOpen = Object.values(expandedSections).every(Boolean);
              const nextState = !allOpen;
              setExpandedSections({
                s1: nextState,
                s2: nextState,
                s3: nextState,
                s4: nextState,
                s5: nextState,
                s6: nextState,
                s7: nextState,
                s8: nextState,
                s9: nextState,
                s10: nextState,
              });
            }}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 transition cursor-pointer shrink-0"
          >
            {Object.values(expandedSections).every(Boolean) ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* 1-Click Scenario Context Pills */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            1-Click Context Scenarios (Auto-Ingest):
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {INGESTION_CONTEXT_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleRunAiContextIngestion(sc.narrative)}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 text-left transition cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-slate-200 group-hover:text-white truncate">
                    {sc.name}
                  </div>
                  <div className="text-[9.5px] font-mono text-indigo-300 truncate">
                    {sc.badge}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Narrative Textarea */}
        <div>
          <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Context of Processing, RoPA &amp; Architecture Narrative
          </label>
          <textarea
            rows={4}
            value={channel.rawContextNarrative}
            onChange={(e) =>
              updateChannel((prev) => ({
                ...prev,
                rawContextNarrative: e.target.value,
              }))
            }
            placeholder="Paste or describe your system context: data usage, movement, storage, privacy controls, cross-border cloud regions, trusted apps & data sources, third-party processors, and high-volume RoPA scope..."
            className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
          />
        </div>

        {aiFeedback && (
          <div className="rounded-lg bg-indigo-950/60 border border-indigo-500/40 px-2.5 py-1.5 text-[11px] text-indigo-200 font-medium">
            {aiFeedback}
          </div>
        )}

        <button
          type="button"
          disabled={isAiIngesting || isGenerating}
          onClick={() => handleRunAiContextIngestion()}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition disabled:opacity-50 cursor-pointer"
        >
          {isAiIngesting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>
            {isAiIngesting
              ? 'Ingesting Context & Updating Base Data...'
              : 'AI Ingest Context → Update All 10 Base Dimensions & Data Flow'}
          </span>
        </button>
      </div>

      {/* =====================================================================
          01. CONTEXT OF DATA PROCESSING
         ===================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s1')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900/70 hover:bg-slate-900 text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-semibold text-slate-100">
              01. Context of Data Processing
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-indigo-300">
              {channel.contextOfProcessing.sector} · {channel.contextOfProcessing.lawfulBasis}
            </span>
            {expandedSections.s1 ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSections.s1 && (
          <div className="p-3.5 space-y-2.5 border-t border-slate-800/80">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">
                Business Purpose &amp; Processing Scope
              </label>
              <input
                type="text"
                value={channel.contextOfProcessing.businessPurpose}
                onChange={(e) =>
                  updateChannel((prev) => ({
                    ...prev,
                    contextOfProcessing: {
                      ...prev.contextOfProcessing,
                      businessPurpose: e.target.value,
                    },
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Regulatory Sector
                </label>
                <select
                  value={channel.contextOfProcessing.sector}
                  onChange={(e) =>
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        contextOfProcessing: {
                          ...prev.contextOfProcessing,
                          sector: e.target.value as any,
                        },
                      }),
                      true
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="SEC_FINTECH">SEC_FINTECH (BFSI)</option>
                  <option value="SEC_HEALTH">SEC_HEALTH (Clinical)</option>
                  <option value="SEC_RETAIL">SEC_RETAIL (E-Comm)</option>
                  <option value="SEC_TECH">SEC_TECH (SaaS/Cloud)</option>
                  <option value="SEC_GOV">SEC_GOV (Sovereign)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Statutory Lawful Basis
                </label>
                <select
                  value={channel.contextOfProcessing.lawfulBasis}
                  onChange={(e) =>
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        contextOfProcessing: {
                          ...prev.contextOfProcessing,
                          lawfulBasis: e.target.value as any,
                        },
                      }),
                      true
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="Consent (Sec 6)">Consent (Sec 6)</option>
                  <option value="Legitimate Use (Sec 7)">Legitimate Use (Sec 7)</option>
                  <option value="Contractual Delivery">Contractual Delivery</option>
                  <option value="Statutory Obligation">Statutory Obligation</option>
                  <option value="None - Non-Compliant">None - Non-Compliant</option>
                </select>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 cursor-pointer">
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  Processes Child / Minor Personal Data (&lt;18 years)
                </span>
                <span className="text-[10px] text-slate-400">
                  Triggers DPDPA Section 9 Verifiable Parental Consent &amp; tracking ban
                </span>
              </div>
              <input
                type="checkbox"
                checked={channel.contextOfProcessing.processesChildData}
                onChange={(e) => {
                  const checked = e.target.checked;
                  updateChannel(
                    (prev) => ({
                      ...prev,
                      contextOfProcessing: {
                        ...prev.contextOfProcessing,
                        processesChildData: checked,
                        dataPrincipalCohort: checked
                          ? ['Adult Consumers', 'Children / Minors (<18)']
                          : ['Adult Consumers', 'Enterprise Users'],
                      },
                    }),
                    true
                  );
                }}
                className="accent-indigo-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>

      {/* =====================================================================
          02. DATA USAGE & AI/ML INFERENCE
         ===================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s2')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900/70 hover:bg-slate-900 text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-slate-100">
              02. Data Usage &amp; AI/ML Inference
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-amber-300">
              {channel.dataUsage.processingActivities.length} Activities
              {channel.dataUsage.usesAiMlModels ? ' · AI/LLM Active' : ''}
            </span>
            {expandedSections.s2 ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSections.s2 && (
          <div className="p-3.5 space-y-2.5 border-t border-slate-800/80">
            <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 cursor-pointer">
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  Uses AI / ML / LLM Inference Models
                </span>
                <span className="text-[10px] text-slate-400">
                  Enforces ISO/IEC 42001:2023 AIMS &amp; DPDPA Section 10 SDF obligations
                </span>
              </div>
              <input
                type="checkbox"
                checked={channel.dataUsage.usesAiMlModels}
                onChange={(e) =>
                  updateChannel(
                    (prev) => ({
                      ...prev,
                      dataUsage: {
                        ...prev.dataUsage,
                        usesAiMlModels: e.target.checked,
                        aiModelDetails:
                          e.target.checked && !prev.dataUsage.aiModelDetails
                            ? 'Risk Scoring LLM Engine (ISO 42001 Governed)'
                            : prev.dataUsage.aiModelDetails,
                      },
                    }),
                    true
                  )
                }
                className="accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </label>

            {channel.dataUsage.usesAiMlModels && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  AI / ML Model Node Name
                </label>
                <input
                  type="text"
                  value={channel.dataUsage.aiModelDetails || ''}
                  onChange={(e) =>
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        dataUsage: {
                          ...prev.dataUsage,
                          aiModelDetails: e.target.value,
                        },
                      }),
                      true
                    )
                  }
                  placeholder="e.g. Risk Scoring LLM Engine"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Core Processing &amp; Usage Operations
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {channel.dataUsage.processingActivities.map((act, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 text-[11px]"
                  >
                    <span>{act}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChannel(
                          (prev) => ({
                            ...prev,
                            dataUsage: {
                              ...prev.dataUsage,
                              processingActivities: prev.dataUsage.processingActivities.filter(
                                (_, i) => i !== idx
                              ),
                            },
                          }),
                          true
                        )
                      }
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newUsageActivity}
                  onChange={(e) => setNewUsageActivity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newUsageActivity.trim()) {
                      e.preventDefault();
                      updateChannel(
                        (prev) => ({
                          ...prev,
                          dataUsage: {
                            ...prev.dataUsage,
                            processingActivities: [
                              ...prev.dataUsage.processingActivities,
                              newUsageActivity.trim(),
                            ],
                          },
                        }),
                        true
                      );
                      setNewUsageActivity('');
                    }
                  }}
                  placeholder="Add usage activity (e.g. Fraud Scoring, Deduplication)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newUsageActivity.trim()) return;
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        dataUsage: {
                          ...prev.dataUsage,
                          processingActivities: [
                            ...prev.dataUsage.processingActivities,
                            newUsageActivity.trim(),
                          ],
                        },
                      }),
                      true
                    );
                    setNewUsageActivity('');
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          03. DATA MOVEMENT (INGRESS & TRANSIT)
         ===================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s3')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900/70 hover:bg-slate-900 text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-semibold text-slate-100">
              03. Data Movement (Ingress &amp; Transit)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-cyan-300">
              {channel.dataMovement.ingressChannels.length} Ingress · {channel.dataMovement.movementCadence}
            </span>
            {expandedSections.s3 ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSections.s3 && (
          <div className="p-3.5 space-y-2.5 border-t border-slate-800/80">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Ingress Channels (Origin Triggers)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {channel.dataMovement.ingressChannels.map((ing, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 text-[11px]"
                  >
                    <span>{ing}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChannel(
                          (prev) => ({
                            ...prev,
                            dataMovement: {
                              ...prev.dataMovement,
                              ingressChannels: prev.dataMovement.ingressChannels.filter(
                                (_, i) => i !== idx
                              ),
                            },
                          }),
                          true
                        )
                      }
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newIngressChannel}
                  onChange={(e) => setNewIngressChannel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newIngressChannel.trim()) {
                      e.preventDefault();
                      updateChannel(
                        (prev) => ({
                          ...prev,
                          dataMovement: {
                            ...prev.dataMovement,
                            ingressChannels: [
                              ...prev.dataMovement.ingressChannels,
                              newIngressChannel.trim(),
                            ],
                          },
                        }),
                        true
                      );
                      setNewIngressChannel('');
                    }
                  }}
                  placeholder="Add ingress channel (e.g. Account Aggregator, DICOM Scanner)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newIngressChannel.trim()) return;
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        dataMovement: {
                          ...prev.dataMovement,
                          ingressChannels: [
                            ...prev.dataMovement.ingressChannels,
                            newIngressChannel.trim(),
                          ],
                        },
                      }),
                      true
                    );
                    setNewIngressChannel('');
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Primary Transit Protocol
                </label>
                <select
                  value={channel.dataMovement.transitProtocols[0] || 'mTLS 1.3 / REST'}
                  onChange={(e) =>
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        dataMovement: {
                          ...prev.dataMovement,
                          transitProtocols: [e.target.value],
                          isEncryptedInTransit: !e.target.value.includes('Unencrypted'),
                        },
                      }),
                      true
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="mTLS 1.3 / REST">mTLS 1.3 / REST</option>
                  <option value="Kafka TLS / Avro">Kafka TLS / Avro</option>
                  <option value="gRPC / mTLS 1.3">gRPC / mTLS 1.3</option>
                  <option value="HTTPS / TLS 1.3">HTTPS / TLS 1.3</option>
                  <option value="Unencrypted HTTP">Unencrypted HTTP (Violation)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Movement Cadence / SLA
                </label>
                <select
                  value={channel.dataMovement.movementCadence}
                  onChange={(e) =>
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        dataMovement: {
                          ...prev.dataMovement,
                          movementCadence: e.target.value as any,
                        },
                      }),
                      true
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="Real-time (<150ms)">Real-time (&lt;150ms)</option>
                  <option value="Streaming (<1s)">Streaming (&lt;1s)</option>
                  <option value="Micro-batch (15m)">Micro-batch (15m)</option>
                  <option value="Daily Batch 00:00">Daily Batch 00:00</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          04. DATA STORAGE & RETENTION
         ===================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s4')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900/70 hover:bg-slate-900 text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-slate-100">
              04. Data Storage &amp; Retention
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-300">
              {channel.dataStorage.repositories.length} Stores · {channel.dataStorage.encryptionAtRest}
            </span>
            {expandedSections.s4 ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSections.s4 && (
          <div className="p-3.5 space-y-2.5 border-t border-slate-800/80">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Storage Repositories (Core DBs, Lakes &amp; Warehouses)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {channel.dataStorage.repositories.map((repo, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-300 text-[11px]"
                  >
                    <span>{repo}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChannel(
                          (prev) => ({
                            ...prev,
                            dataStorage: {
                              ...prev.dataStorage,
                              repositories: prev.dataStorage.repositories.filter(
                                (_, i) => i !== idx
                              ),
                            },
                          }),
                          true
                        )
                      }
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newStorageRepo}
                  onChange={(e) => setNewStorageRepo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newStorageRepo.trim()) {
                      e.preventDefault();
                      updateChannel(
                        (prev) => ({
                          ...prev,
                          dataStorage: {
                            ...prev.dataStorage,
                            repositories: [
                              ...prev.dataStorage.repositories,
                              newStorageRepo.trim(),
                            ],
                          },
                        }),
                        true
                      );
                      setNewStorageRepo('');
                    }
                  }}
                  placeholder="Add storage repository (e.g. Core Production DB, S3 Lake)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newStorageRepo.trim()) return;
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        dataStorage: {
                          ...prev.dataStorage,
                          repositories: [
                            ...prev.dataStorage.repositories,
                            newStorageRepo.trim(),
                          ],
                        },
                      }),
                      true
                    );
                    setNewStorageRepo('');
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Encryption at Rest (Sec 8(5))
                </label>
                <select
                  value={channel.dataStorage.encryptionAtRest}
                  onChange={(e) =>
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        dataStorage: {
                          ...prev.dataStorage,
                          encryptionAtRest: e.target.value as any,
                        },
                      }),
                      true
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="AES-256-GCM + HSM">AES-256-GCM + HSM</option>
                  <option value="AES-256-GCM">AES-256-GCM</option>
                  <option value="TDE Standard">TDE Standard</option>
                  <option value="Unencrypted">Unencrypted (Violation)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Primary Sovereign Region
                </label>
                <input
                  type="text"
                  value={channel.dataStorage.primaryRegion}
                  onChange={(e) =>
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        dataStorage: {
                          ...prev.dataStorage,
                          primaryRegion: e.target.value,
                        },
                      }),
                      true
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          05. DATA PRIVACY & STATUTORY SAFEGUARDS
         ===================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s5')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900/70 hover:bg-slate-900 text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="font-semibold text-slate-100">
              05. Data Privacy &amp; Consent Governance
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-purple-300">
              {channel.dataPrivacy.piiCategories.length} PII Types · Sec 6(7)
            </span>
            {expandedSections.s5 ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSections.s5 && (
          <div className="p-3.5 space-y-2.5 border-t border-slate-800/80">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">
                Consent Manager / Notice Ledger (Sec 6(7))
              </label>
              <input
                type="text"
                value={channel.dataPrivacy.consentManager}
                onChange={(e) =>
                  updateChannel(
                    (prev) => ({
                      ...prev,
                      dataPrivacy: {
                        ...prev.dataPrivacy,
                        consentManager: e.target.value,
                      },
                    }),
                    true
                  )
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Personal Data / PII Categories Processed
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {channel.dataPrivacy.piiCategories.map((pii, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-rose-300 text-[11px]"
                  >
                    <span>{pii}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChannel((prev) => ({
                          ...prev,
                          dataPrivacy: {
                            ...prev.dataPrivacy,
                            piiCategories: prev.dataPrivacy.piiCategories.filter(
                              (_, i) => i !== idx
                            ),
                          },
                        }))
                      }
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newPiiCategory}
                  onChange={(e) => setNewPiiCategory(e.target.value)}
                  placeholder="Add PII category (e.g. Aadhaar, Biometrics, PAN)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPiiCategory.trim()) return;
                    updateChannel((prev) => ({
                      ...prev,
                      dataPrivacy: {
                        ...prev.dataPrivacy,
                        piiCategories: [
                          ...prev.dataPrivacy.piiCategories,
                          newPiiCategory.trim(),
                        ],
                      },
                    }));
                    setNewPiiCategory('');
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Privacy Engineering Controls (Tokenization, Masking, DLQ)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {channel.dataPrivacy.privacyControls.map((ctrl, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-300 text-[11px]"
                  >
                    <span>{ctrl}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChannel(
                          (prev) => ({
                            ...prev,
                            dataPrivacy: {
                              ...prev.dataPrivacy,
                              privacyControls: prev.dataPrivacy.privacyControls.filter(
                                (_, i) => i !== idx
                              ),
                            },
                          }),
                          true
                        )
                      }
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newPrivacyControl}
                  onChange={(e) => setNewPrivacyControl(e.target.value)}
                  placeholder="Add privacy control (e.g. Differential Privacy, K-Anonymity)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPrivacyControl.trim()) return;
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        dataPrivacy: {
                          ...prev.dataPrivacy,
                          privacyControls: [
                            ...prev.dataPrivacy.privacyControls,
                            newPrivacyControl.trim(),
                          ],
                        },
                      }),
                      true
                    );
                    setNewPrivacyControl('');
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          06. INFRASTRUCTURE COMPONENT
         ===================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s6')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900/70 hover:bg-slate-900 text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="font-semibold text-slate-100">
              06. Infrastructure &amp; Trust Zones
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-sky-300">
              {channel.infrastructureComponent.hostingClusters.length} Clusters ·{' '}
              {channel.infrastructureComponent.securityZones.length} Zones
            </span>
            {expandedSections.s6 ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSections.s6 && (
          <div className="p-3.5 space-y-2.5 border-t border-slate-800/80">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Hosting Clusters &amp; Message Fabric
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {channel.infrastructureComponent.hostingClusters.map((cl, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-300 text-[11px]"
                  >
                    <span>{cl}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChannel(
                          (prev) => ({
                            ...prev,
                            infrastructureComponent: {
                              ...prev.infrastructureComponent,
                              hostingClusters:
                                prev.infrastructureComponent.hostingClusters.filter(
                                  (_, i) => i !== idx
                                ),
                            },
                          }),
                          true
                        )
                      }
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newHostingCluster}
                  onChange={(e) => setNewHostingCluster(e.target.value)}
                  placeholder="Add hosting cluster (e.g. Air-Gapped K8s, AWS VPC, Kafka Mesh)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newHostingCluster.trim()) return;
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        infrastructureComponent: {
                          ...prev.infrastructureComponent,
                          hostingClusters: [
                            ...prev.infrastructureComponent.hostingClusters,
                            newHostingCluster.trim(),
                          ],
                        },
                      }),
                      true
                    );
                    setNewHostingCluster('');
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Architecture Security &amp; Trust Zones
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {channel.infrastructureComponent.securityZones.map((zn, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-300 text-[11px]"
                  >
                    <span>{zn}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChannel(
                          (prev) => ({
                            ...prev,
                            infrastructureComponent: {
                              ...prev.infrastructureComponent,
                              securityZones:
                                prev.infrastructureComponent.securityZones.filter(
                                  (_, i) => i !== idx
                                ),
                            },
                          }),
                          true
                        )
                      }
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newSecurityZone}
                  onChange={(e) => setNewSecurityZone(e.target.value)}
                  placeholder="Add security zone (e.g. PCI-DSS Enclave, DMZ Edge)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newSecurityZone.trim()) return;
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        infrastructureComponent: {
                          ...prev.infrastructureComponent,
                          securityZones: [
                            ...prev.infrastructureComponent.securityZones,
                            newSecurityZone.trim(),
                          ],
                        },
                      }),
                      true
                    );
                    setNewSecurityZone('');
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          07. CROSS-BORDER COMPONENT (CLOUD / DATA CENTER IN OTHER COUNTRIES)
         ===================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s7')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900/70 hover:bg-slate-900 text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold text-slate-100">
              07. Cross-Border Component (Foreign Cloud / DC)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-rose-300">
              {channel.crossBorderComponent.hasCrossBorderTransfer
                ? `Active (${channel.crossBorderComponent.destinationJurisdictions.join('/')})`
                : 'Localized (IN)'}
            </span>
            {expandedSections.s7 ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSections.s7 && (
          <div className="p-3.5 space-y-2.5 border-t border-slate-800/80">
            <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 cursor-pointer">
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  Cross-Border Cloud / Data Center Egress (DPDPA Sec 16)
                </span>
                <span className="text-[10px] text-slate-400">
                  Data moves to or is processed in Cloud / Data Centers in other countries
                </span>
              </div>
              <input
                type="checkbox"
                checked={channel.crossBorderComponent.hasCrossBorderTransfer}
                onChange={(e) => {
                  const active = e.target.checked;
                  updateChannel(
                    (prev) => ({
                      ...prev,
                      crossBorderComponent: {
                        ...prev.crossBorderComponent,
                        hasCrossBorderTransfer: active,
                        destinationJurisdictions: active
                          ? Array.from(
                              new Set([
                                ...prev.crossBorderComponent.destinationJurisdictions,
                                'US',
                              ])
                            )
                          : ['IN'],
                        foreignCloudRegions:
                          active && prev.crossBorderComponent.foreignCloudRegions.length === 0
                            ? ['AWS us-east-1 (Cross-Border Cloud Zone)']
                            : prev.crossBorderComponent.foreignCloudRegions,
                      },
                    }),
                    true
                  );
                }}
                className="accent-rose-500 w-4 h-4 cursor-pointer"
              />
            </label>

            {channel.crossBorderComponent.hasCrossBorderTransfer && (
              <>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Destination Jurisdictions (Toggle Countries)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['IN', 'US', 'EU', 'SG', 'UK', 'AE'].map((code) => {
                      const active =
                        channel.crossBorderComponent.destinationJurisdictions.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            const list = active
                              ? channel.crossBorderComponent.destinationJurisdictions.filter(
                                  (c) => c !== code
                                )
                              : [
                                  ...channel.crossBorderComponent.destinationJurisdictions,
                                  code,
                                ];
                            updateChannel(
                              (prev) => ({
                                ...prev,
                                crossBorderComponent: {
                                  ...prev.crossBorderComponent,
                                  destinationJurisdictions: list.length ? list : ['IN'],
                                },
                              }),
                              true
                            );
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition cursor-pointer ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Foreign Cloud / Data Center Regions
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {channel.crossBorderComponent.foreignCloudRegions.map((reg, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-rose-300 text-[11px]"
                      >
                        <span>{reg}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateChannel(
                              (prev) => ({
                                ...prev,
                                crossBorderComponent: {
                                  ...prev.crossBorderComponent,
                                  foreignCloudRegions:
                                    prev.crossBorderComponent.foreignCloudRegions.filter(
                                      (_, i) => i !== idx
                                    ),
                                },
                              }),
                              true
                            )
                          }
                          className="text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newForeignRegion}
                      onChange={(e) => setNewForeignRegion(e.target.value)}
                      placeholder="e.g. AWS us-east-1 GPU Cloud, EU Frankfurt DR Vault..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newForeignRegion.trim()) return;
                        updateChannel(
                          (prev) => ({
                            ...prev,
                            crossBorderComponent: {
                              ...prev.crossBorderComponent,
                              foreignCloudRegions: [
                                ...prev.crossBorderComponent.foreignCloudRegions,
                                newForeignRegion.trim(),
                              ],
                            },
                          }),
                          true
                        );
                        setNewForeignRegion('');
                      }}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          08. COVER APPS & DATA SOURCES (TRUSTED REGISTER — STAGE 4)
         ===================================================================== */}
      <div className="rounded-xl border border-indigo-500/35 bg-slate-950/70 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s8')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-indigo-950/30 hover:bg-indigo-950/50 text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-semibold text-white">
              08. Apps &amp; Data Sources Register (Trusted)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-indigo-300">
              {channel.trustedAppsAndSources.length} Registered Assets
            </span>
            {expandedSections.s8 ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSections.s8 && (
          <div className="p-3.5 space-y-2.5 border-t border-slate-800/80">
            <p className="text-[11px] text-slate-400">
              Every asset registered here is guaranteed to map into the <code className="text-indigo-300">@xyflow/react</code> topology with its exact PII taxonomy and Trusted status.
            </p>

            {/* Registered Assets List */}
            <div className="space-y-1.5">
              {channel.trustedAppsAndSources.map((asset, idx) => (
                <div
                  key={asset.id + idx}
                  className="rounded-lg border border-slate-800 bg-slate-900/90 p-2 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-indigo-400">
                        {asset.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-100 truncate">
                        {asset.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      <span>{asset.category}</span>
                      <span>·</span>
                      <span
                        className={
                          asset.trusted ? 'text-emerald-400' : 'text-amber-300'
                        }
                      >
                        {asset.trusted ? 'Trusted Source' : 'External Source'}
                      </span>
                      <span>·</span>
                      <span
                        className={
                          asset.risk === 'HIGH'
                            ? 'text-rose-400'
                            : asset.risk === 'MEDIUM'
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                        }
                      >
                        {asset.risk} Risk
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      PII: {asset.piiTypes}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        updateChannel(
                          (prev) => ({
                            ...prev,
                            trustedAppsAndSources: prev.trustedAppsAndSources.map(
                              (a, i) => (i === idx ? { ...a, trusted: !a.trusted } : a)
                            ),
                          }),
                          true
                        )
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 cursor-pointer"
                      title="Toggle Trusted vs External status"
                    >
                      {asset.trusted ? 'Trusted' : 'Untrusted'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateChannel(
                          (prev) => ({
                            ...prev,
                            trustedAppsAndSources: prev.trustedAppsAndSources.filter(
                              (_, i) => i !== idx
                            ),
                          }),
                          true
                        )
                      }
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Trusted App / Data Source Form */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 block">
                + Register Trusted App or Data Source
              </span>
              <input
                type="text"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="System or Database Name (e.g. Core Production DB, Onboarding App)..."
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={newAssetCategory}
                  onChange={(e) => setNewAssetCategory(e.target.value as TrustedAssetCategory)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                >
                  <option value="Web/Mobile App">Web/Mobile App</option>
                  <option value="Core DB">Core DB</option>
                  <option value="Cloud Lake">Cloud Lake</option>
                  <option value="AI Model">AI Model</option>
                  <option value="TPRM Processor">TPRM Processor</option>
                </select>
                <select
                  value={newAssetRisk}
                  onChange={(e) => setNewAssetRisk(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                >
                  <option value="HIGH">HIGH Risk</option>
                  <option value="MEDIUM">MEDIUM Risk</option>
                  <option value="LOW">LOW Risk</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAssetPii}
                  onChange={(e) => setNewAssetPii(e.target.value)}
                  placeholder="PII Types (e.g. KYC, Aadhaar, Financial)"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200"
                />
                <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={newAssetTrusted}
                    onChange={(e) => setNewAssetTrusted(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>Trusted</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddTrustedAsset}
                  className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          09. THIRD PARTY INVOLVEMENT (TPRM / SEC 8(2))
         ===================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s9')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900/70 hover:bg-slate-900 text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-slate-100">
              09. Third-Party Involvement (TPRM / Sec 8(2))
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-amber-300">
              {channel.thirdPartyInvolvement.processors.length} Processors
            </span>
            {expandedSections.s9 ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSections.s9 && (
          <div className="p-3.5 space-y-2.5 border-t border-slate-800/80">
            <div className="space-y-1.5">
              {channel.thirdPartyInvolvement.processors.map((proc, idx) => (
                <div
                  key={proc.id + idx}
                  className="rounded-lg border border-slate-800 bg-slate-900/90 p-2 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {proc.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <span>{proc.role}</span>
                      <span>·</span>
                      <span className="text-emerald-400">{proc.contractStatus}</span>
                      <span>·</span>
                      <span className="text-indigo-300">Region: {proc.destinationCountry}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateChannel(
                        (prev) => ({
                          ...prev,
                          thirdPartyInvolvement: {
                            ...prev.thirdPartyInvolvement,
                            processors: prev.thirdPartyInvolvement.processors.filter(
                              (_, i) => i !== idx
                            ),
                          },
                        }),
                        true
                      )
                    }
                    className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Third Party Processor */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300 block">
                + Add Third-Party Processor / Vendor
              </span>
              <input
                type="text"
                value={newTprmName}
                onChange={(e) => setNewTprmName(e.target.value)}
                placeholder="Vendor / Processor Name (e.g. External Credit Bureau, Cloud GPU Provider)..."
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
              />
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  value={newTprmRole}
                  onChange={(e) => setNewTprmRole(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 font-mono"
                >
                  <option value="Data Processor">Data Processor</option>
                  <option value="Sub-Processor">Sub-Processor</option>
                  <option value="Third-Party SDK">Third-Party SDK</option>
                  <option value="External Partner API">Partner API</option>
                </select>
                <select
                  value={newTprmContract}
                  onChange={(e) => setNewTprmContract(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 font-mono"
                >
                  <option value="Signed Sec 8(2) DPA">Signed Sec 8(2) DPA</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="No Formal Contract">No Contract</option>
                </select>
                <div className="flex gap-1">
                  <select
                    value={newTprmCountry}
                    onChange={(e) => setNewTprmCountry(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 font-mono"
                  >
                    <option value="IN">IN</option>
                    <option value="US">US</option>
                    <option value="EU">EU</option>
                    <option value="SG">SG</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddTprmProcessor}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          10. DATA MAPPING / RoPA (HIGH-VOLUME PROCESSING)
         ===================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('s10')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900/70 hover:bg-slate-900 text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-slate-100">
              10. Data Mapping / RoPA (High-Volume Processing)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-300">
              {channel.ropaMapping.ropaRecordId} · {channel.ropaMapping.estimatedVolume}
            </span>
            {expandedSections.s10 ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSections.s10 && (
          <div className="p-3.5 space-y-2.5 border-t border-slate-800/80">
            <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 cursor-pointer">
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  High-Volume Processing / RoPA Ledger Applicable
                </span>
                <span className="text-[10px] text-slate-400">
                  Adds RoPA Audit Ledger sink node &amp; Significant Data Fiduciary (Sec 10) DPIA controls
                </span>
              </div>
              <input
                type="checkbox"
                checked={channel.ropaMapping.isHighVolumeProcessing}
                onChange={(e) =>
                  updateChannel(
                    (prev) => ({
                      ...prev,
                      ropaMapping: {
                        ...prev.ropaMapping,
                        isHighVolumeProcessing: e.target.checked,
                      },
                    }),
                    true
                  )
                }
                className="accent-emerald-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  RoPA Record Identifier
                </label>
                <input
                  type="text"
                  value={channel.ropaMapping.ropaRecordId}
                  onChange={(e) =>
                    updateChannel(
                      (prev) => ({
                        ...prev,
                        ropaMapping: {
                          ...prev.ropaMapping,
                          ropaRecordId: e.target.value,
                        },
                      }),
                      true
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Processing Volume / Throughput
                </label>
                <input
                  type="text"
                  value={channel.ropaMapping.estimatedVolume}
                  onChange={(e) =>
                    updateChannel((prev) => ({
                      ...prev,
                      ropaMapping: {
                        ...prev.ropaMapping,
                        estimatedVolume: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Assessed Statutory Role
                </label>
                <select
                  value={channel.ropaMapping.assessedRole}
                  onChange={(e) =>
                    updateChannel((prev) => ({
                      ...prev,
                      ropaMapping: {
                        ...prev.ropaMapping,
                        assessedRole: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="Significant Data Fiduciary">
                    Significant Data Fiduciary (Sec 10)
                  </option>
                  <option value="Data Fiduciary">Data Fiduciary (Sec 8)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Line 3 DPO Sign-Off Readiness
                </label>
                <select
                  value={channel.ropaMapping.dpoSignOffStatus}
                  onChange={(e) =>
                    updateChannel((prev) => ({
                      ...prev,
                      ropaMapping: {
                        ...prev.ropaMapping,
                        dpoSignOffStatus: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 font-mono"
                >
                  <option value="Ready for Sign-Off">Ready for Sign-Off</option>
                  <option value="Conditional Approval">Conditional Approval</option>
                  <option value="Remediation Required">Remediation Required</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          AUTOMATED NIST SP 800-53 REV 5 (OSCAL v1.4.0) KEY CONTROLS MATRIX
         ===================================================================== */}
      <div className="rounded-xl border border-cyan-500/35 bg-slate-950/90 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300 block">
              NIST SP 800-53 Rev 5 Key Controls ({NIST_OSCAL_VERSION})
            </span>
            <a
              href={NIST_OSCAL_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[9.5px] font-mono text-indigo-400 hover:text-indigo-300 underline transition"
              title="Open US NIST OSCAL SP 800-53 v1.4.0 Repository"
            >
              usnistgov/oscal-content/v1.4.0/SP800-53
            </a>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 shrink-0">
            {nistPosture.filter((c) => c.status === 'IMPLEMENTED').length}/{nistPosture.length} Implemented
          </span>
        </div>

        <p className="text-[10px] text-slate-400 leading-snug">
          Key NIST SP 800-53 Rev 5 security &amp; privacy controls automatically derived from the 10 Ingestion Channel dimensions and showcased on Data Flow nodes:
        </p>

        <div className="space-y-1.5">
          {nistPosture.map((ctrl) => (
            <div
              key={ctrl.id}
              className={`rounded-lg border p-2 text-[11px] ${
                ctrl.status === 'GAP'
                  ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                  : ctrl.status === 'PARTIAL'
                  ? 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                  : 'border-slate-800 bg-slate-900/60 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-cyan-300 shrink-0">
                    {ctrl.id}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="font-semibold truncate" title={ctrl.title}>
                    {ctrl.shortLabel}
                  </span>
                </div>
                <span
                  className={`text-[9.5px] font-mono font-semibold shrink-0 ${
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
              <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={ctrl.evidence}>
                {ctrl.evidence}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================================
          AUTOMATED STATUTORY AUDIT SCORECARD (FROM dataflow.md)
         ===================================================================== */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
            Automated Statutory &amp; RoPA Graph Audit (DPDP-TRACE)
          </span>
          <span className="text-[10px] font-mono text-emerald-400">
            {statutoryFindings.filter((f) => f.status === 'COMPLIANT').length}/4 Rules Passed
          </span>
        </div>

        <div className="space-y-1.5">
          {statutoryFindings.map((f) => (
            <div
              key={f.ruleId}
              className={`rounded-lg border p-2 text-[11px] ${
                f.status === 'VIOLATION'
                  ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                  : f.status === 'WARNING'
                  ? 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 font-semibold">
                <span className="flex items-center gap-1.5">
                  {f.status === 'VIOLATION' ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : f.status === 'WARNING' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span>{f.title}</span>
                </span>
                <span className="text-[9.5px] font-mono opacity-80">{f.statutoryRef}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">{f.finding}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

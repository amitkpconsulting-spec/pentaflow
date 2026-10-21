/**
 * Enterprise Structured Descriptive Data Flow Diagram (DFD) Generator
 * Air-gapped React Flow v12+ Engine with Local LLM Integration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AssessmentInputPayload,
  CustomDfdNode,
  CustomDfdEdge,
  LlmConfig,
} from './types/dfd';
import {
  callLocalLlmForDfd,
  DEFAULT_LLM_CONFIGS,
} from './services/localLlmService';
import { getLayoutedElements } from './utils/dagreLayout';
import {
  runDeterministicDqLinter,
  SourceDirectActionType,
} from './utils/dqGraphLinter';
import { ENTERPRISE_ASSESSMENT_PRESETS } from './data/sampleAssessments';
import {
  StructuredAssessmentForm,
  SourceLiveTelemetry,
} from './components/form/StructuredAssessmentForm';
import { StructuredDfdCanvas } from './components/canvas/StructuredDfdCanvas';
import { LlmConfigModal } from './components/settings/LlmConfigModal';
import { FlowDirectoryModal } from './components/flows/FlowDirectoryModal';
import { CreateFlowModal } from './components/flows/CreateFlowModal';
import { AssessmentPreset } from './data/sampleAssessments';
import {
  getAllFlowTemplates,
  deleteCustomFlow,
  createNewFlowTemplate,
} from './utils/flowStorage';

import {
  Shield,
  Layers,
  Sparkles,
  Sliders,
  Maximize2,
  Columns2,
  FileCode,
  HardDrive,
  Info,
  ExternalLink,
  Workflow,
  Plus,
  FolderOpen,
  BookmarkPlus,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

export default function App() {
  // Flow Directory state (combines built-in archetypes and local custom flows)
  const [allFlows, setAllFlows] = useState<AssessmentPreset[]>(() => getAllFlowTemplates());
  const [isFlowDirectoryOpen, setIsFlowDirectoryOpen] = useState(false);
  const [isCreateFlowOpen, setIsCreateFlowOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initial enterprise assessment payload
  const [assessmentPayload, setAssessmentPayload] = useState<AssessmentInputPayload>(
    ENTERPRISE_ASSESSMENT_PRESETS[0].payload
  );

  // Local LLM Configuration state
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(
    DEFAULT_LLM_CONFIGS.airgappedDeterministic
  );

  const [isLlmConfigOpen, setIsLlmConfigOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [viewMode, setViewMode] = useState<'split' | 'canvas-only' | 'form-only'>('split');

  // React Flow graph state
  const [nodes, setNodes] = useState<CustomDfdNode[]>([]);
  const [edges, setEdges] = useState<CustomDfdEdge[]>([]);
  const [liveNodes, setLiveNodes] = useState<CustomDfdNode[]>([]);
  const [liveEdges, setLiveEdges] = useState<CustomDfdEdge[]>([]);
  const [lastGenerationSource, setLastGenerationSource] = useState<string>('Pre-loaded');
  const [focusedSourceLabel, setFocusedSourceLabel] = useState<string | null>(null);
  const [tracedSourceLabel, setTracedSourceLabel] = useState<string | null>(null);
  const [pendingSourceAction, setPendingSourceAction] = useState<{
    sourceLabel?: string;
    action: SourceDirectActionType | 'remediate-all';
  } | null>(null);

  const handleGraphStateChange = useCallback(
    (updatedNodes: CustomDfdNode[], updatedEdges: CustomDfdEdge[]) => {
      setLiveNodes(updatedNodes);
      setLiveEdges(updatedEdges);
    },
    []
  );

  // Compute live Source telemetry map for StructuredAssessmentForm
  const sourceStatusMap = useMemo(() => {
    const activeNodes = liveNodes.length > 0 ? liveNodes : nodes;
    const activeEdges = liveEdges.length > 0 ? liveEdges : edges;
    const linted = runDeterministicDqLinter(activeNodes, activeEdges);
    const map: Record<string, SourceLiveTelemetry> = {};

    linted.nodes.forEach((n) => {
      if (n.type === 'sourceNode' || n.data.category === 'Source') {
        const dq = n.data.dataQuality;
        const hasCrit = dq?.rules?.some((r) => r.status === 'CRITICAL');
        const hasWarn = dq?.rules?.some((r) => r.status === 'WARN');
        const severity: 'CRITICAL' | 'WARNING' | 'COMPLIANT' = hasCrit
          ? 'CRITICAL'
          : hasWarn
          ? 'WARNING'
          : 'COMPLIANT';
        const hex =
          severity === 'CRITICAL'
            ? '#EF4444'
            : severity === 'WARNING'
            ? '#F59E0B'
            : '#10B981';
        const downstreamCount = linted.edges.filter((e) => e.source === n.id).length;

        map[n.data.label.toLowerCase()] = {
          nodeId: n.id,
          label: n.data.label,
          severity,
          hex,
          dqScore: dq?.score ?? 100,
          protocol: n.data.metadata?.protocol || 'HTTPS / REST',
          technology: n.data.metadata?.technology,
          classification: n.data.metadata?.dataClassification || 'INTERNAL',
          sla: n.data.metadata?.sla || dq?.slaLatency || 'Real-time (<500ms)',
          downstreamCount,
        };
      }
    });

    return map;
  }, [liveNodes, liveEdges, nodes, edges]);

  // Compile graph from any specific payload
  const compilePayloadToDfd = useCallback(
    async (targetPayload: AssessmentInputPayload, customBanner?: string) => {
      setIsGenerating(true);
      setStatusMessage(customBanner || 'Preparing 5-dimension enterprise flow payload...');

      try {
        const result = await callLocalLlmForDfd(
          targetPayload,
          llmConfig,
          (status) => setStatusMessage(status)
        );

        setStatusMessage('Applying Dagre hierarchical auto-layout...');

        const rawNodes = result.graph.nodes as CustomDfdNode[];
        const rawEdges = result.graph.edges as CustomDfdEdge[];
        const layouted = getLayoutedElements(rawNodes, rawEdges, { direction: 'LR' });

        setNodes(layouted.nodes);
        setEdges(layouted.edges);
        setLastGenerationSource(
          result.source === 'llm'
            ? `Local LLM (${result.latencyMs}ms)`
            : `Air-Gapped Rule Engine (${result.latencyMs}ms)`
        );

        setStatusMessage('');
      } catch (err) {
        console.error('DFD generation error:', err);
        setStatusMessage(`Error: ${(err as Error).message}`);
      } finally {
        setIsGenerating(false);
      }
    },
    [llmConfig]
  );

  // Compile graph from current state payload
  const handleGenerateDfd = useCallback(async () => {
    await compilePayloadToDfd(assessmentPayload);
  }, [assessmentPayload, compilePayloadToDfd]);

  // Update payload from Ingestion Channel and optionally re-compile immediately
  const handleUpdatePayloadAndCompile = useCallback(
    (nextPayload: AssessmentInputPayload, triggerCompile?: boolean) => {
      setAssessmentPayload(nextPayload);
      if (triggerCompile) {
        compilePayloadToDfd(
          nextPayload,
          'Syncing Ingestion Channel base data to Data Flow Diagram...'
        );
      }
    },
    [compilePayloadToDfd]
  );

  const handleSelectPreset = useCallback(
    async (preset: (typeof ENTERPRISE_ASSESSMENT_PRESETS)[0]) => {
      setAssessmentPayload(preset.payload);
      await compilePayloadToDfd(preset.payload, `Compiling ${preset.name}...`);
    },
    [compilePayloadToDfd]
  );

  const handleFlowCreated = useCallback(
    (newFlow: AssessmentPreset) => {
      const updated = getAllFlowTemplates();
      setAllFlows(updated);
      handleSelectPreset(newFlow);
      setToastMessage(`✓ Added "${newFlow.name}" to Directory of Structured Descriptive Data Flows`);
      setTimeout(() => setToastMessage(null), 4000);
    },
    [handleSelectPreset]
  );

  const handleDeleteCustomFlow = useCallback((flowId: string) => {
    deleteCustomFlow(flowId);
    setAllFlows(getAllFlowTemplates());
    setToastMessage('Structured flow removed from Directory');
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleSaveCurrentAsTemplate = useCallback(() => {
    const name = assessmentPayload.metadata?.systemName || 'Custom Enterprise Flow';
    const newFlow = createNewFlowTemplate({
      name,
      badge: name.slice(0, 12),
      category: 'Custom Enterprise Flows',
      description: assessmentPayload.metadata?.notes || 'Custom structured descriptive data flow architecture.',
      initialPayload: assessmentPayload,
      cloneCurrent: true,
    });
    setAllFlows(getAllFlowTemplates());
    handleSelectPreset(newFlow);
    setToastMessage(`✓ Saved "${name}" into Directory of Structured Descriptive Data Flows`);
    setTimeout(() => setToastMessage(null), 4000);
  }, [assessmentPayload, handleSelectPreset]);

  // Initial compile on mount
  useEffect(() => {
    handleGenerateDfd();
  }, []);

  // Handle two-way sync from Canvas back to Form
  const handleSyncToForm = useCallback((extracted: Partial<AssessmentInputPayload>) => {
    setAssessmentPayload((prev) => ({
      ...prev,
      source: extracted.source?.length ? extracted.source : prev.source,
      child: extracted.child?.length ? extracted.child : prev.child,
      operations: extracted.operations?.length ? extracted.operations : prev.operations,
      infra: extracted.infra?.length ? extracted.infra : prev.infra,
      architecture: extracted.architecture?.length ? extracted.architecture : prev.architecture,
    }));
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 font-sans text-slate-100 overflow-hidden relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-indigo-900/90 border border-indigo-500/50 px-4 py-2 text-xs font-semibold text-white shadow-xl shadow-black/50 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Enterprise App Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 shadow-md shadow-indigo-500/25 ring-1 ring-white/10">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span className="bg-gradient-to-r from-indigo-300 via-white to-purple-300 bg-clip-text text-transparent font-extrabold text-base tracking-normal">
                  PentaFlow
                </span>
                <span className="text-slate-500 font-normal">|</span>
                <span className="text-slate-200">Structured Data Flow Studio</span>
                <span className="rounded-md bg-indigo-500/20 border border-indigo-500/40 px-1.5 py-0.5 text-[10px] font-mono text-indigo-300">
                  DFD v2.1
                </span>
              </h1>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                Air-Gapped Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Enterprise 5-Layer Architecture Taxonomy • DQ DAMA Governance Engine
            </p>
          </div>
        </div>

        {/* Center Quick Flows Bar & Directory Entry */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-indigo-950/40 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl px-2 sm:px-3 py-1 shadow-lg shadow-black/40 ring-1 ring-white/5 backdrop-blur-md transition-all duration-200">
          {/* "+ New Flow" Action Button */}
          <button
            type="button"
            onClick={() => setIsCreateFlowOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/50 hover:ring-indigo-300 transition-all active:scale-95 cursor-pointer"
            title="Create a new Structured Descriptive Data Flow to add to Directory"
          >
            <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            <span className="font-semibold tracking-tight whitespace-nowrap">Create New Flow</span>
          </button>

          {/* "Directory / Templates" Catalog Button */}
          <button
            type="button"
            onClick={() => setIsFlowDirectoryOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700/90 hover:border-indigo-400/40 transition cursor-pointer shadow-sm group"
            title="Browse Directory of Structured Descriptive Data Flows / Templates"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            <span className="hidden sm:inline font-medium">Flow Directory &amp; Templates</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 shadow-xs">
              {allFlows.length}
            </span>
          </button>

          {/* Save Workspace Quick Action */}
          <button
            type="button"
            onClick={handleSaveCurrentAsTemplate}
            className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 transition"
            title="Save current workspace as a template in Directory"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
          </button>

          {/* Quick Presets Pills (Desktop) */}
          <div className="hidden xl:flex items-center gap-1 border-l border-slate-800/80 pl-1.5 ml-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-0.5">
              Flow:
            </span>
            {allFlows.slice(0, 3).map((p) => {
              const isCurrent = assessmentPayload.metadata?.assessmentId === p.payload.metadata?.assessmentId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2 py-0.5 text-xs rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={p.name}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`} />
                  <span className="whitespace-nowrap">{p.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2">
          {/* Active Model / Engine Badge */}
          <button
            type="button"
            onClick={() => setIsLlmConfigOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition"
            title="Configure Local LLM inference endpoint"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-[11px] font-medium">
              {llmConfig.provider === 'airgapped-deterministic'
                ? 'Air-Gapped Rules'
                : `${llmConfig.provider} (${llmConfig.modelName})`}
            </span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Split View (Form + Canvas)"
            >
              <Columns2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('canvas-only')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'canvas-only' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full Canvas View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Structured Assessment Form Section */}
        {viewMode !== 'canvas-only' && (
          <div
            className={`h-full ${
              viewMode === 'form-only'
                ? 'w-full'
                : 'w-[420px] lg:w-[460px] xl:w-[490px] shrink-0'
            }`}
          >
            <StructuredAssessmentForm
              payload={assessmentPayload}
              onChange={setAssessmentPayload}
              onGenerate={handleGenerateDfd}
              onUpdatePayloadAndCompile={handleUpdatePayloadAndCompile}
              onSelectPreset={handleSelectPreset}
              isGenerating={isGenerating}
              statusMessage={statusMessage}
              llmConfig={llmConfig}
              onOpenLlmConfig={() => setIsLlmConfigOpen(true)}
              onFocusSource={(sourceLabel) => setFocusedSourceLabel(sourceLabel)}
              onTraceSource={(sourceLabel) =>
                setTracedSourceLabel((prev) =>
                  prev && prev.toLowerCase() === sourceLabel.toLowerCase() ? null : sourceLabel
                )
              }
              activeTracedSourceLabel={tracedSourceLabel}
              onExecuteSourceActionByLabel={(sourceLabel, action) =>
                setPendingSourceAction({ sourceLabel, action })
              }
              onRemediateAllSources={() =>
                setPendingSourceAction({ action: 'remediate-all' })
              }
              sourceStatusMap={sourceStatusMap}
            />
          </div>
        )}

        {/* Right: @xyflow/react Interactive DFD Canvas */}
        {viewMode !== 'form-only' && (
          <div className="flex-1 h-full relative">
            <StructuredDfdCanvas
              initialNodes={nodes}
              initialEdges={edges}
              onSyncToForm={handleSyncToForm}
              systemName={assessmentPayload.metadata?.systemName}
              focusedSourceLabel={focusedSourceLabel}
              onClearFocusedSource={() => setFocusedSourceLabel(null)}
              tracedSourceLabel={tracedSourceLabel}
              onChangeTracedSource={(label) => setTracedSourceLabel(label)}
              pendingSourceAction={pendingSourceAction}
              onClearPendingSourceAction={() => setPendingSourceAction(null)}
              onGraphStateChange={handleGraphStateChange}
            />
          </div>
        )}
      </div>

      {/* Application Footer Note */}
      <footer className="h-7 shrink-0 px-4 border-t border-slate-800 bg-slate-950/95 flex items-center justify-between text-[11px] text-slate-400 select-none z-10">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">PentaFlow</span>
          <span className="text-slate-700">•</span>
          <span className="text-slate-400 hidden sm:inline">Enterprise 5-Layer Structured Data Flow &amp; DQ DAMA Studio</span>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <a
            href="https://github.com/amitkpconsulting-spec/pentaflow"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 hover:underline transition"
          >
            <span>github.com/amitkpconsulting-spec/pentaflow</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <span>Advisory &amp; Developer Contact:</span>
          <a
            href="https://www.technoscope.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 hover:underline transition"
          >
            <span>www.technoscope.co.in</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>

      {/* Local LLM Settings Modal */}
      <LlmConfigModal
        isOpen={isLlmConfigOpen}
        onClose={() => setIsLlmConfigOpen(false)}
        config={llmConfig}
        onSave={(newConfig) => setLlmConfig(newConfig)}
      />

      {/* Create New Flow Modal */}
      <CreateFlowModal
        isOpen={isCreateFlowOpen}
        onClose={() => setIsCreateFlowOpen(false)}
        onFlowCreated={handleFlowCreated}
        currentPayload={assessmentPayload}
      />

      {/* Directory of Data Flows / Templates Modal */}
      <FlowDirectoryModal
        isOpen={isFlowDirectoryOpen}
        onClose={() => setIsFlowDirectoryOpen(false)}
        allFlows={allFlows}
        activeFlowId={assessmentPayload.metadata?.assessmentId}
        onSelectFlow={handleSelectPreset}
        onOpenCreateModal={() => setIsCreateFlowOpen(true)}
        onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
        onDeleteCustomFlow={handleDeleteCustomFlow}
      />
    </div>
  );
}

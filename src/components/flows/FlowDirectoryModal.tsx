import React, { useState, useMemo } from 'react';
import { AssessmentPreset } from '../../data/sampleAssessments';
import { AssessmentInputPayload } from '../../types/dfd';
import {
  X,
  Search,
  Plus,
  FolderOpen,
  ArrowRight,
  Trash2,
  Copy,
  Layers,
  Database,
  Shield,
  Cpu,
  CheckCircle2,
  Sparkles,
  BookmarkPlus,
} from 'lucide-react';

interface FlowDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  allFlows: AssessmentPreset[];
  activeFlowId?: string;
  onSelectFlow: (flow: AssessmentPreset) => void;
  onOpenCreateModal: () => void;
  onSaveCurrentAsTemplate: () => void;
  onDeleteCustomFlow?: (flowId: string) => void;
}

export const FlowDirectoryModal: React.FC<FlowDirectoryModalProps> = ({
  isOpen,
  onClose,
  allFlows,
  activeFlowId,
  onSelectFlow,
  onOpenCreateModal,
  onSaveCurrentAsTemplate,
  onDeleteCustomFlow,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    allFlows.forEach((f) => set.add(f.category));
    return ['All', ...Array.from(set)];
  }, [allFlows]);

  const filteredFlows = useMemo(() => {
    return allFlows.filter((flow) => {
      const matchCat = selectedCategory === 'All' || flow.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        flow.name.toLowerCase().includes(q) ||
        flow.badge.toLowerCase().includes(q) ||
        flow.description.toLowerCase().includes(q) ||
        flow.payload.source.some((s) => s.toLowerCase().includes(q)) ||
        flow.payload.child.some((c) => c.toLowerCase().includes(q)) ||
        flow.payload.operations.some((o) => o.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [allFlows, selectedCategory, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100 flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <FolderOpen className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Directory of Structured Descriptive Data Flows &amp; Templates
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                  {allFlows.length} Flows
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Browse, launch, and create standardized enterprise flows modeled under the Enterprise 5-Layer Architecture Taxonomy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveCurrentAsTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
              title="Save current workspace state as a template"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Save Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCreateModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Flow</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative shrink-0 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearchQuerySafe(e.target.value)}
              placeholder="Search flows, systems, protocols..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
          {filteredFlows.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-400 text-xs">
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-300">No matching flow templates found</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Try a different keyword or create a new flow template.
              </p>
            </div>
          ) : (
            filteredFlows.map((flow) => {
              const isActive = activeFlowId === flow.id || flow.payload.metadata?.assessmentId === activeFlowId;
              const isCustom = flow.id.startsWith('custom-flow-');

              return (
                <div
                  key={flow.id}
                  className={`group relative rounded-xl border p-4 flex flex-col justify-between transition-all duration-150 ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-950/20 shadow-lg ring-1 ring-indigo-500/30'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950/90'
                  }`}
                >
                  <div>
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                          {flow.name}
                        </span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 shrink-0">
                        {flow.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                      {flow.description}
                    </p>

                    {/* 5-Layer Taxonomy Pill Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px] font-mono text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1" title="1. Source Layer">
                        <Database className="w-3 h-3 text-indigo-400" />
                        {flow.payload.source.length} Sources
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1" title="2. Operations Layer">
                        <Cpu className="w-3 h-3 text-amber-400" />
                        {flow.payload.operations.length} Operations
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1" title="3. Child / Sink Layer">
                        <Layers className="w-3 h-3 text-emerald-400" />
                        {flow.payload.child.length} Sinks
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1" title="4. Infra Layer">
                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                        {flow.payload.infra?.length || 0} Infra
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1" title="5. Architecture Boundary Layer">
                        <Shield className="w-3 h-3 text-purple-400" />
                        {flow.payload.architecture.length} Zones
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-[10px] font-mono text-slate-500">
                      {flow.payload.metadata?.classificationLevel || 'INTERNAL'} • {flow.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isCustom && onDeleteCustomFlow && (
                        <button
                          type="button"
                          onClick={() => onDeleteCustomFlow(flow.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                          title="Delete custom template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onSelectFlow(flow);
                          onClose();
                        }}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
                        }`}
                      >
                        <span>{isActive ? 'Current Flow' : 'Load Flow'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  function setSearchQuerySafe(val: string) {
    setSearch(val);
  }
};

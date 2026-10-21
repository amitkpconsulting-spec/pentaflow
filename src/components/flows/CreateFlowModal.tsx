import React, { useState } from 'react';
import { AssessmentInputPayload } from '../../types/dfd';
import { AssessmentPreset } from '../../data/sampleAssessments';
import { createNewFlowTemplate } from '../../utils/flowStorage';
import { X, Plus, Sparkles, FolderPlus, Copy, Shield, Layers } from 'lucide-react';

interface CreateFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlowCreated: (newPreset: AssessmentPreset) => void;
  currentPayload: AssessmentInputPayload;
}

export const CreateFlowModal: React.FC<CreateFlowModalProps> = ({
  isOpen,
  onClose,
  onFlowCreated,
  currentPayload,
}) => {
  const [name, setName] = useState('');
  const [badge, setBadge] = useState('');
  const [category, setCategory] = useState('Banking & Compliance');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState<'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED_PII' | 'PUBLIC'>('INTERNAL');
  const [environment, setEnvironment] = useState<'air-gapped-production' | 'on-prem-dmz' | 'classified' | 'hybrid-vpc'>('air-gapped-production');
  const [mode, setMode] = useState<'scaffold' | 'clone' | 'blank'>('scaffold');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let initialPayload: AssessmentInputPayload | undefined = undefined;

    if (mode === 'clone') {
      initialPayload = currentPayload;
    } else if (mode === 'blank') {
      initialPayload = {
        source: [],
        child: [],
        infra: [],
        operations: [],
        architecture: [],
        metadata: {
          systemName: name.trim(),
          assessmentId: `FLOW-${Date.now().toString().slice(-6)}`,
          classificationLevel: classification,
          environment,
          notes: description,
        },
      };
    }

    const created = createNewFlowTemplate({
      name: name.trim(),
      badge: badge.trim() || name.trim().slice(0, 14),
      category: category.trim() || 'Custom Flows',
      description: description.trim() || 'Custom enterprise process flow.',
      classificationLevel: classification,
      environment,
      initialPayload,
      cloneCurrent: mode === 'clone',
    });

    onFlowCreated(created);
    setName('');
    setBadge('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <FolderPlus className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Create Structured Descriptive Data Flow</h3>
              <p className="text-[11px] text-slate-400">
                Adds a new flow to the enterprise Directory adhering to the 5-Layer Taxonomy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 p-2.5">
          <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Quick Starter Archetypes:</span>
            <span className="text-slate-400 font-normal">Click to prefill</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setName('KYC Process Flow & Identity Verification');
                setBadge('KYC & AML');
                setCategory('Banking & Compliance');
                setClassification('RESTRICTED_PII');
                setDescription('Air-gapped customer identity verification, biometric liveness check, and PEP sanctions screening.');
                setMode('scaffold');
              }}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-[11px] font-medium transition cursor-pointer"
            >
              KYC Process Flow
            </button>
            <button
              type="button"
              onClick={() => {
                setName('Transaction Banking Credit Card Payment');
                setBadge('Card Payment');
                setCategory('Transaction Banking');
                setClassification('RESTRICTED_PII');
                setDescription('High-speed credit card authorization, ISO 8583 switch, fraud engine, and clearing settlement.');
                setMode('scaffold');
              }}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-[11px] font-medium transition cursor-pointer"
            >
              Transaction Banking CC
            </button>
            <button
              type="button"
              onClick={() => {
                setName('Customer Onboarding for a Retail Account');
                setBadge('Retail Onboard');
                setCategory('Retail Banking');
                setClassification('CONFIDENTIAL');
                setDescription('Digital retail bank account opening, credit checks, IBAN generation, and virtual card provisioning.');
                setMode('scaffold');
              }}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-[11px] font-medium transition cursor-pointer"
            >
              Retail Account Onboarding
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Flow Name & Badge */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Flow / System Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!badge) {
                    setBadge(e.target.value.slice(0, 12));
                  }
                }}
                placeholder="e.g. Real-Time FX Settlement Pipeline"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Badge Label
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. FX Settlement"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Category & Classification */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Banking & Compliance">Banking & Compliance</option>
                <option value="Transaction Banking">Transaction Banking</option>
                <option value="Retail Banking">Retail Banking</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Aerospace & Defense">Aerospace & Defense</option>
                <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                <option value="Custom Enterprise Flows">Custom Enterprise Flows</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Data Classification
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="RESTRICTED_PII">RESTRICTED_PII</option>
                <option value="PUBLIC">PUBLIC</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Description / Business Context
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of originating sources, transformations, and security zones..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Starter Template Selection */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
              Initial Graph Scaffold
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('scaffold')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  mode === 'scaffold'
                    ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-400 mb-1" />
                <div className="font-semibold text-xs text-slate-200">Recommended</div>
                <div className="text-[10px] text-slate-400">Pre-wired 5D scaffold</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('clone')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  mode === 'clone'
                    ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Copy className="w-4 h-4 text-emerald-400 mb-1" />
                <div className="font-semibold text-xs text-slate-200">Clone Current</div>
                <div className="text-[10px] text-slate-400">Copy active workspace</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('blank')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  mode === 'blank'
                    ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Layers className="w-4 h-4 text-amber-400 mb-1" />
                <div className="font-semibold text-xs text-slate-200">Blank Canvas</div>
                <div className="text-[10px] text-slate-400">Empty 5 dimensions</div>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Saved to local persistent directory
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md transition text-xs cursor-pointer"
              >
                Create & Load Flow
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

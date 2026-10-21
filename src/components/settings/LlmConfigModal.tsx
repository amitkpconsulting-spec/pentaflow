import React, { useState } from 'react';
import { LlmConfig, LlmProviderType } from '../../types/dfd';
import {
  DEFAULT_LLM_CONFIGS,
  testEndpointConnection,
} from '../../services/localLlmService';
import {
  X,
  Server,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Shield,
  Cpu,
} from 'lucide-react';

interface LlmConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LlmConfig;
  onSave: (config: LlmConfig) => void;
}

export const LlmConfigModal: React.FC<LlmConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [currentConfig, setCurrentConfig] = useState<LlmConfig>(config);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    modelsFound?: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleProviderSelect = (provider: LlmProviderType) => {
    const defaultForProvider = DEFAULT_LLM_CONFIGS[provider] || DEFAULT_LLM_CONFIGS.ollama;
    setCurrentConfig({
      ...currentConfig,
      provider,
      endpointUrl: defaultForProvider.endpointUrl,
      modelName: defaultForProvider.modelName,
    });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testEndpointConnection(currentConfig);
      setTestResult(result);
      if (result.modelsFound && result.modelsFound.length > 0 && !result.modelsFound.includes(currentConfig.modelName)) {
        // Auto-suggest first discovered model if current is not in list
        setCurrentConfig((prev) => ({
          ...prev,
          modelName: result.modelsFound![0],
        }));
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndClose = () => {
    onSave(currentConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Server className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-white">
                Air-Gapped Local LLM Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Configure OpenAI-compatible local inference endpoints (Ollama, LM Studio, Unsloth)
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

        {/* Content */}
        <div className="space-y-4 text-xs">
          {/* Provider Preset Buttons */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
              Inference Provider / Daemon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'ollama', label: 'Ollama', icon: '🦙', port: ':11434' },
                { id: 'lmstudio', label: 'LM Studio', icon: '⚡', port: ':1234' },
                { id: 'unsloth', label: 'Unsloth/vLLM', icon: '🚀', port: ':8000' },
                { id: 'airgapped-deterministic', label: 'Rule Engine', icon: '🛡️', port: 'Air-Gapped' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderSelect(p.id as LlmProviderType)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition ${
                    currentConfig.provider === p.id
                      ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-md'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-lg mb-1">{p.icon}</span>
                  <span className="font-semibold text-xs">{p.label}</span>
                  <span className="font-mono text-[10px] text-slate-400">{p.port}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Endpoint URL (OpenAI-compatible /v1/chat/completions)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentConfig.provider === 'ollama' ? 'Default: http://localhost:11434/v1/chat/completions' : ''}
              </span>
            </div>
            <input
              type="text"
              value={currentConfig.endpointUrl}
              disabled={currentConfig.provider === 'airgapped-deterministic'}
              onChange={(e) =>
                setCurrentConfig({ ...currentConfig, endpointUrl: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Model Name & Temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={currentConfig.modelName}
                disabled={currentConfig.provider === 'airgapped-deterministic'}
                onChange={(e) =>
                  setCurrentConfig({ ...currentConfig, modelName: e.target.value })
                }
                placeholder="e.g. llama3.2:latest or mistral:7b"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Temperature
                </label>
                <span className="font-mono text-indigo-400 text-xs">
                  {currentConfig.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={currentConfig.temperature}
                onChange={(e) =>
                  setCurrentConfig({
                    ...currentConfig,
                    temperature: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-indigo-500 cursor-pointer mt-1.5"
              />
            </div>
          </div>

          {/* Timeout and Retries */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={Math.round(currentConfig.timeoutMs / 1000)}
                onChange={(e) =>
                  setCurrentConfig({
                    ...currentConfig,
                    timeoutMs: Math.max(5000, parseInt(e.target.value || '30', 10) * 1000),
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Retry Attempts
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={currentConfig.retryAttempts}
                onChange={(e) =>
                  setCurrentConfig({
                    ...currentConfig,
                    retryAttempts: Math.max(0, parseInt(e.target.value || '1', 10)),
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Test Ping Status Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Connection & Latency Diagnostic
              </span>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-2.5 py-1 text-xs rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-50 cursor-pointer"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {testResult && (
              <div
                className={`text-xs p-2.5 rounded-lg border flex items-start gap-2 ${
                  testResult.success
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                    : 'border-amber-500/40 bg-amber-950/30 text-amber-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.modelsFound && testResult.modelsFound.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="text-[10px] text-slate-400">Available:</span>
                      {testResult.modelsFound.slice(0, 5).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setCurrentConfig((prev) => ({ ...prev, modelName: m }))}
                          className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-indigo-900 transition"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                  {!testResult.success && currentConfig.provider === 'ollama' && (
                    <p className="mt-1.5 text-[10px] text-slate-400 font-mono">
                      Tip: Run: <code>OLLAMA_ORIGINS=&quot;*&quot; ollama serve</code> to enable browser requests.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Air-gapped safe (Zero 3rd-party telemetry)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
            >
              Apply Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

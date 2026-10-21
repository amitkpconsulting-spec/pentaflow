import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Image as ImageIcon,
  Film,
  FileJson,
  Copy,
  Check,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  FileText,
  FileDown,
} from 'lucide-react';
import {
  CustomDfdNode,
  CustomDfdEdge,
  DqLinterResult,
} from '../../types/dfd';
import {
  buildDfdSpec,
  captureCanvasToPng,
  captureCanvasToGif,
  downloadFile,
  DfdSpecOutput,
  exportDqDamaPdfDossierToFile,
  generateGovernanceAssessmentJsonReport,
  generateGovernanceAssessmentMarkdownReport,
  exportGovernanceAssessmentReport,
  DataGovernanceAssessmentReportJson,
} from '../../utils/dfdExport';
import { computeDamaDimensionsScorecard } from '../../utils/dqPdfDossier';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: CustomDfdNode[];
  edges: CustomDfdEdge[];
  linterResult: DqLinterResult;
  systemName: string;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  onFitView?: () => void;
  initialTab?: 'png' | 'gif' | 'json' | 'pdf';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  linterResult,
  systemName,
  canvasContainerRef,
  onFitView,
  initialTab = 'png',
}) => {
  const [activeTab, setActiveTab] = useState<'png' | 'gif' | 'json' | 'pdf'>(initialTab);

  // PNG Options
  const [pngResolution, setPngResolution] = useState<number>(2); // 2x default for high-res
  const [pngWatermark, setPngWatermark] = useState<boolean>(true);
  const [pngAutoFit, setPngAutoFit] = useState<boolean>(true);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [pngPreviewUrl, setPngPreviewUrl] = useState<string | null>(null);

  // GIF Options
  const [gifFrameCount, setGifFrameCount] = useState<number>(14);
  const [gifDelay, setGifDelay] = useState<number>(110);
  const [gifResolution, setGifResolution] = useState<number>(960);
  const [isExportingGif, setIsExportingGif] = useState<boolean>(false);
  const [gifProgress, setGifProgress] = useState<{ current: number; total: number; status: string }>({
    current: 0,
    total: 14,
    status: '',
  });
  const [gifResult, setGifResult] = useState<{ url: string; sizeBytes: number; blob: Blob } | null>(null);

  // JSON & Markdown Governance Report Options
  const [dfdSpec, setDfdSpec] = useState<DfdSpecOutput | null>(null);
  const [govJsonReport, setGovJsonReport] = useState<DataGovernanceAssessmentReportJson | null>(null);
  const [govMarkdownReport, setGovMarkdownReport] = useState<string>('');
  const [specSubTab, setSpecSubTab] = useState<'gov-md' | 'gov-json' | 'dfd-spec'>('gov-md');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // PDF DQ DAMA Dossier Options
  const [pdfAuditor, setPdfAuditor] = useState<string>('Air-Gapped DAMA Governance Engine');
  const [pdfClassification, setPdfClassification] = useState<string>('CONFIDENTIAL / RESTRICTED_PII');
  const [pdfEnvironment, setPdfEnvironment] = useState<string>('Air-Gapped Production VPC');
  const [pdfIncludeDiagram, setPdfIncludeDiagram] = useState<boolean>(true);
  const [pdfIncludeDimensions, setPdfIncludeDimensions] = useState<boolean>(true);
  const [pdfIncludeDiagnostics, setPdfIncludeDiagnostics] = useState<boolean>(true);
  const [pdfIncludeInventory, setPdfIncludeInventory] = useState<boolean>(true);
  const [pdfIncludeContracts, setPdfIncludeContracts] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfDownloadSuccess, setPdfDownloadSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Generate DFD-spec JSON and Data Governance Assessment Reports (Markdown & JSON)
      const spec = buildDfdSpec(nodes, edges, linterResult, systemName);
      setDfdSpec(spec);

      const reportOpts = {
        systemName,
        auditorName: pdfAuditor,
        classification: pdfClassification,
        environment: pdfEnvironment,
      };
      setGovJsonReport(generateGovernanceAssessmentJsonReport(nodes, edges, linterResult, reportOpts));
      setGovMarkdownReport(generateGovernanceAssessmentMarkdownReport(nodes, edges, linterResult, reportOpts));
    } else {
      // Clean up object URLs if any
      if (gifResult?.url) {
        URL.revokeObjectURL(gifResult.url);
        setGifResult(null);
      }
      setPngPreviewUrl(null);
    }
  }, [isOpen, initialTab, nodes, edges, linterResult, systemName, pdfAuditor, pdfClassification, pdfEnvironment]);

  if (!isOpen) return null;

  // Clean filename slug
  const fileSlug = (systemName || 'enterprise-dfd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Handle PNG Export
  const handleExportPng = async (triggerDownload = true) => {
    if (!canvasContainerRef.current) return;
    setIsExportingPng(true);

    try {
      if (pngAutoFit && onFitView) {
        onFitView();
        // Give time for layout transition to settle
        await new Promise((r) => setTimeout(r, 200));
      }

      const dataUrl = await captureCanvasToPng(canvasContainerRef.current, {
        pixelRatio: pngResolution,
        backgroundColor: '#020617',
        systemName,
        includeWatermark: pngWatermark,
        dqScore: linterResult.summary.overallHealthScore,
      });

      setPngPreviewUrl(dataUrl);

      if (triggerDownload) {
        const timestamp = new Date().toISOString().slice(0, 10);
        downloadFile(dataUrl, `${fileSlug}-canvas-${pngResolution}x-${timestamp}.png`, 'image/png');
      }
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  // Handle GIF Export
  const handleExportGif = async () => {
    if (!canvasContainerRef.current) return;
    setIsExportingGif(true);
    setGifProgress({ current: 0, total: gifFrameCount, status: 'Preparing animated flow capture...' });

    try {
      if (pngAutoFit && onFitView) {
        onFitView();
        await new Promise((r) => setTimeout(r, 200));
      }

      const result = await captureCanvasToGif(canvasContainerRef.current, {
        frameCount: gifFrameCount,
        delayMs: gifDelay,
        targetWidth: gifResolution,
        backgroundColor: '#020617',
        onProgress: (current, total, status) => {
          setGifProgress({ current, total, status });
        },
      });

      setGifResult({
        url: result.dataUrl,
        sizeBytes: result.sizeBytes,
        blob: result.blob,
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      downloadFile(result.blob, `${fileSlug}-animation-${timestamp}.gif`, 'image/gif');
    } catch (err) {
      console.error('GIF export failed:', err);
    } finally {
      setIsExportingGif(false);
    }
  };

  // Handle PDF DQ DAMA Dossier Export
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setPdfDownloadSuccess(false);

    try {
      if (pngAutoFit && onFitView) {
        onFitView();
        await new Promise((r) => setTimeout(r, 200));
      }

      await exportDqDamaPdfDossierToFile(nodes, edges, linterResult, canvasContainerRef.current, {
        systemName,
        auditorName: pdfAuditor,
        classification: pdfClassification,
        environment: pdfEnvironment,
        includeDiagram: pdfIncludeDiagram,
        includeDimensions: pdfIncludeDimensions,
        includeDiagnostics: pdfIncludeDiagnostics,
        includeInventory: pdfIncludeInventory,
        includeContracts: pdfIncludeContracts,
      });

      setPdfDownloadSuccess(true);
      setTimeout(() => setPdfDownloadSuccess(false), 5000);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle JSON / Markdown Download
  const handleDownloadJson = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (specSubTab === 'gov-md') {
      downloadFile(
        govMarkdownReport,
        `${fileSlug}-governance-assessment-${timestamp}.md`,
        'text/markdown;charset=utf-8'
      );
      return;
    }
    if (specSubTab === 'gov-json' && govJsonReport) {
      downloadFile(
        JSON.stringify(govJsonReport, null, 2),
        `${fileSlug}-governance-assessment-${timestamp}.json`,
        'application/json;charset=utf-8'
      );
      return;
    }
    if (!dfdSpec) return;
    const jsonStr = JSON.stringify(dfdSpec, null, 2);
    downloadFile(jsonStr, `${fileSlug}-dfd-spec-${timestamp}.json`, 'application/json');
  };

  // Handle Copy JSON / Markdown
  const handleCopyJson = () => {
    const contentToCopy =
      specSubTab === 'gov-md'
        ? govMarkdownReport
        : specSubTab === 'gov-json' && govJsonReport
        ? JSON.stringify(govJsonReport, null, 2)
        : dfdSpec
        ? JSON.stringify(dfdSpec, null, 2)
        : '';
    if (!contentToCopy) return;
    navigator.clipboard.writeText(contentToCopy);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  // Handle Download Both Markdown & JSON Governance Assessment Reports
  const handleDownloadBothGovernanceReports = () => {
    exportGovernanceAssessmentReport(nodes, edges, linterResult, 'both', {
      systemName,
      auditorName: pdfAuditor,
      classification: pdfClassification,
      environment: pdfEnvironment,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <span>Export Structured Descriptive Data Flow</span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {systemName}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Export 5-layer topology, data contracts, and canvas state to high-resolution PNG, animated GIF, or structured DFD-spec JSON.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('png')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'png'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>High-Res PNG</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800/40">
              2x/3x Crisp
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gif')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'gif'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Animated GIF</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-950 text-purple-300 border border-purple-800/40">
              Live Flows
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'pdf'
                ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>DQ DAMA Dossier (PDF)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-950 text-rose-300 border border-rose-800/40">
              Executive PDF
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'json'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>Markdown &amp; JSON Governance Report</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/40">
              .md + .json
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PNG EXPORT */}
          {activeTab === 'png' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Resolution Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Export Resolution
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Controls pixel sampling and rendering sharpness.
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { val: 1, label: '1x Web', sub: 'Standard' },
                      { val: 2, label: '2x HD', sub: 'Retina (Rec)' },
                      { val: 3, label: '3x 4K', sub: 'Ultra-HD' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setPngResolution(opt.val)}
                        className={`p-2 rounded-lg text-center border transition ${
                          pngResolution === opt.val
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold ring-1 ring-indigo-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-medium">{opt.label}</div>
                        <div className="text-[10px] opacity-75">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Style &amp; Framing Options
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Include Enterprise Banner</span>
                    <input
                      type="checkbox"
                      checked={pngWatermark}
                      onChange={(e) => setPngWatermark(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-800"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Auto-Fit Diagram Before Capture</span>
                    <input
                      type="checkbox"
                      checked={pngAutoFit}
                      onChange={(e) => setPngAutoFit(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-800"
                    />
                  </label>

                  <p className="text-[11px] text-slate-400 pt-1">
                    Banner adds flow title, timestamp, and DQ health score badge.
                  </p>
                </div>

                {/* Specs Summary Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Canvas Assets
                    </label>
                    <div className="space-y-1 text-xs text-slate-400 font-mono">
                      <div>• Nodes: {nodes.length}</div>
                      <div>• Data Contracts: {edges.length}</div>
                      <div>• DQ Health: {linterResult.summary.overallHealthScore}%</div>
                      <div>• Background: Rich Slate-950</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExportPng(true)}
                    disabled={isExportingPng}
                    className="mt-3 w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                  >
                    {isExportingPng ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Rendering High-Res PNG...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download High-Res PNG</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* PNG Preview section if generated */}
              {pngPreviewUrl && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      PNG Rendered Successfully
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const timestamp = new Date().toISOString().slice(0, 10);
                        downloadFile(pngPreviewUrl, `${fileSlug}-canvas-${pngResolution}x-${timestamp}.png`, 'image/png');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                    >
                      Download Again
                    </button>
                  </div>
                  <div className="max-h-64 overflow-hidden rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-center">
                    <img src={pngPreviewUrl} alt="Export Preview" className="max-h-64 object-contain" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GIF EXPORT */}
          {activeTab === 'gif' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-purple-300">Animated Multi-Frame Capture:</span>{' '}
                  This generates a real client-side GIF capturing the live data packet stream, glowing contract lines, and pulsing critical nodes across time frames.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Frame Count Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Animation Frames
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Higher frame count gives smoother packet flow loops.
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { val: 10, label: '10 Frames', sub: 'Fast / Light' },
                      { val: 14, label: '14 Frames', sub: 'Optimal' },
                      { val: 18, label: '18 Frames', sub: 'Ultra-Smooth' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setGifFrameCount(opt.val)}
                        className={`p-2 rounded-lg text-center border transition ${
                          gifFrameCount === opt.val
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-semibold ring-1 ring-purple-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-medium">{opt.label}</div>
                        <div className="text-[10px] opacity-75">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Width Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    GIF Dimensions
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Target maximum width for optimal file size and quality.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      { val: 800, label: '800px Width', sub: 'Compact (~400KB)' },
                      { val: 1024, label: '1024px Width', sub: 'Crisp (~850KB)' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setGifResolution(opt.val)}
                        className={`p-2 rounded-lg text-center border transition ${
                          gifResolution === opt.val
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-semibold ring-1 ring-purple-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-medium">{opt.label}</div>
                        <div className="text-[10px] opacity-75">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trigger Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      GIF Config
                    </label>
                    <div className="space-y-1 text-xs text-slate-400 font-mono">
                      <div>• Frame Rate: ~9 FPS (110ms)</div>
                      <div>• Palette: 256 Colors (PnnQuant)</div>
                      <div>• Repeat: Continuous Loop</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportGif}
                    disabled={isExportingGif}
                    className="mt-3 w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition cursor-pointer"
                  >
                    {isExportingGif ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generating GIF...</span>
                      </>
                    ) : (
                      <>
                        <Film className="w-4 h-4" />
                        <span>Generate &amp; Download GIF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress Bar while generating */}
              {isExportingGif && (
                <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-purple-300 font-medium">
                    <span>{gifProgress.status}</span>
                    <span>
                      {Math.round((gifProgress.current / gifProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-150"
                      style={{ width: `${(gifProgress.current / gifProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* GIF Preview */}
              {gifResult && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5 text-purple-400">
                      <CheckCircle2 className="w-4 h-4" />
                      GIF Generated ({Math.round(gifResult.sizeBytes / 1024)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const timestamp = new Date().toISOString().slice(0, 10);
                        downloadFile(gifResult.blob, `${fileSlug}-animation-${timestamp}.gif`, 'image/gif');
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 underline font-medium"
                    >
                      Download Again
                    </button>
                  </div>
                  <div className="max-h-72 overflow-hidden rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
                    <img src={gifResult.url} alt="Animated Flow Preview" className="max-h-68 object-contain rounded" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MARKDOWN & JSON DATA GOVERNANCE ASSESSMENT REPORT + DFD-SPEC */}
          {activeTab === 'json' && dfdSpec && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200">
                    Data Governance Assessment Report (Markdown &amp; JSON) + DFD-spec v2.1
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Exports @xyflow/react nodes, edges, and LinterSummary into formatted Markdown (.md) and structured JSON (.json) Data Governance Assessment Reports.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy {specSubTab === 'gov-md' ? 'Markdown' : 'JSON'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      Download {specSubTab === 'gov-md' ? '.md Report' : specSubTab === 'gov-json' ? '.json Report' : 'DFD-spec .json'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadBothGovernanceReports}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition cursor-pointer"
                    title="Download both the formatted Markdown (.md) and structured JSON (.json) Data Governance Assessment Reports"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Both (.md + .json)</span>
                  </button>
                </div>
              </div>

              {/* Format Switcher Bar */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSpecSubTab('gov-md')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition cursor-pointer ${
                    specSubTab === 'gov-md'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Markdown Governance Report (.md)
                </button>
                <button
                  type="button"
                  onClick={() => setSpecSubTab('gov-json')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition cursor-pointer ${
                    specSubTab === 'gov-json'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  JSON Governance Report (.json)
                </button>
                <button
                  type="button"
                  onClick={() => setSpecSubTab('dfd-spec')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition cursor-pointer ${
                    specSubTab === 'dfd-spec'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Raw DFD-spec v2.1 (.json)
                </button>
              </div>

              {/* Quick Spec Metrics Pill Row */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Active Format</div>
                  <div className="font-mono font-semibold text-emerald-400">
                    {specSubTab === 'gov-md'
                      ? 'Markdown (.md)'
                      : specSubTab === 'gov-json'
                      ? 'Governance JSON'
                      : 'dfd-spec/v2.1'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Topology Entities</div>
                  <div className="font-semibold text-slate-200">
                    {dfdSpec.topology.nodeCount} Nodes • {dfdSpec.topology.edgeCount} Flows
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Contract Mismatches</div>
                  <div className="font-semibold text-slate-200">
                    {linterResult.sourceChildMismatches?.length || 0} Findings
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Linter Summary</div>
                  <div className="font-semibold text-emerald-400">
                    {dfdSpec.metadata.healthScore}% Health Score
                  </div>
                </div>
              </div>

              {/* Live Document Preview Viewer */}
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-96 overflow-auto leading-relaxed scrollbar-thin whitespace-pre-wrap">
                  {specSubTab === 'gov-md'
                    ? govMarkdownReport
                    : specSubTab === 'gov-json' && govJsonReport
                    ? JSON.stringify(govJsonReport, null, 2)
                    : JSON.stringify(dfdSpec, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: DQ DAMA PDF DOSSIER EXPORT */}
          {activeTab === 'pdf' && (
            <div className="space-y-6">
              {/* Executive Overview Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/40 border border-rose-500/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">
                          DQ DAMA Report Dossier • Official PDF Export
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800/40">
                          DAMA-DMBOK Certified
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Compiles an audit-grade executive PDF dossier certifying the data quality, schema contracts, trust boundaries, and Dead-Letter Queue (DLQ) controls across your 5-Layer Structured Descriptive Data Flow architecture.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-rose-900/30 transition disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {isExportingPdf ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Compiling PDF Dossier...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4 h-4" />
                        <span>Export PDF Dossier</span>
                      </>
                    )}
                  </button>
                </div>

                {pdfDownloadSuccess && (
                  <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✓ DQ DAMA Report Dossier PDF generated and downloaded successfully!</span>
                  </div>
                )}
              </div>

              {/* Live Governance KPI Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">DAMA Health Score</div>
                  <div className={`text-xl font-bold font-mono mt-1 ${
                    linterResult.summary.overallHealthScore >= 80 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {linterResult.summary.overallHealthScore}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {linterResult.summary.overallHealthScore >= 80 ? 'High Assurance' : 'Action Required'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Critical Defects</div>
                  <div className={`text-xl font-bold font-mono mt-1 ${
                    linterResult.summary.criticalCount > 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {linterResult.summary.criticalCount}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {linterResult.summary.criticalCount === 0 ? 'Zero Blocking Breaches' : 'Ingestion / Security Gaps'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Warnings &amp; Gaps</div>
                  <div className={`text-xl font-bold font-mono mt-1 ${
                    linterResult.summary.warnCount > 0 ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {linterResult.summary.warnCount}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {linterResult.summary.warnCount === 0 ? 'Optimal Configuration' : 'SLA / DLQ Deficiencies'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Inspected</div>
                  <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                    {linterResult.summary.totalChecked}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {nodes.length} Nodes • {edges.length} Edges
                  </div>
                </div>
              </div>

              {/* DAMA 6 Dimensions Scorecard Preview Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    DAMA 6 Core Dimensions Audit Scorecard
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Calculated deterministically from flow graph topology
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {computeDamaDimensionsScorecard(nodes, edges, linterResult).map((sc) => (
                    <div
                      key={sc.dimension}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-xs text-slate-200">
                          {sc.dimension}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            sc.status === 'PASS'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                              : sc.status === 'WARN'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/40'
                              : 'bg-rose-950 text-rose-300 border border-rose-800/40'
                          }`}
                        >
                          {sc.status} ({sc.score}%)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {sc.checksSummary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dossier Metadata & Inclusion Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dossier Metadata Settings */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Dossier Metadata &amp; Attestation
                  </label>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Lead Auditor / Verification Authority
                    </label>
                    <input
                      type="text"
                      value={pdfAuditor}
                      onChange={(e) => setPdfAuditor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Security Classification
                      </label>
                      <select
                        value={pdfClassification}
                        onChange={(e) => setPdfClassification(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                      >
                        <option value="CONFIDENTIAL / RESTRICTED_PII">CONFIDENTIAL / RESTRICTED_PII</option>
                        <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                        <option value="INTERNAL RESTRICTED">INTERNAL RESTRICTED</option>
                        <option value="PUBLIC">PUBLIC</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Target Environment
                      </label>
                      <select
                        value={pdfEnvironment}
                        onChange={(e) => setPdfEnvironment(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                      >
                        <option value="Air-Gapped Production VPC">Air-Gapped Production VPC</option>
                        <option value="Classified DMZ Perimeter">Classified DMZ Perimeter</option>
                        <option value="On-Premises Bare-Metal">On-Premises Bare-Metal</option>
                        <option value="Hybrid Multi-Cloud VPC">Hybrid Multi-Cloud VPC</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dossier Section Inclusions */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Dossier Sections Included in PDF
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={pdfIncludeDiagram}
                      onChange={(e) => setPdfIncludeDiagram(e.target.checked)}
                      className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Figure 1: Embedded High-Res Architecture Topology Canvas Snapshot</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={pdfIncludeDimensions}
                      onChange={(e) => setPdfIncludeDimensions(e.target.checked)}
                      className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>DAMA 6 Core Data Quality Dimensions Assessment &amp; Scores</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={pdfIncludeDiagnostics}
                      onChange={(e) => setPdfIncludeDiagnostics(e.target.checked)}
                      className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Detailed Governance Findings &amp; Technical Remediation Register</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={pdfIncludeInventory}
                      onChange={(e) => setPdfIncludeInventory(e.target.checked)}
                      className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Enterprise 5-Layer Component Inventory &amp; DLQ Controls</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={pdfIncludeContracts}
                      onChange={(e) => setPdfIncludeContracts(e.target.checked)}
                      className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Data-in-Transit Contracts &amp; Transport Protocol Matrix</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Deterministic client-side processing • No canvas telemetry sent offsite</span>
            </div>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1 text-slate-400">
              <span>Advisory by</span>
              <a
                href="https://www.technoscope.co.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-0.5 hover:underline transition"
              >
                <span>Technoscope</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

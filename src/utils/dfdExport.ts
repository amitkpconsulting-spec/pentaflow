/**
 * Enterprise DFD Export Utilities
 * Converts React Flow Canvas State into:
 * 1. Structured JSON (DFD-spec v2.1)
 * 2. High-Resolution PNG (using html-to-image with multi-sampling & style preservation)
 * 3. Animated GIF (capturing animated packet flows, pulsating contracts, and linter states client-side via gifenc)
 */

import { toPng, toCanvas } from 'html-to-image';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { CustomDfdNode, CustomDfdEdge, DqLinterResult } from '../types/dfd';

export interface DfdSpecOutput {
  $schema: string;
  specVersion: string;
  framework: string;
  taxonomy: string;
  format: string;
  metadata: {
    systemName: string;
    assessmentId: string;
    exportedAt: string;
    environment: string;
    classificationLevel: string;
    complianceFrameworks: string[];
    healthScore: number;
    dqSummary: {
      overallHealthScore: number;
      criticalCount: number;
      warnCount: number;
      passCount: number;
    };
  };
  topology: {
    nodeCount: number;
    edgeCount: number;
    boundaryCount: number;
    zones: Array<{
      id: string;
      label: string;
      category: string;
      technology?: string;
      securityZone?: string;
      childNodeIds: string[];
    }>;
    sources: Array<{
      id: string;
      label: string;
      category: string;
      protocol?: string;
      classification?: string;
      technology?: string;
      sla?: string;
      dqRules?: Array<{ dimension: string; ruleDescription: string; status: string }>;
    }>;
    processes: Array<{
      id: string;
      label: string;
      processType?: string;
      technology?: string;
      criticality?: string;
      sla?: string;
      dataQualityScore?: number;
      hasQuarantineDLQ?: boolean;
      dqRules?: Array<{ dimension: string; ruleDescription: string; status: string }>;
    }>;
    dataStoresAndConsumers: Array<{
      id: string;
      label: string;
      category: string;
      technology?: string;
      classification?: string;
      sla?: string;
      dqRules?: Array<{ dimension: string; ruleDescription: string; status: string }>;
    }>;
    dataContracts: Array<{
      id: string;
      sourceNodeId: string;
      sourceLabel: string;
      targetNodeId: string;
      targetLabel: string;
      protocol: string;
      encryption: string;
      encryptionAtRestAndTransit: boolean;
      payloadFormat: string;
      schemaContract: string;
      timelinessSla: string;
      dqStatus: 'PASS' | 'WARN' | 'CRITICAL' | 'UNCHECKED';
      dqViolations: string[];
    }>;
  };
  governanceDiagnostics: DqLinterResult['diagnostics'];
  canvasLayout: {
    viewport?: { x: number; y: number; zoom: number };
    nodes: Array<{
      id: string;
      type?: string;
      position: { x: number; y: number };
      parentId?: string;
      label: string;
      category: string;
      data: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
      type?: string;
      animated?: boolean;
      data?: Record<string, unknown>;
    }>;
  };
}

/**
 * Generate Structured DFD-Spec JSON from current canvas state
 */
export function buildDfdSpec(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[],
  linterResult: DqLinterResult,
  systemName = 'Enterprise Data Flow'
): DfdSpecOutput {
  const nodeMap = new Map<string, CustomDfdNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const groups = nodes.filter((n) => n.type === 'group' || n.data?.category === 'Infra' || n.data?.category === 'Architecture');
  const sources = nodes.filter((n) => n.type === 'sourceNode' || n.data?.category === 'Source');
  const processes = nodes.filter((n) => n.type === 'operationNode' || n.data?.category === 'Operations');
  const consumers = nodes.filter((n) => n.type === 'childNode' || n.data?.category === 'Child');

  const zones = groups.map((g) => ({
    id: g.id,
    label: g.data?.label || g.id,
    category: g.data?.category || 'Infra',
    technology: g.data?.metadata?.technology,
    securityZone: g.data?.metadata?.securityZone || 'Protected Zone',
    childNodeIds: nodes.filter((n) => n.parentId === g.id).map((n) => n.id),
  }));

  const dataContracts = edges.map((e) => {
    const srcNode = nodeMap.get(e.source);
    const tgtNode = nodeMap.get(e.target);
    return {
      id: e.id,
      sourceNodeId: e.source,
      sourceLabel: srcNode?.data?.label || e.source,
      targetNodeId: e.target,
      targetLabel: tgtNode?.data?.label || e.target,
      protocol: e.data?.protocol || (typeof e.label === 'string' ? e.label : 'HTTPS / REST'),
      encryption: e.data?.encryption || (e.data?.encryptionAtRestAndTransit ? 'TLS 1.3 / AES-256' : 'None'),
      encryptionAtRestAndTransit: Boolean(e.data?.encryptionAtRestAndTransit),
      payloadFormat: e.data?.payloadFormat || 'JSON',
      schemaContract: e.data?.schemaContract || 'JSON Schema Draft-07',
      timelinessSla: e.data?.timelinessSla || 'Real-time (<500ms)',
      dqStatus: (e.data?.dqStatus as 'PASS' | 'WARN' | 'CRITICAL') || 'PASS',
      dqViolations: e.data?.dqViolations || [],
    };
  });

  return {
    $schema: 'https://raw.githubusercontent.com/dfd-spec/v2/schema.json',
    specVersion: '2.1.0',
    framework: 'Structured Descriptive Data Flow (SDDF)',
    taxonomy: 'Enterprise 5-Layer Architecture Taxonomy (Source, Operations, Child, Infra, Architecture)',
    format: 'enterprise-dfd-spec',
    metadata: {
      systemName,
      assessmentId: `DFD-${Date.now().toString(36).toUpperCase()}`,
      exportedAt: new Date().toISOString(),
      environment: 'air-gapped-production',
      classificationLevel: 'RESTRICTED_PII',
      complianceFrameworks: ['GDPR Art. 30', 'PCI-DSS v4.0', 'SOC2 Type II', 'DAMA-DMBOK2'],
      healthScore: linterResult.summary.overallHealthScore,
      dqSummary: {
        overallHealthScore: linterResult.summary.overallHealthScore,
        criticalCount: linterResult.summary.criticalCount,
        warnCount: linterResult.summary.warnCount,
        passCount: linterResult.summary.passCount,
      },
    },
    topology: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      boundaryCount: zones.length,
      zones,
      sources: sources.map((s) => ({
        id: s.id,
        label: s.data.label,
        category: s.data.category,
        protocol: s.data.metadata?.protocol,
        classification: s.data.metadata?.dataClassification,
        technology: s.data.metadata?.technology,
        sla: s.data.metadata?.sla,
        dqRules: s.data.dataQuality?.rules,
      })),
      processes: processes.map((p) => ({
        id: p.id,
        label: p.data.label,
        processType: p.data.metadata?.processType,
        technology: p.data.metadata?.technology,
        criticality: p.data.metadata?.criticality,
        sla: p.data.dataQuality?.slaLatency || p.data.metadata?.sla,
        dataQualityScore: p.data.dataQuality?.score,
        hasQuarantineDLQ: p.data.dataQuality?.hasQuarantineDLQ,
        dqRules: p.data.dataQuality?.rules,
      })),
      dataStoresAndConsumers: consumers.map((c) => ({
        id: c.id,
        label: c.data.label,
        category: c.data.category,
        technology: c.data.metadata?.technology,
        classification: c.data.metadata?.dataClassification,
        sla: c.data.metadata?.sla,
        dqRules: c.data.dataQuality?.rules,
      })),
      dataContracts,
    },
    governanceDiagnostics: linterResult.diagnostics,
    canvasLayout: {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        parentId: n.parentId,
        label: n.data.label,
        category: n.data.category,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === 'string' ? e.label : undefined,
        type: e.type,
        animated: e.animated,
        data: e.data,
      })),
    },
  };
}

/**
 * Triggers client-side download of a file
 */
export function downloadFile(content: Blob | string, filename: string, mimeType?: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Capture React Flow element as High-Resolution PNG using html-to-image
 */
export async function captureCanvasToPng(
  containerEl: HTMLElement,
  options: {
    pixelRatio?: number;
    backgroundColor?: string;
    systemName?: string;
    includeWatermark?: boolean;
    dqScore?: number;
  } = {}
): Promise<string> {
  const {
    pixelRatio = 2,
    backgroundColor = '#020617', // Rich Slate-950
    systemName = 'Enterprise DFD Flow',
    includeWatermark = true,
    dqScore,
  } = options;

  // Filter out floating UI panels/controls that shouldn't be in the clean exported image
  const filter = (node: HTMLElement) => {
    if (node?.classList) {
      if (
        node.classList.contains('react-flow__controls') ||
        node.classList.contains('react-flow__panel') ||
        node.classList.contains('canvas-export-overlay') ||
        node.classList.contains('no-export')
      ) {
        return false;
      }
    }
    return true;
  };

  // Convert element to raw PNG using html-to-image
  const rawDataUrl = await toPng(containerEl, {
    backgroundColor,
    pixelRatio,
    filter,
    cacheBust: true,
    style: {
      // Ensure all custom fonts and layout borders are preserved
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    },
  });

  if (!includeWatermark) {
    return rawDataUrl;
  }

  // Draw crisp professional enterprise watermark and metadata banner onto canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const bannerHeight = Math.round(56 * (pixelRatio / 2));
      canvas.width = img.width;
      canvas.height = img.height + bannerHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }

      // Draw diagram background and image
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw footer banner
      const bannerY = img.height;
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, bannerY, canvas.width, bannerHeight);

      // Top border line for banner
      ctx.strokeStyle = '#1e293b'; // slate-800
      ctx.lineWidth = 1 * pixelRatio;
      ctx.beginPath();
      ctx.moveTo(0, bannerY);
      ctx.lineTo(canvas.width, bannerY);
      ctx.stroke();

      // Title & System Name
      const padding = 20 * (pixelRatio / 2);
      ctx.font = `bold ${Math.round(14 * (pixelRatio / 2))}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`Structured Descriptive Data Flow • ${systemName}`, padding, bannerY + bannerHeight / 2 - 4 * (pixelRatio / 2));

      // Spec & Timestamp subtitle
      ctx.font = `${Math.round(11 * (pixelRatio / 2))}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = '#94a3b8';
      const timestampStr = `Enterprise 5-Layer Architecture Taxonomy • DFD-spec v2.1 • Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      ctx.fillText(timestampStr, padding, bannerY + bannerHeight / 2 + 12 * (pixelRatio / 2));

      // Right-aligned Data Quality Badge
      if (typeof dqScore === 'number') {
        const badgeText = `Data Quality Health: ${dqScore}%`;
        ctx.font = `bold ${Math.round(12 * (pixelRatio / 2))}px Inter, system-ui, sans-serif`;
        const textWidth = ctx.measureText(badgeText).width;
        const badgeX = canvas.width - padding - textWidth - 24 * (pixelRatio / 2);
        const badgeY = bannerY + (bannerHeight - 26 * (pixelRatio / 2)) / 2;

        ctx.fillStyle = dqScore >= 80 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
        ctx.strokeStyle = dqScore >= 80 ? '#10b981' : '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.roundRect
          ? ctx.roundRect(badgeX, badgeY, textWidth + 24 * (pixelRatio / 2), 26 * (pixelRatio / 2), 6 * (pixelRatio / 2))
          : ctx.rect(badgeX, badgeY, textWidth + 24 * (pixelRatio / 2), 26 * (pixelRatio / 2));
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = dqScore >= 80 ? '#34d399' : '#fbbf24';
        ctx.fillText(badgeText, badgeX + 12 * (pixelRatio / 2), badgeY + 17 * (pixelRatio / 2));
      }

      resolve(canvas.toDataURL('image/png', 1.0));
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

/**
 * Capture React Flow element as Animated GIF using html-to-image + gifenc
 * Smoothly captures multiple frames of animated data flows and encodes client-side
 */
export async function captureCanvasToGif(
  containerEl: HTMLElement,
  options: {
    frameCount?: number;
    delayMs?: number;
    targetWidth?: number;
    backgroundColor?: string;
    onProgress?: (frameIndex: number, totalFrames: number, status: string) => void;
  } = {}
): Promise<{ blob: Blob; dataUrl: string; sizeBytes: number }> {
  const {
    frameCount = 14,
    delayMs = 110, // ~9 FPS, smooth 1.5 second loop
    targetWidth = 1024,
    backgroundColor = '#020617',
    onProgress,
  } = options;

  const filter = (node: HTMLElement) => {
    if (node?.classList) {
      if (
        node.classList.contains('react-flow__controls') ||
        node.classList.contains('react-flow__panel') ||
        node.classList.contains('canvas-export-overlay') ||
        node.classList.contains('no-export')
      ) {
        return false;
      }
    }
    return true;
  };

  const capturedCanvases: HTMLCanvasElement[] = [];

  // Capture sequence of animation frames with slight time steps
  for (let i = 0; i < frameCount; i++) {
    onProgress?.(i + 1, frameCount, `Capturing animated flow (Frame ${i + 1}/${frameCount})...`);

    // Render snapshot
    const frameCanvas = await toCanvas(containerEl, {
      backgroundColor,
      pixelRatio: 1,
      filter,
      cacheBust: true,
      style: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      },
    });

    capturedCanvases.push(frameCanvas);

    // Pause between frames to let CSS stroke-dashoffset & SVG animations advance
    if (i < frameCount - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  onProgress?.(frameCount, frameCount, 'Quantizing palette & assembling GIF...');

  // Compute uniform target dimensions
  const sourceWidth = capturedCanvases[0].width;
  const sourceHeight = capturedCanvases[0].height;
  const aspect = sourceHeight / sourceWidth;
  const outWidth = Math.min(targetWidth, sourceWidth);
  const outHeight = Math.round(outWidth * aspect);

  const encoder = GIFEncoder();
  const offscreen = document.createElement('canvas');
  offscreen.width = outWidth;
  offscreen.height = outHeight;
  const ctx = offscreen.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Process and write each frame into the GIF stream
  for (let i = 0; i < capturedCanvases.length; i++) {
    onProgress?.(i + 1, frameCount, `Encoding GIF frame ${i + 1}/${frameCount}...`);

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, outWidth, outHeight);
    ctx.drawImage(capturedCanvases[i], 0, 0, outWidth, outHeight);

    const imgData = ctx.getImageData(0, 0, outWidth, outHeight);
    const rgba = imgData.data;

    // Fast 256-color palette quantization (PnnQuant)
    const palette = quantize(rgba, 256, { format: 'rgb565' });
    const indexed = applyPalette(rgba, palette, 'rgb565');

    encoder.writeFrame(indexed, outWidth, outHeight, {
      palette,
      delay: delayMs,
      repeat: 0, // Infinite loop
    });
  }

  encoder.finish();
  const gifBytes = encoder.bytes();
  const blob = new Blob([gifBytes as unknown as BlobPart], { type: 'image/gif' });
  const dataUrl = URL.createObjectURL(blob);

  onProgress?.(frameCount, frameCount, 'Done!');

  return {
    blob,
    dataUrl,
    sizeBytes: blob.size,
  };
}

export { generateDqDamaPdfDossier, computeDamaDimensionsScorecard } from './dqPdfDossier';
export type { DqDamaPdfOptions } from './dqPdfDossier';

/**
 * Capture React Flow canvas and export full DQ DAMA Governance PDF Report Dossier
 */
export async function exportDqDamaPdfDossierToFile(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[],
  linterResult: DqLinterResult,
  containerEl: HTMLElement | null,
  options: Partial<import('./dqPdfDossier').DqDamaPdfOptions> = {}
): Promise<{ filename: string }> {
  let diagramDataUrl: string | null = options.diagramDataUrl || null;

  if (containerEl && options.includeDiagram !== false && !diagramDataUrl) {
    try {
      diagramDataUrl = await captureCanvasToPng(containerEl, {
        pixelRatio: 1.5,
        backgroundColor: '#020617',
        includeWatermark: false,
      });
    } catch (err) {
      console.warn('Could not capture canvas snapshot for PDF dossier:', err);
    }
  }

  const { generateDqDamaPdfDossier } = await import('./dqPdfDossier');
  const systemName = options.systemName || 'Enterprise Architecture';
  const fileSlug = systemName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const doc = await generateDqDamaPdfDossier(nodes, edges, linterResult, {
    ...options,
    systemName,
    diagramDataUrl,
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${fileSlug}-dq-dama-dossier-${timestamp}.pdf`;
  doc.save(filename);

  return { filename };
}

export {
  generateGovernanceAssessmentJsonReport,
  generateGovernanceAssessmentMarkdownReport,
  exportGovernanceAssessmentReport,
  buildMermaidTopologyBlock,
} from './governanceReportExport';

export type {
  LinterSummaryInput,
  GovernanceReportOptions,
  DataGovernanceAssessmentReportJson,
} from './governanceReportExport';


/**
 * Structured Descriptive Data Flow Diagram (DFD) Canvas
 * Powered by @xyflow/react (React Flow v12+) with Dagre Auto-Layout,
 * Custom Nodes, Animated Protocol Edges, Flow Source Lineage Tracing, and Two-Way Form Synchronization.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Connection,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  CustomDfdNode,
  CustomDfdEdge,
  AssessmentInputPayload,
  SourceChildContractMismatch,
  DfdNodeType,
} from '../../types/dfd';
import { SourceNode } from '../nodes/SourceNode';
import { BusinessProcessNode } from '../nodes/BusinessProcessNode';
import { ChildNode } from '../nodes/ChildNode';
import { InfraGroupNode } from '../nodes/InfraGroupNode';
import { DataContractEdge } from '../edges/DataContractEdge';
import { getLayoutedElements } from '../../utils/dagreLayout';
import { validateEnterpriseDfd } from '../../utils/dfdValidator';
import {
  runDeterministicDqLinter,
  executeSourceAction,
  actUponSourceMismatch,
  remediateAllSourceMismatches,
  SourceDirectActionType,
} from '../../utils/dqGraphLinter';
import { NodeDetailsDrawer } from '../inspector/NodeDetailsDrawer';
import { ArchitectureValidationPanel } from '../validation/ArchitectureValidationPanel';
import { AddNodeModal } from './AddNodeModal';
import { ExportModal } from './ExportModal';
import {
  buildDfdSpec,
  captureCanvasToPng,
  downloadFile,
} from '../../utils/dfdExport';
import {
  evaluateGraphNistSummary,
  evaluateNodeNistOverlay,
} from '../../utils/nistOscalEngine';

import {
  LayoutGrid,
  Search,
  Download,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Code2,
  FileText,
  Check,
  FolderSync,
  Image as ImageIcon,
  Film,
  FileJson,
  ChevronDown,
  Database,
  GitBranch,
  Crosshair,
  Wrench,
  X,
  Lock,
  Activity,
} from 'lucide-react';

interface StructuredDfdCanvasProps {
  initialNodes: CustomDfdNode[];
  initialEdges: CustomDfdEdge[];
  onSyncToForm?: (extractedPayload: Partial<AssessmentInputPayload>) => void;
  systemName?: string;
  focusedSourceLabel?: string | null;
  onClearFocusedSource?: () => void;
  tracedSourceLabel?: string | null;
  onChangeTracedSource?: (sourceLabel: string | null) => void;
  pendingSourceAction?: {
    sourceLabel?: string;
    action: SourceDirectActionType | 'remediate-all';
  } | null;
  onClearPendingSourceAction?: () => void;
  onGraphStateChange?: (nodes: CustomDfdNode[], edges: CustomDfdEdge[]) => void;
}

const nodeTypes = {
  sourceNode: SourceNode,
  operationNode: BusinessProcessNode,
  childNode: ChildNode,
  group: InfraGroupNode,
  infraGroup: InfraGroupNode,
};

const edgeTypes = {
  dataContractEdge: DataContractEdge,
  smoothstep: DataContractEdge,
  default: DataContractEdge,
  custom: DataContractEdge,
};

const CanvasInner: React.FC<StructuredDfdCanvasProps> = ({
  initialNodes,
  initialEdges,
  onSyncToForm,
  systemName,
  focusedSourceLabel,
  onClearFocusedSource,
  tracedSourceLabel,
  onChangeTracedSource,
  pendingSourceAction,
  onClearPendingSourceAction,
  onGraphStateChange,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowInstance = useReactFlow();

  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [addNodeInitialType, setAddNodeInitialType] = useState<DfdNodeType>('sourceNode');
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [showSourcesMenu, setShowSourcesMenu] = useState(false);
  const [tracedSourceId, setTracedSourceId] = useState<string | null>(null);
  const [showNistOverlay, setShowNistOverlay] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Canvas Reference & Export Studio States
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportModalTab, setExportModalTab] = useState<'png' | 'gif' | 'json' | 'pdf'>('png');
  const [isQuickExportingPng, setIsQuickExportingPng] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Sync external changes and apply deterministic DQ linter
  useEffect(() => {
    const linted = runDeterministicDqLinter(initialNodes, initialEdges);
    setNodes(linted.nodes);
    setEdges(linted.edges);
    setTracedSourceId(null);
    onChangeTracedSource?.(null);
    const timer = setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
    }, 150);
    return () => clearTimeout(timer);
  }, [initialNodes, initialEdges, reactFlowInstance, setNodes, setEdges]);

  // Notify parent when internal graph state changes
  useEffect(() => {
    onGraphStateChange?.(nodes, edges);
  }, [nodes, edges, onGraphStateChange]);

  // Sync tracedSourceLabel prop from Assessment Form into tracedSourceId
  useEffect(() => {
    if (tracedSourceLabel === undefined) return;
    if (!tracedSourceLabel) {
      setTracedSourceId(null);
      return;
    }
    const match = nodes.find(
      (n) =>
        (n.type === 'sourceNode' || n.data.category === 'Source') &&
        n.data.label.toLowerCase() === tracedSourceLabel.toLowerCase()
    );
    if (match) {
      setTracedSourceId(match.id);
    }
  }, [tracedSourceLabel, nodes]);

  // Handle new edge connection with instant DQ linter evaluation
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: CustomDfdEdge = {
        ...params,
        id: `e-${params.source}-${params.target}-${Date.now().toString().slice(-4)}`,
        type: 'dataContractEdge',
        animated: true,
        label: 'HTTPS / REST',
        data: {
          protocol: 'HTTPS / REST',
          encryption: 'TLS 1.3',
          payloadFormat: 'JSON',
          schemaContract: 'JSON Schema Draft-07',
          timelinessSla: 'Real-time (<500ms)',
          encryptionAtRestAndTransit: true,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#10b981',
        },
      };

      const currentEdges = [...edges, newEdge];
      const linted = runDeterministicDqLinter(nodes, currentEdges);
      setNodes(linted.nodes);
      setEdges(linted.edges);
    },
    [edges, nodes, setEdges, setNodes]
  );

  // Auto-layout elements using Dagre engine with DQ linter run
  const handleAutoLayout = useCallback(
    (direction: 'LR' | 'TB') => {
      setLayoutDirection(direction);
      const layouted = getLayoutedElements(nodes, edges, { direction });
      const linted = runDeterministicDqLinter(layouted.nodes, layouted.edges);
      setNodes([...linted.nodes]);
      setEdges([...linted.edges]);
      window.requestAnimationFrame(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 500 });
      });
    },
    [nodes, edges, reactFlowInstance, setNodes, setEdges]
  );

  // Find selected node and edge
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) || null,
    [edges, selectedEdgeId]
  );

  const groupNodes = useMemo(() => nodes.filter((n) => n.type === 'group'), [nodes]);
  const sourceNodes = useMemo(
    () => nodes.filter((n) => n.type === 'sourceNode' || n.data.category === 'Source'),
    [nodes]
  );

  // Real-time Architecture Validation Summary
  const validationSummary = useMemo(() => {
    return validateEnterpriseDfd(nodes, edges);
  }, [nodes, edges]);

  // Real-time Data Quality & Contract Governance Linter
  const dqLinterResult = useMemo(() => {
    return runDeterministicDqLinter(nodes, edges);
  }, [nodes, edges]);

  // Real-time NIST SP 800-53 Rev 5 (OSCAL v1.4.0) Control Coverage Summary & Node Severity Breakdown
  const nistSummary = useMemo(() => {
    return evaluateGraphNistSummary(nodes, edges);
  }, [nodes, edges]);

  const nistNodeCounts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let compliant = 0;
    nodes.forEach((n) => {
      const ev = evaluateNodeNistOverlay(n.data);
      if (ev.severity === 'CRITICAL') critical++;
      else if (ev.severity === 'WARNING') warning++;
      else compliant++;
    });
    return { critical, warning, compliant };
  }, [nodes]);

  // Node selection handlers
  const onNodeClick = useCallback((_: React.MouseEvent, node: CustomDfdNode) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: CustomDfdEdge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setShowSourcesMenu(false);
    setShowExportMenu(false);
  }, []);

  // Update node properties from inspector
  const handleUpdateNode = useCallback(
    (updated: CustomDfdNode) => {
      const nextNodes = nodes.map((n) => (n.id === updated.id ? updated : n));
      const linted = runDeterministicDqLinter(nextNodes, edges);
      setNodes([...linted.nodes]);
      setEdges([...linted.edges]);
    },
    [nodes, edges, setNodes, setEdges]
  );

  // Update edge properties from inspector
  const handleUpdateEdge = useCallback(
    (updated: CustomDfdEdge) => {
      const nextEdges = edges.map((e) => (e.id === updated.id ? updated : e));
      const linted = runDeterministicDqLinter(nodes, nextEdges);
      setNodes([...linted.nodes]);
      setEdges([...linted.edges]);
    },
    [nodes, edges, setNodes, setEdges]
  );

  // Delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(null);
      if (tracedSourceId === nodeId) {
        setTracedSourceId(null);
        onChangeTracedSource?.(null);
      }
    },
    [setNodes, setEdges, tracedSourceId, onChangeTracedSource]
  );

  // Delete edge
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setSelectedEdgeId(null);
    },
    [setEdges]
  );

  // Add new node from modal (with optional auto-connect & layout for new Flow Sources)
  const handleAddNode = useCallback(
    (newNode: CustomDfdNode, autoConnectSource?: boolean) => {
      let updatedNodes = [...nodes, newNode];
      let updatedEdges = [...edges];

      if (
        (newNode.type === 'sourceNode' || newNode.data.category === 'Source') &&
        autoConnectSource
      ) {
        const targetNode =
          nodes.find((n) => n.type === 'operationNode' || n.data.category === 'Operations') ||
          nodes.find((n) => n.type === 'childNode' || n.data.category === 'Child');

        if (targetNode) {
          const protocol = newNode.data.metadata?.protocol || 'mTLS 1.3 / REST';
          const sla = newNode.data.metadata?.sla || 'Real-time (<150ms)';
          const newEdge: CustomDfdEdge = {
            id: `e-${newNode.id}-${targetNode.id}-${Date.now().toString().slice(-4)}`,
            source: newNode.id,
            target: targetNode.id,
            type: 'dataContractEdge',
            animated: true,
            label: protocol,
            data: {
              protocol,
              encryption: 'mTLS',
              payloadFormat: protocol.toLowerCase().includes('avro') ? 'Avro' : 'JSON',
              schemaContract: 'Avro v2.1 / JSON Schema',
              timelinessSla: sla,
              encryptionAtRestAndTransit: true,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#10b981',
            },
          };
          updatedEdges.push(newEdge);
        }

        const layouted = getLayoutedElements(updatedNodes, updatedEdges, {
          direction: layoutDirection,
        });
        const linted = runDeterministicDqLinter(layouted.nodes, layouted.edges);
        setNodes([...linted.nodes]);
        setEdges([...linted.edges]);
        setSelectedNodeId(newNode.id);
        setCopiedNotification(`✓ Added Flow Source "${newNode.data.label}" and wired pipeline contract`);
        setTimeout(() => setCopiedNotification(null), 3500);
        return;
      }

      const linted = runDeterministicDqLinter(updatedNodes, updatedEdges);
      setNodes([...linted.nodes]);
      setEdges([...linted.edges]);
      setSelectedNodeId(newNode.id);
    },
    [nodes, edges, layoutDirection, setNodes, setEdges]
  );

  // Focus & select a Source node when triggered from the Assessment Form
  useEffect(() => {
    if (!focusedSourceLabel) return;
    const match = nodes.find(
      (n) =>
        (n.type === 'sourceNode' || n.data.category === 'Source') &&
        n.data.label.toLowerCase() === focusedSourceLabel.toLowerCase()
    );
    if (match) {
      setSelectedNodeId(match.id);
      setSelectedEdgeId(null);
      reactFlowInstance.fitView({ nodes: [{ id: match.id }], padding: 0.5, duration: 400 });
      setCopiedNotification(`Focused Flow Source "${match.data.label}"`);
      setTimeout(() => setCopiedNotification(null), 3000);
    }
    onClearFocusedSource?.();
  }, [focusedSourceLabel, nodes, reactFlowInstance, onClearFocusedSource]);

  // Execute a direct governance / topology action on a Source node
  const handleExecuteSourceAction = useCallback(
    (sourceNodeId: string, action: SourceDirectActionType) => {
      const res = executeSourceAction(nodes, edges, sourceNodeId, action);
      const layouted = getLayoutedElements(res.nodes, res.edges, { direction: layoutDirection });
      const linted = runDeterministicDqLinter(layouted.nodes, layouted.edges);
      setNodes([...linted.nodes]);
      setEdges([...linted.edges]);
      setCopiedNotification(`✓ ${res.actionSummary}`);
      setTimeout(() => setCopiedNotification(null), 3500);
    },
    [nodes, edges, layoutDirection, setNodes, setEdges]
  );

  // Act upon a specific Source-Child Contract Mismatch
  const handleActUponMismatch = useCallback(
    (mismatch: SourceChildContractMismatch) => {
      const res = actUponSourceMismatch(nodes, edges, mismatch);
      const layouted = getLayoutedElements(res.nodes, res.edges, { direction: layoutDirection });
      const linted = runDeterministicDqLinter(layouted.nodes, layouted.edges);
      setNodes([...linted.nodes]);
      setEdges([...linted.edges]);
      setCopiedNotification(`✓ ${res.actionSummary}`);
      setTimeout(() => setCopiedNotification(null), 3500);
    },
    [nodes, edges, layoutDirection, setNodes, setEdges]
  );

  // Remediate all active Source contract mismatches in one pass
  const handleRemediateAllSources = useCallback(() => {
    const res = remediateAllSourceMismatches(nodes, edges);
    const layouted = getLayoutedElements(res.nodes, res.edges, { direction: layoutDirection });
    const linted = runDeterministicDqLinter(layouted.nodes, layouted.edges);
    setNodes([...linted.nodes]);
    setEdges([...linted.edges]);
    setCopiedNotification(
      `✓ Healed all Flow Sources: Remediated ${res.remediatedCount} contract violation(s) (DQ: ${linted.summary.overallHealthScore}%)`
    );
    setTimeout(() => setCopiedNotification(null), 4000);
  }, [nodes, edges, layoutDirection, setNodes, setEdges]);

  // Handle pendingSourceAction dispatched from Assessment Form
  useEffect(() => {
    if (!pendingSourceAction) return;
    if (pendingSourceAction.action === 'remediate-all') {
      handleRemediateAllSources();
    } else if (pendingSourceAction.sourceLabel) {
      const match = nodes.find(
        (n) =>
          (n.type === 'sourceNode' || n.data.category === 'Source') &&
          n.data.label.toLowerCase() === pendingSourceAction.sourceLabel!.toLowerCase()
      );
      if (match) {
        handleExecuteSourceAction(match.id, pendingSourceAction.action);
      }
    }
    onClearPendingSourceAction?.();
  }, [
    pendingSourceAction,
    nodes,
    handleRemediateAllSources,
    handleExecuteSourceAction,
    onClearPendingSourceAction,
  ]);

  // Listen to custom DOM event 'pentaflow:source-action' from SourceNode cards on the canvas
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{
        sourceNodeId: string;
        sourceLabel: string;
        action: SourceDirectActionType | 'trace-lineage';
      }>;
      const { sourceNodeId, sourceLabel, action } = customEvent.detail || {};
      if (!sourceNodeId) return;

      if (action === 'trace-lineage') {
        setTracedSourceId((prev) => {
          const next = prev === sourceNodeId ? null : sourceNodeId;
          onChangeTracedSource?.(next ? sourceLabel : null);
          if (next) {
            setCopiedNotification(`Tracing downstream lineage from Flow Source "${sourceLabel}"`);
            setTimeout(() => setCopiedNotification(null), 3000);
          }
          return next;
        });
      } else {
        handleExecuteSourceAction(sourceNodeId, action);
      }
    };

    window.addEventListener('pentaflow:source-action', handler);
    return () => window.removeEventListener('pentaflow:source-action', handler);
  }, [handleExecuteSourceAction, onChangeTracedSource]);

  // Compute BFS downstream lineage for tracedSourceId
  const lineageTrace = useMemo(() => {
    if (!tracedSourceId) return null;
    const sourceNode = nodes.find((n) => n.id === tracedSourceId);
    if (!sourceNode) return null;

    const visitedNodes = new Set<string>([tracedSourceId]);
    const visitedEdges = new Set<string>();
    const queue: string[] = [tracedSourceId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      edges.forEach((edge) => {
        if (edge.source === curr) {
          visitedEdges.add(edge.id);
          if (!visitedNodes.has(edge.target)) {
            visitedNodes.add(edge.target);
            queue.push(edge.target);
          }
        }
      });
    }

    // Also include parent trust-zone groups of any visited node so boundaries stay visible
    nodes.forEach((n) => {
      if (visitedNodes.has(n.id) && n.parentId) {
        visitedNodes.add(n.parentId);
      }
    });

    const downstreamOps = Array.from(visitedNodes).filter((nid) => {
      const n = nodes.find((x) => x.id === nid);
      return n && (n.type === 'operationNode' || n.data.category === 'Operations');
    }).length;

    const downstreamSinks = Array.from(visitedNodes).filter((nid) => {
      const n = nodes.find((x) => x.id === nid);
      return n && (n.type === 'childNode' || n.data.category === 'Child');
    }).length;

    return {
      sourceNode,
      visitedNodes,
      visitedEdges,
      downstreamOps,
      downstreamSinks,
      edgeCount: visitedEdges.size,
    };
  }, [tracedSourceId, nodes, edges]);

  // Two-Way Sync Back to Assessment Form
  const handleSyncBackToAssessment = useCallback(() => {
    const extractedSources: string[] = [];
    const extractedChildren: string[] = [];
    const extractedOperations: string[] = [];
    const extractedInfra: string[] = [];
    const extractedArchitecture: string[] = [];

    nodes.forEach((n) => {
      const label = n.data.label;
      if (!label) return;

      if (n.type === 'sourceNode' || n.data.category === 'Source') {
        if (!extractedSources.includes(label)) extractedSources.push(label);
      } else if (n.type === 'childNode' || n.data.category === 'Child') {
        if (!extractedChildren.includes(label)) extractedChildren.push(label);
      } else if (n.type === 'operationNode' || n.data.category === 'Operations') {
        if (!extractedOperations.includes(label)) extractedOperations.push(label);
      } else if (n.type === 'group' || n.data.category === 'Infra' || n.data.category === 'Architecture') {
        if (n.data.category === 'Architecture') {
          if (!extractedArchitecture.includes(label)) extractedArchitecture.push(label);
        } else {
          if (!extractedInfra.includes(label)) extractedInfra.push(label);
        }
      }
    });

    onSyncToForm?.({
      source: extractedSources,
      child: extractedChildren,
      operations: extractedOperations,
      infra: extractedInfra,
      architecture: extractedArchitecture,
    });

    setCopiedNotification('Canvas state synced back to Assessment Form!');
    setTimeout(() => setCopiedNotification(null), 3000);
  }, [nodes, onSyncToForm]);

  // Export Diagram as Structured DFD-Spec JSON (v2.1)
  const handleExportJson = useCallback(() => {
    const spec = buildDfdSpec(nodes, edges, dqLinterResult, systemName || 'Enterprise DFD');
    const slug = (systemName || 'enterprise-dfd').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(JSON.stringify(spec, null, 2), `${slug}-dfd-spec-${timestamp}.json`, 'application/json');
    setCopiedNotification('✓ Structured DFD-spec JSON exported!');
    setTimeout(() => setCopiedNotification(null), 3000);
  }, [nodes, edges, dqLinterResult, systemName]);

  // Quick High-Res PNG Export (2x HD)
  const handleQuickExportPng = useCallback(async () => {
    if (!canvasWrapperRef.current) return;
    setIsQuickExportingPng(true);
    setCopiedNotification('Rendering High-Res PNG (2x HD)...');
    try {
      reactFlowInstance.fitView({ padding: 0.2, duration: 200 });
      await new Promise((r) => setTimeout(r, 220));

      const dataUrl = await captureCanvasToPng(canvasWrapperRef.current, {
        pixelRatio: 2,
        backgroundColor: '#020617',
        systemName: systemName || 'Enterprise DFD Flow',
        includeWatermark: true,
        dqScore: dqLinterResult.summary.overallHealthScore,
      });

      const slug = (systemName || 'enterprise-dfd').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadFile(dataUrl, `${slug}-canvas-2x-${timestamp}.png`, 'image/png');
      setCopiedNotification('✓ High-Res PNG downloaded successfully!');
    } catch (err) {
      console.error('PNG export error:', err);
      setCopiedNotification('Failed to generate PNG');
    } finally {
      setIsQuickExportingPng(false);
      setTimeout(() => setCopiedNotification(null), 3500);
    }
  }, [reactFlowInstance, systemName, dqLinterResult]);

  // Open Export Studio with chosen initial tab
  const handleOpenExportStudio = useCallback((tab: 'png' | 'gif' | 'json' | 'pdf') => {
    setExportModalTab(tab);
    setIsExportModalOpen(true);
    setShowExportMenu(false);
  }, []);

  // Export as Mermaid.js Diagram
  const handleExportMermaid = useCallback(() => {
    const lines: string[] = ['flowchart LR'];

    const groups = nodes.filter((n) => n.type === 'group');
    groups.forEach((grp) => {
      const sanitizedId = grp.id.replace(/-/g, '_');
      lines.push(`  subgraph ${sanitizedId} ["${grp.data.label}"]`);
      const children = nodes.filter((n) => n.parentId === grp.id);
      children.forEach((c) => {
        const cId = c.id.replace(/-/g, '_');
        lines.push(`    ${cId}["${c.data.label}"]`);
      });
      lines.push('  end');
    });

    nodes
      .filter((n) => n.type !== 'group' && !n.parentId)
      .forEach((n) => {
        const nId = n.id.replace(/-/g, '_');
        lines.push(`  ${nId}["${n.data.label}"]`);
      });

    edges.forEach((e) => {
      const sId = e.source.replace(/-/g, '_');
      const tId = e.target.replace(/-/g, '_');
      const label = e.label ? `|${e.label}|` : '';
      lines.push(`  ${sId} -->${label} ${tId}`);
    });

    const mermaidText = lines.join('\n');
    navigator.clipboard.writeText(mermaidText);
    setCopiedNotification('Mermaid diagram copied to clipboard!');
    setTimeout(() => setCopiedNotification(null), 3000);
  }, [nodes, edges]);

  // Filtered nodes when search query or Source Lineage Trace is active
  const displayNodes = useMemo(() => {
    return nodes.map((n) => {
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        matchesSearch =
          n.data.label.toLowerCase().includes(q) ||
          n.data.category.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q);
      }

      const matchesLineage = lineageTrace ? lineageTrace.visitedNodes.has(n.id) : true;
      const isVisible = matchesSearch && matchesLineage;

      return {
        ...n,
        data: {
          ...n.data,
          showNistOverlay,
        },
        style: {
          ...n.style,
          opacity: isVisible ? 1 : 0.2,
          transition: 'opacity 0.25s ease',
        },
      };
    });
  }, [nodes, searchQuery, lineageTrace, showNistOverlay]);

  // Filtered edges when Source Lineage Trace is active
  const displayEdges = useMemo(() => {
    if (!lineageTrace) return edges;
    return edges.map((e) => {
      const inTrace = lineageTrace.visitedEdges.has(e.id);
      return {
        ...e,
        style: {
          ...e.style,
          opacity: inTrace ? 1 : 0.15,
        },
      };
    });
  }, [edges, lineageTrace]);

  // MiniMap node color mapper (uses Critical/Warning/Compliant severity palette when NIST Overlay is ON)
  const getMiniMapNodeColor = (node: CustomDfdNode) => {
    if (showNistOverlay) {
      return evaluateNodeNistOverlay(node.data).statusHex;
    }
    switch (node.type) {
      case 'sourceNode':
        return '#6366f1'; // Indigo
      case 'operationNode':
        return '#f59e0b'; // Amber
      case 'childNode':
        return '#10b981'; // Emerald
      case 'group':
        return '#8b5cf6'; // Purple
      default:
        return '#64748b'; // Slate
    }
  };

  return (
    <div ref={canvasWrapperRef} className="relative h-full w-full bg-slate-950 overflow-hidden select-none">
      {/* Top Floating Canvas Toolbar */}
      <div className="no-export absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-md">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter flow nodes..."
            className="w-32 sm:w-36 rounded-lg bg-slate-950 border border-slate-800 pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Flow Sources Interactive Hub Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowSourcesMenu((prev) => !prev);
              setShowExportMenu(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              lineageTrace
                ? 'border-indigo-400 bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200'
            }`}
            title="Flow Sources Hub: Inspect, Trace Lineage, or Add Flow Sources"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sources ({sourceNodes.length})</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {showSourcesMenu && (
            <div
              className="absolute left-0 top-full mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl p-3 z-50 text-xs animate-in fade-in slide-in-from-top-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <div>
                  <span className="font-bold text-white text-xs block">
                    Flow Sources &amp; Lineage Hub
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Click any origin to focus or trace downstream flow
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddNodeInitialType('sourceNode');
                    setIsAddNodeOpen(true);
                    setShowSourcesMenu(false);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Source</span>
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                {sourceNodes.map((src) => {
                  const dqScore = src.data.dataQuality?.score ?? 100;
                  const isCrit = src.data.dataQuality?.rules?.some((r) => r.status === 'CRITICAL');
                  const isWarn = src.data.dataQuality?.rules?.some((r) => r.status === 'WARN');
                  const isTraced = tracedSourceId === src.id;

                  return (
                    <div
                      key={src.id}
                      className={`p-2 rounded-xl border transition flex items-center justify-between gap-2 ${
                        isTraced
                          ? 'border-indigo-400 bg-indigo-950/50'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-100 truncate text-[11px]">
                            {src.data.label}
                          </span>
                          <span
                            className={`text-[9.5px] font-mono tabular-nums font-bold ${
                              isCrit
                                ? 'text-rose-400'
                                : isWarn
                                ? 'text-amber-300'
                                : 'text-emerald-400'
                            }`}
                          >
                            {dqScore}%
                          </span>
                        </div>
                        <div className="text-[9.5px] font-mono text-slate-400 truncate">
                          {src.data.metadata?.protocol || 'HTTPS / REST'} ·{' '}
                          {src.data.metadata?.dataClassification || 'INTERNAL'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNodeId(src.id);
                            setSelectedEdgeId(null);
                            reactFlowInstance.fitView({
                              nodes: [{ id: src.id }],
                              padding: 0.5,
                              duration: 400,
                            });
                            setShowSourcesMenu(false);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Focus & Inspect Flow Source"
                        >
                          <Crosshair className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const next = isTraced ? null : src.id;
                            setTracedSourceId(next);
                            onChangeTracedSource?.(next ? src.data.label : null);
                            setShowSourcesMenu(false);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition cursor-pointer ${
                            isTraced
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white'
                          }`}
                          title="Trace downstream lineage from this Flow Source"
                        >
                          <GitBranch className="w-3 h-3" />
                          <span>{isTraced ? 'Tracing' : 'Trace'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(dqLinterResult.summary.sourceChildContractViolationCount ?? 0) > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-rose-300 font-medium">
                    {dqLinterResult.summary.sourceChildContractViolationCount} contract violation(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleRemediateAllSources();
                      setShowSourcesMenu(false);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold transition cursor-pointer"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Heal All Sources</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto-Layout Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleAutoLayout('LR')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              layoutDirection === 'LR'
                ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-300'
                : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-700'
            }`}
            title="Auto Layout Left to Right"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            <span>LR</span>
          </button>

          <button
            type="button"
            onClick={() => handleAutoLayout('TB')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              layoutDirection === 'TB'
                ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-300'
                : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-700'
            }`}
            title="Auto Layout Top to Bottom"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400 rotate-90" />
            <span>TB</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Quick Add Node */}
        <button
          type="button"
          onClick={() => {
            setAddNodeInitialType('sourceNode');
            setIsAddNodeOpen(true);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          title="Add Flow Source or Architecture Node to Canvas"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Add Node</span>
        </button>

        {/* Two-Way Sync to Form */}
        <button
          type="button"
          onClick={handleSyncBackToAssessment}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 transition cursor-pointer"
          title="Extract changes from canvas and update assessment form"
        >
          <FolderSync className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">Sync to Form</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        {/* Data Quality & Governance Linter Button */}
        <button
          type="button"
          onClick={() => setIsValidationOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
            dqLinterResult.summary.criticalCount > 0
              ? 'border-rose-500/80 bg-rose-950/50 text-rose-300 hover:bg-rose-900/60'
              : dqLinterResult.summary.warnCount > 0
              ? 'border-amber-500/70 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50'
              : 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
          }`}
          title="Data Quality & Governance Linter (DAMA 6 Dimensions)"
        >
          {dqLinterResult.summary.criticalCount > 0 ? (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          ) : dqLinterResult.summary.warnCount > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="font-mono tabular-nums">
            DQ: {dqLinterResult.summary.overallHealthScore}%
            {dqLinterResult.summary.criticalCount > 0 && ` · ${dqLinterResult.summary.criticalCount} Crit`}
            {dqLinterResult.summary.criticalCount === 0 && dqLinterResult.summary.warnCount > 0 && ` · ${dqLinterResult.summary.warnCount} Warn`}
          </span>
        </button>

        {/* NIST SP 800-53 Control Coverage Overlay Toggle */}
        <button
          type="button"
          aria-pressed={showNistOverlay}
          onClick={() => setShowNistOverlay((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
            showNistOverlay
              ? nistNodeCounts.critical > 0
                ? 'border-rose-400 bg-rose-600/90 text-white ring-2 ring-rose-500/40 shadow-md shadow-rose-600/30'
                : nistNodeCounts.warning > 0
                ? 'border-amber-400 bg-amber-600/90 text-white ring-2 ring-amber-500/40 shadow-md shadow-amber-600/30'
                : 'border-emerald-400 bg-emerald-600/90 text-white ring-2 ring-emerald-500/40 shadow-md shadow-emerald-600/30'
              : nistNodeCounts.critical > 0
              ? 'border-rose-500/60 bg-slate-950/80 text-rose-300 hover:bg-rose-950/50'
              : nistNodeCounts.warning > 0
              ? 'border-amber-500/60 bg-slate-950/80 text-amber-300 hover:bg-amber-950/50'
              : 'border-emerald-500/60 bg-slate-950/80 text-emerald-300 hover:bg-emerald-950/50'
          }`}
          title="Toggle NIST SP 800-53 Rev 5 Control Coverage Overlay onto individual nodes using Critical/Warning/Compliant severity colors"
        >
          {nistNodeCounts.critical > 0 ? (
            <ShieldAlert className={`w-3.5 h-3.5 ${showNistOverlay ? 'text-white' : 'text-rose-400'}`} />
          ) : nistNodeCounts.warning > 0 ? (
            <AlertTriangle className={`w-3.5 h-3.5 ${showNistOverlay ? 'text-white' : 'text-amber-400'}`} />
          ) : (
            <ShieldCheck className={`w-3.5 h-3.5 ${showNistOverlay ? 'text-white' : 'text-emerald-400'}`} />
          )}
          <span className="font-mono tabular-nums">
            NIST 800-53: {nistSummary.coverageScore}%
          </span>
          <span
            className={`text-[9.5px] font-mono uppercase px-1.5 py-0.2 rounded ${
              showNistOverlay
                ? 'bg-black/30 text-white font-bold'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {showNistOverlay ? 'Overlay ON' : 'Overlay'}
          </span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        {/* Enhanced Export Suite with Quick Buttons & Studio Dropdown */}
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={handleQuickExportPng}
            disabled={isQuickExportingPng}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Download High-Resolution PNG (2x HD, all styles & watermarks preserved)"
          >
            {isQuickExportingPng ? (
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="hidden sm:inline">PNG (2x)</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenExportStudio('gif')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Generate Animated GIF capturing live packet flows and contract transitions"
          >
            <Film className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">GIF</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Download Structured DFD-spec v2.1 JSON Specification"
          >
            <FileJson className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenExportStudio('pdf')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/70 hover:bg-rose-900/90 text-rose-300 hover:text-white border border-rose-800/60 shadow-sm transition cursor-pointer"
            title="Export official DQ DAMA Data Quality &amp; Governance Dossier to PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Dossier PDF</span>
          </button>

          {/* Export Studio Menu Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowExportMenu((prev) => !prev);
                setShowSourcesMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
              title="Open Export Studio for custom resolutions, GIF frames, PDF Dossiers, and DFD-spec previews"
            >
              <Download className="w-3.5 h-3.5" />
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                onClick={() => setShowExportMenu(false)}
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                  Export Structured Flow
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenExportStudio('pdf')}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  <div>
                    <div className="font-medium text-rose-300">DQ DAMA Dossier (PDF)...</div>
                    <div className="text-[10px] text-slate-400">DAMA-DMBOK 6-dim compliance audit</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenExportStudio('png')}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-medium">High-Res PNG Studio...</div>
                    <div className="text-[10px] text-slate-400">1x, 2x Retina, 3x Ultra-HD</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenExportStudio('gif')}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
                >
                  <Film className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="font-medium">Animated GIF Studio...</div>
                    <div className="text-[10px] text-slate-400">Live data flow loops &amp; frames</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenExportStudio('json')}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
                >
                  <FileJson className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-medium">Structured DFD-spec JSON...</div>
                    <div className="text-[10px] text-slate-400">Preview &amp; download schema v2.1</div>
                  </div>
                </button>
                <div className="my-1 border-t border-slate-800" />
                <button
                  type="button"
                  onClick={handleExportMermaid}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
                >
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-medium">Copy Mermaid.js</div>
                    <div className="text-[10px] text-slate-400">For GitHub Markdown &amp; docs</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active NIST SP 800-53 Control Coverage Overlay Legend Banner */}
      {showNistOverlay && (
        <div
          className={`no-export absolute ${
            lineageTrace ? 'top-36' : 'top-20'
          } left-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700/90 bg-slate-900/95 px-3.5 py-2 shadow-2xl backdrop-blur-md text-xs animate-in fade-in slide-in-from-top-1`}
        >
          <div className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-lg border text-white font-bold"
              style={{
                backgroundColor:
                  nistNodeCounts.critical > 0
                    ? '#EF4444'
                    : nistNodeCounts.warning > 0
                    ? '#F59E0B'
                    : '#10B981',
                borderColor: 'rgba(255,255,255,0.25)',
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-200">
                  NIST SP 800-53 Rev 5 Coverage Overlay
                </span>
                <span className="text-slate-600">·</span>
                <span className="font-mono font-bold text-white">
                  {nistSummary.coverageScore}% Overall ({nistSummary.totalControlsEvaluated} Controls)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono tabular-nums mt-0.5">
                <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  Compliant: {nistNodeCounts.compliant} node(s)
                </span>
                <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  Warning (Partial): {nistNodeCounts.warning} node(s)
                </span>
                <span className="inline-flex items-center gap-1 text-rose-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  Critical (Gap): {nistNodeCounts.critical} node(s)
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNistOverlay(false)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium border border-slate-700 transition cursor-pointer"
            title="Turn off NIST 800-53 Coverage Overlay"
          >
            <X className="w-3 h-3" />
            <span>Hide Overlay</span>
          </button>
        </div>
      )}

      {/* Active Flow Source Lineage Trace Floating Banner */}
      {lineageTrace && (
        <div className="no-export absolute top-20 left-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-500/50 bg-slate-900/95 px-3.5 py-2 shadow-2xl backdrop-blur-md text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              <GitBranch className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                  Flow Source Lineage Trace
                </span>
                <span className="text-slate-600">·</span>
                <span className="font-semibold text-white">
                  {lineageTrace.sourceNode.data.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums text-slate-400">
                <span>{lineageTrace.downstreamOps} Operations</span>
                <span>·</span>
                <span>{lineageTrace.downstreamSinks} Child Sinks</span>
                <span>·</span>
                <span>{lineageTrace.edgeCount} Contracts</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2.5">
            <button
              type="button"
              onClick={() =>
                handleExecuteSourceAction(lineageTrace.sourceNode.id, 'insert-validator')
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-[10px] font-medium text-slate-200 hover:text-white transition cursor-pointer"
              title="Insert Schema Validator & DLQ Gate on this Source"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>+Validator</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleExecuteSourceAction(lineageTrace.sourceNode.id, 'insert-masking')
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-[10px] font-medium text-slate-200 hover:text-white transition cursor-pointer"
              title="Insert PII Masking & Tokenizer on this Source"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>+Masking</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleExecuteSourceAction(lineageTrace.sourceNode.id, 'enforce-mtls')
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-[10px] font-medium text-slate-200 hover:text-white transition cursor-pointer"
              title="Enforce mTLS 1.3 on outbound contracts"
            >
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>mTLS 1.3</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTracedSourceId(null);
                onChangeTracedSource?.(null);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-200 text-[10px] font-medium border border-rose-500/30 transition cursor-pointer"
              title="Clear Source Lineage Filter"
            >
              <X className="w-3 h-3" />
              <span>Clear Trace</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Right Canvas Watermark Badge (Non-exported) */}
      <div className="no-export absolute top-4 right-4 z-20 hidden xl:flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-900/85 px-3 py-1.5 shadow-lg backdrop-blur-md text-xs pointer-events-none">
        <span className="font-semibold text-slate-200">
          Structured Flow:
        </span>
        <span className="font-mono text-indigo-300 font-medium">
          {systemName || 'Enterprise Architecture'}
        </span>
      </div>

      {/* Notification Toast */}
      {copiedNotification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-top duration-200">
          <Check className="w-4 h-4 text-white" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* React Flow Core Canvas */}
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{
          type: 'dataContractEdge',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#10b981',
          },
        }}
        className="dfd-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.5}
          color="#334155"
          className="opacity-70"
        />

        <Controls
          className="!bg-slate-900 !border !border-slate-800 !rounded-xl !shadow-xl !overflow-hidden [&>button]:!bg-slate-900 [&>button]:!border-b [&>button]:!border-slate-800 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-800"
          showInteractive={false}
        />

        <MiniMap
          nodeColor={getMiniMapNodeColor}
          nodeStrokeWidth={2}
          maskColor="rgba(15, 23, 42, 0.75)"
          className="!bottom-4 !left-4 !rounded-xl !border !border-slate-800 !bg-slate-950/90 !shadow-2xl"
        />
      </ReactFlow>

      {/* Inspector Slide-over Drawer */}
      <NodeDetailsDrawer
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        allGroups={groupNodes}
        onClose={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        onUpdateNode={handleUpdateNode}
        onUpdateEdge={handleUpdateEdge}
        onDeleteNode={handleDeleteNode}
        onDeleteEdge={handleDeleteEdge}
        onExecuteSourceAction={handleExecuteSourceAction}
      />

      {/* Architecture & Data Quality Validation Panel */}
      <ArchitectureValidationPanel
        summary={validationSummary}
        dqResult={dqLinterResult}
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        onSelectNode={(nid) => {
          setSelectedNodeId(nid);
          setSelectedEdgeId(null);
        }}
        onSelectEdge={(eid) => {
          setSelectedEdgeId(eid);
          setSelectedNodeId(null);
        }}
        onExportPdfDossier={() => handleOpenExportStudio('pdf')}
        onExportGovernanceReport={() => handleOpenExportStudio('json')}
        onActUponMismatch={handleActUponMismatch}
        onRemediateAllSources={handleRemediateAllSources}
      />

      {/* Add Node Modal */}
      <AddNodeModal
        isOpen={isAddNodeOpen}
        onClose={() => setIsAddNodeOpen(false)}
        onAdd={handleAddNode}
        groups={groupNodes}
        initialNodeType={addNodeInitialType}
      />

      {/* Export Studio Modal (PNG, GIF, DFD-spec JSON) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        nodes={nodes}
        edges={edges}
        linterResult={dqLinterResult}
        systemName={systemName || 'Enterprise DFD Flow'}
        canvasContainerRef={canvasWrapperRef}
        onFitView={() => reactFlowInstance.fitView({ padding: 0.2, duration: 250 })}
        initialTab={exportModalTab}
      />
    </div>
  );
};

export const StructuredDfdCanvas: React.FC<StructuredDfdCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
};

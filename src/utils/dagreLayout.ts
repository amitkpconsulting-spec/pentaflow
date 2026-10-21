/**
 * Dagre Auto-Layout Engine for @xyflow/react
 * Supports Left-to-Right (LR) and Top-to-Bottom (TB) layouts.
 * Intelligently computes bounding boxes for parent groups ('group') and
 * offsets child nodes with 'extent: parent' relative to their container.
 */

import dagre from '@dagrejs/dagre';
import { CustomDfdNode, CustomDfdEdge } from '../types/dfd';

export interface LayoutOptions {
  direction?: 'LR' | 'TB';
  nodeSeparation?: number;
  rankSeparation?: number;
  groupPadding?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

const DEFAULT_NODE_SIZES = {
  sourceNode: { width: 230, height: 100 },
  childNode: { width: 230, height: 100 },
  operationNode: { width: 260, height: 110 },
  default: { width: 220, height: 90 },
};

export function getLayoutedElements(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[],
  options: LayoutOptions = {}
): { nodes: CustomDfdNode[]; edges: CustomDfdEdge[] } {
  const direction = options.direction || 'LR';
  const nodeSep = options.nodeSeparation || 60;
  const rankSep = options.rankSeparation || 120;
  const groupPadding = options.groupPadding || {
    top: 60,
    bottom: 30,
    left: 30,
    right: 30,
  };

  // 1. Separate group nodes (containers) and content nodes (leafs)
  const groupNodes = nodes.filter((n) => n.type === 'group');
  const leafNodes = nodes.filter((n) => n.type !== 'group');

  if (leafNodes.length === 0 && groupNodes.length === 0) {
    return { nodes, edges };
  }

  // 2. Initialize Dagre Graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    marginx: 40,
    marginy: 40,
  });

  // 3. Add leaf nodes with their estimated dimensions
  leafNodes.forEach((node) => {
    const size =
      DEFAULT_NODE_SIZES[node.type as keyof typeof DEFAULT_NODE_SIZES] ||
      DEFAULT_NODE_SIZES.default;
    dagreGraph.setNode(node.id, {
      width: node.width || size.width,
      height: node.height || size.height,
    });
  });

  // 4. Add edges to dagre graph
  edges.forEach((edge) => {
    // Only connect if both source and target exist in leaf nodes
    if (
      dagreGraph.hasNode(edge.source) &&
      dagreGraph.hasNode(edge.target)
    ) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  // 5. Execute Dagre layout
  dagre.layout(dagreGraph);

  // 6. Extract absolute positions for leaf nodes
  const absolutePositions: Record<string, { x: number; y: number; width: number; height: number }> = {};

  leafNodes.forEach((node) => {
    const nodeWithPos = dagreGraph.node(node.id);
    const size =
      DEFAULT_NODE_SIZES[node.type as keyof typeof DEFAULT_NODE_SIZES] ||
      DEFAULT_NODE_SIZES.default;
    const width = node.width || size.width;
    const height = node.height || size.height;

    // Dagre returns center coordinates, convert to top-left
    absolutePositions[node.id] = {
      x: nodeWithPos ? nodeWithPos.x - width / 2 : 0,
      y: nodeWithPos ? nodeWithPos.y - height / 2 : 0,
      width,
      height,
    };
  });

  // 7. Calculate boundaries for parent Group Nodes
  const updatedGroupNodes: CustomDfdNode[] = [];
  const groupBounds: Record<
    string,
    { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }
  > = {};

  groupNodes.forEach((groupNode) => {
    // Find all children belonging to this group
    const children = leafNodes.filter((n) => n.parentId === groupNode.id);

    if (children.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      children.forEach((child) => {
        const pos = absolutePositions[child.id];
        if (pos) {
          minX = Math.min(minX, pos.x);
          minY = Math.min(minY, pos.y);
          maxX = Math.max(maxX, pos.x + pos.width);
          maxY = Math.max(maxY, pos.y + pos.height);
        }
      });

      // Apply padding
      const groupX = minX - groupPadding.left;
      const groupY = minY - groupPadding.top;
      const groupWidth = Math.max(260, maxX - minX + groupPadding.left + groupPadding.right);
      const groupHeight = Math.max(160, maxY - minY + groupPadding.top + groupPadding.bottom);

      groupBounds[groupNode.id] = {
        minX: groupX,
        minY: groupY,
        maxX: groupX + groupWidth,
        maxY: groupY + groupHeight,
        width: groupWidth,
        height: groupHeight,
      };

      updatedGroupNodes.push({
        ...groupNode,
        position: { x: groupX, y: groupY },
        style: {
          width: groupWidth,
          height: groupHeight,
        },
        data: {
          ...groupNode.data,
          width: groupWidth,
          height: groupHeight,
        },
      });
    } else {
      // Empty group or standalone container
      const defaultWidth = 320;
      const defaultHeight = 200;
      const fallbackX = 40;
      const fallbackY = 40 + updatedGroupNodes.length * 240;

      groupBounds[groupNode.id] = {
        minX: fallbackX,
        minY: fallbackY,
        maxX: fallbackX + defaultWidth,
        maxY: fallbackY + defaultHeight,
        width: defaultWidth,
        height: defaultHeight,
      };

      updatedGroupNodes.push({
        ...groupNode,
        position: { x: fallbackX, y: fallbackY },
        style: {
          width: defaultWidth,
          height: defaultHeight,
        },
        data: {
          ...groupNode.data,
          width: defaultWidth,
          height: defaultHeight,
        },
      });
    }
  });

  // 8. Transform child node positions to be relative to parent group
  // (In @xyflow/react, when parentId is specified, coordinates MUST be relative to parent)
  const updatedLeafNodes: CustomDfdNode[] = leafNodes.map((node) => {
    const abs = absolutePositions[node.id];
    if (!abs) return node;

    if (node.parentId && groupBounds[node.parentId]) {
      const parent = groupBounds[node.parentId];
      return {
        ...node,
        extent: 'parent' as const,
        position: {
          x: Math.max(12, abs.x - parent.minX),
          y: Math.max(groupPadding.top, abs.y - parent.minY),
        },
      };
    }

    // Top-level unparented node
    return {
      ...node,
      extent: undefined,
      position: {
        x: abs.x,
        y: abs.y,
      },
    };
  });

  return {
    nodes: [...updatedGroupNodes, ...updatedLeafNodes],
    edges,
  };
}

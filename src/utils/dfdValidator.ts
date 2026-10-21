import { CustomDfdNode, CustomDfdEdge, ValidationSummary, ValidationIssue } from '../types/dfd';

export function validateEnterpriseDfd(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[]
): ValidationSummary {
  const issues: ValidationIssue[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const leafNodes = nodes.filter((n) => n.type !== 'group');
  const groupNodes = nodes.filter((n) => n.type === 'group');

  // 1. Identify Orphan Nodes (0 incoming and 0 outgoing edges)
  let orphanCount = 0;
  leafNodes.forEach((node) => {
    const hasIncoming = edges.some((e) => e.target === node.id);
    const hasOutgoing = edges.some((e) => e.source === node.id);

    if (!hasIncoming && !hasOutgoing) {
      orphanCount++;
      issues.push({
        id: `orphan-${node.id}`,
        severity: 'warning',
        title: `Disconnected Node: "${node.data.label}"`,
        description: `Node of type [${node.type}] has no inbound or outbound data flow connections.`,
        nodeIds: [node.id],
        recommendation: `Connect this node to an upstream Source or downstream Operation to complete the flow.`,
      });
    }
  });

  // 2. Identify Empty Container / Trust Boundaries
  groupNodes.forEach((grp) => {
    const memberCount = leafNodes.filter((n) => n.parentId === grp.id).length;
    if (memberCount === 0) {
      issues.push({
        id: `empty-group-${grp.id}`,
        severity: 'info',
        title: `Empty Trust Boundary: "${grp.data.label}"`,
        description: `This infrastructure or security zone contains no active component nodes.`,
        nodeIds: [grp.id],
        recommendation: `Assign Source, Operation, or Child nodes to this zone to establish containment.`,
      });
    }
  });

  // 3. Inspect Cross-Zone and Unencrypted Flows
  let unsecuredCrossings = 0;
  edges.forEach((edge) => {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);

    if (!src || !tgt) {
      issues.push({
        id: `dangling-edge-${edge.id}`,
        severity: 'error',
        title: `Broken Edge Reference`,
        description: `Edge points to non-existent source (${edge.source}) or target (${edge.target}).`,
        edgeIds: [edge.id],
        recommendation: `Remove or reconnect the dangling edge.`,
      });
      return;
    }

    // Check if crossing different security zones/parent boundaries
    const isCrossZone = src.parentId !== tgt.parentId;
    const rawLabel = typeof edge.label === 'string' ? edge.label : '';
    const protocol = (edge.data?.protocol || rawLabel || '').toLowerCase();
    const isEncrypted =
      protocol.includes('tls') ||
      protocol.includes('ssl') ||
      protocol.includes('mtls') ||
      protocol.includes('ipsec') ||
      protocol.includes('crypto') ||
      edge.data?.encryption;

    if (isCrossZone && !isEncrypted) {
      unsecuredCrossings++;
      issues.push({
        id: `unsecured-cross-zone-${edge.id}`,
        severity: 'warning',
        title: `Unencrypted Cross-Zone Flow: "${src.data.label}" -> "${tgt.data.label}"`,
        description: `Flow traverses security boundaries without explicit TLS/mTLS or IPSec protocol markers.`,
        edgeIds: [edge.id],
        recommendation: `Upgrade connection to mTLS / gRPC or TLS 1.3 to comply with zero-trust architecture.`,
      });
    }
  });

  // 4. Check for direct Source -> Child bypassing Operations/Masking
  edges.forEach((edge) => {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (src?.type === 'sourceNode' && tgt?.type === 'childNode') {
      const tgtClass = tgt.data?.metadata?.dataClassification;
      if (tgtClass === 'RESTRICTED_PII' || tgtClass === 'CONFIDENTIAL') {
        issues.push({
          id: `untransformed-pii-${edge.id}`,
          severity: 'info',
          title: `Direct Pipeline to Restricted Target: "${tgt.data.label}"`,
          description: `Data flows directly from Source into Restricted storage without an explicit masking or validation Operation node in-between.`,
          nodeIds: [src.id, tgt.id],
          edgeIds: [edge.id],
          recommendation: `Consider inserting an Operation node (e.g., PII Tokenizer, Data Scrubbing) before persisting to restricted storage.`,
        });
      }
    }
  });

  return {
    passed: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    orphanNodes: orphanCount,
    unsecuredCrossings,
  };
}

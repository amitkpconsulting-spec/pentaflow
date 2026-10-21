/**
 * Deterministic Data Quality (DQ) Graph Linter & DAMA Governance Engine
 *
 * Scans graph topology for enterprise architectural violations based on:
 * 1. Source-Child Data Contract Mismatches (End-to-End Classification, Schema, SLA, DLQ)
 * 2. Classification Downgrade & PII Leakage across unmasked boundaries
 * 3. Direct Source-to-Child Ingestion Bypass without quality/validation gates
 * 4. Payload Serialization & Format Contract Incompatibilities (Binary/Protobuf vs JSON/CSV)
 * 5. Timeliness Cadence & Latency SLA Mismatches (Batch vs Real-Time Streaming)
 * 6. Cross-Boundary Trust Zone Traversals without verified cryptographic transport
 * 7. Missing Dead-Letter Queue (DLQ) exception quarantine in processing pipelines
 * 8. Data Sinkholes (Unconnected Sources) & Unfed Child Sinks
 */

import {
  CustomDfdNode,
  CustomDfdEdge,
  DqLinterResult,
  DqLinterDiagnostic,
  DqSeverity,
  DqDimension,
  DataQualityRule,
  SourceChildContractMismatch,
  ContractMismatchType,
} from '../types/dfd';

/**
 * Numeric hierarchy for Data Classification levels
 * RESTRICTED_PII (4) > CONFIDENTIAL (3) > INTERNAL (2) > PUBLIC (1)
 */
export function getClassificationRank(classification?: string): number {
  if (!classification) return 2; // Default to INTERNAL
  const normalized = classification.toUpperCase();
  if (normalized.includes('RESTRICTED') || normalized.includes('PII')) return 4;
  if (normalized.includes('CONFIDENTIAL')) return 3;
  if (normalized.includes('INTERNAL')) return 2;
  if (normalized.includes('PUBLIC')) return 1;
  return 2;
}

/**
 * Checks if an operation node performs PII masking, tokenization, or scrubbing
 */
export function isMaskingOrTokenizationOperation(node: CustomDfdNode): boolean {
  if (node.type !== 'operationNode') return false;
  const pType = (node.data.metadata?.processType || '').toLowerCase();
  const label = (node.data.label || '').toLowerCase();
  const tech = (node.data.metadata?.technology || '').toLowerCase();

  return (
    pType.includes('mask') ||
    pType.includes('token') ||
    pType.includes('crypto') ||
    pType.includes('scrub') ||
    label.includes('mask') ||
    label.includes('tokeniz') ||
    label.includes('scrub') ||
    label.includes('anonymiz') ||
    label.includes('hash') ||
    label.includes('redact') ||
    label.includes('pseudonym') ||
    label.includes('pii') ||
    tech.includes('vault') ||
    tech.includes('hsm') ||
    tech.includes('token')
  );
}

/**
 * Checks if an operation node performs schema validation or data quality cleansing
 */
export function isValidationOperation(node: CustomDfdNode): boolean {
  if (node.type !== 'operationNode') return false;
  const pType = (node.data.metadata?.processType || '').toLowerCase();
  const label = (node.data.label || '').toLowerCase();

  return (
    pType.includes('validation') ||
    pType.includes('review') ||
    label.includes('validat') ||
    label.includes('schema') ||
    label.includes('sanitiz') ||
    label.includes('filter') ||
    label.includes('check') ||
    label.includes('rule') ||
    label.includes('verif')
  );
}

/**
 * Checks if an operation node performs format transformation or ETL conversion
 */
export function isTransformationOrConverterOperation(node: CustomDfdNode): boolean {
  if (node.type !== 'operationNode') return false;
  const pType = (node.data.metadata?.processType || '').toLowerCase();
  const label = (node.data.label || '').toLowerCase();

  return (
    pType.includes('etl') ||
    pType.includes('transform') ||
    label.includes('transform') ||
    label.includes('convert') ||
    label.includes('deserializ') ||
    label.includes('parser') ||
    label.includes('translat') ||
    label.includes('etl') ||
    label.includes('mapper') ||
    label.includes('normaliz') ||
    label.includes('format')
  );
}

/**
 * Checks if an operation has Dead-Letter Queue (DLQ) exception quarantine
 */
export function hasDeadLetterQueue(node: CustomDfdNode): boolean {
  if (node.data.dataQuality?.hasQuarantineDLQ === true) return true;
  const label = (node.data.label || '').toLowerCase();
  const desc = (node.data.metadata?.description || '').toLowerCase();
  return (
    label.includes('dlq') ||
    label.includes('quarantine') ||
    label.includes('dead letter') ||
    label.includes('error queue') ||
    desc.includes('dlq') ||
    desc.includes('quarantine')
  );
}

/**
 * Infers payload serialization format from node and outgoing edge metadata
 */
export function inferPayloadFormat(node: CustomDfdNode, edge?: CustomDfdEdge): string {
  if (edge?.data?.payloadFormat) return edge.data.payloadFormat;
  const edgeSchema = (edge?.data?.schemaContract || '').toLowerCase();
  if (edgeSchema.includes('avro')) return 'Avro';
  if (edgeSchema.includes('protobuf') || edgeSchema.includes('proto')) return 'Protobuf';
  if (edgeSchema.includes('json')) return 'JSON';
  if (edgeSchema.includes('xml')) return 'XML';

  const tech = (node.data.metadata?.technology || '').toLowerCase();
  const label = (node.data.label || '').toLowerCase();
  if (tech.includes('kafka') || tech.includes('grpc') || tech.includes('proto')) return 'Protobuf';
  if (tech.includes('avro')) return 'Avro';
  if (tech.includes('xml') || label.includes('iso 8583') || label.includes('xml') || tech.includes('soap')) return 'XML / ISO 8583';
  if (tech.includes('sql') || tech.includes('postgres') || tech.includes('oracle') || tech.includes('db')) return 'Relational SQL';
  if (tech.includes('csv') || label.includes('csv') || tech.includes('flat file')) return 'CSV';

  return 'JSON';
}

/**
 * Checks if two serialization formats require an intermediate converter
 */
export function areFormatsIncompatible(formatA: string, formatB: string): boolean {
  if (!formatA || !formatB) return false;
  const fa = formatA.toLowerCase();
  const fb = formatB.toLowerCase();
  if (fa === fb) return false;

  const isBinaryOrProtoA = fa.includes('proto') || fa.includes('avro') || fa.includes('binary');
  const isTextOrJsonB = fb.includes('json') || fb.includes('csv') || fb.includes('sql') || fb.includes('relational');
  if (isBinaryOrProtoA && isTextOrJsonB) return true;

  const isXmlA = fa.includes('xml') || fa.includes('8583');
  const isProtoOrAvroB = fb.includes('proto') || fb.includes('avro');
  if (isXmlA && isProtoOrAvroB) return true;

  return false;
}

/**
 * Analyzes SLA timeliness latency
 */
export function analyzeTimeliness(node: CustomDfdNode, edge?: CustomDfdEdge): { isRealtime: boolean; isBatch: boolean; text: string } {
  const slaText = `${node.data.dataQuality?.slaLatency || ''} ${node.data.metadata?.sla || ''} ${edge?.data?.timelinessSla || ''} ${edge?.data?.frequency || ''} ${node.data.metadata?.processType || ''} ${node.data.label || ''}`.toLowerCase();

  const isRealtime =
    slaText.includes('real-time') ||
    slaText.includes('stream') ||
    slaText.includes('< 500ms') ||
    slaText.includes('sub-second') ||
    slaText.includes('continuous') ||
    slaText.includes('event-driven');

  const isBatch =
    slaText.includes('daily') ||
    slaText.includes('batch') ||
    slaText.includes('hourly') ||
    slaText.includes('weekly') ||
    slaText.includes('overnight');

  return { isRealtime, isBatch, text: slaText };
}

/**
 * Discovers directed paths from a start node to a target node with depth limit and loop avoidance
 */
export function findDirectedPaths(
  adjacency: Map<string, Array<{ targetId: string; edge: CustomDfdEdge }>>,
  startId: string,
  targetId: string,
  maxDepth = 7,
  maxPaths = 4
): Array<{ nodeIds: string[]; edges: CustomDfdEdge[] }> {
  const results: Array<{ nodeIds: string[]; edges: CustomDfdEdge[] }> = [];

  function dfs(currentId: string, currentPath: string[], currentEdges: CustomDfdEdge[], visited: Set<string>) {
    if (results.length >= maxPaths) return;
    if (currentPath.length > maxDepth) return;

    if (currentId === targetId) {
      results.push({ nodeIds: [...currentPath], edges: [...currentEdges] });
      return;
    }

    const nextEdges = adjacency.get(currentId) || [];
    for (const { targetId: nextId, edge } of nextEdges) {
      if (!visited.has(nextId)) {
        visited.add(nextId);
        currentPath.push(nextId);
        currentEdges.push(edge);

        dfs(nextId, currentPath, currentEdges, visited);

        currentEdges.pop();
        currentPath.pop();
        visited.delete(nextId);
      }
    }
  }

  const initialVisited = new Set<string>([startId]);
  dfs(startId, [startId], [], initialVisited);

  return results;
}

/**
 * Scans the graph topology specifically for Source-Child Data Contract Mismatches
 */
export function scanSourceChildDataContracts(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[],
  nodeMap: Map<string, CustomDfdNode>
): {
  mismatches: SourceChildContractMismatch[];
  diagnostics: DqLinterDiagnostic[];
} {
  const mismatches: SourceChildContractMismatch[] = [];
  const diagnostics: DqLinterDiagnostic[] = [];

  // Build Adjacency List for topology traversal
  const adjacency = new Map<string, Array<{ targetId: string; edge: CustomDfdEdge }>>();
  const incoming = new Map<string, Array<{ sourceId: string; edge: CustomDfdEdge }>>();

  nodes.forEach((n) => {
    adjacency.set(n.id, []);
    incoming.set(n.id, []);
  });

  edges.forEach((e) => {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      adjacency.get(e.source)?.push({ targetId: e.target, edge: e });
      incoming.get(e.target)?.push({ sourceId: e.source, edge: e });
    }
  });

  // Filter Source and Child nodes
  const sourceNodes = nodes.filter((n) => n.type === 'sourceNode' || n.data.category === 'Source');
  const childNodes = nodes.filter((n) => n.type === 'childNode' || n.data.category === 'Child');

  // RULE A: Data Sinkhole (Source with 0 paths to any child)
  sourceNodes.forEach((src) => {
    const outs = adjacency.get(src.id) || [];
    if (outs.length === 0) {
      const mismatch: SourceChildContractMismatch = {
        id: `mismatch-sinkhole-${src.id}`,
        sourceNodeId: src.id,
        sourceLabel: src.data.label,
        childNodeId: 'NONE',
        childLabel: 'No Target Sink',
        pathNodeIds: [src.id],
        pathLabels: [src.data.label],
        mismatchType: 'DATA_SINKHOLE',
        severity: 'CRITICAL',
        dimension: 'Completeness',
        title: 'Data Sinkhole: Unrouted Ingress Source',
        message: `Source "${src.data.label}" produces data but has 0 outgoing data routes to downstream processing or child sinks.`,
        sourceContract: {
          classification: src.data.metadata?.dataClassification || 'INTERNAL',
          format: inferPayloadFormat(src),
          sla: src.data.metadata?.sla || '< 500ms',
          zone: src.parentId,
        },
        childContract: {},
        recommendation: `Connect "${src.data.label}" to an intermediate validation/ETL operation or downstream child storage.`,
      };
      mismatches.push(mismatch);

      diagnostics.push({
        id: `diag-contract-${src.id}-sinkhole`,
        type: 'node',
        targetId: src.id,
        severity: 'CRITICAL',
        ruleName: 'Data Sinkhole Defect',
        message: mismatch.message,
        recommendation: mismatch.recommendation,
        dimension: 'Completeness',
        sourceNodeId: src.id,
        mismatchType: 'DATA_SINKHOLE',
        pathNodeIds: [src.id],
      });
    }
  });

  // RULE B: Unfed Target (Child with 0 inbound paths from any source)
  childNodes.forEach((child) => {
    const ins = incoming.get(child.id) || [];
    if (ins.length === 0) {
      const mismatch: SourceChildContractMismatch = {
        id: `mismatch-unfed-${child.id}`,
        sourceNodeId: 'NONE',
        sourceLabel: 'No Ingress Origin',
        childNodeId: child.id,
        childLabel: child.data.label,
        pathNodeIds: [child.id],
        pathLabels: [child.data.label],
        mismatchType: 'UNFED_TARGET',
        severity: 'CRITICAL',
        dimension: 'Completeness',
        title: 'Unfed Target Sink: Dead Storage Entity',
        message: `Child sink "${child.data.label}" expects downstream data but has 0 inbound flow connections.`,
        sourceContract: {},
        childContract: {
          classification: child.data.metadata?.dataClassification || 'INTERNAL',
          format: inferPayloadFormat(child),
          sla: child.data.metadata?.sla || '< 500ms',
          zone: child.parentId,
        },
        recommendation: `Wire upstream operations or ingress triggers into "${child.data.label}".`,
      };
      mismatches.push(mismatch);

      diagnostics.push({
        id: `diag-contract-${child.id}-unfed`,
        type: 'node',
        targetId: child.id,
        severity: 'CRITICAL',
        ruleName: 'Unfed Target Defect',
        message: mismatch.message,
        recommendation: mismatch.recommendation,
        dimension: 'Completeness',
        childNodeId: child.id,
        mismatchType: 'UNFED_TARGET',
        pathNodeIds: [child.id],
      });
    }
  });

  // SCAN ALL CONNECTED (SOURCE -> CHILD) PATHS
  sourceNodes.forEach((src) => {
    const srcClassification = src.data.metadata?.dataClassification || 'INTERNAL';
    const srcRank = getClassificationRank(srcClassification);
    const srcFormat = inferPayloadFormat(src);
    const srcTimeliness = analyzeTimeliness(src);

    childNodes.forEach((tgt) => {
      const tgtClassification = tgt.data.metadata?.dataClassification || 'INTERNAL';
      const tgtRank = getClassificationRank(tgtClassification);
      const tgtFormat = inferPayloadFormat(tgt);
      const tgtTimeliness = analyzeTimeliness(tgt);

      // Find all directed paths between this Source and Child
      const paths = findDirectedPaths(adjacency, src.id, tgt.id, 8, 3);
      if (paths.length === 0) return;

      paths.forEach((pathObj, pIdx) => {
        const pathNodeIds = pathObj.nodeIds;
        const intermediateNodeIds = pathNodeIds.slice(1, -1);
        const intermediateNodes = intermediateNodeIds
          .map((id) => nodeMap.get(id))
          .filter((n): n is CustomDfdNode => Boolean(n));
        const pathLabels = pathNodeIds.map((id) => nodeMap.get(id)?.data.label || id);

        const sourceContractInfo = {
          classification: srcClassification,
          format: srcFormat,
          sla: src.data.metadata?.sla || '< 500ms',
          zone: src.parentId || 'Default Trust Zone',
        };

        const childContractInfo = {
          classification: tgtClassification,
          format: tgtFormat,
          sla: tgt.data.metadata?.sla || '< 500ms',
          zone: tgt.parentId || 'Default Trust Zone',
        };

        // -------------------------------------------------------------
        // CONTRACT CHECK 1: DIRECT SOURCE-TO-CHILD BYPASS (VALIDITY)
        // -------------------------------------------------------------
        if (intermediateNodes.length === 0) {
          const edgeId = pathObj.edges[0]?.id || `${src.id}-${tgt.id}`;
          const mismatch: SourceChildContractMismatch = {
            id: `contract-bypass-${src.id}-${tgt.id}-${pIdx}`,
            sourceNodeId: src.id,
            sourceLabel: src.data.label,
            childNodeId: tgt.id,
            childLabel: tgt.data.label,
            pathNodeIds,
            pathLabels,
            mismatchType: 'DIRECT_INGESTION_BYPASS',
            severity: 'CRITICAL',
            dimension: 'Validity',
            title: 'Direct Ingestion Bypass (Unvalidated Flow)',
            message: `Raw source data from "${src.data.label}" flows directly into child storage "${tgt.data.label}" with zero intervening validation, schema checking, or sanitization operations.`,
            sourceContract: sourceContractInfo,
            childContract: childContractInfo,
            recommendation: `Insert an Operation node (e.g. Schema Validator, ISO Formatter, or Data Quality Cleanser) between "${src.data.label}" and "${tgt.data.label}".`,
          };
          mismatches.push(mismatch);

          diagnostics.push({
            id: `diag-sc-bypass-${edgeId}`,
            type: 'edge',
            targetId: edgeId,
            severity: 'CRITICAL',
            ruleName: 'Direct Ingestion Bypass',
            message: mismatch.message,
            recommendation: mismatch.recommendation,
            dimension: 'Validity',
            sourceNodeId: src.id,
            childNodeId: tgt.id,
            pathNodeIds,
            mismatchType: 'DIRECT_INGESTION_BYPASS',
          });
        }

        // -------------------------------------------------------------
        // CONTRACT CHECK 2: CLASSIFICATION DOWNGRADE / PII LEAKAGE (ACCURACY/VALIDITY)
        // -------------------------------------------------------------
        if (srcRank > tgtRank && (srcRank >= 3)) {
          // Sensitive data (RESTRICTED_PII or CONFIDENTIAL) flowing to lower classification (INTERNAL or PUBLIC)
          const hasMasking = intermediateNodes.some((op) => isMaskingOrTokenizationOperation(op));

          if (!hasMasking) {
            const breachNodeId = intermediateNodes.length > 0 ? intermediateNodes[intermediateNodes.length - 1].id : tgt.id;
            const mismatch: SourceChildContractMismatch = {
              id: `contract-classification-${src.id}-${tgt.id}-${pIdx}`,
              sourceNodeId: src.id,
              sourceLabel: src.data.label,
              childNodeId: tgt.id,
              childLabel: tgt.data.label,
              pathNodeIds,
              pathLabels,
              mismatchType: 'CLASSIFICATION_DOWNGRADE',
              severity: 'CRITICAL',
              dimension: 'Accuracy',
              title: 'Classification Downgrade & Unmasked PII Ingress',
              message: `High-sensitivity payload (${srcClassification}) from "${src.data.label}" enters lower-classification storage "${tgt.data.label}" (${tgtClassification}) without a Cryptographic Masking, Tokenization, or PII Scrubber operation.`,
              sourceContract: sourceContractInfo,
              childContract: childContractInfo,
              recommendation: `Insert a Tokenization / Masking operation node along the pipeline [${pathLabels.join(' → ')}] before persisting to "${tgt.data.label}".`,
            };
            mismatches.push(mismatch);

            diagnostics.push({
              id: `diag-sc-class-${src.id}-${tgt.id}`,
              type: 'node',
              targetId: breachNodeId,
              severity: 'CRITICAL',
              ruleName: 'Classification Downgrade & PII Leakage',
              message: mismatch.message,
              recommendation: mismatch.recommendation,
              dimension: 'Accuracy',
              sourceNodeId: src.id,
              childNodeId: tgt.id,
              pathNodeIds,
              mismatchType: 'CLASSIFICATION_DOWNGRADE',
            });
          }
        }

        // -------------------------------------------------------------
        // CONTRACT CHECK 3: SERIALIZATION FORMAT CONTRACT MISMATCH (CONSISTENCY)
        // -------------------------------------------------------------
        if (areFormatsIncompatible(srcFormat, tgtFormat)) {
          const hasConverter = intermediateNodes.some((op) => isTransformationOrConverterOperation(op));

          if (!hasConverter) {
            const mismatch: SourceChildContractMismatch = {
              id: `contract-format-${src.id}-${tgt.id}-${pIdx}`,
              sourceNodeId: src.id,
              sourceLabel: src.data.label,
              childNodeId: tgt.id,
              childLabel: tgt.data.label,
              pathNodeIds,
              pathLabels,
              mismatchType: 'SCHEMA_SERIALIZATION_MISMATCH',
              severity: 'CRITICAL',
              dimension: 'Consistency',
              title: 'Payload Serialization Format Incompatibility',
              message: `Format contract mismatch: Origin "${src.data.label}" emits binary/structured ${srcFormat}, but downstream sink "${tgt.data.label}" expects ${tgtFormat} without an intermediate transformer/deserializer.`,
              sourceContract: sourceContractInfo,
              childContract: childContractInfo,
              recommendation: `Add a Transformation / Deserialization operation between "${src.data.label}" and "${tgt.data.label}" to convert ${srcFormat} to ${tgtFormat}.`,
            };
            mismatches.push(mismatch);

            diagnostics.push({
              id: `diag-sc-format-${src.id}-${tgt.id}`,
              type: 'edge',
              targetId: pathObj.edges[0]?.id || src.id,
              severity: 'CRITICAL',
              ruleName: 'Serialization Format Contract Mismatch',
              message: mismatch.message,
              recommendation: mismatch.recommendation,
              dimension: 'Consistency',
              sourceNodeId: src.id,
              childNodeId: tgt.id,
              pathNodeIds,
              mismatchType: 'SCHEMA_SERIALIZATION_MISMATCH',
            });
          }
        }

        // -------------------------------------------------------------
        // CONTRACT CHECK 4: TIMELINESS CADENCE & LATENCY SLA MISMATCH (TIMELINESS)
        // -------------------------------------------------------------
        // Case 4A: Batch origin feeding sub-second consumer (unfulfillable SLA)
        if (srcTimeliness.isBatch && tgtTimeliness.isRealtime) {
          const mismatch: SourceChildContractMismatch = {
            id: `contract-sla-${src.id}-${tgt.id}-${pIdx}`,
            sourceNodeId: src.id,
            sourceLabel: src.data.label,
            childNodeId: tgt.id,
            childLabel: tgt.data.label,
            pathNodeIds,
            pathLabels,
            mismatchType: 'TIMELINESS_SLA_MISMATCH',
            severity: 'CRITICAL',
            dimension: 'Timeliness',
            title: 'Unfulfillable Timeliness SLA Contract',
            message: `Batch origin "${src.data.label}" (${sourceContractInfo.sla}) cannot satisfy the sub-second Real-time consumer SLA (<500ms) demanded by "${tgt.data.label}".`,
            sourceContract: sourceContractInfo,
            childContract: childContractInfo,
            recommendation: `Upgrade origin ingestion from Batch to event-driven streaming, or reconcile the consumer latency SLA contract on "${tgt.data.label}".`,
          };
          mismatches.push(mismatch);

          diagnostics.push({
            id: `diag-sc-sla-${src.id}-${tgt.id}`,
            type: 'node',
            targetId: tgt.id,
            severity: 'CRITICAL',
            ruleName: 'Unfulfillable Consumer SLA Mismatch',
            message: mismatch.message,
            recommendation: mismatch.recommendation,
            dimension: 'Timeliness',
            sourceNodeId: src.id,
            childNodeId: tgt.id,
            pathNodeIds,
            mismatchType: 'TIMELINESS_SLA_MISMATCH',
          });
        }

        // Case 4B: Continuous high-velocity stream writing into batch lake without staging buffer
        if (srcTimeliness.isRealtime && tgtTimeliness.isBatch) {
          const hasBufferOrQueue = intermediateNodes.some((op) => {
            const l = (op.data.label || '').toLowerCase();
            const tech = (op.data.metadata?.technology || '').toLowerCase();
            return (
              l.includes('queue') ||
              l.includes('buffer') ||
              l.includes('kafka') ||
              tech.includes('kafka') ||
              tech.includes('rabbitmq') ||
              tech.includes('sqs') ||
              tech.includes('kinesis')
            );
          });

          if (!hasBufferOrQueue) {
            const mismatch: SourceChildContractMismatch = {
              id: `contract-buffer-${src.id}-${tgt.id}-${pIdx}`,
              sourceNodeId: src.id,
              sourceLabel: src.data.label,
              childNodeId: tgt.id,
              childLabel: tgt.data.label,
              pathNodeIds,
              pathLabels,
              mismatchType: 'TIMELINESS_SLA_MISMATCH',
              severity: 'WARN',
              dimension: 'Timeliness',
              title: 'Bufferless High-Velocity Stream Ingestion',
              message: `Continuous high-throughput streaming from "${src.data.label}" writes into batch repository "${tgt.data.label}" without an intermediate Kafka/Queue backpressure buffer.`,
              sourceContract: sourceContractInfo,
              childContract: childContractInfo,
              recommendation: `Place an event streaming broker (e.g. Kafka, Kinesis, RabbitMQ) between stream origin and target storage.`,
            };
            mismatches.push(mismatch);

            diagnostics.push({
              id: `diag-sc-buf-${src.id}-${tgt.id}`,
              type: 'edge',
              targetId: pathObj.edges[0]?.id || src.id,
              severity: 'WARN',
              ruleName: 'Bufferless Ingestion Gap',
              message: mismatch.message,
              recommendation: mismatch.recommendation,
              dimension: 'Timeliness',
              sourceNodeId: src.id,
              childNodeId: tgt.id,
              pathNodeIds,
              mismatchType: 'TIMELINESS_SLA_MISMATCH',
            });
          }
        }

        // -------------------------------------------------------------
        // CONTRACT CHECK 5: MISSING DEAD-LETTER QUEUE IN PIPELINE (CONSISTENCY)
        // -------------------------------------------------------------
        if (intermediateNodes.length > 0) {
          const hasAnyDlq = intermediateNodes.some((op) => hasDeadLetterQueue(op));
          if (!hasAnyDlq) {
            const primaryOp = intermediateNodes[0];
            const mismatch: SourceChildContractMismatch = {
              id: `contract-dlq-${src.id}-${tgt.id}-${pIdx}`,
              sourceNodeId: src.id,
              sourceLabel: src.data.label,
              childNodeId: tgt.id,
              childLabel: tgt.data.label,
              pathNodeIds,
              pathLabels,
              mismatchType: 'MISSING_DLQ_QUARANTINE',
              severity: 'WARN',
              dimension: 'Consistency',
              title: 'Missing Pipeline Dead-Letter Queue (DLQ)',
              message: `Ingestion pipeline from "${src.data.label}" to "${tgt.data.label}" lacks exception quarantine (DLQ) handling. Invalid packets will cause silent data loss or crash processing.`,
              sourceContract: sourceContractInfo,
              childContract: childContractInfo,
              recommendation: `Configure an air-gapped Dead-Letter Queue (DLQ) or exception quarantine bucket on operation "${primaryOp.data.label}".`,
            };
            mismatches.push(mismatch);

            diagnostics.push({
              id: `diag-sc-dlq-${primaryOp.id}`,
              type: 'node',
              targetId: primaryOp.id,
              severity: 'WARN',
              ruleName: 'Missing Dead-Letter Queue (DLQ)',
              message: mismatch.message,
              recommendation: mismatch.recommendation,
              dimension: 'Consistency',
              sourceNodeId: src.id,
              childNodeId: tgt.id,
              pathNodeIds,
              mismatchType: 'MISSING_DLQ_QUARANTINE',
            });
          }
        }

        // -------------------------------------------------------------
        // CONTRACT CHECK 6: CROSS-BOUNDARY ENCLAVE PERIMETER (ACCURACY/SECURITY)
        // -------------------------------------------------------------
        const srcZone = (src.parentId || '').toLowerCase();
        const tgtZone = (tgt.parentId || '').toLowerCase();
        const isCrossBoundary = Boolean(src.parentId && tgt.parentId && src.parentId !== tgt.parentId);

        const isUntrustedOrigin =
          srcZone.includes('dmz') ||
          srcZone.includes('external') ||
          srcZone.includes('public') ||
          srcZone.includes('ingress');

        const isSecureTarget =
          tgtZone.includes('pci') ||
          tgtZone.includes('core') ||
          tgtZone.includes('enclave') ||
          tgtZone.includes('air-gap') ||
          tgtZone.includes('classified');

        if (isCrossBoundary && isUntrustedOrigin && isSecureTarget) {
          const hasInTransitEncryption = pathObj.edges.every((e) => {
            const edgeText = `${e.label || ''} ${e.data?.protocol || ''} ${e.data?.encryption || ''}`.toLowerCase();
            return (
              edgeText.includes('tls') ||
              edgeText.includes('mtls') ||
              edgeText.includes('https') ||
              edgeText.includes('ipsec') ||
              e.data?.encryptionAtRestAndTransit === true
            );
          });

          if (!hasInTransitEncryption) {
            const crossingEdge = pathObj.edges.find((e) => {
              const sNode = nodeMap.get(e.source);
              const tNode = nodeMap.get(e.target);
              return sNode?.parentId !== tNode?.parentId;
            }) || pathObj.edges[0];

            const mismatch: SourceChildContractMismatch = {
              id: `contract-boundary-${src.id}-${tgt.id}-${pIdx}`,
              sourceNodeId: src.id,
              sourceLabel: src.data.label,
              childNodeId: tgt.id,
              childLabel: tgt.data.label,
              pathNodeIds,
              pathLabels,
              mismatchType: 'BOUNDARY_ENCRYPTION_VIOLATION',
              severity: 'CRITICAL',
              dimension: 'Accuracy',
              title: 'Unencrypted Trust Boundary Crossing into Secure Enclave',
              message: `Data travels from untrusted zone "${src.parentId}" to secure enclave "${tgt.parentId}" without verified TLS/mTLS 1.3 or IPSec transport encryption.`,
              sourceContract: sourceContractInfo,
              childContract: childContractInfo,
              recommendation: `Enforce mutual TLS (mTLS 1.3) across edge "${crossingEdge?.id || 'boundary'}" between "${src.parentId}" and "${tgt.parentId}".`,
            };
            mismatches.push(mismatch);

            if (crossingEdge) {
              diagnostics.push({
                id: `diag-sc-crypto-${crossingEdge.id}`,
                type: 'edge',
                targetId: crossingEdge.id,
                severity: 'CRITICAL',
                ruleName: 'Cross-Boundary Trust Zone Breach',
                message: mismatch.message,
                recommendation: mismatch.recommendation,
                dimension: 'Accuracy',
                sourceNodeId: src.id,
                childNodeId: tgt.id,
                pathNodeIds,
                mismatchType: 'BOUNDARY_ENCRYPTION_VIOLATION',
              });
            }
          }
        }
      });
    });
  });

  return { mismatches, diagnostics };
}

/**
 * Main Deterministic Data Quality (DQ) Graph Linter Entry Point
 */
export function runDeterministicDqLinter(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[]
): DqLinterResult {
  const nodeMap = new Map<string, CustomDfdNode>();
  nodes.forEach((n) => nodeMap.set(n.id, { ...n }));

  // 1. Run Core Source-Child Data Contract Scanning Engine
  const { mismatches: sourceChildMismatches, diagnostics: contractDiagnostics } =
    scanSourceChildDataContracts(nodes, edges, nodeMap);

  const diagnostics: DqLinterDiagnostic[] = [...contractDiagnostics];

  // Track edge violations map
  const edgeViolationsMap = new Map<string, { severity: DqSeverity; violations: string[] }>();
  edges.forEach((e) => edgeViolationsMap.set(e.id, { severity: 'PASS', violations: [] }));

  // Associate contract diagnostics to edges
  contractDiagnostics.forEach((d) => {
    if (d.type === 'edge') {
      const cur = edgeViolationsMap.get(d.targetId);
      if (cur) {
        cur.violations.push(`${d.ruleName}: ${d.message}`);
        if (d.severity === 'CRITICAL' || cur.severity !== 'CRITICAL') {
          cur.severity = d.severity;
        }
      }
    }
  });

  // 2. Direct edge-level validation passes (dangling, contracts, SLA metadata)
  const lintedEdges: CustomDfdEdge[] = edges.map((edge) => {
    const srcNode = nodeMap.get(edge.source);
    const tgtNode = nodeMap.get(edge.target);
    const edgeViolationEntry = edgeViolationsMap.get(edge.id) || { severity: 'PASS', violations: [] };

    const violations: string[] = [...edgeViolationEntry.violations];
    let severity: DqSeverity = edgeViolationEntry.severity;

    if (!srcNode || !tgtNode) {
      violations.push('Broken edge reference: Source or Target node does not exist in graph.');
      severity = 'CRITICAL';
      diagnostics.push({
        id: `diag-dangling-${edge.id}`,
        type: 'edge',
        targetId: edge.id,
        severity: 'CRITICAL',
        ruleName: 'Dangling Edge Reference',
        message: `Edge ${edge.id} references non-existent endpoints.`,
        recommendation: 'Remove or reconnect this edge to active nodes.',
        dimension: 'Consistency',
      });
    }

    // Missing Schema Contract or Timeliness SLA Check
    const hasSchemaContract = Boolean(edge.data?.schemaContract || edge.data?.payloadFormat);
    const hasTimelinessSla = Boolean(edge.data?.timelinessSla || edge.data?.frequency);

    if (!hasSchemaContract || !hasTimelinessSla) {
      if (severity !== 'CRITICAL') severity = 'WARN';
      const gaps: string[] = [];
      if (!hasSchemaContract) gaps.push('Missing Schema Contract (Avro/Protobuf/JSON Schema)');
      if (!hasTimelinessSla) gaps.push('Undefined Timeliness SLA');
      violations.push(`Data-in-Transit Contract Gap: ${gaps.join(', ')}.`);

      diagnostics.push({
        id: `diag-contract-${edge.id}`,
        type: 'edge',
        targetId: edge.id,
        severity: 'WARN',
        ruleName: 'Data Contract Gap',
        message: `Edge ${edge.label || edge.id} lacks formal schema contract or timeliness SLA metadata.`,
        recommendation: 'Define explicit schema validation contract (e.g., Avro v2.1) and SLA window (e.g., Real-time < 500ms).',
        dimension: 'Timeliness',
      });
    }

    // Determine visual stroke and animation based on DQ status
    let strokeColor = '#10b981'; // Emerald for PASS
    let strokeWidth = 1.8;
    let isAnimated = edge.animated ?? true;

    if (severity === 'CRITICAL') {
      strokeColor = '#e11d48'; // Bold pulsing red for CRITICAL ungoverned
      strokeWidth = 2.8;
      isAnimated = true;
    } else if (severity === 'WARN') {
      strokeColor = '#d97706'; // Amber for WARN
      strokeWidth = 2.0;
    }

    const hasSecureTransport =
      `${edge.label || ''} ${edge.data?.protocol || ''} ${edge.data?.encryption || ''}`.toLowerCase().includes('tls') ||
      edge.data?.encryptionAtRestAndTransit === true;

    return {
      ...edge,
      animated: isAnimated,
      style: {
        ...edge.style,
        stroke: strokeColor,
        strokeWidth,
      },
      data: {
        ...edge.data,
        protocol: edge.data?.protocol || (typeof edge.label === 'string' ? edge.label : 'HTTPS / REST'),
        schemaContract: edge.data?.schemaContract || (edge.data?.payloadFormat ? `${edge.data.payloadFormat} Contract` : 'JSON Schema Draft-07'),
        timelinessSla: edge.data?.timelinessSla || (edge.data?.frequency ? String(edge.data.frequency) : 'Real-time (<500ms)'),
        encryptionAtRestAndTransit: hasSecureTransport,
        dqStatus: severity,
        dqViolations: violations,
      },
    };
  });

  // 3. Update Node Data Quality Rules & Health Scores
  const lintedNodes: CustomDfdNode[] = nodes.map((node) => {
    if (node.type === 'group') return node;

    const existingDq = node.data.dataQuality;
    const rules: DataQualityRule[] = existingDq?.rules ? [...existingDq.rules] : [];
    let score = existingDq?.score ?? 100;
    const hasQuarantineDLQ = hasDeadLetterQueue(node);

    // Apply contract mismatch penalties
    const nodeMismatches = sourceChildMismatches.filter(
      (m) => m.sourceNodeId === node.id || m.childNodeId === node.id || m.pathNodeIds.includes(node.id)
    );

    nodeMismatches.forEach((m) => {
      rules.push({
        dimension: m.dimension,
        ruleDescription: `${m.title}: ${m.message}`,
        status: m.severity,
      });

      if (m.severity === 'CRITICAL') {
        score = Math.max(20, score - 25);
      } else if (m.severity === 'WARN') {
        score = Math.max(40, score - 12);
      }
    });

    // Deduplicate rules by dimension
    const uniqueRules = rules.reduce<DataQualityRule[]>((acc, cur) => {
      const existing = acc.find((r) => r.dimension === cur.dimension);
      if (!existing) {
        acc.push(cur);
      } else if (cur.status === 'CRITICAL' && existing.status !== 'CRITICAL') {
        existing.status = 'CRITICAL';
        existing.ruleDescription = cur.ruleDescription;
      }
      return acc;
    }, []);

    // Ensure baseline DQ rules if empty
    if (uniqueRules.length === 0) {
      if (node.type === 'sourceNode') {
        uniqueRules.push(
          { dimension: 'Completeness', ruleDescription: 'NOT NULL checks on mandatory payload fields', status: 'PASS' },
          { dimension: 'Accuracy', ruleDescription: 'Origin schema checksum & signature verification', status: 'PASS' }
        );
      } else if (node.type === 'operationNode') {
        uniqueRules.push(
          { dimension: 'Validity', ruleDescription: 'Regex, range & ISO format validation in transit', status: 'PASS' },
          { dimension: 'Uniqueness', ruleDescription: 'Idempotency key & record deduplication check', status: 'PASS' }
        );
      } else {
        uniqueRules.push(
          { dimension: 'Consistency', ruleDescription: 'Reconciliation and cross-system referential integrity', status: 'PASS' }
        );
      }
    }

    return {
      ...node,
      data: {
        ...node.data,
        dataQuality: {
          score: Math.min(100, Math.max(0, score)),
          slaLatency: existingDq?.slaLatency || node.data.metadata?.sla || '< 500ms',
          hasQuarantineDLQ,
          rules: uniqueRules,
        },
      },
    };
  });

  // Calculate Summary metrics
  const criticalCount = diagnostics.filter((d) => d.severity === 'CRITICAL').length;
  const warnCount = diagnostics.filter((d) => d.severity === 'WARN').length;
  const passCount = Math.max(0, nodes.length + edges.length - criticalCount - warnCount);
  const totalChecked = nodes.length + edges.length;

  const penalty = criticalCount * 20 + warnCount * 7;
  const overallHealthScore = Math.max(10, Math.min(100, Math.round(100 - penalty)));

  return {
    nodes: lintedNodes,
    edges: lintedEdges,
    summary: {
      criticalCount,
      warnCount,
      passCount,
      totalChecked,
      overallHealthScore,
      sourceChildContractViolationCount: sourceChildMismatches.length,
    },
    diagnostics,
    sourceChildMismatches,
  };
}

export type SourceDirectActionType =
  | 'insert-validator'
  | 'insert-masking'
  | 'enforce-mtls'
  | 'upgrade-streaming'
  | 'route-sinkhole';

/**
 * Act directly upon a Source node with an architectural governance operation
 */
export function executeSourceAction(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[],
  sourceNodeId: string,
  action: SourceDirectActionType
): { nodes: CustomDfdNode[]; edges: CustomDfdEdge[]; actionSummary: string } {
  const srcNode = nodes.find((n) => n.id === sourceNodeId);
  if (!srcNode) {
    return { nodes, edges, actionSummary: 'Source node not found.' };
  }

  let nextNodes = [...nodes];
  let nextEdges = [...edges];
  const suffix = Date.now().toString().slice(-4);

  if (action === 'enforce-mtls') {
    let updatedCount = 0;
    nextEdges = nextEdges.map((e) => {
      if (e.source === sourceNodeId) {
        updatedCount++;
        return {
          ...e,
          label: 'mTLS 1.3 / HTTPS',
          data: {
            ...e.data,
            protocol: 'mTLS 1.3 / HTTPS',
            encryption: 'mTLS',
            payloadFormat: e.data?.payloadFormat || 'JSON',
            schemaContract: e.data?.schemaContract || 'JSON Schema Draft-07',
            timelinessSla: e.data?.timelinessSla || 'Real-time (<250ms)',
            encryptionAtRestAndTransit: true,
          },
        };
      }
      return e;
    });

    nextNodes = nextNodes.map((n) =>
      n.id === sourceNodeId
        ? {
            ...n,
            data: {
              ...n.data,
              metadata: {
                ...n.data.metadata,
                protocol: 'mTLS 1.3 / HTTPS',
              },
            },
          }
        : n
    );

    return {
      nodes: nextNodes,
      edges: nextEdges,
      actionSummary: `Enforced mTLS 1.3 & schema contract on ${updatedCount || 1} outbound route(s) from "${srcNode.data.label}".`,
    };
  }

  if (action === 'upgrade-streaming') {
    nextNodes = nextNodes.map((n) =>
      n.id === sourceNodeId
        ? {
            ...n,
            data: {
              ...n.data,
              metadata: {
                ...n.data.metadata,
                protocol: 'Kafka Event Stream / mTLS',
                technology: 'Kafka Producer',
                sla: 'Real-time (<150ms)',
              },
              dataQuality: {
                ...n.data.dataQuality,
                slaLatency: 'Real-time (<150ms)',
              },
            },
          }
        : n
    );

    nextEdges = nextEdges.map((e) =>
      e.source === sourceNodeId
        ? {
            ...e,
            label: 'Kafka Stream (mTLS)',
            data: {
              ...e.data,
              protocol: 'Kafka Stream (mTLS)',
              encryption: 'mTLS',
              timelinessSla: 'Real-time (<150ms)',
              schemaContract: e.data?.schemaContract || 'Avro Schema v2.1',
              encryptionAtRestAndTransit: true,
            },
          }
        : e
    );

    return {
      nodes: nextNodes,
      edges: nextEdges,
      actionSummary: `Upgraded Source "${srcNode.data.label}" to Real-Time Event Streaming (<150ms SLA).`,
    };
  }

  if (action === 'insert-validator' || action === 'insert-masking') {
    const isMasking = action === 'insert-masking';
    const opId = `op-${isMasking ? 'mask' : 'val'}-${sourceNodeId}-${suffix}`;
    const opLabel = isMasking
      ? `${srcNode.data.label} PII Tokenizer & Masking`
      : `${srcNode.data.label} Schema Validator & DLQ Gate`;

    const newOpNode: CustomDfdNode = {
      id: opId,
      type: 'operationNode',
      position: {
        x: (srcNode.position?.x || 100) + 260,
        y: srcNode.position?.y || 150,
      },
      parentId: srcNode.parentId,
      extent: srcNode.parentId ? 'parent' : undefined,
      data: {
        label: opLabel,
        category: 'Operations',
        description: isMasking
          ? 'Cryptographic field-level PII tokenization, masking, and format-preserving encryption with DLQ quarantine.'
          : 'Deterministic JSON/ISO schema validation, payload sanitization, and Dead-Letter Queue (DLQ) exception isolation.',
        metadata: {
          processType: isMasking ? 'PII Masking & Tokenization' : 'Schema Validation & DLQ',
          technology: isMasking ? 'HSM Vault Tokenizer' : 'Schema Registry Gate + DLQ',
          sla: 'Real-time (<150ms)',
          dataClassification: srcNode.data.metadata?.dataClassification || 'CONFIDENTIAL',
        },
        dataQuality: {
          score: 100,
          slaLatency: 'Real-time (<150ms)',
          hasQuarantineDLQ: true,
          rules: [
            {
              dimension: isMasking ? 'Accuracy' : 'Validity',
              ruleDescription: isMasking
                ? 'Cryptographic PII masking & tokenization enforced before sink persistence'
                : 'Strict schema contract validation with DLQ quarantine routing',
              status: 'PASS',
            },
          ],
        },
      },
    };

    const outgoingEdges = nextEdges.filter((e) => e.source === sourceNodeId);
    nextNodes.push(newOpNode);

    if (outgoingEdges.length > 0) {
      // Rewire existing outgoing edges from Source to come from newOpNode, and add Source -> newOpNode edge
      nextEdges = nextEdges.map((e) => {
        if (e.source === sourceNodeId) {
          return {
            ...e,
            id: `e-${opId}-${e.target}-${suffix}`,
            source: opId,
            label: isMasking ? 'Tokenized / mTLS 1.3' : 'Validated / mTLS 1.3',
            data: {
              ...e.data,
              protocol: isMasking ? 'Tokenized / mTLS 1.3' : 'Validated / mTLS 1.3',
              encryption: 'mTLS',
              schemaContract: e.data?.schemaContract || 'JSON Schema Draft-07',
              timelinessSla: e.data?.timelinessSla || 'Real-time (<250ms)',
              encryptionAtRestAndTransit: true,
            },
          };
        }
        return e;
      });
    } else {
      // Connect newOpNode to first available Child node if Source had 0 outgoing edges
      const firstChild = nextNodes.find((n) => n.type === 'childNode' || n.data.category === 'Child');
      if (firstChild) {
        nextEdges.push({
          id: `e-${opId}-${firstChild.id}-${suffix}`,
          source: opId,
          target: firstChild.id,
          type: 'dataContractEdge',
          animated: true,
          label: 'mTLS 1.3 / Validated',
          data: {
            protocol: 'mTLS 1.3 / Validated',
            encryption: 'mTLS',
            payloadFormat: 'JSON',
            schemaContract: 'JSON Schema Draft-07',
            timelinessSla: 'Real-time (<250ms)',
            encryptionAtRestAndTransit: true,
          },
        });
      }
    }

    // Add edge from Source -> newOpNode
    nextEdges.push({
      id: `e-${sourceNodeId}-${opId}-${suffix}`,
      source: sourceNodeId,
      target: opId,
      type: 'dataContractEdge',
      animated: true,
      label: 'mTLS 1.3 / Ingress',
      data: {
        protocol: 'mTLS 1.3 / Ingress',
        encryption: 'mTLS',
        payloadFormat: 'JSON',
        schemaContract: 'JSON Schema Draft-07',
        timelinessSla: 'Real-time (<150ms)',
        encryptionAtRestAndTransit: true,
      },
    });

    return {
      nodes: nextNodes,
      edges: nextEdges,
      actionSummary: `Inserted "${opLabel}" downstream of Source "${srcNode.data.label}".`,
    };
  }

  if (action === 'route-sinkhole') {
    const existingOp = nextNodes.find((n) => n.type === 'operationNode' || n.data.category === 'Operations');
    const existingChild = nextNodes.find((n) => n.type === 'childNode' || n.data.category === 'Child');
    const targetNode = existingOp || existingChild;

    if (targetNode) {
      nextEdges.push({
        id: `e-${sourceNodeId}-${targetNode.id}-${suffix}`,
        source: sourceNodeId,
        target: targetNode.id,
        type: 'dataContractEdge',
        animated: true,
        label: 'mTLS 1.3 / Governed',
        data: {
          protocol: 'mTLS 1.3 / Governed',
          encryption: 'mTLS',
          payloadFormat: 'JSON',
          schemaContract: 'JSON Schema Draft-07',
          timelinessSla: 'Real-time (<250ms)',
          encryptionAtRestAndTransit: true,
        },
      });
      return {
        nodes: nextNodes,
        edges: nextEdges,
        actionSummary: `Routed Source "${srcNode.data.label}" to "${targetNode.data.label}" with mTLS 1.3 contract.`,
      };
    }

    // Otherwise insert a validator operation
    return executeSourceAction(nodes, edges, sourceNodeId, 'insert-validator');
  }

  return { nodes: nextNodes, edges: nextEdges, actionSummary: 'Executed action on Source.' };
}

/**
 * Remediate a specific Source-Child Contract Mismatch by acting upon the Source and its pipeline
 */
export function actUponSourceMismatch(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[],
  mismatch: SourceChildContractMismatch
): { nodes: CustomDfdNode[]; edges: CustomDfdEdge[]; actionSummary: string } {
  const suffix = Date.now().toString().slice(-4);
  let nextNodes = [...nodes];
  let nextEdges = [...edges];

  switch (mismatch.mismatchType) {
    case 'DATA_SINKHOLE': {
      return executeSourceAction(nodes, edges, mismatch.sourceNodeId, 'route-sinkhole');
    }

    case 'UNFED_TARGET': {
      const targetId = mismatch.childNodeId;
      const opNode = nextNodes.find((n) => n.type === 'operationNode' || n.data.category === 'Operations');
      const srcNode = nextNodes.find((n) => n.type === 'sourceNode' || n.data.category === 'Source');
      const upstream = opNode || srcNode;
      if (upstream && targetId !== 'NONE') {
        nextEdges.push({
          id: `e-${upstream.id}-${targetId}-${suffix}`,
          source: upstream.id,
          target: targetId,
          type: 'dataContractEdge',
          animated: true,
          label: 'mTLS 1.3 / Governed',
          data: {
            protocol: 'mTLS 1.3 / Governed',
            encryption: 'mTLS',
            payloadFormat: 'JSON',
            schemaContract: 'JSON Schema Draft-07',
            timelinessSla: 'Real-time (<250ms)',
            encryptionAtRestAndTransit: true,
          },
        });
        return {
          nodes: nextNodes,
          edges: nextEdges,
          actionSummary: `Connected upstream "${upstream.data.label}" to unfed sink "${mismatch.childLabel}".`,
        };
      }
      return { nodes, edges, actionSummary: 'No upstream origin available to feed target.' };
    }

    case 'DIRECT_INGESTION_BYPASS': {
      const srcNode = nextNodes.find((n) => n.id === mismatch.sourceNodeId);
      const tgtNode = nextNodes.find((n) => n.id === mismatch.childNodeId);
      if (!srcNode || !tgtNode) return { nodes, edges, actionSummary: 'Endpoints not found.' };

      const opId = `op-gate-${srcNode.id}-${tgtNode.id}-${suffix}`;
      const opLabel = `${srcNode.data.label} Schema & DQ Gate`;
      const newOp: CustomDfdNode = {
        id: opId,
        type: 'operationNode',
        position: {
          x: ((srcNode.position?.x || 100) + (tgtNode.position?.x || 400)) / 2,
          y: ((srcNode.position?.y || 150) + (tgtNode.position?.y || 150)) / 2,
        },
        parentId: srcNode.parentId || tgtNode.parentId,
        extent: srcNode.parentId || tgtNode.parentId ? 'parent' : undefined,
        data: {
          label: opLabel,
          category: 'Operations',
          description: 'Enforces schema validation, data cleansing, PII tokenization, and DLQ exception quarantine.',
          metadata: {
            processType: 'Schema Validation & Tokenization',
            technology: 'DAMA Validation Gate + DLQ',
            sla: 'Real-time (<150ms)',
            dataClassification: srcNode.data.metadata?.dataClassification || 'CONFIDENTIAL',
          },
          dataQuality: {
            score: 100,
            slaLatency: 'Real-time (<150ms)',
            hasQuarantineDLQ: true,
            rules: [
              {
                dimension: 'Validity',
                ruleDescription: 'Schema validation & sanitization gate with DLQ isolation',
                status: 'PASS',
              },
            ],
          },
        },
      };

      nextNodes.push(newOp);
      // Remove direct edge between srcNode and tgtNode
      nextEdges = nextEdges.filter(
        (e) => !(e.source === mismatch.sourceNodeId && e.target === mismatch.childNodeId)
      );
      nextEdges.push(
        {
          id: `e-${srcNode.id}-${opId}-${suffix}`,
          source: srcNode.id,
          target: opId,
          type: 'dataContractEdge',
          animated: true,
          label: 'mTLS 1.3 / Ingress',
          data: {
            protocol: 'mTLS 1.3 / Ingress',
            encryption: 'mTLS',
            payloadFormat: 'JSON',
            schemaContract: 'JSON Schema Draft-07',
            timelinessSla: 'Real-time (<150ms)',
            encryptionAtRestAndTransit: true,
          },
        },
        {
          id: `e-${opId}-${tgtNode.id}-${suffix}`,
          source: opId,
          target: tgtNode.id,
          type: 'dataContractEdge',
          animated: true,
          label: 'mTLS 1.3 / Validated',
          data: {
            protocol: 'mTLS 1.3 / Validated',
            encryption: 'mTLS',
            payloadFormat: 'JSON',
            schemaContract: 'JSON Schema Draft-07',
            timelinessSla: 'Real-time (<200ms)',
            encryptionAtRestAndTransit: true,
          },
        }
      );

      return {
        nodes: nextNodes,
        edges: nextEdges,
        actionSummary: `Remediated Direct Bypass: Inserted "${opLabel}" between "${mismatch.sourceLabel}" and "${mismatch.childLabel}".`,
      };
    }

    case 'CLASSIFICATION_DOWNGRADE': {
      // Check if there is an intermediate operation we can upgrade with PII Tokenization & Masking + DLQ
      const intermediateIds = mismatch.pathNodeIds.slice(1, -1);
      if (intermediateIds.length > 0) {
        const targetOpId = intermediateIds[0];
        nextNodes = nextNodes.map((n) => {
          if (n.id === targetOpId) {
            const existingLabel = n.data.label;
            const updatedLabel = existingLabel.toLowerCase().includes('mask') || existingLabel.toLowerCase().includes('token')
              ? existingLabel
              : `${existingLabel} + PII Tokenization`;
            return {
              ...n,
              data: {
                ...n.data,
                label: updatedLabel,
                description: `${n.data.description || ''} Enforces cryptographic PII masking, tokenization, and DLQ quarantine.`,
                metadata: {
                  ...n.data.metadata,
                  processType: 'PII Masking & Tokenization',
                  technology: 'HSM Tokenization + DLQ',
                },
                dataQuality: {
                  ...n.data.dataQuality,
                  hasQuarantineDLQ: true,
                },
              },
            };
          }
          return n;
        });
        return {
          nodes: nextNodes,
          edges: nextEdges,
          actionSummary: `Enabled Cryptographic PII Masking & Tokenization on pipeline from Source "${mismatch.sourceLabel}".`,
        };
      }
      return executeSourceAction(nodes, edges, mismatch.sourceNodeId, 'insert-masking');
    }

    case 'SCHEMA_SERIALIZATION_MISMATCH': {
      const srcFormat = mismatch.sourceContract.format || 'Binary';
      const tgtFormat = mismatch.childContract.format || 'JSON';
      const intermediateIds = mismatch.pathNodeIds.slice(1, -1);
      if (intermediateIds.length > 0) {
        const opId = intermediateIds[0];
        nextNodes = nextNodes.map((n) =>
          n.id === opId
            ? {
                ...n,
                data: {
                  ...n.data,
                  label: `${n.data.label} (${srcFormat}→${tgtFormat} Converter)`,
                  description: `${n.data.description || ''} Includes schema format parser & ${srcFormat}-to-${tgtFormat} serializer with DLQ.`,
                  metadata: {
                    ...n.data.metadata,
                    processType: 'Format Converter & ETL',
                  },
                  dataQuality: {
                    ...n.data.dataQuality,
                    hasQuarantineDLQ: true,
                  },
                },
              }
            : n
        );
        return {
          nodes: nextNodes,
          edges: nextEdges,
          actionSummary: `Attached ${srcFormat}-to-${tgtFormat} Schema Adapter on pipeline from "${mismatch.sourceLabel}".`,
        };
      }
      return executeSourceAction(nodes, edges, mismatch.sourceNodeId, 'insert-validator');
    }

    case 'TIMELINESS_SLA_MISMATCH': {
      // Upgrade Source & Intermediate Operations to event-driven streaming with Kafka buffer
      nextNodes = nextNodes.map((n) => {
        if (n.id === mismatch.sourceNodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              label: n.data.label.replace(/batch|nightly|daily|sftp|csv/gi, 'Stream').trim(),
              metadata: {
                ...n.data.metadata,
                protocol: 'Kafka Event Stream / mTLS',
                technology: 'Kafka Streaming Ingress',
                sla: 'Real-time (<200ms)',
              },
              dataQuality: {
                ...n.data.dataQuality,
                slaLatency: 'Real-time (<200ms)',
              },
            },
          };
        }
        if (mismatch.pathNodeIds.slice(1, -1).includes(n.id)) {
          return {
            ...n,
            data: {
              ...n.data,
              metadata: {
                ...n.data.metadata,
                technology: `${n.data.metadata?.technology || 'Processor'} + Kafka Buffer`,
                sla: 'Real-time (<200ms)',
              },
              dataQuality: {
                ...n.data.dataQuality,
                hasQuarantineDLQ: true,
              },
            },
          };
        }
        return n;
      });

      return {
        nodes: nextNodes,
        edges: nextEdges,
        actionSummary: `Reconciled Source "${mismatch.sourceLabel}" SLA cadence & added Kafka streaming backpressure buffer.`,
      };
    }

    case 'MISSING_DLQ_QUARANTINE': {
      const intermediateIds = mismatch.pathNodeIds.slice(1, -1);
      nextNodes = nextNodes.map((n) => {
        if (intermediateIds.includes(n.id)) {
          return {
            ...n,
            data: {
              ...n.data,
              description: `${n.data.description || ''} Configured with air-gapped Dead-Letter Queue (DLQ) exception quarantine.`,
              metadata: {
                ...n.data.metadata,
                technology: `${n.data.metadata?.technology || 'Engine'} + DLQ`,
              },
              dataQuality: {
                ...n.data.dataQuality,
                hasQuarantineDLQ: true,
              },
            },
          };
        }
        return n;
      });
      return {
        nodes: nextNodes,
        edges: nextEdges,
        actionSummary: `Configured Dead-Letter Queue (DLQ) exception isolation for Source "${mismatch.sourceLabel}" pipeline.`,
      };
    }

    case 'BOUNDARY_ENCRYPTION_VIOLATION': {
      nextEdges = nextEdges.map((e) => {
        if (mismatch.pathNodeIds.includes(e.source) && mismatch.pathNodeIds.includes(e.target)) {
          return {
            ...e,
            label: 'mTLS 1.3 / Encrypted',
            data: {
              ...e.data,
              protocol: 'mTLS 1.3 / Encrypted',
              encryption: 'mTLS',
              encryptionAtRestAndTransit: true,
              schemaContract: e.data?.schemaContract || 'JSON Schema Draft-07',
              timelinessSla: e.data?.timelinessSla || 'Real-time (<250ms)',
            },
          };
        }
        return e;
      });
      return {
        nodes: nextNodes,
        edges: nextEdges,
        actionSummary: `Enforced mTLS 1.3 transport encryption across trust boundary for Source "${mismatch.sourceLabel}".`,
      };
    }

    default:
      return executeSourceAction(nodes, edges, mismatch.sourceNodeId, 'enforce-mtls');
  }
}

/**
 * Remediate all active Source-Child contract mismatches and edge contract gaps in one pass
 */
export function remediateAllSourceMismatches(
  nodes: CustomDfdNode[],
  edges: CustomDfdEdge[]
): { nodes: CustomDfdNode[]; edges: CustomDfdEdge[]; remediatedCount: number } {
  let currentNodes = [...nodes];
  let currentEdges = [...edges];
  let remediatedCount = 0;

  // Iteratively resolve mismatches up to 5 passes
  for (let pass = 0; pass < 5; pass++) {
    const lint = runDeterministicDqLinter(currentNodes, currentEdges);
    const mismatches = lint.sourceChildMismatches || [];
    if (mismatches.length === 0) break;

    const firstMismatch = mismatches[0];
    const res = actUponSourceMismatch(currentNodes, currentEdges, firstMismatch);
    currentNodes = res.nodes;
    currentEdges = res.edges;
    remediatedCount++;
  }

  // Also ensure all edges have explicit schemaContract, timelinessSla, and mTLS encryption
  currentEdges = currentEdges.map((e) => ({
    ...e,
    label: e.label || 'mTLS 1.3 / HTTPS',
    data: {
      ...e.data,
      protocol: e.data?.protocol || 'mTLS 1.3 / HTTPS',
      encryption: e.data?.encryption && e.data.encryption !== 'None (Air-gapped)' ? e.data.encryption : 'mTLS',
      payloadFormat: e.data?.payloadFormat || 'JSON',
      schemaContract: e.data?.schemaContract || 'JSON Schema Draft-07',
      timelinessSla: e.data?.timelinessSla || 'Real-time (<250ms)',
      encryptionAtRestAndTransit: true,
    },
  }));

  return {
    nodes: currentNodes,
    edges: currentEdges,
    remediatedCount,
  };
}


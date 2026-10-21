/**
 * Air-Gapped Local LLM API Service
 * Handles communication with local inference daemons (Ollama, LM Studio, Unsloth, vLLM)
 * via OpenAI-compatible /v1/chat/completions.
 * Features strict JSON schema enforcement, timeouts, exponential backoff retries,
 * robust JSON sanitization for quantized models, and deterministic air-gapped fallback.
 */

import { AssessmentInputPayload, RawLlmGraphOutput, LlmConfig } from '../types/dfd';

export const SYSTEM_PROMPT = `You are an expert Enterprise Data Architect and Business Process Engine. Your sole task is to compile Structured Descriptive Data Flow inputs adhering to the Enterprise 5-Layer Architecture Taxonomy into a valid JSON graph formatted strictly for @xyflow/react.

### ENTERPRISE 5-LAYER ARCHITECTURE TAXONOMY:
1. Source Layer: Originating systems, actors, portals, sensors, or ingress gateways.
2. Operations Layer: Business processes, data transformations, enrichment, or operational steps.
3. Child / Sink Layer: Target systems, downstream databases, or dependent consumer services.
4. Infra Layer: Infrastructure boundaries, servers, clusters, or message buses.
5. Architecture Layer: Trust boundaries, network zones, protocols, and encryption standards.

### MAPPING RULES FOR @xyflow/react:
1. Architecture & Infra Boundaries (Group Nodes):
   - Map major Infra or Architecture zones (e.g., "DMZ", "Internal K8s Cluster", "On-Premises DB Zone", "PCI-DSS Enclave") as parent container nodes with "type": "group".
2. Source, Operations, and Child (Child Nodes):
   - Map Source entities to "type": "sourceNode".
   - Map Operations (business/process steps) to "type": "operationNode".
   - Map Child entities to "type": "childNode".
   - If a Source, Operation, or Child resides within a specific Infra or Architecture boundary, set its "parentId" to the ID of that group node and add "extent": "parent".
3. Data Flow Connections (Edges):
   - Connect Source -> Operations -> Child logically based on the business process flow.
   - Extract protocols or data payload details from Architecture and Operations and place them in the edge "label" (e.g., "mTLS / REST", "Kafka Stream", "JDBC Batch").
   - Set "animated": true for real-time or active process flows.
4. Positioning:
   - Set all node "position": { "x": 0, "y": 0 } (the frontend Dagre engine will calculate exact coordinates).

### DATA QUALITY (DQ) GOVERNANCE RULES:
You must also evaluate the business flow against the 6 Enterprise Data Quality Dimensions (Completeness, Accuracy, Validity, Consistency, Uniqueness, Timeliness):
1. For every \`sourceNode\`, \`operationNode\`, and \`childNode\`, populate \`data.dataQuality\`:
   - Assign \`rules\`: Array of applicable DQ dimensions and specific validation rules inferred from the flow.
   - Assign \`status\`:
     - "PASS" if explicit validation, schema checks, deduplication, or masking are mentioned in Operations.
     - "WARN" if data moves from Source to Child without explicit schema validation or deduplication.
     - "CRITICAL" if external/untrusted Source data writes directly to a Child DB without an intervening Operation node.
   - Set \`hasQuarantineDLQ\`: true if error-handling/dead-letter queues are present, false otherwise.
   - Estimate \`score\` (0-100) based on how well the node is governed.
2. For every \`edge\`, include a \`data\` object with \`schemaContract\` (e.g., "Avro v2.1", "JSON Schema Draft-07", "Protobuf") and \`timelinessSla\` (e.g., "Real-time (<500ms)", "15m Micro-batch", "Daily Batch").

### STRICT OUTPUT CONSTRAINTS:
- Output ONLY raw, valid JSON. Do NOT wrap the output in markdown code blocks (no \`\`\`json). Do NOT include explanations.
- Adhere strictly to the following JSON schema:
{
  "nodes": [
    {
      "id": "string (unique, e.g., 'infra-1', 'src-1', 'op-1', 'child-1')",
      "type": "group | sourceNode | operationNode | childNode",
      "parentId": "string (optional, ID of parent group node)",
      "extent": "parent (optional, include ONLY if parentId is present)",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "string (concise display name)",
        "category": "Source | Child | Infra | Operations | Architecture",
        "metadata": {
          "infraType": "string (optional)",
          "securityZone": "string (optional)",
          "processType": "string (optional)",
          "protocol": "string (optional)",
          "dataClassification": "string (optional)"
        },
        "dataQuality": {
          "score": 95,
          "slaLatency": "< 500ms",
          "hasQuarantineDLQ": true,
          "rules": [
            {
              "dimension": "Completeness",
              "ruleDescription": "NOT NULL checks on mandatory payload fields",
              "status": "PASS"
            }
          ]
        }
      }
    }
  ],
  "edges": [
    {
      "id": "string (unique, e.g., 'e-src1-op1')",
      "source": "string (source node id)",
      "target": "string (target node id)",
      "label": "string (protocol, operation, or data payload)",
      "animated": true,
      "type": "dataContractEdge",
      "data": {
        "protocol": "string",
        "schemaContract": "string",
        "timelinessSla": "string",
        "encryptionAtRestAndTransit": true
      }
    }
  ]
}`;

export const DEFAULT_LLM_CONFIGS: Record<string, LlmConfig> = {
  ollama: {
    provider: 'ollama',
    endpointUrl: 'http://localhost:11434/v1/chat/completions',
    modelName: 'llama3.2:latest',
    temperature: 0.1,
    timeoutMs: 35000,
    retryAttempts: 2,
  },
  lmstudio: {
    provider: 'lmstudio',
    endpointUrl: 'http://localhost:1234/v1/chat/completions',
    modelName: 'local-model',
    temperature: 0.1,
    timeoutMs: 35000,
    retryAttempts: 2,
  },
  unsloth: {
    provider: 'unsloth',
    endpointUrl: 'http://localhost:8000/v1/chat/completions',
    modelName: 'unsloth-qwen-14b',
    temperature: 0.1,
    timeoutMs: 40000,
    retryAttempts: 2,
  },
  airgappedDeterministic: {
    provider: 'airgapped-deterministic',
    endpointUrl: 'local://deterministic-engine',
    modelName: 'air-gapped-expert-rules-v1',
    temperature: 0.0,
    timeoutMs: 5000,
    retryAttempts: 1,
  },
};

/**
 * Robust JSON Sanitizer tailored for quantized local LLMs (e.g., Llama 3 8B, Qwen 2.5 7B)
 * which frequently prepend greetings or append markdown fences despite instructions.
 */
export function sanitizeAndParseLlmJson(rawOutput: string): RawLlmGraphOutput {
  if (!rawOutput || typeof rawOutput !== 'string') {
    throw new Error('LLM output is empty or not a string.');
  }

  let text = rawOutput.trim();

  // 1. Remove markdown code blocks if wrapped
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  }

  // 2. Extract substring between first '{' and last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // 3. Fix common JSON syntax errors produced by quantized LLMs:
  // - Trailing commas before closing braces/brackets
  text = text.replace(/,\s*([}\]])/g, '$1');

  // - Strip single line comments if LLM added them
  text = text.replace(/\/\/.*$/gm, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    // Attempt second repair: Replace smart quotes and unescaped control chars
    const cleanedText = text
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\x00-\x1F\x7F]/g, (char) => (char === '\n' || char === '\r' || char === '\t' ? char : ''));

    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      throw new Error(
        `Failed to parse JSON response from local LLM: ${(err as Error).message}. Snippet: "${text.slice(0, 160)}..."`
      );
    }
  }

  // 4. Validate graph structural schema
  const graph = parsed as RawLlmGraphOutput;
  if (!graph || typeof graph !== 'object') {
    throw new Error('Invalid JSON payload structure: Expected root object.');
  }

  if (!Array.isArray(graph.nodes)) {
    graph.nodes = [];
  }
  if (!Array.isArray(graph.edges)) {
    graph.edges = [];
  }

  // Normalize nodes
  graph.nodes = graph.nodes.map((node, index) => {
    const id = String(node.id || `node-${index + 1}`);
    const rawType = node.type as string;
    let type: 'group' | 'sourceNode' | 'operationNode' | 'childNode' = 'operationNode';
    if (rawType === 'group') type = 'group';
    else if (rawType === 'sourceNode' || rawType === 'source') type = 'sourceNode';
    else if (rawType === 'childNode' || rawType === 'child' || rawType === 'target') type = 'childNode';
    else type = 'operationNode';

    const parentId = node.parentId ? String(node.parentId) : undefined;

    return {
      id,
      type,
      parentId,
      extent: parentId ? ('parent' as const) : undefined,
      position: { x: node.position?.x ?? 0, y: node.position?.y ?? 0 },
      data: {
        label: node.data?.label || id,
        category: node.data?.category || (type === 'group' ? 'Infra' : type === 'sourceNode' ? 'Source' : type === 'childNode' ? 'Child' : 'Operations'),
        metadata: node.data?.metadata || {},
      },
    };
  });

  // Normalize edges
  graph.edges = graph.edges.map((edge, index) => {
    const rawLabel = edge.label ? String(edge.label) : 'HTTPS / REST';
    return {
      id: String(edge.id || `e-${edge.source}-${edge.target}-${index}`),
      source: String(edge.source),
      target: String(edge.target),
      label: edge.label ? String(edge.label) : undefined,
      animated: edge.animated ?? true,
      type: edge.type || 'dataContractEdge',
      data: {
        protocol: edge.data?.protocol || rawLabel,
        schemaContract: edge.data?.schemaContract || 'JSON Schema Draft-07',
        timelinessSla: edge.data?.timelinessSla || 'Real-time (<500ms)',
        encryptionAtRestAndTransit: edge.data?.encryptionAtRestAndTransit ?? true,
        ...(edge.data || {}),
      },
    };
  });

  return graph;
}

/**
 * Format the 5 dimensions into the structured prompt content
 */
export function buildUserPromptFromPayload(payload: AssessmentInputPayload): string {
  const parts: string[] = [];

  parts.push('Please generate the @xyflow/react graph for this enterprise data flow:');

  if (payload.metadata) {
    parts.push(`\nSYSTEM METADATA:`);
    parts.push(`- System Name: ${payload.metadata.systemName}`);
    parts.push(`- Assessment ID: ${payload.metadata.assessmentId}`);
    parts.push(`- Environment: ${payload.metadata.environment}`);
    parts.push(`- Classification: ${payload.metadata.classificationLevel}`);
    if (payload.metadata.complianceFrameworks?.length) {
      parts.push(`- Compliance: ${payload.metadata.complianceFrameworks.join(', ')}`);
    }
  }

  if (payload.ingestionChannel) {
    const ic = payload.ingestionChannel;
    parts.push(`\nINGESTION CHANNEL BASE DATA (10-DIMENSION STATUTORY & ENTERPRISE SCOPE):`);
    parts.push(`- Context of Processing: ${ic.contextOfProcessing.businessPurpose} (${ic.contextOfProcessing.sector}, Lawful Basis: ${ic.contextOfProcessing.lawfulBasis}, Child Data <18: ${ic.contextOfProcessing.processesChildData})`);
    parts.push(`- Data Usage & AI/ML: ${ic.dataUsage.processingActivities.join(', ')} (Uses AI/ML: ${ic.dataUsage.usesAiMlModels})`);
    parts.push(`- Data Movement: ${ic.dataMovement.ingressChannels.join(', ')} via ${ic.dataMovement.transitProtocols.join(', ')} (${ic.dataMovement.movementCadence})`);
    parts.push(`- Data Storage: ${ic.dataStorage.repositories.join(', ')} (${ic.dataStorage.encryptionAtRest}, Region: ${ic.dataStorage.primaryRegion})`);
    parts.push(`- Data Privacy: PII [${ic.dataPrivacy.piiCategories.join(', ')}], Consent: ${ic.dataPrivacy.consentManager}`);
    parts.push(`- Cross-Border: Active=${ic.crossBorderComponent.hasCrossBorderTransfer}, Jurisdictions=[${ic.crossBorderComponent.destinationJurisdictions.join(', ')}]`);
    parts.push(`- Trusted Apps & Data Sources: ${ic.trustedAppsAndSources.map((a) => `${a.id}:${a.name} (${a.category}, Trusted=${a.trusted})`).join('; ')}`);
    parts.push(`- Third Party Involvement: ${ic.thirdPartyInvolvement.processors.map((p) => `${p.name} (${p.destinationCountry})`).join('; ')}`);
    parts.push(`- RoPA / High-Volume: ${ic.ropaMapping.ropaRecordId}, Volume=${ic.ropaMapping.estimatedVolume}, Role=${ic.ropaMapping.assessedRole}`);
  }

  parts.push(`\n1. SOURCE (Origins/Triggers):\n${payload.source.map((s) => ` - ${s}`).join('\n') || ' None specified'}`);
  parts.push(`\n2. CHILD (Targets/Dependencies):\n${payload.child.map((c) => ` - ${c}`).join('\n') || ' None specified'}`);
  parts.push(`\n3. INFRA (Hosting/Clusters/Brokers):\n${payload.infra.map((i) => ` - ${i}`).join('\n') || ' None specified'}`);
  parts.push(`\n4. OPERATIONS (Logic/Transformations/Batch):\n${payload.operations.map((o) => ` - ${o}`).join('\n') || ' None specified'}`);
  parts.push(`\n5. ARCHITECTURE (Trust Zones/Protocols/Boundaries):\n${payload.architecture.map((a) => ` - ${a}`).join('\n') || ' None specified'}`);

  return parts.join('\n');
}

/**
 * Deterministic Air-Gapped Fallback Generator:
 * Used when the local LLM daemon is offline, experiencing CORS in browser preview,
 * or when immediate deterministic zero-latency compilation is preferred.
 * Strictly adheres to the system prompt mapping rules and DPDP-TRACE Ingestion Channel base data.
 */
export function generateDeterministicDfd(payload: AssessmentInputPayload): RawLlmGraphOutput {
  const nodes: RawLlmGraphOutput['nodes'] = [];
  const edges: RawLlmGraphOutput['edges'] = [];
  const ic = payload.ingestionChannel;

  // 1. Group Nodes: Map major Infra & Architecture items into containment boundaries
  const groups = [...(payload.architecture || []), ...(payload.infra || [])].filter(Boolean);
  const groupNodeMap: { [keyword: string]: string } = {};

  if (groups.length > 0) {
    groups.forEach((grp, idx) => {
      const groupId = `grp-${idx + 1}`;
      groupNodeMap[grp.toLowerCase()] = groupId;
      const isCrossBorderZone = /cross-border|sec 16|us-east|frankfurt|foreign/i.test(grp);
      nodes.push({
        id: groupId,
        type: 'group',
        position: { x: 0, y: 0 },
        data: {
          label: grp,
          category: payload.architecture.includes(grp) ? 'Architecture' : 'Infra',
          metadata: {
            securityZone: grp,
            infraType: payload.infra.includes(grp) ? grp : 'Security Boundary',
            dpdpaRole: isCrossBorderZone ? 'Data Processor' : 'Data Fiduciary',
            statutoryMandate: isCrossBorderZone ? 'Sec 16 Cross-Border' : 'Sec 8(5) Safeguard Zone',
            location: isCrossBorderZone
              ? ic?.crossBorderComponent.destinationJurisdictions.join('/') || 'Global'
              : ic?.dataStorage.primaryRegion || 'India (ap-south-1)',
          },
        },
      });
    });
  } else {
    const defaultGrp = 'Core Air-Gapped Trust Zone';
    const defId = 'grp-1';
    groupNodeMap[defaultGrp.toLowerCase()] = defId;
    nodes.push({
      id: defId,
      type: 'group',
      position: { x: 0, y: 0 },
      data: {
        label: defaultGrp,
        category: 'Architecture',
        metadata: {
          securityZone: 'Air-Gapped Segment',
          infraType: 'Enclave',
          dpdpaRole: 'Data Fiduciary',
          statutoryMandate: 'Sec 8(5) Safeguard Zone',
        },
      },
    });
  }

  const groupIds = Object.values(groupNodeMap);
  const primaryGroup = groupIds[0];
  const secondaryGroup = groupIds[1] || primaryGroup;

  // 2. Source Nodes
  const sourceNodeIds: string[] = [];
  payload.source.forEach((src, idx) => {
    const srcId = `src-${idx + 1}`;
    sourceNodeIds.push(srcId);

    const matchedGroup =
      Object.keys(groupNodeMap).find(
        (k) =>
          k.includes('dmz') ||
          k.includes('edge') ||
          k.includes('ingress') ||
          k.includes('portal') ||
          k.includes('public')
      ) || '';
    const parentId = (matchedGroup ? groupNodeMap[matchedGroup] : primaryGroup) || undefined;

    const matchedAsset = ic?.trustedAppsAndSources.find(
      (a) => a.name.toLowerCase() === src.toLowerCase() || src.toLowerCase().includes(a.name.toLowerCase())
    );
    const isPrincipal = /data principal|minor|citizen|consumer/i.test(src);
    const isChildMinor = /minor|<18|child|sec 9/i.test(src) || Boolean(ic?.contextOfProcessing.processesChildData && isPrincipal);

    nodes.push({
      id: srcId,
      type: 'sourceNode',
      parentId,
      extent: parentId ? 'parent' : undefined,
      position: { x: 0, y: 0 },
      data: {
        label: src,
        category: 'Source',
        metadata: {
          protocol:
            matchedAsset?.protocol ||
            ic?.dataMovement.transitProtocols[0] ||
            (src.toLowerCase().includes('iot')
              ? 'MQTT / TLS'
              : src.toLowerCase().includes('pos') || src.toLowerCase().includes('atm')
              ? 'ISO 8583 / mTLS 1.3'
              : 'mTLS 1.3 / REST'),
          dataClassification:
            matchedAsset?.risk === 'HIGH'
              ? 'RESTRICTED_PII'
              : payload.metadata?.classificationLevel || 'INTERNAL',
          technology: matchedAsset ? `${matchedAsset.id} · ${matchedAsset.category}` : src,
          sla: ic?.dataMovement.movementCadence || 'Real-time (<150ms)',
          dpdpaRole: isPrincipal ? 'Data Principal' : 'Data Fiduciary',
          statutoryMandate: isChildMinor ? 'Sec 5 / Sec 9 (Minor)' : isPrincipal ? 'Sec 5 Notice' : 'Ingress Client',
          isChildData: isChildMinor,
          trustedSource: matchedAsset ? matchedAsset.trusted : !/external|untrusted|partner/i.test(src),
          assetId: matchedAsset?.id,
          location: matchedAsset?.location || ic?.dataStorage.primaryRegion || 'India (ap-south-1)',
        },
      },
    });
  });

  // 3. Operation Nodes (Business, Privacy & AI Processing Logic)
  const operationNodeIds: string[] = [];
  payload.operations.forEach((op, idx) => {
    const opId = `op-${idx + 1}`;
    operationNodeIds.push(opId);

    const isBatch =
      op.toLowerCase().includes('batch') ||
      op.toLowerCase().includes('daily') ||
      op.toLowerCase().includes('etl') ||
      op.toLowerCase().includes('settlement');
    const isMasking =
      op.toLowerCase().includes('mask') ||
      op.toLowerCase().includes('encrypt') ||
      op.toLowerCase().includes('pii') ||
      op.toLowerCase().includes('token');
    const isConsent = op.toLowerCase().includes('consent') || op.toLowerCase().includes('sec 6');
    const isAiModel =
      op.toLowerCase().includes('llm') ||
      op.toLowerCase().includes('ai ') ||
      op.toLowerCase().includes('model') ||
      op.toLowerCase().includes('scoring') ||
      op.toLowerCase().includes('iso 42001');
    const isBiometric =
      op.toLowerCase().includes('biometric') ||
      op.toLowerCase().includes('liveness') ||
      op.toLowerCase().includes('ocr') ||
      op.toLowerCase().includes('validat');

    const matchedGroup =
      Object.keys(groupNodeMap).find(
        (k) =>
          k.includes('enclave') ||
          k.includes('secure') ||
          k.includes('crypto') ||
          k.includes('cluster') ||
          k.includes('k8s') ||
          k.includes('app')
      ) || '';
    const parentId =
      (matchedGroup
        ? groupNodeMap[matchedGroup]
        : groupIds[Math.min(1, groupIds.length - 1)] || primaryGroup) || undefined;

    nodes.push({
      id: opId,
      type: 'operationNode',
      parentId,
      extent: parentId ? 'parent' : undefined,
      position: { x: 0, y: 0 },
      data: {
        label: op,
        category: 'Operations',
        metadata: {
          processType: isConsent
            ? 'Validation'
            : isBiometric
            ? 'Validation'
            : isMasking
            ? 'Cryptographic Masking'
            : isBatch
            ? 'Batch Job'
            : 'Transformation',
          sla: isBatch ? 'Daily EOD Batch' : ic?.dataMovement.movementCadence || 'Sub-second real-time (<300ms)',
          criticality: 'Mission-Critical',
          dpdpaRole: isConsent
            ? 'Consent Manager'
            : ic?.ropaMapping.assessedRole || 'Data Fiduciary',
          statutoryMandate: isConsent
            ? 'Sec 6(7) / Sec 19'
            : isAiModel
            ? 'Sec 10 SDF / ISO 42001'
            : 'Sec 8(5) Safeguard',
        },
      },
    });
  });

  // 4. Child Nodes (Target Storage Repositories, RoPA Ledgers & TPRM Processors)
  const childNodeIds: string[] = [];
  payload.child.forEach((child, idx) => {
    const childId = `child-${idx + 1}`;
    childNodeIds.push(childId);

    const isTprm = /tprm|processor|vendor|bureau|external|partner/i.test(child);
    const isCrossBorderChild = /\[tprm\s*·\s*(us|eu|sg|uk)\]|us-east|frankfurt/i.test(child);

    const matchedGroup =
      Object.keys(groupNodeMap).find((k) =>
        isCrossBorderChild
          ? k.includes('cross-border') || k.includes('sec 16') || k.includes('foreign')
          : k.includes('vault') ||
            k.includes('cde') ||
            k.includes('compliance') ||
            k.includes('trust') ||
            k.includes('db') ||
            k.includes('data') ||
            k.includes('storage') ||
            k.includes('ledger')
      ) || '';
    const parentId =
      (matchedGroup
        ? groupNodeMap[matchedGroup]
        : groupIds[groupIds.length - 1] || secondaryGroup) || undefined;

    const matchedAsset = ic?.trustedAppsAndSources.find(
      (a) => a.name.toLowerCase() === child.toLowerCase()
    );

    nodes.push({
      id: childId,
      type: 'childNode',
      parentId,
      extent: parentId ? 'parent' : undefined,
      position: { x: 0, y: 0 },
      data: {
        label: child,
        category: 'Child',
        metadata: {
          technology: matchedAsset ? `${matchedAsset.id} · ${matchedAsset.category}` : isTprm ? 'Sec 8(2) TPRM Processor' : child,
          dataClassification: payload.metadata?.classificationLevel || 'RESTRICTED_PII',
          dpdpaRole: isTprm ? 'Data Processor' : 'Data Fiduciary',
          statutoryMandate: isTprm ? 'Sec 8(2) TPRM' : 'Sec 8(5) & 8(7) Storage',
          location: isCrossBorderChild
            ? ic?.crossBorderComponent.destinationJurisdictions.filter((c) => c !== 'IN').join('/') || 'Cross-Border'
            : ic?.dataStorage.primaryRegion || 'India (ap-south-1)',
        },
      },
    });
  });

  // 5. Edges: Connect Source -> Operations -> Child
  let edgeCount = 0;
  const sampleProtocols = ['mTLS / gRPC', 'HTTPS / JSON', 'Kafka Stream (Avro)', 'JDBC Batch / SSL', 'PCI-Encrypted Tunnel'];

  if (operationNodeIds.length > 0) {
    // Link sources to operations
    sourceNodeIds.forEach((srcId, sIdx) => {
      const targetOp = operationNodeIds[sIdx % operationNodeIds.length];
      edgeCount++;
      const prot = sampleProtocols[edgeCount % sampleProtocols.length];
      edges.push({
        id: `e-src-${sIdx + 1}-op`,
        source: srcId,
        target: targetOp,
        label: prot,
        animated: true,
        type: 'dataContractEdge',
        data: {
          protocol: prot,
          payloadFormat: 'JSON',
          schemaContract: 'JSON Schema Draft-07',
          timelinessSla: 'Real-time (<500ms)',
          encryption: 'mTLS',
          encryptionAtRestAndTransit: true,
        },
      });
    });

    // Link operations in chain if multiple operations exist
    if (operationNodeIds.length > 1) {
      for (let i = 0; i < operationNodeIds.length - 1; i++) {
        edgeCount++;
        edges.push({
          id: `e-op-${i + 1}-op-${i + 2}`,
          source: operationNodeIds[i],
          target: operationNodeIds[i + 1],
          label: 'Internal Pipeline / Memory Stream',
          animated: true,
          type: 'dataContractEdge',
          data: {
            protocol: 'Inter-process / gRPC',
            payloadFormat: 'Protobuf',
            schemaContract: 'Protobuf v3 Contract',
            timelinessSla: 'Sub-second Stream (<100ms)',
            encryption: 'IPSec',
            encryptionAtRestAndTransit: true,
          },
        });
      }
    }

    // Link operations to children
    childNodeIds.forEach((chId, cIdx) => {
      const sourceOp = operationNodeIds[cIdx % operationNodeIds.length];
      edgeCount++;
      const prot = sampleProtocols[(edgeCount + 2) % sampleProtocols.length];
      edges.push({
        id: `e-op-ch-${cIdx + 1}`,
        source: sourceOp,
        target: chId,
        label: prot,
        animated: true,
        type: 'dataContractEdge',
        data: {
          protocol: prot,
          payloadFormat: 'Avro',
          schemaContract: 'Avro v2.1 Schema Registry',
          timelinessSla: 'Batch 15m Window',
          encryption: 'TLS 1.3',
          encryptionAtRestAndTransit: true,
        },
      });
    });
  } else {
    // Direct Source -> Child connections if no operations defined (triggers Linter Direct Bypass violation!)
    sourceNodeIds.forEach((srcId, sIdx) => {
      const targetChild = childNodeIds[sIdx % Math.max(childNodeIds.length, 1)] || childNodeIds[0];
      if (targetChild) {
        edgeCount++;
        edges.push({
          id: `e-direct-${sIdx + 1}`,
          source: srcId,
          target: targetChild,
          label: 'Direct Unvalidated Sync',
          animated: true,
          type: 'dataContractEdge',
          data: {
            protocol: 'Raw Direct TCP',
          },
        });
      }
    });
  }

  return { nodes, edges };
}

/**
 * Test connectivity and measure latency to the local LLM endpoint
 */
export async function testEndpointConnection(config: LlmConfig): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
  modelsFound?: string[];
}> {
  if (config.provider === 'airgapped-deterministic') {
    return {
      success: true,
      latencyMs: 1,
      message: 'Air-Gapped Deterministic Rule-Based Engine is ready (Zero external network calls).',
    };
  }

  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    // 1. Try health / tags endpoint if Ollama or generic
    const baseHost = config.endpointUrl.replace(/\/v1\/chat\/completions\/?$/, '');
    let probeUrl = `${baseHost}/api/tags`;
    if (config.provider === 'lmstudio' || config.provider === 'unsloth') {
      probeUrl = `${baseHost}/v1/models`;
    }

    const res = await fetch(probeUrl, {
      method: 'GET',
      headers: {
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json();
      let modelsFound: string[] = [];
      if (Array.isArray(data.models)) {
        modelsFound = data.models.map((m: { name?: string; id?: string }) => m.name || m.id || '');
      } else if (Array.isArray(data.data)) {
        modelsFound = data.data.map((m: { id?: string }) => m.id || '');
      }
      return {
        success: true,
        latencyMs,
        message: `Endpoint active! Responded in ${latencyMs}ms. Found ${modelsFound.length} local model(s).`,
        modelsFound: modelsFound.filter(Boolean),
      };
    }

    return {
      success: false,
      latencyMs,
      message: `Endpoint reachable but returned HTTP ${res.status}: ${res.statusText}`,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs,
      message: `Failed to connect to ${config.endpointUrl}: ${(err as Error).message}. (Ensure CORS is enabled, e.g. OLLAMA_ORIGINS="*" ollama serve)`,
    };
  }
}

/**
 * Execute request to Local LLM with retry, timeout, JSON schema enforcement,
 * and automatic fallback to air-gapped deterministic compiler if local daemon is unreachable.
 */
export async function callLocalLlmForDfd(
  payload: AssessmentInputPayload,
  config: LlmConfig,
  onStatusUpdate?: (status: string) => void
): Promise<{ graph: RawLlmGraphOutput; source: 'llm' | 'deterministic-fallback'; latencyMs: number }> {
  const startTime = performance.now();

  // If user explicitly chose the air-gapped deterministic engine
  if (config.provider === 'airgapped-deterministic') {
    onStatusUpdate?.('Executing Air-Gapped Rule Engine...');
    const graph = generateDeterministicDfd(payload);
    const latencyMs = Math.round(performance.now() - startTime);
    return { graph, source: 'deterministic-fallback', latencyMs };
  }

  const userContent = buildUserPromptFromPayload(payload);

  const requestBody = {
    model: config.modelName,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: config.temperature,
    // JSON mode enforcement for OpenAI-compatible endpoints (Ollama, LM Studio, Unsloth, vLLM)
    response_format: { type: 'json_object' },
  };

  let attempts = 0;
  const maxAttempts = Math.max(1, config.retryAttempts);
  let lastError: Error | null = null;

  while (attempts < maxAttempts) {
    attempts++;
    onStatusUpdate?.(`Querying local model "${config.modelName}" (Attempt ${attempts}/${maxAttempts})...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(config.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} from local LLM: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const rawChoice = data.choices?.[0]?.message?.content || data.response || '';

      if (!rawChoice) {
        throw new Error('Local LLM returned an empty response.');
      }

      onStatusUpdate?.('Sanitizing and validating JSON structure...');
      const graph = sanitizeAndParseLlmJson(rawChoice);
      const latencyMs = Math.round(performance.now() - startTime);

      return {
        graph,
        source: 'llm',
        latencyMs,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err as Error;

      // Exponential backoff wait before retrying
      if (attempts < maxAttempts) {
        const backoffMs = 1200 * attempts;
        onStatusUpdate?.(`Attempt ${attempts} failed (${(err as Error).message}). Retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // If local LLM fails (e.g. CORS, offline daemon), fall back smoothly to the air-gapped deterministic engine
  onStatusUpdate?.(`Local LLM failed (${lastError?.message}). Activating Air-Gapped Deterministic Rule Engine...`);
  const fallbackGraph = generateDeterministicDfd(payload);
  const latencyMs = Math.round(performance.now() - startTime);

  return {
    graph: fallbackGraph,
    source: 'deterministic-fallback',
    latencyMs,
  };
}

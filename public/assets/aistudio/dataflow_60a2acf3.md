# DPDP-TRACE: xyflow Data Flow Ingestion & AI Topology Engine (`dataflow.md`)

**Developed and Licensed by:** [www.technoscope.co.in](https://www.technoscope.co.in)  
**Repository:** [https://github.com/amitkpconsulting-spec/DPDP-Trace](https://github.com/amitkpconsulting-spec/DPDP-Trace)  
**Target Stage:** Stage 7 — Data Flow Topology (`@xyflow/react`) across the 22-Stage DPDPA Lifecycle

---

## 1. Overview: How DPDP-TRACE Ingests Data into `@xyflow/react`

To generate a **reliable, audit-grade visual data flow** without manual drag-and-drop guesswork, **DPDP-TRACE** combines two primary structured and unstructured inputs through an **AI-Assisted + Deterministic Statutory Ingestion Pipeline**:

1. **Input Source A — Apps & Data Sources Register (Stage 4 Discovery & Workspace Controls)**
   - Structured inventory of enterprise assets:
     - `id`: Asset identifier (e.g., `APP-01`, `APP-02`)
     - `name`: System or database name (e.g., `Core Production DB (PostgreSQL)`, `Customer Onboarding Portal`, `Enterprise Analytics Lake (S3)`, `Risk Scoring LLM Engine`)
     - `category`: `'Core DB' | 'Web/Mobile App' | 'Cloud Lake' | 'AI Model' | 'TPRM Processor'`
     - `risk`: `'HIGH' | 'MEDIUM' | 'LOW'`
     - `piiTypes`: Categories of personal data processed (e.g., `KYC, Aadhaar, Financial`, `Name, Phone, Email, Consent`, `Behavioral & Credit Vectors`)

2. **Input Source B — Context of Processing & RoPA Scope (Stage 1 Scope & Stage 6 RoPA)**
   - Unstructured / semi-structured natural language description of:
     - **Data Principal Cohort**: Adult consumers, employees, or children/minors (`processesChildData: boolean` triggering DPDPA Section 9).
     - **Ingress Channels**: Mobile apps, web portals, API gateways, Account Aggregator feeds, or IoT/DICOM scanners.
     - **Core Processing & AI/ML Inference**: Internal microservices, GenAI/LLM pipelines (`usesAiMlModels: boolean` triggering ISO/IEC 42001:2023 AIMS & DPDPA Section 10 SDF).
     - **Storage & Retention**: Cloud regions (e.g., `ap-south-1 Mumbai`), encryption at rest (`AES-256-GCM`, `HSM`), and retention schedules (`Section 8(7)`).
     - **External Processors & Cross-Border Egress**: Third-party SDKs, cloud processors, and destination jurisdictions (`IN`, `US`, `EU`, `SG`) under DPDPA Section 8(2) & Section 16.

---

## 2. Ingestion Architecture & Reliability Pipeline

```
┌─────────────────────────────────────────┐     ┌─────────────────────────────────────────┐
│  1. APPS & DATA SOURCES (Stage 4)       │     │  2. CONTEXT OF PROCESSING (Stage 1 / 6) │
│  • Web/Mobile Apps                      │     │  • Business Purpose & Lawful Basis      │
│  • Core Databases & Cloud Lakes         │     │  • Minor (<18) & AI/ML Model Flags      │
│  • AI/LLM Models & TPRM Vendors         │     │  • Cross-Border & Telemetry Narratives  │
└───────────────────┬─────────────────────┘     └───────────────────┬─────────────────────┘
                    │                                               │
                    └───────────────────────┬───────────────────────┘
                                            ▼
                     ┌─────────────────────────────────────────────┐
                     │   AI & STATUTORY INGESTION ENGINE           │
                     │   (POST /api/ai/ingest-architecture)        │
                     │                                             │
                     │   • Semantic Entity & Stream Extraction     │
                     │   • Deterministic Node-Type Classification  │
                     │   • Automated X/Y Grid Layout Calculation   │
                     │   • Statutory Edge Violation Tagging        │
                     └──────────────────────┬──────────────────────┘
                                            ▼
                     ┌─────────────────────────────────────────────┐
                     │   @xyflow/react INTERACTIVE CANVAS          │
                     │   (Stage 7 DataFlowCanvas.tsx)              │
                     │                                             │
                     │   • 7 Specialized DPDPA Custom Nodes        │
                     │   • Cryptographic Edge Inspector (`dpdpaEdge`)│
                     │   • Real-Time Statutory Graph Audit         │
                     └─────────────────────────────────────────────┘
```

### Why Combining Structured Register + AI Context Produces a Reliable Data Flow:
- **Zero Hallucinated Assets**: Every system registered in **Apps & Data Sources** is guaranteed to appear as a node in the `@xyflow/react` graph with its exact PII taxonomy and risk tier.
- **Contextual Edge Synthesis**: The AI capability parses the **Context of Processing** narrative to infer hidden egress streams (e.g., client-side telemetry SDKs, cross-border GPU inference, unencrypted internal hops) and connects the nodes with typed `dpdpaEdge` streams.
- **Deterministic Fallback**: If an external LLM is unreachable or running in an air-gapped environment, the built-in **DPDP-TRACE Statutory Engine** deterministically synthesizes the complete `@xyflow/react` node-and-edge graph from the Apps & Data Sources inventory and Context of Processing keywords.

---

## 3. Deterministic Mapping Rules (Apps & Data Sources $\rightarrow$ `xyflow` Nodes)

| Source Asset / Context Entity | `xyflow` Node `type` | `dpdpaRole` | Visual Layer (X-Axis Column) | Statutory Mandate Badge |
| :--- | :--- | :--- | :--- | :--- |
| **Data Principal / Citizen / Minor** | `principalNode` | `'Data Principal'` | Column 1 (`x: 40`) | `Sec 5 / Sec 9` |
| **Web/Mobile App / Onboarding Portal** | `clientNode` | `'Data Fiduciary'` | Column 2 (`x: 360`) | `Ingress Client` |
| **Consent Manager / DPBI Regulator** | `regulatorNode` | `'Consent Manager'` / `'DPBI'` | Column 2 (`x: 360, y: 420`) | `Sec 6(7) / Sec 19` |
| **Core Backend / Microservice / AI Model** | `fiduciaryNode` | `'Data Fiduciary'` | Column 3 (`x: 700`) | `Sec 8 / ISO 42001` |
| **Core DB / Cloud Lake / Data Warehouse** | `storageNode` | `'Data Fiduciary'` | Column 4 (`x: 1060`) | `Sec 8(5) & 8(7)` |
| **Third-Party SDK / External Vendor** | `processorNode` | `'Data Processor'` | Column 3/4 (`x: 700..1060, y: 420`) | `Sec 8(2) TPRM` |
| **Cross-Border / Sovereignty Zone** | `boundaryNode` | `'Data Processor'` | Sovereignty Wrapper | `Sec 16 Cross-Border` |

---

## 4. Master System Prompt for `xyflow` AI Ingestion

Use the following **Master Prompt** in your LLM engine (Ollama, LM Studio, AnythingLLM, OpenAI-compatible endpoint, or `/api/ai/ingest-architecture`) to transform **Apps & Data Sources** and **Context of Processing** into a validated `@xyflow/react` JSON payload:

```markdown
### SYSTEM ROLE
You are the **DPDP-TRACE Regulatory Data Flow & Topology Architect**, an expert AI engine specializing in India's Digital Personal Data Protection Act (DPDPA) 2023, ISO/IEC 27701:2019 (PIMS), ISO/IEC 42001:2023 (AIMS), and `@xyflow/react` directed graph synthesis.

### OBJECTIVE
Ingest the provided **(1) Apps & Data Sources Inventory** and **(2) Context of Processing Narrative**, evaluate them across the 22-stage DPDPA lifecycle, and output a deterministic, strictly typed JSON object containing:
1. `data_flow_graph`: A complete `@xyflow/react` topology (`nodes` and `edges`) with non-overlapping coordinates, encryption metadata, lawful basis classifications, and statutory violation flags.
2. `lifecycle_control_audit`: Stage-by-stage statutory findings.
3. `gap_analysis_and_remediation`: Prioritized CAPA items mapped to DPDPA sections.
4. `data_principal_lifecycle_readiness`: Pass/Partial/Fail readiness gates.

---

### INPUT PAYLOAD
1. **System / Campaign Name**: {{systemName}}
2. **Sector Regulatory Context**: {{sectorId}} (e.g., SEC_FINTECH, SEC_HEALTH, SEC_RETAIL, SEC_TECH)
3. **Entity Scope Category**: {{entityType}} (e.g., Application, AI_Launch, Project, Process)
4. **Processes Child / Minor Data (<18 years)**: {{processesChildData}} (If true, enforce DPDPA Section 9 Verifiable Parental Consent & absolute ban on behavioral tracking/targeted advertising)
5. **Uses AI / ML / LLM Models**: {{usesAiMlModels}} (If true, enforce DPDPA Section 10 Significant Data Fiduciary obligations & ISO/IEC 42001 AIMS controls)
6. **Registered Apps & Data Sources (Stage 4 Inventory)**:
```json
{{appsAndDataSourcesJson}}
```
7. **Context of Processing & RoPA Narrative (Stage 1 & Stage 6)**:
"""
{{contextOfProcessing}}
"""

---

### STRICT `@xyflow/react` GRAPH GENERATION RULES

#### A. Node Synthesis Rules (`data_flow_graph.nodes`)
Every node MUST conform to this exact structure:
```json
{
  "id": "node-unique-id",
  "type": "principalNode | clientNode | fiduciaryNode | storageNode | processorNode | regulatorNode | boundaryNode",
  "position": { "x": 40, "y": 180 },
  "data": {
    "label": "Human-readable System or Entity Name",
    "category": "Functional Sub-type (e.g. Web/Mobile App, Core DB, AI Model, TPRM Vendor)",
    "dpdpaRole": "Data Principal | Data Fiduciary | Data Processor | Sub-Processor | Consent Manager | DPBI",
    "dataStored": ["Specific PII Element 1", "Specific PII Element 2"],
    "isChildData": false,
    "securityControls": ["TLS 1.3", "AES-256-GCM", "RBAC"],
    "location": "India (ap-south-1) | US | EU | SG",
    "notes": "Optional warning string. MUST start with 'VIOLATION DETECTED:' if a statutory breach exists on this node."
  }
}
```
- **Mandatory Ingress Node**: Always start with a `principalNode` at `{ "x": 40, "y": 180 }` representing the Data Principal cohort.
- **Apps & Data Sources Mapping**:
  - Every item in `appsAndDataSourcesJson` MUST be represented as a node:
    - `category === "Web/Mobile App"` $\rightarrow$ `type: "clientNode"`, `position.x = 360`
    - `category === "AI Model"` or backend service $\rightarrow$ `type: "fiduciaryNode"`, `position.x = 700`
    - `category === "Core DB"` or `"Cloud Lake"` $\rightarrow$ `type: "storageNode"`, `position.x = 1060`
- **Context-Inferred Nodes**:
  - If the Context of Processing mentions third-party analytics, SDKs, cloud vendors, or external APIs, add a `processorNode` at `{ "x": 700, "y": 420 }`.
  - If Consent Manager or Account Aggregator is mentioned, add a `regulatorNode` at `{ "x": 360, "y": 420 }`.

#### B. Edge Synthesis Rules (`data_flow_graph.edges`)
Every edge MUST connect valid node IDs and use `type: "dpdpaEdge"`:
```json
{
  "id": "e-source-target",
  "source": "source-node-id",
  "target": "target-node-id",
  "type": "dpdpaEdge",
  "label": "Concise stream description (append '(VIOLATION: Sec X)' if non-compliant)",
  "animated": false,
  "data": {
    "protocol": "HTTPS / TLS 1.3 | gRPC / mTLS | PostgreSQL TLS | Unencrypted HTTP",
    "payloadCategories": ["Identity PII", "Financial Vectors"],
    "isEncryptedInTransit": true,
    "isCrossBorder": false,
    "destinationCountry": "IN",
    "lawfulBasis": "Consent (Sec 6) | Legitimate Use (Sec 7) | Contractual Processor Delivery | None - Non-Compliant",
    "violationNotes": "Populate if stream violates Sec 9(2) child tracking, Sec 8(5) encryption, or Sec 16 cross-border rules"
  }
}
```
- Set `"animated": true` on any edge that crosses international borders (`isCrossBorder: true`), carries child data to a processor, or has a statutory violation.

---

### REQUIRED JSON OUTPUT FORMAT
Return **ONLY** valid JSON matching this schema (no markdown commentary outside the JSON):
```json
{
  "assessment_metadata": {
    "system_name": "String",
    "assessed_role": "Data Fiduciary | Significant Data Fiduciary",
    "dpdpa_risk_score": "Low | Medium | High | Critical",
    "dpia_mandatory": true
  },
  "executive_summary": "Audit-grade synthesis of how the Apps & Data Sources process personal data under the declared Context of Processing.",
  "data_flow_graph": {
    "engine": "xyflow",
    "viewport": { "x": 0, "y": 0, "zoom": 0.85 },
    "nodes": [],
    "edges": []
  },
  "lifecycle_control_audit": [
    {
      "stage_number": 7,
      "stage_name": "Data Flow Mapping",
      "compliance_status": "Compliant | Partially Compliant | Non-Compliant",
      "legal_basis": "DPDPA Section 8(5), Section 9(2), Section 16",
      "findings": "Detailed finding on data lineage between apps, databases, and processors.",
      "risk_implication": "Statutory penalty exposure under the Third Schedule."
    }
  ],
  "gap_analysis_and_remediation": [
    {
      "gap_id": "GAP-DF-01",
      "category": "Data Flow / Security / Child Data",
      "severity": "Critical | High | Medium | Low",
      "description": "Specific vulnerability identified in the ingested pipeline.",
      "root_cause": "Architectural root cause.",
      "remediation_action": "Engineering control required to remediate the gap.",
      "target_owner": "DPO / Engineering Lead",
      "statutory_reference": "DPDPA Section 8(5) / Section 9(2) / ISO 42001"
    }
  ],
  "data_principal_lifecycle_readiness": {
    "notice_itemisation": "Pass | Partial | Fail",
    "consent_withdrawal_parity": "Pass | Partial | Fail",
    "child_tracking_prohibition": "Pass | Partial | Fail",
    "erasure_on_purpose_exhaustion": "Pass | Partial | Fail",
    "dpbi_72hr_breach_readiness": "Pass | Partial | Fail",
    "nomination_facility": "Pass | Partial | Fail"
  },
  "sign_off_recommendation": {
    "deployable_as_is": false,
    "conditional_approval_requirements": [
      "Specific technical condition before Line 3 DPO sign-off"
    ]
  }
}
```
```

---

## 5. Automated Statutory Audit Rules Executed on the `xyflow` Graph

Once the AI or Statutory Engine populates the `@xyflow/react` canvas, DPDP-TRACE's `handleRunAudit()` verifier inspects every node and edge against four statutory predicates:

1. **Rule 1 — Section 9(2) Child Behavioral Tracking Prohibition (`Critical`)**
   - **Trigger**: Any edge where `source` node has `data.isChildData === true` and `target` node has `type === 'processorNode'` or `data.dpdpaRole === 'Data Processor'`.
   - **Statutory Exposure**: Up to ₹200 Crore penalty under the DPDPA Third Schedule.
2. **Rule 2 — Section 8(5) Unencrypted Transit Stream (`High`)**
   - **Trigger**: Any edge where `data.isEncryptedInTransit === false`.
   - **Statutory Exposure**: Up to ₹250 Crore penalty for failure to maintain reasonable security safeguards.
3. **Rule 3 — Section 4 & 6 Missing Lawful Basis (`Critical`)**
   - **Trigger**: Any edge where `data.lawfulBasis` contains `"non-compliant"` or `"none"`.
4. **Rule 4 — Section 16 Unverified Cross-Border Transfer (`Medium`)**
   - **Trigger**: Any edge where `data.isCrossBorder === true` without a valid sovereign `destinationCountry` or negative-list clearance.

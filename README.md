# PentaFlow

> **PentaFlow** transforms enterprise data flow assessments into governed, interactive 5-layer architecture diagrams with real-time DAMA-DMBOK data quality linting and multi-format audit dossier exports.

[![Repository](https://img.shields.io/badge/GitHub-amitkpconsulting--spec%2Fpentaflow-181717.svg?logo=github)](https://github.com/amitkpconsulting-spec/pentaflow)
[![Advisory & Contact](https://img.shields.io/badge/Advisory-Technoscope-4f46e5.svg)](https://www.technoscope.co.in)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![React Flow](https://img.shields.io/badge/@xyflow/react-12.x-ff0072.svg)](https://reactflow.dev/)
[![NIST SP 800-53](https://img.shields.io/badge/NIST%20SP%20800--53-OSCAL%20v1.4.0-0284c7.svg)](https://github.com/usnistgov/oscal-content/tree/v1.4.0/src/nist.gov/SP800-53)
[![API Security](https://img.shields.io/badge/Security-APIsecurity.md%20BYOK-dc2626.svg)](./APIsecurity.md)
[![DAMA-DMBOK](https://img.shields.io/badge/DAMA-Governance%20Compliant-10b981.svg)](https://www.dama.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Developer Contact & Enterprise Advisory

For bespoke enterprise implementation, architectural advisory, custom DAMA governance rulepacks, or air-gapped deployment consultation, reach out to our team at **Technoscope**:

- **Official Website & Advisory Contact**: [www.technoscope.co.in](https://www.technoscope.co.in)
- **Repository & Issue Tracker**: [https://github.com/amitkpconsulting-spec/pentaflow](https://github.com/amitkpconsulting-spec/pentaflow)
- **Application In-App Footer Note**: Direct advisory redirect link is integrated permanently into the application's workspace footer and export studio dialog.

---

## Visual Preview & System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       PentaFlow Architecture                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 ▼                                                                 ▼
   ┌───────────────────────────┐                                     ┌───────────────────────────┐
   │ Structured Assessment Form│                                     │  Air-Gapped LLM & Rules   │
   │  • 1. Source Layer        │                                     │  • Ollama (Llama 3.2)     │
   │  • 2. Operations Layer    │ ─── [Structured Payload JSON] ────► │  • LM Studio / vLLM       │
   │  • 3. Child Sinks Layer   │                                     │  • Unsloth (Qwen 2.5)     │
   │  • 4. Infra Hosting Layer │                                     │  • Deterministic Expert   │
   │  • 5. Architecture Zones  │                                     └─────────────┬─────────────┘
   └───────────────────────────┘                                                   │
                 ▲                                                                 │ [Topology JSON]
                 │                                                                 ▼
                 │       ┌──────────────────────────────────────────────────────────────────┐
                 │       │           Interactive Governed Canvas (@xyflow/react)            │
                 │       │  • Hierarchical Dagre Layout Engine (LR / TB Auto-Routing)       │
                 │       │  • Trust Zone Subgraph Containers & Data Classification Badges   │
                 │       │  • Data-in-Transit Contract Edges with SLA Latency & Encryption  │
                 │       └─────────────────────────────────┬────────────────────────────────┘
                 │                                         │
                 │                                         ▼
                 │       ┌──────────────────────────────────────────────────────────────────┐
                 │       │      Data Quality & Governance Linter (DQ DAMA Engine)           │
                 │       │  • DAMA-DMBOK 6 Dimensions Audit (Completeness, Accuracy, etc.)  │
                 │       │  • Source-Child Data Contract Mismatch Scanner                   │
                 │       │  • PII Classification Downgrade & Ingestion Bypass Alerts        │
                 │       │  • Dead-Letter Queue (DLQ) & Trust Boundary Integrity Checks     │
                 │       └─────────────────────────────────┬────────────────────────────────┘
                 │                                         │
                 └─────────────────── [Sync] ──────────────┤
                                                           │
                                                           ▼
                 ┌──────────────────────────────────────────────────────────────────┐
                 │                      Multi-Format Export Studio                  │
                 │  • Structured DFD-spec JSON (v2.1 Schema compliant)              │
                 │  • High-Resolution PNG (1x, 2x Retina, 3x Ultra-HD with Banners) │
                 │  • Animated Flow GIF (Client-side frame quantization)            │
                 │  • Official DQ DAMA Audit Report Dossier in PDF (jsPDF)          │
                 │  • Application Footer Link redirecting to www.technoscope.co.in  │
                 └──────────────────────────────────────────────────────────────────┘
```

---

## Features

- **First Ask: 10-Dimension Ingestion Channel & AI Context Engine**: Captures foundational data flow base data across 10 governance dimensions before compiling the `@xyflow/react` diagram:
  1. **Context of Data Processing**: Business purpose, regulatory sector, lawful basis (`Sec 6` Consent / `Sec 7` Legitimate Use), Data Principal cohorts, and `<18` Minor (`Sec 9`) flags.
  2. **Data Usage**: Processing activities, AI/ML/LLM inference models (`ISO/IEC 42001` & `Sec 10` SDF trigger), and automated decisioning.
  3. **Data Movement**: Ingress channels, transit protocols (`mTLS 1.3`, `Kafka SASL/SSL`), encryption-in-transit (`Sec 8(5)`), and emission cadence.
  4. **Data Storage**: Storage repositories, encryption at rest (`AES-256-GCM + HSM`), primary hosting region, and retention/erasure schedules (`Sec 8(7)`).
  5. **Data Privacy**: PII categories, Consent Manager artifact ledger (`Sec 6(7)`), privacy engineering controls, and 6-Stage Data Principal Lifecycle Readiness gates.
  6. **Infrastructure Component**: Compute clusters, message fabrics, and security/trust boundary zones.
  7. **Cross-Border Component**: Foreign cloud/data center transfer controls (`Sec 16`), destination jurisdictions (`IN`, `US`, `EU`, `SG`, `UK`, `AE`), and transfer safeguards.
  8. **Cover Apps & Data Sources Register (Trusted)**: Stage 4 structured asset inventory (`APP-01`, `APP-02`, ...) with risk tier, PII scope, and Trusted/Untrusted verification.
  9. **Third-Party Involvement (TPRM)**: External processor/vendor register with `Sec 8(2)` Data Processing Agreement (DPA) status.
  10. **Data Mapping / RoPA (High-Volume Processing)**: High-volume processing flag, RoPA Record ID, daily throughput, `Significant Data Fiduciary (SDF)` role, mandatory DPIA, and DPO sign-off status.
- **Automatic NIST SP 800-53 Rev 5 (OSCAL v1.4.0) Control Showcase**:
  - Grounded in the official US NIST OSCAL Content catalog ([`usnistgov/oscal-content/tree/v1.4.0/src/nist.gov/SP800-53`](https://github.com/usnistgov/oscal-content/tree/v1.4.0/src/nist.gov/SP800-53)).
  - Every node (`Source`, `Operations`, `Child`, `Infra`, `Architecture`), data-in-transit edge, and Ingestion Channel dimension automatically resolves, evaluates (`IMPLEMENTED`, `PARTIAL`, `GAP`), and showcases its applicable **NIST SP 800-53 Rev 5 Key Controls** directly on the Data Flow Diagram canvas and in the Node/Edge Inspector:
    - **Source Ingress**: `SC-8(1)` (Cryptographic Protection in Transit), `IA-3` (mTLS Device/Service Auth), `IA-2` (OIDC/MFA Auth), `CM-8` (Trusted Asset Inventory), `SR-3` (Supply Chain & Untrusted Source Controls), `PT-5` (Privacy Notice), `PT-7` (Child `<18` / Sensitive PII Safeguards).
    - **Operations / Processing**: `SI-19` (De-identification / PII Masking & Tokenization), `SC-13` (FIPS 140-3 / AES-256 Cryptography), `SC-12` (HSM Key Management), `SI-10` (Schema & Input Validation Gate), `CP-10` (Quarantine DLQ & Recovery), `PT-2` & `PT-4` (Lawful Authority & Consent Manager), `RA-3` & `SI-4` (DPIA & Anomaly/Fraud Monitoring).
    - **Child Sinks & Storage**: `SC-28(1)` (Cryptographic Protection at Rest), `AC-3` (Access Enforcement / RBAC), `SI-12` (Information Retention & Erasure), `SA-9` (External System Services / TPRM Processors), `CA-3` (Cross-Border Information Exchange), `AU-2` / `AU-9` / `AU-12` (RoPA & Tamper-Evident Audit Logging).
    - **Infra & Architecture Trust Zones**: `SC-7` (Boundary Protection), `AC-4` (Information Flow Enforcement), `CA-7` (Continuous Boundary Monitoring).
- **Enterprise 5-Layer Architecture Taxonomy**: Standardizes system architecture modeling into five unambiguous dimensions:
  1. **Source Layer**: Origin triggers, API gateways, IoT ingress, third-party webhooks.
  2. **Operations Layer**: ETL transformations, cryptographic masking, business logic, neural fraud scoring.
  3. **Child Layer**: Downstream data sinks, persistent databases, analytical lakes, external schemes.
  4. **Infra Layer**: Network hosting boundaries, bare-metal enclaves, Kubernetes clusters, VPCs.
  5. **Architecture Layer**: Security perimeters, trust zones, DMZs, PCI-DSS enclaves, compliance boundaries.
- **Governed Interactive Canvas**: Built on `@xyflow/react` with automated Dagre hierarchical routing (Left-to-Right or Top-to-Bottom), drag-and-drop grouping, trust boundary containers, and bidirectional sync to input forms.
- **DQ DAMA Governance & Contract Linter**: Deterministic rule engine enforcing DAMA-DMBOK 6 Core Data Quality Dimensions:
  - **Completeness**: Detects data sinkholes (sources with 0 outgoing routes) and unfed target sinks.
  - **Accuracy & Security**: Flags unencrypted cross-boundary traversals lacking TLS 1.3/mTLS or IPSec encryption.
  - **Validity**: Prevents raw source-to-child bypass writes that skip schema validation or data cleansing gates.
  - **Consistency**: Enforces Dead-Letter Queue (DLQ) error isolation on operational transformation pipelines.
  - **Timeliness**: Reconciles ingestion cadences and latency SLAs (e.g. streaming `< 500ms` vs. batch `Daily`).
  - **Uniqueness**: Guarantees idempotency key tracking and deduplication safeguards against replay events.
- **Deep Source-Child Contract Mismatch Scanner**: Traces multi-hop end-to-end paths (`Source → [Operations] → Child`) to surface enterprise contract discrepancies:
  - *Classification Downgrade & PII Leakage*: Flags high-sensitivity origins (`RESTRICTED_PII`, `CONFIDENTIAL`) entering lower-tier sinks (`INTERNAL`, `PUBLIC`) without a Tokenization or Cryptographic Masking operation.
  - *Serialization Format Incompatibilities*: Detects binary/Protobuf/Avro origins feeding JSON/CSV/SQL sinks without transformation adapters.
  - *Unfulfillable SLAs*: Detects slow batch origins linked to sub-second real-time consumer expectations.
- **Executive Audit Report Dossier (PDF Export)**: Client-side compilation via `jspdf` generating multi-page executive audit dossiers complete with embedded high-resolution canvas snapshots, DAMA dimension scorecards, findings registers, 5-layer inventories, and cryptographic attestation stamps.
- **Multi-Format Export Studio**:
  - **Structured JSON**: DFD-spec v2.1 schema-compliant export capturing full metadata, node hierarchies, and contract matrix.
  - **High-Res PNG**: 1x, 2x Retina, and 3x Ultra-HD exports with styled dark banners, system timestamps, and health scores.
  - **Animated GIF**: Client-side animated packet flow capture with palette quantization using `gifenc`.
  - **Mermaid.js**: One-click Markdown diagram generator for technical documentation and GitHub wikis.
- **Air-Gapped & Local LLM Ready**: Zero telemetry and zero cloud lock-in. Integrates out-of-the-box with local inference endpoints (**Ollama**, **LM Studio**, **Unsloth**, **vLLM**) alongside an instant deterministic expert rule engine.
- **Pre-Built Enterprise Template Catalog**: Includes production-grade reference archetypes for Transaction Banking, KYC Identity Verification, Retail Account Onboarding, and Healthcare HIPAA Data Flow.

---

## Getting Started / Installation

### Option A: Windows One-Click Launchers (`setup.bat` & `start.bat`)
On a fresh Windows machine, you can provision and launch **PentaFlow** with zero manual prerequisites (if system Node.js is absent, `setup.bat` automatically downloads a portable Node.js v22 LTS x64 runtime into `.\bin\node\`):

```bat
:: 1. Provision environment, storage folders, npm packages, and catalog store
setup.bat

:: 2. Pre-flight verify (auto-heals if anything is missing), launch server, and open http://localhost:3000
start.bat
```

### Option B: Standard Cross-Platform CLI (Node.js 18+)

#### 1. Clone the repository
```bash
git clone https://github.com/amitkpconsulting-spec/pentaflow.git
cd pentaflow
```

#### 2. Install dependencies & initialize catalog store
```bash
npm install
node scripts/init-db.js
```

#### 3. Configure BYOK Environment (`APIsecurity.md` Standard)
Per **[`APIsecurity.md`](./APIsecurity.md)**, developer API keys are **never hardcoded** in source code, scripts, or client bundles. Each user or deployment supplies their own key (**Bring Your Own Key / BYOK**):
```bash
cp .env.example .env
# Edit .env and set your own GEMINI_API_KEY=<your_key> (or leave blank for 0ms Air-Gapped Deterministic Mode)
npm run verify:security
```

#### 4. Launch the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage Examples

### 1. Generating a Structured Data Flow Diagram
Input your enterprise system dimensions into the **PentaFlow** assessment form or choose a catalog template:

```typescript
import { AssessmentInputPayload } from './types/dfd';

const paymentGatewayPayload: AssessmentInputPayload = {
  source: ['Merchant POS Terminal', 'E-Commerce Gateway'],
  operations: [
    'ISO 8583 Message Validator',
    'PIN & CVV Cryptographic Translation',
    'Sub-Second Fraud Scoring'
  ],
  child: ['Card Scheme Network (Visa/MC)', 'Cardholder DB', 'Risk Data Lake'],
  infra: ['DMZ Ingress Cluster', 'PCI-DSS Bare-Metal Enclave'],
  architecture: ['External Financial DMZ', 'Cardholder Data Environment (CDE)'],
  metadata: {
    systemName: 'Payment Processing Gateway',
    assessmentId: 'PAY-2026-X1',
    environment: 'air-gapped-production',
    classificationLevel: 'RESTRICTED_PII',
    complianceFrameworks: ['PCI-DSS v4.0', 'ISO 8583']
  }
};
```

### 2. Running the DQ DAMA Governance Linter Programmatically
Scan any graph topology for DAMA violations and source-child contract mismatches:

```typescript
import { runDeterministicDqLinter } from './utils/dqGraphLinter';

const linterResult = runDeterministicDqLinter(nodes, edges);

console.log(`DAMA Health Score: ${linterResult.summary.overallHealthScore}%`);
console.log(`Critical Violations: ${linterResult.summary.criticalCount}`);
console.log(`Source-Child Contract Mismatches: ${linterResult.sourceChildMismatches?.length}`);

// Inspect specific contract mismatches
linterResult.sourceChildMismatches?.forEach((mismatch) => {
  console.warn(`[${mismatch.mismatchType}] ${mismatch.title}`);
  console.log(`Path: ${mismatch.pathLabels.join(' -> ')}`);
  console.log(`Recommendation: ${mismatch.recommendation}`);
});
```

### 3. Exporting the DQ DAMA PDF Audit Dossier
Generate an executive, auditor-ready PDF report directly from the client:

```typescript
import { exportDqDamaPdfDossierToFile } from './utils/dfdExport';

await exportDqDamaPdfDossierToFile(nodes, edges, linterResult, canvasContainerElement, {
  systemName: 'Credit Card Payment Switch',
  auditorName: 'Lead Enterprise Data Architect',
  classification: 'CONFIDENTIAL / RESTRICTED_PII',
  environment: 'Air-Gapped Production VPC',
  includeDiagram: true,
  includeDimensions: true,
  includeDiagnostics: true,
  includeInventory: true,
  includeContracts: true
});
```

---

## Contributing Guidelines

We welcome community feedback, bug reports, and pull requests!

1. **Reporting Bugs**: Open an issue on GitHub at [https://github.com/amitkpconsulting-spec/pentaflow/issues](https://github.com/amitkpconsulting-spec/pentaflow/issues) describing the steps to reproduce, browser version, and observed graph topology.
2. **Feature Requests**: Suggest architectural rules, compliance frameworks (e.g. GDPR, HIPAA, FedRAMP), or canvas integrations.
3. **Submitting Pull Requests**:
   - Fork the repository and create a feature branch (`git checkout -b feature/new-dama-rule`).
   - Ensure clean code standards and type safety: `npm run lint` and `npm run build`.
   - Submit your pull request with a concise description of changes and associated test cases.

---

## Credits / Team & Advisory

- **Technoscope**: Developer contact and advisory for enterprise architecture, DAMA compliance automation, and custom deployment services ([www.technoscope.co.in](https://www.technoscope.co.in)).
- **NIST OSCAL Content (SP 800-53 Rev 5 v1.4.0)**: Official US National Institute of Standards and Technology Open Security Controls Assessment Language catalog ([https://github.com/usnistgov/oscal-content/tree/v1.4.0/src/nist.gov/SP800-53](https://github.com/usnistgov/oscal-content/tree/v1.4.0/src/nist.gov/SP800-53)).
- **DAMA International**: For the foundational *DAMA-DMBOK (Data Management Body of Knowledge)* 6 Core Data Quality Dimensions framework.
- **@xyflow/react (React Flow)**: For the high-performance node canvas library.
- **Dagre**: For directed graph hierarchical layout and automated edge routing.
- **jsPDF**: For client-side PDF rendering and multi-page audit report generation.
- **gifenc**: For fast, browser-native GIF quantization and frame encoding.
- **Lucide Icons**: For clean enterprise iconography.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for full details. You are free to use, modify, distribute, and integrate PentaFlow into commercial and private enterprise workflows.

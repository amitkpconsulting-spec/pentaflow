import { AssessmentInputPayload } from '../types/dfd';

export interface AssessmentPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  badge: string;
  payload: AssessmentInputPayload;
}

export const ENTERPRISE_ASSESSMENT_PRESETS: AssessmentPreset[] = [
  {
    id: 'kyc-process-flow',
    name: 'KYC Process Flow & AML Screening',
    description: 'Customer identity verification, biometric liveness, and PEP/sanctions screening.',
    category: 'Banking & Compliance',
    badge: 'KYC & AML',
    payload: {
      source: [
        'Customer Mobile App (ID & Selfie)',
        'Branch Teller Terminal',
        'Partner Digital Onboarding API',
      ],
      child: [
        'Biometric & Document HSM Vault',
        'AML & PEP Watchlist Audit Store',
        'Core Customer Master DB (CIF)',
        'FinCEN Regulatory Reporting Feed',
      ],
      infra: [
        'Ingress DMZ Edge Gateway',
        'Secure Identity Microservices Cluster',
        'Dedicated Hardware Security Module (HSM)',
        'Kafka Audit Event Mesh',
      ],
      operations: [
        'Government ID OCR & Hologram Validation',
        'Facial Biometric Liveness Check',
        'Sanctions & PEP Watchlist Screening',
        'Risk Scoring & Adverse Media Filter',
        'Compliance Officer Approval Review',
      ],
      architecture: [
        'DMZ Ingress Boundary',
        'Biometric & PII Isolated Enclave',
        'mTLS 1.3 / gRPC Cryptographic Zone',
        'Regulatory Compliance Boundary',
      ],
      metadata: {
        systemName: 'Enterprise KYC & AML Screening Pipeline',
        assessmentId: 'BANK-KYC-AML-2026-V3',
        environment: 'air-gapped-production',
        classificationLevel: 'RESTRICTED_PII',
        complianceFrameworks: ['Bank Secrecy Act (BSA)', 'USA PATRIOT Act', 'EU 6AMLD', 'FATF Rec 10'],
        notes: 'Biometric face templates and raw identity documents are held strictly in HSM-backed vaults.',
      },
    },
  },
  {
    id: 'tx-credit-card-payment',
    name: 'Transaction Banking Credit Card Payment',
    description: 'High-speed credit card authorization, ISO 8583 message switch, fraud engine, and clearing settlement.',
    category: 'Transaction Banking',
    badge: 'Card Payment',
    payload: {
      source: [
        'Merchant POS Terminal',
        'E-Commerce Payment Gateway',
        'ATM Network Switch',
      ],
      child: [
        'Card Scheme Network (Visa / Mastercard)',
        'Real-Time Fraud & Risk Lake',
        'Cardholder Accounts DB',
        'General Ledger Settlement Subsystem',
      ],
      infra: [
        'High-Throughput Edge Ingress',
        'PCI-DSS Bare-Metal Enclave',
        'Core Banking ISO 8583 Message Bus',
        'High-Availability Active-Active Cluster',
      ],
      operations: [
        'ISO 8583 / ISO 20022 Message Validation',
        'PIN Translation & CVV Cryptographic Verification',
        'Sub-Second Neural Fraud Scoring',
        'Available Credit Authorization Hold',
        'Daily Multi-Currency Settlement Batch',
      ],
      architecture: [
        'External Financial DMZ',
        'PCI-DSS Cardholder Data Environment (CDE)',
        'Hardware Security Module (HSM) Crypto Boundary',
        'Core Financial Trust Zone',
      ],
      metadata: {
        systemName: 'Transaction Banking Credit Card Processing & Settlement Engine',
        assessmentId: 'TX-BANK-CC-2026-X8',
        environment: 'air-gapped-production',
        classificationLevel: 'RESTRICTED_PII',
        complianceFrameworks: ['PCI-DSS v4.0 Level 1', 'EMVCo Specifications', 'ISO 8583 / ISO 20022'],
        notes: 'Sub-300ms SLA for online authorizations with end-of-day multi-currency net settlement.',
      },
    },
  },
  {
    id: 'retail-customer-onboarding',
    name: 'Customer Onboarding for a Retail Account',
    description: 'Digital retail bank account opening, credit checks, IBAN generation, and virtual card provisioning.',
    category: 'Retail Banking',
    badge: 'Retail Onboarding',
    payload: {
      source: [
        'Retail Banking Web Portal',
        'iOS & Android Mobile App',
        'In-Branch Tablet Kiosk',
      ],
      child: [
        'Core Banking Deposit Engine',
        'Card Management (Virtual Debit)',
        'Enterprise CRM Service',
        'Customer Notification Gateway (SMS/Email)',
        'Credit & Risk Profile Store',
      ],
      infra: [
        'DMZ Ingress & DDoS Shield',
        'Air-Gapped Retail Banking K8s VPC',
        'Kafka Event & Orchestration Mesh',
        'Secure Core Ledger Storage',
      ],
      operations: [
        'Applicant ID & Address Verification',
        'Credit Bureau & ChexSystems Scoring',
        'Core Account & IBAN Generation',
        'Digital Virtual Debit Card Provisioning',
        'Welcome Kit & Initial Funding Trigger',
      ],
      architecture: [
        'Public Ingress DMZ Boundary',
        'Internal Core Banking Security Zone',
        'Encrypted Customer Credential Enclave',
        'Mutual TLS (mTLS) Service Mesh',
      ],
      metadata: {
        systemName: 'Retail Customer Digital Account Onboarding Engine',
        assessmentId: 'RET-ONBOARD-2026-A1',
        environment: 'hybrid-vpc',
        classificationLevel: 'CONFIDENTIAL',
        complianceFrameworks: ['CFPB Regulation E', 'FCRA', 'OCC Retail Guidelines', 'GLBA'],
        notes: 'Instant virtual debit card provisioning enabled upon successful credit bureau & KYC clearance.',
      },
    },
  },
  {
    id: 'pci-payment-flow',
    name: 'PCI-DSS Payment Tokenization & Clearing',
    description: 'High-security payment ingestion, cardholder tokenization, and settlement flow.',
    category: 'Financial Services',
    badge: 'PCI-DSS L1',
    payload: {
      source: [
        'Customer Checkout Web App',
        'POS Terminal API Gateway',
        'Subscription Billing Daemon',
      ],
      child: [
        'Tokenized Card Vault (HSM)',
        'Payment Gateway Acquirer Link',
        'Fraud Risk Analytics DB',
        'General Ledger ERP',
      ],
      infra: [
        'Ingress DMZ Edge Cluster',
        'PCI-DSS Isolated Enclave',
        'Internal Financial Kubernetes Tier',
      ],
      operations: [
        'PAN Ingestion & Format Validation',
        'Cryptographic PII Tokenization',
        'Real-time ML Fraud Scoring',
        'Daily Batch Settlement ETL',
      ],
      architecture: [
        'DMZ Ingress Boundary',
        'PCI-DSS Compliant Security Zone',
        'mTLS / gRPC Encryption Zone',
      ],
      metadata: {
        systemName: 'Global Payment & Card Tokenization Engine',
        assessmentId: 'SEC-ASSESS-2026-PCI-041',
        environment: 'air-gapped-production',
        classificationLevel: 'RESTRICTED_PII',
        complianceFrameworks: ['PCI-DSS v4.0', 'SOC-2 Type II', 'ISO 27001'],
        notes: 'Strict tokenization requirement: Raw PAN must never touch persistent general ledger tiers.',
      },
    },
  },
  {
    id: 'airgap-defense-telemetry',
    name: 'Air-Gapped Defense Flight Telemetry',
    description: 'Hardware data diode ingestion for avionics blackbox records and mission telemetry.',
    category: 'Aerospace & Defense',
    badge: 'Air-Gapped Diode',
    payload: {
      source: [
        'Ground Radar Station Node',
        'Avionics Flight Data Recorder',
        'Unmanned Sensor Array',
      ],
      child: [
        'Classified Timeseries DB',
        'Mission Telemetry Analytics',
        'Optical Cold Storage Archive',
      ],
      infra: [
        'Unclassified Edge Receptor',
        'Air-Gapped Classified Core',
        'Hardware Data Diode Link',
      ],
      operations: [
        'Hardware Diode Unidirectional Feed',
        'Cryptographic Signature Verification',
        'Signal De-jitter & Anomaly Filter',
        'Air-gap Quarantine Inspection',
      ],
      architecture: [
        'Red/Black Optical Separation Zone',
        'High-Assurance Classified Boundary',
        'Hardware One-Way Air Gap',
      ],
      metadata: {
        systemName: 'Avionics Mission Ingestion & Analysis Subsystem',
        assessmentId: 'DEF-AIRGAP-2026-X9',
        environment: 'classified',
        classificationLevel: 'RESTRICTED_PII',
        complianceFrameworks: ['NIST SP 800-53 High', 'DoD Zero Trust Overlay'],
        notes: 'Physical optical diode enforces strictly zero reverse data packet transmission.',
      },
    },
  },
  {
    id: 'healthcare-hipaa-fhir',
    name: 'Healthcare FHIR Patient Record Pipeline',
    description: 'HIPAA-compliant ingestion of electronic health records with automated PII scrubbers.',
    category: 'Healthcare & Life Sciences',
    badge: 'HIPAA Safe Harbor',
    payload: {
      source: [
        'Patient Portal Mobile Client',
        'Epic Systems EMR Gateway',
        'Laboratory Diagnostic Feed',
      ],
      child: [
        'HIPAA Compliant FHIR Lake',
        'Clinical Decision AI Engine',
        'Immutable Audit Trail Ledger',
      ],
      infra: [
        'DMZ Ingress Healthcare Proxy',
        'Hardened Kubernetes Cluster',
        'Encrypted Storage Appliance',
      ],
      operations: [
        'HL7-to-FHIR Schema Transformation',
        'HIPAA PII De-Identification & Masking',
        'Consent Directive Evaluation',
        'Audit Logging & Attestation',
      ],
      architecture: [
        'Public Ingress Edge DMZ',
        'HIPAA BAA Protected Trust Zone',
        'Dedicated Audit & Quarantine Zone',
      ],
      metadata: {
        systemName: 'Universal Clinical Health Data Exchange',
        assessmentId: 'HLTH-HIPAA-2026-F12',
        environment: 'hybrid-vpc',
        classificationLevel: 'CONFIDENTIAL',
        complianceFrameworks: ['HIPAA Privacy Rule', 'HITECH', 'HITRUST CSF'],
        notes: 'Full HIPAA 18 Safe Harbor identifiers stripped before downstream AI processing.',
      },
    },
  },
];

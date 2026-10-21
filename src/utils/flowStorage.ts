/**
 * Enterprise Flow & Template Storage
 * Manages built-in archetypes and user-created custom data flow templates
 * with persistent air-gapped local storage.
 */

import { AssessmentPreset, ENTERPRISE_ASSESSMENT_PRESETS } from '../data/sampleAssessments';
import { AssessmentInputPayload } from '../types/dfd';

const STORAGE_KEY = 'enterprise_dfd_custom_flow_templates';

export function getCustomFlows(): AssessmentPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load custom flows from localStorage:', err);
    return [];
  }
}

export function getAllFlowTemplates(): AssessmentPreset[] {
  const custom = getCustomFlows();
  return [...custom, ...ENTERPRISE_ASSESSMENT_PRESETS];
}

export function saveCustomFlow(flow: AssessmentPreset): AssessmentPreset[] {
  const custom = getCustomFlows();
  const existingIndex = custom.findIndex((f) => f.id === flow.id);

  let updated: AssessmentPreset[];
  if (existingIndex >= 0) {
    updated = [...custom];
    updated[existingIndex] = flow;
  } else {
    updated = [flow, ...custom];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save flow to localStorage:', err);
  }

  return updated;
}

export function deleteCustomFlow(id: string): AssessmentPreset[] {
  const custom = getCustomFlows();
  const filtered = custom.filter((f) => f.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete flow from localStorage:', err);
  }

  return filtered;
}

export function createNewFlowTemplate(params: {
  name: string;
  badge: string;
  category: string;
  description: string;
  classificationLevel?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED_PII';
  environment?: 'air-gapped-production' | 'on-prem-dmz' | 'classified' | 'hybrid-vpc';
  initialPayload?: AssessmentInputPayload;
  cloneCurrent?: boolean;
}): AssessmentPreset {
  const id = `custom-flow-${Date.now()}`;
  const assessmentId = `FLOW-${Date.now().toString().slice(-6)}`;

  let payload: AssessmentInputPayload;

  if (params.cloneCurrent && params.initialPayload) {
    payload = {
      ...JSON.parse(JSON.stringify(params.initialPayload)),
      metadata: {
        ...params.initialPayload.metadata,
        systemName: params.name,
        assessmentId,
        classificationLevel: params.classificationLevel || params.initialPayload.metadata?.classificationLevel || 'INTERNAL',
        environment: params.environment || params.initialPayload.metadata?.environment || 'air-gapped-production',
      },
    };
  } else {
    payload = {
      source: ['Client Portal Ingress', 'Partner API Gateway'],
      child: ['Enterprise Core DB', 'Audit Ledger Store'],
      infra: ['DMZ Boundary Cluster', 'Secure Core Enclave'],
      operations: ['Schema & Format Validation', 'Data Scrubbing & Tokenization'],
      architecture: ['Ingress Perimeter Zone', 'mTLS 1.3 Encryption Boundary'],
      metadata: {
        systemName: params.name,
        assessmentId,
        classificationLevel: params.classificationLevel || 'INTERNAL',
        environment: params.environment || 'air-gapped-production',
        notes: params.description,
      },
    };
  }

  const newPreset: AssessmentPreset = {
    id,
    name: params.name,
    badge: params.badge || params.name.slice(0, 14),
    category: params.category || 'Custom Enterprise Flows',
    description: params.description || 'Custom enterprise data flow architecture.',
    payload,
  };

  saveCustomFlow(newPreset);
  return newPreset;
}

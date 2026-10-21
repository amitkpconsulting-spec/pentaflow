import React, { useState, useEffect } from 'react';
import {
  REGION_OPTIONS,
  INDUSTRY_OPTIONS,
  getSmartDefaultsForOnboarding,
} from '../../utils/complianceEngine';
import { OnboardingProfile } from '../../types/compliance';
import { AssessmentPreset } from '../../data/sampleAssessments';
import {
  Shield,
  Globe,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  UserCheck,
} from 'lucide-react';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  initialProfile: OnboardingProfile | null;
  onComplete: (profile: OnboardingProfile, smartPreset: AssessmentPreset) => void;
  onSkip: () => void;
  onClose?: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  initialProfile,
  onComplete,
  onSkip,
  onClose,
}) => {
  const [companyName, setCompanyName] = useState<string>(
    initialProfile?.companyName || ''
  );
  const [userName, setUserName] = useState<string>(
    initialProfile?.userName || 'Compliance Manager'
  );
  const [region, setRegion] = useState<string>(initialProfile?.region || '');
  const [industry, setIndustry] = useState<string>(initialProfile?.industry || '');

  const [regionError, setRegionError] = useState<string>('');
  const [industryError, setIndustryError] = useState<string>('');

  useEffect(() => {
    if (isOpen && initialProfile) {
      setCompanyName(initialProfile.companyName || '');
      setUserName(initialProfile.userName || 'Compliance Manager');
      setRegion(initialProfile.region || '');
      setIndustry(initialProfile.industry || '');
      setRegionError('');
      setIndustryError('');
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  const selectedRegionObj = REGION_OPTIONS.find((r) => r.value === region);
  const selectedIndustryObj = INDUSTRY_OPTIONS.find((i) => i.value === industry);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!region) {
      setRegionError('Please select a regulatory region to apply baseline compliance rules.');
      hasError = true;
    } else {
      setRegionError('');
    }

    if (!industry) {
      setIndustryError('Please select an industry vertical to load smart architecture defaults.');
      hasError = true;
    } else {
      setIndustryError('');
    }

    if (hasError) return;

    const cleanCompany = companyName.trim() || 'Enterprise Organization';
    const cleanUser = userName.trim() || 'Compliance Manager';

    const { preset } = getSmartDefaultsForOnboarding(
      region,
      industry,
      cleanCompany
    );

    const newProfile: OnboardingProfile = {
      companyName: cleanCompany,
      userName: cleanUser,
      region,
      industry,
      completed: true,
      skipped: false,
      configuredAt: new Date().toISOString(),
    };

    onComplete(newProfile, preset);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Guided Compliance &amp; Source Flow Setup
              </h2>
              <p className="text-xs text-slate-400">
                Select your region and industry to automatically configure baseline DAMA &amp; regulatory rules.
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          {/* Organization & User Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Organization / Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Global Bank"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Name / Role (Audit Log Attribution)
              </label>
              <div className="relative">
                <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Priya Sharma (Compliance Lead)"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Required Field 1: Region Dropdown */}
          <div>
            <label
              htmlFor="onboarding-region-select"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Regulatory Region *</span>
            </label>
            <select
              id="onboarding-region-select"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                if (e.target.value) setRegionError('');
              }}
              className={`w-full rounded-lg bg-slate-950 border px-3 py-2.5 text-xs text-slate-100 focus:outline-none transition ${
                regionError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-slate-700 focus:border-indigo-500'
              }`}
            >
              <option value="">-- Select your operating region --</option>
              {REGION_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {regionError && (
              <p
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-400"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{regionError}</span>
              </p>
            )}
          </div>

          {/* Required Field 2: Industry Dropdown */}
          <div>
            <label
              htmlFor="onboarding-industry-select"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Industry Vertical *</span>
            </label>
            <select
              id="onboarding-industry-select"
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                if (e.target.value) setIndustryError('');
              }}
              className={`w-full rounded-lg bg-slate-950 border px-3 py-2.5 text-xs text-slate-100 focus:outline-none transition ${
                industryError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-slate-700 focus:border-indigo-500'
              }`}
            >
              <option value="">-- Select your industry vertical --</option>
              {INDUSTRY_OPTIONS.map((ind) => (
                <option key={ind.value} value={ind.value}>
                  {ind.label}
                </option>
              ))}
            </select>
            {industryError && (
              <p
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-400"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{industryError}</span>
              </p>
            )}
          </div>

          {/* Live Smart Defaults Preview Box */}
          {(selectedRegionObj || selectedIndustryObj) && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Smart Baseline Defaults Ready to Apply</span>
              </div>
              {selectedRegionObj && (
                <div className="text-slate-300">
                  <span className="text-slate-400">Primary Statutory Mandate: </span>
                  <span className="font-medium text-slate-100">
                    {selectedRegionObj.primaryRegulation}
                  </span>
                </div>
              )}
              {selectedIndustryObj && (
                <div className="text-slate-300">
                  <span className="text-slate-400">Pre-Configured Rulepack: </span>
                  <span className="font-medium text-slate-100">
                    {selectedIndustryObj.frameworks.join(' · ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              Skip for now
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <span>Next: Apply Smart Defaults</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

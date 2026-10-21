import React, { useState, useMemo } from 'react';
import {
  ComplianceAlertItem,
  ComplianceSeverity,
  COMPLIANCE_STATUS_HEX,
  COMPLIANCE_STATUS_LABEL,
  OnboardingProfile,
  ActivityLogEntry,
} from '../../types/compliance';
import {
  REGION_OPTIONS,
  INDUSTRY_OPTIONS,
  exportComplianceStatusCsv,
  exportComplianceStatusPdf,
} from '../../utils/complianceEngine';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  FileText,
  FileSpreadsheet,
  Lock,
  Filter,
  Wrench,
  Eye,
  Clock,
  User,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';

interface ComplianceDashboardPanelProps {
  alerts: ComplianceAlertItem[];
  activityLogs: readonly ActivityLogEntry[];
  onboardingProfile: OnboardingProfile | null;
  systemName: string;
  onApplySingleFix: (alert: ComplianceAlertItem) => void;
  onApplyBulkFixes: (selectedAlerts: ComplianceAlertItem[]) => void;
  onLocateSourceOnCanvas: (sourceNodeId: string, sourceLabel: string) => void;
  onOpenOnboardingWizard: () => void;
}

export const ComplianceDashboardPanel: React.FC<ComplianceDashboardPanelProps> = ({
  alerts,
  activityLogs,
  onboardingProfile,
  systemName,
  onApplySingleFix,
  onApplyBulkFixes,
  onLocateSourceOnCanvas,
  onOpenOnboardingWizard,
}) => {
  const [activeSubView, setActiveSubView] = useState<'alerts' | 'activity-log'>('alerts');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmBulkModalOpen, setIsConfirmBulkModalOpen] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | ComplianceSeverity>('ALL');

  // Activity Log Filters (Epic 4: Date Range, User, Severity Level)
  const [logDateRange, setLogDateRange] = useState<'ALL' | 'TODAY' | '24H' | '7D'>('ALL');
  const [logUserFilter, setLogUserFilter] = useState<string>('ALL');
  const [logSeverityFilter, setLogSeverityFilter] = useState<'ALL' | ComplianceSeverity>('ALL');

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered alerts while strictly preserving Critical (Red) -> Warning (Yellow) -> Compliant (Green) hierarchy
  const displayedAlerts = useMemo(() => {
    if (severityFilter === 'ALL') return alerts;
    return alerts.filter((a) => a.severity === severityFilter);
  }, [alerts, severityFilter]);

  // Selectable (unresolved or all) items in view
  const selectableAlerts = useMemo(
    () => displayedAlerts.filter((a) => a.severity !== 'COMPLIANT'),
    [displayedAlerts]
  );

  const allSelectableChecked =
    selectableAlerts.length > 0 &&
    selectableAlerts.every((a) => selectedIds.includes(a.id));

  const handleToggleSelectAll = () => {
    if (allSelectableChecked) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableAlerts.map((a) => a.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedAlertObjects = useMemo(
    () => alerts.filter((a) => selectedIds.includes(a.id)),
    [alerts, selectedIds]
  );

  const handleConfirmBulkFix = () => {
    if (selectedAlertObjects.length === 0) return;
    onApplyBulkFixes(selectedAlertObjects);
    setSelectedIds([]);
    setIsConfirmBulkModalOpen(false);
  };

  // Counts
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;
  const compliantCount = alerts.filter((a) => a.severity === 'COMPLIANT').length;

  // Unique users in Activity Log
  const uniqueLogUsers = useMemo(() => {
    const set = new Set<string>();
    activityLogs.forEach((l) => set.add(l.userName));
    return Array.from(set);
  }, [activityLogs]);

  // Filtered Activity Logs
  const filteredActivityLogs = useMemo(() => {
    const now = Date.now();
    return activityLogs.filter((entry) => {
      if (logUserFilter !== 'ALL' && entry.userName !== logUserFilter) {
        return false;
      }
      if (logSeverityFilter !== 'ALL' && entry.severity !== logSeverityFilter) {
        return false;
      }
      if (logDateRange !== 'ALL') {
        const entryTime = new Date(entry.timestamp).getTime();
        if (logDateRange === 'TODAY') {
          const todayStr = new Date().toISOString().slice(0, 10);
          if (!entry.timestamp.startsWith(todayStr)) return false;
        } else if (logDateRange === '24H') {
          if (now - entryTime > 24 * 60 * 60 * 1000) return false;
        } else if (logDateRange === '7D') {
          if (now - entryTime > 7 * 24 * 60 * 60 * 1000) return false;
        }
      }
      return true;
    });
  }, [activityLogs, logUserFilter, logSeverityFilter, logDateRange]);

  const regionLabel =
    REGION_OPTIONS.find((r) => r.value === onboardingProfile?.region)?.label ||
    'Default Global Baseline';
  const industryLabel =
    INDUSTRY_OPTIONS.find((i) => i.value === onboardingProfile?.industry)?.label ||
    'Enterprise Data Flow';

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Top Dashboard Header */}
      <div className="border-b border-slate-800 bg-slate-900/70 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white">
              Source Flow Compliance &amp; Remediation Center
            </h2>
            <span className="text-xs text-slate-400">
              · {onboardingProfile?.companyName || systemName}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Region: {regionLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Industry: {industryLabel}</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onOpenOnboardingWizard}
              className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium cursor-pointer"
            >
              Configure Baseline Wizard
            </button>
          </div>
        </div>

        {/* Right Controls: Sub-view Switcher & Export Report Dropdown (Epic 4) */}
        <div className="flex items-center gap-3">
          {/* Segmented View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveSubView('alerts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                activeSubView === 'alerts'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Prioritized Risks ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('activity-log')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'activity-log'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Activity Log ({activityLogs.length})</span>
            </button>
          </div>

          {/* Audit-Ready Export Report Dropdown (.PDF or .CSV) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-1.5 z-40 text-xs"
                onClick={() => setIsExportMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() =>
                    exportComplianceStatusPdf(alerts, onboardingProfile, systemName)
                  }
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-red-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Download .PDF</div>
                    <div className="text-[10px] text-slate-400">
                      Executive audit report (Critical first)
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    exportComplianceStatusCsv(alerts, onboardingProfile, systemName)
                  }
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white transition text-left cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Download .CSV</div>
                    <div className="text-[10px] text-slate-400">
                      Spreadsheet register for regulators
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Bar with Consistent Status Colors (#EF4444 Red, #F59E0B Yellow, #10B981 Green) */}
      <div className="border-b border-slate-800 bg-slate-950 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <button
            type="button"
            onClick={() => setSeverityFilter('ALL')}
            className={`flex items-center gap-2 py-1 px-2.5 rounded-md transition cursor-pointer ${
              severityFilter === 'ALL'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>All Items: {alerts.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setSeverityFilter('CRITICAL')}
            className={`flex items-center gap-2 py-1 px-2.5 rounded-md transition cursor-pointer ${
              severityFilter === 'CRITICAL'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COMPLIANCE_STATUS_HEX.CRITICAL }}
            />
            <span>Critical (Red): {criticalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setSeverityFilter('WARNING')}
            className={`flex items-center gap-2 py-1 px-2.5 rounded-md transition cursor-pointer ${
              severityFilter === 'WARNING'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COMPLIANCE_STATUS_HEX.WARNING }}
            />
            <span>Warnings (Yellow): {warningCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setSeverityFilter('COMPLIANT')}
            className={`flex items-center gap-2 py-1 px-2.5 rounded-md transition cursor-pointer ${
              severityFilter === 'COMPLIANT'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COMPLIANCE_STATUS_HEX.COMPLIANT }}
            />
            <span>Compliant / Resolved (Green): {compliantCount}</span>
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Sorted automatically by severity: Critical → Warning → Compliant
        </div>
      </div>

      {/* SUB-VIEW 1: PRIORITIZED ALERTS & BULK REMEDIATION (EPICS 2 & 3) */}
      {activeSubView === 'alerts' && (
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 pb-24">
          {/* List Header with "Select All" Checkbox (Epic 3) */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelectableChecked}
                onChange={handleToggleSelectAll}
                disabled={selectableAlerts.length === 0}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
              <span className="font-semibold text-slate-200">
                Select All Actionable Alerts ({selectableAlerts.length})
              </span>
            </label>

            <span className="text-slate-400">
              Click &ldquo;View Details&rdquo; on any row to inspect regulation, exact error, and recommended fix
            </span>
          </div>

          {/* Alert Rows */}
          {displayedAlerts.map((alert) => {
            const isExpanded = Boolean(expandedIds[alert.id]);
            const isChecked = selectedIds.includes(alert.id);
            const isActionable = alert.severity !== 'COMPLIANT';

            return (
              <div
                key={alert.id}
                className={`rounded-xl border transition ${
                  isChecked
                    ? 'border-indigo-500 bg-slate-900'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {/* Collapsed Single-Line Plain-Language Summary Row (Epic 2 Progressive Disclosure) */}
                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!isActionable}
                      onChange={() => handleToggleSelectRow(alert.id)}
                      aria-label={`Select ${alert.plainSummary}`}
                      className="w-4 h-4 accent-indigo-500 rounded cursor-pointer disabled:opacity-30 shrink-0"
                    />

                    {alert.severity === 'CRITICAL' ? (
                      <AlertCircle
                        className="w-4 h-4 shrink-0"
                        style={{ color: COMPLIANCE_STATUS_HEX.CRITICAL }}
                      />
                    ) : alert.severity === 'WARNING' ? (
                      <AlertTriangle
                        className="w-4 h-4 shrink-0"
                        style={{ color: COMPLIANCE_STATUS_HEX.WARNING }}
                      />
                    ) : (
                      <CheckCircle2
                        className="w-4 h-4 shrink-0"
                        style={{ color: COMPLIANCE_STATUS_HEX.COMPLIANT }}
                      />
                    )}

                    {/* Single-Line Summary in Plain English */}
                    <span className="text-sm font-medium text-slate-100 truncate">
                      {alert.plainSummary}
                    </span>
                  </div>

                  {/* Right Side: View Details Chevron & Consistent Top-Right Status Tag */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(alert.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
                    >
                      <span>View Details</span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {/* Consistent Status Tag (Exact Hex Code & Top-Right Placement) */}
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-white shadow-xs min-w-[92px] justify-center"
                      style={{ backgroundColor: alert.statusHex }}
                    >
                      <span>{COMPLIANCE_STATUS_LABEL[alert.severity]}</span>
                    </span>
                  </div>
                </div>

                {/* Expanded Progressive Disclosure Details (Regulation, Exact Error, Recommended Fix) */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/80 px-5 py-4 space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Specific Legal Regulation
                        </span>
                        <p className="text-slate-200 leading-relaxed font-medium">
                          {alert.legalRegulation}
                        </p>
                      </div>

                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Exact Error
                        </span>
                        <p className="text-slate-200 leading-relaxed">
                          {alert.exactError}
                        </p>
                      </div>

                      <div>
                        <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Recommended Fix
                        </span>
                        <p className="text-emerald-300 leading-relaxed font-medium">
                          {alert.recommendedFix}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <div className="text-slate-400">
                        <span>Source System: </span>
                        <span className="text-slate-200 font-medium">{alert.sourceLabel}</span>
                        {alert.targetLabel && (
                          <>
                            <span className="mx-1.5">→</span>
                            <span>Target: </span>
                            <span className="text-slate-200 font-medium">{alert.targetLabel}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {alert.sourceNodeId && alert.sourceNodeId !== 'NONE' && (
                          <button
                            type="button"
                            onClick={() =>
                              onLocateSourceOnCanvas(alert.sourceNodeId, alert.sourceLabel)
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Inspect Source on Canvas</span>
                          </button>
                        )}

                        {isActionable && (
                          <button
                            type="button"
                            onClick={() => onApplySingleFix(alert)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Apply Fix</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-VIEW 2: TRANSPARENT IMMUTABLE ACTIVITY LOG (EPIC 4) */}
      {activeSubView === 'activity-log' && (
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Immutability Notice & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center gap-2.5 text-xs">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">
                  Immutable Audit Trail (Append-Only Ledger)
                </span>
                <p className="text-slate-400 text-[11px]">
                  Chronological record of all compliance settings and status changes. Entries cannot be edited or deleted by any user, including Admins.
                </p>
              </div>
            </div>

            {/* Filters: Date Range, User, Severity Level */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Date Range:</span>
                <select
                  value={logDateRange}
                  onChange={(e) => setLogDateRange(e.target.value as any)}
                  className="rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="24H">Last 24 Hours</option>
                  <option value="7D">Last 7 Days</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">User:</span>
                <select
                  value={logUserFilter}
                  onChange={(e) => setLogUserFilter(e.target.value)}
                  className="rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="ALL">All Users</option>
                  {uniqueLogUsers.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Severity:</span>
                <select
                  value={logSeverityFilter}
                  onChange={(e) => setLogSeverityFilter(e.target.value as any)}
                  className="rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical (Red)</option>
                  <option value="WARNING">Warning (Yellow)</option>
                  <option value="COMPLIANT">Compliant (Green)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Activity Log Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/90 text-slate-400 uppercase text-[10px]">
                  <th className="py-3 px-4 font-semibold">Date / Time (Timestamp)</th>
                  <th className="py-3 px-4 font-semibold">User Name</th>
                  <th className="py-3 px-4 font-semibold">Action Taken</th>
                  <th className="py-3 px-4 font-semibold">Status Change</th>
                  <th className="py-3 px-4 font-semibold text-right">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredActivityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/90 transition">
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {log.actionTaken}
                    </td>
                    <td className="py-3 px-4 font-medium text-emerald-300">
                      {log.statusChange}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold text-white"
                        style={{
                          backgroundColor: COMPLIANCE_STATUS_HEX[log.severity],
                        }}
                      >
                        {COMPLIANCE_STATUS_LABEL[log.severity]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EPIC 3: FLOATING BULK ACTIONS TOOLBAR */}
      {selectedIds.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 rounded-2xl border border-indigo-500/50 bg-slate-900/95 px-6 py-3 shadow-2xl backdrop-blur-md">
          <span className="text-xs font-semibold text-white">
            {selectedIds.length} compliance item{selectedIds.length === 1 ? '' : 's'} selected
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmBulkModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Apply Fix ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* EPIC 3: BULK ACTION CONFIRMATION MODAL */}
      {isConfirmBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Confirm Bulk Compliance Remediation
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  You are about to update {selectedAlertObjects.length} record{selectedAlertObjects.length === 1 ? '' : 's'}. Proceed?
                </p>
              </div>
            </div>

            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2 text-xs">
              {selectedAlertObjects.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2">
                  <span className="text-slate-300 truncate">{item.plainSummary}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: item.statusHex }}
                  >
                    {COMPLIANCE_STATUS_LABEL[item.severity]} → Green
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmBulkModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkFix}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
              >
                Proceed &amp; Resolve ({selectedAlertObjects.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

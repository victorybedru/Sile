import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, UserPlus, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { canTransitionStatus, Priority, Report, ReportStatus, VALID_STATUS_TRANSITIONS } from '../../types';
import { reportService } from '../../services/reportService';

interface ReportDetailModalProps {
  report: Report | null;
  onClose: () => void;
  onReportUpdated: (updated: Report) => void;
}

const COMMON_DISPATCH_TEAMS = [
  'Addis Ababa Electric - Bole District Rapid Unit',
  'Addis Ababa Electric - Kirkos High Tension Team',
  'Addis Ababa Electric - Yeka Substation Maintenance',
  'Addis Ababa Water & Sewerage Authority - Eastern Mains',
  'Addis Ababa Water & Sewerage Authority - Leak Repair #4',
  'City Roads Authority - Rapid Pavement Unit',
  'City Roads Authority - Grate & Drainage Crew',
  'Municipal Environmental Sanitation Desk',
];

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  onClose,
  onReportUpdated,
}) => {
  if (!report) return null;

  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>(report.status);
  const [assignedTo, setAssignedTo] = useState(report.assignedTo || '');
  const [coordinatorNote, setCoordinatorNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Determine allowed next statuses
  const allowedNext = VALID_STATUS_TRANSITIONS[report.status] || [];

  const handleStatusChange = async (targetStatus: ReportStatus) => {
    setErrorMessage(null);
    const check = canTransitionStatus(report.status, targetStatus);
    if (!check.allowed) {
      setErrorMessage(check.reason || 'Invalid status transition.');
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await reportService.updateReportStatus(
        report.id,
        targetStatus,
        coordinatorNote.trim() || undefined,
        'Coordinator'
      );
      onReportUpdated(updated);
      setSelectedStatus(targetStatus);
      setCoordinatorNote('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update report status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssign = async () => {
    if (!assignedTo.trim()) {
      setErrorMessage('Please enter or select a dispatch unit or team name.');
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);
    try {
      const updated = await reportService.assignReport(
        report.id,
        assignedTo.trim(),
        coordinatorNote.trim() || undefined
      );
      onReportUpdated(updated);
      setSelectedStatus(updated.status);
      setCoordinatorNote('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to assign report.');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-0.5">
              <span>Report #{report.id}</span>
              <span>·</span>
              <span>{report.syncStatus}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {report.category} Issue — {report.subCity} Sub-City
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close detail modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Workflow Status Progression Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Current Status: <span className="text-slate-900 font-extrabold">{report.status}</span>
              </span>
              <span className="text-xs text-slate-500">
                Workflow: Draft → Submitted → Assigned → In Progress → Resolved
              </span>
            </div>

            {/* Transition Controls */}
            {allowedNext.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-700 block">
                  Permitted next actions:
                </span>
                <div className="flex flex-wrap gap-2">
                  {allowedNext.map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs ${
                        st === 'Resolved'
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : st === 'In Progress'
                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                          : st === 'Assigned'
                          ? 'bg-indigo-700 text-white hover:bg-indigo-800'
                          : st === 'Rejected'
                          ? 'bg-rose-700 text-white hover:bg-rose-800'
                          : 'bg-[#0F2042] text-white hover:bg-[#1E3A6E]'
                      }`}
                    >
                      <span>Move to {st}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-900 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>
                  This report is in its final status ({report.status}). No further transitions available.
                </span>
              </div>
            )}
          </div>

          {/* Assignment Section */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-white">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              Assignment & Dispatch
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">-- Select Dispatch Team --</option>
                {COMMON_DISPATCH_TEAMS.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAssign}
                disabled={isUpdating || !assignedTo}
                className="px-4 py-2 bg-[#0F2042] text-white rounded-lg text-xs font-bold hover:bg-[#1E3A6E] disabled:opacity-50 transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Assign Team</span>
              </button>
            </div>
            {report.assignedTo && (
              <p className="text-xs text-slate-600">
                Currently assigned to: <strong>{report.assignedTo}</strong>
              </p>
            )}
          </div>

          {/* Coordinator Internal Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Add Coordinator Resolution Note
            </label>
            <textarea
              rows={2}
              value={coordinatorNote}
              onChange={(e) => setCoordinatorNote(e.target.value)}
              placeholder="e.g. Unit 3 dispatched to site. Grate delivered and sealed."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Report Details summary */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                Resident Problem Description
              </span>
              <p className="text-sm text-slate-900 whitespace-pre-line leading-relaxed font-medium">
                {report.description}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-slate-700">
              <div>
                <span className="text-slate-500">Location:</span> {report.specificLocation}
              </div>
              <div>
                <span className="text-slate-500">Priority:</span> <strong>{report.priority}</strong>
              </div>
              <div>
                <span className="text-slate-500">Created:</span> {formatDate(report.createdAt)}
              </div>
            </div>
          </div>

          {/* Audit History Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              Full Activity & Audit History
            </h4>
            <div className="relative pl-6 space-y-3.5 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {report.history.map((log) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-slate-700 ring-4 ring-white" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{log.action}</span>
                      <span className="text-[10px] text-slate-500">{formatDate(log.timestamp)}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                        {log.actor}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

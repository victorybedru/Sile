import React, { useState } from 'react';
import { FileText, RefreshCw, AlertCircle, CheckCircle2, Clock, ChevronRight, Zap, Droplet, Construction, HelpCircle, X, ShieldAlert } from 'lucide-react';
import { Report, ReportStatus, SyncStatus } from '../../types';
import { syncService } from '../../services/syncService';

interface MyReportsViewProps {
  reports: Report[];
  onOpenReportModal: () => void;
  onRefreshReports: () => void;
}

export const MyReportsView: React.FC<MyReportsViewProps> = ({
  reports,
  onOpenReportModal,
  onRefreshReports,
}) => {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Resolved' | 'PendingSync'>('All');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const filteredReports = reports.filter((r) => {
    if (filter === 'Active') {
      return r.status !== 'Resolved' && r.status !== 'Rejected';
    }
    if (filter === 'Resolved') {
      return r.status === 'Resolved';
    }
    if (filter === 'PendingSync') {
      return r.syncStatus === 'Pending' || r.syncStatus === 'Failed';
    }
    return true;
  });

  const handleRetrySync = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    setRetryingId(reportId);
    try {
      const updated = await syncService.syncReport(reportId);
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(updated);
      }
      onRefreshReports();
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'Draft':
        return <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Draft</span>;
      case 'Submitted':
        return <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded">Submitted</span>;
      case 'Assigned':
        return <span className="text-xs font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">Assigned</span>;
      case 'In Progress':
        return <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">In Progress</span>;
      case 'Resolved':
        return <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">Resolved</span>;
      case 'Rejected':
        return <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded">Rejected</span>;
      default:
        return <span className="text-xs text-slate-600">{status}</span>;
    }
  };

  const getSyncBadge = (syncStatus: SyncStatus, errorMsg?: string) => {
    switch (syncStatus) {
      case 'Synchronized':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synchronized</span>
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Sync</span>
          </span>
        );
      case 'Failed':
        return (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded"
            title={errorMsg}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Sync Failed</span>
          </span>
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Electricity':
        return <Zap className="w-4 h-4 text-amber-600" />;
      case 'Water':
        return <Droplet className="w-4 h-4 text-sky-600" />;
      case 'Roads':
        return <Construction className="w-4 h-4 text-emerald-700" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-500" />;
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Reported Problems
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Track status progression and synchronization for issues reported on this device.
          </p>
        </div>

        <button
          onClick={onOpenReportModal}
          className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-[#0F2042] text-white text-sm font-semibold hover:bg-[#1E3A6E] transition-colors cursor-pointer shrink-0"
        >
          + Report Another Problem
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        <button
          onClick={() => setFilter('All')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            filter === 'All'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Reports ({reports.length})
        </button>
        <button
          onClick={() => setFilter('Active')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            filter === 'Active'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Active / In Progress
        </button>
        <button
          onClick={() => setFilter('Resolved')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            filter === 'Resolved'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Resolved
        </button>
        <button
          onClick={() => setFilter('PendingSync')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            filter === 'PendingSync'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Needs Sync ({reports.filter((r) => r.syncStatus !== 'Synchronized').length})
        </button>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No reports found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              {filter === 'All'
                ? "You haven't submitted any infrastructure problem reports yet."
                : `No reports matching the '${filter}' filter.`}
            </p>
          </div>
          <button
            onClick={onOpenReportModal}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-sky-700 text-white hover:bg-sky-800 transition-colors cursor-pointer"
          >
            Report an Issue Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                {/* Header row: Category & Location & Unboxed Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-semibold text-slate-900">
                    {getCategoryIcon(report.category)}
                    <span>{report.category}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-slate-800">{report.subCity}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-500">{report.id}</span>
                </div>

                {/* Description snippet */}
                <p className="text-sm text-slate-900 font-medium line-clamp-2">
                  {report.description}
                </p>

                <p className="text-xs text-slate-500">
                  Location: {report.specificLocation} · Reported: {formatDate(report.createdAt)}
                </p>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="flex flex-col sm:items-end gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Progress:</span>
                    {getStatusBadge(report.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Sync:</span>
                    {getSyncBadge(report.syncStatus, report.syncErrorMessage)}
                  </div>
                </div>

                {report.syncStatus !== 'Synchronized' && (
                  <button
                    onClick={(e) => handleRetrySync(e, report.id)}
                    disabled={retryingId === report.id}
                    className="p-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Retry synchronization with server"
                    aria-label="Retry sync"
                  >
                    <RefreshCw className={`w-4 h-4 ${retryingId === report.id ? 'animate-spin' : ''}`} />
                  </button>
                )}

                <ChevronRight className="w-5 h-5 text-slate-400 hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Detail Modal with Full Audit History */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
                  <span>Report #{selectedReport.id}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedReport.category} Problem in {selectedReport.subCity}
                </h2>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Close report details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Dual status cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Progress Workflow
                  </span>
                  <div>{getStatusBadge(selectedReport.status)}</div>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    {selectedReport.status === 'Resolved'
                      ? 'Action completed by field unit.'
                      : selectedReport.status === 'In Progress'
                      ? 'Dispatched crew actively working.'
                      : 'Received & prioritized.'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Server Sync Status
                  </span>
                  <div>{getSyncBadge(selectedReport.syncStatus, selectedReport.syncErrorMessage)}</div>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    {selectedReport.syncStatus === 'Synchronized'
                      ? 'Confirmed stored on server.'
                      : 'Saved in offline device storage.'}
                  </span>
                </div>
              </div>

              {/* Retry banner if failed */}
              {selectedReport.syncStatus === 'Failed' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>Sync failed: {selectedReport.syncErrorMessage}</span>
                  </div>
                  <button
                    onClick={(e) => handleRetrySync(e, selectedReport.id)}
                    className="px-3 py-1 bg-white text-rose-900 border border-rose-300 rounded font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Retry Now
                  </button>
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Description
                </h4>
                <p className="text-sm sm:text-base leading-relaxed text-slate-900 whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {selectedReport.description}
                </p>
              </div>

              {/* Location details */}
              <div className="text-xs space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-900">Sub-City:</span> {selectedReport.subCity}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Specific Location:</span>{' '}
                  {selectedReport.specificLocation}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Priority:</span> {selectedReport.priority}
                </div>
                {selectedReport.assignedTo && (
                  <div>
                    <span className="font-semibold text-slate-900">Assigned Team:</span>{' '}
                    {selectedReport.assignedTo}
                  </div>
                )}
                {selectedReport.coordinatorNotes && (
                  <div className="pt-1 mt-1 border-t border-slate-200">
                    <span className="font-semibold text-slate-900">Coordinator Notes:</span>
                    <p className="mt-0.5 text-slate-700 whitespace-pre-line">
                      {selectedReport.coordinatorNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Complete Chronological Activity History */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Report Activity History
                </h4>
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedReport.history.map((log) => (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-sky-700 ring-4 ring-white" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{log.action}</span>
                          <span className="text-[10px] text-slate-500">
                            {formatDate(log.timestamp)}
                          </span>
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
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

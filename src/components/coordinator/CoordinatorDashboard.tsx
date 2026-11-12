import React, { useState } from 'react';
import { ShieldCheck, PlusCircle, Filter, FileText, Bell, Zap, Droplet, Construction, HelpCircle, CheckCircle2, Clock, AlertCircle, ChevronRight, Eye, UserPlus, RefreshCw } from 'lucide-react';
import { ALL_SUBCITIES, Announcement, Priority, Report, ReportStatus, ServiceCategory, SubCity } from '../../types';
import { ReportDetailModal } from './ReportDetailModal';
import { AnnouncementEditorModal } from './AnnouncementEditorModal';

interface CoordinatorDashboardProps {
  reports: Report[];
  announcements: Announcement[];
  onRefreshData: () => void;
  onOpenReportModal: () => void;
}

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  reports,
  announcements,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'announcements'>('reports');

  // Report filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [subCityFilter, setSubCityFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  // Modal states
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isAnnouncementEditorOpen, setIsAnnouncementEditorOpen] = useState(false);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
    if (subCityFilter !== 'All' && r.subCity !== subCityFilter) return false;
    if (priorityFilter !== 'All' && r.priority !== priorityFilter) return false;
    return true;
  });

  // KPI Metrics
  const totalReports = reports.length;
  const submittedCount = reports.filter((r) => r.status === 'Submitted').length;
  const inProgressCount = reports.filter((r) => r.status === 'In Progress' || r.status === 'Assigned').length;
  const resolvedCount = reports.filter((r) => r.status === 'Resolved').length;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'Draft':
        return <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Draft</span>;
      case 'Submitted':
        return <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded">Submitted</span>;
      case 'Assigned':
        return <span className="text-[11px] font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">Assigned</span>;
      case 'In Progress':
        return <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">In Progress</span>;
      case 'Resolved':
        return <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">Resolved</span>;
      case 'Rejected':
        return <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded">Rejected</span>;
      default:
        return <span className="text-[11px] text-slate-600">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'High':
        return <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">High Priority</span>;
      case 'Medium':
        return <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">Medium</span>;
      case 'Low':
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Low</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Coordinator Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-sky-100 text-sky-800 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F2042]">
              Coordinator Operations Console
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Review resident problem reports, assign field dispatch teams, and publish verified public notices.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={() => {
              setAnnouncementToEdit(null);
              setIsAnnouncementEditorOpen(true);
            }}
            className="px-4 py-2 bg-[#0F2042] text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-[#1E3A6E] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publish Announcement</span>
          </button>

          <button
            onClick={onRefreshData}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Reports
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {totalReports}
          </span>
          <span className="text-[11px] text-slate-500">Recorded on local device</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
            Awaiting Triage
          </span>
          <span className="text-2xl font-bold font-mono text-sky-900 mt-1 block">
            {submittedCount}
          </span>
          <span className="text-[11px] text-slate-500">Submitted status</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            Active / Dispatched
          </span>
          <span className="text-2xl font-bold font-mono text-amber-900 mt-1 block">
            {inProgressCount}
          </span>
          <span className="text-[11px] text-slate-500">Assigned or In Progress</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Resolved Issues
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-900 mt-1 block">
            {resolvedCount}
          </span>
          <span className="text-[11px] text-slate-500">Successfully completed</span>
        </div>
      </div>

      {/* Primary Section Switcher */}
      <div className="border-b border-slate-200 flex items-center gap-6">
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'border-[#0F2042] text-[#0F2042]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Resident Reports ({reports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'announcements'
              ? 'border-[#0F2042] text-[#0F2042]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Service Announcements ({announcements.length})</span>
        </button>
      </div>

      {/* TAB 1: REPORTS MANAGEMENT */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
              <Filter className="w-4 h-4" />
              <span>Filters:</span>
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted (Needs triage)</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            >
              <option value="All">All Categories</option>
              <option value="Electricity">Electricity</option>
              <option value="Water">Water</option>
              <option value="Roads">Roads</option>
              <option value="Other">Other</option>
            </select>

            {/* Sub-city */}
            <select
              value={subCityFilter}
              onChange={(e) => setSubCityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            >
              <option value="All">All Sub-Cities</option>
              {ALL_SUBCITIES.map((sc) => (
                <option key={sc} value={sc}>
                  {sc}
                </option>
              ))}
            </select>

            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {(statusFilter !== 'All' || categoryFilter !== 'All' || subCityFilter !== 'All' || priorityFilter !== 'All') && (
              <button
                onClick={() => {
                  setStatusFilter('All');
                  setCategoryFilter('All');
                  setSubCityFilter('All');
                  setPriorityFilter('All');
                }}
                className="text-xs text-sky-700 font-semibold hover:underline cursor-pointer ml-auto"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Table / List */}
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-800">No reports matching your criteria.</p>
              <p className="text-xs text-slate-500">Try adjusting your filters above.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700">{report.id}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-900">{report.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-800">{report.subCity}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(report.createdAt)}</span>
                    </div>

                    <p className="text-sm font-bold text-slate-900 line-clamp-1">
                      {report.description}
                    </p>

                    <p className="text-xs text-slate-600">
                      Specific location: <strong>{report.specificLocation}</strong>
                      {report.assignedTo && (
                        <span className="ml-2 text-indigo-700 font-medium">
                          (Assigned: {report.assignedTo})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
                    {getPriorityBadge(report.priority)}
                    {getStatusBadge(report.status)}
                    <span className="text-xs text-sky-700 font-bold px-2 py-1 bg-sky-50 rounded hover:bg-sky-100">
                      Manage →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANNOUNCEMENTS MANAGEMENT */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 flex items-start gap-2.5">
            <Bell className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
            <div>
              <strong>Public Announcements vs Resident Reports:</strong> Resident reports are private unverified issues submitted by individuals. Public announcements are official verified service notices broadcast to the entire community. A resident report never automatically turns into an announcement.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{ann.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-800">{ann.subCity}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ann.isPlanned ? 'Planned Maintenance' : 'Unplanned Outage'}</span>
                    <span aria-hidden="true">·</span>
                    <span className={ann.isPublished ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                      {ann.isPublished ? 'Live on Resident App' : 'Draft'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">{ann.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setAnnouncementToEdit(ann);
                      setIsAnnouncementEditorOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                  >
                    Edit Notice
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onReportUpdated={(updated) => {
            setSelectedReport(updated);
            onRefreshData();
          }}
        />
      )}

      {/* Announcement Editor Modal */}
      {isAnnouncementEditorOpen && (
        <AnnouncementEditorModal
          isOpen={isAnnouncementEditorOpen}
          onClose={() => {
            setIsAnnouncementEditorOpen(false);
            setAnnouncementToEdit(null);
          }}
          announcementToEdit={announcementToEdit}
          onAnnouncementSaved={() => {
            onRefreshData();
          }}
        />
      )}
    </div>
  );
};

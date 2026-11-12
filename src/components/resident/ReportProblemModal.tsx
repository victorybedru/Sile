import React, { useState } from 'react';
import { X, Zap, Droplet, Construction, HelpCircle, CheckCircle, WifiOff, ArrowRight } from 'lucide-react';
import { ALL_SUBCITIES, Priority, Report, ServiceCategory, SubCity } from '../../types';
import { reportService } from '../../services/reportService';
import { syncService } from '../../services/syncService';

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubCity: SubCity | 'All Areas';
  onReportCreated: (report: Report) => void;
  onGoToMyReports: () => void;
}

export const ReportProblemModal: React.FC<ReportProblemModalProps> = ({
  isOpen,
  onClose,
  defaultSubCity,
  onReportCreated,
  onGoToMyReports,
}) => {
  const initialSubCity: SubCity =
    defaultSubCity === 'All Areas' ? 'Bole' : (defaultSubCity as SubCity);

  const [category, setCategory] = useState<ServiceCategory>('Electricity');
  const [subCity, setSubCity] = useState<SubCity>(initialSubCity);
  const [specificLocation, setSpecificLocation] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setCategory('Electricity');
    setSubCity(initialSubCity);
    setSpecificLocation('');
    setDescription('');
    setPriority('Medium');
    setValidationErrors({});
    setSubmittedReport(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (saveAsDraft = false) => {
    const input = {
      category,
      subCity,
      specificLocation,
      description,
      priority,
      saveAsDraft,
    };

    const validation = reportService.validateReportInput(input);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors({});
    setIsSubmitting(true);

    try {
      // 1. Create and save report directly in local IndexedDB
      const report = await reportService.createReport(input);

      // 2. If online and not draft, attempt automatic sync
      let finalReport = report;
      if (!saveAsDraft && syncService.isOnline()) {
        finalReport = await syncService.syncReport(report.id);
      }

      onReportCreated(finalReport);
      setSubmittedReport(finalReport);
    } catch (err: unknown) {
      setValidationErrors({
        form: err instanceof Error ? err.message : 'Could not save report. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If report was successfully created, show confirmation view
  if (submittedReport) {
    const isOffline = !syncService.isOnline();
    const isSynced = submittedReport.syncStatus === 'Synchronized';

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle className="w-9 h-9" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {submittedReport.status === 'Draft' ? 'Draft Saved Successfully' : 'Problem Report Recorded'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Your report has been safely saved on your device with reference number:
            </p>
            <div className="mt-2 inline-block px-3 py-1.5 bg-slate-100 text-slate-800 font-mono text-sm font-semibold rounded-lg border border-slate-200">
              {submittedReport.id}
            </div>
          </div>

          {/* Sync Status Banner */}
          <div
            className={`p-4 rounded-xl text-left border ${
              isSynced
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {isSynced ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              )}
              <div className="text-xs sm:text-sm">
                <span className="font-bold block">
                  {isSynced
                    ? 'Report Synchronized With Municipal Dispatch'
                    : isOffline
                    ? 'Saved Safely Offline (Pending Synchronization)'
                    : 'Saved Locally (Queued for Dispatch)'}
                </span>
                <p className="mt-0.5 text-slate-700">
                  {isSynced
                    ? 'The dispatch desk has received your problem report and queued it for review.'
                    : 'Your report is saved permanently in your browser storage. It will synchronize automatically when your internet connection is restored.'}
                </p>
              </div>
            </div>
          </div>

          {/* Report summary overview */}
          <div className="bg-slate-50 p-4 rounded-xl text-left text-xs space-y-1.5 text-slate-700 border border-slate-200">
            <div>
              <span className="font-semibold text-slate-900">Category:</span> {submittedReport.category}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Location:</span> {submittedReport.specificLocation},{' '}
              {submittedReport.subCity}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Priority:</span> {submittedReport.priority}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => {
                handleClose();
                onGoToMyReports();
              }}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-[#0F2042] text-white font-semibold text-sm hover:bg-[#1E3A6E] transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>View in My Reports</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-slate-100 text-slate-800 font-semibold text-sm hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <h2 id="report-modal-title" className="text-lg sm:text-xl font-bold text-slate-900">
              Report a Community Problem
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Reports are saved immediately to your device and can be submitted offline.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Close report dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {validationErrors.form && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl font-medium">
              {validationErrors.form}
            </div>
          )}

          {/* 1. Category Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              1. What service has an issue? <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setCategory('Electricity')}
                className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all cursor-pointer min-h-[56px] ${
                  category === 'Electricity'
                    ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-bold ring-1 ring-amber-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Zap className="w-5 h-5 text-amber-600" />
                <span className="text-xs sm:text-sm">Electricity</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('Water')}
                className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all cursor-pointer min-h-[56px] ${
                  category === 'Water'
                    ? 'border-sky-600 bg-sky-50/70 text-sky-950 font-bold ring-1 ring-sky-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Droplet className="w-5 h-5 text-sky-600" />
                <span className="text-xs sm:text-sm">Water</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('Roads')}
                className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all cursor-pointer min-h-[56px] ${
                  category === 'Roads'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Construction className="w-5 h-5 text-emerald-700" />
                <span className="text-xs sm:text-sm">Roads</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('Other')}
                className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all cursor-pointer min-h-[56px] ${
                  category === 'Other'
                    ? 'border-slate-700 bg-slate-100 text-slate-950 font-bold ring-1 ring-slate-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <HelpCircle className="w-5 h-5 text-slate-600" />
                <span className="text-xs sm:text-sm">Other</span>
              </button>
            </div>
            {validationErrors.category && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{validationErrors.category}</p>
            )}
          </div>

          {/* 2. Sub-city and Landmark */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="subCitySelect" className="block text-sm font-bold text-slate-900 mb-1">
                2. Sub-City <span className="text-rose-600">*</span>
              </label>
              <select
                id="subCitySelect"
                value={subCity}
                onChange={(e) => setSubCity(e.target.value as SubCity)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {ALL_SUBCITIES.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc} Sub-City
                  </option>
                ))}
              </select>
              {validationErrors.subCity && (
                <p className="text-xs text-rose-600 mt-1">{validationErrors.subCity}</p>
              )}
            </div>

            <div>
              <label htmlFor="landmarkInput" className="block text-sm font-bold text-slate-900 mb-1">
                Street, Landmark, or Woreda
              </label>
              <input
                id="landmarkInput"
                type="text"
                placeholder="e.g. Near Atlas Hotel, Woreda 03"
                value={specificLocation}
                onChange={(e) => setSpecificLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Helps response teams find the exact spot
              </span>
            </div>
          </div>

          {/* 3. Problem Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="descriptionInput" className="text-sm font-bold text-slate-900">
                3. What happened? <span className="text-rose-600">*</span>
              </label>
              <span className="text-xs text-slate-500">
                {description.trim().length} chars (min 10)
              </span>
            </div>
            <textarea
              id="descriptionInput"
              rows={4}
              placeholder="Describe the issue clearly. For example: Main water line cracked on the road side, leaking heavily into residential compounds."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full p-3.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed ${
                validationErrors.description ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 bg-white'
              }`}
            />
            {validationErrors.description && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{validationErrors.description}</p>
            )}
          </div>

          {/* 4. Priority Level */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              4. Priority Level <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('Low')}
                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  priority === 'Low'
                    ? 'border-slate-700 bg-slate-100 font-bold text-slate-900 ring-1 ring-slate-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs sm:text-sm block">Low</span>
                <span className="text-[10px] text-slate-500">Non-urgent</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('Medium')}
                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  priority === 'Medium'
                    ? 'border-sky-600 bg-sky-50 font-bold text-sky-950 ring-1 ring-sky-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs sm:text-sm block">Medium</span>
                <span className="text-[10px] text-slate-500">Service disrupted</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('High')}
                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                  priority === 'High'
                    ? 'border-rose-600 bg-rose-50 font-bold text-rose-950 ring-1 ring-rose-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs sm:text-sm block">High</span>
                <span className="text-[10px] text-rose-700">Hazard / Urgent</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Save as Draft
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-[#0F2042] text-white text-sm font-bold hover:bg-[#1E3A6E] disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
            >
              {isSubmitting ? 'Recording...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

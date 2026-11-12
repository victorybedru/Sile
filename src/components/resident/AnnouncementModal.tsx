import React from 'react';
import { X, Calendar, MapPin, Zap, Droplet, Construction, AlertTriangle, CheckCircle } from 'lucide-react';
import { Announcement } from '../../types';

interface AnnouncementModalProps {
  announcement: Announcement | null;
  onClose: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  announcement,
  onClose,
}) => {
  if (!announcement) return null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Not specified';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Electricity':
        return <Zap className="w-5 h-5 text-amber-700" />;
      case 'Water':
        return <Droplet className="w-5 h-5 text-sky-700" />;
      case 'Roads':
        return <Construction className="w-5 h-5 text-emerald-800" />;
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
              {getCategoryIcon(announcement.category)}
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <span>{announcement.category}</span>
                <span aria-hidden="true">·</span>
                <span>{announcement.subCity}</span>
                <span aria-hidden="true">·</span>
                <span className={announcement.isPlanned ? 'text-slate-700' : 'text-amber-700 font-semibold'}>
                  {announcement.isPlanned ? 'Planned Maintenance' : 'Unplanned Outage'}
                </span>
              </div>
              <h2 id="announcement-title" className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                {announcement.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Close announcement details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {/* Sample Data Disclaimer Banner */}
          {announcement.isSampleData && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Prototype Notice:</strong> This is a sample announcement for demonstration in Addis Ababa. It is not connected to real Ethiopian utility providers.
              </div>
            </div>
          )}

          {/* Location & Neighborhoods */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Affected Sub-City & Vicinity
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {announcement.subCity} Sub-City
                </span>
                {announcement.affectedNeighborhoods && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    {announcement.affectedNeighborhoods}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Start Time
              </span>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-900">
                <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{formatDate(announcement.startDate)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Expected Restoration
              </span>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-900">
                <CheckCircle className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{formatDate(announcement.expectedEndDate)}</span>
              </div>
            </div>
          </div>

          {/* Detailed Description */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Announcement Details
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-slate-800 whitespace-pre-line">
              {announcement.description}
            </p>
          </div>

          {/* Metadata Footer */}
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <span>Published by: {announcement.publisherName}</span>
            <span>Date: {formatDate(announcement.publishedAt)}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#0F2042] text-white hover:bg-[#1E3A6E] transition-colors cursor-pointer"
          >
            Close Announcement
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { MapPin, Zap, Droplet, Construction, AlertCircle, PlusCircle, ArrowRight, ChevronRight, Calendar, Info } from 'lucide-react';
import { Announcement, ServiceCategory, SubCity } from '../../types';

interface HomeScreenProps {
  selectedSubCity: SubCity | 'All Areas';
  onOpenLocationPicker: () => void;
  announcements: Announcement[];
  onSelectAnnouncement: (announcement: Announcement) => void;
  onOpenReportModal: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  selectedSubCity,
  onOpenLocationPicker,
  announcements,
  onSelectAnnouncement,
  onOpenReportModal,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'All'>('All');

  // Filter announcements according to selectedSubCity and categoryFilter
  const filteredAnnouncements = announcements.filter((ann) => {
    if (!ann.isPublished) return false;

    // Location filter
    if (selectedSubCity !== 'All Areas') {
      const matchLoc = ann.subCity === selectedSubCity || ann.subCity === 'All Areas';
      if (!matchLoc) return false;
    }

    // Category filter
    if (categoryFilter !== 'All') {
      if (ann.category !== categoryFilter) return false;
    }

    return true;
  });

  // Calculate counts for the 3 prominent service cards for the currently selected location
  const getCategoryCount = (category: ServiceCategory) => {
    return announcements.filter((ann) => {
      if (!ann.isPublished) return false;
      if (ann.category !== category) return false;
      if (selectedSubCity !== 'All Areas') {
        return ann.subCity === selectedSubCity || ann.subCity === 'All Areas';
      }
      return true;
    }).length;
  };

  const electricityCount = getCategoryCount('Electricity');
  const waterCount = getCategoryCount('Water');
  const roadsCount = getCategoryCount('Roads');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Electricity':
        return <Zap className="w-5 h-5 text-amber-600" />;
      case 'Water':
        return <Droplet className="w-5 h-5 text-sky-600" />;
      case 'Roads':
        return <Construction className="w-5 h-5 text-emerald-700" />;
      default:
        return null;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 1. Hero / Welcome Banner & Location Bar */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F2042] tracking-tight">
              Community Service Information & Reporting
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
              Find updates about electricity, water interruptions, and road works in your neighborhood, or report an infrastructure issue for quick dispatch.
            </p>
          </div>

          {/* Location Selector Card */}
          <div className="bg-[#FAF9F6] border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shrink-0 md:min-w-[280px]">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Selected Location
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 block">
                  {selectedSubCity === 'All Areas' ? 'All Areas' : `${selectedSubCity} Sub-City`}
                </span>
                <span className="text-xs text-slate-500">Addis Ababa, Ethiopia</span>
              </div>
            </div>
            <button
              onClick={onOpenLocationPicker}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer text-center"
            >
              Change Location
            </button>
          </div>
        </div>
      </section>

      {/* 2. Prominent Service Categories (Electricity, Water, Roads) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Current Service Status in {selectedSubCity === 'All Areas' ? 'Addis Ababa' : selectedSubCity}
          </h2>
          <span className="text-xs text-slate-500">Tap category to filter notices</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Electricity Card */}
          <button
            onClick={() => setCategoryFilter(categoryFilter === 'Electricity' ? 'All' : 'Electricity')}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[130px] ${
              categoryFilter === 'Electricity'
                ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold font-mono text-slate-900">
                {electricityCount}
              </span>
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">Electricity</div>
              <div className="text-xs text-slate-500">
                {electricityCount === 0 ? 'No active disruptions' : `${electricityCount} active notice${electricityCount > 1 ? 's' : ''}`}
              </div>
            </div>
          </button>

          {/* Water Card */}
          <button
            onClick={() => setCategoryFilter(categoryFilter === 'Water' ? 'All' : 'Water')}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[130px] ${
              categoryFilter === 'Water'
                ? 'bg-sky-50/80 border-sky-500 ring-2 ring-sky-500 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                <Droplet className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold font-mono text-slate-900">
                {waterCount}
              </span>
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">Water Supply</div>
              <div className="text-xs text-slate-500">
                {waterCount === 0 ? 'No active disruptions' : `${waterCount} active notice${waterCount > 1 ? 's' : ''}`}
              </div>
            </div>
          </button>

          {/* Roads Card */}
          <button
            onClick={() => setCategoryFilter(categoryFilter === 'Roads' ? 'All' : 'Roads')}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[130px] ${
              categoryFilter === 'Roads'
                ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Construction className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold font-mono text-slate-900">
                {roadsCount}
              </span>
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">Roads & Traffic</div>
              <div className="text-xs text-slate-500">
                {roadsCount === 0 ? 'No active closures' : `${roadsCount} active notice${roadsCount > 1 ? 's' : ''}`}
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* 3. Prominent Action Banner: Report a Problem */}
      <section className="bg-gradient-to-r from-[#0F2042] to-[#1E3A6E] text-white rounded-2xl p-6 sm:p-7 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30">
            <span>Community Infrastructure Help</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Noticed a problem in your street?
          </h2>
          <p className="text-sm text-slate-200 leading-relaxed">
            Report broken pipes, power line hazards, dark street lamps, or open drain holes. Works offline—saved immediately on your phone.
          </p>
        </div>

        <button
          onClick={onOpenReportModal}
          className="px-6 py-3.5 bg-white text-[#0F2042] font-bold text-base rounded-xl hover:bg-slate-100 transition-transform active:scale-[0.98] shadow-lg shrink-0 flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-5 h-5 text-sky-700" />
          <span>Report a Problem</span>
        </button>
      </section>

      {/* 4. Local Announcements Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Local Announcements
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Verified public notifications relevant to {selectedSubCity === 'All Areas' ? 'all sub-cities' : `${selectedSubCity} Sub-City`}.
            </p>
          </div>

          {/* Interactive Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto self-start sm:self-center">
            <button
              onClick={() => setCategoryFilter('All')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === 'All'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Notices
            </button>
            <button
              onClick={() => setCategoryFilter('Electricity')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === 'Electricity'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Electricity
            </button>
            <button
              onClick={() => setCategoryFilter('Water')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === 'Water'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Water
            </button>
            <button
              onClick={() => setCategoryFilter('Roads')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === 'Roads'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Roads
            </button>
          </div>
        </div>

        {/* Prototype demo disclaimer note */}
        <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            <strong>Prototype Data Notice:</strong> The notices below are sample demo announcements created for Addis Ababa to demonstrate the Sile platform.
          </span>
        </div>

        {/* Announcements List */}
        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No active announcements in {selectedSubCity}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no reported outages or road closures in this category for the selected area.
            </p>
            <button
              onClick={() => {
                setCategoryFilter('All');
              }}
              className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
            >
              Reset category filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnouncements.map((ann) => (
              <div
                key={ann.id}
                onClick={() => onSelectAnnouncement(ann)}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(ann.category)}
                  </div>
                  <div className="space-y-1 flex-1">
                    {/* Unboxed metadata with typographical separators */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{ann.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">{ann.subCity}</span>
                      <span aria-hidden="true">·</span>
                      <span className={ann.isPlanned ? 'text-slate-600' : 'text-amber-700 font-semibold'}>
                        {ann.isPlanned ? 'Planned' : 'Unplanned Outage'}
                      </span>
                      {ann.startDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Starts {formatDate(ann.startDate)}</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {ann.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {ann.description}
                    </p>

                    {ann.affectedNeighborhoods && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{ann.affectedNeighborhoods}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <span className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1">
                    <span>View details</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

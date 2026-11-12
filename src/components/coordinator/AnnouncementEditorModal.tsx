import React, { useState } from 'react';
import { X, Bell, Zap, Droplet, Construction, AlertCircle } from 'lucide-react';
import { ALL_SUBCITIES, Announcement, SubCity } from '../../types';
import { announcementService } from '../../services/announcementService';

interface AnnouncementEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcementToEdit?: Announcement | null;
  onAnnouncementSaved: (ann: Announcement) => void;
}

export const AnnouncementEditorModal: React.FC<AnnouncementEditorModalProps> = ({
  isOpen,
  onClose,
  announcementToEdit,
  onAnnouncementSaved,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(announcementToEdit?.title || '');
  const [category, setCategory] = useState<'Electricity' | 'Water' | 'Roads'>(
    announcementToEdit?.category || 'Electricity'
  );
  const [subCity, setSubCity] = useState<SubCity | 'All Areas'>(
    announcementToEdit?.subCity || 'Bole'
  );
  const [affectedNeighborhoods, setAffectedNeighborhoods] = useState(
    announcementToEdit?.affectedNeighborhoods || ''
  );
  const [description, setDescription] = useState(
    announcementToEdit?.description || ''
  );
  const [isPlanned, setIsPlanned] = useState(
    announcementToEdit ? announcementToEdit.isPlanned : true
  );
  const [startDate, setStartDate] = useState(
    announcementToEdit?.startDate
      ? announcementToEdit.startDate.substring(0, 16)
      : ''
  );
  const [expectedEndDate, setExpectedEndDate] = useState(
    announcementToEdit?.expectedEndDate
      ? announcementToEdit.expectedEndDate.substring(0, 16)
      : ''
  );
  const [isPublished, setIsPublished] = useState(
    announcementToEdit ? announcementToEdit.isPublished : true
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (title.trim().length < 5) {
      setErrorMessage('Title must be at least 5 characters long.');
      return;
    }

    if (description.trim().length < 10) {
      setErrorMessage('Description must provide clear instructions (at least 10 characters).');
      return;
    }

    setIsSaving(true);
    try {
      if (announcementToEdit) {
        const updated: Announcement = {
          ...announcementToEdit,
          title: title.trim(),
          category,
          subCity,
          affectedNeighborhoods: affectedNeighborhoods.trim() || undefined,
          description: description.trim(),
          isPlanned,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          expectedEndDate: expectedEndDate ? new Date(expectedEndDate).toISOString() : undefined,
          isPublished,
        };
        await announcementService.updateAnnouncement(updated);
        onAnnouncementSaved(updated);
      } else {
        const created = await announcementService.createAnnouncement({
          title: title.trim(),
          category,
          subCity,
          affectedNeighborhoods: affectedNeighborhoods.trim() || undefined,
          description: description.trim(),
          isPlanned,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          expectedEndDate: expectedEndDate ? new Date(expectedEndDate).toISOString() : undefined,
          isPublished,
        });
        onAnnouncementSaved(created);
      }
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save announcement.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {announcementToEdit ? 'Edit Service Announcement' : 'Publish Community Service Announcement'}
              </h2>
              <p className="text-xs text-slate-500">
                Official notices broadcast to resident home screens
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close announcement editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Announcement Title <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Planned Feeder Cable Maintenance & Outage Advisory"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Category & Planned classification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category <span className="text-rose-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'Electricity' | 'Water' | 'Roads')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="Electricity">Electricity</option>
                <option value="Water">Water Supply</option>
                <option value="Roads">Roads & Closures</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Outage Nature
              </label>
              <div className="flex items-center gap-2 pt-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="isPlanned"
                    checked={isPlanned}
                    onChange={() => setIsPlanned(true)}
                    className="text-sky-600"
                  />
                  <span>Planned Work</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer ml-3">
                  <input
                    type="radio"
                    name="isPlanned"
                    checked={!isPlanned}
                    onChange={() => setIsPlanned(false)}
                    className="text-sky-600"
                  />
                  <span>Unplanned / Emergency</span>
                </label>
              </div>
            </div>
          </div>

          {/* Sub-city & Neighborhoods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Affected Sub-City
              </label>
              <select
                value={subCity}
                onChange={(e) => setSubCity(e.target.value as SubCity | 'All Areas')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="All Areas">All Areas (Entire City)</option>
                {ALL_SUBCITIES.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc} Sub-City
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Specific Streets / Woredas
              </label>
              <input
                type="text"
                value={affectedNeighborhoods}
                onChange={(e) => setAffectedNeighborhoods(e.target.value)}
                placeholder="e.g. Bole Medhanialem, Atlas Hotel area"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Expected Restoration Time
              </label>
              <input
                type="datetime-local"
                value={expectedEndDate}
                onChange={(e) => setExpectedEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description & Resident Advisory <span className="text-rose-600">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide clear plain language advisory on what work is occurring and expected impacts on households."
              className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed"
            />
          </div>

          {/* Publishing toggle */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Publish Status
              </span>
              <span className="text-[11px] text-slate-500">
                When published, this announcement is immediately live for residents
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded"
              />
              <span className="text-xs font-bold text-slate-800">
                {isPublished ? 'Published' : 'Draft Only'}
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#0F2042] text-white text-sm font-bold hover:bg-[#1E3A6E] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSaving ? 'Saving...' : announcementToEdit ? 'Save Changes' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

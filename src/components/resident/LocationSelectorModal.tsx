import React from 'react';
import { X, Check, MapPin } from 'lucide-react';
import { ALL_SUBCITIES, SubCity } from '../../types';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSubCity: SubCity | 'All Areas';
  onSelectSubCity: (subCity: SubCity | 'All Areas') => void;
}

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedSubCity,
  onSelectSubCity,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 id="location-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                Choose Your Location
              </h2>
              <p className="text-xs text-slate-600">
                Select your sub-city in Addis Ababa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close location picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-1.5 flex-1 divide-y divide-slate-100">
          {/* Entire City Option */}
          <button
            onClick={() => {
              onSelectSubCity('All Areas');
              onClose();
            }}
            className={`w-full min-h-[50px] px-4 py-3 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
              selectedSubCity === 'All Areas'
                ? 'bg-sky-50 text-sky-950 font-bold border border-sky-300'
                : 'hover:bg-slate-100 text-slate-800'
            }`}
          >
            <div>
              <div className="text-sm font-semibold">All Areas (Entire City)</div>
              <div className="text-xs text-slate-500">Show announcements across all 11 sub-cities</div>
            </div>
            {selectedSubCity === 'All Areas' && (
              <Check className="w-5 h-5 text-sky-700 shrink-0" />
            )}
          </button>

          {/* Sub-city list */}
          <div className="pt-2 space-y-1">
            {ALL_SUBCITIES.map((subCity) => {
              const isSelected = selectedSubCity === subCity;
              return (
                <button
                  key={subCity}
                  onClick={() => {
                    onSelectSubCity(subCity);
                    onClose();
                  }}
                  className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 text-sky-950 font-bold border border-sky-300'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span className="text-sm">{subCity} Sub-City</span>
                  {isSelected && <Check className="w-5 h-5 text-sky-700 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-center">
          <p className="text-[11px] text-slate-500">
            Selected location filters outage alerts and community notices
          </p>
        </div>
      </div>
    </div>
  );
};

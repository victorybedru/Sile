import React from 'react';
import { WifiOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  onSyncNow: () => void;
  onToggleSimulatedOffline: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  isSimulatedOffline,
  isSyncing,
  pendingCount,
  failedCount,
  onSyncNow,
  onToggleSimulatedOffline,
}) => {
  // If online, not syncing, and no pending or failed reports, don't show intrusive banner
  if (isOnline && !isSimulatedOffline && pendingCount === 0 && failedCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="w-full border-b text-sm transition-all">
      {/* State 1: Truly or Simulated Offline */}
      {!isOnline && (
        <div className="bg-amber-50 border-amber-200 text-amber-950 px-4 py-3">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2.5">
              <WifiOff className="w-5 h-5 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-semibold text-slate-900">
                  {isSimulatedOffline
                    ? 'Simulated Offline Mode Active'
                    : 'No Internet Connection Detected'}
                </p>
                <p className="text-xs text-slate-700 mt-0.5">
                  Sile works completely offline. You can still report issues—they are saved safely in your device storage and will automatically upload when reconnected.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {isSimulatedOffline && (
                <button
                  onClick={onToggleSimulatedOffline}
                  className="px-3 py-1 text-xs font-semibold rounded bg-white text-slate-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Turn Offline Simulation Off
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* State 2: Online with Pending or Failed reports */}
      {isOnline && (pendingCount > 0 || failedCount > 0 || isSyncing) && (
        <div className="bg-sky-50 border-sky-200 text-slate-900 px-4 py-2.5">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 text-sky-700 animate-spin shrink-0" />
              ) : failedCount > 0 ? (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-sky-700 shrink-0" />
              )}
              <div className="text-xs sm:text-sm">
                {isSyncing ? (
                  <span className="font-medium text-slate-800">
                    Synchronizing {pendingCount} report(s) with central server...
                  </span>
                ) : (
                  <span>
                    <strong className="font-semibold text-slate-900">
                      {pendingCount} report{pendingCount !== 1 ? 's' : ''} stored locally
                    </strong>{' '}
                    ready to synchronize.
                    {failedCount > 0 && (
                      <span className="text-amber-800 ml-1 font-medium">
                        ({failedCount} failed previous attempt)
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0F2042] text-white hover:bg-[#1E3A6E] disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5 self-end sm:self-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { ShieldCheck, UserCheck, Activity, Wifi, WifiOff } from 'lucide-react';
import { UserRole } from '../../types';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenTests: () => void;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  activeTab,
  onTabChange,
  onOpenTests,
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  pendingCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0F2042] text-white border-b border-[#1E3A6E] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onTabChange('home')}
            className="text-left group cursor-pointer focus:outline-none"
            aria-label="Sile Home"
          >
            <div className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Sile</span>
              <span className="text-xs font-normal px-2 py-0.5 bg-[#1E3A6E] text-slate-200 rounded tracking-normal">
                Addis Ababa
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-200">
          <button
            onClick={() => onTabChange('home')}
            className={`cursor-pointer transition-colors pb-1 ${
              activeTab === 'home'
                ? 'text-white border-b-2 border-sky-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            Announcements
          </button>
          <button
            onClick={() => onTabChange('report')}
            className={`cursor-pointer transition-colors pb-1 ${
              activeTab === 'report'
                ? 'text-white border-b-2 border-sky-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            Report a Problem
          </button>
          <button
            onClick={() => onTabChange('my-reports')}
            className={`cursor-pointer transition-colors pb-1 relative ${
              activeTab === 'my-reports'
                ? 'text-white border-b-2 border-sky-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            <span>My Reports</span>
            {pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 text-[11px] font-semibold bg-amber-500 text-slate-950 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={onOpenTests}
            className="cursor-pointer text-slate-300 hover:text-white flex items-center gap-1.5 pb-1 transition-colors"
            title="Run platform reliability and offline verification tests"
          >
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Reliability Tests</span>
          </button>
        </nav>

        {/* Zone 3: Actions - Mode Switch & Network Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Network Simulator Toggle */}
          <button
            onClick={onToggleSimulatedOffline}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSimulatedOffline
                ? 'bg-amber-900/40 text-amber-200 border-amber-600/60 hover:bg-amber-900/60'
                : isOnline
                ? 'bg-[#1E3A6E]/50 text-slate-200 border-[#2A4D8C] hover:bg-[#1E3A6E]'
                : 'bg-rose-900/40 text-rose-200 border-rose-600/60'
            }`}
            title="Toggle simulated offline mode to test offline report creation and sync"
            aria-label="Toggle offline simulation"
          >
            {isSimulatedOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Offline Mode (Simulated)</span>
                <span className="sm:hidden">Offline</span>
              </>
            ) : isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">No Internet</span>
              </>
            )}
          </button>

          {/* Role Toggle Switch */}
          <div className="bg-[#0B1730] p-1 rounded-lg border border-[#1E3A6E] flex items-center">
            <button
              onClick={() => onRoleChange('resident')}
              className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                currentRole === 'resident'
                  ? 'bg-white text-[#0F2042] shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              aria-pressed={currentRole === 'resident'}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Resident</span>
            </button>
            <button
              onClick={() => onRoleChange('coordinator')}
              className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                currentRole === 'coordinator'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              aria-pressed={currentRole === 'coordinator'}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Coordinator</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

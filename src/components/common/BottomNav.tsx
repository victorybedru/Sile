import React from 'react';
import { Bell, PlusCircle, FileText, Activity } from 'lucide-react';
import { UserRole } from '../../types';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenTests: () => void;
  pendingCount: number;
  currentRole: UserRole;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenTests,
  pendingCount,
  currentRole,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
      <div className="grid grid-cols-4 items-center h-16 max-w-lg mx-auto px-2">
        {/* Tab 1: Home / Announcements */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors cursor-pointer ${
            activeTab === 'home' ? 'text-[#0F2042]' : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="Service Announcements"
        >
          <Bell className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : ''}`} />
          <span className={`text-[11px] mt-1 ${activeTab === 'home' ? 'font-bold' : 'font-medium'}`}>
            Notices
          </span>
        </button>

        {/* Tab 2: Report a Problem (Prominent CTA) */}
        <button
          onClick={() => onTabChange('report')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors cursor-pointer ${
            activeTab === 'report' ? 'text-sky-700' : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="Report an infrastructure problem"
        >
          <div className="relative">
            <PlusCircle className={`w-5 h-5 ${activeTab === 'report' ? 'stroke-[2.5] text-sky-700' : ''}`} />
          </div>
          <span className={`text-[11px] mt-1 ${activeTab === 'report' ? 'font-bold text-sky-700' : 'font-medium'}`}>
            Report
          </span>
        </button>

        {/* Tab 3: My Reports */}
        <button
          onClick={() => onTabChange('my-reports')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors cursor-pointer relative ${
            activeTab === 'my-reports' ? 'text-[#0F2042]' : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="My submitted reports"
        >
          <div className="relative">
            <FileText className={`w-5 h-5 ${activeTab === 'my-reports' ? 'stroke-[2.5]' : ''}`} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-amber-500 text-slate-950 font-bold text-[9px] rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </div>
          <span className={`text-[11px] mt-1 ${activeTab === 'my-reports' ? 'font-bold' : 'font-medium'}`}>
            My Reports
          </span>
        </button>

        {/* Tab 4: Reliability Tests / Diagnostics */}
        <button
          onClick={onOpenTests}
          className="flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors cursor-pointer text-slate-500 hover:text-slate-900"
          aria-label="Reliability & offline test suite"
        >
          <Activity className="w-5 h-5 text-sky-600" />
          <span className="text-[11px] mt-1 font-medium">
            Tests
          </span>
        </button>
      </div>
    </div>
  );
};

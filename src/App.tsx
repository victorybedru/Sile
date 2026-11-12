/**
 * Sile — Community Service Information & Reporting Platform
 * Addis Ababa, Ethiopia
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { OfflineBanner } from './components/common/OfflineBanner';
import { HomeScreen } from './components/resident/HomeScreen';
import { LocationSelectorModal } from './components/resident/LocationSelectorModal';
import { AnnouncementModal } from './components/resident/AnnouncementModal';
import { ReportProblemModal } from './components/resident/ReportProblemModal';
import { MyReportsView } from './components/resident/MyReportsView';
import { CoordinatorDashboard } from './components/coordinator/CoordinatorDashboard';
import { ReliabilityTestModal } from './components/diagnostics/ReliabilityTestModal';

import { Announcement, Report, SubCity, UserRole } from './types';
import { localDB } from './services/db';
import { announcementService } from './services/announcementService';
import { syncService } from './services/syncService';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('resident');
  const [activeTab, setActiveTab] = useState<string>('home'); // 'home' | 'report' | 'my-reports'
  const [selectedSubCity, setSelectedSubCity] = useState<SubCity | 'All Areas'>('Bole');

  // Data states
  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Connectivity & Sync states
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Load data from IndexedDB
  const loadData = useCallback(async () => {
    try {
      const [allReports, allAnnouncements] = await Promise.all([
        localDB.getAllReports(),
        announcementService.getAllAnnouncements(),
      ]);
      setReports(allReports);
      setAnnouncements(allAnnouncements);
    } catch (err) {
      console.error('[App] Failed to load data from IndexedDB:', err);
    }
  }, []);

  // Initialize DB and event listeners on mount
  useEffect(() => {
    let unsubscribeSync: (() => void) | undefined;

    const bootstrap = async () => {
      try {
        await localDB.init();

        // Restore saved sub-city if stored
        const savedSubCity = await localDB.getSetting<SubCity | 'All Areas'>('selected_subcity', 'Bole');
        setSelectedSubCity(savedSubCity);

        // Load data
        await loadData();
        setIsInitialized(true);
      } catch (err) {
        console.error('[App] Database init error:', err);
        setIsInitialized(true);
      }
    };

    bootstrap();

    // Subscribe to sync service status changes
    const updateSyncState = () => {
      setIsOnline(syncService.isOnline());
      setIsSimulatedOffline(syncService.isOfflineSimulated());
      setIsSyncing(syncService.isCurrentlySyncing());
      loadData();
    };

    updateSyncState();
    unsubscribeSync = syncService.addListener(updateSyncState);

    return () => {
      if (unsubscribeSync) unsubscribeSync();
    };
  }, [loadData]);

  // Handle Location Change
  const handleSelectSubCity = async (subCity: SubCity | 'All Areas') => {
    setSelectedSubCity(subCity);
    await localDB.setSetting('selected_subcity', subCity);
  };

  // Handle Tab Navigation
  const handleTabChange = (tab: string) => {
    if (tab === 'report') {
      setIsReportModalOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Trigger manual sync
  const handleSyncNow = async () => {
    try {
      await syncService.syncAllPendingReports();
      await loadData();
    } catch (e) {
      console.error('[App] Sync now error:', e);
    }
  };

  const handleToggleSimulatedOffline = () => {
    const nextState = !isSimulatedOffline;
    syncService.setSimulatedOffline(nextState);
    setIsSimulatedOffline(nextState);
    setIsOnline(!nextState && navigator.onLine);
  };

  const pendingReports = reports.filter(
    (r) => r.syncStatus === 'Pending' || r.syncStatus === 'Failed'
  );
  const failedReports = reports.filter((r) => r.syncStatus === 'Failed');

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[#0F2042] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">Starting Sile...</h2>
        <p className="text-xs text-slate-500 mt-1">
          Loading local database for Addis Ababa community services
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col selection:bg-sky-100 selection:text-sky-900 pb-20 md:pb-10">
      {/* 1. Header */}
      <Header
        currentRole={currentRole}
        onRoleChange={(newRole) => {
          setCurrentRole(newRole);
          if (newRole === 'coordinator') {
            setActiveTab('coordinator');
          } else {
            setActiveTab('home');
          }
        }}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenTests={() => setIsTestModalOpen(true)}
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
        pendingCount={pendingReports.length}
      />

      {/* 2. Offline / Synchronization Status Banner */}
      <OfflineBanner
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        isSyncing={isSyncing}
        pendingCount={pendingReports.length}
        failedCount={failedReports.length}
        onSyncNow={handleSyncNow}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
      />

      {/* 3. Main Content Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {currentRole === 'coordinator' ? (
          <CoordinatorDashboard
            reports={reports}
            announcements={announcements}
            onRefreshData={loadData}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        ) : activeTab === 'my-reports' ? (
          <MyReportsView
            reports={reports}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onRefreshReports={loadData}
          />
        ) : (
          <HomeScreen
            selectedSubCity={selectedSubCity}
            onOpenLocationPicker={() => setIsLocationModalOpen(true)}
            announcements={announcements}
            onSelectAnnouncement={(ann) => setSelectedAnnouncement(ann)}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        )}
      </main>

      {/* 4. Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-bold text-slate-800">Sile Addis Ababa</span> — Community Service Information & Problem Reporting Prototype.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTestModalOpen(true)}
              className="text-sky-700 hover:underline cursor-pointer font-medium"
            >
              Reliability Tests (8 Checks)
            </button>
            <span aria-hidden="true">·</span>
            <span>Local Storage: IndexedDB</span>
            <span aria-hidden="true">·</span>
            <span>2026 Prototype</span>
          </div>
        </div>
      </footer>

      {/* 5. Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenTests={() => setIsTestModalOpen(true)}
        pendingCount={pendingReports.length}
        currentRole={currentRole}
      />

      {/* 6. Modals */}
      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedSubCity={selectedSubCity}
        onSelectSubCity={handleSelectSubCity}
      />

      <AnnouncementModal
        announcement={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
      />

      <ReportProblemModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultSubCity={selectedSubCity}
        onReportCreated={() => {
          loadData();
        }}
        onGoToMyReports={() => {
          setActiveTab('my-reports');
        }}
      />

      <ReliabilityTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onTestsCompleted={loadData}
      />
    </div>
  );
}

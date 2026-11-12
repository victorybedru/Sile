import React, { useState } from 'react';
import { X, Play, CheckCircle2, XCircle, Clock, RefreshCw, Activity, ShieldCheck } from 'lucide-react';
import { testRunner, TestResult } from '../../services/testRunner';

interface ReliabilityTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestsCompleted: () => void;
}

export const ReliabilityTestModal: React.FC<ReliabilityTestModalProps> = ({
  isOpen,
  onClose,
  onTestsCompleted,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [hasRun, setHasRun] = useState(false);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setIsRunning(true);
    setHasRun(true);
    try {
      const finalResults = await testRunner.runAllTests((currentProgress) => {
        setTestResults([...currentProgress]);
      });
      setTestResults(finalResults);
      onTestsCompleted();
    } catch (e) {
      console.error('[TestModal] Test execution failed:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const passedCount = testResults.filter((r) => r.status === 'passed').length;
  const failedCount = testResults.filter((r) => r.status === 'failed').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tests-modal-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 id="tests-modal-title" className="text-lg sm:text-xl font-bold text-slate-900">
                Automated Reliability & Offline Test Suite
              </h2>
              <p className="text-xs text-slate-600">
                Verifies the 8 core operational guarantees specified for Sile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close test dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {/* Intro Description */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Specification Test Plan
              </span>
              <span className="text-xs text-slate-500">8 Automated Checks</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Clicking below executes real operational tests against your browser’s IndexedDB database, state machine transition validators, and synchronization queue.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleRunTests}
                disabled={isRunning}
                className="px-5 py-2.5 rounded-xl bg-[#0F2042] text-white text-xs sm:text-sm font-bold hover:bg-[#1E3A6E] disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Test Suite...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                    <span>Run Automated Tests</span>
                  </>
                )}
              </button>

              {hasRun && !isRunning && (
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                    {passedCount} Passed
                  </span>
                  {failedCount > 0 && (
                    <span className="text-rose-700 bg-rose-50 px-2 py-1 rounded">
                      {failedCount} Failed
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Test items list */}
          <div className="space-y-3">
            {testResults.length === 0 && !hasRun ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Press "Run Automated Tests" above to verify all platform reliability requirements.
              </div>
            ) : (
              testResults.map((t) => (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-xl border text-xs transition-colors ${
                    t.status === 'passed'
                      ? 'bg-white border-slate-200'
                      : t.status === 'failed'
                      ? 'bg-rose-50/50 border-rose-200'
                      : t.status === 'running'
                      ? 'bg-sky-50/50 border-sky-300'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      {t.status === 'passed' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      {t.status === 'failed' && (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      {t.status === 'running' && (
                        <RefreshCw className="w-4 h-4 text-sky-600 animate-spin shrink-0 mt-0.5" />
                      )}
                      {t.status === 'pending' && (
                        <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}

                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {t.name}
                          </span>
                          {t.durationMs > 0 && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {t.durationMs}ms
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 text-[11px]">{t.description}</p>
                        {t.status !== 'pending' && (
                          <p
                            className={`text-[11px] font-medium pt-1 ${
                              t.status === 'passed'
                                ? 'text-emerald-800'
                                : t.status === 'failed'
                                ? 'text-rose-800'
                                : 'text-sky-800'
                            }`}
                          >
                            {t.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Sile Offline & Data Consistency Engine
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

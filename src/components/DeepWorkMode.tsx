import { useState, useEffect } from 'react';
import { Play, Square, Brain, X, Lock, Unlock, Coffee, Minus, Plus, AlertTriangle } from 'lucide-react';
import { getSettings, updateSettings, Settings, db } from '@/lib/db';

function playCompletionSound() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const lastNoteEnd = (notes.length - 1) * 0.15 + 0.8;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.8);
    });
    setTimeout(() => ctx.close(), lastNoteEnd * 1000 + 100);
  } catch {}
}

export default function DeepWorkMode({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [selectedBreak, setSelectedBreak] = useState(5);
  const [hardLock, setHardLock] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      setSelectedDuration(s.deepWorkModeDuration);
      setSelectedBreak(s.deepWorkModeBreakDuration);
      setHardLock(s.hardLockMode || false);
    });
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (settings?.isDeepWorkActive && settings.deepWorkEndTime) {
      let completed = false;
      const updateTimer = () => {
        const now = Date.now();
        const end = settings.deepWorkEndTime!;
        if (now < end) {
          setRemainingTime(Math.floor((end - now) / 1000));
        } else if (!completed) {
          completed = true;
          clearInterval(interval);
          setRemainingTime(0);
          playCompletionSound();
          chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('/icon/128.png'),
            title: `AyaMir — ${chrome.i18n.getMessage('sessionCompleteTitle') || 'Session Complete!'}`,
            message: chrome.i18n.getMessage('sessionCompleteMsg') || 'Great work! Time for a break.',
            priority: 2,
          });
          db.focusSessions.add({
            startedAt: new Date(end - settings.deepWorkModeDuration * 60 * 1000),
            endedAt: new Date(end),
            duration: settings.deepWorkModeDuration,
            actualDuration: settings.deepWorkModeDuration,
            completed: true,
            type: 'work',
          });
          updateSettings({
            isDeepWorkActive: false,
            deepWorkEndTime: null,
            totalFocusMinutes: (settings.totalFocusMinutes || 0) + settings.deepWorkModeDuration,
            completedSessions: (settings.completedSessions || 0) + 1,
          }).then(() => getSettings().then(setSettings));
        }
      };

      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setRemainingTime(0);
    }

    return () => clearInterval(interval);
  }, [settings?.isDeepWorkActive, settings?.deepWorkEndTime]);

  const [showHardLockConfirm, setShowHardLockConfirm] = useState(false);

  if (!settings) return null;

  const doStart = async () => {
    const durationMs = selectedDuration * 60 * 1000;
    const endTime = Date.now() + durationMs;
    await updateSettings({
      isDeepWorkActive: true,
      deepWorkEndTime: endTime,
      deepWorkModeDuration: selectedDuration,
      deepWorkModeBreakDuration: selectedBreak,
      hardLockMode: hardLock,
    });
    setSettings(await getSettings());
    setShowHardLockConfirm(false);
  };

  const handleStart = async () => {
    if (hardLock) {
      setShowHardLockConfirm(true);
    } else {
      await doStart();
    }
  };

  const handleStop = async () => {
    if (hardLock && settings.isDeepWorkActive) return; // Can't stop in hard lock

    const startTime = settings.deepWorkEndTime
      ? settings.deepWorkEndTime - settings.deepWorkModeDuration * 60 * 1000
      : Date.now();
    const actualMinutes = Math.round((Date.now() - startTime) / 60000);

    await db.focusSessions.add({
      startedAt: new Date(startTime),
      endedAt: new Date(),
      duration: settings.deepWorkModeDuration,
      actualDuration: actualMinutes,
      completed: false,
      type: 'work',
    });

    await updateSettings({
      isDeepWorkActive: false,
      deepWorkEndTime: null,
      totalFocusMinutes: (settings.totalFocusMinutes || 0) + actualMinutes,
    });
    setSettings(await getSettings());
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalSeconds = selectedDuration * 60;
  const progress = settings.isDeepWorkActive
    ? ((totalSeconds - remainingTime) / totalSeconds) * 100
    : 0;

  const t = (key: string, fallback: string) => chrome.i18n.getMessage(key) || fallback;

  const presetDurations = [15, 25, 45, 60, 90];

  return (
    <div className="absolute inset-0 bg-white dark:bg-slate-900 flex flex-col z-50 animate-fade-in">
      {/* Header */}
      <div className={`flex-shrink-0 p-4 flex items-center justify-between transition-colors duration-500 ${
        settings.isDeepWorkActive
          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white'
          : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700'
      }`}>
        <div className="flex items-center gap-2">
          <Brain className={`w-5 h-5 ${settings.isDeepWorkActive ? 'animate-pulse' : ''}`} />
          <h1 className="text-lg font-bold">{chrome.i18n.getMessage("deepWorkHeader") || 'Deep Work'}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onClose} aria-label="Close deep work" className={`p-1.5 rounded-lg transition-colors ${
            settings.isDeepWorkActive ? 'hover:bg-white/10' : 'hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4 overflow-y-auto slim-scrollbar">
        {/* Timer Circle */}
        <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
          {/* Background circle */}
          <svg className="absolute inset-0 w-full h-full circular-progress" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor"
              className="text-slate-100 dark:text-slate-800" strokeWidth="4" />
            {settings.isDeepWorkActive && (
              <circle cx="50" cy="50" r="45" fill="none"
                className="text-teal-500"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            )}
          </svg>

          <div className="text-center z-10">
            {settings.isDeepWorkActive ? (
              <>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {formatTime(remainingTime)}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">{chrome.i18n.getMessage('remainingLabel') || 'remaining'}</p>
              </>
            ) : (
              <>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {selectedDuration}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">{chrome.i18n.getMessage('minutesLabel') || 'minutes'}</p>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        {!settings.isDeepWorkActive ? (
          <div className="w-full space-y-3">
            {/* Duration presets */}
            <div className="flex justify-center gap-1.5">
              {presetDurations.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedDuration === d
                      ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>

            {/* Break duration */}
            <div className="flex items-center justify-center gap-3">
              <Coffee className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('breakLabel', 'Break')}:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedBreak(Math.max(1, selectedBreak - 1))}
                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-8 text-center">{selectedBreak}m</span>
                <button
                  onClick={() => setSelectedBreak(Math.min(30, selectedBreak + 1))}
                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Hard lock toggle */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setHardLock(!hardLock)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  hardLock
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {hardLock ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {chrome.i18n.getMessage('hardLockLabel') || 'Hard Lock'} {hardLock ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Hard Lock Confirmation */}
            {showHardLockConfirm && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-900/30 space-y-2 animate-slide-up">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{chrome.i18n.getMessage('hardLockConfirmTitle') || 'Hard Lock is ON'}</p>
                </div>
                <p className="text-[11px] text-amber-600/80 dark:text-amber-500/70 leading-relaxed">
                  {chrome.i18n.getMessage('hardLockConfirmMsg') || `You will NOT be able to cancel this ${selectedDuration}-minute session. Are you sure?`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHardLockConfirm(false)}
                    className="flex-1 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doStart}
                    className="flex-1 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition-colors"
                  >
                    {chrome.i18n.getMessage('hardLockConfirmBtn') || 'Lock In'}
                  </button>
                </div>
              </div>
            )}

            {/* Start button */}
            {!showHardLockConfirm && (
              <button
                onClick={handleStart}
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-semibold shadow-lg shadow-teal-500/25"
              >
                <Play className="w-5 h-5 fill-current" />
                {chrome.i18n.getMessage('startDeepWork') || 'Start Deep Work'}
              </button>
            )}
          </div>
        ) : (
          <div className="w-full space-y-3">
            {hardLock && settings.isDeepWorkActive ? (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-bold">{chrome.i18n.getMessage('hardLockActive') || 'Hard Lock Active'}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{chrome.i18n.getMessage('hardLockStayFocused') || "You can't stop until the timer ends. Stay focused!"}</p>
              </div>
            ) : (
              <button
                onClick={handleStop}
                className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2 font-medium border border-red-200 dark:border-red-800"
              >
                <Square className="w-5 h-5 fill-current" />
                {chrome.i18n.getMessage('endSession') || 'End Session Early'}
              </button>
            )}
          </div>
        )}

        {/* Stats summary */}
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{settings.completedSessions || 0}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{chrome.i18n.getMessage('sessionsLabel') || 'Sessions'}</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-700" />
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{Math.round((settings.totalFocusMinutes || 0) / 60 * 10) / 10}h</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{chrome.i18n.getMessage('focusTimeLabel') || 'Focus Time'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

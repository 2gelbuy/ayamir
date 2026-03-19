import { useState, useEffect } from 'react';
import { Play, Square, Brain, X, Lock, Unlock, Volume2, VolumeX, Coffee, Minus, Plus } from 'lucide-react';
import { getSettings, updateSettings, Settings, db } from '@/lib/db';
import { playAmbientSound, stopAmbientSound } from '@/lib/sounds';

export default function DeepWorkMode({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [selectedBreak, setSelectedBreak] = useState(5);
  const [selectedSound, setSelectedSound] = useState<string>('none');
  const [hardLock, setHardLock] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      setSelectedDuration(s.deepWorkModeDuration);
      setSelectedBreak(s.deepWorkModeBreakDuration);
      setSelectedSound(s.ambientSound || 'none');
      setHardLock(s.hardLockMode || false);
    });
    return () => stopAmbientSound();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (settings?.isDeepWorkActive && settings.deepWorkEndTime) {
      const updateTimer = () => {
        const now = Date.now();
        const end = settings.deepWorkEndTime!;
        if (now < end) {
          setRemainingTime(Math.floor((end - now) / 1000));
        } else {
          setRemainingTime(0);
          // Session complete - log it
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
          stopAmbientSound();
          setSoundPlaying(false);
        }
      };

      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setRemainingTime(0);
    }

    return () => clearInterval(interval);
  }, [settings?.isDeepWorkActive, settings?.deepWorkEndTime]);

  if (!settings) return null;

  const handleStart = async () => {
    const durationMs = selectedDuration * 60 * 1000;
    const endTime = Date.now() + durationMs;
    await updateSettings({
      isDeepWorkActive: true,
      deepWorkEndTime: endTime,
      deepWorkModeDuration: selectedDuration,
      deepWorkModeBreakDuration: selectedBreak,
      hardLockMode: hardLock,
      ambientSound: selectedSound as Settings['ambientSound'],
    });
    setSettings(await getSettings());

    if (selectedSound !== 'none') {
      playAmbientSound(selectedSound);
      setSoundPlaying(true);
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
    stopAmbientSound();
    setSoundPlaying(false);
  };

  const toggleSound = () => {
    if (soundPlaying) {
      stopAmbientSound();
      setSoundPlaying(false);
    } else if (selectedSound !== 'none') {
      playAmbientSound(selectedSound);
      setSoundPlaying(true);
    }
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

  const sounds = [
    { id: 'none', label: 'Off', icon: '🔇' },
    { id: 'rain', label: 'Rain', icon: '🌧️' },
    { id: 'lofi', label: 'Lo-fi', icon: '🎵' },
    { id: 'cafe', label: 'Cafe', icon: '☕' },
    { id: 'whitenoise', label: 'White', icon: '🌊' },
  ];

  const presetDurations = [15, 25, 45, 60, 90];

  return (
    <div className="absolute inset-0 bg-white dark:bg-slate-900 flex flex-col z-50 animate-fade-in">
      {/* Header */}
      <div className={`flex-shrink-0 p-4 flex items-center justify-between transition-colors duration-500 ${
        settings.isDeepWorkActive
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
          : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700'
      }`}>
        <div className="flex items-center gap-2">
          <Brain className={`w-5 h-5 ${settings.isDeepWorkActive ? 'animate-pulse' : ''}`} />
          <h1 className="text-lg font-bold">{chrome.i18n.getMessage("deepWorkHeader") || 'Deep Work'}</h1>
        </div>
        <div className="flex items-center gap-1">
          {settings.isDeepWorkActive && selectedSound !== 'none' && (
            <button onClick={toggleSound} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              {soundPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${
            settings.isDeepWorkActive ? 'hover:bg-white/10' : 'hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
        {/* Timer Circle */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Background circle */}
          <svg className="absolute inset-0 w-full h-full circular-progress" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor"
              className="text-slate-100 dark:text-slate-800" strokeWidth="4" />
            {settings.isDeepWorkActive && (
              <circle cx="50" cy="50" r="45" fill="none"
                className="text-indigo-500"
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
                <div className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {formatTime(remainingTime)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">remaining</p>
              </>
            ) : (
              <>
                <div className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {selectedDuration}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">minutes</p>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        {!settings.isDeepWorkActive ? (
          <div className="w-full space-y-4">
            {/* Duration presets */}
            <div className="flex justify-center gap-2">
              {presetDurations.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedDuration === d
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
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
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Break:</span>
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

            {/* Ambient sounds */}
            <div className="flex justify-center gap-1.5">
              {sounds.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSound(s.id)}
                  className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl transition-all ${
                    selectedSound === s.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700'
                      : 'bg-slate-50 dark:bg-slate-800 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                    selectedSound === s.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                  }`}>{s.label}</span>
                </button>
              ))}
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
                Hard Lock {hardLock ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Start button */}
            <button
              onClick={handleStart}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-semibold shadow-lg shadow-indigo-500/25"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Deep Work
            </button>
          </div>
        ) : (
          <div className="w-full space-y-3">
            {hardLock && settings.isDeepWorkActive ? (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-bold">Hard Lock Active</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">You can't stop until the timer ends. Stay focused!</p>
              </div>
            ) : (
              <button
                onClick={handleStop}
                className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2 font-medium border border-red-200 dark:border-red-800"
              >
                <Square className="w-5 h-5 fill-current" />
                End Session Early
              </button>
            )}
          </div>
        )}

        {/* Stats summary */}
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{settings.completedSessions || 0}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Sessions</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-700" />
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{Math.round((settings.totalFocusMinutes || 0) / 60 * 10) / 10}h</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Focus Time</p>
          </div>
        </div>
      </div>
    </div>
  );
}

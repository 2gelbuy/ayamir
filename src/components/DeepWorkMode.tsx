import { useState, useEffect } from 'react';
import { Play, Square, Brain, Settings as SettingsIcon, X } from 'lucide-react';
import { getSettings, updateSettings, Settings } from '@/lib/db';

export default function DeepWorkMode({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  useEffect(() => {
    getSettings().then(setSettings);
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
          updateSettings({ isDeepWorkActive: false, deepWorkEndTime: null }).then(() => {
              getSettings().then(setSettings);
          });
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
    const durationMs = settings.deepWorkModeDuration * 60 * 1000;
    const endTime = Date.now() + durationMs;
    await updateSettings({
        isDeepWorkActive: true,
        deepWorkEndTime: endTime
    });
    setSettings(await getSettings());
  };

  const handleStop = async () => {
    await updateSettings({
        isDeepWorkActive: false,
        deepWorkEndTime: null
    });
    setSettings(await getSettings());
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-white flex flex-col z-50">
      <div className="flex-shrink-0 bg-indigo-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          <h1 className="text-lg font-bold">{chrome.i18n.getMessage("deepWorkHeader")}</h1>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-indigo-700 rounded transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        <div className="text-center">
            <Brain className={`w-16 h-16 mx-auto mb-4 ${settings.isDeepWorkActive ? 'text-indigo-600 animate-pulse' : 'text-gray-300'}`} />
            <h2 className="text-2xl font-bold text-gray-900">
              {settings.isDeepWorkActive ? 'Focus Session Active' : 'Ready to focus?'}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              {settings.isDeepWorkActive 
                  ? 'Distracting sites are currently blocked.' 
                  : `Start a ${settings.deepWorkModeDuration}-minute distraction-free session.`}
            </p>
        </div>

        {settings.isDeepWorkActive ? (
            <div className="text-6xl font-bold text-gray-900 tabular-nums tracking-tight">
              {formatTime(remainingTime)}
            </div>
        ) : (
            <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-gray-900">{settings.deepWorkModeDuration}m</span>
                    <span>Work</span>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-gray-900">{settings.deepWorkModeBreakDuration}m</span>
                    <span>Break</span>
                </div>
            </div>
        )}

        <div className="w-full max-w-xs">
          {!settings.isDeepWorkActive ? (
            <button
              onClick={handleStart}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Deep Work
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="w-full py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-medium border border-red-200"
            >
              <Square className="w-5 h-5 fill-current" />
              End Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
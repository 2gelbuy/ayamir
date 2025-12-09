import { useState, useEffect } from 'react';
import { Pause, Play, Clock, Coffee } from 'lucide-react';
import { useStore } from '../store/useStore';
import { db } from '../lib/db';

interface SmartPauseProps {
  onToggle: (isPaused: boolean) => void;
}

export default function SmartPause({ onToggle }: SmartPauseProps) {
  const { focusedTask } = useStore();
  const [isPaused, setIsPaused] = useState(false);
  const [pauseDuration, setPauseDuration] = useState(5); // minutes
  const [pauseEndTime, setPauseEndTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Restore persisted smart pause state
  useEffect(() => {
    chrome.storage.local.get(['smartPause', 'settings'], (data) => {
      const sp = data.smartPause;
      if (sp?.isPaused && sp.pauseEndTime) {
        const end = new Date(sp.pauseEndTime);
        if (!Number.isNaN(end.getTime()) && end.getTime() > Date.now()) {
          setIsPaused(true);
          setPauseEndTime(end);
          const remaining = Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));
          setTimeRemaining(remaining);
        }
      }
    });
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (isPaused && pauseEndTime) {
      interval = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, Math.floor((pauseEndTime.getTime() - now.getTime()) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          // Pause ended, resume focus
          setIsPaused(false);
          setPauseEndTime(null);
          onToggle(false);
        }
      }, 1000);
    }
    
    return () => {
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, [isPaused, pauseEndTime, onToggle]);

  const handleStartPause = async () => {
    if (!focusedTask) return;
    
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + pauseDuration);
    
    setPauseEndTime(endTime);
    setIsPaused(true);
    onToggle(true);

    // Persist to chrome.storage.local
    chrome.storage.local.get(['settings'], (data) => {
      const existingSettings = data.settings && typeof data.settings === 'object' ? data.settings : {};
      chrome.storage.local.set({
        smartPause: { isPaused: true, pauseEndTime: endTime.toISOString() },
        settings: { ...existingSettings, isPaused: true, pauseEndTime: endTime.toISOString() }
      });
    });
    
    // Store pause state in database
    await db.settings.where('id').above(0).modify(settings => {
      settings.isPaused = true;
      settings.pauseEndTime = endTime;
    });
  };

  const handleEndPause = async () => {
    setIsPaused(false);
    setPauseEndTime(null);
    setTimeRemaining(0);
    onToggle(false);

    chrome.storage.local.get(['settings'], (data) => {
      const existingSettings = data.settings && typeof data.settings === 'object' ? data.settings : {};
      chrome.storage.local.set({
        smartPause: { isPaused: false, pauseEndTime: null },
        settings: { ...existingSettings, isPaused: false, pauseEndTime: null }
      });
    });
    
    // Clear pause state in database
    await db.settings.where('id').above(0).modify(settings => {
      settings.isPaused = false;
      settings.pauseEndTime = null;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!focusedTask) return null;

  if (isPaused) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-3">
          <Coffee className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Smart Pause Active
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Break ends in {formatTime(timeRemaining)}
            </p>
          </div>
          <button
            onClick={handleEndPause}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1 transition-colors"
          >
            <Play className="w-3 h-3" />
            Resume
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
      <div className="flex items-center gap-3">
        <Pause className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Need a break?
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Take a smart pause (nudges disabled)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pauseDuration}
            onChange={(e) => setPauseDuration(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value={5}>5 min</option>
            <option value={10}>10 min</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
          </select>
          <button
            onClick={handleStartPause}
            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm flex items-center gap-1 transition-colors"
          >
            <Clock className="w-3 h-3" />
            Pause
          </button>
        </div>
      </div>
    </div>
  );
}
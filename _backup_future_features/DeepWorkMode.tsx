import { useState, useEffect } from 'react';
import { Play, Square, Settings, Coffee, Brain, Volume2, VolumeX, Lock, Unlock } from 'lucide-react';
import {
  DeepWorkModeState,
  getDeepWorkModeState,
  getDeepWorkModeSettings,
  startDeepWorkMode,
  stopDeepWorkMode,
  startBreakTime,
  resumeWorkAfterBreak,
  formatTime,
  updateDeepWorkModeSettings
} from '../lib/deepWorkMode';

export default function DeepWorkMode({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<DeepWorkModeState>({
    isActive: false,
    isBreakTime: false,
    currentCycle: 0,
    completedCycles: 0
  });
  const [settings, setSettings] = useState({
    deepWorkModeDuration: 25,
    deepWorkModeBreakDuration: 5,
    deepWorkModeBlockNotifications: true,
    deepWorkModeBlockSites: true,
    deepWorkModeShowTimer: true,
    deepWorkModeAutoStart: false
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [deepWorkState, deepWorkSettings] = await Promise.all([
          getDeepWorkModeState(),
          getDeepWorkModeSettings()
        ]);

        setState(deepWorkState);
        setSettings(deepWorkSettings);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading deep work mode data:', error);
        setIsLoading(false);
      }
    };

    loadData();

    // Set up interval to update remaining time
    const interval = setInterval(async () => {
      if (state.isActive) {
        const currentState = await getDeepWorkModeState();
        setState(currentState);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isActive]);

  const handleStart = async () => {
    try {
      await startDeepWorkMode();
      const newState = await getDeepWorkModeState();
      setState(newState);
    } catch (error) {
      console.error('Error starting deep work mode:', error);
    }
  };

  const handleStop = async () => {
    try {
      await stopDeepWorkMode();
      const newState = await getDeepWorkModeState();
      setState(newState);
    } catch (error) {
      console.error('Error stopping deep work mode:', error);
    }
  };

  const handleStartBreak = async () => {
    try {
      await startBreakTime();
      const newState = await getDeepWorkModeState();
      setState(newState);
    } catch (error) {
      console.error('Error starting break time:', error);
    }
  };

  const handleResumeWork = async () => {
    try {
      await resumeWorkAfterBreak();
      const newState = await getDeepWorkModeState();
      setState(newState);
    } catch (error) {
      console.error('Error resuming work:', error);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateDeepWorkModeSettings({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex-shrink-0 bg-indigo-600 dark:bg-indigo-800 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <h1 className="text-xl font-bold">Deep Work Mode</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded hover:bg-indigo-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Work Duration
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={settings.deepWorkModeDuration}
                  onChange={(e) => handleSettingChange('deepWorkModeDuration', parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                  {settings.deepWorkModeDuration}m
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Break Duration
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={settings.deepWorkModeBreakDuration}
                  onChange={(e) => handleSettingChange('deepWorkModeBreakDuration', parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                  {settings.deepWorkModeBreakDuration}m
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Block Notifications
              </span>
              <button
                onClick={() => handleSettingChange('deepWorkModeBlockNotifications', !settings.deepWorkModeBlockNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.deepWorkModeBlockNotifications ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.deepWorkModeBlockNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Block Distracting Sites
              </span>
              <button
                onClick={() => handleSettingChange('deepWorkModeBlockSites', !settings.deepWorkModeBlockSites)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.deepWorkModeBlockSites ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.deepWorkModeBlockSites ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Show Timer
              </span>
              <button
                onClick={() => handleSettingChange('deepWorkModeShowTimer', !settings.deepWorkModeShowTimer)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.deepWorkModeShowTimer ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.deepWorkModeShowTimer ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Auto-start Next Session
              </span>
              <button
                onClick={() => handleSettingChange('deepWorkModeAutoStart', !settings.deepWorkModeAutoStart)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.deepWorkModeAutoStart ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.deepWorkModeAutoStart ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center justify-center h-full space-y-6">
          <div className="flex items-center gap-3">
            {state.isActive ? (
              state.isBreakTime ? (
                <Coffee className="w-8 h-8 text-green-600" />
              ) : (
                <Brain className="w-8 h-8 text-indigo-600" />
              )
            ) : (
              <Brain className="w-8 h-8 text-gray-400" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {state.isActive ? (state.isBreakTime ? 'Break Time' : 'Deep Work') : 'Deep Work Mode'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {state.isActive
                  ? (state.isBreakTime
                    ? `Take a break and recharge`
                    : `Stay focused and block distractions`)
                  : `Focus on what matters most`
                }
              </p>
            </div>
          </div>

          {settings.deepWorkModeShowTimer && (
            <div className="text-center">
              <div className="text-6xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {state.remainingTime !== undefined
                  ? formatTime(state.remainingTime)
                  : '00:00'
                }
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {state.isActive && state.startTime && state.endTime && (
                  <>
                    {state.isBreakTime ? 'Break' : 'Session'} {state.currentCycle} of ∞
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!state.isActive ? (
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Session
              </button>
            ) : (
              <>
                {!state.isBreakTime ? (
                  <button
                    onClick={handleStartBreak}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Coffee className="w-5 h-5" />
                    Start Break
                  </button>
                ) : (
                  <button
                    onClick={handleResumeWork}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Resume Work
                  </button>
                )}

                <button
                  onClick={handleStop}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Square className="w-5 h-5" />
                  End Session
                </button>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                {settings.deepWorkModeBlockNotifications ? (
                  <VolumeX className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Notifications
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {settings.deepWorkModeBlockNotifications
                  ? 'Blocked during focus time'
                  : 'Allowed during focus time'
                }
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                {settings.deepWorkModeBlockSites ? (
                  <Lock className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Unlock className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Distracting Sites
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {settings.deepWorkModeBlockSites
                  ? 'Blocked during focus time'
                  : 'Allowed during focus time'
                }
              </p>
            </div>
          </div>

          {state.completedCycles > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 w-full max-w-md">
              <h3 className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-2">
                Your Progress
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-indigo-800 dark:text-indigo-200">
                  Completed Sessions
                </span>
                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                  {state.completedCycles}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-indigo-800 dark:text-indigo-200">
                  Total Focus Time
                </span>
                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                  {state.completedCycles * settings.deepWorkModeDuration} min
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
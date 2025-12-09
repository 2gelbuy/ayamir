import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { getSettings, updateSettings, Settings as SettingsType } from '../lib/db';
import { getAuthToken } from '../lib/googleCalendar';
import Sync from './Sync';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [activeList, setActiveList] = useState<'blacklist' | 'whitelist'>('blacklist');
  const [activeTab, setActiveTab] = useState<'general' | 'sync'>('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await getSettings();
    setSettings(s);
  };

  const handleSave = async () => {
    if (settings) {
      await updateSettings(settings);
      onClose();
    }
  };

  const addDomain = () => {
    if (!newDomain.trim() || !settings) return;

    const domain = newDomain.trim().toLowerCase();
    if (activeList === 'blacklist' && !settings.blacklist.includes(domain)) {
      setSettings({
        ...settings,
        blacklist: [...settings.blacklist, domain]
      });
    } else if (activeList === 'whitelist' && !settings.whitelist.includes(domain)) {
      setSettings({
        ...settings,
        whitelist: [...settings.whitelist, domain]
      });
    }
    setNewDomain('');
  };

  const removeDomain = (domain: string, list: 'blacklist' | 'whitelist') => {
    if (!settings) return;

    if (list === 'blacklist') {
      setSettings({
        ...settings,
        blacklist: settings.blacklist.filter(d => d !== domain)
      });
    } else {
      setSettings({
        ...settings,
        whitelist: settings.whitelist.filter(d => d !== domain)
      });
    }
  };

  if (!settings) {
    return (
      <div className="h-screen w-full bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex-shrink-0 bg-indigo-600 dark:bg-indigo-800 text-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Settings</h1>
        <button
          onClick={onClose}
          className="p-2 hover:bg-indigo-700 dark:hover:bg-indigo-900 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-shrink-0 px-4 pt-2">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
              activeTab === 'general'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
              activeTab === 'sync'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Sync
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'general' ? (
          <>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Humor Tone</h2>
              <div className="space-y-2">
                {(['polite', 'default', 'sarcastic'] as const).map((tone) => (
                  <label key={tone} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tone"
                      checked={settings.humorTone === tone}
                      onChange={() => setSettings({ ...settings, humorTone: tone })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-900 dark:text-gray-100 capitalize">{tone}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Nudge Mode</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nudgeMode"
                    checked={settings.nudgeMode === 'soft'}
                    onChange={() => setSettings({ ...settings, nudgeMode: 'soft' })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">Soft</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Shows a banner with humor</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nudgeMode"
                    checked={settings.nudgeMode === 'hard'}
                    onChange={() => setSettings({ ...settings, nudgeMode: 'hard' })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">Hard</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Blocks the website completely</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Sound</h2>
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-900 dark:text-gray-100">Enable sounds</span>
              </label>
              {settings.soundEnabled && (
                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-300">Volume: {settings.volume}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.volume}
                    onChange={(e) => setSettings({ ...settings, volume: parseInt(e.target.value, 10) })}
                    className="w-full mt-1"
                  />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Domain Lists</h2>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setActiveList('blacklist')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeList === 'blacklist'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Blacklist ({settings.blacklist.length})
                </button>
                <button
                  onClick={() => setActiveList('whitelist')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeList === 'whitelist'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Whitelist ({settings.whitelist.length})
                </button>
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                  placeholder="example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                />
                <button
                  onClick={addDomain}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeList === 'blacklist' &&
                  settings.blacklist.map((domain) => (
                    <div
                      key={domain}
                      className="flex itemsCetner justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                    >
                      <span className="text-sm text-gray-900 dark:text-gray-100">{domain}</span>
                      <button
                        onClick={() => removeDomain(domain, 'blacklist')}
                        className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                {activeList === 'whitelist' &&
                  settings.whitelist.map((domain) => (
                    <div
                      key={domain}
                      className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
                    >
                      <span className="text-sm text-gray-900 dark:text-gray-100">{domain}</span>
                      <button
                        onClick={() => removeDomain(domain, 'whitelist')}
                        className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {activeList === 'blacklist'
                  ? 'Blocked sites when focus mode is active'
                  : 'Sites that are never blocked, even in focus mode'}
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Sync</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!settings.syncEnabled}
                  onChange={(e) => setSettings({ ...settings, syncEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-900 dark:text-gray-100">Enable Chrome Sync (tasks & settings)</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Uses chrome.storage.sync (quota applies). Disable if you prefer local-only.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border dark:border-gray-700">
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">Google Calendar</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Requires sign-in when enabled; uses optional permissions.
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>Status:</span>
                  <span className="font-medium">Manual connect</span>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  onClick={async () => {
                    try {
                      const granted = await chrome.permissions.request({
                        permissions: ['identity']
                      });
                      if (granted) {
                        const token = await getAuthToken();
                        if (token) {
                          alert('Connected to Google Calendar!');
                        } else {
                          alert('Failed to get token.');
                        }
                      }
                    } catch (e) {
                      console.error(e);
                      alert('Connection failed');
                    }
                  }}
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 p-4 border-t dark:border-gray-700">
        <button
          onClick={handleSave}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}

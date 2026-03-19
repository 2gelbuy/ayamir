import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Shield, Bell, Gamepad2, Monitor, Clock, Download, Upload, RotateCcw } from 'lucide-react';
import { getSettings, updateSettings, Settings as SettingsType, SITE_CATEGORIES, db, DEFAULT_SETTINGS } from '@/lib/db';
import { applyTheme } from '@/lib/theme';

interface SettingsProps {
    onClose: () => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`toggle-switch ${checked ? 'active' : ''}`}
            role="switch"
            aria-checked={checked}
        />
    );
}

export default function Settings({ onClose }: SettingsProps) {
    const [settings, setSettings] = useState<SettingsType | null>(null);
    const [newDomain, setNewDomain] = useState('');
    const [activeSection, setActiveSection] = useState<'general' | 'blocking' | 'focus' | 'data'>('general');

    useEffect(() => {
        getSettings().then(setSettings);
    }, []);

    const handleSave = async () => {
        if (settings) {
            await updateSettings(settings);
            await applyTheme();
            onClose();
        }
    };

    const addDomain = () => {
        const domain = newDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (domain && settings && !settings.blacklist.includes(domain)) {
            setSettings({
                ...settings,
                blacklist: [...settings.blacklist, domain]
            });
            setNewDomain('');
        }
    };

    const removeDomain = (domain: string) => {
        if (settings) {
            setSettings({
                ...settings,
                blacklist: settings.blacklist.filter(d => d !== domain)
            });
        }
    };

    const toggleCategory = (category: keyof typeof SITE_CATEGORIES) => {
        if (!settings) return;
        const categorySites = SITE_CATEGORIES[category];
        const allAdded = categorySites.every(s => settings.blacklist.includes(s));

        if (allAdded) {
            // Remove all from this category
            setSettings({
                ...settings,
                blacklist: settings.blacklist.filter(d => !categorySites.includes(d))
            });
        } else {
            // Add all from this category
            const newSites = categorySites.filter(s => !settings.blacklist.includes(s));
            setSettings({
                ...settings,
                blacklist: [...settings.blacklist, ...newSites]
            });
        }
    };

    const exportData = async () => {
        const tasks = await db.tasks.toArray();
        const sessions = await db.focusSessions.toArray();
        const data = JSON.stringify({ settings, tasks, sessions }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ayamir-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const importData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const text = await file.text();
            try {
                const data = JSON.parse(text);
                if (data.settings) await updateSettings(data.settings);
                if (data.tasks) {
                    await db.tasks.clear();
                    await db.tasks.bulkAdd(data.tasks);
                }
                if (data.sessions) {
                    await db.focusSessions.clear();
                    await db.focusSessions.bulkAdd(data.sessions);
                }
                getSettings().then(setSettings);
            } catch {
                // invalid file
            }
        };
        input.click();
    };

    const resetAll = async () => {
        if (confirm('This will delete all tasks, sessions, and settings. Are you sure?')) {
            await db.tasks.clear();
            await db.focusSessions.clear();
            await updateSettings(DEFAULT_SETTINGS);
            getSettings().then(setSettings);
        }
    };

    if (!settings) return null;

    const sections = [
        { id: 'general' as const, icon: Monitor, label: 'General' },
        { id: 'blocking' as const, icon: Shield, label: 'Blocking' },
        { id: 'focus' as const, icon: Clock, label: 'Focus' },
        { id: 'data' as const, icon: Download, label: 'Data' },
    ];

    const categoryIcons: Record<string, { emoji: string; label: string }> = {
        social: { emoji: '💬', label: 'Social Media' },
        news: { emoji: '📰', label: 'News & Forums' },
        entertainment: { emoji: '🎬', label: 'Entertainment' },
        shopping: { emoji: '🛒', label: 'Shopping' },
    };

    return (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 flex flex-col z-50 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{chrome.i18n.getMessage("settingsHeader")}</h2>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Section tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-2">
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-all border-b-2 ${
                            activeSection === s.id
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <s.icon className="w-3.5 h-3.5" />
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 slim-scrollbar">
                {activeSection === 'general' && (
                    <>
                        {/* Theme */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Theme</label>
                            <div className="flex gap-2">
                                {(['light', 'dark', 'system'] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setSettings({ ...settings, theme: t })}
                                        className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                                            settings.theme === t
                                                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                    <Bell className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{chrome.i18n.getMessage("settingsNotifications")}</span>
                                    <span className="text-[11px] text-slate-400">{chrome.i18n.getMessage("settingsNotificationsDesc")}</span>
                                </div>
                            </div>
                            <Toggle checked={settings.notificationsEnabled} onChange={v => setSettings({ ...settings, notificationsEnabled: v })} />
                        </div>

                        {/* Gamification */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                                    <Gamepad2 className="w-4 h-4 text-purple-500" />
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Gamification</span>
                                    <span className="text-[11px] text-slate-400">XP, levels, and achievements</span>
                                </div>
                            </div>
                            <Toggle checked={settings.gamificationEnabled} onChange={v => setSettings({ ...settings, gamificationEnabled: v })} />
                        </div>
                    </>
                )}

                {activeSection === 'blocking' && (
                    <>
                        {/* Focus Mode */}
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{chrome.i18n.getMessage("settingsFocusMode")}</span>
                                <span className="text-[11px] text-slate-400">{chrome.i18n.getMessage("settingsFocusModeDesc")}</span>
                            </div>
                            <Toggle checked={settings.focusEnabled} onChange={v => setSettings({ ...settings, focusEnabled: v })} />
                        </div>

                        {/* Scheduled Blocking */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Scheduled Blocking</span>
                                    <span className="text-[11px] text-slate-400">Auto-block during work hours</span>
                                </div>
                                <Toggle
                                    checked={settings.scheduledBlocking.enabled}
                                    onChange={v => setSettings({
                                        ...settings,
                                        scheduledBlocking: { ...settings.scheduledBlocking, enabled: v }
                                    })}
                                />
                            </div>
                            {settings.scheduledBlocking.enabled && (
                                <div className="pl-2 space-y-2 animate-slide-down">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={`${String(settings.scheduledBlocking.startHour).padStart(2, '0')}:00`}
                                            onChange={e => setSettings({
                                                ...settings,
                                                scheduledBlocking: {
                                                    ...settings.scheduledBlocking,
                                                    startHour: parseInt(e.target.value.split(':')[0])
                                                }
                                            })}
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-700 dark:text-slate-300"
                                        />
                                        <span className="text-xs text-slate-400">to</span>
                                        <input
                                            type="time"
                                            value={`${String(settings.scheduledBlocking.endHour).padStart(2, '0')}:00`}
                                            onChange={e => setSettings({
                                                ...settings,
                                                scheduledBlocking: {
                                                    ...settings.scheduledBlocking,
                                                    endHour: parseInt(e.target.value.split(':')[0])
                                                }
                                            })}
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-700 dark:text-slate-300"
                                        />
                                    </div>
                                    <div className="flex gap-1">
                                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
                                            const dayNum = i === 6 ? 0 : i + 1;
                                            const isActive = settings.scheduledBlocking.days.includes(dayNum);
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        const days = isActive
                                                            ? settings.scheduledBlocking.days.filter(x => x !== dayNum)
                                                            : [...settings.scheduledBlocking.days, dayNum];
                                                        setSettings({
                                                            ...settings,
                                                            scheduledBlocking: { ...settings.scheduledBlocking, days }
                                                        });
                                                    }}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                                        isActive
                                                            ? 'bg-indigo-500 text-white'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                    }`}
                                                >
                                                    {d}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Category Blocking */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Quick Block Categories</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(categoryIcons).map(([key, { emoji, label }]) => {
                                    const sites = SITE_CATEGORIES[key as keyof typeof SITE_CATEGORIES];
                                    const allBlocked = sites.every(s => settings.blacklist.includes(s));
                                    const someBlocked = sites.some(s => settings.blacklist.includes(s));
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => toggleCategory(key as keyof typeof SITE_CATEGORIES)}
                                            className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                                                allBlocked
                                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                                                    : someBlocked
                                                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400'
                                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            <span>{emoji}</span>
                                            <span>{label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Blacklist */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                Blocked Sites ({settings.blacklist.length})
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    placeholder="e.g. facebook.com"
                                    className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-slate-700 dark:text-slate-300"
                                    onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                                />
                                <button
                                    onClick={addDomain}
                                    className="px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto slim-scrollbar">
                                {settings.blacklist.map((domain) => (
                                    <div key={domain} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm group">
                                        <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">{domain}</span>
                                        <button
                                            onClick={() => removeDomain(domain)}
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeSection === 'focus' && (
                    <>
                        {/* Deep Work Duration */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                Default Session Duration
                            </label>
                            <div className="flex gap-2">
                                {[15, 25, 45, 60, 90].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setSettings({ ...settings, deepWorkModeDuration: d })}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                            settings.deepWorkModeDuration === d
                                                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {d}m
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Break Duration */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                Default Break Duration
                            </label>
                            <div className="flex gap-2">
                                {[3, 5, 10, 15].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setSettings({ ...settings, deepWorkModeBreakDuration: d })}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                            settings.deepWorkModeBreakDuration === d
                                                ? 'bg-green-500 text-white shadow-md shadow-green-500/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {d}m
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hard Lock */}
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Hard Lock Mode</span>
                                <span className="text-[11px] text-slate-400">Can't cancel sessions once started</span>
                            </div>
                            <Toggle checked={settings.hardLockMode} onChange={v => setSettings({ ...settings, hardLockMode: v })} />
                        </div>

                        {/* Default Ambient Sound */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                Default Ambient Sound
                            </label>
                            <div className="flex gap-2">
                                {[
                                    { id: 'none', label: 'Off', emoji: '🔇' },
                                    { id: 'rain', label: 'Rain', emoji: '🌧️' },
                                    { id: 'lofi', label: 'Lo-fi', emoji: '🎵' },
                                    { id: 'cafe', label: 'Cafe', emoji: '☕' },
                                    { id: 'whitenoise', label: 'Noise', emoji: '🌊' },
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSettings({ ...settings, ambientSound: s.id as SettingsType['ambientSound'] })}
                                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
                                            settings.ambientSound === s.id
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                                                : 'bg-slate-50 dark:bg-slate-800 border border-transparent text-slate-500 dark:text-slate-400'
                                        }`}
                                    >
                                        <span>{s.emoji}</span>
                                        <span className="text-[9px]">{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeSection === 'data' && (
                    <>
                        <div className="space-y-3">
                            <button
                                onClick={exportData}
                                className="w-full flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                    <Download className="w-5 h-5 text-blue-500" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Export Data</p>
                                    <p className="text-[11px] text-slate-400">Download all tasks, settings & stats</p>
                                </div>
                            </button>

                            <button
                                onClick={importData}
                                className="w-full flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                    <Upload className="w-5 h-5 text-green-500" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Import Data</p>
                                    <p className="text-[11px] text-slate-400">Restore from a backup file</p>
                                </div>
                            </button>

                            <button
                                onClick={resetAll}
                                className="w-full flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <RotateCcw className="w-5 h-5 text-red-500" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">Reset Everything</p>
                                    <p className="text-[11px] text-red-400 dark:text-red-500">Delete all data and start fresh</p>
                                </div>
                            </button>
                        </div>

                        <div className="text-center pt-4 space-y-1">
                            <p className="text-xs text-slate-400">AyaMir v1.2.0</p>
                            <p className="text-[10px] text-slate-300 dark:text-slate-600">All data stored locally in your browser</p>
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            {activeSection !== 'data' && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleSave}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity font-semibold text-sm shadow-md shadow-indigo-500/20"
                    >
                        {chrome.i18n.getMessage("settingsSave") || 'Save Settings'}
                    </button>
                </div>
            )}
        </div>
    );
}

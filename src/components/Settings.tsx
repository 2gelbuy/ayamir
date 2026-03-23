import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Shield, Bell, Gamepad2, Monitor, Clock, Download, Upload, RotateCcw, Copy, ClipboardPaste, ShieldCheck, MessageSquare, Star, ExternalLink, AlertTriangle } from 'lucide-react';
import { getSettings, updateSettings, Settings as SettingsType, SITE_CATEGORIES, db, DEFAULT_SETTINGS } from '@/lib/db';
import { applyTheme } from '@/lib/theme';
import { t } from '@/lib/i18n';

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
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [importError, setImportError] = useState('');
    const [pasteError, setPasteError] = useState('');

    useEffect(() => {
        getSettings().then(setSettings).catch(err => console.error('Failed to load settings:', err));
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
                if (!data || typeof data !== 'object') throw new Error('Invalid format');
                // Validate settings — only merge known keys
                if (data.settings && typeof data.settings === 'object') {
                    const safe: Record<string, unknown> = {};
                    const allowed = Object.keys(DEFAULT_SETTINGS);
                    for (const key of allowed) {
                        if (key in data.settings) safe[key] = data.settings[key];
                    }
                    await updateSettings(safe);
                }
                // Validate tasks — sanitize all fields
                if (Array.isArray(data.tasks)) {
                    const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
                    const validTasks = data.tasks
                        .filter((t: any) => t && typeof t.title === 'string' && t.title.length > 0 && t.title.length < 1000)
                        .map((t: any) => ({
                            title: String(t.title).trim().substring(0, 500),
                            startTime: t.startTime ? new Date(t.startTime) : null,
                            isCompleted: !!t.isCompleted,
                            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
                            completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
                            priority: VALID_PRIORITIES.includes(t.priority) ? t.priority : 'medium',
                            url: typeof t.url === 'string' && /^https?:\/\//.test(t.url) ? t.url.substring(0, 2000) : undefined,
                            tags: Array.isArray(t.tags) ? t.tags.filter((tag: any) => typeof tag === 'string').map((tag: string) => tag.substring(0, 50)) : undefined,
                            estimatedDuration: typeof t.estimatedDuration === 'number' && t.estimatedDuration > 0 ? Math.min(t.estimatedDuration, 1440) : undefined,
                            points: typeof t.points === 'number' ? Math.max(0, Math.min(t.points, 10000)) : undefined,
                        }));
                    await db.transaction('rw', db.tasks, async () => {
                        await db.tasks.clear();
                        await db.tasks.bulkAdd(validTasks);
                    });
                }
                if (Array.isArray(data.sessions)) {
                    const validSessions = data.sessions
                        .filter((s: any) => s && typeof s.duration === 'number' && typeof s.completed === 'boolean')
                        .map((s: any) => ({
                            startedAt: s.startedAt ? new Date(s.startedAt) : new Date(),
                            endedAt: s.endedAt ? new Date(s.endedAt) : undefined,
                            duration: Math.min(Math.max(Number(s.duration), 1), 480),
                            actualDuration: typeof s.actualDuration === 'number' ? Math.min(s.actualDuration, 480) : undefined,
                            completed: !!s.completed,
                            type: s.type === 'break' ? 'break' as const : 'work' as const,
                        }));
                    await db.transaction('rw', db.focusSessions, async () => {
                        await db.focusSessions.clear();
                        await db.focusSessions.bulkAdd(validSessions);
                    });
                }
                getSettings().then(setSettings).catch(() => {});
                setImportError('');
            } catch {
                setImportError('Invalid backup file');
            }
        };
        input.click();
    };

    const resetAll = async () => {
        await db.tasks.clear();
        await db.focusSessions.clear();
        await updateSettings(DEFAULT_SETTINGS);
        setShowResetConfirm(false);
        getSettings().then(setSettings).catch(() => {});
    };

    if (!settings) return null;

    const sections = [
        { id: 'general' as const, icon: Monitor, label: t('tabGeneral', 'General') },
        { id: 'blocking' as const, icon: Shield, label: t('tabBlocking', 'Blocking') },
        { id: 'focus' as const, icon: Clock, label: t('tabFocus', 'Focus') },
        { id: 'data' as const, icon: Download, label: t('tabData', 'Data') },
    ];

    const categoryIcons: Record<string, { emoji: string; label: string }> = {
        social: { emoji: '💬', label: t('catSocial', 'Social Media') },
        news: { emoji: '📰', label: t('catNews', 'News & Forums') },
        entertainment: { emoji: '🎬', label: t('catEntertainment', 'Entertainment') },
        shopping: { emoji: '🛒', label: t('catShopping', 'Shopping') },
    };

    return (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 flex flex-col z-50 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{chrome.i18n.getMessage("settingsHeader")}</h2>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500" aria-label="Close settings">
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
                                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
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
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t('themeLabel')}</label>
                            <div className="flex gap-2">
                                {(['light', 'dark', 'system'] as const).map(themeOption => (
                                    <button
                                        key={themeOption}
                                        onClick={() => setSettings({ ...settings, theme: themeOption })}
                                        className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                                            settings.theme === themeOption
                                                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {themeOption}
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
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{t('gamificationLabel')}</span>
                                    <span className="text-[11px] text-slate-400">{t('gamificationDesc')}</span>
                                </div>
                            </div>
                            <Toggle checked={settings.gamificationEnabled} onChange={v => setSettings({ ...settings, gamificationEnabled: v })} />
                        </div>

                        {/* Incognito Reminder */}
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-900/30">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">{t('incognitoTitle')}</p>
                            <p className="text-[11px] text-amber-600/70 dark:text-amber-500/70 leading-relaxed">
                                {t('incognitoDesc')}
                            </p>
                        </div>

                        {/* Privacy Badge */}
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-900/30">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <p className="text-xs font-semibold text-green-700 dark:text-green-400">{t('privacyTitle')}</p>
                            </div>
                            <p className="text-[11px] text-green-600/70 dark:text-green-500/70 leading-relaxed">
                                {t('privacyDesc')}
                            </p>
                        </div>

                        {/* Feedback & Rate */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t('feedbackSectionLabel', 'Help Us Improve')}</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => chrome.tabs.create({ url: 'https://github.com/2gelbuy/ayamir/issues/new/choose' })}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:border-teal-200 dark:hover:border-teal-700 hover:text-teal-600 dark:hover:text-teal-400 transition-all"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {t('feedbackBtn', 'Send Feedback')}
                                    <ExternalLink className="w-3 h-3 opacity-50" />
                                </button>
                                <button
                                    onClick={() => chrome.tabs.create({ url: `https://chromewebstore.google.com/detail/ayamir/${chrome.runtime.id}/reviews` })}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-700 hover:text-amber-600 dark:hover:text-amber-400 transition-all"
                                >
                                    <Star className="w-3.5 h-3.5" />
                                    {t('rateBtn', 'Rate Us')}
                                    <ExternalLink className="w-3 h-3 opacity-50" />
                                </button>
                            </div>
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
                            <Toggle checked={settings.focusEnabled} onChange={v => setSettings({ ...settings, focusEnabled: v, focusEnabledManually: true })} />
                        </div>

                        {/* Scheduled Blocking */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{t('scheduledBlocking')}</span>
                                    <span className="text-[11px] text-slate-400">{t('scheduledBlockingDesc')}</span>
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
                                                            ? 'bg-teal-500 text-white'
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
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t('quickBlockCategories')}</label>
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

                        {/* Import/Export Blacklist */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(settings.blacklist.join('\n'));
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                {t('copyList')}
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const text = await navigator.clipboard.readText();
                                        const domains = text.split(/[\n,;]+/)
                                            .map(d => d.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
                                            .filter(d => d && d.includes('.'));
                                        if (domains.length > 0) {
                                            const newDomains = domains.filter(d => !settings.blacklist.includes(d));
                                            setSettings({
                                                ...settings,
                                                blacklist: [...settings.blacklist, ...newDomains]
                                            });
                                        }
                                    } catch {
                                        setPasteError('Clipboard access denied');
                                        setTimeout(() => setPasteError(''), 3000);
                                    }
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <ClipboardPaste className="w-3.5 h-3.5" />
                                {t('pasteList')}
                            </button>
                        </div>

                        {pasteError && (
                            <p className="text-[11px] text-red-500 font-medium">{pasteError}</p>
                        )}

                        {/* Custom Blacklist */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                {t('settingsBlockedSites', 'Blocked Sites')} ({settings.blacklist.length})
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    placeholder="e.g. facebook.com"
                                    className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 text-slate-700 dark:text-slate-300"
                                    onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                                />
                                <button
                                    onClick={addDomain}
                                    className="px-3 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors"
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
                                {t('sessionDuration')}
                            </label>
                            <div className="flex gap-2">
                                {[15, 25, 45, 60, 90].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setSettings({ ...settings, deepWorkModeDuration: d })}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                            settings.deepWorkModeDuration === d
                                                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
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
                                {t('breakDuration')}
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
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{t('hardLockLabel')}</span>
                                <span className="text-[11px] text-slate-400">{t('hardLockDesc')}</span>
                            </div>
                            <Toggle checked={settings.hardLockMode} onChange={v => setSettings({ ...settings, hardLockMode: v })} />
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
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('exportData')}</p>
                                    <p className="text-[11px] text-slate-400">{t('exportDataDesc')}</p>
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
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('importData')}</p>
                                    <p className="text-[11px] text-slate-400">{t('importDataDesc')}</p>
                                </div>
                            </button>

                            {!showResetConfirm ? (
                                <button
                                    onClick={() => setShowResetConfirm(true)}
                                    className="w-full flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                        <RotateCcw className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-red-600 dark:text-red-400">{t('resetAll')}</p>
                                        <p className="text-[11px] text-red-400 dark:text-red-500">{t('resetAllDesc')}</p>
                                    </div>
                                </button>
                            ) : (
                                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/30 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        <p className="text-xs font-bold text-red-700 dark:text-red-400">Delete all data?</p>
                                    </div>
                                    <p className="text-[11px] text-red-600/80 dark:text-red-500/70 leading-relaxed">
                                        This will permanently delete all tasks, sessions, and settings. This cannot be undone.
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowResetConfirm(false)}
                                            className="flex-1 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700"
                                        >
                                            {t('cancel', 'Cancel')}
                                        </button>
                                        <button
                                            onClick={resetAll}
                                            className="flex-1 py-2 bg-red-500 text-white text-xs font-semibold rounded-xl hover:bg-red-600 transition-colors"
                                        >
                                            {t('resetAll')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {importError && (
                            <div className="p-2.5 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/30">
                                <p className="text-xs font-semibold text-red-600 dark:text-red-400">{importError}</p>
                            </div>
                        )}

                        <div className="text-center pt-4 space-y-1">
                            <p className="text-xs text-slate-400">AyaMir v{chrome.runtime.getManifest().version}</p>
                            <p className="text-[10px] text-slate-300 dark:text-slate-600">{t('localDataNote')}</p>
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            {activeSection !== 'data' && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleSave}
                        className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:opacity-90 transition-opacity font-semibold text-sm shadow-md shadow-teal-500/20"
                    >
                        {chrome.i18n.getMessage("settingsSave") || 'Save Settings'}
                    </button>
                </div>
            )}
        </div>
    );
}

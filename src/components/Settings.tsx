import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { getSettings, updateSettings, Settings as SettingsType } from '@/lib/db';

interface SettingsProps {
    onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
    const [settings, setSettings] = useState<SettingsType | null>(null);
    const [newDomain, setNewDomain] = useState('');

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
        if (newDomain.trim() && settings) {
            setSettings({
                ...settings,
                blacklist: [...settings.blacklist, newDomain.trim()]
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

    if (!settings) return null;

    return (
        <div className="absolute inset-0 bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">{chrome.i18n.getMessage("settingsHeader")}</h2>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Notifications */}
                <div>
                    <label className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{chrome.i18n.getMessage("settingsNotifications")}</span>
                        <input
                            type="checkbox"
                            checked={settings.notificationsEnabled}
                            onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
                            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">{chrome.i18n.getMessage("settingsNotificationsDesc")}</p>
                </div>

                {/* Focus Mode */}
                <div>
                    <label className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{chrome.i18n.getMessage("settingsFocusMode")}</span>
                        <input
                            type="checkbox"
                            checked={settings.focusEnabled}
                            onChange={(e) => setSettings({ ...settings, focusEnabled: e.target.checked })}
                            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">{chrome.i18n.getMessage("settingsFocusModeDesc")}</p>
                </div>

                {/* Blacklist */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blocked Sites
                    </label>
                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            placeholder="e.g. facebook.com"
                            className="flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                        />
                        <button
                            onClick={addDomain}
                            className="px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {settings.blacklist.map((domain) => (
                            <div key={domain} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded text-sm">
                                <span>{domain}</span>
                                <button
                                    onClick={() => removeDomain(domain)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t">
                <button
                    onClick={handleSave}
                    className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                    Save Settings
                </button>
            </div>
        </div>
    );
}

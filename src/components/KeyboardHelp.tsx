import { X, Keyboard } from 'lucide-react';

interface KeyboardHelpProps {
    onClose: () => void;
}

const shortcuts = [
    { keys: ['n', '/'], action: 'New task' },
    { keys: ['d'], action: 'Deep Work mode' },
    { keys: ['v'], action: 'View stats' },
    { keys: ['s'], action: 'Settings' },
    { keys: ['1-4'], action: 'Switch filter' },
    { keys: ['?'], action: 'This help' },
    { keys: ['Esc'], action: 'Close modal' },
    { keys: ['Ctrl+Shift+E'], action: 'Open AyaMir' },
    { keys: ['Ctrl+Shift+Space'], action: 'Quick task (any page)' },
];

export default function KeyboardHelp({ onClose }: KeyboardHelpProps) {
    return (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 flex flex-col z-50 animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Keyboard className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {shortcuts.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{s.action}</span>
                        <div className="flex gap-1">
                            {s.keys.map(k => (
                                <kbd key={k} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                                    {k}
                                </kbd>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

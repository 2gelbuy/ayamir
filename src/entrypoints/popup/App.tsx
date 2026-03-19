import { useState, useEffect } from 'react';
import { Target, Settings as SettingsIcon, BarChart3, Zap, Brain, Sun, Moon, Sparkles, Keyboard } from 'lucide-react';
import { db, Settings as SettingsType, getSettings, updateSettings } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import TaskInput from '@/components/TaskInput';
import TaskList from '@/components/TaskList';
import Settings from '@/components/Settings';
import Stats from '@/components/Stats';
import DeepWorkMode from '@/components/DeepWorkMode';
import Onboarding from '@/components/Onboarding';
import DailyFocus from '@/components/DailyFocus';
import KeyboardHelp from '@/components/KeyboardHelp';
import { sortTasksByPriority } from '@/lib/smartQueue';
import { LEVEL_THRESHOLDS, getUserLevel } from '@/lib/gamification';
import { applyTheme } from '@/lib/theme';

export default function App() {
    const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
    const [filter, setFilter] = useState<'smart' | 'active' | 'all' | 'completed'>('smart');
    const [showSettings, setShowSettings] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showDeepWork, setShowDeepWork] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showDailyFocus, setShowDailyFocus] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const [settings, setSettings] = useState<SettingsType | null>(null);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        getSettings().then(s => {
            setSettings(s);
            if (!s.onboardingCompleted) {
                setShowOnboarding(true);
            } else {
                // Show daily focus if not set today
                const today = new Date().toISOString().split('T')[0];
                if (s.dailyFocusDate !== today) {
                    setShowDailyFocus(true);
                }
            }
        });
        applyTheme().then(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                if (e.key === 'Escape') e.target.blur();
                return;
            }
            switch (e.key) {
                case 'n': case '/':
                    e.preventDefault();
                    const taskInput = document.querySelector('input[placeholder]') as HTMLInputElement;
                    if (taskInput) taskInput.focus();
                    break;
                case 'd': setShowDeepWork(true); break;
                case 's': setShowSettings(true); break;
                case 'v': setShowStats(true); break;
                case '?': setShowKeyboardHelp(true); break;
                case 'Escape':
                    setShowSettings(false); setShowStats(false); setShowDeepWork(false); setShowKeyboardHelp(false); break;
                case '1': setFilter('smart'); break;
                case '2': setFilter('active'); break;
                case '3': setFilter('all'); break;
                case '4': setFilter('completed'); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleTheme = async () => {
        const newTheme = isDark ? 'light' : 'dark';
        await updateSettings({ theme: newTheme });
        document.documentElement.classList.toggle('dark');
        setIsDark(!isDark);
    };

    let filteredTasks = tasks.filter(task => {
        if (filter === 'active' || filter === 'smart') return !task.isCompleted;
        if (filter === 'completed') return task.isCompleted;
        return true;
    });

    if (filter === 'smart') {
        filteredTasks = sortTasksByPriority(filteredTasks);
    } else {
        filteredTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const activeTasksCount = tasks.filter(t => !t.isCompleted).length;
    const completedToday = tasks.filter(t => {
        if (!t.isCompleted || !t.completedAt) return false;
        const d = new Date(t.completedAt);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    }).length;

    const currentLevel = getUserLevel(settings?.totalPoints ?? 0);
    const progressPercentage = currentLevel.level < 10
        ? (((settings?.totalPoints ?? 0) - currentLevel.pointsRequired) /
            (LEVEL_THRESHOLDS[currentLevel.level].pointsRequired - currentLevel.pointsRequired)) * 100
        : 100;

    return (
        <div className={`w-[380px] h-[520px] bg-slate-50 dark:bg-slate-900 flex flex-col relative font-sans text-slate-800 dark:text-slate-200 overflow-hidden transition-colors duration-300`}>
            {/* Top XP Bar */}
            {settings?.gamificationEnabled && (
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 absolute top-0 left-0 z-50">
                    <div
                        className="h-full bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            )}

            {/* Header (Glassmorphism) */}
            <header className="pt-5 pb-3 px-5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 sticky top-0 z-40">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/20">
                            <Target className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">AyaMir</h1>
                                {settings?.gamificationEnabled && (
                                    <span className="text-[10px] font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-1.5 py-0.5 rounded-md leading-none">
                                        Lv.{currentLevel.level}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                                {activeTasksCount} {activeTasksCount !== 1 ? chrome.i18n.getMessage('activeTasks') : chrome.i18n.getMessage('activeTaskSingle')}
                                {completedToday > 0 && (
                                    <span className="text-green-500 ml-1.5">
                                        · {completedToday} done today
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-0.5 bg-slate-100/80 dark:bg-slate-700/80 p-1 rounded-xl">
                        <button
                            onClick={toggleTheme}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-amber-500"
                            title="Toggle theme"
                        >
                            {isDark ? <Sun className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Moon className="w-3.5 h-3.5" strokeWidth={2.5} />}
                        </button>
                        <button
                            onClick={() => setShowDeepWork(true)}
                            className={`p-1.5 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-lg transition-all ${
                                settings?.isDeepWorkActive
                                    ? 'text-indigo-500 animate-pulse'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600'
                            }`}
                            title={chrome.i18n.getMessage("deepWorkTitle")}
                        >
                            <Brain className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setShowStats(true)}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-purple-600"
                            title={chrome.i18n.getMessage("statsTitle")}
                        >
                            <BarChart3 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            title={chrome.i18n.getMessage("settingsTitle")}
                        >
                            <SettingsIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Daily Focus Banner */}
                {settings?.dailyFocusGoal && settings.dailyFocusDate === new Date().toISOString().split('T')[0] && (
                    <div
                        className="mt-2.5 px-3 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/30 rounded-xl border border-teal-100 dark:border-teal-800/50 cursor-pointer hover:border-teal-200 dark:hover:border-teal-700 transition-colors"
                        onClick={() => setShowDailyFocus(true)}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                            <p className="text-xs font-medium text-teal-700 dark:text-teal-300 truncate">
                                {settings.dailyFocusGoal}
                            </p>
                        </div>
                    </div>
                )}
            </header>

            {/* Input Section */}
            <div className="px-4 pt-3 pb-2 z-30 bg-slate-50 dark:bg-slate-900">
                <TaskInput />
            </div>

            {/* Filter Pills */}
            <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar z-30 bg-slate-50 dark:bg-slate-900">
                {(['smart', 'active', 'all', 'completed'] as const).map((f, i) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            filter === f
                                ? 'bg-slate-800 dark:bg-indigo-600 text-white shadow-md shadow-slate-800/20 dark:shadow-indigo-500/20'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
                        }`}
                    >
                        {f === 'smart' && <Zap className={`w-3.5 h-3.5 ${filter === f ? 'text-yellow-400 fill-yellow-400' : ''}`} />}
                        {chrome.i18n.getMessage('filter' + f.charAt(0).toUpperCase() + f.slice(1))}
                        <span className="text-[10px] opacity-60 ml-0.5">{i + 1}</span>
                    </button>
                ))}
            </div>

            {/* Task List (Scrollable) */}
            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 top-0 bg-gradient-to-b from-slate-50 dark:from-slate-900 to-transparent h-4 z-10 pointer-events-none"></div>
                <TaskList tasks={filteredTasks} filter={filter} />
                <div className="absolute inset-0 bottom-0 top-auto bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent h-4 z-10 pointer-events-none"></div>
            </div>

            {/* Keyboard hint */}
            <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center">
                <button
                    onClick={() => setShowKeyboardHelp(true)}
                    className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    <Keyboard className="w-3 h-3" />
                    {chrome.i18n.getMessage('keyboardHint') || 'Press ? for shortcuts'}
                </button>
            </div>

            {/* Modals */}
            {showSettings && <Settings onClose={() => { setShowSettings(false); getSettings().then(setSettings); }} />}
            {showStats && <Stats onClose={() => setShowStats(false)} />}
            {showDeepWork && <DeepWorkMode onClose={() => { setShowDeepWork(false); getSettings().then(setSettings); }} />}
            {showOnboarding && <Onboarding onComplete={() => { setShowOnboarding(false); setShowDailyFocus(true); getSettings().then(setSettings); }} />}
            {showDailyFocus && <DailyFocus onClose={() => { setShowDailyFocus(false); getSettings().then(setSettings); }} />}
            {showKeyboardHelp && <KeyboardHelp onClose={() => setShowKeyboardHelp(false)} />}
        </div>
    );
}

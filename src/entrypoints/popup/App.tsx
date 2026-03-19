import { useState, useEffect, useRef } from 'react';
import { Target, Settings as SettingsIcon, BarChart3, Zap, Brain, Plus } from 'lucide-react';
import { db, Settings as SettingsType, getSettings } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import TaskInput from '@/components/TaskInput';
import TaskList from '@/components/TaskList';
import Settings from '@/components/Settings';
import Stats from '@/components/Stats';
import DeepWorkMode from '@/components/DeepWorkMode';
import { sortTasksByPriority } from '@/lib/smartQueue';
import { LEVEL_THRESHOLDS, getUserLevel } from '@/lib/gamification';

export default function App() {
    const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
    const [filter, setFilter] = useState<'smart' | 'active' | 'all' | 'completed'>('smart');
    const [showSettings, setShowSettings] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showDeepWork, setShowDeepWork] = useState(false);
    const [settings, setSettings] = useState<SettingsType | null>(null);

    useEffect(() => {
        getSettings().then(setSettings);
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
                    const taskInput = document.querySelector('input[placeholder="What needs to be done?"]') as HTMLInputElement;
                    if (taskInput) taskInput.focus();
                    break;
                case 'd': setShowDeepWork(true); break;
                case 's': setShowSettings(true); break;
                case 'v': setShowStats(true); break;
                case 'Escape':
                    setShowSettings(false); setShowStats(false); setShowDeepWork(false); break;
                case '1': setFilter('smart'); break;
                case '2': setFilter('active'); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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
    
    const currentLevel = getUserLevel(settings?.totalPoints ?? 0);
    const progressPercentage = currentLevel.level < 10
        ? (((settings?.totalPoints ?? 0) - currentLevel.pointsRequired) /
            (LEVEL_THRESHOLDS[currentLevel.level].pointsRequired - currentLevel.pointsRequired)) * 100
        : 100;

    return (
        <div className="w-[380px] h-[520px] bg-slate-50 flex flex-col relative font-sans text-slate-800 overflow-hidden">
            {/* Top XP Bar */}
            {settings?.gamificationEnabled && (
                <div className="h-1.5 w-full bg-slate-200 absolute top-0 left-0 z-50">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            )}

            {/* Header (Glassmorphism) */}
            <header className="pt-5 pb-4 px-5 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                            <Target className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">AyaMir</h1>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {activeTasksCount} {activeTasksCount !== 1 ? chrome.i18n.getMessage('activeTasks') : chrome.i18n.getMessage('activeTaskSingle')}
                            </p>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                        <button
                            onClick={() => setShowDeepWork(true)}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500 hover:text-indigo-600"
                            title={chrome.i18n.getMessage("deepWorkTitle")}
                        >
                            <Brain className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setShowStats(true)}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500 hover:text-purple-600"
                            title={chrome.i18n.getMessage("statsTitle")}
                        >
                            <BarChart3 className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500 hover:text-slate-900"
                            title={chrome.i18n.getMessage("settingsTitle")}
                        >
                            <SettingsIcon className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Input Section */}
            <div className="px-4 pt-4 pb-2 z-30 bg-slate-50">
                <TaskInput />
            </div>

            {/* Filter Pills */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar z-30 bg-slate-50">
                {(['smart', 'active', 'all', 'completed'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            filter === f
                                ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                                : 'bg-white text-slate-500 hover:bg-slate-200 border border-slate-200/60'
                        }`}
                    >
                        {f === 'smart' && <Zap className={`w-3.5 h-3.5 ${filter === f ? 'text-yellow-400 fill-yellow-400' : ''}`} />}
                        {chrome.i18n.getMessage('filter' + f.charAt(0).toUpperCase() + f.slice(1))}
                    </button>
                ))}
            </div>

            {/* Task List (Scrollable) */}
            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 top-0 bg-gradient-to-b from-slate-50 to-transparent h-4 z-10 pointer-events-none"></div>
                <TaskList tasks={filteredTasks} />
                <div className="absolute inset-0 bottom-0 top-auto bg-gradient-to-t from-slate-50 to-transparent h-4 z-10 pointer-events-none"></div>
            </div>

            {/* Modals */}
            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
            {showStats && <Stats onClose={() => setShowStats(false)} />}
            {showDeepWork && <DeepWorkMode onClose={() => setShowDeepWork(false)} />}
        </div>
    );
}
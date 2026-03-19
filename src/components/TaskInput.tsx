import { useState } from 'react';
import { Plus, Clock, Calendar, ChevronDown } from 'lucide-react';
import { db, Task } from '@/lib/db';

export default function TaskInput() {
    const [title, setTitle] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const [startTime, setStartTime] = useState('');
    const [priority, setPriority] = useState<Task['priority']>('medium');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const newTask: Task = {
            title: title.trim(),
            startTime: startTime ? new Date(startTime) : null,
            isCompleted: false,
            createdAt: new Date(),
            priority
        };

        await db.tasks.add(newTask);
        setTitle('');
        setStartTime('');
        setShowOptions(false);
        setPriority('medium');
    };

    const priorityConfig = {
        low: { color: 'bg-slate-500', label: 'Low' },
        medium: { color: 'bg-blue-500', label: 'Med' },
        high: { color: 'bg-orange-500', label: 'High' },
        urgent: { color: 'bg-red-500', label: 'Urgent' },
    };

    return (
        <form onSubmit={handleSubmit} className="relative group">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-200/60 dark:border-slate-700/60 focus-within:border-teal-400 dark:focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 transition-all">
                {/* Priority dot */}
                <button
                    type="button"
                    onClick={() => {
                        const priorities: Task['priority'][] = ['low', 'medium', 'high', 'urgent'];
                        const idx = priorities.indexOf(priority);
                        setPriority(priorities[(idx + 1) % priorities.length]);
                    }}
                    className="flex-shrink-0 ml-1 group/dot"
                    title={`Priority: ${priority} (click to cycle)`}
                >
                    <div className={`w-3 h-3 rounded-full ${priorityConfig[priority || 'medium'].color} transition-colors group-hover/dot:scale-125`} />
                </button>

                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={chrome.i18n.getMessage("taskInputPlaceholder")}
                    className="flex-1 bg-transparent px-1 py-1.5 text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                />

                <button
                    type="button"
                    onClick={() => setShowOptions(!showOptions)}
                    className={`p-1.5 rounded-xl transition-all ${
                        showOptions || startTime
                            ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600'
                    }`}
                    title="Options"
                >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
                </button>

                <button
                    type="submit"
                    disabled={!title.trim()}
                    className="p-1.5 bg-slate-900 dark:bg-teal-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-teal-700 disabled:opacity-30 disabled:hover:bg-slate-900 transition-all"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Floating Options Panel */}
            {showOptions && (
                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 animate-slide-down">
                    <div className="space-y-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{chrome.i18n.getMessage('reminderLabel') || 'Reminder'}</label>
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl border border-slate-100 dark:border-slate-600">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-sm text-slate-700 dark:text-slate-300 font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{chrome.i18n.getMessage('priorityLabel') || 'Priority'}</label>
                            <div className="flex gap-1.5">
                                {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all flex items-center justify-center gap-1.5 ${
                                            priority === p
                                                ? p === 'urgent' ? 'bg-red-500 text-white shadow-md shadow-red-500/20' :
                                                  p === 'high' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' :
                                                  p === 'medium' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' :
                                                  'bg-slate-700 text-white shadow-md shadow-slate-700/20'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${
                                            priority === p ? 'bg-white/40' : priorityConfig[p].color
                                        }`} />
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}

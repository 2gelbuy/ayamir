import { useState } from 'react';
import { Plus, Clock, Flag, Calendar } from 'lucide-react';
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

    return (
        <form onSubmit={handleSubmit} className="relative group">
            <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-sm border border-slate-200/60 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={chrome.i18n.getMessage("taskInputPlaceholder")}
                    className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                />
                
                <button
                    type="button"
                    onClick={() => setShowOptions(!showOptions)}
                    className={`p-1.5 rounded-xl transition-all ${
                        showOptions || startTime || priority !== 'medium'
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    }`}
                    title="Options"
                >
                    <Calendar className="w-4 h-4" />
                </button>
                
                <button
                    type="submit"
                    disabled={!title.trim()}
                    className="p-1.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 transition-all"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Floating Options Panel */}
            {showOptions && (
                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reminder Time</label>
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-sm text-slate-700 font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                            <div className="flex gap-1.5">
                                {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                                            priority === p 
                                                ? p === 'urgent' ? 'bg-red-500 text-white shadow-md shadow-red-500/20' :
                                                  p === 'high' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' :
                                                  p === 'medium' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' :
                                                  'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
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
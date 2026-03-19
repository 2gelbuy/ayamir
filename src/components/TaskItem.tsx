import { useState } from 'react';
import { Check, Circle, Trash2, Clock, Bell, Edit2 } from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { Task, db } from '@/lib/db';
import { updateStatsOnTaskCompletion } from '@/lib/gamification';

interface TaskItemProps {
    task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);

    const isOverdue = task.startTime && new Date(task.startTime) < new Date() && !task.isCompleted;

    const handleComplete = async () => {
        if (task.id) {
            const isCompletedNow = !task.isCompleted;
            const completedAt = isCompletedNow ? new Date() : undefined;
            
            await db.tasks.update(task.id, {
                isCompleted: isCompletedNow,
                completedAt
            });

            if (isCompletedNow) {
                await updateStatsOnTaskCompletion({
                    ...task,
                    isCompleted: true,
                    completedAt
                });
            }
        }
    };

    const handleDelete = async () => {
        if (task.id && confirm('Delete this task?')) {
            await db.tasks.delete(task.id);
        }
    };

    const handleSnooze = async () => {
        if (task.id) {
            const newTime = new Date(Date.now() + 10 * 60 * 1000);
            await db.tasks.update(task.id, {
                startTime: newTime,
                notifiedAt10: false,
                notifiedAt5: false,
                notifiedAt0: false
            });
        }
    };

    const handleSaveEdit = async () => {
        if (task.id && editTitle.trim()) {
            await db.tasks.update(task.id, { title: editTitle.trim() });
            setIsEditing(false);
        }
    };

    const formatTaskTime = (date: Date) => {
        if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
        if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
        if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
        return format(date, 'MMM d, h:mm a');
    };

    const priorityColors = {
        urgent: 'bg-red-100 text-red-700 border-red-200',
        high: 'bg-orange-100 text-orange-700 border-orange-200',
        medium: 'bg-blue-100 text-blue-700 border-blue-200',
        low: 'bg-slate-100 text-slate-600 border-slate-200',
        undefined: 'hidden'
    };

    if (isEditing) {
        return (
            <div className="p-3 bg-white rounded-2xl border border-indigo-200 shadow-sm shadow-indigo-500/10 mx-4 animate-in fade-in">
                <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setIsEditing(false);
                    }}
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleSaveEdit}
                        className="flex-1 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        Save
                    </button>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`group relative mx-4 p-3 rounded-2xl transition-all duration-300 border ${
            task.isCompleted
                ? 'bg-transparent border-transparent opacity-60'
                : isOverdue
                    ? 'bg-red-50/50 border-red-100 hover:shadow-sm hover:border-red-200'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm hover:shadow-slate-200/50'
        }`}>
            <div className="flex items-start gap-3">
                {/* Custom Checkbox */}
                <button
                    onClick={handleComplete}
                    className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        task.isCompleted
                            ? 'bg-indigo-500 border-indigo-500 scale-95'
                            : 'border-slate-300 hover:border-indigo-400 bg-transparent'
                    }`}
                >
                    {task.isCompleted && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`text-sm font-medium leading-tight transition-all duration-300 ${
                        task.isCompleted ? 'line-through text-slate-400 decoration-slate-300' : 'text-slate-800'
                    }`}>
                        {task.title}
                    </p>
                    
                    {/* Meta info row */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        {task.priority && task.priority !== 'undefined' && !task.isCompleted && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityColors[task.priority]}`}>
                                {task.priority}
                            </span>
                        )}
                        
                        {task.startTime && (
                            <div className={`flex items-center gap-1 text-[11px] font-medium ${
                                task.isCompleted ? 'text-slate-400' : isOverdue ? 'text-red-600' : 'text-slate-500'
                            }`}>
                                <Clock className="w-3 h-3" />
                                {formatTaskTime(new Date(task.startTime))}
                                {isOverdue && !task.isCompleted && <span className="ml-0.5 font-bold">(Overdue)</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Hover Actions */}
                <div className={`flex items-center gap-1 transition-opacity duration-200 ${task.isCompleted ? 'opacity-0 pointer-events-none' : 'opacity-0 lg:group-hover:opacity-100'} sm:opacity-100`}>
                    {task.startTime && !task.isCompleted && (
                        <button
                            onClick={handleSnooze}
                            className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Snooze 10 min"
                        >
                            <Bell className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
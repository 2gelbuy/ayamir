import { useState, useCallback } from 'react';
import { Check, Trash2, Clock, Bell, Edit2, Link } from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { Task, db } from '@/lib/db';
import { updateStatsOnTaskCompletion } from '@/lib/gamification';

interface TaskItemProps {
    task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [justCompleted, setJustCompleted] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isOverdue = task.startTime && new Date(task.startTime) < new Date() && !task.isCompleted;

    const handleComplete = useCallback(async () => {
        if (task.id) {
            const isCompletedNow = !task.isCompleted;
            const completedAt = isCompletedNow ? new Date() : undefined;

            if (isCompletedNow) {
                setJustCompleted(true);
                setTimeout(() => setJustCompleted(false), 800);
            }

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
    }, [task]);

    const handleDelete = async () => {
        if (task.id) {
            setIsDeleting(true);
            setTimeout(async () => {
                await db.tasks.delete(task.id!);
            }, 200);
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
            await db.tasks.update(task.id, { title: editTitle.trim().substring(0, 500) });
            setIsEditing(false);
        }
    };

    const formatTaskTime = (date: Date) => {
        if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
        if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
        if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
        return format(date, 'MMM d, h:mm a');
    };

    const priorityConfig: Record<string, { bg: string; text: string; dot: string }> = {
        urgent: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
        high: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
        medium: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
        low: { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
    };

    if (isEditing) {
        return (
            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-teal-200 dark:border-teal-700 shadow-sm shadow-teal-500/10 mx-4 animate-scale-in">
                <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm mb-3 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 text-slate-800 dark:text-slate-200"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setIsEditing(false);
                    }}
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleSaveEdit}
                        className="flex-1 py-2 bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 dark:hover:bg-teal-700 transition-colors"
                    >
                        Save
                    </button>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`group relative mx-4 p-3 rounded-2xl transition-all duration-300 border ${
            isDeleting ? 'opacity-0 scale-95 -translate-x-4' :
            justCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 scale-[0.98]' :
            task.isCompleted
                ? 'bg-transparent border-transparent opacity-50'
                : isOverdue
                    ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 hover:shadow-sm hover:border-red-200'
                    : 'bg-white dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50'
        }`}>
            <div className="flex items-start gap-3">
                {/* Custom Checkbox */}
                <button
                    onClick={handleComplete}
                    className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        justCompleted
                            ? 'bg-green-500 border-green-500 scale-110'
                            : task.isCompleted
                                ? 'bg-teal-500 border-teal-500 scale-95'
                                : 'border-slate-300 dark:border-slate-600 hover:border-teal-400 dark:hover:border-teal-500 bg-transparent hover:scale-110'
                    }`}
                >
                    {(task.isCompleted || justCompleted) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`text-sm font-medium leading-tight transition-all duration-300 ${
                        task.isCompleted ? 'line-through text-slate-400 dark:text-slate-500 decoration-slate-300 dark:decoration-slate-600' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                        {task.title}
                    </p>

                    {/* Meta info row */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {task.priority && task.priority !== ('undefined' as string) && !task.isCompleted && (
                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${priorityConfig[task.priority]?.bg} ${priorityConfig[task.priority]?.text}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${priorityConfig[task.priority]?.dot}`} />
                                {task.priority}
                            </span>
                        )}

                        {task.startTime && (
                            <div className={`flex items-center gap-1 text-[11px] font-medium ${
                                task.isCompleted ? 'text-slate-400 dark:text-slate-500' : isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
                            }`}>
                                <Clock className="w-3 h-3" />
                                {formatTaskTime(new Date(task.startTime))}
                                {isOverdue && !task.isCompleted && <span className="ml-0.5 font-bold text-red-500">!</span>}
                            </div>
                        )}

                        {task.url && /^https?:\/\//.test(task.url) && (
                            <a
                                href={task.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-0.5 text-[11px] text-teal-500 hover:text-teal-600 font-medium"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Link className="w-3 h-3" />
                                link
                            </a>
                        )}

                        {task.points && task.isCompleted && (
                            <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded-md">
                                +{task.points} XP
                            </span>
                        )}
                    </div>
                </div>

                {/* Hover Actions */}
                <div className={`flex items-center gap-0.5 transition-opacity duration-200 ${task.isCompleted ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                    {task.startTime && !task.isCompleted && (
                        <button
                            onClick={handleSnooze}
                            className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                            title="Snooze 10 min"
                        >
                            <Bell className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

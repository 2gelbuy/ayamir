import { Task } from '@/lib/db';
import TaskItem from './TaskItem';
import { ClipboardList, CheckCircle2, Inbox, Sparkles } from 'lucide-react';

const t = (key: string) => chrome.i18n.getMessage(key) || key;

interface TaskListProps {
    tasks: Task[];
    filter?: string;
}

const emptyStates: Record<string, { icon: React.ReactNode; titleKey: string; subtitleKey: string }> = {
    smart: {
        icon: <Sparkles className="w-8 h-8 text-teal-300 dark:text-teal-600" />,
        titleKey: 'emptyNoActive',
        subtitleKey: 'emptyNoActiveHint',
    },
    active: {
        icon: <Inbox className="w-8 h-8 text-blue-300 dark:text-blue-600" />,
        titleKey: 'emptyCaughtUp',
        subtitleKey: 'emptyCaughtUpHint',
    },
    completed: {
        icon: <CheckCircle2 className="w-8 h-8 text-green-300 dark:text-green-600" />,
        titleKey: 'emptyNoCompleted',
        subtitleKey: 'emptyNoCompletedHint',
    },
    all: {
        icon: <ClipboardList className="w-8 h-8 text-slate-300 dark:text-slate-600" />,
        titleKey: 'emptyNoTasks',
        subtitleKey: 'emptyNoTasksHint',
    },
};

export default function TaskList({ tasks, filter = 'smart' }: TaskListProps) {
    if (tasks.length === 0) {
        const state = emptyStates[filter] || emptyStates.smart;
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full animate-fade-in">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    {state.icon}
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t(state.titleKey)}</p>
                <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">{t(state.subtitleKey)}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto pb-4 space-y-1.5 no-scrollbar h-full pt-1">
            {tasks.map((task) => (
                <TaskItem key={task.id} task={task} />
            ))}
        </div>
    );
}

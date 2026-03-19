import { Task } from '@/lib/db';
import TaskItem from './TaskItem';
import { ClipboardList } from 'lucide-react';

interface TaskListProps {
    tasks: Task[];
}

export default function TaskList({ tasks }: TaskListProps) {
    if (tasks.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <ClipboardList className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-600">All caught up!</p>
                <p className="text-xs mt-1 text-slate-400">Add a new task above to get started</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto pb-4 space-y-2.5 no-scrollbar h-full pt-1">
            {tasks.map((task) => (
                <TaskItem key={task.id} task={task} />
            ))}
        </div>
    );
}
import { useEffect, useState } from 'react';
import { Target, Clock } from 'lucide-react';
import { Task } from '../lib/db';
import { formatDistanceToNow } from 'date-fns';

interface FocusIndicatorProps {
  task: Task;
}

export default function FocusIndicator({ task }: FocusIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!task.startTime) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const start = new Date(task.startTime!);

      if (start > now) {
        const distance = formatDistanceToNow(start, { addSuffix: false });
        setTimeLeft(`in ${distance}`);
      } else {
        const distance = formatDistanceToNow(start, { addSuffix: false });
        setTimeLeft(`${distance} ago`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [task.startTime]);

  return (
    <div className="bg-green-600 dark:bg-green-700 rounded-lg p-3 flex items-center gap-3">
      <Target className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">Focus: {task.title}</p>
        {task.startTime && timeLeft && (
          <div className="flex items-center gap-1 text-xs opacity-90 mt-0.5">
            <Clock className="w-3 h-3" />
            <span>{timeLeft}</span>
          </div>
        )}
      </div>
    </div>
  );
}

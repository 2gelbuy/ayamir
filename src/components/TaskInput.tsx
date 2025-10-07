import { useState } from 'react';
import { Plus, Calendar, Clock, Tag, Flag } from 'lucide-react';
import { db } from '../lib/db';
import { getTodayTasks, sortTasksByPriority } from '../lib/smartQueue';

interface TaskInputProps {
  onTaskAdded: () => void;
}

export default function TaskInput({ onTaskAdded }: TaskInputProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [showTimeInput, setShowTimeInput] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Get the current highest order value
    const tasks = await db.tasks.orderBy('order').reverse().limit(1).toArray();
    const nextOrder = tasks.length > 0 && tasks[0].order !== undefined ? tasks[0].order + 1 : 0;

    const task = {
      title: title.trim(),
      startTime: startTime ? new Date(startTime) : null,
      isFocused: false,
      isCompleted: false,
      createdAt: new Date(),
      order: nextOrder
    };

    await db.tasks.add(task);
    setTitle('');
    setStartTime('');
    setShowTimeInput(false);
    onTaskAdded();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <input
          type="checkbox"
          id="add-time"
          checked={showTimeInput}
          onChange={(e) => setShowTimeInput(e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="add-time" className="text-sm text-gray-600 dark:text-gray-400">
          Set start time
        </label>
      </div>

      {showTimeInput && (
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
        />
      )}
    </form>
  );
}

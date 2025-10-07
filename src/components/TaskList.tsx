import { useState } from 'react';
import { Task } from '../lib/db';
import TaskItem from './TaskItem';
import { db } from '../lib/db';

interface TaskListProps {
  tasks: Task[];
  onTasksChange: () => void;
}

export default function TaskList({ tasks, onTasksChange }: TaskListProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg">No tasks yet</p>
        <p className="text-sm mt-2">Add a task to get started</p>
      </div>
    );
  }

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (index: number) => {
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (!draggedTask || dragOverIndex === null) {
      setDraggedTask(null);
      setDragOverIndex(null);
      return;
    }

    const draggedIndex = tasks.findIndex(t => t.id === draggedTask.id);
    
    // Don't do anything if the task is being dropped in its original position
    if (draggedIndex === dragOverIndex) {
      setDraggedTask(null);
      setDragOverIndex(null);
      return;
    }

    // Create a new array with the reordered tasks
    const newTasks = [...tasks];
    newTasks.splice(draggedIndex, 1);
    newTasks.splice(dragOverIndex, 0, draggedTask);

    // Update the order in the database
    try {
      // Update each task with its new order
      for (let i = 0; i < newTasks.length; i++) {
        if (newTasks[i].id) {
          await db.tasks.update(newTasks[i].id, { order: i });
        }
      }
      
      onTasksChange();
    } catch (error) {
      console.error('Error reordering tasks:', error);
    }

    setDraggedTask(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => (
        <div
          key={task.id}
          className={dragOverIndex === index ? 'border-t-2 border-b-2 border-indigo-500 -my-1 py-1' : ''}
          onDragOver={() => handleDragOver(index)}
        >
          <TaskItem
            task={task}
            onUpdate={onTasksChange}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </div>
      ))}
    </div>
  );
}

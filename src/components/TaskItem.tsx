import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Target, Trash2, Clock, CreditCard as Edit2, X, Check, GripVertical, Bell, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { Task, db } from '../lib/db';
import { useStore } from '../store/useStore';
import { updateStatsOnTaskCompletion } from '../lib/gamification';
import { showSnoozeDialog } from '../lib/snooze';

interface TaskItemProps {
  task: Task;
  onUpdate: () => void;
  onDragStart?: (task: Task) => void;
  onDragEnd?: () => void;
}

export default function TaskItem({ task, onUpdate, onDragStart, onDragEnd }: TaskItemProps) {
  const { focusedTask, setFocusedTask } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editTime, setEditTime] = useState(
    task.startTime ? format(new Date(task.startTime), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const taskRef = useRef<HTMLDivElement>(null);

  const isFocused = focusedTask?.id === task.id;
  const isOverdue = task.startTime && new Date(task.startTime) < new Date();

  const handleComplete = async () => {
    if (task.id) {
      const updatedTask = {
        ...task,
        isCompleted: true,
        completedAt: new Date()
      };
      
      await db.tasks.update(task.id, updatedTask);
      
      // Update gamification stats
      await updateStatsOnTaskCompletion(updatedTask);
      
      if (isFocused) {
        setFocusedTask(null);
      }
      onUpdate();
    }
  };

  const handleDelete = async () => {
    if (task.id && confirm('Delete this task?')) {
      await db.tasks.delete(task.id);
      if (isFocused) {
        setFocusedTask(null);
      }
      onUpdate();
    }
  };

  const handleFocus = async () => {
    if (isFocused) {
      setFocusedTask(null);
      if (task.id) {
        await db.tasks.update(task.id, { isFocused: false });
      }
    } else {
      const allTasks = await db.tasks.toArray();
      for (const t of allTasks) {
        if (t.id && t.isFocused) {
          await db.tasks.update(t.id, { isFocused: false });
        }
      }

      setFocusedTask(task);
      if (task.id) {
        await db.tasks.update(task.id, { isFocused: true });
      }
    }
    onUpdate();
  };

  const handleSaveEdit = async () => {
    if (task.id && editTitle.trim()) {
      await db.tasks.update(task.id, {
        title: editTitle.trim(),
        startTime: editTime ? new Date(editTime) : null
      });
      setIsEditing(false);
      onUpdate();
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditTime(task.startTime ? format(new Date(task.startTime), "yyyy-MM-dd'T'HH:mm") : '');
    setIsEditing(false);
  };

  const handleSnooze = async () => {
    if (task.id) {
      showSnoozeDialog(task.id, onUpdate);
    }
  };

  const handleDuplicate = async () => {
    if (task.title) {
      const newTask = {
        title: task.title,
        startTime: task.startTime ? new Date(task.startTime) : null,
        isFocused: false,
        isCompleted: false,
        createdAt: new Date()
      };
      
      await db.tasks.add(newTask);
      onUpdate();
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragOffset(0);
    
    if (taskRef.current) {
      taskRef.current.style.position = 'relative';
      taskRef.current.style.zIndex = '1000';
    }
    
    if (onDragStart) {
      onDragStart(task);
    }
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const offset = e.clientY - dragStartY;
    setDragOffset(offset);
    
    if (taskRef.current) {
      taskRef.current.style.transform = `translateY(${offset}px)`;
    }
  };

  const handleDragEnd = async () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (taskRef.current) {
      taskRef.current.style.position = '';
      taskRef.current.style.zIndex = '';
      taskRef.current.style.transform = '';
    }
    
    // Determine if we should move the task up or down
    if (Math.abs(dragOffset) > 50) {
      // Move task based on drag direction
      const moveUp = dragOffset < 0;
      // Implementation would depend on the parent component's task list
      // This is a simplified version
      console.log(`Move task ${moveUp ? 'up' : 'down'}`);
    }
    
    setDragOffset(0);
    
    if (onDragEnd) {
      onDragEnd();
    }
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragStartY(touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const offset = touch.clientY - dragStartY;
    
    if (Math.abs(offset) > 10) {
      setShowQuickActions(false);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const offset = touch.clientY - dragStartY;
    
    // Swipe right to complete
    if (offset < -50 && Math.abs(offset) > 50) {
      await handleComplete();
    }
    // Swipe left to snooze
    else if (offset > 50 && Math.abs(offset) > 50) {
      await handleSnooze();
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDragMove(e as any);
      }
    };
    
    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging, dragStartY]);

  if (isEditing) {
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-indigo-500">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full px-2 py-1 mb-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          autoFocus
        />
        <input
          type="datetime-local"
          value={editTime}
          onChange={(e) => setEditTime(e.target.value)}
          className="w-full px-2 py-1 mb-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            className="flex-1 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center gap-1"
          >
            <Check className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleCancelEdit}
            className="flex-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center gap-1"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={taskRef}
      className={`p-3 rounded-lg border transition-all ${
        isFocused
          ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${isDragging ? 'shadow-lg opacity-90' : ''}`}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setShowQuickActions(true)}
      onMouseLeave={() => setShowQuickActions(false)}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleComplete}
          className="mt-0.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
        >
          {task.isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
            {task.title}
          </h3>

          {task.startTime && (
            <div
              className={`flex items-center gap-1 mt-1 text-xs ${
                isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Clock className="w-3 h-3" />
              {format(new Date(task.startTime), 'MMM d, h:mm a')}
              {isOverdue && <span className="font-medium ml-1">(Overdue)</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Drag handle */}
          <div
            className="p-1.5 text-gray-400 cursor-move"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Quick actions - shown on hover */}
          {showQuickActions && (
            <>
              <button
                onClick={handleSnooze}
                className="p-1.5 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Snooze 10 minutes"
              >
                <Bell className="w-4 h-4" />
              </button>

              <button
                onClick={handleDuplicate}
                className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Duplicate task"
              >
                <Copy className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={handleFocus}
            className={`p-1.5 rounded transition-colors ${
              isFocused
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={isFocused ? 'Remove focus' : 'Set as focus task'}
          >
            <Target className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Edit task"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

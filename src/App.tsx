import { useEffect, useState } from 'react';
import { Plus, Target, Settings as SettingsIcon, BarChart3, Trophy, Calendar, Brain } from 'lucide-react';
import { db } from './lib/db';
import { useStore } from './store/useStore';
import TaskList from './components/TaskList';
import TaskInput from './components/TaskInput';
import FocusIndicator from './components/FocusIndicator';
import Settings from './components/Settings';
import SmartPause from './components/SmartPause';
import Analytics from './components/Analytics';
import Gamification from './components/Gamification';
import CalendarComponent from './components/Calendar';
import DeepWorkMode from './components/DeepWorkMode';
import KeyboardNavigation from './components/KeyboardNavigation';
import { initializeGamification } from './lib/gamification';
import { initializeDeepWorkMode } from './lib/deepWorkMode';
import { initializeVisualFeedback, showSuccessFeedback, showErrorFeedback } from './lib/visualFeedback';
import { initializePerformanceOptimizations, performanceMonitor, scheduleRender } from './lib/performance';
import {
  getTodayTasks,
  getOverdueTasks,
  getUpcomingTasks,
  sortTasksByPriority
} from './lib/smartQueue';
import { KeyboardAction } from './lib/keyboardNavigation';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showGamification, setShowGamification] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDeepWorkMode, setShowDeepWorkMode] = useState(false);
  const [filter, setFilter] = useState<'today' | 'week' | 'overdue'>('today');
  const [isPaused, setIsPaused] = useState(false);
  const { tasks, setTasks, focusedTask } = useStore();

  // Handle keyboard actions
  const handleKeyboardAction = (action: KeyboardAction) => {
    switch (action) {
      case 'new_task':
        // Focus the task input
        const taskInput = document.querySelector('#task-input input') as HTMLElement;
        if (taskInput) taskInput.focus();
        break;
        
      case 'toggle_focus':
        // Toggle focus mode
        if (focusedTask) {
          chrome.storage.local.set({ focusedTask: null });
        } else if (tasks.length > 0) {
          chrome.storage.local.set({ focusedTask: tasks[0] });
        }
        break;
        
      case 'toggle_pause':
        // Toggle pause
        setIsPaused(!isPaused);
        chrome.storage.local.set({ settings: { isPaused: !isPaused } });
        break;
        
      case 'open_settings':
        setShowSettings(true);
        break;
        
      case 'open_analytics':
        setShowAnalytics(true);
        break;
        
      case 'open_gamification':
        setShowGamification(true);
        break;
        
      case 'open_calendar':
        setShowCalendar(true);
        break;
        
      case 'open_deep_work':
        setShowDeepWorkMode(true);
        break;
        
      case 'search':
        // Focus the search input
        const searchInput = document.querySelector('#search-input') as HTMLElement;
        if (searchInput) searchInput.focus();
        break;
        
      case 'escape':
        // Close any open modals/panels
        setShowSettings(false);
        setShowAnalytics(false);
        setShowGamification(false);
        setShowCalendar(false);
        setShowDeepWorkMode(false);
        break;
        
      case 'complete_task':
        // Complete the focused task
        const focusedTaskElement = document.querySelector('.task-item-focused') as HTMLElement;
        if (focusedTaskElement) {
          const taskId = focusedTaskElement.getAttribute('data-task-id');
          if (taskId) {
            db.tasks.update(parseInt(taskId), { isCompleted: true, completedAt: new Date() });
            loadTasks();
            showSuccessFeedback('Task completed!');
          }
        }
        break;
        
      case 'delete_task':
        // Delete the focused task
        const focusedTaskElement2 = document.querySelector('.task-item-focused') as HTMLElement;
        if (focusedTaskElement2) {
          const taskId = focusedTaskElement2.getAttribute('data-task-id');
          if (taskId) {
            db.tasks.delete(parseInt(taskId));
            loadTasks();
            showSuccessFeedback('Task deleted');
          }
        }
        break;
        
      case 'edit_task':
        // Edit the focused task
        const focusedTaskElement3 = document.querySelector('.task-item-focused') as HTMLElement;
        if (focusedTaskElement3) {
          const taskId = focusedTaskElement3.getAttribute('data-task-id');
          if (taskId) {
            // Find the task and focus its edit input
            const taskEditInput = document.querySelector(`[data-task-id="${taskId}"] .task-edit-input`) as HTMLElement;
            if (taskEditInput) taskEditInput.focus();
          }
        }
        break;
    }
  };

  useEffect(() => {
    loadTasks();

    const interval = setInterval(loadTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    const allTasks = await db.tasks
      .where('isCompleted')
      .equals(0)
      .toArray();
    
    // Sort by order field (if available) or by createdAt for backward compatibility
    const sortedTasks = allTasks.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    setTasks(sortedTasks);
  };

  const getFilteredTasks = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    switch (filter) {
      case 'today':
        return tasks.filter(task => {
          if (!task.startTime) return true;
          const taskDate = new Date(task.startTime);
          return taskDate >= today && taskDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        });
      case 'week':
        return tasks.filter(task => {
          if (!task.startTime) return true;
          const taskDate = new Date(task.startTime);
          return taskDate >= today && taskDate < weekFromNow;
        });
      case 'overdue':
        return tasks.filter(task => {
          if (!task.startTime) return false;
          return new Date(task.startTime) < now;
        });
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  if (showSettings) {
    return <Settings onClose={() => setShowSettings(false)} />;
  }

  if (showAnalytics) {
    return (
      <div className="h-screen w-full bg-white dark:bg-gray-900 flex flex-col">
        <div className="flex-shrink-0 bg-indigo-600 dark:bg-indigo-800 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnalytics(false)}
                className="p-1.5 rounded hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold">Analytics</h1>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Analytics />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex-shrink-0 bg-indigo-600 dark:bg-indigo-800 text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6" />
            <h1 className="text-xl font-bold">EdgeTask</h1>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-indigo-700 dark:hover:bg-indigo-900 rounded-lg transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>

        {focusedTask && <FocusIndicator task={focusedTask} />}
      </div>

      {focusedTask && (
        <div className="flex-shrink-0 px-4 pt-0">
          <SmartPause onToggle={setIsPaused} />
        </div>
      )}

      <div className="flex-shrink-0 px-4 pt-4">
        <TaskInput onTaskAdded={loadTasks} />
      </div>

      <div className="flex-shrink-0 flex gap-2 px-4 py-3 border-b dark:border-gray-700">
        <button
          onClick={() => setFilter('today')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            filter === 'today'
              ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setFilter('week')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            filter === 'week'
              ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            filter === 'overdue'
              ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Overdue
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <TaskList tasks={filteredTasks} onTasksChange={loadTasks} />
      </div>

      <div className="flex-shrink-0 p-4 border-t dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Ctrl+Shift+E</kbd> to toggle panel
      </div>
    </div>
  );
}

export default App;

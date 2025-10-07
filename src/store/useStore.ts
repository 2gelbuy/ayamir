import { create } from 'zustand';
import { Task, Settings } from '../lib/db';

interface AppState {
  tasks: Task[];
  settings: Settings | null;
  focusedTask: Task | null;
  isPanelOpen: boolean;
  isTickerVisible: boolean;

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: number, updates: Partial<Task>) => void;
  deleteTask: (id: number) => void;
  setSettings: (settings: Settings) => void;
  setFocusedTask: (task: Task | null) => void;
  togglePanel: () => void;
  setTickerVisible: (visible: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  tasks: [],
  settings: null,
  focusedTask: null,
  isPanelOpen: false,
  isTickerVisible: false,

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ),
    focusedTask: state.focusedTask?.id === id
      ? { ...state.focusedTask, ...updates }
      : state.focusedTask
  })),

  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter(task => task.id !== id),
    focusedTask: state.focusedTask?.id === id ? null : state.focusedTask
  })),

  setSettings: (settings) => set({ settings }),

  setFocusedTask: (task) => set({ focusedTask: task }),

  togglePanel: () => set((state) => ({
    isPanelOpen: !state.isPanelOpen
  })),

  setTickerVisible: (visible) => set({ isTickerVisible: visible })
}));

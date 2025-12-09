import Dexie, { Table } from 'dexie';

export interface Task {
  id?: number;
  title: string;
  startTime: Date | null;
  isFocused: boolean;
  isCompleted: boolean;
  createdAt: Date;
  completedAt?: Date;
  snoozedUntil?: Date;
  notifiedAt10?: boolean;
  notifiedAt5?: boolean;
  notifiedAt0?: boolean;
  order?: number;
  points?: number; // Points earned for completing this task
  completedOnTime?: boolean; // Whether the task was completed on time
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration?: number; // in minutes
  tags?: string[];
  dueDate?: Date;
  calendarEventId?: string; // ID of the corresponding Google Calendar event
}

export interface Settings {
  id?: number;
  humorTone: 'polite' | 'default' | 'sarcastic';
  nudgeMode: 'soft' | 'hard';
  soundEnabled: boolean;
  volume: number;
  blacklist: string[];
  whitelist: string[];
  isPaused?: boolean;
  pauseEndTime?: Date | null;
  gamificationEnabled?: boolean;
  streakCount?: number;
  totalPoints?: number;
  level?: number;
  achievements?: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    unlocked: boolean;
    unlockedAt?: Date;
  }>;
  lastActivityDate?: Date;
  deepWorkModeEnabled?: boolean;
  deepWorkModeDuration?: number;
  deepWorkModeBreakDuration?: number;
  deepWorkModeBlockNotifications?: boolean;
  deepWorkModeBlockSites?: boolean;
  deepWorkModeShowTimer?: boolean;
  deepWorkModeAutoStart?: boolean;
  syncEnabled?: boolean;
}

export class EdgeTaskDB extends Dexie {
  tasks!: Table<Task, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super('EdgeTaskDB');
    this.version(1).stores({
      tasks: '++id, title, startTime, isFocused, isCompleted, createdAt',
      settings: '++id'
    });
    
    this.version(2).stores({
      tasks: '++id, title, startTime, isFocused, isCompleted, createdAt, order',
      settings: '++id'
    });
    
    this.version(3).stores({
      tasks: '++id, title, startTime, isFocused, isCompleted, createdAt, order, points, completedOnTime',
      settings: '++id, humorTone, nudgeMode, blacklist, whitelist, soundEnabled, volume, gamificationEnabled, streakCount, totalPoints, level, achievements, lastActivityDate'
    });
    
    this.version(4).stores({
      tasks: '++id, title, startTime, isFocused, isCompleted, createdAt, order, points, completedOnTime, priority, estimatedDuration, tags, dueDate',
      settings: '++id, humorTone, nudgeMode, blacklist, whitelist, soundEnabled, volume, gamificationEnabled, streakCount, totalPoints, level, achievements, lastActivityDate'
    });
    
    this.version(5).stores({
      tasks: '++id, title, startTime, isFocused, isCompleted, createdAt, order, points, completedOnTime, priority, estimatedDuration, tags, dueDate, calendarEventId',
      settings: '++id, humorTone, nudgeMode, blacklist, whitelist, soundEnabled, volume, gamificationEnabled, streakCount, totalPoints, level, achievements, lastActivityDate'
    });
    
    this.version(6).stores({
      tasks: '++id, title, startTime, isFocused, isCompleted, createdAt, order, points, completedOnTime, priority, estimatedDuration, tags, dueDate, calendarEventId',
      settings: '++id, humorTone, nudgeMode, blacklist, whitelist, soundEnabled, volume, gamificationEnabled, streakCount, totalPoints, level, achievements, lastActivityDate, deepWorkModeEnabled, deepWorkModeDuration, deepWorkModeBreakDuration, deepWorkModeBlockNotifications, deepWorkModeBlockSites, deepWorkModeShowTimer, deepWorkModeAutoStart'
    });
  }
}

export const db = new EdgeTaskDB();

export const getSettings = async (): Promise<Settings> => {
  const settings = await db.settings.toArray();
  if (settings.length === 0) {
    const defaultSettings: Settings = {
      humorTone: 'default',
      nudgeMode: 'soft',
      soundEnabled: true,
      volume: 50,
      blacklist: ['youtube.com', 'reddit.com', 'twitter.com', 'facebook.com', 'instagram.com'],
      whitelist: [],
      isPaused: false,
      pauseEndTime: null,
      gamificationEnabled: true,
      streakCount: 0,
      totalPoints: 0,
      level: 1,
      achievements: [],
      lastActivityDate: undefined,
      deepWorkModeEnabled: false,
      deepWorkModeDuration: 25,
      deepWorkModeBreakDuration: 5,
      deepWorkModeBlockNotifications: true,
      deepWorkModeBlockSites: true,
      deepWorkModeShowTimer: true,
      deepWorkModeAutoStart: false
    };
    await db.settings.add(defaultSettings);
    return defaultSettings;
  }
  return settings[0];
};

export const updateSettings = async (settings: Partial<Settings>) => {
  const current = await getSettings();
  if (current.id) {
    await db.settings.update(current.id, settings);
  }
};

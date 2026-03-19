import Dexie, { Table } from 'dexie';
import { storage } from 'wxt/storage';

export interface Task {
    id?: number;
    title: string;
    startTime: Date | null;
    isCompleted: boolean;
    createdAt: Date;
    completedAt?: Date;
    notifiedAt10?: boolean;
    notifiedAt5?: boolean;
    notifiedAt0?: boolean;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: Date | null;
    estimatedDuration?: number | null; // in minutes
    tags?: string[];
    points?: number;
    completedOnTime?: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface Settings {
    blacklist: string[];
    whitelist: string[];
    focusEnabled: boolean;
    notificationsEnabled: boolean;
    gamificationEnabled: boolean;
    totalPoints: number;
    level: number;
    streakCount: number;
    achievements: Achievement[];
    lastActivityDate?: Date;
    deepWorkModeDuration: number;
    deepWorkModeBreakDuration: number;
    isDeepWorkActive?: boolean;
    deepWorkEndTime?: number | null;
}

class AyaMirDB extends Dexie {
    tasks!: Table<Task>;

    constructor() {
        super('ayamir');
        this.version(2).stores({
            tasks: '++id, title, startTime, isCompleted, createdAt'
        });
    }
}

export const db = new AyaMirDB();

export const DEFAULT_SETTINGS: Settings = {
    blacklist: ['facebook.com', 'twitter.com', 'reddit.com', 'youtube.com'],
    whitelist: [],
    focusEnabled: true,
    notificationsEnabled: true,
    gamificationEnabled: true,
    totalPoints: 0,
    level: 1,
    streakCount: 0,
    achievements: [],
    deepWorkModeDuration: 25,
    deepWorkModeBreakDuration: 5
};

// Helper functions
export async function getSettings(): Promise<Settings> {
    const settings = await storage.getItem<Settings>('local:settings');
    if (!settings) {
        await storage.setItem('local:settings', DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
    }
    return settings;
}

export async function updateSettings(settings: Partial<Settings>): Promise<void> {
    const current = await getSettings();
    await storage.setItem('local:settings', { ...current, ...settings });
}
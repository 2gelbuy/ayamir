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
    url?: string; // saved page URL
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

export interface FocusSession {
  id?: number;
  startedAt: Date;
  endedAt?: Date;
  duration: number; // planned duration in minutes
  actualDuration?: number; // actual duration in minutes
  completed: boolean;
  type: 'work' | 'break';
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
    // New features
    theme: 'light' | 'dark' | 'system';
    onboardingCompleted: boolean;
    hardLockMode: boolean;
    ambientSound: 'none' | 'rain' | 'ocean' | 'lofi' | 'cafe' | 'fire' | 'wind';
    scheduledBlocking: {
        enabled: boolean;
        startHour: number;
        endHour: number;
        days: number[]; // 0=Sun, 1=Mon, ... 6=Sat
    };
    siteCategories: {
        social: string[];
        news: string[];
        entertainment: string[];
        shopping: string[];
    };
    dailyFocusGoal: string;
    dailyFocusDate: string; // ISO date string
    totalFocusMinutes: number;
    completedSessions: number;
}

class AyaMirDB extends Dexie {
    tasks!: Table<Task>;
    focusSessions!: Table<FocusSession>;

    constructor() {
        super('ayamir');
        this.version(2).stores({
            tasks: '++id, title, startTime, isCompleted, createdAt'
        });
        this.version(3).stores({
            tasks: '++id, title, startTime, isCompleted, createdAt, completedAt',
            focusSessions: '++id, startedAt, completed, type'
        });
    }
}

export const db = new AyaMirDB();

export const SITE_CATEGORIES = {
    social: ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com', 'snapchat.com', 'linkedin.com', 'pinterest.com', 'threads.net'],
    news: ['reddit.com', 'news.ycombinator.com', 'digg.com', 'buzzfeed.com', 'cnn.com', 'bbc.com', 'foxnews.com'],
    entertainment: ['youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com', 'disneyplus.com', 'primevideo.com', '9gag.com'],
    shopping: ['amazon.com', 'ebay.com', 'aliexpress.com', 'walmart.com', 'etsy.com', 'wish.com'],
};

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
    deepWorkModeBreakDuration: 5,
    // New defaults
    theme: 'system',
    onboardingCompleted: false,
    hardLockMode: false,
    ambientSound: 'none',
    scheduledBlocking: {
        enabled: false,
        startHour: 9,
        endHour: 17,
        days: [1, 2, 3, 4, 5], // Mon-Fri
    },
    siteCategories: {
        social: [],
        news: [],
        entertainment: [],
        shopping: [],
    },
    dailyFocusGoal: '',
    dailyFocusDate: '',
    totalFocusMinutes: 0,
    completedSessions: 0,
};

// ── Settings cache (avoids re-reading storage on every alarm tick) ──
let settingsCache: Settings | null = null;

// Listen for storage changes to invalidate cache
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['settings']) {
            settingsCache = null; // invalidate — next getSettings() will re-read
        }
    });
}

function mergeSettings(stored: Settings | null): Settings {
    if (!stored) return { ...DEFAULT_SETTINGS };
    return {
        ...DEFAULT_SETTINGS,
        ...stored,
        scheduledBlocking: { ...DEFAULT_SETTINGS.scheduledBlocking, ...stored.scheduledBlocking },
        siteCategories: { ...DEFAULT_SETTINGS.siteCategories, ...stored.siteCategories },
    };
}

export async function getSettings(): Promise<Settings> {
    if (settingsCache) return settingsCache;
    const stored = await storage.getItem<Settings>('local:settings');
    if (!stored) {
        await storage.setItem('local:settings', DEFAULT_SETTINGS);
        settingsCache = { ...DEFAULT_SETTINGS };
        return settingsCache;
    }
    settingsCache = mergeSettings(stored);
    return settingsCache;
}

export async function updateSettings(partial: Partial<Settings>): Promise<void> {
    const current = await getSettings();
    const updated = { ...current, ...partial };
    settingsCache = updated;
    await storage.setItem('local:settings', updated);
}

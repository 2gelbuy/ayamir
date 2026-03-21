import { useState, useEffect } from 'react';
import { X, CheckCircle, Flame, TrendingUp, Trophy, Star, Award, Clock } from 'lucide-react';
import { db, Settings, getSettings } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { LEVEL_THRESHOLDS, getUserLevel, getPointsToNextLevel, getLevelProgressPercent, DEFAULT_ACHIEVEMENTS } from '@/lib/gamification';

interface StatsProps {
    onClose: () => void;
}

export default function Stats({ onClose }: StatsProps) {
    const allTasks = useLiveQuery(() => db.tasks.toArray()) || [];
    const [settings, setSettings] = useState<Settings | null>(null);
    const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

    useEffect(() => {
        getSettings().then(setSettings);
        // Single query for weekly data instead of 7 separate queries
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(now);
        weekEnd.setHours(23, 59, 59, 999);

        db.tasks.filter(t =>
            !!t.isCompleted && !!t.completedAt &&
            new Date(t.completedAt) >= weekStart &&
            new Date(t.completedAt) <= weekEnd
        ).toArray().then(tasks => {
            const counts = [0, 0, 0, 0, 0, 0, 0];
            for (const t of tasks) {
                if (!t.completedAt) continue;
                const d = new Date(t.completedAt);
                const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
                const idx = 6 - Math.min(daysAgo, 6);
                if (idx >= 0 && idx < 7) counts[idx]++;
            }
            setWeeklyData(counts);
        });
    }, []);

    const completed = allTasks.filter(t => t.isCompleted);
    const totalTasks = allTasks.length;
    const completedTasks = completed.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = completed.filter(t => {
        if (!t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === today.getTime();
    }).length;

    const completionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    const currentLevel = getUserLevel(settings?.totalPoints ?? 0);
    const pointsToNextLevel = getPointsToNextLevel(settings?.totalPoints ?? 0);
    const progressPercentage = getLevelProgressPercent(settings?.totalPoints ?? 0);

    const achievements = settings?.achievements || DEFAULT_ACHIEVEMENTS;
    const unlockedAchievements = achievements.filter(a => a.unlocked);
    const streakDays = settings?.streakCount ?? 0;

    const maxWeekly = Math.max(...weeklyData, 1);
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const todayIdx = new Date().getDay();
    // Shift so today is last
    const orderedLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
        const idx = (todayIdx - i + 7) % 7;
        orderedLabels.push(dayLabels[idx === 0 ? 6 : idx - 1]);
    }

    return (
        <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col z-50 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{chrome.i18n.getMessage("statsHeader")}</h2>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 slim-scrollbar">

                {/* Level Card */}
                {settings?.gamificationEnabled && (
                    <div className="bg-gradient-to-br from-teal-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg shadow-teal-500/20">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                                <h3 className="text-base font-bold">{chrome.i18n.getMessage("statsLevel")} {currentLevel.level}</h3>
                            </div>
                            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-lg uppercase tracking-wider backdrop-blur-sm">
                                {currentLevel.title}
                            </span>
                        </div>

                        <div className="mb-1">
                            <div className="flex justify-between text-[11px] font-medium mb-1.5 opacity-80">
                                <span>{settings.totalPoints} XP</span>
                                {currentLevel.level < 10 && (
                                    <span>{pointsToNextLevel} to next</span>
                                )}
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                                <div
                                    className="bg-gradient-to-r from-yellow-300 to-yellow-500 h-full rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Weekly Activity Chart */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{chrome.i18n.getMessage('thisWeekLabel') || 'This Week'}</h3>
                    <div className="flex items-end justify-between gap-1 h-20">
                        {weeklyData.map((count, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex justify-center">
                                    <div
                                        className={`w-full max-w-[24px] rounded-t-lg transition-all duration-500 ${
                                            i === 6 ? 'bg-teal-500' : count > 0 ? 'bg-teal-200 dark:bg-teal-700' : 'bg-slate-100 dark:bg-slate-700'
                                        }`}
                                        style={{ height: `${Math.max(4, (count / maxWeekly) * 64)}px` }}
                                    />
                                </div>
                                <span className={`text-[9px] font-bold ${
                                    i === 6 ? 'text-teal-500' : 'text-slate-400 dark:text-slate-500'
                                }`}>{orderedLabels[i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{completedToday}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{chrome.i18n.getMessage("statsDoneToday")}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                        <Flame className={`w-5 h-5 mx-auto mb-1 ${streakDays > 0 ? 'text-orange-500 fill-orange-500' : 'text-slate-300 dark:text-slate-600'}`} />
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{streakDays}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{chrome.i18n.getMessage("statsDayStreak")}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                        <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{completionRate}%</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{chrome.i18n.getMessage('completionLabel') || 'Completion'}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                        <Clock className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{Math.round((settings?.totalFocusMinutes || 0) / 60 * 10) / 10}h</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{chrome.i18n.getMessage('focusTimeLabel') || 'Focus Time'}</p>
                    </div>
                </div>

                {/* Achievements */}
                {settings?.gamificationEnabled && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{chrome.i18n.getMessage("statsAchievements")}</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                {unlockedAchievements.length}/{achievements.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {achievements.map(achievement => (
                                <div
                                    key={achievement.id}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                                        achievement.unlocked
                                            ? 'bg-yellow-50 dark:bg-yellow-900/20'
                                            : 'opacity-40 grayscale'
                                    }`}
                                    title={`${achievement.name}: ${achievement.description}`}
                                >
                                    <span className="text-2xl">{achievement.icon}</span>
                                    <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 text-center leading-tight truncate w-full">
                                        {achievement.name}
                                    </span>
                                    {achievement.unlocked && (
                                        <span className="text-[8px] font-bold text-yellow-600 dark:text-yellow-400">+{achievement.points}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

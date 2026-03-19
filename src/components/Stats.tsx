import { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, Flame, TrendingUp, Trophy, Star, Award, Zap } from 'lucide-react';
import { db, Task, Settings, getSettings } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { LEVEL_THRESHOLDS, getUserLevel, getPointsToNextLevel, DEFAULT_ACHIEVEMENTS, calculateStreak } from '@/lib/gamification';

interface StatsProps {
    onClose: () => void;
}

export default function Stats({ onClose }: StatsProps) {
    const allTasks = useLiveQuery(() => db.tasks.toArray()) || [];
    const [settings, setSettings] = useState<Settings | null>(null);

    useEffect(() => {
        getSettings().then(setSettings);
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
    const progressPercentage = currentLevel.level < 10
        ? (((settings?.totalPoints ?? 0) - currentLevel.pointsRequired) /
            (LEVEL_THRESHOLDS[currentLevel.level].pointsRequired - currentLevel.pointsRequired)) * 100
        : 100;

    const achievements = settings?.achievements || DEFAULT_ACHIEVEMENTS;
    const unlockedAchievements = achievements.filter(a => a.unlocked);
    const streakDays = settings?.streakCount ?? 0;

    return (
        <div className="absolute inset-0 bg-gray-50 flex flex-col z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
                <h2 className="text-lg font-bold text-gray-900">{chrome.i18n.getMessage("statsHeader")}</h2>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Gamification Level Card */}
                {settings?.gamificationEnabled && (
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                                <h3 className="text-lg font-bold">{chrome.i18n.getMessage("statsLevel")} {currentLevel.level}</h3>
                            </div>
                            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded uppercase tracking-wider">
                                {currentLevel.title}
                            </span>
                        </div>

                        <div className="mb-1">
                            <div className="flex justify-between text-xs font-medium mb-1.5 opacity-90">
                                <span>{settings.totalPoints} XP</span>
                                {currentLevel.level < 10 && (
                                    <span>{pointsToNextLevel} to next</span>
                                )}
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden backdrop-blur-sm">
                                <div
                                    className="bg-gradient-to-r from-yellow-300 to-yellow-500 h-full rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                        <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-gray-900">{completedToday}</p>
                        <p className="text-xs text-gray-500 font-medium">{chrome.i18n.getMessage("statsDoneToday")}</p>
                    </div>

                    <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                        <Flame className={`w-6 h-6 mx-auto mb-1 ${streakDays > 0 ? 'text-orange-500 fill-orange-500' : 'text-gray-300'}`} />
                        <p className="text-2xl font-bold text-gray-900">{streakDays}</p>
                        <p className="text-xs text-gray-500 font-medium">{chrome.i18n.getMessage("statsDayStreak")}</p>
                    </div>

                    <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                        <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
                        <p className="text-xs text-gray-500 font-medium">{chrome.i18n.getMessage("statsTotalDone")}</p>
                    </div>

                    <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                        <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-gray-900">{unlockedAchievements.length}</p>
                        <p className="text-xs text-gray-500 font-medium">{chrome.i18n.getMessage("statsAchievements")}</p>
                    </div>
                </div>

                {/* Achievements List */}
                {settings?.gamificationEnabled && (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Award className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-gray-900">{chrome.i18n.getMessage("statsAchievements")}</h3>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {achievements.map(achievement => (
                                <div
                                    key={achievement.id}
                                    className={`p-3 rounded-lg border transition-all ${
                                        achievement.unlocked
                                            ? 'bg-yellow-50/50 border-yellow-200'
                                            : 'bg-gray-50 border-gray-100 opacity-60 grayscale'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl leading-none mt-0.5">{achievement.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900">{achievement.name}</p>
                                            <p className="text-xs text-gray-500 leading-tight mt-0.5">{achievement.description}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">+{achievement.points}</span>
                                            {achievement.unlocked && <CheckCircle className="w-4 h-4 text-green-500" />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
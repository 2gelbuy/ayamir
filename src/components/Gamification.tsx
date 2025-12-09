import { useState, useEffect } from 'react';
import { Trophy, Flame, Star, Target, Award, TrendingUp, Zap } from 'lucide-react';
import {
  LEVEL_THRESHOLDS,
  getUserLevel,
  getPointsToNextLevel,
  Achievement,
  DEFAULT_ACHIEVEMENTS
} from '../lib/gamification';
import { db, Settings } from '../lib/db';

export default function Gamification() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [newUnlocks, setNewUnlocks] = useState<Achievement[]>([]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await db.settings.toCollection().first();
        setSettings(s ?? null);

        // Check for newly unlocked achievements
        if (s && s.achievements) {
          const newlyUnlocked = s.achievements.filter(
            a => a.unlocked && a.unlockedAt &&
              (new Date().getTime() - new Date(a.unlockedAt).getTime()) < 5000 // Unlocked in last 5 seconds
          );
          setNewUnlocks(newlyUnlocked);

          // Clear new unlocks after 10 seconds
          if (newlyUnlocked.length > 0) {
            setTimeout(() => setNewUnlocks([]), 10000);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const currentLevel = getUserLevel(settings.totalPoints ?? 0);
  const pointsToNextLevel = getPointsToNextLevel(settings.totalPoints ?? 0);
  const progressPercentage = currentLevel.level < 10
    ? (((settings.totalPoints ?? 0) - currentLevel.pointsRequired) /
      (LEVEL_THRESHOLDS[currentLevel.level].pointsRequired - currentLevel.pointsRequired)) * 100
    : 100;

  const achievements = settings.achievements || DEFAULT_ACHIEVEMENTS;
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const totalAchievementPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0);

  return (
    <div className="space-y-4">
      {/* New Achievement Notifications */}
      {newUnlocks.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-6 h-6" />
            <h3 className="text-lg font-bold">Achievement Unlocked!</h3>
          </div>
          {newUnlocks.map(achievement => (
            <div key={achievement.id} className="flex items-center gap-3">
              <span className="text-2xl">{achievement.icon}</span>
              <div>
                <p className="font-medium">{achievement.name}</p>
                <p className="text-sm opacity-90">{achievement.description}</p>
                <p className="text-xs opacity-75">+{achievement.points} points</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Level and Points */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            <h3 className="text-lg font-bold">Level {currentLevel.level}</h3>
          </div>
          <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded">
            {currentLevel.title}
          </span>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span>{settings.totalPoints} points</span>
            {currentLevel.level < 10 && (
              <span>{pointsToNextLevel} points to next level</span>
            )}
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Current Streak
            </h3>
          </div>
          <span className="text-2xl font-bold text-orange-500">
            {settings.streakCount ?? 0}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Complete at least one task every day to maintain your streak!
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Achievements</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {unlockedAchievements.length}/{achievements.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {totalAchievementPoints} points
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Total Points</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {settings.totalPoints}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            All time
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Achievements
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {achievements.map(achievement => (
            <div
              key={achievement.id}
              className={`p-3 rounded-lg border ${achievement.unlocked
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 opacity-60'
                }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{achievement.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {achievement.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    +{achievement.points} points
                  </p>
                </div>
                {achievement.unlocked && (
                  <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {achievement.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Motivational Message */}
      <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white p-4 rounded-lg">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-5 h-5 mt-0.5" />
          <div>
            <p className="text-sm font-medium">
              {(settings.streakCount ?? 0) === 0
                ? "Start your productivity journey today!"
                : (settings.streakCount ?? 0) < 3
                  ? "You're building momentum! Keep it up!"
                  : (settings.streakCount ?? 0) < 7
                    ? "You're on fire! Maintain that streak!"
                    : (settings.streakCount ?? 0) < 30
                      ? "Incredible consistency! You're a productivity master!"
                      : "Legendary! Your dedication is truly inspiring!"}
            </p>
            <p className="text-xs mt-1 opacity-90">
              {currentLevel.level < 10
                ? `You need ${pointsToNextLevel} more points to reach level ${currentLevel.level + 1}.`
                : "You've reached the highest level! You're a true productivity master."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
import { Task, db, getSettings, updateSettings, Achievement } from './db';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const t = (key: string, fallback: string) => chrome.i18n.getMessage(key) || fallback;

// Static data (no i18n at module level)
const LEVEL_DATA = [
  { level: 1, pointsRequired: 0, key: 'levelBeginner', fallback: 'Beginner' },
  { level: 2, pointsRequired: 50, key: 'levelNovice', fallback: 'Novice' },
  { level: 3, pointsRequired: 150, key: 'levelApprentice', fallback: 'Apprentice' },
  { level: 4, pointsRequired: 300, key: 'levelJourneyman', fallback: 'Journeyman' },
  { level: 5, pointsRequired: 500, key: 'levelExpert', fallback: 'Expert' },
  { level: 6, pointsRequired: 750, key: 'levelMaster', fallback: 'Master' },
  { level: 7, pointsRequired: 1000, key: 'levelGrandmaster', fallback: 'Grandmaster' },
  { level: 8, pointsRequired: 1500, key: 'levelLegend', fallback: 'Legend' },
  { level: 9, pointsRequired: 2000, key: 'levelMythic', fallback: 'Mythic' },
  { level: 10, pointsRequired: 3000, key: 'levelTranscendent', fallback: 'Transcendent' },
] as const;

// Lazy getter — resolves i18n at call time, not module parse time
export const LEVEL_THRESHOLDS = LEVEL_DATA.map(({ level, pointsRequired, key, fallback }) => ({
  level,
  pointsRequired,
  get title() { return t(key, fallback); },
}));

const ACHIEVEMENT_DATA: Array<{ id: string; nameKey: string; nameFallback: string; descKey: string; descFallback: string; icon: string; points: number }> = [
  { id: 'first-task', nameKey: 'achvFirstTaskName', nameFallback: 'First Steps', descKey: 'achvFirstTaskDesc', descFallback: 'Complete your first task', icon: '\u{1F3AF}', points: 10 },
  { id: 'streak-3', nameKey: 'achvStreak3Name', nameFallback: 'On Fire', descKey: 'achvStreak3Desc', descFallback: 'Maintain a 3-day streak', icon: '\u{1F525}', points: 25 },
  { id: 'streak-7', nameKey: 'achvStreak7Name', nameFallback: 'Unstoppable', descKey: 'achvStreak7Desc', descFallback: 'Maintain a 7-day streak', icon: '\u{1F4AA}', points: 50 },
  { id: 'streak-30', nameKey: 'achvStreak30Name', nameFallback: 'Legendary', descKey: 'achvStreak30Desc', descFallback: 'Maintain a 30-day streak', icon: '\u{1F3C6}', points: 200 },
  { id: 'early-bird', nameKey: 'achvEarlyBirdName', nameFallback: 'Early Bird', descKey: 'achvEarlyBirdDesc', descFallback: 'Complete a task before 9 AM', icon: '\u{1F305}', points: 15 },
  { id: 'night-owl', nameKey: 'achvNightOwlName', nameFallback: 'Night Owl', descKey: 'achvNightOwlDesc', descFallback: 'Complete a task after 10 PM', icon: '\u{1F989}', points: 15 },
  { id: 'speed-demon', nameKey: 'achvSpeedDemonName', nameFallback: 'Speed Demon', descKey: 'achvSpeedDemonDesc', descFallback: 'Complete a task within 10 minutes of starting', icon: '\u{26A1}', points: 20 },
  { id: 'perfect-timing', nameKey: 'achvPerfectTimingName', nameFallback: 'Perfect Timing', descKey: 'achvPerfectTimingDesc', descFallback: 'Complete a task exactly at the scheduled time', icon: '\u{23F0}', points: 30 },
];

// Lazy getter — resolves i18n at call time
export const DEFAULT_ACHIEVEMENTS: Achievement[] = ACHIEVEMENT_DATA.map(a => ({
  id: a.id,
  get name() { return t(a.nameKey, a.nameFallback); },
  get description() { return t(a.descKey, a.descFallback); },
  icon: a.icon,
  points: a.points,
  unlocked: false,
}));

// Calculate points for a task based on various factors
export const calculateTaskPoints = (task: Task): number => {
  let points = 10; // Base points for completing any task

  // Bonus points for completing on time
  if (task.completedOnTime) {
    points += 5;
  }

  // Bonus points for completing quickly (within 30 minutes of start time)
  if (task.startTime && task.completedAt) {
    const startTime = new Date(task.startTime);
    const completedTime = new Date(task.completedAt);
    const diffMinutes = (completedTime.getTime() - startTime.getTime()) / 60000;

    if (diffMinutes <= 10) {
      points += 10; // Speed bonus
    } else if (diffMinutes <= 30) {
      points += 5; // Quick completion bonus
    }
  }

  // Bonus points for completing tasks during off-hours
  if (task.completedAt) {
    const hour = new Date(task.completedAt).getHours();
    if (hour < 9) {
      points += 5; // Early bird bonus
    } else if (hour >= 22) {
      points += 5; // Night owl bonus
    }
  }

  return points;
};

// Get current user level based on total points
export const getUserLevel = (totalPoints: number): typeof LEVEL_THRESHOLDS[0] => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVEL_THRESHOLDS[i].pointsRequired) {
      return LEVEL_THRESHOLDS[i];
    }
  }
  return LEVEL_THRESHOLDS[0];
};

// Get progress percentage toward next level (0-100)
export const getLevelProgressPercent = (totalPoints: number): number => {
  const currentLevel = getUserLevel(totalPoints);
  if (currentLevel.level >= LEVEL_THRESHOLDS.length) return 100;
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel.level]?.pointsRequired;
  if (!nextThreshold) return 100;
  return ((totalPoints - currentLevel.pointsRequired) / (nextThreshold - currentLevel.pointsRequired)) * 100;
};

// Get points needed to reach next level
export const getPointsToNextLevel = (totalPoints: number): number => {
  const currentLevel = getUserLevel(totalPoints);
  const nextLevelIndex = currentLevel.level < LEVEL_THRESHOLDS.length
    ? currentLevel.level
    : LEVEL_THRESHOLDS.length - 1;

  if (nextLevelIndex >= LEVEL_THRESHOLDS.length - 1) {
    return 0; // Already at max level
  }

  const nextLevel = LEVEL_THRESHOLDS[nextLevelIndex + 1];
  return nextLevel.pointsRequired - totalPoints;
};

// Calculate current streak — single query, no N+1
export const calculateStreak = async (): Promise<number> => {
  const today = startOfDay(new Date());
  // Fetch all completed tasks from last 90 days max (reasonable streak cap)
  const lookback = subDays(today, 90);
  const completedTasks = await db.tasks
    .where('completedAt')
    .between(lookback, endOfDay(today))
    .toArray();

  if (completedTasks.length === 0) return 0;

  // Build a set of date strings that have completions
  const daysWithCompletions = new Set<string>();
  for (const task of completedTasks) {
    if (task.completedAt) {
      daysWithCompletions.add(startOfDay(new Date(task.completedAt)).toISOString());
    }
  }

  // Count consecutive days backward from today (or yesterday if no tasks today)
  let currentDate = today;
  if (!daysWithCompletions.has(currentDate.toISOString())) {
    currentDate = subDays(today, 1);
  }

  let streak = 0;
  while (daysWithCompletions.has(startOfDay(currentDate).toISOString())) {
    streak++;
    currentDate = subDays(currentDate, 1);
  }

  return streak;
};

// Check and unlock achievements
export const checkAchievements = async (
  achievements: Achievement[],
  totalPoints: number,
  streak: number,
  tasksCompletedToday: number
): Promise<Achievement[]> => {
  const updatedAchievements = [...achievements];

  const unlock = (id: string) => {
    const ach = updatedAchievements.find(a => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      ach.unlockedAt = new Date();
    }
  };

  if (totalPoints >= 10) unlock('first-task');
  if (streak >= 3) unlock('streak-3');
  if (streak >= 7) unlock('streak-7');
  if (streak >= 30) unlock('streak-30');
  // task-marathon removed — no matching achievement definition

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const todayTasks = await db.tasks.where('completedAt').between(todayStart, todayEnd).toArray();

  const earlyMorningTasks = todayTasks.filter(task => task.completedAt && new Date(task.completedAt).getHours() < 9);
  if (earlyMorningTasks.length > 0) unlock('early-bird');

  const nightTasks = todayTasks.filter(task => task.completedAt && new Date(task.completedAt).getHours() >= 22);
  if (nightTasks.length > 0) unlock('night-owl');

  const speedTasks = todayTasks.filter(task => {
    if (!task.startTime || !task.completedAt) return false;
    const diffMinutes = (new Date(task.completedAt).getTime() - new Date(task.startTime).getTime()) / 60000;
    return diffMinutes <= 10;
  });
  if (speedTasks.length > 0) unlock('speed-demon');

  // Perfect timing: completed within 2 minutes of scheduled start time
  const perfectTimingTasks = todayTasks.filter(task => {
    if (!task.startTime || !task.completedAt) return false;
    const scheduled = new Date(task.startTime).getTime();
    const completed = new Date(task.completedAt).getTime();
    return Math.abs(completed - scheduled) <= 2 * 60000;
  });
  if (perfectTimingTasks.length > 0) unlock('perfect-timing');

  return updatedAchievements;
};

// Update user stats when a task is completed
export const updateStatsOnTaskCompletion = async (task: Task): Promise<void> => {
  try {
    const settings = await getSettings();
    if (!settings.gamificationEnabled) return;

    const taskPoints = calculateTaskPoints(task);
    
    // Calculate if task was completed on time
    let completedOnTime = false;
    if (task.startTime && task.completedAt) {
      const startTime = new Date(task.startTime);
      const completedTime = new Date(task.completedAt);
      completedOnTime = completedTime <= new Date(startTime.getTime() + 5 * 60000); // Within 5 minutes
    }

    if (task.id) {
      await db.tasks.update(task.id, {
        points: taskPoints,
        completedOnTime
      });
    }

    const newTotalPoints = (settings.totalPoints || 0) + taskPoints;
    const newLevel = getUserLevel(newTotalPoints);
    const newStreak = await calculateStreak();

    const today = startOfDay(new Date());
    const tasksCompletedToday = await db.tasks.where('completedAt').between(today, endOfDay(today)).count();

    const currentAchievements = settings.achievements && settings.achievements.length > 0 
      ? settings.achievements 
      : DEFAULT_ACHIEVEMENTS;

    const updatedAchievements = await checkAchievements(
      currentAchievements,
      newTotalPoints,
      newStreak,
      tasksCompletedToday
    );

    // Filter to find newly unlocked ones for notification
    const newlyUnlocked = updatedAchievements.filter(ua => 
      ua.unlocked && !currentAchievements.find(ca => ca.id === ua.id)?.unlocked
    );

    await updateSettings({
      totalPoints: newTotalPoints,
      level: newLevel.level,
      streakCount: newStreak,
      achievements: updatedAchievements,
      lastActivityDate: new Date()
    });

    // Notify user about level up or achievements!
    if (newLevel.level > settings.level) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('/icon/128.png'),
        title: 'Level Up! 🎉',
        message: `Congratulations! You've reached Level ${newLevel.level}: ${newLevel.title}`,
        priority: 2
      });
    }

    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(ach => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('/icon/128.png'),
          title: 'Achievement Unlocked! 🏆',
          message: `${ach.icon} ${ach.name}: ${ach.description} (+${ach.points} pts)`,
          priority: 2
        });
      });
    }

  } catch (error) {
    console.error('Error updating stats on task completion:', error);
  }
};
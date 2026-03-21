import { Task, db, getSettings, updateSettings, Achievement } from './db';
import { startOfDay, endOfDay, subDays } from 'date-fns';

// Level thresholds (points required to reach each level)
export const LEVEL_THRESHOLDS = [
  { level: 1, pointsRequired: 0, title: chrome.i18n.getMessage('levelBeginner') || 'Beginner' },
  { level: 2, pointsRequired: 50, title: chrome.i18n.getMessage('levelNovice') || 'Novice' },
  { level: 3, pointsRequired: 150, title: chrome.i18n.getMessage('levelApprentice') || 'Apprentice' },
  { level: 4, pointsRequired: 300, title: chrome.i18n.getMessage('levelJourneyman') || 'Journeyman' },
  { level: 5, pointsRequired: 500, title: chrome.i18n.getMessage('levelExpert') || 'Expert' },
  { level: 6, pointsRequired: 750, title: chrome.i18n.getMessage('levelMaster') || 'Master' },
  { level: 7, pointsRequired: 1000, title: chrome.i18n.getMessage('levelGrandmaster') || 'Grandmaster' },
  { level: 8, pointsRequired: 1500, title: chrome.i18n.getMessage('levelLegend') || 'Legend' },
  { level: 9, pointsRequired: 2000, title: chrome.i18n.getMessage('levelMythic') || 'Mythic' },
  { level: 10, pointsRequired: 3000, title: chrome.i18n.getMessage('levelTranscendent') || 'Transcendent' }
];

// Default achievements
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-task',
    name: chrome.i18n.getMessage('achvFirstTaskName') || 'First Steps',
    description: chrome.i18n.getMessage('achvFirstTaskDesc') || 'Complete your first task',
    icon: '🎯',
    points: 10,
    unlocked: false
  },
  {
    id: 'streak-3',
    name: chrome.i18n.getMessage('achvStreak3Name') || 'On Fire',
    description: chrome.i18n.getMessage('achvStreak3Desc') || 'Maintain a 3-day streak',
    icon: '🔥',
    points: 25,
    unlocked: false
  },
  {
    id: 'streak-7',
    name: chrome.i18n.getMessage('achvStreak7Name') || 'Unstoppable',
    description: chrome.i18n.getMessage('achvStreak7Desc') || 'Maintain a 7-day streak',
    icon: '💪',
    points: 50,
    unlocked: false
  },
  {
    id: 'streak-30',
    name: chrome.i18n.getMessage('achvStreak30Name') || 'Legendary',
    description: chrome.i18n.getMessage('achvStreak30Desc') || 'Maintain a 30-day streak',
    icon: '🏆',
    points: 200,
    unlocked: false
  },
  {
    id: 'early-bird',
    name: chrome.i18n.getMessage('achvEarlyBirdName') || 'Early Bird',
    description: chrome.i18n.getMessage('achvEarlyBirdDesc') || 'Complete a task before 9 AM',
    icon: '🌅',
    points: 15,
    unlocked: false
  },
  {
    id: 'night-owl',
    name: chrome.i18n.getMessage('achvNightOwlName') || 'Night Owl',
    description: chrome.i18n.getMessage('achvNightOwlDesc') || 'Complete a task after 10 PM',
    icon: '🦉',
    points: 15,
    unlocked: false
  },
  {
    id: 'speed-demon',
    name: chrome.i18n.getMessage('achvSpeedDemonName') || 'Speed Demon',
    description: chrome.i18n.getMessage('achvSpeedDemonDesc') || 'Complete a task within 10 minutes of starting',
    icon: '⚡',
    points: 20,
    unlocked: false
  },
  {
    id: 'perfect-timing',
    name: chrome.i18n.getMessage('achvPerfectTimingName') || 'Perfect Timing',
    description: chrome.i18n.getMessage('achvPerfectTimingDesc') || 'Complete a task exactly at the scheduled time',
    icon: '⏰',
    points: 30,
    unlocked: false
  }
];

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
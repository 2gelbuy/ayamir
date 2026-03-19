import { Task, db } from './db';
import { startOfDay, endOfDay, subDays } from 'date-fns';

// Achievement definitions
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

// Level thresholds (points required to reach each level)
export const LEVEL_THRESHOLDS = [
  { level: 1, pointsRequired: 0, title: 'Beginner' },
  { level: 2, pointsRequired: 50, title: 'Novice' },
  { level: 3, pointsRequired: 150, title: 'Apprentice' },
  { level: 4, pointsRequired: 300, title: 'Journeyman' },
  { level: 5, pointsRequired: 500, title: 'Expert' },
  { level: 6, pointsRequired: 750, title: 'Master' },
  { level: 7, pointsRequired: 1000, title: 'Grandmaster' },
  { level: 8, pointsRequired: 1500, title: 'Legend' },
  { level: 9, pointsRequired: 2000, title: 'Mythic' },
  { level: 10, pointsRequired: 3000, title: 'Transcendent' }
];

// Default achievements
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-task',
    name: 'First Steps',
    description: 'Complete your first task',
    icon: '🎯',
    points: 10,
    unlocked: false
  },
  {
    id: 'streak-3',
    name: 'On Fire',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    points: 25,
    unlocked: false
  },
  {
    id: 'streak-7',
    name: 'Unstoppable',
    description: 'Maintain a 7-day streak',
    icon: '💪',
    points: 50,
    unlocked: false
  },
  {
    id: 'streak-30',
    name: 'Legendary',
    description: 'Maintain a 30-day streak',
    icon: '🏆',
    points: 200,
    unlocked: false
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Complete a task before 9 AM',
    icon: '🌅',
    points: 15,
    unlocked: false
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Complete a task after 10 PM',
    icon: '🦉',
    points: 15,
    unlocked: false
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Complete a task within 10 minutes of starting',
    icon: '⚡',
    points: 20,
    unlocked: false
  },
  {
    id: 'perfect-timing',
    name: 'Perfect Timing',
    description: 'Complete a task exactly at the scheduled time',
    icon: '⏰',
    points: 30,
    unlocked: false
  },
  {
    id: 'task-marathon',
    name: 'Task Marathon',
    description: 'Complete 10 tasks in one day',
    icon: '🏃',
    points: 40,
    unlocked: false
  },
  {
    id: 'focused-week',
    name: 'Focused Week',
    description: 'Complete all scheduled tasks for a week',
    icon: '📅',
    points: 60,
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

// Calculate current streak
export const calculateStreak = async (): Promise<number> => {
  const today = startOfDay(new Date());
  let streak = 0;
  let currentDate = today;

  // Check if any tasks were completed today
  const todayTasks = await db.tasks
    .where('completedAt')
    .between(startOfDay(today), endOfDay(today))
    .toArray();

  if (todayTasks.length === 0) {
    // No tasks completed today, check yesterday
    currentDate = subDays(today, 1);
  }

  // Count consecutive days with completed tasks
  while (true) {
    const dayStart = startOfDay(currentDate);
    const dayEnd = endOfDay(currentDate);

    const tasksCompletedOnDay = await db.tasks
      .where('completedAt')
      .between(dayStart, dayEnd)
      .toArray();

    if (tasksCompletedOnDay.length > 0) {
      streak++;
      currentDate = subDays(currentDate, 1);
    } else {
      break;
    }
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

  // Check first task achievement
  if (totalPoints >= 10) {
    const firstTaskAchievement = updatedAchievements.find(a => a.id === 'first-task');
    if (firstTaskAchievement && !firstTaskAchievement.unlocked) {
      firstTaskAchievement.unlocked = true;
      firstTaskAchievement.unlockedAt = new Date();
    }
  }

  // Check streak achievements
  if (streak >= 3) {
    const streakAchievement = updatedAchievements.find(a => a.id === 'streak-3');
    if (streakAchievement && !streakAchievement.unlocked) {
      streakAchievement.unlocked = true;
      streakAchievement.unlockedAt = new Date();
    }
  }

  if (streak >= 7) {
    const streakAchievement = updatedAchievements.find(a => a.id === 'streak-7');
    if (streakAchievement && !streakAchievement.unlocked) {
      streakAchievement.unlocked = true;
      streakAchievement.unlockedAt = new Date();
    }
  }

  if (streak >= 30) {
    const streakAchievement = updatedAchievements.find(a => a.id === 'streak-30');
    if (streakAchievement && !streakAchievement.unlocked) {
      streakAchievement.unlocked = true;
      streakAchievement.unlockedAt = new Date();
    }
  }

  // Check task marathon achievement
  if (tasksCompletedToday >= 10) {
    const marathonAchievement = updatedAchievements.find(a => a.id === 'task-marathon');
    if (marathonAchievement && !marathonAchievement.unlocked) {
      marathonAchievement.unlocked = true;
      marathonAchievement.unlockedAt = new Date();
    }
  }

  // Check time-based achievements
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const todayTasks = await db.tasks
    .where('completedAt')
    .between(todayStart, todayEnd)
    .toArray();

  // Check early bird achievement
  const earlyMorningTasks = todayTasks.filter(task => {
    if (!task.completedAt) return false;
    const hour = new Date(task.completedAt).getHours();
    return hour < 9;
  });

  if (earlyMorningTasks.length > 0) {
    const earlyBirdAchievement = updatedAchievements.find(a => a.id === 'early-bird');
    if (earlyBirdAchievement && !earlyBirdAchievement.unlocked) {
      earlyBirdAchievement.unlocked = true;
      earlyBirdAchievement.unlockedAt = new Date();
    }
  }

  // Check night owl achievement
  const nightTasks = todayTasks.filter(task => {
    if (!task.completedAt) return false;
    const hour = new Date(task.completedAt).getHours();
    return hour >= 22;
  });

  if (nightTasks.length > 0) {
    const nightOwlAchievement = updatedAchievements.find(a => a.id === 'night-owl');
    if (nightOwlAchievement && !nightOwlAchievement.unlocked) {
      nightOwlAchievement.unlocked = true;
      nightOwlAchievement.unlockedAt = new Date();
    }
  }

  // Check speed demon achievement
  const speedTasks = todayTasks.filter(task => {
    if (!task.startTime || !task.completedAt) return false;
    const startTime = new Date(task.startTime);
    const completedTime = new Date(task.completedAt);
    const diffMinutes = (completedTime.getTime() - startTime.getTime()) / 60000;
    return diffMinutes <= 10;
  });

  if (speedTasks.length > 0) {
    const speedAchievement = updatedAchievements.find(a => a.id === 'speed-demon');
    if (speedAchievement && !speedAchievement.unlocked) {
      speedAchievement.unlocked = true;
      speedAchievement.unlockedAt = new Date();
    }
  }

  // Check perfect timing achievement
  const perfectTasks = todayTasks.filter(task => {
    if (!task.startTime || !task.completedAt) return false;
    const startTime = new Date(task.startTime);
    const completedTime = new Date(task.completedAt);
    const diffMinutes = Math.abs((completedTime.getTime() - startTime.getTime()) / 60000);
    return diffMinutes <= 1; // Within 1 minute of scheduled time
  });

  if (perfectTasks.length > 0) {
    const perfectAchievement = updatedAchievements.find(a => a.id === 'perfect-timing');
    if (perfectAchievement && !perfectAchievement.unlocked) {
      perfectAchievement.unlocked = true;
      perfectAchievement.unlockedAt = new Date();
    }
  }

  return updatedAchievements;
};

// Update user stats when a task is completed
export const updateStatsOnTaskCompletion = async (task: Task): Promise<void> => {
  try {
    // Get current settings
    const settings = await db.settings.toCollection().first();
    if (!settings) return;

    // Calculate points for this task
    const taskPoints = calculateTaskPoints(task);

    // Update task with points
    if (task.id) {
      await db.tasks.update(task.id, {
        points: taskPoints,
        completedAt: task.completedAt || new Date()
      });
    }

    // Calculate if task was completed on time
    if (task.startTime && task.completedAt) {
      const startTime = new Date(task.startTime);
      const completedTime = new Date(task.completedAt);
      const completedOnTime = completedTime <= new Date(startTime.getTime() + 5 * 60000); // Within 5 minutes of start time

      if (task.id) {
        await db.tasks.update(task.id, { completedOnTime });
      }
    }

    // Update total points
    const newTotalPoints = (settings.totalPoints ?? 0) + taskPoints;

    // Calculate new level
    const newLevel = getUserLevel(newTotalPoints);

    // Calculate current streak
    const newStreak = await calculateStreak();

    // Get tasks completed today
    const today = startOfDay(new Date());
    const todayEnd = endOfDay(today);
    const tasksCompletedToday = await db.tasks
      .where('completedAt')
      .between(today, todayEnd)
      .count();

    // Check and unlock achievements
    const updatedAchievements = await checkAchievements(
      settings.achievements || DEFAULT_ACHIEVEMENTS,
      newTotalPoints,
      newStreak,
      tasksCompletedToday
    );

    // Update settings
    await db.settings.update(settings.id!, {
      totalPoints: newTotalPoints,
      level: newLevel.level,
      streakCount: newStreak,
      achievements: updatedAchievements,
      lastActivityDate: new Date()
    });

  } catch (error) {
    console.error('Error updating stats on task completion:', error);
  }
};

// Initialize gamification settings if they don't exist
export const initializeGamification = async (): Promise<void> => {
  try {
    const settings = await db.settings.toCollection().first();

    if (settings && !settings.gamificationEnabled) {
      // Initialize gamification settings
      await db.settings.update(settings.id!, {
        gamificationEnabled: true,
        streakCount: 0,
        totalPoints: 0,
        level: 1,
        achievements: DEFAULT_ACHIEVEMENTS,
        lastActivityDate: new Date()
      });
    }
  } catch (error) {
    console.error('Error initializing gamification:', error);
  }
};
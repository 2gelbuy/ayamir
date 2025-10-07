import { Task, db } from './db';
import { 
  startOfDay, 
  endOfDay, 
  isAfter, 
  isBefore, 
  addMinutes, 
  differenceInMinutes, 
  isToday,
  isTomorrow,
  isPast
} from 'date-fns';

// Priority values for sorting (higher value = higher priority)
const PRIORITY_VALUES = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  undefined: 0
};

// Smart queue sorting algorithm
export const sortTasksByPriority = (tasks: Task[]): Task[] => {
  return tasks.sort((a, b) => {
    // First, sort by priority
    const priorityDiff = PRIORITY_VALUES[b.priority || 'undefined'] - PRIORITY_VALUES[a.priority || 'undefined'];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then, sort by due date (earlier due date = higher priority)
    if (a.dueDate && b.dueDate) {
      const dueDateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dueDateDiff !== 0) return dueDateDiff;
    } else if (a.dueDate) {
      return -1; // a has a due date, b doesn't, so a is higher priority
    } else if (b.dueDate) {
      return 1; // b has a due date, a doesn't, so b is higher priority
    }
    
    // Then, sort by start time (earlier start time = higher priority)
    if (a.startTime && b.startTime) {
      const startTimeDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      if (startTimeDiff !== 0) return startTimeDiff;
    } else if (a.startTime) {
      return -1; // a has a start time, b doesn't, so a is higher priority
    } else if (b.startTime) {
      return 1; // b has a start time, a doesn't, so b is higher priority
    }
    
    // Finally, sort by estimated duration (shorter tasks first)
    if (a.estimatedDuration && b.estimatedDuration) {
      return a.estimatedDuration - b.estimatedDuration;
    } else if (a.estimatedDuration) {
      return -1; // a has an estimated duration, b doesn't, so a is higher priority
    } else if (b.estimatedDuration) {
      return 1; // b has an estimated duration, a doesn't, so b is higher priority
    }
    
    // If all else fails, sort by creation date (older tasks first)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};

// Get tasks for today, sorted by priority
export const getTodayTasks = async (): Promise<Task[]> => {
  const today = startOfDay(new Date());
  const tomorrow = endOfDay(today);
  
  const tasks = await db.tasks
    .where('startTime')
    .between(today, tomorrow)
    .or('dueDate')
    .between(today, tomorrow)
    .or('startTime')
    .equals(null)
    .filter(task => !task.isCompleted)
    .toArray();
    
  return sortTasksByPriority(tasks);
};

// Get overdue tasks
export const getOverdueTasks = async (): Promise<Task[]> => {
  const now = new Date();
  
  const tasks = await db.tasks
    .where('startTime')
    .below(now)
    .filter(task => !task.isCompleted)
    .toArray();
    
  return sortTasksByPriority(tasks);
};

// Get upcoming tasks (next 7 days)
export const getUpcomingTasks = async (): Promise<Task[]> => {
  const now = new Date();
  const nextWeek = addMinutes(now, 7 * 24 * 60);
  
  const tasks = await db.tasks
    .where('startTime')
    .between(now, nextWeek)
    .filter(task => !task.isCompleted)
    .toArray();
    
  return sortTasksByPriority(tasks);
};

// Get tasks by tag
export const getTasksByTag = async (tag: string): Promise<Task[]> => {
  const tasks = await db.tasks
    .filter(task => !task.isCompleted && task.tags && task.tags.includes(tag))
    .toArray();
    
  return sortTasksByPriority(tasks);
};

// Get tasks by priority
export const getTasksByPriority = async (priority: 'low' | 'medium' | 'high' | 'urgent'): Promise<Task[]> => {
  const tasks = await db.tasks
    .where('priority')
    .equals(priority)
    .filter(task => !task.isCompleted)
    .toArray();
    
  return sortTasksByPriority(tasks);
};

// Get tasks without a start time (unscheduled)
export const getUnscheduledTasks = async (): Promise<Task[]> => {
  const tasks = await db.tasks
    .where('startTime')
    .equals(null)
    .filter(task => !task.isCompleted)
    .toArray();
    
  return sortTasksByPriority(tasks);
};

// Suggest optimal task order based on various factors
export const suggestOptimalTaskOrder = async (tasks: Task[]): Promise<Task[]> => {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = endOfDay(today);
  
  // Filter tasks that are not completed
  const incompleteTasks = tasks.filter(task => !task.isCompleted);
  
  // Sort tasks by our smart algorithm
  const sortedTasks = sortTasksByPriority(incompleteTasks);
  
  // Further optimize by considering time of day and estimated duration
  const currentHour = now.getHours();
  const isMorning = currentHour >= 5 && currentHour < 12;
  const isAfternoon = currentHour >= 12 && currentHour < 17;
  const isEvening = currentHour >= 17 && currentHour < 22;
  
  // Adjust order based on time of day and task characteristics
  return sortedTasks.map(task => {
    let adjustedPriority = PRIORITY_VALUES[task.priority || 'undefined'];
    
    // Boost priority for urgent tasks that are due soon
    if (task.dueDate && isPast(new Date(task.dueDate))) {
      adjustedPriority += 10; // Significant boost for overdue tasks
    } else if (task.dueDate && isToday(new Date(task.dueDate))) {
      adjustedPriority += 5; // Boost for tasks due today
    } else if (task.dueDate && isTomorrow(new Date(task.dueDate))) {
      adjustedPriority += 2; // Small boost for tasks due tomorrow
    }
    
    // Boost priority for tasks that can be completed in the current time block
    if (task.estimatedDuration) {
      if (isMorning && task.estimatedDuration <= 60) {
        adjustedPriority += 1; // Boost for short tasks in the morning
      } else if (isAfternoon && task.estimatedDuration <= 90) {
        adjustedPriority += 1; // Boost for medium tasks in the afternoon
      } else if (isEvening && task.estimatedDuration <= 45) {
        adjustedPriority += 1; // Boost for very short tasks in the evening
      }
    }
    
    // Return the task with its adjusted priority for sorting
    return { ...task, adjustedPriority };
  }).sort((a, b) => (b as any).adjustedPriority - (a as any).adjustedPriority);
};

// Auto-schedule unscheduled tasks based on availability
export const autoScheduleTasks = async (tasks: Task[]): Promise<Task[]> => {
  const unscheduledTasks = tasks.filter(task => !task.startTime && !task.isCompleted);
  const scheduledTasks = tasks.filter(task => task.startTime && !task.isCompleted);
  
  // Sort unscheduled tasks by priority
  const sortedUnscheduled = sortTasksByPriority(unscheduledTasks);
  
  // Find available time slots
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = endOfDay(today);
  
  // Get existing scheduled tasks to find gaps
  const existingScheduled = await db.tasks
    .where('startTime')
    .between(today, tomorrow)
    .filter(task => !task.isCompleted)
    .toArray();
    
  // Sort existing tasks by start time
  existingScheduled.sort((a, b) => 
    new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()
  );
  
  // Find gaps between scheduled tasks
  const gaps: Array<{ start: Date, end: Date }> = [];
  let currentTime = now;
  
  for (const task of existingScheduled) {
    if (!task.startTime || !task.estimatedDuration) continue;
    
    const taskStart = new Date(task.startTime);
    const taskEnd = addMinutes(taskStart, task.estimatedDuration);
    
    // If there's a gap between now and the next task
    if (isAfter(taskStart, currentTime)) {
      gaps.push({ start: currentTime, end: taskStart });
    }
    
    // Update current time to the end of this task
    if (isAfter(taskEnd, currentTime)) {
      currentTime = taskEnd;
    }
  }
  
  // Add a gap after the last task until end of day
  if (isBefore(currentTime, tomorrow)) {
    gaps.push({ start: currentTime, end: tomorrow });
  }
  
  // Schedule unscheduled tasks in the gaps
  const updatedTasks: Task[] = [];
  
  for (const task of sortedUnscheduled) {
    if (!task.estimatedDuration) {
      // If no estimated duration, skip this task
      updatedTasks.push(task);
      continue;
    }
    
    // Find a gap that can fit this task
    let scheduled = false;
    
    for (let i = 0; i < gaps.length; i++) {
      const gap = gaps[i];
      const gapDuration = differenceInMinutes(gap.end, gap.start);
      
      if (gapDuration >= task.estimatedDuration) {
        // Schedule the task in this gap
        const startTime = gap.start;
        const updatedTask = {
          ...task,
          startTime
        };
        
        // Update the gap
        gaps[i] = {
          start: addMinutes(startTime, task.estimatedDuration),
          end: gap.end
        };
        
        // If the gap is now too small, remove it
        if (differenceInMinutes(gaps[i].end, gaps[i].start) < 15) {
          gaps.splice(i, 1);
        }
        
        updatedTasks.push(updatedTask);
        scheduled = true;
        break;
      }
    }
    
    if (!scheduled) {
      // Couldn't find a gap, leave unscheduled
      updatedTasks.push(task);
    }
  }
  
  return [...scheduledTasks, ...updatedTasks];
};

// Calculate task completion score based on various factors
export const calculateTaskScore = (task: Task): number => {
  let score = 0;
  
  // Base score for having a task
  score += 10;
  
  // Priority score
  score += PRIORITY_VALUES[task.priority || 'undefined'] * 10;
  
  // Due date score
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const daysUntilDue = differenceInMinutes(dueDate, now) / (60 * 24);
    
    if (daysUntilDue < 0) {
      score += 50; // Overdue tasks get a high score
    } else if (daysUntilDue < 1) {
      score += 30; // Due today
    } else if (daysUntilDue < 2) {
      score += 20; // Due tomorrow
    } else if (daysUntilDue < 7) {
      score += 10; // Due this week
    }
  }
  
  // Start time score
  if (task.startTime) {
    const startTime = new Date(task.startTime);
    const now = new Date();
    const minutesUntilStart = differenceInMinutes(startTime, now);
    
    if (minutesUntilStart < 0) {
      score += 25; // Past start time
    } else if (minutesUntilStart < 60) {
      score += 15; // Starts within an hour
    } else if (minutesUntilStart < 24 * 60) {
      score += 5; // Starts within a day
    }
  }
  
  // Estimated duration score (shorter tasks get higher score)
  if (task.estimatedDuration) {
    if (task.estimatedDuration < 15) {
      score += 10; // Very short task
    } else if (task.estimatedDuration < 30) {
      score += 5; // Short task
    } else if (task.estimatedDuration < 60) {
      score += 2; // Medium task
    }
  }
  
  return score;
};

// Get tasks sorted by completion score (highest score first)
export const getTasksByScore = async (): Promise<Task[]> => {
  const tasks = await db.tasks.filter(task => !task.isCompleted).toArray();
  
  return tasks
    .map(task => ({
      ...task,
      score: calculateTaskScore(task)
    }))
    .sort((a, b) => (b as any).score - (a as any).score);
};
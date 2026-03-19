import { Task } from './db';

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
  return [...tasks].sort((a, b) => {
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
      return -1; 
    } else if (b.startTime) {
      return 1; 
    }

    // Finally, sort by estimated duration (shorter tasks first)
    if (a.estimatedDuration && b.estimatedDuration) {
      return a.estimatedDuration - b.estimatedDuration;
    } else if (a.estimatedDuration) {
      return -1; 
    } else if (b.estimatedDuration) {
      return 1; 
    }

    // If all else fails, sort by creation date (older tasks first)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};
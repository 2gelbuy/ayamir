import { Task } from './db';

// Type declarations for Chrome APIs
declare const chrome: any;

// Notification types
export type NotificationType = 
  | 'task_reminder'
  | 'task_overdue'
  | 'break_time'
  | 'deep_work_end'
  | 'achievement_unlocked'
  | 'streak_milestone';

// Notification interface
export interface NotificationOptions {
  type: NotificationType;
  title: string;
  message: string;
  iconUrl?: string;
  actions?: NotificationAction[];
  taskId?: number;
  data?: any;
}

// Notification action interface
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Create a notification with actions
export const createNotification = async (options: NotificationOptions): Promise<string | null> => {
  try {
    if (!chrome.notifications) {
      console.warn('Chrome notifications API not available');
      return null;
    }

    const notificationId = `${options.type}_${Date.now()}`;
    
    // Prepare notification options
    const notificationOptions: any = {
      type: 'basic',
      iconUrl: options.iconUrl || 'icon-128.png',
      title: options.title,
      message: options.message,
      isClickable: true,
      requireInteraction: options.type === 'task_overdue' || options.type === 'task_reminder'
    };

    // Add actions if provided
    if (options.actions && options.actions.length > 0) {
      notificationOptions.buttons = options.actions.map(action => ({
        title: action.title,
        iconUrl: action.icon
      }));
    }

    // Create the notification
    await chrome.notifications.create(notificationId, notificationOptions);
    
    // Store notification data for later reference
    await chrome.storage.local.set({
      [`notification_${notificationId}`]: {
        type: options.type,
        taskId: options.taskId,
        data: options.data
      }
    });

    return notificationId;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Create task reminder notification
export const createTaskReminderNotification = async (task: Task): Promise<string | null> => {
  const actions: NotificationAction[] = [
    { action: 'complete', title: 'Complete' },
    { action: 'snooze', title: 'Snooze' },
    { action: 'dismiss', title: 'Dismiss' }
  ];

  return createNotification({
    type: 'task_reminder',
    title: 'Task Reminder',
    message: `It's time to work on: ${task.title}`,
    taskId: task.id,
    actions
  });
};

// Create task overdue notification
export const createTaskOverdueNotification = async (task: Task): Promise<string | null> => {
  const actions: NotificationAction[] = [
    { action: 'complete', title: 'Complete' },
    { action: 'reschedule', title: 'Reschedule' },
    { action: 'dismiss', title: 'Dismiss' }
  ];

  return createNotification({
    type: 'task_overdue',
    title: 'Task Overdue',
    message: `Your task is overdue: ${task.title}`,
    taskId: task.id,
    actions
  });
};

// Create break time notification
export const createBreakTimeNotification = async (duration: number): Promise<string | null> => {
  const actions: NotificationAction[] = [
    { action: 'start_break', title: 'Start Break' },
    { action: 'skip_break', title: 'Skip Break' }
  ];

  return createNotification({
    type: 'break_time',
    title: 'Break Time',
    message: `Take a ${duration} minute break. You've earned it!`,
    actions,
    data: { duration }
  });
};

// Create deep work end notification
export const createDeepWorkEndNotification = async (completedCycles: number, totalTime: number): Promise<string | null> => {
  const actions: NotificationAction[] = [
    { action: 'start_break', title: 'Start Break' },
    { action: 'continue', title: 'Continue Working' }
  ];

  return createNotification({
    type: 'deep_work_end',
    title: 'Deep Work Session Complete',
    message: `Great job! You completed ${completedCycles} focus session${completedCycles !== 1 ? 's' : ''} (${totalTime} minutes total).`,
    actions,
    data: { completedCycles, totalTime }
  });
};

// Create achievement unlocked notification
export const createAchievementNotification = async (achievement: any): Promise<string | null> => {
  const actions: NotificationAction[] = [
    { action: 'view', title: 'View Achievement' },
    { action: 'dismiss', title: 'Dismiss' }
  ];

  return createNotification({
    type: 'achievement_unlocked',
    title: 'Achievement Unlocked!',
    message: `${achievement.name}: ${achievement.description}`,
    actions,
    data: { achievement }
  });
};

// Create streak milestone notification
export const createStreakMilestoneNotification = async (streakCount: number): Promise<string | null> => {
  const actions: NotificationAction[] = [
    { action: 'view_stats', title: 'View Stats' },
    { action: 'dismiss', title: 'Dismiss' }
  ];

  return createNotification({
    type: 'streak_milestone',
    title: 'Streak Milestone!',
    message: `Congratulations! You've maintained a ${streakCount} day streak.`,
    actions,
    data: { streakCount }
  });
};

// Handle notification click
export const handleNotificationClick = async (notificationId: string): Promise<void> => {
  try {
    // Get notification data
    const result = await chrome.storage.local.get([`notification_${notificationId}`]);
    const notificationData = result[`notification_${notificationId}`];
    
    if (!notificationData) return;
    
    // Clear the notification
    await chrome.notifications.clear(notificationId);
    
    // Handle based on notification type
    switch (notificationData.type) {
      case 'task_reminder':
      case 'task_overdue':
        if (notificationData.taskId) {
          // Open the extension and focus on the specific task
          chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
          // In a real implementation, you would also highlight the specific task
        }
        break;
        
      case 'break_time':
      case 'deep_work_end':
        // Open the extension to the deep work mode
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html?view=deepWork') });
        break;
        
      case 'achievement_unlocked':
        // Open the extension to the gamification view
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html?view=gamification') });
        break;
        
      case 'streak_milestone':
        // Open the extension to the analytics view
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html?view=analytics') });
        break;
    }
    
    // Clean up notification data
    await chrome.storage.local.remove([`notification_${notificationId}`]);
  } catch (error) {
    console.error('Error handling notification click:', error);
  }
};

// Handle notification button click
export const handleNotificationButtonClick = async (notificationId: string, buttonIndex: number): Promise<void> => {
  try {
    // Get notification data
    const result = await chrome.storage.local.get([`notification_${notificationId}`]);
    const notificationData = result[`notification_${notificationId}`];
    
    if (!notificationData) return;
    
    // Clear the notification
    await chrome.notifications.clear(notificationId);
    
    // Get the action based on button index
    let action = '';
    if (notificationData.type === 'task_reminder' || notificationData.type === 'task_overdue') {
      if (buttonIndex === 0) action = 'complete';
      else if (buttonIndex === 1) action = notificationData.type === 'task_reminder' ? 'snooze' : 'reschedule';
      else if (buttonIndex === 2) action = 'dismiss';
    } else if (notificationData.type === 'break_time' || notificationData.type === 'deep_work_end') {
      if (buttonIndex === 0) action = notificationData.type === 'break_time' ? 'start_break' : 'start_break';
      else if (buttonIndex === 1) action = notificationData.type === 'break_time' ? 'skip_break' : 'continue';
    } else if (notificationData.type === 'achievement_unlocked' || notificationData.type === 'streak_milestone') {
      if (buttonIndex === 0) action = 'view';
      else if (buttonIndex === 1) action = 'dismiss';
    }
    
    // Handle the action
    await handleNotificationAction(notificationData, action);
    
    // Clean up notification data
    await chrome.storage.local.remove([`notification_${notificationId}`]);
  } catch (error) {
    console.error('Error handling notification button click:', error);
  }
};

// Handle notification action
export const handleNotificationAction = async (notificationData: any, action: string): Promise<void> => {
  try {
    switch (action) {
      case 'complete':
        if (notificationData.taskId) {
          // Mark the task as completed
          const { db } = await import('./db');
          await db.tasks.update(notificationData.taskId, {
            isCompleted: true,
            completedAt: new Date()
          });
          
          // Update gamification stats
          const { updateStatsOnTaskCompletion } = await import('./gamification');
          const task = await db.tasks.get(notificationData.taskId);
          if (task) {
            await updateStatsOnTaskCompletion(task);
          }
        }
        break;
        
      case 'snooze':
        if (notificationData.taskId) {
          // Snooze the task for 10 minutes
          const { db } = await import('./db');
          const newStartTime = new Date();
          newStartTime.setMinutes(newStartTime.getMinutes() + 10);
          
          await db.tasks.update(notificationData.taskId, {
            startTime: newStartTime,
            notifiedAt10: false,
            notifiedAt5: false,
            notifiedAt0: false
          });
        }
        break;
        
      case 'reschedule':
        if (notificationData.taskId) {
          // Open the extension to reschedule the task
          chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
        }
        break;
        
      case 'start_break':
        // Start the break in deep work mode
        const { startBreakTime } = await import('./deepWorkMode');
        await startBreakTime();
        break;
        
      case 'skip_break':
        // Skip the break and continue working
        const { resumeWorkAfterBreak } = await import('./deepWorkMode');
        await resumeWorkAfterBreak();
        break;
        
      case 'continue':
        // Continue working after deep work session
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html?view=deepWork') });
        break;
        
      case 'view':
        // View the achievement or stats
        if (notificationData.type === 'achievement_unlocked') {
          chrome.tabs.create({ url: chrome.runtime.getURL('index.html?view=gamification') });
        } else if (notificationData.type === 'streak_milestone') {
          chrome.tabs.create({ url: chrome.runtime.getURL('index.html?view=analytics') });
        }
        break;
        
      case 'dismiss':
        // Just dismiss the notification, nothing else to do
        break;
    }
  } catch (error) {
    console.error('Error handling notification action:', error);
  }
};

// Set up notification event listeners
export const setupNotificationListeners = (): void => {
  if (!chrome.notifications) return;
  
  // Handle notification clicks
  chrome.notifications.onClicked.addListener((notificationId: string) => {
    handleNotificationClick(notificationId);
  });
  
  // Handle notification button clicks
  chrome.notifications.onButtonClicked.addListener((notificationId: string, buttonIndex: number) => {
    handleNotificationButtonClick(notificationId, buttonIndex);
  });
  
  // Handle notification closed
  chrome.notifications.onClosed.addListener((notificationId: string) => {
    // Clean up notification data
    chrome.storage.local.remove([`notification_${notificationId}`]);
  });
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!chrome.notifications) {
      console.warn('Chrome notifications API not available');
      return false;
    }
    
    // Check if we already have permission
    const permissionLevel = await chrome.notifications.getPermissionLevel();
    if (permissionLevel === 'granted') {
      return true;
    }
    
    // Request permission
    // Note: Chrome extensions don't need to explicitly request permission
    // if notifications are declared in the manifest
    return permissionLevel === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Check if notifications are enabled
export const areNotificationsEnabled = async (): Promise<boolean> => {
  try {
    if (!chrome.notifications) return false;
    
    const permissionLevel = await chrome.notifications.getPermissionLevel();
    return permissionLevel === 'granted';
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
};
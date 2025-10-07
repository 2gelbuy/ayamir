import { db, Settings } from './db';
import {
  createBreakTimeNotification,
  createDeepWorkEndNotification
} from './notifications';

// Type declarations for Chrome APIs
declare const chrome: any;

// Deep Work Mode state
export interface DeepWorkModeState {
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
  remainingTime?: number; // in seconds
  isBreakTime: boolean;
  currentCycle: number; // Current work/break cycle
  completedCycles: number; // Number of completed work sessions
}

// Default deep work mode settings
export const DEFAULT_DEEP_WORK_SETTINGS = {
  deepWorkModeEnabled: false,
  deepWorkModeDuration: 25, // 25 minutes (Pomodoro technique)
  deepWorkModeBreakDuration: 5, // 5 minutes break
  deepWorkModeBlockNotifications: true,
  deepWorkModeBlockSites: true,
  deepWorkModeShowTimer: true,
  deepWorkModeAutoStart: false
};

// Get deep work mode settings
export const getDeepWorkModeSettings = async (): Promise<typeof DEFAULT_DEEP_WORK_SETTINGS> => {
  try {
    const settings = await db.settings.toCollection().first();
    if (!settings) {
      return DEFAULT_DEEP_WORK_SETTINGS;
    }
    
    return {
      deepWorkModeEnabled: settings.deepWorkModeEnabled ?? DEFAULT_DEEP_WORK_SETTINGS.deepWorkModeEnabled,
      deepWorkModeDuration: settings.deepWorkModeDuration ?? DEFAULT_DEEP_WORK_SETTINGS.deepWorkModeDuration,
      deepWorkModeBreakDuration: settings.deepWorkModeBreakDuration ?? DEFAULT_DEEP_WORK_SETTINGS.deepWorkModeBreakDuration,
      deepWorkModeBlockNotifications: settings.deepWorkModeBlockNotifications ?? DEFAULT_DEEP_WORK_SETTINGS.deepWorkModeBlockNotifications,
      deepWorkModeBlockSites: settings.deepWorkModeBlockSites ?? DEFAULT_DEEP_WORK_SETTINGS.deepWorkModeBlockSites,
      deepWorkModeShowTimer: settings.deepWorkModeShowTimer ?? DEFAULT_DEEP_WORK_SETTINGS.deepWorkModeShowTimer,
      deepWorkModeAutoStart: settings.deepWorkModeAutoStart ?? DEFAULT_DEEP_WORK_SETTINGS.deepWorkModeAutoStart
    };
  } catch (error) {
    console.error('Error getting deep work mode settings:', error);
    return DEFAULT_DEEP_WORK_SETTINGS;
  }
};

// Update deep work mode settings
export const updateDeepWorkModeSettings = async (settings: Partial<typeof DEFAULT_DEEP_WORK_SETTINGS>): Promise<void> => {
  try {
    const currentSettings = await db.settings.toCollection().first();
    if (!currentSettings) return;
    
    await db.settings.update(currentSettings.id!, settings);
  } catch (error) {
    console.error('Error updating deep work mode settings:', error);
  }
};

// Get current deep work mode state
export const getDeepWorkModeState = async (): Promise<DeepWorkModeState> => {
  try {
    const result = await chrome.storage.local.get(['deepWorkModeState']);
    return result.deepWorkModeState || {
      isActive: false,
      isBreakTime: false,
      currentCycle: 0,
      completedCycles: 0
    };
  } catch (error) {
    console.error('Error getting deep work mode state:', error);
    return {
      isActive: false,
      isBreakTime: false,
      currentCycle: 0,
      completedCycles: 0
    };
  }
};

// Update deep work mode state
export const updateDeepWorkModeState = async (state: Partial<DeepWorkModeState>): Promise<void> => {
  try {
    const currentState = await getDeepWorkModeState();
    const newState = { ...currentState, ...state };
    await chrome.storage.local.set({ deepWorkModeState: newState });
  } catch (error) {
    console.error('Error updating deep work mode state:', error);
  }
};

// Start deep work mode
export const startDeepWorkMode = async (): Promise<void> => {
  try {
    const settings = await getDeepWorkModeSettings();
    const now = new Date();
    const endTime = new Date(now.getTime() + settings.deepWorkModeDuration * 60 * 1000);
    
    await updateDeepWorkModeState({
      isActive: true,
      startTime: now,
      endTime: endTime,
      remainingTime: settings.deepWorkModeDuration * 60,
      isBreakTime: false,
      currentCycle: 1
    });
    
    // Apply deep work mode restrictions
    if (settings.deepWorkModeBlockNotifications) {
      await blockNotifications();
    }
    
    if (settings.deepWorkModeBlockSites) {
      await blockDistractingSites();
    }
    
    // Set up timer
    await setupDeepWorkTimer();
    
    // Send notification
    const { createNotification } = await import('./notifications');
    await createNotification({
      type: 'task_reminder',
      title: 'Deep Work Mode Started',
      message: `Focus for ${settings.deepWorkModeDuration} minutes. Distractions are blocked.`
    });
  } catch (error) {
    console.error('Error starting deep work mode:', error);
  }
};

// Stop deep work mode
export const stopDeepWorkMode = async (): Promise<void> => {
  try {
    const currentState = await getDeepWorkModeState();
    
    await updateDeepWorkModeState({
      isActive: false,
      startTime: undefined,
      endTime: undefined,
      remainingTime: undefined
    });
    
    // Remove deep work mode restrictions
    await unblockNotifications();
    await unblockDistractingSites();
    
    // Clear timer
    await clearDeepWorkTimer();
    
    // Send notification
    if (currentState.isActive) {
      const currentSettings = await getDeepWorkModeSettings();
      await createDeepWorkEndNotification(
        currentState.completedCycles,
        currentState.completedCycles * currentSettings.deepWorkModeDuration
      );
    }
  } catch (error) {
    console.error('Error stopping deep work mode:', error);
  }
};

// Start break time
export const startBreakTime = async (): Promise<void> => {
  try {
    const settings = await getDeepWorkModeSettings();
    const currentState = await getDeepWorkModeState();
    const now = new Date();
    const endTime = new Date(now.getTime() + settings.deepWorkModeBreakDuration * 60 * 1000);
    
    await updateDeepWorkModeState({
      isBreakTime: true,
      endTime: endTime,
      remainingTime: settings.deepWorkModeBreakDuration * 60,
      completedCycles: currentState.completedCycles + 1
    });
    
    // Temporarily remove restrictions for break time
    await unblockNotifications();
    await unblockDistractingSites();
    
    // Set up timer for break
    await setupBreakTimer();
    
    // Send notification
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: 'Break Time',
        message: `Take a ${settings.deepWorkModeBreakDuration} minute break. You've earned it!`
      });
    }
  } catch (error) {
    console.error('Error starting break time:', error);
  }
};

// Resume work after break
export const resumeWorkAfterBreak = async (): Promise<void> => {
  try {
    const settings = await getDeepWorkModeSettings();
    const currentState = await getDeepWorkModeState();
    const now = new Date();
    const endTime = new Date(now.getTime() + settings.deepWorkModeDuration * 60 * 1000);
    
    await updateDeepWorkModeState({
      isBreakTime: false,
      endTime: endTime,
      remainingTime: settings.deepWorkModeDuration * 60,
      currentCycle: currentState.currentCycle + 1
    });
    
    // Re-apply deep work mode restrictions
    if (settings.deepWorkModeBlockNotifications) {
      await blockNotifications();
    }
    
    if (settings.deepWorkModeBlockSites) {
      await blockDistractingSites();
    }
    
    // Set up timer
    await setupDeepWorkTimer();
    
    // Send notification
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: 'Back to Work',
        message: `Break's over! Time for another ${settings.deepWorkModeDuration} minute focus session.`
      });
    }
  } catch (error) {
    console.error('Error resuming work after break:', error);
  }
};

// Block notifications
export const blockNotifications = async (): Promise<void> => {
  try {
    // Store current notification settings
    const currentSettings = await chrome.notifications.getPermissionLevel();
    await chrome.storage.local.set({ 
      originalNotificationSettings: currentSettings 
    });
    
    // This would require additional permissions and is a simplified version
    // In a real implementation, you would use the appropriate APIs to block notifications
  } catch (error) {
    console.error('Error blocking notifications:', error);
  }
};

// Unblock notifications
export const unblockNotifications = async (): Promise<void> => {
  try {
    // Restore original notification settings
    const result = await chrome.storage.local.get(['originalNotificationSettings']);
    if (result.originalNotificationSettings) {
      // This would require additional permissions and is a simplified version
      // In a real implementation, you would use the appropriate APIs to restore notifications
    }
  } catch (error) {
    console.error('Error unblocking notifications:', error);
  }
};

// Block distracting sites
export const blockDistractingSites = async (): Promise<void> => {
  try {
    const settings = await db.settings.toCollection().first();
    if (!settings || !settings.blacklist.length) return;
    
    // Store current blocking state
    await chrome.storage.local.set({ 
      originalSiteBlockingState: { enabled: false } 
    });
    
    // Enable site blocking
    // This would be implemented in the content script
    await chrome.storage.local.set({ 
      siteBlockingEnabled: true,
      blockedSites: settings.blacklist
    });
    
    // Update all tabs to apply blocking
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      if (tab.url && tab.id) {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'updateSiteBlocking',
          enabled: true,
          blockedSites: settings.blacklist
        });
      }
    });
  } catch (error) {
    console.error('Error blocking distracting sites:', error);
  }
};

// Unblock distracting sites
export const unblockDistractingSites = async (): Promise<void> => {
  try {
    // Disable site blocking
    await chrome.storage.local.set({ 
      siteBlockingEnabled: false
    });
    
    // Update all tabs to remove blocking
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      if (tab.url && tab.id) {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'updateSiteBlocking',
          enabled: false
        });
      }
    });
  } catch (error) {
    console.error('Error unblocking distracting sites:', error);
  }
};

// Set up deep work timer
export const setupDeepWorkTimer = async (): Promise<void> => {
  try {
    // Clear any existing timers
    await clearDeepWorkTimer();
    
    const state = await getDeepWorkModeState();
    if (!state.endTime) return;
    
    const timeRemaining = new Date(state.endTime).getTime() - Date.now();
    
    // Set alarm for when the session ends
    chrome.alarms.create('deepWorkModeEnd', {
      when: Date.now() + timeRemaining
    });
    
    // Set up timer to update remaining time every second
    const timerInterval = setInterval(async () => {
      const currentState = await getDeepWorkModeState();
      if (!currentState.isActive || !currentState.endTime) {
        clearInterval(timerInterval);
        return;
      }
      
      const timeRemaining = Math.max(0, Math.floor((new Date(currentState.endTime).getTime() - Date.now()) / 1000));
      
      await updateDeepWorkModeState({ remainingTime: timeRemaining });
      
      // If time is up, transition to break or end session
      if (timeRemaining === 0) {
        clearInterval(timerInterval);
        
        if (currentState.isBreakTime) {
          await resumeWorkAfterBreak();
        } else {
          await startBreakTime();
        }
      }
    }, 1000);
    
    // Store interval ID so we can clear it later
    await chrome.storage.local.set({ deepWorkTimerInterval: timerInterval });
  } catch (error) {
    console.error('Error setting up deep work timer:', error);
  }
};

// Set up break timer
export const setupBreakTimer = async (): Promise<void> => {
  // This is essentially the same as setupDeepWorkTimer but for break time
  await setupDeepWorkTimer();
};

// Clear deep work timer
export const clearDeepWorkTimer = async (): Promise<void> => {
  try {
    // Clear alarm
    chrome.alarms.clear('deepWorkModeEnd');
    
    // Clear interval
    const result = await chrome.storage.local.get(['deepWorkTimerInterval']);
    if (result.deepWorkTimerInterval) {
      clearInterval(result.deepWorkTimerInterval);
      await chrome.storage.local.remove(['deepWorkTimerInterval']);
    }
  } catch (error) {
    console.error('Error clearing deep work timer:', error);
  }
};

// Initialize deep work mode
export const initializeDeepWorkMode = async (): Promise<void> => {
  try {
    // Set up alarm listener
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'deepWorkModeEnd') {
        const state = await getDeepWorkModeState();
        
        if (state.isBreakTime) {
          await resumeWorkAfterBreak();
        } else {
          await startBreakTime();
        }
      }
    });
    
    // Check if there's an active session that should be resumed
    const state = await getDeepWorkModeState();
    if (state.isActive && state.endTime) {
      const now = Date.now();
      const endTime = new Date(state.endTime).getTime();
      
      if (now < endTime) {
        // Session is still active, resume timer
        await setupDeepWorkTimer();
      } else {
        // Session should have ended, update state
        if (state.isBreakTime) {
          await resumeWorkAfterBreak();
        } else {
          await startBreakTime();
        }
      }
    }
  } catch (error) {
    console.error('Error initializing deep work mode:', error);
  }
};

// Format time for display
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};
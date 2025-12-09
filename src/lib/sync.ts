import { Task, Settings, db } from './db';

// Type declarations for Chrome APIs
declare const chrome: any;

// Sync data structure
export interface SyncData {
  tasks: Task[];
  settings: Settings[];
  lastSyncTime: number;
  deviceId: string;
}

// Generate a unique device ID if not exists
const getDeviceId = async (): Promise<string> => {
  const result = await chrome.storage.local.get(['deviceId']);
  if (result.deviceId) {
    return result.deviceId;
  }
  
  const deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await chrome.storage.local.set({ deviceId });
  return deviceId;
};

// Get current sync data from IndexedDB
const getCurrentSyncData = async (): Promise<SyncData> => {
  const tasks = await db.tasks.toArray();
  const settings = await db.settings.toArray();
  const deviceId = await getDeviceId();
  
  return {
    tasks,
    settings,
    lastSyncTime: Date.now(),
    deviceId
  };
};

// Save sync data to IndexedDB
const saveSyncData = async (syncData: SyncData): Promise<void> => {
  // Clear existing data
  await db.tasks.clear();
  await db.settings.clear();
  
  // Add new data
  if (syncData.tasks.length > 0) {
    await db.tasks.bulkAdd(syncData.tasks);
  }
  
  if (syncData.settings.length > 0) {
    await db.settings.bulkAdd(syncData.settings);
  }
};

// Merge local data with remote data, handling conflicts
const mergeSyncData = async (localData: SyncData, remoteData: SyncData): Promise<SyncData> => {
  const mergedTasks: Task[] = [];
  const mergedSettings: Settings[] = [];
  
  // Create maps for easier lookup
  const localTasksMap = new Map(localData.tasks.map(task => [task.id, task]));
  const remoteTasksMap = new Map(remoteData.tasks.map(task => [task.id, task]));
  const localSettingsMap = new Map(localData.settings.map(setting => [setting.id, setting]));
  const remoteSettingsMap = new Map(remoteData.settings.map(setting => [setting.id, setting]));
  
  // Merge tasks
  // Include all unique task IDs
  const allTaskIds = new Set([
    ...localData.tasks.map(task => task.id).filter(id => id !== undefined),
    ...remoteData.tasks.map(task => task.id).filter(id => id !== undefined)
  ]);
  
  for (const taskId of allTaskIds) {
    const localTask = localTasksMap.get(taskId);
    const remoteTask = remoteTasksMap.get(taskId);
    
    if (!localTask) {
      // Task exists only remotely
      mergedTasks.push(remoteTask!);
    } else if (!remoteTask) {
      // Task exists only locally
      mergedTasks.push(localTask);
    } else {
      // Task exists in both, use the most recently modified
      const localModified = localTask.completedAt || localTask.createdAt || 0;
      const remoteModified = remoteTask.completedAt || remoteTask.createdAt || 0;
      
      if (localModified > remoteModified) {
        mergedTasks.push(localTask);
      } else {
        mergedTasks.push(remoteTask);
      }
    }
  }
  
  // For settings, just use the remote settings (they're usually simpler)
  mergedSettings.push(...remoteData.settings);
  
  // If no remote settings, use local settings
  if (remoteData.settings.length === 0 && localData.settings.length > 0) {
    mergedSettings.push(...localData.settings);
  }
  
  return {
    tasks: mergedTasks,
    settings: mergedSettings,
    lastSyncTime: Date.now(),
    deviceId: await getDeviceId()
  };
};

// Export data to Chrome Sync Storage
export const exportToChromeSync = async (): Promise<void> => {
  try {
    const syncData = await getCurrentSyncData();
    
    // Chrome Sync has size limitations, so we might need to compress or split the data
    // For now, we'll try to store it as is
    await chrome.storage.sync.set({
      'edgetask-sync-data': syncData
    });
    
    console.log('Data exported to Chrome Sync successfully');
  } catch (error) {
    console.error('Error exporting to Chrome Sync:', error);
    throw error;
  }
};

// Import data from Chrome Sync Storage
export const importFromChromeSync = async (): Promise<boolean> => {
  try {
    const result = await chrome.storage.sync.get('edgetask-sync-data');
    const remoteSyncData: SyncData = result['edgetask-sync-data'];
    
    if (!remoteSyncData) {
      console.log('No remote data found in Chrome Sync');
      return false;
    }
    
    const localSyncData = await getCurrentSyncData();
    const mergedData = await mergeSyncData(localSyncData, remoteSyncData);
    
    await saveSyncData(mergedData);
    
    console.log('Data imported from Chrome Sync successfully');
    return true;
  } catch (error) {
    console.error('Error importing from Chrome Sync:', error);
    throw error;
  }
};

// Check if there's remote data available
export const hasRemoteData = async (): Promise<boolean> => {
  try {
    const result = await chrome.storage.sync.get('edgetask-sync-data');
    return !!result['edgetask-sync-data'];
  } catch (error) {
    console.error('Error checking for remote data:', error);
    return false;
  }
};

// Get last sync time
export const getLastSyncTime = async (): Promise<number | null> => {
  try {
    const result = await chrome.storage.local.get('edgetask-last-sync-time');
    return result['edgetask-last-sync-time'] || null;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
};

// Set last sync time
export const setLastSyncTime = async (time: number): Promise<void> => {
  try {
    await chrome.storage.local.set({
      'edgetask-last-sync-time': time
    });
  } catch (error) {
    console.error('Error setting last sync time:', error);
  }
};

// Perform automatic sync
export const autoSync = async (): Promise<void> => {
  try {
    const lastSyncTime = await getLastSyncTime();
    const now = Date.now();
    
    // Only sync if it's been more than 5 minutes since last sync
    if (!lastSyncTime || now - lastSyncTime > 5 * 60 * 1000) {
      const hasRemote = await hasRemoteData();
      
      if (hasRemote) {
        await importFromChromeSync();
      }
      
      await exportToChromeSync();
      await setLastSyncTime(now);
      
      console.log('Auto-sync completed successfully');
    }
  } catch (error) {
    console.error('Error during auto-sync:', error);
  }
};

// Manual sync with conflict resolution options
export const manualSync = async (preferLocal: boolean = false): Promise<boolean> => {
  try {
    const hasRemote = await hasRemoteData();
    
    if (!hasRemote) {
      // No remote data, just export local data
      await exportToChromeSync();
      await setLastSyncTime(Date.now());
      return true;
    }
    
    if (preferLocal) {
      // Export local data to remote
      await exportToChromeSync();
      await setLastSyncTime(Date.now());
      return true;
    } else {
      // Import remote data and merge
      const success = await importFromChromeSync();
      if (success) {
        await setLastSyncTime(Date.now());
      }
      return success;
    }
  } catch (error) {
    console.error('Error during manual sync:', error);
    return false;
  }
};
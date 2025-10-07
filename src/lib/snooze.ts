import { Task } from './db';
import { createTaskReminderNotification } from './notifications';

// Type declarations for Chrome APIs
declare const chrome: any;

// Snooze options
export interface SnoozeOption {
  label: string;
  minutes: number;
}

// Default snooze options
export const DEFAULT_SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: '5 minutes', minutes: 5 },
  { label: '10 minutes', minutes: 10 },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: 'Tomorrow', minutes: 24 * 60 },
  { label: 'Custom', minutes: 0 } // 0 indicates custom time
];

// Snooze a task
export const snoozeTask = async (taskId: number, minutes: number, customTime?: Date): Promise<void> => {
  try {
    const { db } = await import('./db');
    const task = await db.tasks.get(taskId);
    
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    // Calculate new start time
    let newStartTime: Date;
    
    if (minutes === 0 && customTime) {
      // Use custom time
      newStartTime = customTime;
    } else {
      // Use minutes from now
      newStartTime = new Date();
      newStartTime.setMinutes(newStartTime.getMinutes() + minutes);
    }
    
    // Update task
    await db.tasks.update(taskId, {
      startTime: newStartTime,
      snoozedUntil: newStartTime,
      notifiedAt10: false,
      notifiedAt5: false,
      notifiedAt0: false
    });
    
    // Create snoozed task notification
    await createTaskReminderNotification({
      ...task,
      startTime: newStartTime
    });
    
    // Log snooze action for analytics
    const { logTaskAction } = await import('./analytics');
    await logTaskAction('snoozed', taskId);
  } catch (error) {
    console.error('Error snoozing task:', error);
    throw error;
  }
};

// Get snooze options from storage
export const getSnoozeOptions = async (): Promise<SnoozeOption[]> => {
  try {
    const result = await chrome.storage.local.get(['snoozeOptions']);
    return result.snoozeOptions || DEFAULT_SNOOZE_OPTIONS;
  } catch (error) {
    console.error('Error getting snooze options:', error);
    return DEFAULT_SNOOZE_OPTIONS;
  }
};

// Update snooze options
export const updateSnoozeOptions = async (options: SnoozeOption[]): Promise<void> => {
  try {
    await chrome.storage.local.set({ snoozeOptions: options });
  } catch (error) {
    console.error('Error updating snooze options:', error);
  }
};

// Get snooze history
export const getSnoozeHistory = async (taskId?: number): Promise<any[]> => {
  try {
    const result = await chrome.storage.local.get(['snoozeHistory']);
    let history = result.snoozeHistory || [];
    
    if (taskId) {
      history = history.filter((item: any) => item.taskId === taskId);
    }
    
    return history;
  } catch (error) {
    console.error('Error getting snooze history:', error);
    return [];
  }
};

// Add snooze to history
export const addSnoozeToHistory = async (taskId: number, originalTime: Date, newTime: Date): Promise<void> => {
  try {
    const history = await getSnoozeHistory();
    
    history.push({
      taskId,
      originalTime: originalTime.toISOString(),
      newTime: newTime.toISOString(),
      snoozedAt: new Date().toISOString()
    });
    
    // Keep only the last 100 snooze history items
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    await chrome.storage.local.set({ snoozeHistory: history });
  } catch (error) {
    console.error('Error adding snooze to history:', error);
  }
};

// Check for snoozed tasks that need to be reminded
export const checkSnoozedTasks = async (): Promise<void> => {
  try {
    const { db } = await import('./db');
    const now = new Date();
    
    // Get all snoozed tasks
    const snoozedTasks = await db.tasks
      .where('snoozedUntil')
      .above(now)
      .toArray();
    
    // For each snoozed task, check if it's time to remind
    for (const task of snoozedTasks) {
      if (task.snoozedUntil && new Date(task.snoozedUntil) <= now) {
        // Time to remind
        await createTaskReminderNotification(task);
        
        // Clear snoozed flag
        await db.tasks.update(task.id!, {
          snoozedUntil: undefined
        });
      }
    }
  } catch (error) {
    console.error('Error checking snoozed tasks:', error);
  }
};

// Set up alarm for checking snoozed tasks
export const setupSnoozeAlarm = (): void => {
  // Check every minute
  chrome.alarms.create('checkSnoozedTasks', {
    periodInMinutes: 1
  });
  
  // Set up alarm listener
  chrome.alarms.onAlarm.addListener((alarm: any) => {
    if (alarm.name === 'checkSnoozedTasks') {
      checkSnoozedTasks();
    }
  });
};

// Initialize snooze functionality
export const initializeSnooze = (): void => {
  setupSnoozeAlarm();
};

// Create a snooze dialog
export const createSnoozeDialog = (taskId: number, onClose: () => void): HTMLElement => {
  const dialog = document.createElement('div');
  dialog.className = 'edgetask-snooze-dialog';
  dialog.innerHTML = `
    <div class="edgetask-snooze-dialog-content">
      <div class="edgetask-snooze-dialog-header">
        <h2>Snooze Task</h2>
        <button class="edgetask-snooze-dialog-close" aria-label="Close">&times;</button>
      </div>
      <div class="edgetask-snooze-dialog-body">
        <p>When would you like to be reminded?</p>
        <div class="edgetask-snooze-options">
          <!-- Snooze options will be populated here -->
        </div>
        <div class="edgetask-snooze-custom" style="display: none;">
          <label for="snooze-custom-date">Date:</label>
          <input type="date" id="snooze-custom-date" />
          <label for="snooze-custom-time">Time:</label>
          <input type="time" id="snooze-custom-time" />
        </div>
        <div class="edgetask-snooze-dialog-actions">
          <button class="edgetask-snooze-cancel">Cancel</button>
          <button class="edgetask-snooze-confirm">Snooze</button>
        </div>
      </div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .edgetask-snooze-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    
    .edgetask-snooze-dialog-content {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 400px;
      width: 90%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .edgetask-snooze-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #eaeaea;
    }
    
    .edgetask-snooze-dialog-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .edgetask-snooze-dialog-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    
    .edgetask-snooze-dialog-close:hover {
      background-color: #f0f0f0;
    }
    
    .edgetask-snooze-dialog-body {
      padding: 16px;
    }
    
    .edgetask-snooze-dialog-body p {
      margin-top: 0;
      margin-bottom: 16px;
    }
    
    .edgetask-snooze-options {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .edgetask-snooze-option {
      padding: 8px 12px;
      border: 1px solid #eaeaea;
      border-radius: 4px;
      background-color: white;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease;
    }
    
    .edgetask-snooze-option:hover {
      background-color: #f5f5f5;
    }
    
    .edgetask-snooze-option.selected {
      background-color: #4f46e5;
      color: white;
      border-color: #4f46e5;
    }
    
    .edgetask-snooze-custom {
      margin-bottom: 16px;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .edgetask-snooze-custom label {
      font-size: 14px;
      font-weight: 500;
    }
    
    .edgetask-snooze-custom input {
      padding: 6px 8px;
      border: 1px solid #eaeaea;
      border-radius: 4px;
    }
    
    .edgetask-snooze-dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    
    .edgetask-snooze-cancel,
    .edgetask-snooze-confirm {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .edgetask-snooze-cancel {
      background-color: #f5f5f5;
      color: #333;
    }
    
    .edgetask-snooze-cancel:hover {
      background-color: #eaeaea;
    }
    
    .edgetask-snooze-confirm {
      background-color: #4f46e5;
      color: white;
    }
    
    .edgetask-snooze-confirm:hover {
      background-color: #4338ca;
    }
    
    .edgetask-snooze-confirm:disabled {
      background-color: #a5b4fc;
      cursor: not-allowed;
    }
  `;
  
  document.head.appendChild(style);
  
  // Populate snooze options
  const populateOptions = async () => {
    const options = await getSnoozeOptions();
    const optionsContainer = dialog.querySelector('.edgetask-snooze-options');
    
    options.forEach((option, index) => {
      const optionElement = document.createElement('div');
      optionElement.className = 'edgetask-snooze-option';
      optionElement.textContent = option.label;
      optionElement.dataset.minutes = option.minutes.toString();
      
      if (index === 0) {
        optionElement.classList.add('selected');
      }
      
      optionElement.addEventListener('click', () => {
        // Remove selected class from all options
        dialog.querySelectorAll('.edgetask-snooze-option').forEach(el => {
          el.classList.remove('selected');
        });
        
        // Add selected class to clicked option
        optionElement.classList.add('selected');
        
        // Show/hide custom time inputs
        const customContainer = dialog.querySelector('.edgetask-snooze-custom') as HTMLElement;
        if (option.minutes === 0) {
          customContainer.style.display = 'flex';
        } else {
          customContainer.style.display = 'none';
        }
      });
      
      optionsContainer.appendChild(optionElement);
    });
  };
  
  populateOptions();
  
  // Set default values for custom date/time
  const now = new Date();
  now.setHours(now.getHours() + 1);
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
  
  const customDateInput = dialog.querySelector('#snooze-custom-date') as HTMLInputElement;
  const customTimeInput = dialog.querySelector('#snooze-custom-time') as HTMLInputElement;
  
  if (customDateInput) customDateInput.value = dateStr;
  if (customTimeInput) customTimeInput.value = timeStr;
  
  // Add event listeners
  const closeBtn = dialog.querySelector('.edgetask-snooze-dialog-close');
  const cancelBtn = dialog.querySelector('.edgetask-snooze-cancel');
  const confirmBtn = dialog.querySelector('.edgetask-snooze-confirm');
  
  const closeDialog = () => {
    document.body.removeChild(dialog);
    document.head.removeChild(style);
    onClose();
  };
  
  closeBtn.addEventListener('click', closeDialog);
  cancelBtn.addEventListener('click', closeDialog);
  
  confirmBtn.addEventListener('click', async () => {
    const selectedOption = dialog.querySelector('.edgetask-snooze-option.selected') as HTMLElement;
    
    if (!selectedOption) return;
    
    const minutes = parseInt(selectedOption.dataset.minutes || '0');
    let customTime: Date | undefined;
    
    if (minutes === 0) {
      // Use custom date/time
      const dateValue = customDateInput.value;
      const timeValue = customTimeInput.value;
      
      if (dateValue && timeValue) {
        customTime = new Date(`${dateValue}T${timeValue}`);
        
        // Validate custom time is in the future
        if (customTime <= new Date()) {
          alert('Please select a future date and time.');
          return;
        }
      } else {
        alert('Please select both date and time.');
        return;
      }
    }
    
    try {
      // Snooze the task
      await snoozeTask(taskId, minutes, customTime);
      
      // Close dialog
      closeDialog();
    } catch (error) {
      console.error('Error snoozing task:', error);
      alert('Failed to snooze task. Please try again.');
    }
  });
  
  // Close on escape
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  
  document.addEventListener('keydown', handleEscape);
  
  // Close on background click
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      closeDialog();
      document.removeEventListener('keydown', handleEscape);
    }
  });
  
  return dialog;
};

// Show snooze dialog
export const showSnoozeDialog = (taskId: number, onClose?: () => void): void => {
  const dialog = createSnoozeDialog(taskId, onClose || (() => {}));
  document.body.appendChild(dialog);
};
import { autoSync } from './lib/sync';
import { db, getSettings } from './lib/db';

const ensureReminderAlarm = () => {
  chrome.alarms.get('checkReminders', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('checkReminders', {
        periodInMinutes: 1
      });
    }
  });
};

const ensureSyncAlarm = () => {
  chrome.alarms.get('autoSync', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('autoSync', {
        periodInMinutes: 15
      });
    }
  });
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('EdgeTask installed');
  ensureReminderAlarm();
});

// Handle Service Worker wake-up
chrome.runtime.onStartup.addListener(() => {
  console.log('EdgeTask: Service Worker woke up');
  ensureReminderAlarm();
  ensureSyncAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm: chrome.alarms.Alarm) => {
  if (alarm.name === 'checkReminders') {
    await checkTaskReminders();
  } else if (alarm.name === 'autoSync') {
    try {
      const settings = await getSettings();
      const syncEnabled = settings.syncEnabled === true;
      if (syncEnabled) {
        await autoSync();
      } else {
        console.log('EdgeTask: autoSync skipped (disabled)');
      }
    } catch (e) {
      console.error('EdgeTask: autoSync error', e);
    }
  }
});

async function checkTaskReminders() {
  try {
    const tasks = await db.tasks.toArray();
    const settings = await getSettings();
    console.log('EdgeTask Debug [background]: checkTaskReminders fetched', {
      taskCount: tasks.length,
      settingsKeys: settings ? Object.keys(settings) : [],
      sampleTask: tasks[0]
    });
    const now = new Date();

    for (const task of tasks) {
      if (!task || typeof task !== 'object') {
        console.warn('EdgeTask Debug [background]: skipping invalid task entry', task);
        continue;
      }
      if (task.isCompleted || !task.startTime) continue;

      const startTime = new Date(task.startTime);
      const minutesDiff = (startTime.getTime() - now.getTime()) / 60000;
      if (Number.isNaN(startTime.getTime()) || Number.isNaN(minutesDiff)) {
        console.warn('EdgeTask Debug [background]: invalid date math for task', {
          taskId: task.id,
          title: task.title,
          startTime: task.startTime,
          createdAt: task.createdAt
        });
      }

      console.log('EdgeTask Debug [background]: evaluating reminder window', {
        taskId: task.id,
        title: task.title,
        minutesUntil: minutesDiff,
        notifiedAt10: task.notifiedAt10,
        notifiedAt5: task.notifiedAt5,
        notifiedAt0: task.notifiedAt0
      });
      if (minutesDiff <= 10 && minutesDiff > 6 && !task.notifiedAt10) {
        await showNotification(task, '10min', settings.humorTone);
        task.notifiedAt10 = true;
        await updateTaskInStorage(task);
      } else if (minutesDiff <= 5 && minutesDiff > 1 && !task.notifiedAt5) {
        await showNotification(task, '5min', settings.humorTone);
        task.notifiedAt5 = true;
        await updateTaskInStorage(task);
      } else if (minutesDiff <= 1 && minutesDiff >= -1 && !task.notifiedAt0) {
        await showNotification(task, '0min', settings.humorTone);
        task.notifiedAt0 = true;
        await updateTaskInStorage(task);
      }
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

async function showNotification(task: any, timing: string, tone: string) {
  const messages = getHumorMessages(timing, tone);
  const message = messages[Math.floor(Math.random() * messages.length)];
  const finalMessage = message.replace('{task}', task.title);

  console.log('EdgeTask Debug [background]: showNotification payload', {
    taskId: task?.id,
    title: task?.title,
    timing,
    tone
  });

  // Use task ID as notification ID for button handling
  const notificationId = `task-${task.id}`;

  await chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icon-128.png',
    title: timing === '0min' ? 'Time to start!' : `Starting ${timing === '10min' ? 'in 10 minutes' : 'in 5 minutes'}`,
    message: finalMessage,
    buttons: [
      { title: 'Snooze 10 min' },
      { title: 'Done' }
    ],
    priority: 2
  });
}

async function updateTaskInStorage(task: any) {
  if (task.id) {
    await db.tasks.update(task.id, task);
    console.log('EdgeTask Debug [background]: persisted task update', {
      taskId: task.id,
      notifiedAt10: task.notifiedAt10,
      notifiedAt5: task.notifiedAt5,
      notifiedAt0: task.notifiedAt0
    });
  }
}

function getHumorMessages(timing: string, tone: string): string[] {
  const messages: { [key: string]: { [key: string]: string[] } } = {
    '10min': {
      default: [
        '10 minutes until "{task}". The internet is infinite. Deadlines are not.',
        '"{task}" in 10 minutes. Time to prepare your winning mentality.',
        'Start of "{task}" is near. Fear of missing a deadline is great motivation.'
      ],
      polite: [
        '10 minutes until "{task}". Coffee is cold, but is your enthusiasm still warm?',
        'Friendly reminder: "{task}" starts in 10 minutes.'
      ],
      sarcastic: [
        'Soon "{task}". Procrastination is not an excuse, but it is a good trend.',
        '"{task}" in 10. Time to panic? Or prepare. Your choice.'
      ]
    },
    '5min': {
      default: [
        '5 minutes until "{task}". The most harmful tab is the one open right now.',
        'Procrastination is over. "{task}" in 5 minutes.',
        '5 minutes. "{task}" won\'t disappear. Unlike time.'
      ],
      polite: [
        '5 minutes until "{task}". You\'ve got this!',
        'Almost time for "{task}". Ready?'
      ],
      sarcastic: [
        '"{task}" in 5 minutes. Last chance to pretend everything is under control.',
        '"{task}" in 5 minutes. Surprise: it\'s still on the list.'
      ]
    },
    '0min': {
      default: [
        '"{task}" starts NOW. Surprise the world. At least your own.',
        '"{task}" is waiting. It won\'t get angry, but karma will remember.',
        'Time for "{task}". No excuses. Only actions.'
      ],
      polite: [
        '"{task}" now. Future you will thank present you.',
        'It\'s time to begin "{task}". Good luck!'
      ],
      sarcastic: [
        'Congratulations! You lived to "{task}". Now do it.',
        '"{task}" has arrived. The universe is watching.'
      ]
    }
  };

  return messages[timing]?.[tone] || messages[timing]?.['default'] || [];
}

chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'toggle-panel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' });
      }
    });
  } else if (command === 'toggle-focus') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleFocus' });
      }
    });
  }
});

// Handle notification button clicks with actual functionality
chrome.notifications.onButtonClicked.addListener(async (notificationId: string, buttonIndex: number) => {
  // Extract task ID from notification ID (format: "task-{id}")
  const taskIdMatch = notificationId.match(/^task-(.+)$/);

  if (!taskIdMatch) {
    console.log('EdgeTask: Unknown notification format:', notificationId);
    chrome.notifications.clear(notificationId);
    return;
  }

  const taskId = taskIdMatch[1];

  try {
    const response = await chrome.storage.local.get(['tasks']);
    const tasks = response.tasks || [];
    const taskIndex = tasks.findIndex((t: any) => String(t.id) === taskId);

    if (taskIndex === -1) {
      console.log('EdgeTask: Task not found:', taskId);
      chrome.notifications.clear(notificationId);
      return;
    }

    if (buttonIndex === 0) {
      // Snooze: Reschedule notification for 10 minutes
      console.log('EdgeTask: Snoozing task:', taskId);
      const task = tasks[taskIndex];
      task.startTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      task.notifiedAt10 = false;
      task.notifiedAt5 = false;
      task.notifiedAt0 = false;
      tasks[taskIndex] = task;
      await chrome.storage.local.set({ tasks });
      console.log('EdgeTask: Task snoozed successfully');
    } else if (buttonIndex === 1) {
      // Mark as done
      console.log('EdgeTask: Completing task:', taskId);
      tasks[taskIndex].isCompleted = true;
      tasks[taskIndex].completedAt = new Date().toISOString();
      await chrome.storage.local.set({ tasks });
      console.log('EdgeTask: Task completed successfully');
    }
  } catch (error) {
    console.error('EdgeTask: Error handling notification button:', error);
  }

  chrome.notifications.clear(notificationId);
});


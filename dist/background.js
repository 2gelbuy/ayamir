chrome.runtime.onInstalled.addListener(() => {
  console.log('EdgeTask installed');

  chrome.alarms.create('checkReminders', {
    periodInMinutes: 1
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkReminders') {
    await checkTaskReminders();
  }
});

async function checkTaskReminders() {
  try {
    const response = await chrome.storage.local.get(['tasks', 'settings']);
    const tasks = response.tasks || [];
    const settings = response.settings || { humorTone: 'default' };
    const now = new Date();

    for (const task of tasks) {
      if (task.isCompleted || !task.startTime) continue;

      const startTime = new Date(task.startTime);
      const minutesUntil = Math.floor((startTime.getTime() - now.getTime()) / 60000);

      if (minutesUntil === 10 && !task.notifiedAt10) {
        await showNotification(task, '10min', settings.humorTone);
        task.notifiedAt10 = true;
        await updateTaskInStorage(task);
      } else if (minutesUntil === 5 && !task.notifiedAt5) {
        await showNotification(task, '5min', settings.humorTone);
        task.notifiedAt5 = true;
        await updateTaskInStorage(task);
      } else if (minutesUntil === 0 && !task.notifiedAt0) {
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

  await chrome.notifications.create({
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
  const response = await chrome.storage.local.get(['tasks']);
  const tasks = response.tasks || [];
  const index = tasks.findIndex((t: any) => t.id === task.id);
  if (index !== -1) {
    tasks[index] = task;
    await chrome.storage.local.set({ tasks });
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

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-panel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' });
      }
    });
  } else if (command === 'toggle-focus') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleFocus' });
      }
    });
  }
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    console.log('Snoozed');
  } else if (buttonIndex === 1) {
    console.log('Marked as done');
  }
  chrome.notifications.clear(notificationId);
});

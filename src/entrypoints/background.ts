import { db, getSettings } from '@/lib/db';
import { getHumorMessage } from '@/lib/humor';
import { updateStatsOnTaskCompletion } from '@/lib/gamification';

export default defineBackground(() => {
    chrome.runtime.onInstalled.addListener(() => {
        // Create alarm for checking reminders every minute
        chrome.alarms.create('checkReminders', { periodInMinutes: 1 });

        // Create context menu for saving page as task
        chrome.contextMenus.create({
            id: 'ayamir-save-page',
            title: 'Save page as AyaMir task',
            contexts: ['page', 'link'],
        });

        // Create context menu for saving selected text
        chrome.contextMenus.create({
            id: 'ayamir-save-selection',
            title: 'Save "%s" as AyaMir task',
            contexts: ['selection'],
        });

        console.log('AyaMir installed, alarms and context menus configured');
    });

    // Context menu click handler
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        let title = '';
        let url = '';

        if (info.menuItemId === 'ayamir-save-selection' && info.selectionText) {
            title = info.selectionText.trim();
            url = tab?.url || '';
        } else if (info.menuItemId === 'ayamir-save-page') {
            if (info.linkUrl) {
                title = `Check: ${info.linkUrl}`;
                url = info.linkUrl;
            } else {
                title = tab?.title || 'Saved page';
                url = tab?.url || '';
            }
        }

        if (title) {
            await db.tasks.add({
                title,
                startTime: null,
                isCompleted: false,
                createdAt: new Date(),
                priority: 'medium',
                url: url || undefined,
            });

            // Show confirmation notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('/icon/128.png'),
                title: 'AyaMir',
                message: `Task saved: "${title.substring(0, 60)}${title.length > 60 ? '...' : ''}"`,
                priority: 1,
            });
        }
    });

    chrome.alarms.onAlarm.addListener(async (alarm) => {
        try {
            if (alarm.name === 'checkReminders') {
                await checkTaskReminders();
                await checkScheduledBlocking();
            }
        } catch (error) {
            console.error('Error in checkReminders alarm:', error);
        }
    });

    // Handle notification button clicks
    chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
        try {
            const taskId = parseInt(notificationId.replace('task-', ''));
            if (isNaN(taskId)) {
                chrome.notifications.clear(notificationId);
                return;
            }

            if (buttonIndex === 0) {
                // Snooze: +10 minutes
                const newTime = new Date(Date.now() + 10 * 60 * 1000);
                await db.tasks.update(taskId, {
                    startTime: newTime,
                    notifiedAt10: false,
                    notifiedAt5: false,
                    notifiedAt0: false
                });
            } else if (buttonIndex === 1) {
                // Done: mark complete
                const completedAt = new Date();
                await db.tasks.update(taskId, {
                    isCompleted: true,
                    completedAt
                });

                const task = await db.tasks.get(taskId);
                if (task) {
                    await updateStatsOnTaskCompletion(task);
                }
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
        } finally {
            chrome.notifications.clear(notificationId);
        }
    });

    // Handle notification click
    chrome.notifications.onClicked.addListener((notificationId) => {
        chrome.notifications.clear(notificationId);
    });

    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'closeTab' && sender.tab?.id) {
            chrome.tabs.remove(sender.tab.id);
        }
        if (message.action === 'createTask') {
            db.tasks.add(message.task).then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                console.error('Failed to create task:', error);
                sendResponse({ success: false, error });
            });
            return true;
        }
    });

    // Handle Keyboard Commands
    chrome.commands.onCommand.addListener((command) => {
        if (command === 'open_command_palette') {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleCommandPalette' });
                }
            });
        }
    });
});

async function checkTaskReminders() {
    const settings = await getSettings();
    if (!settings.notificationsEnabled) return;

    const tasks = await db.tasks.filter(t => !t.isCompleted && !!t.startTime).toArray();
    const now = new Date();

    for (const task of tasks) {
        if (!task.startTime || !task.id) continue;

        const startTime = new Date(task.startTime);
        const diffMs = startTime.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        if (diffMinutes <= 10 && diffMinutes > 5 && !task.notifiedAt10) {
            showNotification(task.id, task.title, 'reminder10');
            await db.tasks.update(task.id, { notifiedAt10: true });
        }
        else if (diffMinutes <= 5 && diffMinutes > 0 && !task.notifiedAt5) {
            showNotification(task.id, task.title, 'reminder5');
            await db.tasks.update(task.id, { notifiedAt5: true });
        }
        else if (diffMinutes <= 0 && diffMinutes > -1 && !task.notifiedAt0) {
            showNotification(task.id, task.title, 'reminder0');
            await db.tasks.update(task.id, { notifiedAt0: true });
        }
    }
}

async function checkScheduledBlocking() {
    const settings = await getSettings();
    if (!settings.scheduledBlocking.enabled) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    const isWorkHours =
        settings.scheduledBlocking.days.includes(currentDay) &&
        currentHour >= settings.scheduledBlocking.startHour &&
        currentHour < settings.scheduledBlocking.endHour;

    // Auto-enable focus mode during scheduled hours
    if (isWorkHours && !settings.focusEnabled) {
        const { updateSettings } = await import('@/lib/db');
        await updateSettings({ focusEnabled: true });
    }
}

function showNotification(
    taskId: number,
    taskTitle: string,
    type: 'reminder10' | 'reminder5' | 'reminder0'
) {
    try {
        const message = getHumorMessage(type, taskTitle);

        chrome.notifications.create(`task-${taskId}`, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('/icon/128.png'),
            title: 'AyaMir',
            message: message,
            buttons: [
                { title: '⏰ Snooze 10min' },
                { title: '✓ Done' }
            ],
            priority: 2,
            requireInteraction: true
        });
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

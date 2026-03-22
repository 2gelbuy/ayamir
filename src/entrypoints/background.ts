import { db, getSettings, updateSettings } from '@/lib/db';
import { getHumorMessage } from '@/lib/humor';
import { updateStatsOnTaskCompletion } from '@/lib/gamification';
import { MSG } from '@/lib/messages';

export default defineBackground(() => {
    // sw-register-listeners-toplevel: all listeners at top level
    chrome.runtime.onInstalled.addListener(() => {
        chrome.alarms.create('checkReminders', { periodInMinutes: 1 });

        chrome.contextMenus.create({
            id: 'ayamir-save-page',
            title: chrome.i18n.getMessage('ctxSavePage') || 'Save page as AyaMir task',
            contexts: ['page', 'link'],
        });

        chrome.contextMenus.create({
            id: 'ayamir-save-selection',
            title: chrome.i18n.getMessage('ctxSaveSelection') || 'Save "%s" as AyaMir task',
            contexts: ['selection'],
        });
    });

    // Context menu handler
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        let title = '';
        let url = '';

        if (info.menuItemId === 'ayamir-save-selection' && info.selectionText) {
            title = info.selectionText.trim().substring(0, 500);
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
            const safeUrl = url && /^https?:\/\//.test(url) ? url.substring(0, 2000) : undefined;
            await db.tasks.add({
                title,
                startTime: null,
                isCompleted: false,
                createdAt: new Date(),
                priority: 'medium',
                url: safeUrl,
            });

            chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('/icon/128.png'),
                title: 'AyaMir',
                message: `Task saved: "${title.substring(0, 60)}${title.length > 60 ? '...' : ''}"`,
                priority: 1,
            });
        }
    });

    // Alarms
    chrome.alarms.onAlarm.addListener(async (alarm) => {
        try {
            if (alarm.name === 'checkReminders') {
                await checkTaskReminders();
                await checkScheduledBlocking();
            }
        } catch (error) {
            console.error('Alarm error:', error);
        }
    });

    // Notification buttons
    chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
        try {
            const taskId = parseInt(notificationId.replace('task-', ''));
            if (isNaN(taskId)) {
                chrome.notifications.clear(notificationId);
                return;
            }

            if (buttonIndex === 0) {
                const newTime = new Date(Date.now() + 10 * 60 * 1000);
                await db.tasks.update(taskId, {
                    startTime: newTime,
                    notifiedAt10: false,
                    notifiedAt5: false,
                    notifiedAt0: false
                });
            } else if (buttonIndex === 1) {
                const completedAt = new Date();
                await db.tasks.update(taskId, { isCompleted: true, completedAt });
                const task = await db.tasks.get(taskId);
                if (task) await updateStatsOnTaskCompletion(task);
            }
        } catch (error) {
            console.error('Notification button error:', error);
        } finally {
            chrome.notifications.clear(notificationId);
        }
    });

    chrome.notifications.onClicked.addListener((notificationId) => {
        chrome.notifications.clear(notificationId);
    });

    // Message handler — with sender validation
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // H-1: Only accept messages from our own extension
        if (sender.id !== chrome.runtime.id) return;

        if (message.action === MSG.CLOSE_TAB && sender.tab?.id) {
            chrome.tabs.remove(sender.tab.id);
            return;
        }

        if (message.action === MSG.CREATE_TASK) {
            // C-1: Validate and sanitize task before writing to DB
            const raw = message.task;
            if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) {
                sendResponse({ success: false, error: 'Invalid task' });
                return true;
            }
            const safeTask = {
                title: raw.title.trim().substring(0, 500),
                startTime: raw.startTime ? new Date(raw.startTime) : null,
                isCompleted: false,
                createdAt: new Date(),
                priority: ['low', 'medium', 'high', 'urgent'].includes(raw.priority) ? raw.priority : 'medium',
                url: typeof raw.url === 'string' && /^https?:\/\//.test(raw.url) ? raw.url.substring(0, 2000) : undefined,
            };
            db.tasks.add(safeTask).then(() => {
                sendResponse({ success: true });
            }).catch(() => {
                sendResponse({ success: false, error: 'DB error' });
            });
            return true;
        }

        // Content script asks if current page should be blocked
        if (message.action === MSG.CHECK_PAGE) {
            getSettings().then(settings => {
                // Use authoritative sender tab URL only — never trust message payload
                let hostname = '';
                try { hostname = new URL(sender.tab?.url || '').hostname; } catch {}
                if (!hostname) {
                    sendResponse({ needsBlock: false, needsTicker: false });
                    return;
                }
                const isSiteBlocked = settings.blacklist.some(
                    (domain: string) => hostname === domain || hostname.endsWith(`.${domain}`)
                );

                const now = new Date();
                const isScheduledBlock = settings.scheduledBlocking?.enabled &&
                    settings.scheduledBlocking.days.includes(now.getDay()) &&
                    now.getHours() >= settings.scheduledBlocking.startHour &&
                    now.getHours() < settings.scheduledBlocking.endHour;

                const needsBlock = isSiteBlocked &&
                    (settings.focusEnabled || settings.isDeepWorkActive || isScheduledBlock);
                const needsTicker = settings.isDeepWorkActive && !needsBlock;

                sendResponse({
                    needsBlock,
                    needsTicker,
                    settings: needsBlock || needsTicker ? {
                        isDeepWorkActive: settings.isDeepWorkActive,
                        deepWorkEndTime: settings.deepWorkEndTime,
                        deepWorkModeDuration: settings.deepWorkModeDuration,
                        focusEnabled: settings.focusEnabled,
                    } : null,
                });
            }).catch(() => {
                sendResponse({ needsBlock: false, needsTicker: false });
            });
            return true; // async response
        }
    });

    // Keyboard commands
    chrome.commands.onCommand.addListener((command) => {
        if (command === 'open_command_palette') {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError) return;
                const tabId = tabs[0]?.id;
                if (tabId) {
                    chrome.tabs.sendMessage(tabId, { action: MSG.TOGGLE_PALETTE }, () => {
                        // msg-check-lasterror: ignore if tab has no listener
                        if (chrome.runtime.lastError) {
                            // Content script not loaded yet — that's OK
                        }
                    });
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

        const diffMinutes = (new Date(task.startTime).getTime() - now.getTime()) / 60000;

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
    if (!settings.scheduledBlocking?.enabled) return;

    const now = new Date();
    const isWorkHours =
        settings.scheduledBlocking.days.includes(now.getDay()) &&
        now.getHours() >= settings.scheduledBlocking.startHour &&
        now.getHours() < settings.scheduledBlocking.endHour;

    if (isWorkHours && !settings.focusEnabled) {
        // Only auto-enable if user didn't manually disable it
        if (!settings.focusEnabledManually) {
            await updateSettings({ focusEnabled: true });
        }
    } else if (!isWorkHours && settings.focusEnabled && !settings.focusEnabledManually) {
        // Only auto-disable if it was auto-enabled (not manually toggled by user)
        await updateSettings({ focusEnabled: false });
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
            message,
            buttons: [
                { title: chrome.i18n.getMessage('notifSnooze') || 'Snooze 10min' },
                { title: chrome.i18n.getMessage('notifDone') || 'Done' }
            ],
            priority: 2,
            requireInteraction: true
        });
    } catch (error) {
        console.error('Notification error:', error);
    }
}

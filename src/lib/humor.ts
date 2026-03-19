// Humor messages for AyaMir
// Default tone only for MVP

const messages = {
    reminder10: [
        chrome.i18n.getMessage('msgReminder10_1'),
        chrome.i18n.getMessage('msgReminder10_2'),
        chrome.i18n.getMessage('msgReminder10_3')
    ],
    reminder5: [
        chrome.i18n.getMessage('msgReminder5_1'),
        chrome.i18n.getMessage('msgReminder5_2'),
        chrome.i18n.getMessage('msgReminder5_3')
    ],
    reminder0: [
        chrome.i18n.getMessage('msgReminder0_1'),
        chrome.i18n.getMessage('msgReminder0_2'),
        chrome.i18n.getMessage('msgReminder0_3')
    ],
    nudge: [
        chrome.i18n.getMessage('msgNudge_1'),
        chrome.i18n.getMessage('msgNudge_2'),
        chrome.i18n.getMessage('msgNudge_3'),
        chrome.i18n.getMessage('msgNudge_4')
    ],
    taskComplete: [
        chrome.i18n.getMessage('msgTaskComplete_1'),
        chrome.i18n.getMessage('msgTaskComplete_2'),
        chrome.i18n.getMessage('msgTaskComplete_3')
    ]
};

export function getHumorMessage(
    type: 'reminder10' | 'reminder5' | 'reminder0' | 'nudge' | 'taskComplete',
    taskTitle: string = ''
): string {
    const messageList = messages[type];
    const randomIndex = Math.floor(Math.random() * messageList.length);
    return messageList[randomIndex].replace('{task}', taskTitle);
}

// Humor messages for AyaMir
// Default tone only for MVP

const t = (key: string, fallback: string) => chrome.i18n.getMessage(key) || fallback;

const FALLBACKS = {
    reminder10: [
        '10 minutes until "{task}". Time to wrap up whatever you\'re pretending to do.',
        'In 10 minutes: "{task}". The clock is ticking, and so is my patience.',
        '"{task}" in 10 minutes. Just a friendly heads-up from your digital overlord.',
    ],
    reminder5: [
        '5 minutes until "{task}". This is getting serious.',
        '"{task}" in 5 minutes. No pressure, but also... pressure.',
        'T-minus 5 minutes to "{task}". Abort scrolling immediately.',
    ],
    reminder0: [
        'Time for "{task}"! No more excuses.',
        '"{task}" is NOW. The moment of truth has arrived.',
        '"{task}" o\'clock! Move it!',
    ],
    nudge: [
        'Hey, shouldn\'t you be doing "{task}" instead?',
        'This doesn\'t look like "{task}" to me...',
        'Focus mode is ON. "{task}" is waiting for you.',
        'Are you sure this is productive? "{task}" says hi.',
    ],
    taskComplete: [
        'Done! One less thing on the list.',
        'Task crushed! You\'re on fire today.',
        'Checked off! The productivity gods are pleased.',
    ],
} as const;

const I18N_KEYS: Record<string, string[]> = {
    reminder10: ['msgReminder10_1', 'msgReminder10_2', 'msgReminder10_3'],
    reminder5: ['msgReminder5_1', 'msgReminder5_2', 'msgReminder5_3'],
    reminder0: ['msgReminder0_1', 'msgReminder0_2', 'msgReminder0_3'],
    nudge: ['msgNudge_1', 'msgNudge_2', 'msgNudge_3', 'msgNudge_4'],
    taskComplete: ['msgTaskComplete_1', 'msgTaskComplete_2', 'msgTaskComplete_3'],
};

function getMessages(type: keyof typeof FALLBACKS): string[] {
    const keys = I18N_KEYS[type];
    const fallbacks = FALLBACKS[type];
    return keys.map((key, i) => t(key, fallbacks[i]));
}

export function getHumorMessage(
    type: 'reminder10' | 'reminder5' | 'reminder0' | 'nudge' | 'taskComplete',
    taskTitle: string = ''
): string {
    const messageList = getMessages(type);
    const randomIndex = Math.floor(Math.random() * messageList.length);
    return messageList[randomIndex].replace('{task}', taskTitle);
}

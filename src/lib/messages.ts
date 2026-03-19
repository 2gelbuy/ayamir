// Shared message action constants — used by background, content, and popup
export const MSG = {
    CLOSE_TAB: 'closeTab',
    CREATE_TASK: 'createTask',
    CHECK_PAGE: 'checkPage',
    TOGGLE_PALETTE: 'toggleCommandPalette',
    INJECT_BLOCK: 'injectBlockPage',
    INJECT_TICKER: 'injectTicker',
} as const;

export type MessageAction = typeof MSG[keyof typeof MSG];

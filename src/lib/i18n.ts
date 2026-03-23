export const t = (key: string, fallback = key): string =>
    chrome.i18n.getMessage(key) || fallback;

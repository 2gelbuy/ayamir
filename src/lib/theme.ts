import { getSettings } from './db';

export async function applyTheme(): Promise<void> {
    const settings = await getSettings();
    const root = document.documentElement;

    if (settings.theme === 'dark') {
        root.classList.add('dark');
    } else if (settings.theme === 'light') {
        root.classList.remove('dark');
    } else {
        // System preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }
}

export function isDarkMode(): boolean {
    return document.documentElement.classList.contains('dark');
}

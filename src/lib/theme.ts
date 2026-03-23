import { getSettings } from './db';

let themeListener: ((e: MediaQueryListEvent) => void) | null = null;

export async function applyTheme(): Promise<void> {
    const settings = await getSettings();
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    // Remove previous listener to prevent stacking
    if (themeListener) {
        mq.removeEventListener('change', themeListener);
        themeListener = null;
    }

    if (settings.theme === 'dark') {
        root.classList.add('dark');
    } else if (settings.theme === 'light') {
        root.classList.remove('dark');
    } else {
        root.classList.toggle('dark', mq.matches);
        themeListener = (e) => {
            getSettings().then(s => {
                if (s.theme === 'system') {
                    document.documentElement.classList.toggle('dark', e.matches);
                }
            });
        };
        mq.addEventListener('change', themeListener);
    }
}

export function isDarkMode(): boolean {
    return document.documentElement.classList.contains('dark');
}

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
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        root.classList.toggle('dark', mq.matches);
        mq.addEventListener('change', (e) => {
            getSettings().then(s => {
                if (s.theme === 'system') {
                    document.documentElement.classList.toggle('dark', e.matches);
                }
            });
        }, { once: false });
    }
}

export function isDarkMode(): boolean {
    return document.documentElement.classList.contains('dark');
}

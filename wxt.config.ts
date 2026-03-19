import { defineConfig } from 'wxt';

export default defineConfig({
    srcDir: 'src',
    modules: ['@wxt-dev/module-react'],
    manifest: {
        name: '__MSG_extName__', default_locale: 'en',
        description: '__MSG_extDesc__',
        version: '1.0.0',
        homepage_url: 'https://konabayev.com/ayamir',
        icons: {
            16: 'icon/16.png',
            48: 'icon/48.png',
            128: 'icon/128.png'
        },
        permissions: [
            'storage',
            'notifications',
            'alarms',
            'contextMenus',
            'tabs'
        ],
        commands: {
            _execute_action: {
                suggested_key: {
                    default: 'Ctrl+Shift+E',
                    mac: 'Command+Shift+E'
                },
                description: '__MSG_openAyamir__'
            },
            open_command_palette: {
                suggested_key: {
                    default: 'Ctrl+Shift+K',
                    mac: 'Command+Shift+K'
                },
                description: '__MSG_openPalette__'
            }
        }
    }
});

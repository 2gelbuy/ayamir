import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  publicDir: "src/public",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "__MSG_extName__",
    default_locale: "en",
    description: "__MSG_extDesc__",
    version: "1.0.3",
    homepage_url: "https://konabayev.com/ayamir/",
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
    permissions: ["storage", "notifications", "alarms", "contextMenus", "tabs"],
    browser_specific_settings: {
      gecko: {
        id: "ayamir@konabayev.com",
        strict_min_version: "109.0",
      },
      edge: {
        browser_action_next_to_addressbar: false,
      },
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: "Ctrl+Shift+E",
          mac: "Command+Shift+E",
        },
        description: "__MSG_openAyamir__",
      },
      open_command_palette: {
        suggested_key: {
          default: "Ctrl+Shift+K",
          mac: "Command+Shift+K",
        },
        description: "__MSG_openPalette__",
      },
    },
  },
});

# AyaMir

**Protect your time, build your legacy.**

AyaMir is a local-first Chrome extension for productivity and deep focus. No accounts, no cloud, no tracking — everything stays on your device.

## Features

- **Smart Task Queue** — Priority-based task management with inline editing, snooze, and animations
- **Command Palette** — `Ctrl+Shift+K` to add tasks from any page with auto-captured URL
- **Deep Work Mode** — Pomodoro timer (15/25/45/60/90 min) with circular progress ring
- **Site Blocking** — Category presets (Social, News, Entertainment, Shopping) + custom domains
- **Typing Penalty** — Must type a motivational quote to bypass blocked sites during focus
- **Scheduled Blocking** — Auto-block during configurable work hours and days
- **Ambient Sounds** — Rain, Lo-fi, Cafe, White Noise (Web Audio API, zero network)
- **Hard Lock Mode** — Cannot cancel Deep Work timer once started
- **Dark Mode** — Light / Dark / System with full component coverage
- **Gamification** — XP, 10 levels, 8 achievements, streak tracking
- **Focus Analytics** — Session history, weekly activity chart
- **Data Export/Import** — Full JSON backup and restore
- **i18n** — English, Russian, Spanish, Chinese, Hindi
- **Context Menu** — Right-click to save pages, selections, or links as tasks

## Stack

- [WXT](https://wxt.dev) (Manifest V3)
- React 18
- Tailwind CSS 3
- Dexie.js (IndexedDB)
- TypeScript

## Development

```bash
npm install
npm run dev        # Dev mode with hot reload
npm run build      # Production build
npm run zip        # Create CWS-ready ZIP
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+E` | Open AyaMir popup |
| `Ctrl+Shift+K` | Command Palette (from any page) |
| `?` | Keyboard shortcuts help |

## Privacy

AyaMir is 100% local. No servers, no accounts, no analytics. See [PRIVACY.md](PRIVACY.md).

## License

All rights reserved.

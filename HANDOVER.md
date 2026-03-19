# AyaMir Project Handover Document

## Project Overview
**AyaMir** (rebranded from EdgeTask) is a premium, local-first Chrome extension for productivity.
- **Namesake:** Ayana (Useful/Profitable) + Miras (Legacy).
- **Core Philosophy:** "Protect your time, build your legacy."
- **Version:** 1.2.0
- **Stack:** WXT (Manifest V3), React 18, Tailwind CSS 3 (dark mode), Dexie.js (IndexedDB), Playwright (E2E).

## Current Features (v1.2.0)

### Core
1. **Smart Task Management** — Priority-based queue, inline editing, snooze, delete with animations.
2. **Command Palette** — `Ctrl+Shift+Space` to add tasks from any page. Auto-captures page URL.
3. **Deep Work Mode** — Pomodoro timer with circular progress, preset durations (15/25/45/60/90min), break controls.
4. **Typing Penalty** — Users must type a motivational quote to bypass blocked sites during focus.
5. **Gamification** — XP, 10 levels, 8 achievements, streak tracking, level-up notifications.
6. **i18n** — 5 languages (EN, RU, ES, ZH_CN, HI). Auto-detects browser language.

### v1.2.0 Additions
7. **Dark Mode** — Light/dark/system toggle with full component coverage.
8. **Onboarding** — 3-step welcome flow for new users.
9. **Daily Focus Prompt** — "What's your #1 priority today?" shown once per day.
10. **Ambient Sounds** — Rain, Lo-fi, Cafe, White Noise via Web Audio API (no files).
11. **Hard Lock Mode** — Cannot cancel Deep Work timer once started.
12. **Context Menu** — Right-click page/selection/link to save as task with URL.
13. **Category Blocking** — One-click presets: Social (9 sites), News (7), Entertainment (7), Shopping (6).
14. **Scheduled Blocking** — Auto-block during configurable work hours and days.
15. **Focus Analytics** — Total sessions, focus hours, stored in `focusSessions` IndexedDB table.
16. **Weekly Activity Chart** — 7-day task completion bar chart in Stats.
17. **Data Export/Import** — JSON backup/restore of all tasks, settings, sessions.
18. **Keyboard Shortcuts Help** — Press `?` for overlay.
19. **Redesigned Settings** — 4 tabs (General/Blocking/Focus/Data), toggle switches, category grid.

## Technical Status
- **Build:** `npm run build` — compiles clean (919 KB). `npm run zip` for CWS package.
- **Database:** Dexie v3 schema — `tasks` + `focusSessions` tables. Settings via `wxt/storage`.
- **Performance:** Content script lazy-loads React in ShadowDOM only when needed.
- **Testing:** Playwright in `/e2e`, config ready for Windows/Headed.
- **Sounds:** Generated via Web Audio API oscillators/buffers — zero external resources.

## Launch Readiness
- Run `npm run zip` to generate `.output/ayamir-1.2.0-chrome.zip`.
- Extension is fully functional and CWS-ready.
- Needs: CWS listing assets (5 screenshots 1280x800, promo tiles, demo video).

## Next Steps
1. **CWS Upload** — Manual upload of ZIP to Chrome Developer Console.
2. **Landing Page** — Create `ayamir.com` (Astro recommended).
3. **Marketing** — Product Hunt launch, Reddit posts, TikTok/YouTube Shorts showcasing Typing Penalty.
4. **i18n v1.2.0** — Translate new UI strings (dark mode, onboarding, sounds, etc.) to RU/ES/ZH_CN/HI.
5. **Chrome Side Panel** — Add as alternative view mode for persistent sidebar.

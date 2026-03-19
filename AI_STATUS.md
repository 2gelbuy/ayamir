# AyaMir (formerly EdgeTask)

## Goal
AyaMir is a premium, local-first Chrome extension for productivity based on the philosophy "Protect your time, build your legacy." It includes a Command Palette, Smart Queue, Deep Work Mode (Pomodoro), Typing Penalty for blocked sites, and Gamification.

## In Progress
- None

## Next Up
- CWS listing assets (5 screenshots 1280x800, promo tiles, video).
- Upload v1.2.0 to Chrome Web Store.
- Create Landing Page (ayamir.com).
- Marketing (Product Hunt, Reddit, TikTok Typing Penalty demo).
- Localize v1.2.0 new UI strings for ru, es, zh_CN, hi.
- Chrome Side Panel API support.

## Done
- **Phase 1:** Rebranding EdgeTask to AyaMir, DB rename, content script lazy-loading, full i18n (5 languages).
- **v1.2.0 Major Upgrade:**
  - Dark Mode (light/dark/system toggle, full component coverage).
  - 3-step Onboarding flow for new users.
  - Daily Focus Prompt ("What is your #1 priority today?").
  - Ambient Sounds (rain, lo-fi, cafe, white noise via Web Audio API, no files).
  - Hard Lock Mode (cannot cancel Deep Work timer once started).
  - Context Menu (right-click page/selection/link to save as task with URL).
  - Category-Based Site Blocking (Social 9, News 7, Entertainment 7, Shopping 6).
  - Scheduled Blocking (auto-block during configurable work hours/days).
  - Focus Session Analytics (total sessions, hours, IndexedDB focusSessions table).
  - Weekly Activity Chart (7-day bar chart in Stats).
  - Data Export/Import (JSON backup/restore for all data).
  - Keyboard Shortcuts Help overlay (press ?).
  - Redesigned Settings (4 tabs: General/Blocking/Focus/Data, toggle switches).
  - Circular timer with SVG progress ring in Deep Work.
  - Duration presets (15/25/45/60/90min) and break controls.
  - Task completion animations (green flash, scale, slide-out delete).
  - Priority dot cycling in task input.
  - URL links on tasks from context menu.
  - XP badges on completed tasks.
  - Improved block page (dark gradient, Shield icon, timer during deep work).
  - Improved command palette (gradient branding, priority dots, click-outside-close).
  - Level badge in header, done today counter.
  - DB v3 (focusSessions table), backward-compatible settings merge.
  - CWS-optimized description, manifest contextMenus permission, version bump to 1.2.0.
- **Repo Cleanup:** Removed .output/, .wxt/, .test-user-data/, test-results/, playwright-report/, _backup_future_features/, .env.production, AI config files from git. Updated .gitignore.
- Updated HANDOVER.md with v1.2.0 status.

## Key Decisions
- **Stack:** WXT (Manifest V3), React 18, Tailwind CSS 3 (dark mode class-based), Dexie.js, Playwright.
- **Architecture:** Lazy-loading content script, ShadowDOM isolation, alarm-based reminders.
- **Dark Mode:** Tailwind darkMode class with system preference detection.
- **Ambient Sounds:** Web Audio API oscillators/buffers, zero external files or network.
- **Session Tracking:** Separate focusSessions Dexie table, decoupled from task data.
- **No Cloud:** Local-first. Export/import JSON for portability. No accounts, no servers.

<!-- AUTO:GIT_LOG -->
## Recent Commits
```
5a2e77d auto: .output/chrome-mv3/_locales/en/messages.json, .output/chrome-mv3/asse...
e5c7de7 feat(core): rebranding to AyaMir, content script lazy-loading, and full i18n localization
5899ddf Clean up repository: remove build artifacts, logs, and archives
bcdbc09 Bump package.json version to 1.1.0
1cbceb2 Merge remote changes and resolve conflicts in manifest and background script
66a4a51 Fix critical MV3 issues, sync logic, and build errors
39f0659 Release v1.1.0
c6d786f Create v1.1.0 tag
a1386b5 Add CHANGELOG.md
c99f8be v1.1.0: Security fixes and stability improvements
```
<!-- /AUTO:GIT_LOG -->


<!-- AUTO:GIT_STATUS -->
## Uncommitted Changes
Branch: `main`
```
D  .env.production
D  .gemini/context.md
 M .gitignore
D  .output/chrome-mv3/_locales/en/messages.json
D  .output/chrome-mv3/_locales/es/messages.json
D  .output/chrome-mv3/_locales/hi/messages.json
D  .output/chrome-mv3/_locales/ru/messages.json
D  .output/chrome-mv3/_locales/zh_CN/messages.json
D  .output/chrome-mv3/assets/popup-DkT6pr0Y.css
D  .output/chrome-mv3/background.js
D  .output/chrome-mv3/chunks/popup-Cr-cshmj.js
D  .output/chrome-mv3/content-scripts/content.css
D  .output/chrome-mv3/content-scripts/content.js
D  .output/chrome-mv3/icon/128.png
D  .output/chrome-mv3/icon/16.png
D  .output/chrome-mv3/icon/48.png
D  .output/chrome-mv3/icon/icon.svg
D  .output/chrome-mv3/manifest.json
D  .output/chrome-mv3/popup.html
D  .test-user-data/BrowserMetrics/BrowserMetrics-69BA4C77-450C.pma
D  .test-user-data/Crashpad/settings.dat
D  ".test-user-data/Default/Account Web Data"
D  ".test-user-data/Default/Account Web Data-journal"
D  ".test-user-data/Default/Affiliation Database"
D  ".test-user-data/Default/Affiliation Database-journal"
```
<!-- /AUTO:GIT_STATUS -->

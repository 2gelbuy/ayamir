# AyaMir (formerly EdgeTask)

## Goal
AyaMir is a premium, local-first Chrome extension for productivity based on the philosophy "Protect your time, build your legacy." It includes a Command Palette, Smart Queue, Deep Work Mode (Pomodoro), Typing Penalty for blocked sites, and Gamification.

## In Progress
- Handoff to the next AI agent.

## Next Up
- Setup of API keys and preparation for manual upload to Chrome Web Store.
- Create Landing Page (`ayamir.com`).
- Marketing strategy execution (Product Hunt, Reddit).

## Done
- Initial setup and handover received.
- **Phase 1 Complete:** Full rebranding from EdgeTask to AyaMir. Database renamed to avoid collisions.
- **Phase 1 Complete:** Optimized Content Script to lazy-load React UI only when necessary, saving user RAM and improving performance.
- **i18n Localization:** Translated the entire extension interface to 5 Tier-1 languages (English, Russian, Spanish, Chinese Simplified, Hindi).
- **i18n Deep Coverage:** Translated stats, achievements logic, push-notification logic (humor scripts), settings modals, and gamification tiers.
- **Save State:** Committed all changes to Git and updated `HANDOVER.md` for the next AI agent.

## Key Decisions
- **Stack:** WXT (Manifest V3), React, Tailwind CSS (Glassmorphism UI), Dexie.js (IndexedDB), Playwright (E2E Testing).
- **Architecture:** Lazy-loading the content script React tree through custom events to minimize memory footprint on all URLs.
- **Localization:** Used Chrome native `_locales` (i18n API) populated automatically during build to seamlessly render text based on the user's browser language. Hardcoded strings entirely removed.

<!-- AUTO:GIT_LOG -->
## Recent Commits
```
e5c7de7 feat(core): rebranding to AyaMir, content script lazy-loading, and full i18n localization
5899ddf Clean up repository: remove build artifacts, logs, and archives
bcdbc09 Bump package.json version to 1.1.0
1cbceb2 Merge remote changes and resolve conflicts in manifest and background script
66a4a51 Fix critical MV3 issues, sync logic, and build errors
39f0659 Release v1.1.0
c6d786f Create v1.1.0 tag
a1386b5 Add CHANGELOG.md
c99f8be v1.1.0: Security fixes and stability improvements
c27833c Add SPEC.md and CI workflow
```
<!-- /AUTO:GIT_LOG -->


<!-- AUTO:GIT_STATUS -->
## Uncommitted Changes
Branch: `main`
```
M .output/chrome-mv3/_locales/en/messages.json
 D .output/chrome-mv3/assets/popup-ueh644fm.css
 M .output/chrome-mv3/background.js
 D .output/chrome-mv3/chunks/popup-B6Qc-lqx.js
 M .output/chrome-mv3/content-scripts/content.css
 M .output/chrome-mv3/content-scripts/content.js
 M .output/chrome-mv3/manifest.json
 M .output/chrome-mv3/popup.html
 M .wxt/types/i18n.d.ts
 M .wxt/types/imports.d.ts
 M AI_STATUS.md
 M package-lock.json
 M package.json
 M src/components/DeepWorkMode.tsx
 M src/components/Settings.tsx
 M src/components/Stats.tsx
 M src/components/TaskInput.tsx
 M src/components/TaskItem.tsx
 M src/components/TaskList.tsx
 M src/entrypoints/background.ts
 M src/entrypoints/content.tsx
 M src/entrypoints/popup/App.tsx
 M src/entrypoints/popup/index.html
 M src/lib/db.ts
 M src/public/_locales/en/messages.json
```
<!-- /AUTO:GIT_STATUS -->

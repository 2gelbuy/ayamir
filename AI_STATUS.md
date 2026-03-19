# AyaMir (formerly EdgeTask)

## Goal
AyaMir is a premium, local-first Chrome extension for productivity based on the philosophy "Protect your time, build your legacy." It includes a Command Palette, Smart Queue, Deep Work Mode (Pomodoro), Typing Penalty for blocked sites, and Gamification.

## In Progress
- Setup of API keys and preparation for manual upload to Chrome Web Store.

## Next Up
- Create Landing Page (`ayamir.com`).
- Marketing strategy execution (Product Hunt, Reddit).

## Done
- Initial setup and handover received.
- **Phase 1 Complete:** Full rebranding from EdgeTask to AyaMir. Database renamed to avoid collisions.
- **Phase 1 Complete:** Optimized Content Script to lazy-load React UI only when necessary, saving user RAM and improving performance.
- **i18n Localization:** Translated the entire extension interface to 5 Tier-1 languages (English, Russian, Spanish, Chinese Simplified, Hindi).
- **i18n Deep Coverage:** Translated stats, achievements logic, push-notification logic (humor scripts), settings modals, and gamification tiers.

## Key Decisions
- **Stack:** WXT (Manifest V3), React, Tailwind CSS (Glassmorphism UI), Dexie.js (IndexedDB), Playwright (E2E Testing).
- **Architecture:** Lazy-loading the content script React tree through custom events to minimize memory footprint on all URLs.
- **Localization:** Used Chrome native `_locales` (i18n API) populated automatically during build to seamlessly render text based on the user's browser language. Hardcoded strings entirely removed.

<!-- AUTO:GIT_LOG -->
<!-- AUTO:GIT_STATUS -->
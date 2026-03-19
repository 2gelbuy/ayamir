# AyaMir Project Handover Document

## 🚀 Project Overview
**AyaMir** (rebranded from EdgeTask) is a premium, local-first Chrome extension for productivity.
- **Namesake:** Ayana (Useful/Profitable) + Miras (Legacy).
- **Core Philosophy:** "Protect your time, build your legacy."
- **Stack:** WXT (Manifest V3), React, Tailwind CSS (Glassmorphism UI), Dexie.js (IndexedDB), Playwright (E2E Testing).

## ✨ Current Features (Implemented)
1.  **Command Palette:** Global shortcut `Ctrl+Shift+Space` to add tasks from any website without opening the popup.
2.  **Smart Queue:** Advanced sorting algorithm based on Priority, Deadlines, and Start Time.
3.  **Deep Work Mode:** Pomodoro timer with a floating "Focus Ticker" widget visible on all websites.
4.  **Typing Penalty (Smart Friction):** To bypass blocked sites (YouTube, etc.), users must manually type a complex quote.
5.  **Gamification:** Fully integrated RPG system with XP, Levels, and Achievements ("Early Bird", "Speed Demon").
6.  **Modern UI:** High-end Glassmorphism design with an XP progress bar at the top of the popup.
7.  **i18n Localization (NEW):** Full support for 5 Tier-1 languages (English, Russian, Spanish, Chinese Simplified, Hindi). Automatically detects browser language.

## 🛠 Technical Status
- **Build System:** WXT is configured and working. Icons are in `src/public/icon`.
- **Database:** Dexie DB renamed to `ayamir`. Handles tasks; `wxt/storage` (chrome.storage.local) handles settings.
- **Performance (NEW):** `content.tsx` lazy-loads the React UI. ShadowDOM is injected only when a site is blocked or the command palette is invoked, saving significant user RAM.
- **Testing:** Playwright infrastructure is set up in `/e2e`. Config is ready for Windows/Headed testing.
- **Deployment:** `npm run zip` generates the production package. `npm run submit` is configured for automatic CWS updates.

## 📦 Launch Readiness
- **Production ZIP:** `.output/ayamir-1.0.0-chrome.zip` is ready for the first manual upload (run `npm run zip` to generate the latest one).
- **Store Metadata:** Detailed RU/EN descriptions are provided in the chat history and mission docs.
- **API Config:** `.env.production` template is created. Needs Client ID, Secret, and Refresh Token.

## ⏭ Next Steps for the Next LLM
1.  **First Upload:** Guide the user through the manual upload of the ZIP to Chrome Developer Console to get the `Extension ID`.
2.  **API Integration:** Help populate `.env.production` once the user has the keys so `npm run submit` starts working.
3.  **Domain Setup:** Assist with landing page content and setup for `ayamir.com` (using Astro or Next.js).
4.  **Marketing:** Execute the Product Hunt and Reddit launch strategy outlined in the brainstorming session.

---
*Signed by OpenCode / Gemini 3.1 Pro (Pre-Launch Architect)*
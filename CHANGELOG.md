# Changelog

All notable changes to AyaMir will be documented in this file.

## [1.1.1] - 2024-12-14

### Security
- Fixed XSS vulnerability in `visualFeedback.ts` by replacing innerHTML with textContent
- Fixed innerHTML usage in `edgePanel.ts` close button
- Moved `identity` permission to `optional_permissions` (CWS compliance)
- Removed `http://*/*` from `web_accessible_resources` matches

### Added
- `PRIVACY.md` for Chrome Web Store compliance
- `.env.example` for developer onboarding

### Fixed
- npm audit vulnerabilities (6 → 2 remaining moderate in esbuild/vite)
- Removed unnecessary `declare const chrome` in sync.ts

## [1.1.0] - 2025-12-09

### Security
- Removed overly broad `<all_urls>` from `host_permissions` to comply with least privilege principle
- Fixed XSS vulnerability by replacing `innerHTML` with safe DOM manipulation in content scripts

### Fixed
- Notification "Snooze" and "Done" buttons now actually work
- Service Worker now properly re-creates alarms on wake-up
- Message listeners return `true` for async responses to prevent context invalidation
- Replaced dynamic imports with static imports in content scripts for MV3 CSP compliance

### Changed
- Version bumped to 1.1.0

## [1.0.0] - 2025-10-07

### Added
- Initial release
- Edge panel hover functionality
- Ticker progress bar with color indicators
- Smart pause functionality
- Quick actions (drag-to-reorder, swipe gestures)
- Enhanced humor system with contextual awareness
- Mini-analytics dashboard
- Chrome Storage Sync API for cross-device sync
- Focus streaks and gamification
- Smart task queue with priority sorting
- Calendar integration (Google Calendar)
- Silent/deep work mode
- Notification system with actions
- Keyboard navigation
- Snooze functionality
- Visual feedback for interactions
- Accessibility improvements (ARIA labels)

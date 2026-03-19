# AyaMir — SPEC (machine-friendly)

This SPEC.md extracts the `Spec Kit` from the PRD and translates it into concise engineering contracts, data shapes, messaging, telemetry events and acceptance tests for implementation and CI.

## 1) Feature contract
- Purpose: Edge-panel + Tasks + Focus + Nudges + Ticker
- Inputs: user actions (create/update/delete task), time (startTime), domain lists (black/white), settings (tone, pinMode), system events (alarms, commands)
- Outputs: chrome.notifications, DOM overlay (ticker), in-panel UI updates, storage updates, telemetry events
- Failure modes: storage unavailable, Notifications API denied, race on sync — must surface in-panel fallback and report telemetry error

## 2) Data shapes
Task (TypeScript):
```ts
interface Task {
  id: string; // uuid
  title: string;
  notes?: string;
  startTime?: string | null; // ISO
  durationMinutes?: number | null;
  isCompleted: boolean;
  isFocusTask: boolean;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
  notifiedAt10?: boolean;
  notifiedAt5?: boolean;
  notifiedAt0?: boolean;
  snoozedUntil?: string | null; // ISO or null
}
```

Storage keys:
- `tasks`: Task[]
- `settings`: { humorTone: string, pinMode: 'soft'|'hard', syncEnabled: boolean, blackList: string[], whiteList: string[] }
- `telemetry`: { lastSentAt?: string }

## 3) Background worker contract
- Alarm: `checkReminders` runs every minute; scans tasks, computes reminder timings (10/5/0), and creates notifications with action buttons (Snooze, Done).
- Command handling: hotkeys trigger messages to active tab to toggle panel or toggle focus.
- Requirements:
  - Reminders delivered within ±30s of target time (P95)
  - Notifications include buttons and fire telemetry events when interacted with

## 4) Messaging (content ↔ panel ↔ background)
- Message envelope: { type: string, payload?: any, requestId?: string }
- Background → Panel:
  - INIT: { tasks, settings }
  - TOGGLE_PANEL
  - SHOW_TICKER: { taskId, remainingMs }
- Panel → Background/Content:
  - CREATE_TASK: { title, startTime?, durationMinutes? }
  - UPDATE_TASK: Task
  - TOGGLE_FOCUS: { taskId }
  - SNOOZE_TASK: { taskId, minutes }
- All messages require acknowledgement: { ok: boolean, error?: string }

## 5) Telemetry (minimal schema)
- Prefix: `ayamir.`
- Event examples:
  - `ayamir.panel.opened` { source }
  - `ayamir.task.created` { taskIdHash, titleLength }
  - `ayamir.notification.shown` { taskIdHash?, timing }
  - `ayamir.notification.clicked` { taskIdHash?, action }
  - `ayamir.nudge.shown` { domain }
  - `ayamir.settings.changed` { key }
- Privacy: do NOT send raw task titles unless user explicitly opt-in to anonymized telemetry; prefer hashed tokens or length buckets.

## 6) Acceptance tests (unit + E2E)
- Create task -> saved to storage -> visible in panel
- Task with startTime -> reminders fire at 10/5/0 -> notifications shown
- Notification action: Snooze -> `snoozedUntil` updated
- Toggle focus -> ticker appears and blacklisted domain triggers nudge only when focus enabled
- Hotkey and hover open/close behaviors for panel
- Fallback: if Notifications disabled, show in-panel toast

## 7) Performance budgets
- Panel first paint < 300ms (P95)
- Background check routine < 50ms average
- Content script memory < 20MB per tab

## 8) Security & Privacy
- Default analytics OFF; explicit opt-in required
- Tasks stored locally by default; sync only when user enables
- Content scripts must avoid collecting page content or PII
- CSP and sandboxing for iframe panel

## 9) CI / build contracts
- npm scripts expected (if present):
  - `npm run build` -> compiles TS + bundles (tsc && vite build)
  - `npm run lint` -> eslint
  - `npm run test` -> jest (optional)
  - `npm run pack` -> produce dist ZIP for store (optional)
- CI should run: install, lint, test (if present), build, upload artifact (dist.zip)

## 10) Quickstart for devs
1. npm ci
2. npm run build
3. Load `dist/` as unpacked extension in Chrome (for local testing)

---
Created from AyaMir PRD Spec Kit (October 2025).

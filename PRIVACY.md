# Privacy Policy — AyaMir Chrome Extension

**Effective date:** 2026-03-20
**Last updated:** 2026-03-20

---

## Overview

AyaMir is a 100% local-first productivity extension for Google Chrome. It includes a task manager, Pomodoro timer, website blocker, and gamification features. This policy explains how AyaMir handles your data — in short: it does not collect, transmit, or share any data whatsoever.

---

## Data Collection

**AyaMir collects no data.**

- No personal information is collected.
- No usage analytics are recorded.
- No crash reports are sent.
- No telemetry of any kind is transmitted.
- No third-party analytics, tracking, or advertising SDKs are included.

---

## Data Storage

All data created by AyaMir (tasks, timer settings, blocked sites, points, preferences) is stored exclusively on your local device using:

- **IndexedDB** (via the Dexie library) — for structured application data such as tasks and history.
- **chrome.storage.local** — for extension settings and preferences.

This data never leaves your device. It is not synced to any server, cloud service, or external system. It is not accessible by the extension developer or any third party.

---

## Network Requests

AyaMir makes **zero network requests**. The extension operates fully offline and does not connect to any external server, API, or service at any time.

---

## Permissions

AyaMir requests the following Chrome permissions. Each is used solely for the stated local purpose:

| Permission | Why it is needed |
|---|---|
| `storage` | Saves your tasks, settings, and preferences to your local device via chrome.storage.local. |
| `notifications` | Displays local desktop notifications when a Pomodoro session ends or a timer fires. No notification data is sent anywhere. |
| `alarms` | Schedules Pomodoro timers and reminders in the background. All alarms are processed locally. |
| `contextMenus` | Adds an optional right-click menu entry for quickly creating tasks. No menu interaction data is recorded. |

No permission is used to access browsing history, read page content, capture keystrokes, or observe user behavior.

---

## Data Sharing

AyaMir does not share data with anyone because it does not collect data in the first place. There are no third-party services, affiliates, advertisers, or data brokers involved in any part of this extension.

---

## Children's Privacy

AyaMir does not collect any information from any user, including children under the age of 13. There is nothing to collect.

---

## Changes to This Policy

If the extension is updated in a way that changes data handling practices, this policy will be updated and the effective date revised. Given the local-first design, no meaningful change is anticipated.

---

## Open Source

AyaMir is open source under the MIT License. You can review all source code at:

**https://github.com/2gelbuy/ayamir**

Transparency through open source is the strongest guarantee that this policy is accurate.

---

## Contact

If you have questions about this privacy policy, open an issue on the GitHub repository:

**https://github.com/2gelbuy/ayamir/issues**

# Privacy Policy for AyaMir

**Last Updated:** March 19, 2026

## Overview

AyaMir is a local-first Chrome extension for productivity and focus management. We are committed to protecting your privacy.

## Data Collection

### What We Collect
- **Task data:** Your tasks, focus sessions, and settings are stored locally on your device
- **Settings preferences:** Your theme, blocked sites, focus preferences, and notification settings

### What We DO NOT Collect
- No personal identifying information (name, email, address)
- No browsing history or visited URLs
- No passwords or sensitive credentials
- No analytics or usage tracking data
- No data sent to external servers

## Data Storage

All data is stored locally using:
- **IndexedDB (Dexie):** For tasks and focus sessions
- **Chrome Storage API:** For extension settings

**No data leaves your device. AyaMir has no server, no accounts, no cloud sync.**

## Permissions Explained

| Permission | Why We Need It |
|------------|----------------|
| `storage` | Save your tasks, settings, and focus sessions locally |
| `notifications` | Send task reminders and focus session alerts |
| `alarms` | Schedule reminder checks and focus timers |
| `activeTab` | Detect when you're on a blocked site during focus |
| `scripting` | Show focus mode overlays and typing penalty |
| `tabs` | Communicate between popup and content scripts |
| `contextMenus` | Right-click to save pages/text as tasks |

## Third-Party Services

AyaMir does not use any third-party services and does not share your data with anyone.

## Data Export & Deletion

You have full control over your data:
- **Export:** Use Settings > Data > Export to download a JSON backup of all your data
- **Import:** Use Settings > Data > Import to restore from a backup
- **Delete:** Uninstall the extension to remove all locally stored data

## Children's Privacy

AyaMir is not intended for children under 13 years of age.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last Updated" date.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository.

---

**AyaMir v1.2.0**
*Protect your time, build your legacy.*

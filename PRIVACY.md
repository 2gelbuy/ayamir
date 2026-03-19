# Privacy Policy for EdgeTask

**Last Updated:** December 14, 2024

## Overview

EdgeTask is a browser extension that helps you manage tasks and stay focused. We are committed to protecting your privacy.

## Data Collection

### What We Collect
- **Task data:** Your tasks, reminders, and settings are stored locally on your device
- **Settings preferences:** Your chosen humor tone, blacklist/whitelist domains, and notification preferences

### What We DO NOT Collect
- ❌ Personal identifying information (name, email, address)
- ❌ Browsing history or visited URLs
- ❌ Passwords or sensitive credentials
- ❌ Analytics or usage tracking data
- ❌ Any data sent to external servers (except optional sync features)

## Data Storage

All data is stored locally using:
- **IndexedDB (Dexie):** For tasks and settings
- **Chrome Storage API:** For sync between devices (if enabled by user)

**No data is sent to external servers unless you explicitly enable sync features.**

## Optional Features

### Chrome Sync
If you enable Chrome Sync, your data is synced through Google's Chrome Sync API. This data is encrypted and managed by Google according to their privacy policy.

### Google Calendar Integration
If you connect Google Calendar, we request permission to:
- Read your calendar events
- Create calendar entries for your tasks

We only access calendar data when you explicitly use this feature.

## Permissions Explained

| Permission | Why We Need It |
|------------|----------------|
| `storage` | Save your tasks and settings locally |
| `notifications` | Send task reminders |
| `alarms` | Schedule reminder checks |
| `activeTab` | Detect when you're on a blocked site |
| `scripting` | Show focus mode overlays |
| `tabs` | Communicate with content scripts |

## Third-Party Services

EdgeTask does not share your data with third parties. Optional integrations:
- **Google Calendar:** Only when you explicitly connect
- **Chrome Sync:** Only when you enable it in settings

## Data Deletion

To delete all your data:
1. Open EdgeTask Options page
2. Click "Clear Data"
3. Uninstall the extension

This will remove all locally stored data.

## Children's Privacy

EdgeTask is not intended for children under 13 years of age.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last Updated" date.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository.

---

**EdgeTask v1.1.0**  
*A task manager that doesn't take itself too seriously.*

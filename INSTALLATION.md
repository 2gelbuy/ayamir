# EdgeTask Installation Guide

## Load the Extension in Chrome

Follow these steps to install EdgeTask in your Chrome browser:

### Step 1: Build the Extension

```bash
npm install
npm run build
```

This will create a `dist` folder with all the extension files.

### Step 2: Open Chrome Extensions

1. Open Google Chrome
2. Navigate to `chrome://extensions/` in the address bar
3. Or click the menu (three dots) → More Tools → Extensions

### Step 3: Enable Developer Mode

In the top-right corner of the Extensions page, toggle on **Developer mode**.

### Step 4: Load the Extension

1. Click the **Load unpacked** button (appears after enabling Developer mode)
2. Navigate to your project folder
3. Select the `dist` folder
4. Click **Select Folder**

### Step 5: Verify Installation

You should see the EdgeTask extension card appear with:
- Extension icon
- Name: "EdgeTask"
- Version: 1.0.0
- Description: "Browser productivity tool with a humorous approach to task management"

### Step 6: Start Using EdgeTask

#### Option A: Click the Extension Icon
- Click the EdgeTask icon in your Chrome toolbar
- The side panel will open with the task management interface

#### Option B: Use Keyboard Shortcut
- Press `Ctrl+Shift+E` (Windows/Linux) or `Cmd+Shift+E` (Mac)
- The side panel will toggle open/closed

## First-Time Setup

1. **Add Your First Task**
   - Type a task name in the input field at the top
   - Optionally check "Set start time" to add a deadline
   - Click "Add" or press Enter

2. **Set a Focus Task**
   - Click the target icon (🎯) on any task
   - This becomes your active focus task
   - You'll see it highlighted in green at the top of the panel

3. **Configure Settings**
   - Click the gear icon in the top-right
   - Choose your preferred humor tone
   - Set nudge mode (soft or hard)
   - Add domains to your blacklist or whitelist
   - Adjust sound settings

## Features to Try

### Reminders
- Set a start time for a task
- You'll get humorous notifications at:
  - 10 minutes before
  - 5 minutes before
  - At the start time

### Ticker Banner
- With a focused task that has a start time
- Visit any website
- A countdown banner appears at the top showing time remaining
- It auto-hides after 10 seconds (hover to keep it visible)

### Anti-Procrastination Nudges
- Set a focus task
- Visit a site in your blacklist (YouTube, Reddit, etc.)
- You'll see a humorous nudge:
  - **Soft mode**: Banner at bottom-right
  - **Hard mode**: Full-page block with message

### Keyboard Shortcuts
- `Ctrl+Shift+E` (or `Cmd+Shift+E`): Toggle side panel
- `Ctrl+Shift+F` (or `Cmd+Shift+F`): Toggle focus on current task

## Troubleshooting

### Extension Not Showing Up
- Make sure you selected the `dist` folder, not the root project folder
- Check that all files exist in the dist folder (manifest.json, background.js, content.js, etc.)
- Try reloading the extension: click the reload icon on the extension card

### Side Panel Not Opening
- Make sure you're using Chrome version 114 or later (side panel API requirement)
- Try clicking the extension icon in the toolbar
- Check the keyboard shortcut isn't conflicting with another extension

### Reminders Not Working
- Check that Chrome has permission to show notifications
- Click the extension details and ensure "Notifications" permission is granted
- Make sure the task has a future start time set

### Nudges Not Appearing
- Ensure you have a focused task set (green highlight in panel)
- Check that the current website domain is in your blacklist
- Verify the site isn't in your whitelist

### Console Errors
- Right-click the extension icon → Inspect popup → Check Console tab
- Or go to `chrome://extensions/` → Click "Errors" button on EdgeTask card

## Updating the Extension

After making code changes:

1. Run `npm run build` again
2. Go to `chrome://extensions/`
3. Click the reload icon on the EdgeTask card
4. The extension will reload with your changes

## Permissions Explained

EdgeTask requires these permissions:

- **storage** - Save tasks and settings locally
- **notifications** - Show reminder notifications
- **alarms** - Schedule reminders to check tasks
- **activeTab** - Interact with the current page for nudges
- **scripting** - Inject ticker and nudge elements
- **host_permissions** - Access websites to show ticker/nudges

All permissions are used solely for the extension's core functionality. No data is sent to external servers unless you enable cloud sync (future feature).

## Uninstalling

To remove EdgeTask:

1. Go to `chrome://extensions/`
2. Find the EdgeTask card
3. Click "Remove"
4. Confirm removal

Your local data (tasks and settings) will be deleted with the extension.

---

Enjoy your productive (and humorous) workflow! 🎯

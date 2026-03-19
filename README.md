# AyaMir Extension

AyaMir is a smart task management extension for Microsoft Edge that helps you stay productive with a humorous approach to task management.

## Features

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
- Improved notification system with proper actions
- Keyboard navigation throughout the app
- Proper snooze functionality
- Visual feedback for all interactions
- Performance optimization
- Error handling and logging
- Accessibility improvements (ARIA labels)
- Unit and integration tests

## Installation

### From Source

1. Clone this repository:
   ```
   git clone https://github.com/your-username/ayamir-extension.git
   cd ayamir-extension
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the extension:
   ```
   npm run build
   ```

4. Load the extension in Edge:
   - Open Edge and navigate to `edge://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `dist` folder from the project

## Development

### Running in Development Mode

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Load the extension in Edge using the `dist` folder as described above.

### Making Changes

After making changes to the source code, run `npm run build` to rebuild the extension, then reload it in Edge.

## Configuration

### General Settings

- Enable/disable notifications
- Set humor tone (default, polite, sarcastic)

### Deep Work Mode

- Configure work duration (default: 25 minutes)
- Configure break duration (default: 5 minutes)

### Calendar Integration

- Connect to Google Calendar to sync tasks

### Keyboard Shortcuts

- `Ctrl+Shift+E` (or `Cmd+Shift+E` on Mac): Toggle edge panel
- `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac): Toggle focus mode
- `Ctrl+Shift+N` (or `Cmd+Shift+N` on Mac): Create new task
- `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac): Snooze current task
- `Ctrl+Shift+C` (or `Cmd+Shift+C` on Mac): Complete current task

## Data Management

You can export and import your data from the options page:

1. Right-click the AyaMir icon in the toolbar
2. Select "Options"
3. Use the "Export Data" and "Import Data" buttons

## Troubleshooting

### Extension Won't Load

1. Make sure you've built the extension with `npm run build`
2. Check that all files are present in the `dist` folder
3. Look for error messages in the Edge extensions page

### Notifications Not Working

1. Make sure notifications are enabled in the extension settings
2. Check that Edge has permission to show notifications
3. Verify that notifications are enabled in your system settings

### Calendar Integration Not Working

1. Make sure you're signed in to your Google account in Edge
2. Check that you've authorized the extension to access your calendar
3. Try reconnecting to Google Calendar from the options page

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.

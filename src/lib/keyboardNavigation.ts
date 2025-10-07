// Keyboard navigation service for EdgeTask

// Type declarations for DOM APIs
declare const document: any;

// Keyboard event types
export type KeyboardAction = 
  | 'navigate_up'
  | 'navigate_down'
  | 'navigate_left'
  | 'navigate_right'
  | 'select'
  | 'complete_task'
  | 'delete_task'
  | 'edit_task'
  | 'new_task'
  | 'toggle_focus'
  | 'toggle_pause'
  | 'open_settings'
  | 'open_analytics'
  | 'open_gamification'
  | 'open_calendar'
  | 'open_deep_work'
  | 'search'
  | 'escape'
  | 'help';

// Keyboard shortcut interface
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: KeyboardAction;
  description: string;
}

// Default keyboard shortcuts
export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { key: 'ArrowUp', action: 'navigate_up', description: 'Navigate up' },
  { key: 'ArrowDown', action: 'navigate_down', description: 'Navigate down' },
  { key: 'ArrowLeft', action: 'navigate_left', description: 'Navigate left' },
  { key: 'ArrowRight', action: 'navigate_right', description: 'Navigate right' },
  { key: 'Enter', action: 'select', description: 'Select focused item' },
  { key: 'Space', action: 'select', description: 'Select focused item' },
  { key: 'Escape', action: 'escape', description: 'Cancel/close current view' },
  
  // Task actions
  { key: 'c', ctrlKey: true, action: 'complete_task', description: 'Complete selected task' },
  { key: 'd', ctrlKey: true, action: 'delete_task', description: 'Delete selected task' },
  { key: 'e', ctrlKey: true, action: 'edit_task', description: 'Edit selected task' },
  { key: 'n', ctrlKey: true, action: 'new_task', description: 'Create new task' },
  
  // App actions
  { key: 'f', ctrlKey: true, action: 'toggle_focus', description: 'Toggle focus mode' },
  { key: 'p', ctrlKey: true, action: 'toggle_pause', description: 'Toggle pause' },
  { key: ',', ctrlKey: true, action: 'open_settings', description: 'Open settings' },
  { key: 'a', ctrlKey: true, action: 'open_analytics', description: 'Open analytics' },
  { key: 'g', ctrlKey: true, action: 'open_gamification', description: 'Open gamification' },
  { key: 'c', ctrlKey: true, altKey: true, action: 'open_calendar', description: 'Open calendar' },
  { key: 'd', ctrlKey: true, altKey: true, action: 'open_deep_work', description: 'Open deep work mode' },
  
  // Search
  { key: '/', action: 'search', description: 'Search tasks' },
  
  // Help
  { key: '?', action: 'help', description: 'Show keyboard shortcuts' }
];

// Keyboard navigation state
export interface KeyboardNavigationState {
  enabled: boolean;
  focusedElement: string | null;
  focusedIndex: number;
  shortcuts: KeyboardShortcut[];
}

// Get keyboard shortcuts from storage
export const getKeyboardShortcuts = async (): Promise<KeyboardShortcut[]> => {
  try {
    const result = await chrome.storage.local.get(['keyboardShortcuts']);
    return result.keyboardShortcuts || DEFAULT_KEYBOARD_SHORTCUTS;
  } catch (error) {
    console.error('Error getting keyboard shortcuts:', error);
    return DEFAULT_KEYBOARD_SHORTCUTS;
  }
};

// Update keyboard shortcuts
export const updateKeyboardShortcuts = async (shortcuts: KeyboardShortcut[]): Promise<void> => {
  try {
    await chrome.storage.local.set({ keyboardShortcuts: shortcuts });
  } catch (error) {
    console.error('Error updating keyboard shortcuts:', error);
  }
};

// Get keyboard navigation state
export const getKeyboardNavigationState = async (): Promise<KeyboardNavigationState> => {
  try {
    const result = await chrome.storage.local.get(['keyboardNavigationState']);
    return result.keyboardNavigationState || {
      enabled: true,
      focusedElement: null,
      focusedIndex: 0,
      shortcuts: DEFAULT_KEYBOARD_SHORTCUTS
    };
  } catch (error) {
    console.error('Error getting keyboard navigation state:', error);
    return {
      enabled: true,
      focusedElement: null,
      focusedIndex: 0,
      shortcuts: DEFAULT_KEYBOARD_SHORTCUTS
    };
  }
};

// Update keyboard navigation state
export const updateKeyboardNavigationState = async (state: Partial<KeyboardNavigationState>): Promise<void> => {
  try {
    const currentState = await getKeyboardNavigationState();
    const newState = { ...currentState, ...state };
    await chrome.storage.local.set({ keyboardNavigationState: newState });
  } catch (error) {
    console.error('Error updating keyboard navigation state:', error);
  }
};

// Handle keyboard event
export const handleKeyboardEvent = async (event: KeyboardEvent, callback: (action: KeyboardAction, event: KeyboardEvent) => void): Promise<void> => {
  try {
    const state = await getKeyboardNavigationState();
    
    if (!state.enabled) return;
    
    // Find matching shortcut
    const matchingShortcut = state.shortcuts.find(shortcut => {
      return (
        shortcut.key === event.key &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.shiftKey === event.shiftKey
      );
    });
    
    if (matchingShortcut) {
      event.preventDefault();
      callback(matchingShortcut.action, event);
    }
  } catch (error) {
    console.error('Error handling keyboard event:', error);
  }
};

// Initialize keyboard navigation
export const initializeKeyboardNavigation = (callback: (action: KeyboardAction, event: KeyboardEvent) => void): () => void => {
  const handleKeyDown = (event: KeyboardEvent) => {
    handleKeyboardEvent(event, callback);
  };
  
  document.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};

// Check if an element is focusable
export const isFocusable = (element: Element): boolean => {
  if (!element || element.disabled) return false;
  
  const tagName = element.tagName.toLowerCase();
  const tabIndex = element.getAttribute('tabindex');
  const hasTabIndex = tabIndex !== null && parseInt(tabIndex, 10) >= 0;
  
  // Elements that are naturally focusable
  const isNaturallyFocusable = [
    'a',
    'button',
    'input',
    'textarea',
    'select',
    'details'
  ].includes(tagName);
  
  // Elements with tabindex >= 0
  const hasTabIndexAttribute = hasTabIndex;
  
  // Contenteditable elements
  const isContentEditable = element.getAttribute('contenteditable') === 'true';
  
  return isNaturallyFocusable || hasTabIndexAttribute || isContentEditable;
};

// Get all focusable elements in a container
export const getFocusableElements = (container: Element = document.body): Element[] => {
  const focusableElements = Array.from(container.querySelectorAll('*')).filter(isFocusable);
  return focusableElements;
};

// Focus the next element in a container
export const focusNextElement = (container: Element = document.body, currentElement?: Element): Element | null => {
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length === 0) return null;
  
  let currentIndex = 0;
  
  if (currentElement) {
    currentIndex = focusableElements.indexOf(currentElement);
    if (currentIndex === -1) currentIndex = 0;
  }
  
  const nextIndex = (currentIndex + 1) % focusableElements.length;
  const nextElement = focusableElements[nextIndex];
  
  (nextElement as HTMLElement).focus();
  return nextElement;
};

// Focus the previous element in a container
export const focusPreviousElement = (container: Element = document.body, currentElement?: Element): Element | null => {
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length === 0) return null;
  
  let currentIndex = 0;
  
  if (currentElement) {
    currentIndex = focusableElements.indexOf(currentElement);
    if (currentIndex === -1) currentIndex = 0;
  }
  
  const prevIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
  const prevElement = focusableElements[prevIndex];
  
  (prevElement as HTMLElement).focus();
  return prevElement;
};

// Create a keyboard shortcut help dialog
export const createKeyboardShortcutsHelp = (): HTMLElement => {
  const dialog = document.createElement('div');
  dialog.className = 'edgetask-keyboard-shortcuts-help';
  dialog.innerHTML = `
    <div class="edgetask-keyboard-shortcuts-help-content">
      <div class="edgetask-keyboard-shortcuts-help-header">
        <h2>Keyboard Shortcuts</h2>
        <button class="edgetask-keyboard-shortcuts-help-close" aria-label="Close">&times;</button>
      </div>
      <div class="edgetask-keyboard-shortcuts-help-body">
        <table class="edgetask-keyboard-shortcuts-help-table">
          <thead>
            <tr>
              <th>Shortcut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <!-- Shortcuts will be populated here -->
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .edgetask-keyboard-shortcuts-help {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    
    .edgetask-keyboard-shortcuts-help-content {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .edgetask-keyboard-shortcuts-help-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #eaeaea;
    }
    
    .edgetask-keyboard-shortcuts-help-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .edgetask-keyboard-shortcuts-help-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    
    .edgetask-keyboard-shortcuts-help-close:hover {
      background-color: #f0f0f0;
    }
    
    .edgetask-keyboard-shortcuts-help-body {
      padding: 16px;
      overflow-y: auto;
    }
    
    .edgetask-keyboard-shortcuts-help-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .edgetask-keyboard-shortcuts-help-table th,
    .edgetask-keyboard-shortcuts-help-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #eaeaea;
    }
    
    .edgetask-keyboard-shortcuts-help-table th {
      font-weight: 600;
    }
    
    .edgetask-keyboard-shortcut-key {
      font-family: monospace;
      background-color: #f0f0f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 14px;
    }
  `;
  
  document.head.appendChild(style);
  
  // Populate shortcuts
  const populateShortcuts = async () => {
    const shortcuts = await getKeyboardShortcuts();
    const tbody = dialog.querySelector('tbody');
    
    shortcuts.forEach(shortcut => {
      const row = document.createElement('tr');
      
      const keyCell = document.createElement('td');
      const keyParts = [];
      
      if (shortcut.ctrlKey) keyParts.push('Ctrl');
      if (shortcut.altKey) keyParts.push('Alt');
      if (shortcut.shiftKey) keyParts.push('Shift');
      
      keyParts.push(shortcut.key);
      
      keyCell.innerHTML = keyParts.map(part => 
        `<span class="edgetask-keyboard-shortcut-key">${part}</span>`
      ).join(' + ');
      
      const actionCell = document.createElement('td');
      actionCell.textContent = shortcut.description;
      
      row.appendChild(keyCell);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });
  };
  
  populateShortcuts();
  
  // Add close functionality
  const closeBtn = dialog.querySelector('.edgetask-keyboard-shortcuts-help-close');
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(dialog);
    document.head.removeChild(style);
  });
  
  // Close on escape
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      document.body.removeChild(dialog);
      document.head.removeChild(style);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  
  document.addEventListener('keydown', handleEscape);
  
  // Close on background click
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      document.body.removeChild(dialog);
      document.head.removeChild(style);
      document.removeEventListener('keydown', handleEscape);
    }
  });
  
  return dialog;
};

// Show keyboard shortcuts help
export const showKeyboardShortcutsHelp = (): void => {
  const helpDialog = createKeyboardShortcutsHelp();
  document.body.appendChild(helpDialog);
  
  // Focus the close button
  const closeBtn = helpDialog.querySelector('.edgetask-keyboard-shortcuts-help-close') as HTMLElement;
  if (closeBtn) {
    closeBtn.focus();
  }
};
// Accessibility service for EdgeTask

// Type declarations for DOM APIs
declare const document: any;

// ARIA roles and properties
export interface ARIAAttributes {
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean | string;
  'aria-busy'?: boolean;
  'aria-relevant'?: string;
  'aria-dropeffect'?: string;
  'aria-grabbed'?: boolean;
  'aria-activedescendant'?: string;
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-multiselectable'?: boolean;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-readonly'?: boolean;
  'aria-keyshortcuts'?: string;
  'aria-roledescription'?: string;
  'aria-pressed'?: boolean;
  'aria-modal'?: boolean | string;
  'aria-valuenow'?: number;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  draggable?: string;
}

// Focus management
export class FocusManager {
  private focusableElements: HTMLElement[] = [];
  private previousFocus: HTMLElement | null = null;
  private focusTrap: HTMLElement | null = null;

  // Get all focusable elements in a container
  getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'details',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }

  // Save the current focused element
  saveFocus(): void {
    this.previousFocus = document.activeElement as HTMLElement;
  }

  // Restore focus to the previously focused element
  restoreFocus(): void {
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
  }

  // Set focus to the first focusable element in a container
  setFocusToFirst(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  // Set focus to the last focusable element in a container
  setFocusToLast(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }

  // Create a focus trap within a container
  createFocusTrap(container: HTMLElement): () => void {
    this.focusTrap = container;
    const focusableElements = this.getFocusableElements(container);

    if (focusableElements.length === 0) return () => { };

    // Save current focus
    this.saveFocus();

    // Set focus to the first element
    focusableElements[0].focus();

    // Handle tab key to keep focus within the container
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      this.restoreFocus();
      this.focusTrap = null;
    };
  }
}

// Screen reader announcements
export class ScreenReaderAnnouncer {
  private announcer: HTMLElement | null = null;

  constructor() {
    this.createAnnouncer();
  }

  // Create the announcer element
  private createAnnouncer(): void {
    this.announcer = document.createElement('div');
    if (!this.announcer) return;
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.setAttribute('aria-hidden', 'false');
    this.announcer.style.position = 'absolute';
    this.announcer.style.left = '-10000px';
    this.announcer.style.width = '1px';
    this.announcer.style.height = '1px';
    this.announcer.style.overflow = 'hidden';

    document.body.appendChild(this.announcer);
  }

  // Announce a message to screen readers
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcer) return;

    // Update aria-live if needed
    if (this.announcer.getAttribute('aria-live') !== priority) {
      this.announcer.setAttribute('aria-live', priority);
    }

    // Clear the announcer and add the new message
    this.announcer.textContent = '';

    // Use setTimeout to ensure the screen reader picks up the change
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = message;
      }
    }, 100);
  }

  // Announce a message with high priority
  assertive(message: string): void {
    this.announce(message, 'assertive');
  }

  // Announce a message with normal priority
  polite(message: string): void {
    this.announce(message, 'polite');
  }
}

// ARIA utilities
export class ARIAUtils {
  // Set ARIA attributes on an element
  static setAttributes(element: HTMLElement, attributes: ARIAAttributes): void {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(key, value.toString());
      } else {
        element.removeAttribute(key);
      }
    });
  }

  // Add proper ARIA labels to a button
  static labelButton(element: HTMLElement, label: string, isPressed?: boolean, isDisabled?: boolean): void {
    this.setAttributes(element, {
      'aria-label': label,
      'aria-pressed': isPressed,
      'aria-disabled': isDisabled,
      'role': 'button'
    });
  }

  // Add proper ARIA labels to a form input
  static labelInput(element: HTMLElement, label: string, isRequired?: boolean, isValid?: boolean): void {
    this.setAttributes(element, {
      'aria-label': label,
      'aria-required': isRequired || false,
      'aria-invalid': isValid === false ? true : undefined,
      'role': 'textbox'
    });
  }

  // Add proper ARIA labels to a dialog
  static labelDialog(element: HTMLElement, title: string, description?: string): void {
    this.setAttributes(element, {
      'role': 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': `${title}-label`,
      'aria-describedby': description ? `${title}-description` : undefined
    });
  }

  // Add proper ARIA labels to a list
  static labelList(element: HTMLElement, label: string, isMultiSelect?: boolean): void {
    this.setAttributes(element, {
      'role': 'list',
      'aria-label': label,
      'aria-multiselectable': isMultiSelect || false
    });
  }

  // Add proper ARIA labels to a navigation menu
  static labelNavigation(element: HTMLElement, label: string): void {
    this.setAttributes(element, {
      'role': 'navigation',
      'aria-label': label
    });
  }

  // Add proper ARIA labels to a progress bar
  static labelProgressBar(element: HTMLElement, label: string, value: number, max: number = 100): void {
    this.setAttributes(element, {
      'role': 'progressbar',
      'aria-label': label,
      'aria-valuenow': value,
      'aria-valuemin': 0,
      'aria-valuemax': max
    });
  }

  // Add proper ARIA labels to a timer
  static labelTimer(element: HTMLElement, label: string, timeRemaining: string): void {
    this.setAttributes(element, {
      'role': 'timer',
      'aria-label': `${label}, ${timeRemaining} remaining`
    });
  }

  // Add proper ARIA labels to a status message
  static labelStatus(element: HTMLElement, label: string, isLive: boolean = true): void {
    this.setAttributes(element, {
      'role': 'status',
      'aria-live': isLive ? 'polite' : 'off',
      'aria-atomic': 'true',
      'aria-label': label
    });
  }

  // Add proper ARIA labels to a tooltip
  static labelTooltip(element: HTMLElement, label: string, isHidden: boolean = true): void {
    this.setAttributes(element, {
      'role': 'tooltip',
      'aria-hidden': isHidden,
      'aria-label': label
    });
  }

  // Add proper ARIA labels to a draggable element
  static labelDraggable(element: HTMLElement, label: string, isGrabbed: boolean = false): void {
    this.setAttributes(element, {
      'aria-label': label,
      'aria-grabbed': isGrabbed,
      'draggable': 'true'
    });
  }

  // Add proper ARIA labels to a droppable element
  static labelDroppable(element: HTMLElement, label: string, dropEffect: string = 'move'): void {
    this.setAttributes(element, {
      'aria-label': label,
      'aria-dropeffect': dropEffect
    });
  }
}

// High contrast mode utilities
export class HighContrastUtils {
  // Check if high contrast mode is enabled
  static isHighContrastMode(): boolean {
    // Check for Windows high contrast mode
    if (window.matchMedia) {
      return window.matchMedia('(prefers-contrast: high)').matches ||
        window.matchMedia('(-ms-high-contrast: active)').matches;
    }
    return false;
  }

  // Apply high contrast styles
  static applyHighContrastStyles(): void {
    if (!this.isHighContrastMode()) return;

    const style = document.createElement('style');
    style.id = 'high-contrast-styles';
    style.textContent = `
      .edgetask-app {
        filter: contrast(1.5);
      }
      
      .edgetask-button {
        border: 2px solid !important;
        background: ButtonFace !important;
        color: ButtonText !important;
      }
      
      .edgetask-button:hover {
        background: Highlight !important;
        color: HighlightText !important;
      }
      
      .edgetask-input {
        border: 2px solid ButtonText !important;
        background: Window !important;
        color: WindowText !important;
      }
      
      .edgetask-task {
        border: 1px solid ButtonText !important;
        background: Window !important;
        color: WindowText !important;
      }
      
      .edgetask-task.completed {
        text-decoration: line-through !important;
      }
      
      .edgetask-focus-indicator {
        outline: 2px solid Highlight !important;
        outline-offset: 2px !important;
      }
    `;

    document.head.appendChild(style);
  }

  // Remove high contrast styles
  static removeHighContrastStyles(): void {
    const style = document.getElementById('high-contrast-styles');
    if (style) {
      document.head.removeChild(style);
    }
  }
}

// Reduced motion utilities
export class ReducedMotionUtils {
  // Check if reduced motion is preferred
  static isReducedMotionPreferred(): boolean {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  // Apply reduced motion styles
  static applyReducedMotionStyles(): void {
    if (!this.isReducedMotionPreferred()) return;

    const style = document.createElement('style');
    style.id = 'reduced-motion-styles';
    style.textContent = `
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;

    document.head.appendChild(style);
  }

  // Remove reduced motion styles
  static removeReducedMotionStyles(): void {
    const style = document.getElementById('reduced-motion-styles');
    if (style) {
      document.head.removeChild(style);
    }
  }
}

// Keyboard navigation utilities
export class KeyboardNavigationUtils {
  // Handle keyboard navigation for a list
  static handleListNavigation(event: KeyboardEvent, currentIndex: number, maxIndex: number): number {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex;
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < maxIndex ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = maxIndex;
        break;
      case 'PageUp':
        event.preventDefault();
        newIndex = Math.max(0, currentIndex - 5);
        break;
      case 'PageDown':
        event.preventDefault();
        newIndex = Math.min(maxIndex, currentIndex + 5);
        break;
    }

    return newIndex;
  }

  // Handle keyboard navigation for a grid
  static handleGridNavigation(
    event: KeyboardEvent,
    currentIndex: number,
    maxIndex: number,
    columns: number
  ): number {
    let newIndex = currentIndex;
    const row = Math.floor(currentIndex / columns);
    const col = currentIndex % columns;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        newIndex = row > 0 ? currentIndex - columns : currentIndex;
        break;
      case 'ArrowDown':
        event.preventDefault();
        newIndex = row < Math.floor(maxIndex / columns) ?
          Math.min(currentIndex + columns, maxIndex) : currentIndex;
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = col > 0 ? currentIndex - 1 : currentIndex;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = col < columns - 1 && currentIndex < maxIndex ? currentIndex + 1 : currentIndex;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = row * columns;
        break;
      case 'End':
        event.preventDefault();
        newIndex = Math.min((row + 1) * columns - 1, maxIndex);
        break;
      case 'PageUp':
        event.preventDefault();
        newIndex = Math.max(0, currentIndex - columns * 5);
        break;
      case 'PageDown':
        event.preventDefault();
        newIndex = Math.min(maxIndex, currentIndex + columns * 5);
        break;
    }

    return newIndex;
  }
}

// Create instances
export const focusManager = new FocusManager();
export const screenReaderAnnouncer = new ScreenReaderAnnouncer();

// Initialize accessibility features
export const initializeAccessibility = (): void => {
  // Apply high contrast styles if needed
  HighContrastUtils.applyHighContrastStyles();

  // Apply reduced motion styles if needed
  ReducedMotionUtils.applyReducedMotionStyles();

  // Listen for changes in preference
  if (window.matchMedia) {
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    highContrastQuery.addListener(() => {
      HighContrastUtils.removeHighContrastStyles();
      HighContrastUtils.applyHighContrastStyles();
    });

    reducedMotionQuery.addListener(() => {
      ReducedMotionUtils.removeReducedMotionStyles();
      ReducedMotionUtils.applyReducedMotionStyles();
    });
  }

  // Announce that the app is ready
  screenReaderAnnouncer.polite('EdgeTask application ready');
};

// Add accessibility attributes to an element
export const addAccessibilityAttributes = (
  element: HTMLElement,
  attributes: ARIAAttributes
): void => {
  ARIAUtils.setAttributes(element, attributes);
};

// Make an element focusable
export const makeFocusable = (element: HTMLElement, tabIndex: number = 0): void => {
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', tabIndex.toString());
  }
};

// Make an element not focusable
export const makeNotFocusable = (element: HTMLElement): void => {
  element.setAttribute('tabindex', '-1');
};

// Add a skip link for keyboard navigation
export const addSkipLink = (targetId: string, label: string = 'Skip to main content'): void => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = label;
  skipLink.className = 'skip-link';
  skipLink.setAttribute('aria-label', label);

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .skip-link {
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 10000;
      transition: top 0.3s;
    }
    
    .skip-link:focus {
      top: 6px;
    }
  `;

  document.head.appendChild(style);
  document.body.insertBefore(skipLink, document.body.firstChild);
};
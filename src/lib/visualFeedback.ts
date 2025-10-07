// Visual feedback service for EdgeTask

// Type declarations for DOM APIs
declare const document: any;

// Feedback types
export type FeedbackType = 
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'loading';

// Feedback options
export interface FeedbackOptions {
  type: FeedbackType;
  message: string;
  duration?: number; // in milliseconds, 0 for persistent
  position?: 'top' | 'bottom' | 'center';
  showIcon?: boolean;
  showProgress?: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
}

// Active feedback elements
const activeFeedbackElements = new Map<string, HTMLElement>();

// Create a feedback element
export const createFeedback = (options: FeedbackOptions): string => {
  const id = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create feedback element
  const feedbackElement = document.createElement('div');
  feedbackElement.id = id;
  feedbackElement.className = `edgetask-feedback edgetask-feedback-${options.type}`;
  
  // Set position
  let positionClass = '';
  switch (options.position) {
    case 'top':
      positionClass = 'edgetask-feedback-top';
      break;
    case 'bottom':
      positionClass = 'edgetask-feedback-bottom';
      break;
    case 'center':
      positionClass = 'edgetask-feedback-center';
      break;
    default:
      positionClass = 'edgetask-feedback-top';
  }
  
  feedbackElement.classList.add(positionClass);
  
  // Create content
  let content = '';
  
  // Add icon
  if (options.showIcon !== false) {
    let icon = '';
    switch (options.type) {
      case 'success':
        icon = '<svg class="edgetask-feedback-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
        break;
      case 'error':
        icon = '<svg class="edgetask-feedback-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
        break;
      case 'warning':
        icon = '<svg class="edgetask-feedback-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
        break;
      case 'info':
        icon = '<svg class="edgetask-feedback-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        break;
      case 'loading':
        icon = '<div class="edgetask-feedback-spinner"></div>';
        break;
    }
    content += icon;
  }
  
  // Add message
  content += `<div class="edgetask-feedback-message">${options.message}</div>`;
  
  // Add action button
  if (options.action) {
    content += `<button class="edgetask-feedback-action">${options.action.label}</button>`;
  }
  
  // Add progress bar
  if (options.showProgress && options.duration && options.duration > 0) {
    content += '<div class="edgetask-feedback-progress"><div class="edgetask-feedback-progress-bar"></div></div>';
  }
  
  feedbackElement.innerHTML = content;
  
  // Add styles if not already added
  if (!document.querySelector('#edgetask-feedback-styles')) {
    const style = document.createElement('style');
    style.id = 'edgetask-feedback-styles';
    style.textContent = `
      .edgetask-feedback {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 90%;
        width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
      }
      
      .edgetask-feedback-top {
        top: 20px;
      }
      
      .edgetask-feedback-bottom {
        bottom: 20px;
      }
      
      .edgetask-feedback-center {
        top: 50%;
        transform: translate(-50%, -50%);
      }
      
      .edgetask-feedback-show {
        opacity: 1;
        pointer-events: auto;
      }
      
      .edgetask-feedback-success {
        background-color: #10b981;
        color: white;
      }
      
      .edgetask-feedback-error {
        background-color: #ef4444;
        color: white;
      }
      
      .edgetask-feedback-warning {
        background-color: #f59e0b;
        color: white;
      }
      
      .edgetask-feedback-info {
        background-color: #3b82f6;
        color: white;
      }
      
      .edgetask-feedback-loading {
        background-color: #6b7280;
        color: white;
      }
      
      .edgetask-feedback-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      
      .edgetask-feedback-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: edgetask-feedback-spin 1s ease-in-out infinite;
        flex-shrink: 0;
      }
      
      @keyframes edgetask-feedback-spin {
        to { transform: rotate(360deg); }
      }
      
      .edgetask-feedback-message {
        flex: 1;
      }
      
      .edgetask-feedback-action {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        color: white;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      
      .edgetask-feedback-action:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .edgetask-feedback-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 0 0 8px 8px;
        overflow: hidden;
      }
      
      .edgetask-feedback-progress-bar {
        height: 100%;
        background: rgba(255, 255, 255, 0.8);
        width: 100%;
        transform-origin: left;
        animation: edgetask-feedback-progress linear;
      }
      
      @keyframes edgetask-feedback-progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }
      
      .edgetask-ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: edgetask-ripple 0.6s ease-out;
        pointer-events: none;
      }
      
      @keyframes edgetask-ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add to DOM
  document.body.appendChild(feedbackElement);
  
  // Store in active elements
  activeFeedbackElements.set(id, feedbackElement);
  
  // Add action button event listener
  if (options.action) {
    const actionButton = feedbackElement.querySelector('.edgetask-feedback-action');
    if (actionButton) {
      actionButton.addEventListener('click', () => {
        options.action.callback();
        removeFeedback(id);
      });
    }
  }
  
  // Show animation
  setTimeout(() => {
    feedbackElement.classList.add('edgetask-feedback-show');
  }, 10);
  
  // Set progress bar animation
  if (options.showProgress && options.duration && options.duration > 0) {
    const progressBar = feedbackElement.querySelector('.edgetask-feedback-progress-bar');
    if (progressBar) {
      progressBar.style.animationDuration = `${options.duration}ms`;
    }
  }
  
  // Auto-remove after duration
  if (options.duration && options.duration > 0) {
    setTimeout(() => {
      removeFeedback(id);
    }, options.duration);
  }
  
  return id;
};

// Remove a feedback element
export const removeFeedback = (id: string): void => {
  const feedbackElement = activeFeedbackElements.get(id);
  
  if (feedbackElement) {
    feedbackElement.classList.remove('edgetask-feedback-show');
    
    setTimeout(() => {
      if (feedbackElement.parentNode) {
        feedbackElement.parentNode.removeChild(feedbackElement);
      }
      activeFeedbackElements.delete(id);
    }, 300);
  }
};

// Remove all feedback elements
export const removeAllFeedback = (): void => {
  const ids = Array.from(activeFeedbackElements.keys());
  ids.forEach(id => removeFeedback(id));
};

// Show success feedback
export const showSuccessFeedback = (message: string, duration: number = 3000): string => {
  return createFeedback({
    type: 'success',
    message,
    duration
  });
};

// Show error feedback
export const showErrorFeedback = (message: string, duration: number = 5000): string => {
  return createFeedback({
    type: 'error',
    message,
    duration
  });
};

// Show warning feedback
export const showWarningFeedback = (message: string, duration: number = 4000): string => {
  return createFeedback({
    type: 'warning',
    message,
    duration
  });
};

// Show info feedback
export const showInfoFeedback = (message: string, duration: number = 3000): string => {
  return createFeedback({
    type: 'info',
    message,
    duration
  });
};

// Show loading feedback
export const showLoadingFeedback = (message: string): string => {
  return createFeedback({
    type: 'loading',
    message,
    duration: 0 // persistent until manually removed
  });
};

// Create a ripple effect on an element
export const createRipple = (element: HTMLElement, event: MouseEvent): void => {
  const ripple = document.createElement('span');
  ripple.className = 'edgetask-ripple';
  
  // Get the position of the click
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  
  // Add to element
  element.appendChild(ripple);
  
  // Remove after animation
  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple);
    }
  }, 600);
};

// Add ripple effect to buttons
export const addRippleEffect = (): void => {
  // Add styles if not already added
  if (!document.querySelector('#edgetask-ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'edgetask-ripple-styles';
    style.textContent = `
      .edgetask-ripple-container {
        position: relative;
        overflow: hidden;
      }
      
      .edgetask-ripple-container .edgetask-ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: edgetask-ripple 0.6s ease-out;
        pointer-events: none;
      }
      
      @keyframes edgetask-ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add ripple effect to all buttons
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    if (!button.classList.contains('edgetask-ripple-container')) {
      button.classList.add('edgetask-ripple-container');
      
      button.addEventListener('click', (e: MouseEvent) => {
        createRipple(button, e);
      });
    }
  });
};

// Add hover effect to interactive elements
export const addHoverEffect = (): void => {
  // Add styles if not already added
  if (!document.querySelector('#edgetask-hover-styles')) {
    const style = document.createElement('style');
    style.id = 'edgetask-hover-styles';
    style.textContent = `
      .edgetask-hover-lift {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .edgetask-hover-lift:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      .edgetask-hover-scale {
        transition: transform 0.2s ease;
      }
      
      .edgetask-hover-scale:hover {
        transform: scale(1.05);
      }
      
      .edgetask-hover-glow {
        transition: box-shadow 0.2s ease;
      }
      
      .edgetask-hover-glow:hover {
        box-shadow: 0 0 8px rgba(79, 70, 229, 0.5);
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add hover effects to interactive elements
  const interactiveElements = document.querySelectorAll('button, a, .task-item');
  interactiveElements.forEach((element, index) => {
    // Add different hover effects based on element type
    if (element.tagName === 'BUTTON') {
      element.classList.add('edgetask-hover-lift');
    } else if (element.classList.contains('task-item')) {
      element.classList.add('edgetask-hover-glow');
    } else {
      element.classList.add(index % 2 === 0 ? 'edgetask-hover-lift' : 'edgetask-hover-scale');
    }
  });
};

// Add focus effect to form elements
export const addFocusEffect = (): void => {
  // Add styles if not already added
  if (!document.querySelector('#edgetask-focus-styles')) {
    const style = document.createElement('style');
    style.id = 'edgetask-focus-styles';
    style.textContent = `
      .edgetask-focus-highlight {
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      
      .edgetask-focus-highlight:focus {
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
        outline: none;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add focus effects to form elements
  const formElements = document.querySelectorAll('input, textarea, select');
  formElements.forEach(element => {
    element.classList.add('edgetask-focus-highlight');
  });
};

// Initialize visual feedback
export const initializeVisualFeedback = (): void => {
  addRippleEffect();
  addHoverEffect();
  addFocusEffect();
};

// Add visual feedback to a specific element
export const addVisualFeedbackToElement = (element: HTMLElement, effects: string[] = ['hover']): void => {
  // Make sure styles are added
  if (!document.querySelector('#edgetask-hover-styles')) {
    addHoverEffect();
  }
  
  if (!document.querySelector('#edgetask-focus-styles')) {
    addFocusEffect();
  }
  
  if (!document.querySelector('#edgetask-ripple-styles')) {
    addRippleEffect();
  }
  
  // Add requested effects
  effects.forEach(effect => {
    switch (effect) {
      case 'hover':
        element.classList.add('edgetask-hover-lift');
        break;
      case 'scale':
        element.classList.add('edgetask-hover-scale');
        break;
      case 'glow':
        element.classList.add('edgetask-hover-glow');
        break;
      case 'focus':
        element.classList.add('edgetask-focus-highlight');
        break;
      case 'ripple':
        element.classList.add('edgetask-ripple-container');
        element.addEventListener('click', (e: MouseEvent) => {
          createRipple(element, e);
        });
        break;
    }
  });
};
import { useEffect, useRef } from 'react';
import { 
  KeyboardAction, 
  initializeKeyboardNavigation, 
  updateKeyboardNavigationState,
  focusNextElement,
  focusPreviousElement,
  showKeyboardShortcutsHelp
} from '../lib/keyboardNavigation';

interface KeyboardNavigationProps {
  onAction: (action: KeyboardAction) => void;
  enabled?: boolean;
}

export default function KeyboardNavigation({ onAction, enabled = true }: KeyboardNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Initialize keyboard navigation
    const handleAction = async (action: KeyboardAction, event: KeyboardEvent) => {
      // Update focused element state
      const activeElement = document.activeElement;
      if (activeElement) {
        await updateKeyboardNavigationState({
          focusedElement: activeElement.id || activeElement.tagName,
          focusedIndex: Array.from(
            containerRef.current?.querySelectorAll('*') || []
          ).indexOf(activeElement)
        });
      }

      // Handle navigation actions
      if (action === 'navigate_up' || action === 'navigate_down') {
        event.preventDefault();
        
        if (action === 'navigate_up') {
          focusPreviousElement(containerRef.current || undefined, activeElement || undefined);
        } else {
          focusNextElement(containerRef.current || undefined, activeElement || undefined);
        }
        return;
      }

      // Handle help action
      if (action === 'help') {
        event.preventDefault();
        showKeyboardShortcutsHelp();
        return;
      }

      // Pass other actions to parent component
      onAction(action);
    };

    // Set up keyboard navigation
    cleanupRef.current = initializeKeyboardNavigation(handleAction);

    // Clean up on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [enabled, onAction]);

  return (
    <div ref={containerRef} className="edgetask-keyboard-navigation-container">
      {/* This component doesn't render anything visible */}
      {/* It just sets up keyboard navigation for its children */}
    </div>
  );
}
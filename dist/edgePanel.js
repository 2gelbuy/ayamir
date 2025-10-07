let edgePanel: HTMLElement | null = null;
let edgePanelTimeout: number | null = null;
let isPanelOpen = false;
let isMouseAtEdge = false;
let lastMousePosition = { x: 0, y: 0 };
const EDGE_THRESHOLD = 15; // pixels from edge
const PANEL_WIDTH = 360; // pixels
const HOVER_DELAY = 300; // milliseconds before showing panel

// Type declarations for Chrome APIs
declare const chrome: any;

const createEdgePanel = () => {
  if (edgePanel) return;

  edgePanel = document.createElement('div');
  edgePanel.id = 'edgetask-edge-panel';
  edgePanel.className = 'edgetask-edge-panel';
  
  // Create iframe for the panel content
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('index.html');
  iframe.className = 'edgetask-edge-panel-iframe';
  edgePanel.appendChild(iframe);

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'edgetask-edge-panel-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', hideEdgePanel);
  edgePanel.appendChild(closeBtn);

  document.body.appendChild(edgePanel);
};

const showEdgePanel = () => {
  if (isPanelOpen) return;
  
  createEdgePanel();
  isPanelOpen = true;
  
  if (edgePanel) {
    edgePanel.classList.add('edgetask-edge-panel-visible');
  }
};

const hideEdgePanel = () => {
  if (!isPanelOpen) return;
  
  if (edgePanel) {
    edgePanel.classList.remove('edgetask-edge-panel-visible');
    setTimeout(() => {
      if (edgePanel && edgePanel.parentNode) {
        edgePanel.parentNode.removeChild(edgePanel);
        edgePanel = null;
      }
    }, 200);
  }
  
  isPanelOpen = false;
  isMouseAtEdge = false;
};

const handleMouseMove = (e: MouseEvent) => {
  lastMousePosition = { x: e.clientX, y: e.clientY };
  
  const isAtLeftEdge = e.clientX <= EDGE_THRESHOLD;
  const isAtRightEdge = e.clientX >= window.innerWidth - EDGE_THRESHOLD;
  
  const wasAtEdge = isMouseAtEdge;
  isMouseAtEdge = isAtLeftEdge || isAtRightEdge;
  
  if (isMouseAtEdge && !wasAtEdge) {
    // Mouse just entered the edge zone
    if (edgePanelTimeout) {
      clearTimeout(edgePanelTimeout);
    }
    
    edgePanelTimeout = setTimeout(() => {
      if (isMouseAtEdge) {
        showEdgePanel();
      }
    }, HOVER_DELAY);
  } else if (!isMouseAtEdge && wasAtEdge) {
    // Mouse left the edge zone
    if (edgePanelTimeout) {
      clearTimeout(edgePanelTimeout);
      edgePanelTimeout = null;
    }
    
    // Check if mouse is not over the panel
    if (isPanelOpen && edgePanel) {
      const rect = edgePanel.getBoundingClientRect();
      const isOverPanel = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      
      if (!isOverPanel) {
        hideEdgePanel();
      }
    }
  }
};

const handleMouseLeave = () => {
  if (edgePanelTimeout) {
    clearTimeout(edgePanelTimeout);
    edgePanelTimeout = null;
  }
  
  isMouseAtEdge = false;
  
  // Hide panel if mouse leaves the window
  setTimeout(() => {
    if (isPanelOpen && edgePanel) {
      const rect = edgePanel.getBoundingClientRect();
      const isMouseNearPanel = (
        lastMousePosition.x >= rect.left - 50 &&
        lastMousePosition.x <= rect.right + 50 &&
        lastMousePosition.y >= rect.top - 50 &&
        lastMousePosition.y <= rect.bottom + 50
      );
      
      if (!isMouseNearPanel) {
        hideEdgePanel();
      }
    }
  }, 1000);
};

// Initialize event listeners
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseleave', handleMouseLeave);

// Handle keyboard shortcut
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
    e.preventDefault();
    if (isPanelOpen) {
      hideEdgePanel();
    } else {
      showEdgePanel();
    }
  }
});

// Handle messages from background script
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.action === 'togglePanel') {
    if (isPanelOpen) {
      hideEdgePanel();
    } else {
      showEdgePanel();
    }
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (edgePanelTimeout) {
    clearTimeout(edgePanelTimeout);
  }
  hideEdgePanel();
});
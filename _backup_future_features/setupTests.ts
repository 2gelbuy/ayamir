// Test setup for EdgeTask

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn(path => `chrome-extension://test-id/${path}`)
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  alarms: {
    create: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    clear: jest.fn(),
    clearAll: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  }
};

// Set up global Chrome mock
Object.defineProperty(window, 'chrome', {
  value: mockChrome,
  writable: true
});

// Mock IndexedDB
const mockDB = {
  transaction: jest.fn(),
  objectStore: jest.fn(),
  add: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  openCursor: jest.fn()
};

// Mock Dexie
jest.mock('dexie', () => {
  return {
    Dexie: jest.fn().mockImplementation(() => {
      return {
        version: jest.fn().returns({
          stores: jest.fn().returns({
            tasks: mockDB
          })
        }),
        tasks: mockDB,
        open: jest.fn(),
        close: jest.fn()
      };
    })
  };
});

// Mock fetch
global.fetch = jest.fn();

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  },
  writable: true
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));

// Mock cancelAnimationFrame
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset Chrome mock
  Object.keys(mockChrome).forEach(key => {
    if (typeof mockChrome[key] === 'object' && mockChrome[key] !== null) {
      Object.keys(mockChrome[key]).forEach(subKey => {
        if (typeof mockChrome[key][subKey] === 'function') {
          mockChrome[key][subKey].mockReset();
        }
      });
    } else if (typeof mockChrome[key] === 'function') {
      mockChrome[key].mockReset();
    }
  });
  
  // Reset localStorage mock
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
  
  // Reset sessionStorage mock
  sessionStorageMock.getItem.mockReset();
  sessionStorageMock.setItem.mockReset();
  sessionStorageMock.removeItem.mockReset();
  sessionStorageMock.clear.mockReset();
  
  // Reset fetch mock
  if (global.fetch) {
    (global.fetch as jest.Mock).mockReset();
  }
  
  // Reset performance mock
  if (window.performance.now) {
    (window.performance.now as jest.Mock).mockReset();
  }
});

// Test utilities
export const createMockTask = (overrides = {}) => ({
  id: 1,
  title: 'Test Task',
  isCompleted: false,
  createdAt: new Date(),
  startTime: new Date(Date.now() + 3600000), // 1 hour from now
  ...overrides
});

export const createMockSettings = (overrides = {}) => ({
  notificationsEnabled: true,
  deepWorkModeDuration: 25,
  deepWorkModeBreakDuration: 5,
  humorTone: 'default',
  ...overrides
});

export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));
// Mock chrome APIs for vitest
const chromeMock = {
  i18n: {
    getMessage: (key: string) => '',
  },
  runtime: {
    id: 'test-extension-id',
    getURL: (path: string) => `chrome-extension://test/${path}`,
    lastError: null,
    sendMessage: () => {},
    onMessage: { addListener: () => {} },
    onInstalled: { addListener: () => {} },
  },
  storage: {
    onChanged: { addListener: () => {} },
    local: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
  },
  notifications: {
    create: () => {},
    clear: () => {},
    onButtonClicked: { addListener: () => {} },
    onClicked: { addListener: () => {} },
  },
  alarms: {
    create: () => {},
    onAlarm: { addListener: () => {} },
  },
  contextMenus: {
    create: () => {},
    onClicked: { addListener: () => {} },
  },
  tabs: {
    query: () => {},
    remove: () => {},
    create: () => {},
    sendMessage: () => {},
  },
  commands: {
    onCommand: { addListener: () => {} },
  },
};

// @ts-expect-error — mock for testing
globalThis.chrome = chromeMock;

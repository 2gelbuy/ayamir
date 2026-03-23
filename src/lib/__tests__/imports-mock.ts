// Mock for #imports virtual module (wxt)
let mockStorage: Record<string, unknown> = {};

export const storage = {
  getItem: async <T>(key: string): Promise<T | null> => {
    return (mockStorage[key] as T) ?? null;
  },
  setItem: async (key: string, value: unknown): Promise<void> => {
    mockStorage[key] = value;
  },
  removeItem: async (key: string): Promise<void> => {
    delete mockStorage[key];
  },
  _reset: () => { mockStorage = {}; },
};

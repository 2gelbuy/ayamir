import { describe, it, expect } from 'vitest';
import { getHumorMessage } from '../humor';

describe('getHumorMessage', () => {
  it('returns a string for each message type', () => {
    const types = ['reminder10', 'reminder5', 'reminder0', 'nudge', 'taskComplete'] as const;
    for (const type of types) {
      const msg = getHumorMessage(type, 'Test Task');
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('replaces {task} with the task title', () => {
    // Call multiple times to ensure at least one contains the title
    const messages = new Set<string>();
    for (let i = 0; i < 20; i++) {
      messages.add(getHumorMessage('reminder10', 'My Task'));
    }
    const allMessages = Array.from(messages);
    const hasTitle = allMessages.some(m => m.includes('My Task'));
    expect(hasTitle).toBe(true);
  });

  it('works with empty task title', () => {
    const msg = getHumorMessage('nudge');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('returns fallback messages (chrome.i18n returns empty in tests)', () => {
    // Since chrome.i18n.getMessage returns '' in tests, fallbacks should be used
    const msg = getHumorMessage('taskComplete');
    expect(msg.length).toBeGreaterThan(5);
  });
});

import { describe, it, expect } from 'vitest';
import { MSG } from '../messages';

describe('MSG constants', () => {
  it('has all required action types', () => {
    expect(MSG.CLOSE_TAB).toBe('closeTab');
    expect(MSG.CREATE_TASK).toBe('createTask');
    expect(MSG.CHECK_PAGE).toBe('checkPage');
    expect(MSG.TOGGLE_PALETTE).toBe('toggleCommandPalette');
    expect(MSG.INJECT_BLOCK).toBe('injectBlockPage');
    expect(MSG.INJECT_TICKER).toBe('injectTicker');
  });

  it('all values are unique', () => {
    const values = Object.values(MSG);
    expect(new Set(values).size).toBe(values.length);
  });
});

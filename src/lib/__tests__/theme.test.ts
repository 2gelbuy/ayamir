import { describe, it, expect } from 'vitest';
import { isDarkMode } from '../theme';

describe('isDarkMode', () => {
  it('returns false when dark class is not present', () => {
    document.documentElement.classList.remove('dark');
    expect(isDarkMode()).toBe(false);
  });

  it('returns true when dark class is present', () => {
    document.documentElement.classList.add('dark');
    expect(isDarkMode()).toBe(true);
    document.documentElement.classList.remove('dark');
  });
});

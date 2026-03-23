import { describe, it, expect } from 'vitest';
import { sortTasksByPriority } from '../smartQueue';
import type { Task } from '../db';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    title: 'Test',
    startTime: null,
    isCompleted: false,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('sortTasksByPriority', () => {
  it('returns empty array for empty input', () => {
    expect(sortTasksByPriority([])).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const tasks = [makeTask({ title: 'A' }), makeTask({ title: 'B' })];
    const result = sortTasksByPriority(tasks);
    expect(result).not.toBe(tasks);
  });

  it('sorts by priority: urgent > high > medium > low > undefined', () => {
    const tasks = [
      makeTask({ title: 'low', priority: 'low' }),
      makeTask({ title: 'urgent', priority: 'urgent' }),
      makeTask({ title: 'medium', priority: 'medium' }),
      makeTask({ title: 'high', priority: 'high' }),
      makeTask({ title: 'none' }),
    ];
    const sorted = sortTasksByPriority(tasks);
    expect(sorted.map(t => t.title)).toEqual(['urgent', 'high', 'medium', 'low', 'none']);
  });

  it('breaks priority ties by due date (earlier first)', () => {
    const tasks = [
      makeTask({ title: 'later', priority: 'high', dueDate: new Date('2026-03-20') }),
      makeTask({ title: 'sooner', priority: 'high', dueDate: new Date('2026-03-10') }),
    ];
    const sorted = sortTasksByPriority(tasks);
    expect(sorted.map(t => t.title)).toEqual(['sooner', 'later']);
  });

  it('tasks with due dates come before those without (same priority)', () => {
    const tasks = [
      makeTask({ title: 'no-due', priority: 'high' }),
      makeTask({ title: 'has-due', priority: 'high', dueDate: new Date('2026-03-15') }),
    ];
    const sorted = sortTasksByPriority(tasks);
    expect(sorted.map(t => t.title)).toEqual(['has-due', 'no-due']);
  });

  it('breaks ties by start time (earlier first)', () => {
    const tasks = [
      makeTask({ title: 'later', priority: 'medium', startTime: new Date('2026-03-10T14:00') }),
      makeTask({ title: 'sooner', priority: 'medium', startTime: new Date('2026-03-10T09:00') }),
    ];
    const sorted = sortTasksByPriority(tasks);
    expect(sorted.map(t => t.title)).toEqual(['sooner', 'later']);
  });

  it('breaks ties by estimated duration (shorter first)', () => {
    const tasks = [
      makeTask({ title: 'long', priority: 'medium', estimatedDuration: 120 }),
      makeTask({ title: 'short', priority: 'medium', estimatedDuration: 15 }),
    ];
    const sorted = sortTasksByPriority(tasks);
    expect(sorted.map(t => t.title)).toEqual(['short', 'long']);
  });

  it('breaks all ties by creation date (older first)', () => {
    const tasks = [
      makeTask({ title: 'newer', priority: 'medium', createdAt: new Date('2026-03-05') }),
      makeTask({ title: 'older', priority: 'medium', createdAt: new Date('2026-03-01') }),
    ];
    const sorted = sortTasksByPriority(tasks);
    expect(sorted.map(t => t.title)).toEqual(['older', 'newer']);
  });
});

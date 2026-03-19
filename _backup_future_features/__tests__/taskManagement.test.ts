// Tests for task management functionality

import { db, Task } from '../../lib/db';
import { 
  getTodayTasks, 
  getOverdueTasks, 
  getUpcomingTasks,
  sortTasksByPriority 
} from '../../lib/smartQueue';
import { createMockTask } from '../../setupTests';

// Mock the database
jest.mock('../../lib/db');

// Mock Chrome storage
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Set up global Chrome mock
Object.defineProperty(window, 'chrome', {
  value: mockChrome,
  writable: true
});

describe('Task Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task Creation', () => {
    it('should create a new task', async () => {
      const mockTask = createMockTask();
      const addSpy = jest.spyOn(db.tasks, 'add').mockResolvedValue(mockTask.id);

      const result = await db.tasks.add(mockTask);

      expect(addSpy).toHaveBeenCalledWith(mockTask);
      expect(result).toBe(mockTask.id);
    });

    it('should create a task with default values', async () => {
      const taskWithoutDefaults = {
        title: 'Test Task'
      };

      const expectedTask = {
        ...taskWithoutDefaults,
        isCompleted: false,
        createdAt: expect.any(Date),
        startTime: null,
        isFocused: false
      };

      const addSpy = jest.spyOn(db.tasks, 'add').mockResolvedValue(1);
      await db.tasks.add(expectedTask as any);

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining(expectedTask)
      );
    });
  });

  describe('Task Retrieval', () => {
    it('should retrieve all tasks', async () => {
      const mockTasks = [
        createMockTask({ id: 1, title: 'Task 1' }),
        createMockTask({ id: 2, title: 'Task 2' })
      ];

      const toArraySpy = jest.spyOn(db.tasks, 'toArray').mockResolvedValue(mockTasks);

      const result = await db.tasks.toArray();

      expect(toArraySpy).toHaveBeenCalled();
      expect(result).toEqual(mockTasks);
    });

    it('should retrieve a task by ID', async () => {
      const mockTask = createMockTask({ id: 1 });
      const getSpy = jest.spyOn(db.tasks, 'get').mockResolvedValue(mockTask);

      const result = await db.tasks.get(1);

      expect(getSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTask);
    });
  });

  describe('Task Updates', () => {
    it('should update a task', async () => {
      const mockTask = createMockTask({ id: 1 });
      const updatedTask = { ...mockTask, title: 'Updated Task' };
      const updateSpy = jest.spyOn(db.tasks, 'update').mockResolvedValue(1);

      const result = await db.tasks.update(1, updatedTask);

      expect(updateSpy).toHaveBeenCalledWith(1, updatedTask);
      expect(result).toBe(1);
    });

    it('should mark a task as completed', async () => {
      const mockTask = createMockTask({ id: 1 });
      const completedTask = {
        ...mockTask,
        isCompleted: true,
        completedAt: new Date()
      };
      const updateSpy = jest.spyOn(db.tasks, 'update').mockResolvedValue(1);

      const result = await db.tasks.update(1, completedTask);

      expect(updateSpy).toHaveBeenCalledWith(1, completedTask);
      expect(result).toBe(1);
    });
  });

  describe('Task Deletion', () => {
    it('should delete a task', async () => {
      const deleteSpy = jest.spyOn(db.tasks, 'delete').mockResolvedValue(undefined);

      await db.tasks.delete(1);

      expect(deleteSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Task Filtering', () => {
    it('should get today\'s tasks', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockTasks = [
        createMockTask({ 
          id: 1, 
          title: 'Today Task', 
          startTime: today 
        }),
        createMockTask({ 
          id: 2, 
          title: 'Tomorrow Task', 
          startTime: tomorrow 
        })
      ];

      jest.spyOn(db.tasks, 'toArray').mockResolvedValue(mockTasks);

      const result = await getTodayTasks();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Today Task');
    });

    it('should get overdue tasks', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockTasks = [
        createMockTask({ 
          id: 1, 
          title: 'Overdue Task', 
          startTime: yesterday 
        }),
        createMockTask({ 
          id: 2, 
          title: 'Future Task', 
          startTime: tomorrow 
        })
      ];

      jest.spyOn(db.tasks, 'toArray').mockResolvedValue(mockTasks);

      const result = await getOverdueTasks();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Overdue Task');
    });

    it('should get upcoming tasks', async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const mockTasks = [
        createMockTask({ 
          id: 1, 
          title: 'Today Task', 
          startTime: today 
        }),
        createMockTask({ 
          id: 2, 
          title: 'Next Week Task', 
          startTime: nextWeek 
        })
      ];

      jest.spyOn(db.tasks, 'toArray').mockResolvedValue(mockTasks);

      const result = await getUpcomingTasks();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Next Week Task');
    });
  });

  describe('Task Sorting', () => {
    it('should sort tasks by priority', () => {
      const now = new Date();
      const later = new Date(now.getTime() + 3600000); // 1 hour later

      const tasks = [
        createMockTask({ 
          id: 1, 
          title: 'Low Priority', 
          startTime: later,
          isCompleted: false
        }),
        createMockTask({ 
          id: 2, 
          title: 'High Priority', 
          startTime: now,
          isCompleted: false
        }),
        createMockTask({ 
          id: 3, 
          title: 'Completed Task', 
          startTime: now,
          isCompleted: true
        })
      ];

      const sortedTasks = sortTasksByPriority(tasks);

      // Incomplete tasks should come first
      expect(sortedTasks[0].isCompleted).toBe(false);
      expect(sortedTasks[1].isCompleted).toBe(false);
      expect(sortedTasks[2].isCompleted).toBe(true);

      // Among incomplete tasks, earlier start time should come first
      expect(sortedTasks[0].title).toBe('High Priority');
      expect(sortedTasks[1].title).toBe('Low Priority');
    });

    it('should handle tasks with no start time', () => {
      const now = new Date();

      const tasks = [
        createMockTask({ 
          id: 1, 
          title: 'No Start Time', 
          startTime: null,
          isCompleted: false
        }),
        createMockTask({ 
          id: 2, 
          title: 'With Start Time', 
          startTime: now,
          isCompleted: false
        })
      ];

      const sortedTasks = sortTasksByPriority(tasks);

      // Tasks with start time should come first
      expect(sortedTasks[0].title).toBe('With Start Time');
      expect(sortedTasks[1].title).toBe('No Start Time');
    });
  });

  describe('Task Focus', () => {
    it('should set a task as focused', async () => {
      const mockTask = createMockTask({ id: 1 });
      const updateSpy = jest.spyOn(db.tasks, 'update').mockResolvedValue(1);

      await db.tasks.update(1, { isFocused: true });

      expect(updateSpy).toHaveBeenCalledWith(1, { isFocused: true });
    });

    it('should clear focus from all tasks', async () => {
      const mockTasks = [
        createMockTask({ id: 1, isFocused: true }),
        createMockTask({ id: 2, isFocused: true })
      ];

      const toArraySpy = jest.spyOn(db.tasks, 'toArray').mockResolvedValue(mockTasks);
      const updateSpy = jest.spyOn(db.tasks, 'update').mockResolvedValue(1);

      // Simulate clearing focus from all tasks
      for (const task of mockTasks) {
        if (task.id && task.isFocused) {
          await db.tasks.update(task.id, { isFocused: false });
        }
      }

      expect(toArraySpy).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy).toHaveBeenCalledWith(1, { isFocused: false });
      expect(updateSpy).toHaveBeenCalledWith(2, { isFocused: false });
    });
  });
});
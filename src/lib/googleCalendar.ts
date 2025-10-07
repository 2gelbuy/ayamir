import { Task } from './db';

// Type declarations for Chrome APIs
declare const chrome: any;

// Google Calendar API configuration
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE'; // This would be replaced with actual client ID
const API_KEY = 'YOUR_API_KEY_HERE'; // This would be replaced with actual API key
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

// Token management
export const getAuthToken = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({
      interactive: true,
      scopes: SCOPES
    }, (token: string | null) => {
      resolve(token);
    });
  });
};

export const revokeToken = async (): Promise<void> => {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({
      interactive: false
    }, (token: string | null) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
};

// Calendar API functions
export const createCalendarEvent = async (
  task: Task,
  calendarId: string = 'primary'
): Promise<any> => {
  const token = await getAuthToken();
  if (!token) throw new Error('Unable to get authentication token');

  const event = {
    summary: task.title,
    description: `Task from EdgeTask${task.priority ? `\nPriority: ${task.priority}` : ''}${task.estimatedDuration ? `\nEstimated duration: ${task.estimatedDuration} minutes` : ''}`,
    start: {
      dateTime: task.startTime || new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: task.startTime && task.estimatedDuration 
        ? new Date(new Date(task.startTime).getTime() + task.estimatedDuration * 60000).toISOString()
        : new Date(new Date().getTime() + 60 * 60000).toISOString(), // Default 1 hour
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 }
      ]
    }
  };

  if (task.dueDate) {
    event.end = {
      dateTime: new Date(task.dueDate).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error creating calendar event: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
};

export const updateCalendarEvent = async (
  eventId: string,
  task: Task,
  calendarId: string = 'primary'
): Promise<any> => {
  const token = await getAuthToken();
  if (!token) throw new Error('Unable to get authentication token');

  const event = {
    summary: task.title,
    description: `Task from EdgeTask${task.priority ? `\nPriority: ${task.priority}` : ''}${task.estimatedDuration ? `\nEstimated duration: ${task.estimatedDuration} minutes` : ''}`,
    start: {
      dateTime: task.startTime || new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: task.startTime && task.estimatedDuration 
        ? new Date(new Date(task.startTime).getTime() + task.estimatedDuration * 60000).toISOString()
        : new Date(new Date().getTime() + 60 * 60000).toISOString(), // Default 1 hour
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };

  if (task.dueDate) {
    event.end = {
      dateTime: new Date(task.dueDate).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error updating calendar event: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
};

export const deleteCalendarEvent = async (
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> => {
  const token = await getAuthToken();
  if (!token) throw new Error('Unable to get authentication token');

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error deleting calendar event: ${errorData.error?.message || response.statusText}`);
  }
};

export const getCalendarEvents = async (
  calendarId: string = 'primary',
  timeMin?: Date,
  timeMax?: Date
): Promise<any[]> => {
  const token = await getAuthToken();
  if (!token) throw new Error('Unable to get authentication token');

  let url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
  const params = new URLSearchParams();

  if (timeMin) {
    params.append('timeMin', timeMin.toISOString());
  }

  if (timeMax) {
    params.append('timeMax', timeMax.toISOString());
  }

  params.append('singleEvents', 'true');
  params.append('orderBy', 'startTime');

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error getting calendar events: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
};

export const getCalendarList = async (): Promise<any[]> => {
  const token = await getAuthToken();
  if (!token) throw new Error('Unable to get authentication token');

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error getting calendar list: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
};

// Sync tasks with Google Calendar
export const syncTasksWithCalendar = async (
  tasks: Task[],
  calendarId: string = 'primary'
): Promise<{ synced: number, errors: string[] }> => {
  const results = { synced: 0, errors: [] as string[] };
  
  try {
    // Get existing calendar events
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // Get events for next 30 days
    
    const events = await getCalendarEvents(calendarId, now, futureDate);
    
    // Create a map of events by ID for quick lookup
    const eventMap = new Map();
    events.forEach(event => {
      if (event.description && event.description.includes('Task from EdgeTask')) {
        eventMap.set(event.id, event);
      }
    });
    
    // Sync each task
    for (const task of tasks) {
      try {
        if (task.calendarEventId) {
          // Update existing event
          await updateCalendarEvent(task.calendarEventId, task, calendarId);
          results.synced++;
        } else {
          // Create new event
          const event = await createCalendarEvent(task, calendarId);
          
          // Store the event ID with the task
          if (task.id) {
            // This would update the task in the database
            // await db.tasks.update(task.id, { calendarEventId: event.id });
            results.synced++;
          }
        }
      } catch (error) {
        results.errors.push(`Error syncing task "${task.title}": ${error}`);
      }
    }
  } catch (error) {
    results.errors.push(`Error during sync: ${error}`);
  }
  
  return results;
};

// Check if Google Calendar is available and authenticated
export const checkCalendarAvailability = async (): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    return !!token;
  } catch (error) {
    console.error('Error checking calendar availability:', error);
    return false;
  }
};
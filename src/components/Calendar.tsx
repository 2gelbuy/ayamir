import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Check, AlertCircle, Settings, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { 
  checkCalendarAvailability, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  getCalendarList,
  syncTasksWithCalendar,
  getCalendarEvents,
  revokeToken
} from '../lib/googleCalendar';
import { db, Task } from '../lib/db';
import { format, startOfDay, endOfDay, addDays, isToday, isAfter, isBefore } from 'date-fns';

export default function Calendar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<{ synced: number, errors: string[] } | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [calendars, setCalendars] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [autoSync, setAutoSync] = useState(false);

  useEffect(() => {
    checkAuthentication();
    loadTasks();
    loadCalendars();
    loadCalendarEvents();
    
    // Load auto-sync setting
    const loadAutoSyncSetting = async () => {
      try {
        const settings = await db.settings.toCollection().first();
        if (settings && 'calendarAutoSync' in settings) {
          setAutoSync(settings.calendarAutoSync);
        }
      } catch (error) {
        console.error('Error loading auto-sync setting:', error);
      }
    };
    
    loadAutoSyncSetting();
  }, []);

  useEffect(() => {
    if (autoSync && isAuthenticated) {
      const interval = setInterval(() => {
        handleSync();
      }, 30 * 60 * 1000); // Sync every 30 minutes
      
      return () => clearInterval(interval);
    }
  }, [autoSync, isAuthenticated]);

  const checkAuthentication = async () => {
    try {
      const authenticated = await checkCalendarAvailability();
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const allTasks = await db.tasks.toArray();
      setTasks(allTasks.filter(task => !task.isCompleted));
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadCalendars = async () => {
    try {
      if (isAuthenticated) {
        const calendarList = await getCalendarList();
        setCalendars(calendarList);
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      if (isAuthenticated) {
        const today = startOfDay(new Date());
        const nextWeek = endOfDay(addDays(today, 7));
        const events = await getCalendarEvents(selectedCalendar, today, nextWeek);
        setCalendarEvents(events);
      }
    } catch (error) {
      console.error('Error loading calendar events:', error);
    }
  };

  const handleAuthenticate = async () => {
    setIsLoading(true);
    try {
      const authenticated = await checkCalendarAvailability();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        await loadCalendars();
        await loadCalendarEvents();
      }
    } catch (error) {
      console.error('Error during authentication:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await revokeToken();
      setIsAuthenticated(false);
      setCalendars([]);
      setCalendarEvents([]);
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResults(null);
    
    try {
      const results = await syncTasksWithCalendar(tasks, selectedCalendar);
      setSyncResults(results);
      await loadCalendarEvents();
      await loadTasks();
    } catch (error) {
      console.error('Error during sync:', error);
      setSyncResults({ synced: 0, errors: [`Sync failed: ${error}`] });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateEvent = async (task: Task) => {
    try {
      const event = await createCalendarEvent(task, selectedCalendar);
      
      // Update task with calendar event ID
      if (task.id) {
        await db.tasks.update(task.id, { calendarEventId: event.id });
      }
      
      await loadCalendarEvents();
      await loadTasks();
    } catch (error) {
      console.error('Error creating calendar event:', error);
    }
  };

  const handleUpdateEvent = async (task: Task) => {
    if (!task.calendarEventId) return;
    
    try {
      await updateCalendarEvent(task.calendarEventId, task, selectedCalendar);
      await loadCalendarEvents();
    } catch (error) {
      console.error('Error updating calendar event:', error);
    }
  };

  const handleDeleteEvent = async (task: Task) => {
    if (!task.calendarEventId) return;
    
    try {
      await deleteCalendarEvent(task.calendarEventId, selectedCalendar);
      
      // Remove calendar event ID from task
      if (task.id) {
        await db.tasks.update(task.id, { calendarEventId: undefined });
      }
      
      await loadCalendarEvents();
      await loadTasks();
    } catch (error) {
      console.error('Error deleting calendar event:', error);
    }
  };

  const handleAutoSyncChange = async (value: boolean) => {
    setAutoSync(value);
    
    try {
      const settings = await db.settings.toCollection().first();
      if (settings) {
        await db.settings.update(settings.id!, { calendarAutoSync: value });
      }
    } catch (error) {
      console.error('Error saving auto-sync setting:', error);
    }
  };

  const getCalendarName = () => {
    if (selectedCalendar === 'primary') {
      return 'Primary Calendar';
    }
    
    const calendar = calendars.find(cal => cal.id === selectedCalendar);
    return calendar ? calendar.summary : 'Unknown Calendar';
  };

  const getEventColor = (event: any) => {
    if (event.colorId) {
      return event.colorId;
    }
    
    // Default colors based on event status
    if (event.status === 'cancelled') {
      return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
    }
    
    return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
  };

  return (
    <div className="h-screen w-full bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex-shrink-0 bg-indigo-600 dark:bg-indigo-800 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <h1 className="text-xl font-bold">Google Calendar</h1>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded hover:bg-indigo-700 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Auto-sync
              </span>
              <button
                onClick={() => handleAutoSyncChange(!autoSync)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSync ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSync ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Calendar
              </span>
              <select
                value={selectedCalendar}
                onChange={(e) => setSelectedCalendar(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                disabled={!isAuthenticated}
              >
                <option value="primary">Primary Calendar</option>
                {calendars.map(calendar => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2">
              {isAuthenticated ? (
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={handleAuthenticate}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Connecting...' : 'Connect'}
                </button>
              )}
              
              <button
                onClick={handleSync}
                disabled={!isAuthenticated || isSyncing}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Sync
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {!isAuthenticated ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Calendar className="w-16 h-16 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect to Google Calendar</h2>
            <p className="text-center mb-4 max-w-md">
              Connect your Google Calendar to sync tasks and events. You'll be able to create, update, and delete calendar events from EdgeTask.
            </p>
            <button
              onClick={handleAuthenticate}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Connect to Google Calendar
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {syncResults && (
              <div className={`p-3 rounded-lg ${
                syncResults.errors.length > 0
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {syncResults.errors.length > 0 ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    {syncResults.errors.length > 0 ? 'Sync completed with errors' : 'Sync completed successfully'}
                  </span>
                </div>
                <p className="text-sm">
                  {syncResults.synced} tasks synced
                  {syncResults.errors.length > 0 && ` with ${syncResults.errors.length} errors`}
                </p>
                {syncResults.errors.length > 0 && (
                  <ul className="mt-2 text-xs space-y-1">
                    {syncResults.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {getCalendarName()}
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {calendarEvents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No events in the next 7 days
                  </div>
                ) : (
                  calendarEvents.map(event => (
                    <div key={event.id} className={`p-3 ${getEventColor(event)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">{event.summary}</h4>
                          {event.start.dateTime && (
                            <p className="text-xs mt-1">
                              {format(new Date(event.start.dateTime), 'MMM d, h:mm a')}
                            </p>
                          )}
                        </div>
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title="Open in Google Calendar"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  Tasks
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {tasks.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No tasks
                  </div>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">{task.title}</h4>
                          {task.startTime && (
                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                              {format(new Date(task.startTime), 'MMM d, h:mm a')}
                            </p>
                          )}
                          {task.priority && (
                            <span className={`inline-block px-2 py-0.5 text-xs rounded mt-1 ${
                              task.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                              task.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            }`}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {task.calendarEventId ? (
                            <>
                              <button
                                onClick={() => handleUpdateEvent(task)}
                                className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Update calendar event"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(task)}
                                className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete calendar event"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleCreateEvent(task)}
                              className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                              title="Create calendar event"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
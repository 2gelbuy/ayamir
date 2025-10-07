import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, Target, Calendar, Award } from 'lucide-react';
import { db, Task } from '../lib/db';
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';

interface AnalyticsData {
  tasksCompleted: number;
  tasksCompletedToday: number;
  tasksCompletedThisWeek: number;
  averageCompletionTime: number; // in minutes
  focusStreak: number; // consecutive days with completed tasks
  mostProductiveHour: number;
  totalFocusTime: number; // in minutes
  completionRate: number; // percentage
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData>({
    tasksCompleted: 0,
    tasksCompletedToday: 0,
    tasksCompletedThisWeek: 0,
    averageCompletionTime: 0,
    focusStreak: 0,
    mostProductiveHour: 0,
    totalFocusTime: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Get all tasks
        const allTasks = await db.tasks.toArray();
        const completedTasks = allTasks.filter(task => task.isCompleted && task.completedAt);
        
        // Calculate basic metrics
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const weekStart = subDays(todayStart, 7);
        const monthStart = subDays(todayStart, 30);
        
        const tasksCompletedToday = completedTasks.filter(task => 
          task.completedAt && isWithinInterval(new Date(task.completedAt), { start: todayStart, end: todayEnd })
        ).length;
        
        const tasksCompletedThisWeek = completedTasks.filter(task => 
          task.completedAt && isWithinInterval(new Date(task.completedAt), { start: weekStart, end: todayEnd })
        ).length;
        
        const tasksCompletedThisMonth = completedTasks.filter(task => 
          task.completedAt && isWithinInterval(new Date(task.completedAt), { start: monthStart, end: todayEnd })
        ).length;
        
        // Calculate average completion time
        const tasksWithTime = completedTasks.filter(task => 
          task.createdAt && task.completedAt
        );
        
        const totalCompletionTime = tasksWithTime.reduce((total, task) => {
          const created = new Date(task.createdAt);
          const completed = new Date(task.completedAt!);
          return total + (completed.getTime() - created.getTime());
        }, 0);
        
        const averageCompletionTime = tasksWithTime.length > 0 
          ? Math.round(totalCompletionTime / tasksWithTime.length / 60000) // convert to minutes
          : 0;
        
        // Calculate focus streak (consecutive days with completed tasks)
        let focusStreak = 0;
        let currentDate = subDays(todayStart, 1);
        
        while (currentDate >= subDays(todayStart, 30)) { // Check up to 30 days back
          const dayStart = startOfDay(currentDate);
          const dayEnd = endOfDay(currentDate);
          
          const tasksCompletedOnDay = completedTasks.filter(task => 
            task.completedAt && isWithinInterval(new Date(task.completedAt), { start: dayStart, end: dayEnd })
          ).length;
          
          if (tasksCompletedOnDay > 0) {
            focusStreak++;
            currentDate = subDays(currentDate, 1);
          } else {
            break;
          }
        }
        
        // Find most productive hour
        const hourCounts: { [hour: number]: number } = {};
        
        completedTasks.forEach(task => {
          if (task.completedAt) {
            const hour = new Date(task.completedAt).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
          }
        });
        
        let mostProductiveHour = 0;
        let maxCount = 0;
        
        Object.entries(hourCounts).forEach(([hour, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mostProductiveHour = parseInt(hour);
          }
        });
        
        // Calculate total focus time (sum of all task durations)
        const totalFocusTime = tasksWithTime.reduce((total, task) => {
          const created = new Date(task.createdAt);
          const completed = new Date(task.completedAt!);
          return total + (completed.getTime() - created.getTime());
        }, 0) / 60000; // convert to minutes
        
        // Calculate completion rate
        const completionRate = allTasks.length > 0 
          ? Math.round((completedTasks.length / allTasks.length) * 100)
          : 0;
        
        setData({
          tasksCompleted: completedTasks.length,
          tasksCompletedToday,
          tasksCompletedThisWeek,
          averageCompletionTime,
          focusStreak,
          mostProductiveHour,
          totalFocusTime: Math.round(totalFocusTime),
          completionRate
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [timeRange]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Productivity Analytics
        </h2>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setTimeRange('day')}
            className={`px-3 py-1 text-sm rounded ${
              timeRange === 'day' 
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1 text-sm rounded ${
              timeRange === 'week' 
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 text-sm rounded ${
              timeRange === 'month' 
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Completed</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {timeRange === 'day' ? data.tasksCompletedToday : 
             timeRange === 'week' ? data.tasksCompletedThisWeek : 
             data.tasksCompleted}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {timeRange === 'day' ? 'today' : 
             timeRange === 'week' ? 'this week' : 
             'all time'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Completion Rate</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {data.completionRate}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            of all tasks
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Avg. Time</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatTime(data.averageCompletionTime)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            per task
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Focus Streak</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {data.focusStreak}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            days in a row
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Insights</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400">Most productive hour</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatHour(data.mostProductiveHour)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400">Total focus time</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatTime(data.totalFocusTime)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
              Productivity Tip
            </p>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
              {data.mostProductiveHour > 0 && data.mostProductiveHour < 12
                ? `You're most productive in the morning. Try scheduling important tasks before ${formatHour(data.mostProductiveHour + 2)}.`
                : data.mostProductiveHour >= 12 && data.mostProductiveHour < 17
                ? `You peak in the afternoon. Block out ${formatHour(data.mostProductiveHour)} for deep work.`
                : data.mostProductiveHour >= 17
                ? `You're a night owl! Consider creating a wind-down routine after ${formatHour(data.mostProductiveHour)}.`
                : "Complete more tasks to see personalized productivity insights."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
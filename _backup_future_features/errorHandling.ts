// Error handling and logging service for EdgeTask

// Type declarations for Chrome APIs
declare const chrome: any;

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// Log entry interface
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  stack?: string;
  url?: string;
  userAgent?: string;
}

// Error context interface
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  additionalData?: any;
}

// Error handling configuration
export interface ErrorHandlingConfig {
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  logLevel: LogLevel;
  maxLogEntries: number;
  remoteEndpoint?: string;
}

// Default error handling configuration
export const DEFAULT_ERROR_HANDLING_CONFIG: ErrorHandlingConfig = {
  enableConsoleLogging: true,
  enableRemoteLogging: false,
  logLevel: LogLevel.INFO,
  maxLogEntries: 1000
};

// Logger class
export class Logger {
  private config: ErrorHandlingConfig;
  private logs: LogEntry[] = [];
  private sessionId: string;

  constructor(config: ErrorHandlingConfig = DEFAULT_ERROR_HANDLING_CONFIG) {
    this.config = config;
    this.sessionId = this.generateSessionId();

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  // Generate a unique session ID
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Set up global error handlers
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', event.reason, {
        component: 'Global',
        action: 'unhandledrejection'
      });
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.error('Uncaught Error', event.message, {
        component: 'Global',
        action: 'error',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });
  }

  // Log a debug message
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  // Log an info message
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  // Log a warning message
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  // Log an error message
  error(message: string, error?: Error | any, context?: ErrorContext): void {
    let stack: string | undefined;
    let data: any = error;

    // Extract stack trace if error is an Error object
    if (error instanceof Error) {
      stack = error.stack;
      data = {
        name: error.name,
        message: error.message
      };
    }

    // Add context to data
    if (context) {
      data = {
        ...data,
        context
      };
    }

    this.log(LogLevel.ERROR, message, data, stack);
  }

  // Log a fatal error
  fatal(message: string, error?: Error | any, context?: ErrorContext): void {
    this.error(message, error, context);

    // In a real app, you might want to show a user-friendly error message
    // or restart the app in case of a fatal error
  }

  // Internal log method
  private log(level: LogLevel, message: string, data?: any, stack?: string): void {
    // Don't log if level is below the configured minimum
    if (level < this.config.logLevel) {
      return;
    }

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      stack,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Add to logs array
    this.logs.push(logEntry);

    // Trim logs if they exceed the maximum
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }

    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry);
    }

    // Send to remote endpoint if enabled
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      this.sendToRemoteEndpoint(logEntry);
    }
  }

  // Log to console
  private logToConsole(logEntry: LogEntry): void {
    const { timestamp, level, message, data, stack } = logEntry;
    const logPrefix = `[${timestamp}] [${LogLevel[level]}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logPrefix, message, data, stack);
        break;
      case LogLevel.INFO:
        console.info(logPrefix, message, data, stack);
        break;
      case LogLevel.WARN:
        console.warn(logPrefix, message, data, stack);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logPrefix, message, data, stack);
        break;
    }
  }

  // Send log to remote endpoint
  private sendToRemoteEndpoint(logEntry: LogEntry): void {
    if (!this.config.remoteEndpoint) return;

    // Add session ID to log entry
    const logWithSession = {
      ...logEntry,
      sessionId: this.sessionId
    };

    // Send log entry to remote endpoint
    fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logWithSession)
    }).catch(error => {
      // If remote logging fails, log to console
      console.error('Failed to send log to remote endpoint:', error);
    });
  }

  // Get all logs
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Get logs by level
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // Clear all logs
  clearLogs(): void {
    this.logs = [];
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Update configuration
  updateConfig(config: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Create a global logger instance
export const logger = new Logger();

// Error boundary component for React
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Error handling utility functions
export const handleAsyncError = async (
  asyncFn: () => Promise<any>,
  context?: ErrorContext
): Promise<any> => {
  try {
    return await asyncFn();
  } catch (error) {
    logger.error('Async operation failed', error, context);
    throw error;
  }
};

export const safeExecute = <T>(
  fn: () => T,
  fallback: T,
  context?: ErrorContext
): T => {
  try {
    return fn();
  } catch (error) {
    logger.error('Safe execution failed', error, context);
    return fallback;
  }
};

// Retry function with exponential backoff
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  context?: ErrorContext
): Promise<T> => {
  let lastError: Error | any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        logger.error(`Retry failed after ${maxAttempts} attempts`, error, context);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);

      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, { error, context });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Circuit breaker pattern
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) { }

  async execute<T>(fn: () => Promise<T>, context?: ErrorContext): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        logger.error('Circuit breaker opened', error, context);
      }

      throw error;
    }
  }
}

// Initialize error handling
export const initializeErrorHandling = (config?: Partial<ErrorHandlingConfig>): void => {
  if (config) {
    logger.updateConfig(config);
  }

  logger.info('Error handling initialized', {
    config: logger['config'],
    sessionId: logger['sessionId']
  });
};

// Report an error to the error tracking service
export const reportError = (error: Error | string, context?: ErrorContext): void => {
  if (typeof error === 'string') {
    logger.error(error, undefined, context);
  } else {
    logger.error(error.message, error, context);
  }
};

// Get error logs for debugging
export const getErrorLogs = (): LogEntry[] => {
  return logger.getLogsByLevel(LogLevel.ERROR);
};

// Export error logs for debugging
export const exportErrorLogs = (): string => {
  const errorLogs = getErrorLogs();
  return JSON.stringify(errorLogs, null, 2);
};
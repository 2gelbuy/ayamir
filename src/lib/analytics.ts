/**
 * Analytics module for EdgeTask
 * Provides event tracking functionality with privacy-first approach
 */

export interface AnalyticsEvent {
    name: string;
    properties?: Record<string, unknown>;
    timestamp?: number;
}

interface AnalyticsConfig {
    enabled: boolean;
    debugMode: boolean;
}

let config: AnalyticsConfig = {
    enabled: false,
    debugMode: process.env.NODE_ENV === 'development'
};

/**
 * Initialize analytics with configuration
 */
export function initializeAnalytics(options?: Partial<AnalyticsConfig>): void {
    config = { ...config, ...options };

    if (config.debugMode) {
        console.log('[Analytics] Initialized with config:', config);
    }
}

/**
 * Track a generic analytics event
 */
export function trackEvent(event: AnalyticsEvent): void {
    if (!config.enabled && !config.debugMode) return;

    const enrichedEvent = {
        ...event,
        timestamp: event.timestamp ?? Date.now()
    };

    if (config.debugMode) {
        console.log('[Analytics]', enrichedEvent.name, enrichedEvent.properties);
    }

    // Future: Send to analytics backend if enabled
}

/**
 * Track task snooze action
 */
export function trackSnooze(taskId: string, durationMinutes: number): void {
    trackEvent({
        name: 'edgetask.task.snoozed',
        properties: {
            taskIdHash: taskId.slice(0, 8),
            duration: durationMinutes
        }
    });
}

/**
 * Track task creation
 */
export function trackTaskCreated(taskId: string, titleLength: number): void {
    trackEvent({
        name: 'edgetask.task.created',
        properties: {
            taskIdHash: taskId.slice(0, 8),
            titleLength
        }
    });
}

/**
 * Track task completion
 */
export function trackTaskCompleted(taskId: string): void {
    trackEvent({
        name: 'edgetask.task.completed',
        properties: {
            taskIdHash: taskId.slice(0, 8)
        }
    });
}

/**
 * Track notification shown
 */
export function trackNotificationShown(taskId: string | null, timing: string): void {
    trackEvent({
        name: 'edgetask.notification.shown',
        properties: {
            taskIdHash: taskId?.slice(0, 8),
            timing
        }
    });
}

/**
 * Track notification action clicked
 */
export function trackNotificationClicked(taskId: string | null, action: string): void {
    trackEvent({
        name: 'edgetask.notification.clicked',
        properties: {
            taskIdHash: taskId?.slice(0, 8),
            action
        }
    });
}

/**
 * Track panel opened
 */
export function trackPanelOpened(source: string): void {
    trackEvent({
        name: 'edgetask.panel.opened',
        properties: { source }
    });
}

/**
 * Track nudge shown
 */
export function trackNudgeShown(domain: string): void {
    trackEvent({
        name: 'edgetask.nudge.shown',
        properties: { domain }
    });
}

/**
 * Track settings change
 */
export function trackSettingsChanged(key: string): void {
    trackEvent({
        name: 'edgetask.settings.changed',
        properties: { key }
    });
}

/**
 * Log a task action (legacy function for compatibility)
 */
export async function logTaskAction(action: string, taskId: number | string): Promise<void> {
    trackEvent({
        name: `edgetask.task.${action}`,
        properties: {
            taskIdHash: String(taskId).slice(0, 8),
            action
        }
    });
}

import { db, getSettings, updateSettings, type Settings } from "./db";

export const FOCUS_ALARM = "ayamir-focus-session";
export type FocusCommand =
  | { type: "sync" | "stop" }
  | {
      type: "start";
      duration: number;
      breakDuration: number;
      hardLock: boolean;
    };

export function isFocusSessionActive(
  settings: Settings,
  now = Date.now(),
): boolean {
  return (
    settings.isDeepWorkActive === true &&
    typeof settings.deepWorkEndTime === "number" &&
    settings.deepWorkEndTime > now
  );
}

// Only the service worker owns session transitions. Serialize alarm, storage
// and popup events so a session cannot be credited twice while the popup closes.
let pending: Promise<unknown> = Promise.resolve();
export function runFocusCommand(command: FocusCommand) {
  const result = pending.then(() => transition(command));
  pending = result.catch(() => undefined);
  return result;
}

async function transition(command: FocusCommand) {
  let settings = await getSettings();
  const now = Date.now();
  let completed = false;
  if (
    command.type === "start" &&
    (!Number.isInteger(command.duration) ||
      command.duration < 1 ||
      command.duration > 180 ||
      !Number.isInteger(command.breakDuration) ||
      command.breakDuration < 1 ||
      command.breakDuration > 30 ||
      typeof command.hardLock !== "boolean")
  ) {
    throw new Error("Invalid focus duration");
  }

  if (settings.isDeepWorkActive) {
    const end = settings.deepWorkEndTime;
    if (typeof end !== "number" || !Number.isFinite(end)) {
      await updateSettings({ isDeepWorkActive: false, deepWorkEndTime: null });
      settings = await getSettings();
    } else if (end <= now || command.type === "stop") {
      completed = end <= now;
      if (!completed && settings.hardLockMode)
        throw new Error("This session is locked until the timer ends");
      const duration = settings.deepWorkModeDuration;
      const startedAt = new Date(end - duration * 60_000);
      const endedAt = new Date(completed ? end : now);
      const actualDuration = completed
        ? duration
        : Math.max(
            0,
            Math.min(
              duration,
              Math.round((now - startedAt.getTime()) / 60_000),
            ),
          );
      // A worker can stop between the database write and the settings write.
      // Reuse the record on retry instead of creating a second session.
      const existing = await db.focusSessions
        .where("startedAt")
        .equals(startedAt)
        .filter((session) => session.type === "work")
        .first();
      if (!existing)
        await db.focusSessions.add({
          startedAt,
          endedAt,
          duration,
          actualDuration,
          completed,
          type: "work",
        });
      completed = existing?.completed ?? completed;
      const creditedMinutes = existing?.actualDuration ?? actualDuration;
      await updateSettings({
        isDeepWorkActive: false,
        deepWorkEndTime: null,
        totalFocusMinutes: (settings.totalFocusMinutes || 0) + creditedMinutes,
        completedSessions:
          (settings.completedSessions || 0) + (completed ? 1 : 0),
      });
      settings = await getSettings();
    } else if (command.type === "start") {
      throw new Error("A focus session is already running");
    }
  }

  if (command.type === "start") {
    await updateSettings({
      isDeepWorkActive: true,
      deepWorkEndTime: now + command.duration * 60_000,
      deepWorkModeDuration: command.duration,
      deepWorkModeBreakDuration: command.breakDuration,
      hardLockMode: command.hardLock,
    });
    settings = await getSettings();
  }
  if (isFocusSessionActive(settings)) {
    await chrome.alarms.create(FOCUS_ALARM, {
      when: settings.deepWorkEndTime!,
    });
  } else {
    await chrome.alarms.clear(FOCUS_ALARM);
  }
  return { settings, completed };
}

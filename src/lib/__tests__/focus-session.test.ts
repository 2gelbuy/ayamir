import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { FocusSession, Settings } from "../db";
import {
  FOCUS_ALARM,
  isFocusSessionActive,
  runFocusCommand,
} from "../focus-session";

const state = vi.hoisted(() => ({
  settings: {} as Settings,
  records: [] as FocusSession[],
  failStorage: false,
}));
vi.mock("../db", () => ({
  getSettings: vi.fn(async () => ({ ...state.settings })),
  updateSettings: vi.fn(async (partial: Partial<Settings>) => {
    if (state.failStorage) {
      state.failStorage = false;
      throw new Error("Storage unavailable");
    }
    Object.assign(state.settings, partial);
  }),
  db: {
    focusSessions: {
      add: vi.fn(async (record: FocusSession) => state.records.push(record)),
      where: () => ({
        equals: (date: Date) => ({
          filter: (predicate: (record: FocusSession) => boolean) => ({
            first: async () =>
              state.records.find(
                (record) =>
                  record.startedAt.getTime() === date.getTime() &&
                  predicate(record),
              ),
          }),
        }),
      }),
    },
  },
}));
const now = Date.parse("2026-11-04T10:00:00Z");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  state.settings = {
    isDeepWorkActive: false,
    deepWorkEndTime: null,
    deepWorkModeDuration: 25,
    deepWorkModeBreakDuration: 5,
    hardLockMode: false,
    totalFocusMinutes: 10,
    completedSessions: 1,
  } as Settings;
  state.records = [];
  state.failStorage = false;
  vi.stubGlobal("chrome", {
    alarms: { create: vi.fn(async () => {}), clear: vi.fn(async () => true) },
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("focus sessions without an open popup", () => {
  it("recovers a session after its alarm fires late and credits only the planned duration", async () => {
    Object.assign(state.settings, {
      isDeepWorkActive: true,
      deepWorkEndTime: now - 60_000,
    });
    expect(isFocusSessionActive(state.settings)).toBe(false);
    const result = await runFocusCommand({ type: "sync" });
    expect(result.completed).toBe(true);
    expect(state.settings).toMatchObject({
      isDeepWorkActive: false,
      totalFocusMinutes: 35,
      completedSessions: 2,
    });
    expect(state.records).toHaveLength(1);
    expect(state.records[0]).toMatchObject({
      actualDuration: 25,
      completed: true,
      endedAt: new Date(now - 60_000),
    });
    expect(chrome.alarms.clear).toHaveBeenCalledWith(FOCUS_ALARM);
  });
  it("serializes simultaneous alarm and storage events without double credit", async () => {
    Object.assign(state.settings, {
      isDeepWorkActive: true,
      deepWorkEndTime: now,
    });
    const results = await Promise.all([
      runFocusCommand({ type: "sync" }),
      runFocusCommand({ type: "sync" }),
    ]);
    expect(results.filter((result) => result.completed)).toHaveLength(1);
    expect(state.records).toHaveLength(1);
    expect(state.settings.totalFocusMinutes).toBe(35);
  });
  it("recreates the alarm for a still-running session after a worker restart", async () => {
    Object.assign(state.settings, {
      isDeepWorkActive: true,
      deepWorkEndTime: now + 120_000,
    });
    await runFocusCommand({ type: "sync" });
    expect(chrome.alarms.create).toHaveBeenCalledWith(FOCUS_ALARM, {
      when: now + 120_000,
    });
    expect(state.records).toHaveLength(0);
    expect(isFocusSessionActive(state.settings)).toBe(true);
  });
  it("does not duplicate the database record after a failed settings write", async () => {
    Object.assign(state.settings, {
      isDeepWorkActive: true,
      deepWorkEndTime: now,
    });
    state.failStorage = true;
    await expect(runFocusCommand({ type: "sync" })).rejects.toThrow(
      "Storage unavailable",
    );
    await runFocusCommand({ type: "sync" });
    expect(state.records).toHaveLength(1);
    expect(state.settings.totalFocusMinutes).toBe(35);
  });
  it("stops an unlocked session and credits only elapsed minutes", async () => {
    Object.assign(state.settings, {
      isDeepWorkActive: true,
      deepWorkEndTime: now + 20 * 60_000,
    });
    await runFocusCommand({ type: "stop" });
    expect(state.records[0]).toMatchObject({
      completed: false,
      actualDuration: 5,
    });
    expect(state.settings).toMatchObject({
      totalFocusMinutes: 15,
      completedSessions: 1,
      isDeepWorkActive: false,
    });
  });
  it("preserves a hard lock until the deadline, then completes it", async () => {
    Object.assign(state.settings, {
      isDeepWorkActive: true,
      hardLockMode: true,
      deepWorkEndTime: now + 60_000,
    });
    await expect(runFocusCommand({ type: "stop" })).rejects.toThrow("locked");
    expect(state.records).toHaveLength(0);
    vi.setSystemTime(now + 60_000);
    expect((await runFocusCommand({ type: "sync" })).completed).toBe(true);
  });
  it("starts once even if the start button is pressed twice", async () => {
    const command = {
      type: "start" as const,
      duration: 25,
      breakDuration: 5,
      hardLock: false,
    };
    await runFocusCommand(command);
    await expect(runFocusCommand(command)).rejects.toThrow("already running");
    expect(state.settings.deepWorkEndTime).toBe(now + 25 * 60_000);
    expect(chrome.alarms.create).toHaveBeenCalledWith(FOCUS_ALARM, {
      when: now + 25 * 60_000,
    });
  });
  it.each([0, -1, 181, 1.5, NaN])(
    "rejects invalid duration %s without changing settings",
    async (duration) => {
      await expect(
        runFocusCommand({
          type: "start",
          duration,
          breakDuration: 5,
          hardLock: false,
        }),
      ).rejects.toThrow("Invalid");
      expect(state.settings.isDeepWorkActive).toBe(false);
      expect(chrome.alarms.create).not.toHaveBeenCalled();
    },
  );
  it("clears a malformed stale session instead of blocking sites indefinitely", async () => {
    Object.assign(state.settings, {
      isDeepWorkActive: true,
      deepWorkEndTime: null,
    });
    await runFocusCommand({ type: "sync" });
    expect(state.settings.isDeepWorkActive).toBe(false);
    expect(state.records).toHaveLength(0);
  });
});

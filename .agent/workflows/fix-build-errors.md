---
description: Fix all EdgeTask build errors systematically
---

# EdgeTask Build Fix Implementation Plan

## Overview
This plan addresses **125 TypeScript errors** preventing the EdgeTask extension from building. The fixes are organized into 6 phases, ordered by dependency (some fixes must happen before others) and impact.

---

## Phase 1: Create Missing Module (BLOCKING)
**Priority: CRITICAL** | **Estimated Time: 15 min** | **Errors Fixed: 1**

### Task 1.1: Create `src/lib/analytics.ts`
The `snooze.ts` file imports from `./analytics` which doesn't exist.

**Action:** Create a minimal analytics module with the expected exports.

```typescript
// src/lib/analytics.ts
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
}

export function trackEvent(event: AnalyticsEvent): void {
  // Placeholder - implement actual analytics if needed
  console.log('[Analytics]', event.name, event.properties);
}

export function trackSnooze(taskId: string, duration: number): void {
  trackEvent({
    name: 'edgetask.task.snoozed',
    properties: { taskIdHash: taskId.slice(0, 8), duration }
  });
}
```

---

## Phase 2: Fix Implicit `any` Types (15 errors)
**Priority: HIGH** | **Estimated Time: 30 min** | **Errors Fixed: 15**

These errors occur because TypeScript's strict mode requires explicit types.

### Task 2.1: Fix `src/background.ts` (6 errors)

| Line | Parameter | Fix |
|------|-----------|-----|
| 9 | `alarm` | `chrome.alarms.Alarm` |
| 170 | `command` | `string` |
| 172, 178 | `tabs` | `chrome.tabs.Tab[]` |
| 186 | `notificationId` | `string` |
| 186 | `buttonIndex` | `number` |

### Task 2.2: Fix `src/lib/deepWorkMode.ts` (3 errors)

| Line | Parameter | Fix |
|------|-----------|-----|
| 298 | `tab` | `chrome.tabs.Tab` |
| 322 | `tab` | `chrome.tabs.Tab` |
| 409 | `alarm` | `chrome.alarms.Alarm` |

### Task 2.3: Fix `src/lib/keyboardNavigation.ts` (1 error)

| Line | Parameter | Fix |
|------|-----------|-----|
| 412 | `event` | `KeyboardEvent` |

### Task 2.4: Fix `src/lib/visualFeedback.ts` (4 errors)

| Line | Parameter | Fix |
|------|-----------|-----|
| 416 | `button` | `HTMLButtonElement` |
| 464 | `element` | `HTMLElement` |
| 464 | `index` | `number` |
| 498 | `element` | `HTMLElement` |

### Task 2.5: Fix `src/content.ts` (2 errors - unused params)

| Line | Parameter | Fix |
|------|-----------|-----|
| 435 | `sender` | Prefix with `_sender` or remove |
| 435 | `sendResponse` | Prefix with `_sendResponse` or remove |

### Task 2.6: Fix `src/edgePanel.ts` (2 errors - unused params)

| Line | Parameter | Fix |
|------|-----------|-----|
| 151 | `sender` | Prefix with `_sender` or remove |
| 151 | `sendResponse` | Prefix with `_sendResponse` or remove |

---

## Phase 3: Fix Null/Undefined Safety Issues (~30 errors)
**Priority: HIGH** | **Estimated Time: 45 min** | **Errors Fixed: ~30**

### Task 3.1: Fix `src/lib/accessibility.ts` (15 errors)

**Lines 140-147:** Add null checks before accessing properties
```typescript
// Before
element.setAttribute('aria-label', label);
// After
element?.setAttribute('aria-label', label);
```

**Lines 203, 209, 243, 263, 291, 310, 329:** Fix ARIA attribute type definitions
- Update the `ARIAAttributes` interface to include missing properties
- Or use type assertions where needed

### Task 3.2: Fix `src/lib/snooze.ts` (4 errors)

| Line | Variable | Fix |
|------|----------|-----|
| 395 | `optionsContainer` | Add null check: `if (!optionsContainer) return;` |
| 424 | `closeBtn` | Add null check or use optional chaining |
| 425 | `cancelBtn` | Add null check or use optional chaining |
| 427 | `confirmBtn` | Add null check or use optional chaining |

### Task 3.3: Fix `src/components/Gamification.tsx` (7 errors)

| Line | Issue | Fix |
|------|-------|-----|
| 21 | `undefined` not assignable to `SetStateAction` | Use `?? null` fallback |
| 55, 56 | `number \| undefined` not assignable to `number` | Add default: `value ?? 0` |
| 58, 212, 214, 216 | `possibly undefined` | Use optional chaining: `settings?.totalPoints ?? 0` |

### Task 3.4: Fix `src/components/Calendar.tsx` (2 errors)

| Line | Issue | Fix |
|------|-------|-----|
| 39 | `unknown` not assignable to `SetStateAction<boolean>` | Cast or validate type |
| 235, 331 | `className` not on `IntrinsicAttributes` | Type the component properly |

### Task 3.5: Fix `src/lib/visualFeedback.ts` (1 error)

| Line | Issue | Fix |
|------|-------|-----|
| 261 | `options.action` possibly undefined | Add check: `if (options.action)` |

---

## Phase 4: Fix Type Incompatibilities (~10 errors)
**Priority: MEDIUM** | **Estimated Time: 30 min** | **Errors Fixed: ~10**

### Task 4.1: Fix Timeout Types (2 errors)

**Files:** `src/lib/performance.ts:186`, `src/edgePanel.ts:79`

```typescript
// Before
let timeout: number = setTimeout(...);

// After
let timeout: ReturnType<typeof setTimeout> = setTimeout(...);
// Or for Node.js compatibility:
let timeout: number | NodeJS.Timeout = setTimeout(...);
```

### Task 4.2: Fix `src/components/Calendar.tsx` Import Conflict (1 error)

**Line 2:** Import declaration conflicts with local declaration

```typescript
// Before
import { Calendar } from 'lucide-react';
// Component named Calendar below

// After - rename import
import { Calendar as CalendarIcon } from 'lucide-react';
```

### Task 4.3: Fix `src/lib/smartQueue.ts` (3 errors)

| Line | Issue | Fix |
|------|-------|-----|
| 75 | `null` not assignable to `IndexableType` | Use `undefined` instead or update Dexie types |
| 112 | `boolean \| undefined` to `boolean` | Add `?? false` default |
| 133 | `null` not assignable | Same as line 75 |

### Task 4.4: Fix `src/components/TaskList.tsx` (1 error)

| Line | Issue | Fix |
|------|-------|-----|
| 58 | `undefined` not assignable to `number \| Task` | Add null check before calling |

### Task 4.5: Fix `src/lib/errorHandling.ts` (1 error)

| Line | Issue | Fix |
|------|-------|-----|
| 309 | Expected 1-2 arguments, got 3 | Remove extra argument or fix function signature |

### Task 4.6: Fix `src/edgePanel.ts` Variable Redeclaration (1 error)

| Line | Issue | Fix |
|------|-------|-----|
| 11 | Cannot redeclare `chrome` | Remove local declaration, use global `chrome` |

---

## Phase 5: Fix Missing React Hooks (2 errors)
**Priority: MEDIUM** | **Estimated Time: 5 min** | **Errors Fixed: 2**

### Task 5.1: Fix `src/lib/performance.ts`

**Lines 359, 362:** Add missing import

```typescript
// Add at top of file
import { useRef } from 'react';
```

**Line 436:** Fix return type issue - likely needs to return a cleanup function instead of void.

---

## Phase 6: Remove Unused Declarations (~50 errors)
**Priority: LOW** | **Estimated Time: 30 min** | **Errors Fixed: ~50**

These don't break functionality but clutter the codebase.

### Task 6.1: Clean `src/App.tsx` (19 errors)

Remove or use these unused imports:
- `Plus`, `BarChart3`, `Trophy`, `Calendar`, `Brain` from lucide-react
- `Gamification`, `CalendarComponent`, `DeepWorkMode`, `KeyboardNavigation` components
- `initializeGamification`, `initializeDeepWorkMode`, `initializeVisualFeedback`, `showErrorFeedback`
- Unused state variables: `showGamification`, `showCalendar`, `showDeepWorkMode`
- Unused function: `handleKeyboardAction`

### Task 6.2: Clean `src/components/Analytics.tsx` (3 errors)

Remove: `Task`, `format`, `tasksCompletedThisMonth`

### Task 6.3: Clean `src/components/Calendar.tsx` (3 errors)

Remove: `isToday`, `isAfter`, `isBefore`

### Task 6.4: Clean `src/components/DeepWorkMode.tsx` (2 errors)

Remove: `Pause`, `Globe`

### Task 6.5: Clean `src/components/Gamification.tsx` (1 error)

Remove: `Target`

### Task 6.6: Clean `src/components/Sync.tsx` (1 error)

Remove: `setLastSyncTime`

### Task 6.7: Clean `src/components/TaskInput.tsx` (5 errors)

Remove: `Calendar`, `Clock`, `Tag`, `Flag`, and unused import declaration

### Task 6.8: Clean `src/lib/accessibility.ts` (2 errors)

Remove: `focusableElements`, `focusTrap`

### Task 6.9: Clean `src/lib/deepWorkMode.ts` (2 errors)

Remove: `Settings`, `createBreakTimeNotification`

### Task 6.10: Clean `src/lib/gamification.ts` (3 errors)

Remove: `Settings`, `isToday`, `isYesterday`

### Task 6.11: Clean `src/lib/googleCalendar.ts` (4 errors)

Remove: `CLIENT_ID`, `API_KEY`, `DISCOVERY_DOC`, `event`

### Task 6.12: Clean `src/lib/smartQueue.ts` (1 error)

Remove: `tomorrow`

### Task 6.13: Clean `src/lib/snooze.ts` (1 error)

Remove: `Task` (if not used after analytics fix)

### Task 6.14: Clean `src/lib/sync.ts` (2 errors)

Remove: `localSettingsMap`, `remoteSettingsMap`

---

## Execution Order

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
(blocking)  (types)    (null)      (compat)    (hooks)    (cleanup)
   │           │          │           │           │           │
   ▼           ▼          ▼           ▼           ▼           ▼
 15 min     30 min     45 min      30 min       5 min      30 min
```

**Total Estimated Time: ~2.5 hours**

---

## Verification Steps

After each phase:
```powershell
npx tsc --noEmit 2>&1 | Select-String "error" | Measure-Object
```

After all phases:
```powershell
npm run build
```

If successful, test the extension:
1. Load `dist/` folder in Edge as unpacked extension
2. Verify popup opens
3. Verify content script runs (check console for EdgeTask logs)
4. Test basic task creation

---

## Post-Fix Recommendations

1. **Add `strict: true`** to `tsconfig.json` if not present
2. **Enable ESLint rule** `@typescript-eslint/no-unused-vars`
3. **Add pre-commit hook** to run `tsc --noEmit`
4. **Consider adding tests** for critical paths (reminders, notifications)

// Pure date + scoring logic. No React or storage imports, so it is unit-testable.

export type WeekStart = 0 | 1 | 6; // Sunday, Monday, Saturday

export type LifeArea = 'spiritual' | 'physical' | 'mental' | 'emotional';
export const LIFE_AREAS: { key: LifeArea; label: string; emoji: string }[] = [
  { key: 'spiritual', label: 'Spiritual', emoji: '🕌' },
  { key: 'physical', label: 'Physical', emoji: '💪' },
  { key: 'mental', label: 'Mental', emoji: '🧠' },
  { key: 'emotional', label: 'Emotional', emoji: '💛' },
];

/** A target that applies from `from` (YYYY-MM-DD) until the next change. */
export type TargetChange = { from: string; target: number };

/** An archive period. `to` = the day it was restored, null while still archived. */
export type ArchivePeriod = { from: string; to: string | null };

export type HabitReminder = { enabled: boolean; time: string; days: number[] }; // time "HH:MM", days 0=Sun

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  createdAt: string; // YYYY-MM-DD
  targets: TargetChange[]; // sorted by `from`, never empty
  archived: ArchivePeriod[];
  area: LifeArea | null;
  reminder: HabitReminder | null;
};

// habit id -> list of YYYY-MM-DD days it was done
export type Checks = Record<string, string[]>;

export type Settings = {
  weekStart: WeekStart;
  dailyReminder: { enabled: boolean; time: string };
  backupReminder: { enabled: boolean };
  lastBackupAt: string | null; // YYYY-MM-DD
  firstUseAt: string | null; // YYYY-MM-DD, first launch of v2 (backup reminder fallback)
  notificationsAsked: boolean; // the in-app "turn on reminders?" card was answered
};

export type AppData = {
  schemaVersion: 2;
  habits: Habit[];
  checks: Checks;
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  weekStart: 0,
  dailyReminder: { enabled: true, time: '08:00' },
  backupReminder: { enabled: true },
  lastBackupAt: null,
  firstUseAt: null,
  notificationsAsked: false,
};

export const EMPTY_DATA: AppData = {
  schemaVersion: 2,
  habits: [],
  checks: {},
  settings: DEFAULT_SETTINGS,
};

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** First day (as key) of the week containing `key`. */
export function startOfWeek(key: string, weekStart: WeekStart): string {
  const dow = parseKey(key).getDay();
  return addDays(key, -((dow - weekStart + 7) % 7));
}

export function weekDays(weekStartKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartKey, i));
}

// ---------- Targets (F05) ----------

/** Target that applies in a week: the last change made on or before the week's last day. */
export function targetForWeek(habit: Habit, weekStartKey: string): number {
  const end = addDays(weekStartKey, 6);
  let target = habit.targets[0]?.target ?? 1;
  for (const t of habit.targets) {
    if (t.from <= end) target = t.target;
  }
  return target;
}

/**
 * Change a habit's target.
 * 'forward': applies from the current week on; past weeks keep their old target.
 * 'all': replaces the target for every week since the habit was created.
 */
export function changeTarget(
  habit: Habit,
  target: number,
  mode: 'forward' | 'all',
  currentWeekStart: string,
): Habit {
  if (mode === 'all') return { ...habit, targets: [{ from: habit.createdAt, target }] };
  const kept = habit.targets.filter((t) => t.from < currentWeekStart);
  return { ...habit, targets: [...kept, { from: currentWeekStart, target }] };
}

// ---------- Archive (F06) ----------

export function isArchived(habit: Habit): boolean {
  return habit.archived.some((p) => p.to === null);
}

/** True when the habit was archived at any point during the week. Such weeks never count. */
export function archivedDuringWeek(habit: Habit, weekStartKey: string): boolean {
  const end = addDays(weekStartKey, 6);
  return habit.archived.some((p) => p.from <= end && (p.to === null || p.to >= weekStartKey));
}

export function archiveHabit(habit: Habit, today: string): Habit {
  if (isArchived(habit)) return habit;
  return { ...habit, archived: [...habit.archived, { from: today, to: null }] };
}

export function restoreHabit(habit: Habit, today: string): Habit {
  return {
    ...habit,
    archived: habit.archived.map((p) => (p.to === null ? { ...p, to: today } : p)),
  };
}

/** Habits shown on the Week screen. */
export function activeHabits(habits: Habit[]): Habit[] {
  return habits.filter((h) => !isArchived(h));
}

// ---------- Scoring ----------

/** Habits that count toward the given week: existed by then and were not archived during it. */
export function habitsInWeek(habits: Habit[], weekStartKey: string): Habit[] {
  const end = addDays(weekStartKey, 6);
  return habits.filter((h) => h.createdAt <= end && !archivedDuringWeek(h, weekStartKey));
}

export function weekCount(checks: Checks, habitId: string, weekStartKey: string): number {
  const end = addDays(weekStartKey, 6);
  return (checks[habitId] ?? []).filter((k) => k >= weekStartKey && k <= end).length;
}

export function isHabitDone(habit: Habit, checks: Checks, weekStartKey: string): boolean {
  return weekCount(checks, habit.id, weekStartKey) >= targetForWeek(habit, weekStartKey);
}

/**
 * Week score, 0-100. Each habit contributes min(done / target, 1).
 * Returns null when no habit counted that week.
 */
export function weekScore(habits: Habit[], checks: Checks, weekStartKey: string): number | null {
  const active = habitsInWeek(habits, weekStartKey);
  if (active.length === 0) return null;
  const sum = active.reduce(
    (acc, h) =>
      acc + Math.min(weekCount(checks, h.id, weekStartKey) / targetForWeek(h, weekStartKey), 1),
    0,
  );
  return Math.round((sum / active.length) * 100);
}

/**
 * Consecutive weeks the habit hit its target, ending at the current week.
 * An unfinished current week does not break the streak; it just is not counted yet.
 * Archived weeks are skipped: they neither break nor extend the streak.
 */
export function habitStreak(
  habit: Habit,
  checks: Checks,
  todayKey: string,
  weekStart: WeekStart,
): number {
  const current = startOfWeek(todayKey, weekStart);
  const firstWeek = startOfWeek(habit.createdAt, weekStart);
  let streak =
    !archivedDuringWeek(habit, current) && isHabitDone(habit, checks, current) ? 1 : 0;
  for (let w = addDays(current, -7); w >= firstWeek; w = addDays(w, -7)) {
    if (archivedDuringWeek(habit, w)) continue;
    if (!isHabitDone(habit, checks, w)) break;
    streak++;
  }
  return streak;
}

export function toggleCheck(checks: Checks, habitId: string, day: string): Checks {
  const list = checks[habitId] ?? [];
  const next = list.includes(day) ? list.filter((k) => k !== day) : [...list, day];
  return { ...checks, [habitId]: next };
}

/** Scores for the last `n` weeks, oldest first, ending with the current week. */
export function scoreHistory(
  data: AppData,
  todayKey: string,
  n: number,
): { week: string; score: number | null }[] {
  const current = startOfWeek(todayKey, data.settings.weekStart);
  return Array.from({ length: n }, (_, i) => {
    const week = addDays(current, -7 * (n - 1 - i));
    return { week, score: weekScore(data.habits, data.checks, week) };
  });
}

// ---------- Life areas (F17 light) ----------

export type AreaBalance = { area: LifeArea; habits: number; done: number; target: number };

/** Per life area: active habits, and this week's done vs target (each habit capped at its target). */
export function areaBalance(data: AppData, weekStartKey: string): AreaBalance[] {
  const inWeek = habitsInWeek(activeHabits(data.habits), weekStartKey);
  return LIFE_AREAS.map(({ key }) => {
    const hs = inWeek.filter((h) => h.area === key);
    let done = 0;
    let target = 0;
    for (const h of hs) {
      const t = targetForWeek(h, weekStartKey);
      target += t;
      done += Math.min(weekCount(data.checks, h.id, weekStartKey), t);
    }
    return { area: key, habits: hs.length, done, target };
  });
}

// ---------- Labels ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function shortDate(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function weekLabel(weekStartKey: string): string {
  return `${shortDate(weekStartKey)} – ${shortDate(addDays(weekStartKey, 6))}`;
}

// ---------- Parsing, migration ----------

const isDateKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v: unknown): v is string =>
  typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const isTarget = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 7;

function parseHabit(raw: unknown): Habit | null {
  if (!raw || typeof raw !== 'object') return null;
  const h = raw as Record<string, unknown>;
  if (typeof h.id !== 'string' || typeof h.name !== 'string' || !isDateKey(h.createdAt)) {
    return null;
  }
  const createdAt = h.createdAt;

  // v2: a list of target changes. v1: a single numeric target.
  let targets: TargetChange[] = [];
  if (Array.isArray(h.targets)) {
    targets = h.targets
      .filter(
        (t): t is TargetChange =>
          !!t && typeof t === 'object' && isDateKey(t.from) && isTarget(t.target),
      )
      .map((t) => ({ from: t.from, target: t.target }))
      .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  } else if (isTarget(h.target)) {
    targets = [{ from: createdAt, target: h.target }];
  }
  if (targets.length === 0) return null;

  const archived: ArchivePeriod[] = Array.isArray(h.archived)
    ? h.archived
        .filter(
          (p): p is ArchivePeriod =>
            !!p && typeof p === 'object' && isDateKey(p.from) && (p.to === null || isDateKey(p.to)),
        )
        .map((p) => ({ from: p.from, to: p.to }))
    : [];

  const area = LIFE_AREAS.some((a) => a.key === h.area) ? (h.area as LifeArea) : null;

  let reminder: HabitReminder | null = null;
  const r = h.reminder as Record<string, unknown> | null | undefined;
  if (r && typeof r === 'object' && isTime(r.time) && Array.isArray(r.days)) {
    reminder = {
      enabled: r.enabled === true,
      time: r.time,
      days: [...new Set(r.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort(),
    };
  }

  return {
    id: h.id,
    name: h.name,
    emoji: typeof h.emoji === 'string' ? h.emoji : '⭐',
    createdAt,
    targets,
    archived,
    area,
    reminder,
  };
}

function parseSettings(raw: Record<string, unknown>): Settings {
  // v1 kept weekStart at the top level; v2 keeps it in settings.
  const s = (raw.settings && typeof raw.settings === 'object' ? raw.settings : {}) as Record<
    string,
    unknown
  >;
  const ws = s.weekStart ?? raw.weekStart;
  const weekStart: WeekStart = ws === 1 || ws === 6 ? ws : 0;
  const dr = s.dailyReminder as Record<string, unknown> | undefined;
  const br = s.backupReminder as Record<string, unknown> | undefined;
  return {
    weekStart,
    dailyReminder: {
      enabled: typeof dr?.enabled === 'boolean' ? dr.enabled : DEFAULT_SETTINGS.dailyReminder.enabled,
      time: isTime(dr?.time) ? dr.time : DEFAULT_SETTINGS.dailyReminder.time,
    },
    backupReminder: {
      enabled: typeof br?.enabled === 'boolean' ? br.enabled : DEFAULT_SETTINGS.backupReminder.enabled,
    },
    lastBackupAt: isDateKey(s.lastBackupAt) ? s.lastBackupAt : null,
    firstUseAt: isDateKey(s.firstUseAt) ? s.firstUseAt : null,
    notificationsAsked: s.notificationsAsked === true,
  };
}

/**
 * Defensive parse of whatever was persisted or imported. Accepts v1 and v2 shapes and
 * always returns valid v2 data; bad entries are dropped, never thrown.
 */
export function sanitize(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') return EMPTY_DATA;
  const r = raw as Record<string, unknown>;
  const seen = new Set<string>();
  const habits = (Array.isArray(r.habits) ? r.habits : [])
    .map(parseHabit)
    .filter((h): h is Habit => h !== null && !seen.has(h.id) && !!seen.add(h.id));
  const checks: Checks = {};
  if (r.checks && typeof r.checks === 'object') {
    for (const h of habits) {
      const list = (r.checks as Record<string, unknown>)[h.id];
      if (Array.isArray(list)) checks[h.id] = [...new Set(list.filter(isDateKey))];
    }
  }
  return { schemaVersion: 2, habits, checks, settings: parseSettings(r) };
}

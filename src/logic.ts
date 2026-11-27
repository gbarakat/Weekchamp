// Pure date, scoring and data-shape logic. No React, storage or Expo imports, so it is unit-testable.

export type WeekStart = 0 | 1 | 6; // Sunday, Monday, Saturday

export type LifeArea = 'spiritual' | 'physical' | 'mental' | 'emotional';

export const LIFE_AREAS: { id: LifeArea; label: string; emoji: string }[] = [
  { id: 'spiritual', label: 'Spiritual', emoji: '🕌' },
  { id: 'physical', label: 'Physical', emoji: '💪' },
  { id: 'mental', label: 'Mental', emoji: '🧠' },
  { id: 'emotional', label: 'Emotional', emoji: '💛' },
];

/** `from` is the first day (YYYY-MM-DD) the target applies. */
export type TargetChange = { from: string; target: number };

/** Archived on days from..to-1. `to` is the restore day; null means still archived. */
export type ArchivePeriod = { from: string; to: string | null };

export type HabitReminder = { enabled: boolean; time: string; days: number[] }; // time "HH:MM", days 0=Sun..6=Sat

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  createdAt: string; // YYYY-MM-DD
  targets: TargetChange[]; // sorted by from, at least one entry
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
  firstLaunchAt: string | null; // YYYY-MM-DD, anchors the first backup reminder
  notificationsAsked: boolean; // the one-time reminder explainer was answered
};

export type AppData = { schemaVersion: 2; habits: Habit[]; checks: Checks; settings: Settings };

export const DEFAULT_SETTINGS: Settings = {
  weekStart: 0,
  dailyReminder: { enabled: true, time: '08:00' },
  backupReminder: { enabled: true },
  lastBackupAt: null,
  firstLaunchAt: null,
  notificationsAsked: false,
};

export const EMPTY_DATA: AppData = {
  schemaVersion: 2,
  habits: [],
  checks: {},
  settings: DEFAULT_SETTINGS,
};

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// ---------- dates ----------

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

export function isDateKey(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return dateKey(parseKey(v)) === v;
}

export function isValidTime(v: unknown): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

export function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

export function formatTime(hour: number, minute: number): string {
  return `${pad(((hour % 24) + 24) % 24)}:${pad(((minute % 60) + 60) % 60)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function shortDate(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function longDate(key: string): string {
  return `${shortDate(key)} ${parseKey(key).getFullYear()}`;
}

export function weekLabel(weekStartKey: string): string {
  return `${shortDate(weekStartKey)} – ${shortDate(addDays(weekStartKey, 6))}`;
}

// ---------- targets ----------

/** The target for a week: the last change that starts on or before the week's last day. */
export function targetForWeek(habit: Habit, weekStartKey: string): number {
  const end = addDays(weekStartKey, 6);
  let target = habit.targets[0].target;
  for (const change of habit.targets) {
    if (change.from <= end) target = change.target;
  }
  return target;
}

export type TargetMode = 'fromThisWeek' | 'allWeeks';

/**
 * 'fromThisWeek' keeps past weeks on their old target.
 * 'allWeeks' applies the new target to the whole history.
 */
export function changeTarget(
  habit: Habit,
  target: number,
  mode: TargetMode,
  currentWeekStart: string,
): Habit {
  if (mode === 'allWeeks') {
    return { ...habit, targets: [{ from: habit.createdAt, target }] };
  }
  const kept = habit.targets.filter((c) => c.from < currentWeekStart);
  return { ...habit, targets: [...kept, { from: currentWeekStart, target }] };
}

// ---------- archive ----------

export function isArchivedNow(habit: Habit): boolean {
  return habit.archived.some((p) => p.to === null);
}

/** The day the habit was last archived, if it is archived now. */
export function archivedSince(habit: Habit): string | null {
  return habit.archived.find((p) => p.to === null)?.from ?? null;
}

/** True if the habit was archived on any day of the week. */
export function archivedInWeek(habit: Habit, weekStartKey: string): boolean {
  const end = addDays(weekStartKey, 6);
  return habit.archived.some(
    (p) => p.from <= end && (p.to === null || (p.to > weekStartKey && p.to > p.from)),
  );
}

export function archiveHabit(habit: Habit, todayKey: string): Habit {
  if (isArchivedNow(habit)) return habit;
  return { ...habit, archived: [...habit.archived, { from: todayKey, to: null }] };
}

export function restoreHabit(habit: Habit, todayKey: string): Habit {
  return {
    ...habit,
    archived: habit.archived
      .map((p) => (p.to === null ? { ...p, to: todayKey } : p))
      // Archived and restored on the same day: as if it never happened.
      .filter((p) => p.to === null || p.to > p.from),
  };
}

export function deleteHabit(data: AppData, habitId: string): AppData {
  const { [habitId]: _removed, ...checks } = data.checks;
  return { ...data, habits: data.habits.filter((h) => h.id !== habitId), checks };
}

// ---------- scoring ----------

/** A week counts for a habit if it existed by then and was not archived at any point in it. */
export function countsInWeek(habit: Habit, weekStartKey: string): boolean {
  return habit.createdAt <= addDays(weekStartKey, 6) && !archivedInWeek(habit, weekStartKey);
}

/** Habits scored in the given week. */
export function habitsInWeek(habits: Habit[], weekStartKey: string): Habit[] {
  return habits.filter((h) => countsInWeek(h, weekStartKey));
}

/**
 * Habits to list on the Week screen. The current week shows every habit that is not archived
 * right now (including one restored this week, which is listed but not scored). Past weeks show
 * what was scored.
 */
export function habitsToShow(habits: Habit[], weekStartKey: string, currentWeekStart: string): Habit[] {
  if (weekStartKey !== currentWeekStart) return habitsInWeek(habits, weekStartKey);
  const end = addDays(weekStartKey, 6);
  return habits.filter((h) => h.createdAt <= end && !isArchivedNow(h));
}

export function weekCount(checks: Checks, habitId: string, weekStartKey: string): number {
  const end = addDays(weekStartKey, 6);
  return (checks[habitId] ?? []).filter((k) => k >= weekStartKey && k <= end).length;
}

export function isHabitDone(habit: Habit, checks: Checks, weekStartKey: string): boolean {
  return weekCount(checks, habit.id, weekStartKey) >= targetForWeek(habit, weekStartKey);
}

/**
 * Week score, 0-100. Each scored habit contributes min(done / target, 1).
 * Returns null when no habit counts that week.
 */
export function weekScore(habits: Habit[], checks: Checks, weekStartKey: string): number | null {
  const scored = habitsInWeek(habits, weekStartKey);
  if (scored.length === 0) return null;
  const sum = scored.reduce(
    (acc, h) =>
      acc + Math.min(weekCount(checks, h.id, weekStartKey) / targetForWeek(h, weekStartKey), 1),
    0,
  );
  return Math.round((sum / scored.length) * 100);
}

/**
 * Consecutive weeks the habit hit its target, ending at the current week.
 * An unfinished current week does not break the streak; it just is not counted yet.
 * Archived weeks are skipped: they neither break nor extend it.
 */
export function habitStreak(
  habit: Habit,
  checks: Checks,
  todayKey: string,
  weekStart: WeekStart,
): number {
  const current = startOfWeek(todayKey, weekStart);
  const firstWeek = startOfWeek(habit.createdAt, weekStart);
  let streak = 0;
  for (let w = current; w >= firstWeek; w = addDays(w, -7)) {
    if (archivedInWeek(habit, w)) continue;
    if (isHabitDone(habit, checks, w)) streak++;
    else if (w !== current) break;
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

// ---------- life areas ----------

export type AreaBalance = { area: LifeArea; habits: number; done: number; target: number };

/** Per life area: active habits, and this week's done / target summed across them. */
export function areaBalance(data: AppData, weekStartKey: string): AreaBalance[] {
  const active = habitsToShow(data.habits, weekStartKey, weekStartKey);
  return LIFE_AREAS.map(({ id }) => {
    const mine = active.filter((h) => h.area === id);
    let done = 0;
    let target = 0;
    for (const h of mine) {
      const t = targetForWeek(h, weekStartKey);
      target += t;
      done += Math.min(weekCount(data.checks, h.id, weekStartKey), t);
    }
    return { area: id, habits: mine.length, done, target };
  });
}

// ---------- persistence: validation, migration, backup ----------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const isTarget = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 7;

function sanitizeHabit(raw: unknown): Habit | null {
  if (!isObj(raw)) return null;
  const { id, name, createdAt } = raw;
  if (typeof id !== 'string' || id === '') return null;
  if (typeof name !== 'string' || name.trim() === '') return null;
  if (!isDateKey(createdAt)) return null;

  const targets = (Array.isArray(raw.targets) ? raw.targets : [])
    .filter((c): c is TargetChange => isObj(c) && isDateKey(c.from) && isTarget(c.target))
    .map((c) => ({ from: c.from, target: c.target }))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  if (targets.length === 0) return null;

  const archived = (Array.isArray(raw.archived) ? raw.archived : [])
    .filter(
      (p): p is ArchivePeriod => isObj(p) && isDateKey(p.from) && (p.to === null || isDateKey(p.to)),
    )
    .map((p) => ({ from: p.from, to: p.to }))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));

  const area = LIFE_AREAS.some((a) => a.id === raw.area) ? (raw.area as LifeArea) : null;

  let reminder: HabitReminder | null = null;
  const r = raw.reminder;
  if (isObj(r) && typeof r.enabled === 'boolean' && isValidTime(r.time) && Array.isArray(r.days)) {
    const days = ALL_DAYS.filter((d) => (r.days as unknown[]).includes(d));
    reminder = { enabled: r.enabled, time: r.time, days };
  }

  return {
    id,
    name: name.trim(),
    emoji: typeof raw.emoji === 'string' && raw.emoji !== '' ? raw.emoji : '⭐',
    createdAt,
    targets,
    archived,
    area,
    reminder,
  };
}

function sanitizeSettings(raw: unknown): Settings {
  const s = isObj(raw) ? raw : {};
  const daily = isObj(s.dailyReminder) ? s.dailyReminder : {};
  const backup = isObj(s.backupReminder) ? s.backupReminder : {};
  return {
    weekStart: s.weekStart === 1 || s.weekStart === 6 ? s.weekStart : 0,
    dailyReminder: {
      enabled:
        typeof daily.enabled === 'boolean' ? daily.enabled : DEFAULT_SETTINGS.dailyReminder.enabled,
      time: isValidTime(daily.time) ? daily.time : DEFAULT_SETTINGS.dailyReminder.time,
    },
    backupReminder: {
      enabled:
        typeof backup.enabled === 'boolean'
          ? backup.enabled
          : DEFAULT_SETTINGS.backupReminder.enabled,
    },
    lastBackupAt: isDateKey(s.lastBackupAt) ? s.lastBackupAt : null,
    firstLaunchAt: isDateKey(s.firstLaunchAt) ? s.firstLaunchAt : null,
    notificationsAsked: s.notificationsAsked === true,
  };
}

/** Defensive parse of v2-shaped data: drops bad entries, never throws. */
export function sanitize(raw: unknown): AppData {
  const r = isObj(raw) ? raw : {};
  const seen = new Set<string>();
  const habits: Habit[] = [];
  for (const item of Array.isArray(r.habits) ? r.habits : []) {
    const habit = sanitizeHabit(item);
    if (habit && !seen.has(habit.id)) {
      seen.add(habit.id);
      habits.push(habit);
    }
  }
  const checks: Checks = {};
  if (isObj(r.checks)) {
    for (const h of habits) {
      const list = r.checks[h.id];
      if (Array.isArray(list)) checks[h.id] = [...new Set(list.filter(isDateKey))];
    }
  }
  return { schemaVersion: 2, habits, checks, settings: sanitizeSettings(r.settings) };
}

/** Reshape v1 data ({ habits: [{ target }], checks, weekStart }) into the v2 shape. */
export function migrateV1(raw: unknown): unknown {
  if (!isObj(raw)) return null;
  const habits = (Array.isArray(raw.habits) ? raw.habits : []).map((h) =>
    isObj(h)
      ? {
          ...h,
          targets: [{ from: h.createdAt, target: h.target }],
          archived: [],
          area: null,
          reminder: null,
        }
      : h,
  );
  return {
    schemaVersion: 2,
    habits,
    checks: raw.checks,
    settings: { weekStart: raw.weekStart },
  };
}

/** Accepts v1- or v2-shaped data and returns valid v2 data. */
export function normalize(raw: unknown): AppData {
  if (isObj(raw) && raw.schemaVersion === 2) return sanitize(raw);
  return sanitize(migrateV1(raw));
}

export type BackupFile = {
  app: 'weekchamp';
  schemaVersion: 2;
  exportedAt: string; // ISO time
  data: AppData;
};

export function makeBackup(data: AppData, exportedAt: string): BackupFile {
  return { app: 'weekchamp', schemaVersion: 2, exportedAt, data };
}

export function backupFileName(todayKey: string): string {
  return `weekchamp-backup-${todayKey}.json`;
}

export type BackupParse =
  | { ok: true; data: AppData; exportedAt: string | null }
  | { ok: false };

/** Validates a backup file's text. Either the whole file is accepted or none of it. */
export function parseBackup(text: string): BackupParse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!isObj(parsed) || parsed.app !== 'weekchamp') return { ok: false };
  if (!isObj(parsed.data) || !Array.isArray(parsed.data.habits)) return { ok: false };
  const exportedAt =
    typeof parsed.exportedAt === 'string' && !Number.isNaN(Date.parse(parsed.exportedAt))
      ? parsed.exportedAt
      : null;
  return { ok: true, data: normalize(parsed.data), exportedAt };
}

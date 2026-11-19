// Pure date + scoring logic. No React or storage imports, so it is unit-testable.

export type WeekStart = 0 | 1 | 6; // Sunday, Monday, Saturday

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  target: number; // times per week, 1-7
  createdAt: string; // YYYY-MM-DD
};

// habit id -> list of YYYY-MM-DD days it was done
export type Checks = Record<string, string[]>;

export type AppData = {
  habits: Habit[];
  checks: Checks;
  weekStart: WeekStart;
};

export const EMPTY_DATA: AppData = { habits: [], checks: {}, weekStart: 0 };

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

/** Habits that existed at some point during the given week. */
export function habitsInWeek(habits: Habit[], weekStartKey: string): Habit[] {
  const end = addDays(weekStartKey, 6);
  return habits.filter((h) => h.createdAt <= end);
}

export function weekCount(checks: Checks, habitId: string, weekStartKey: string): number {
  const end = addDays(weekStartKey, 6);
  return (checks[habitId] ?? []).filter((k) => k >= weekStartKey && k <= end).length;
}

export function isHabitDone(habit: Habit, checks: Checks, weekStartKey: string): boolean {
  return weekCount(checks, habit.id, weekStartKey) >= habit.target;
}

/**
 * Week score, 0-100. Each habit contributes min(done / target, 1).
 * Returns null when no habit existed that week.
 */
export function weekScore(habits: Habit[], checks: Checks, weekStartKey: string): number | null {
  const active = habitsInWeek(habits, weekStartKey);
  if (active.length === 0) return null;
  const sum = active.reduce(
    (acc, h) => acc + Math.min(weekCount(checks, h.id, weekStartKey) / h.target, 1),
    0,
  );
  return Math.round((sum / active.length) * 100);
}

/**
 * Consecutive weeks the habit hit its target, ending at the current week.
 * An unfinished current week does not break the streak; it just is not counted yet.
 */
export function habitStreak(
  habit: Habit,
  checks: Checks,
  todayKey: string,
  weekStart: WeekStart,
): number {
  const current = startOfWeek(todayKey, weekStart);
  const firstWeek = startOfWeek(habit.createdAt, weekStart);
  let streak = isHabitDone(habit, checks, current) ? 1 : 0;
  for (let w = addDays(current, -7); w >= firstWeek; w = addDays(w, -7)) {
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
  const current = startOfWeek(todayKey, data.weekStart);
  return Array.from({ length: n }, (_, i) => {
    const week = addDays(current, -7 * (n - 1 - i));
    return { week, score: weekScore(data.habits, data.checks, week) };
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function shortDate(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function weekLabel(weekStartKey: string): string {
  return `${shortDate(weekStartKey)} – ${shortDate(addDays(weekStartKey, 6))}`;
}

/** Defensive parse of whatever was persisted. */
export function sanitize(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') return EMPTY_DATA;
  const r = raw as Partial<AppData>;
  const habits = Array.isArray(r.habits)
    ? r.habits.filter(
        (h): h is Habit =>
          !!h &&
          typeof h.id === 'string' &&
          typeof h.name === 'string' &&
          typeof h.createdAt === 'string' &&
          typeof h.target === 'number' &&
          h.target >= 1 &&
          h.target <= 7,
      )
    : [];
  const checks: Checks = {};
  if (r.checks && typeof r.checks === 'object') {
    for (const h of habits) {
      const list = (r.checks as Checks)[h.id];
      if (Array.isArray(list)) checks[h.id] = list.filter((k) => typeof k === 'string');
    }
  }
  const weekStart: WeekStart = r.weekStart === 1 || r.weekStart === 6 ? r.weekStart : 0;
  return { habits, checks, weekStart };
}

// Decides which local notifications should exist. Pure: the Expo calls live in notifications.ts.
//
// Local notifications cannot look at data when they fire, so the app reschedules the coming days
// every time data changes or the app opens, leaving out anything the skip rules exclude.

import {
  addDays,
  dateKey,
  isArchivedNow,
  parseKey,
  parseTime,
  startOfWeek,
  targetForWeek,
  weekCount,
  type AppData,
  type Habit,
} from './logic.ts';

export type PlannedNotification = {
  kind: 'daily' | 'habit' | 'backup';
  date: Date;
  title: string;
  body: string;
  /** Tab to open when tapped. */
  tab: 'week' | 'stats';
};

export const PLAN_DAYS = 7;
export const MAX_PLANNED = 60;
export const BACKUP_INTERVAL_DAYS = 30;
const NAMED_HABITS = 3;

function at(dayKey: string, time: string): Date {
  const d = parseKey(dayKey);
  const { hour, minute } = parseTime(time);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const activeOn = (habits: Habit[], dayKey: string) =>
  habits.filter((h) => !isArchivedNow(h) && h.createdAt <= dayKey);

/** Daily plan text for the week containing `dayKey`, or null when every target is met. */
export function dailyPlanBody(data: AppData, dayKey: string): string | null {
  const week = startOfWeek(dayKey, data.settings.weekStart);
  const active = activeOn(data.habits, dayKey);
  if (active.length === 0) return null;

  const left = active
    .map((h) => ({
      name: h.name,
      more: targetForWeek(h, week) - weekCount(data.checks, h.id, week),
    }))
    .filter((x) => x.more > 0)
    .sort((a, b) => a.more - b.more); // closest to done first
  if (left.length === 0) return null;

  const named = left
    .slice(0, NAMED_HABITS)
    .map((x) => `${x.name} (${x.more} more)`)
    .join(', ');
  const extra = left.length > NAMED_HABITS ? `, +${left.length - NAMED_HABITS} more` : '';
  const done = active.length - left.length;
  const lead =
    done > 0
      ? `${done} of ${active.length} habits done this week. Left: `
      : 'Left this week: ';
  return `${lead}${named}${extra}.`;
}

function backupNotification(data: AppData, now: Date): PlannedNotification | null {
  const { backupReminder, lastBackupAt, firstLaunchAt, dailyReminder } = data.settings;
  if (!backupReminder.enabled) return null;
  const base = lastBackupAt ?? firstLaunchAt;
  if (!base) return null;

  // Due every 30 days after the base date. Pick the first due time still ahead of now, so an
  // overdue reminder comes back monthly instead of every day.
  let days = BACKUP_INTERVAL_DAYS;
  let date = at(addDays(base, days), dailyReminder.time);
  while (date <= now) {
    days += BACKUP_INTERVAL_DAYS;
    date = at(addDays(base, days), dailyReminder.time);
  }
  const body = lastBackupAt
    ? `Last backup was ${days} days ago. Back up your habits now?`
    : 'Your habits are not backed up yet. Back them up now?';
  return { kind: 'backup', date, title: 'Keep your history safe', body, tab: 'stats' };
}

/** Everything that should be scheduled, soonest first, capped at MAX_PLANNED. */
export function planNotifications(data: AppData, now: Date): PlannedNotification[] {
  const planned: PlannedNotification[] = [];
  const today = dateKey(now);
  const { settings } = data;

  for (let i = 0; i < PLAN_DAYS; i++) {
    const day = addDays(today, i);
    const week = startOfWeek(day, settings.weekStart);

    if (settings.dailyReminder.enabled) {
      const date = at(day, settings.dailyReminder.time);
      const body = date > now ? dailyPlanBody(data, day) : null;
      if (body) planned.push({ kind: 'daily', date, title: "This week's plan", body, tab: 'week' });
    }

    for (const h of activeOn(data.habits, day)) {
      const r = h.reminder;
      if (!r || !r.enabled || !r.days.includes(parseKey(day).getDay())) continue;
      const date = at(day, r.time);
      if (date <= now) continue;
      if ((data.checks[h.id] ?? []).includes(day)) continue; // already ticked that day
      if (weekCount(data.checks, h.id, week) >= targetForWeek(h, week)) continue; // week target met
      planned.push({
        kind: 'habit',
        date,
        title: `${h.emoji} ${h.name}`,
        body: 'Time for it?',
        tab: 'week',
      });
    }
  }

  planned.sort((a, b) => a.date.getTime() - b.date.getTime());
  const backup = backupNotification(data, now);
  const capped = planned.slice(0, backup ? MAX_PLANNED - 1 : MAX_PLANNED);
  return backup ? [...capped, backup] : capped;
}

// Pure planning of local notifications (F02 + backup reminder). No Expo imports: unit-tested.
//
// Local notifications can't check the data when they fire, so the app cancels and
// re-plans the next few days on every change. Skipped ones are simply never scheduled.

import {
  activeHabits,
  addDays,
  dateKey,
  habitsInWeek,
  parseKey,
  startOfWeek,
  targetForWeek,
  weekCount,
  type AppData,
} from './logic.ts';

export type PlannedNotification = {
  id: string;
  at: Date;
  title: string;
  body: string;
  kind: 'daily' | 'habit' | 'backup';
};

export const PLAN_DAYS = 7;
export const BACKUP_EVERY_DAYS = 30;
const MAX_NOTIFICATIONS = 60;
const MAX_NAMED = 3;

function at(day: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = parseKey(day);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Body of the daily plan, wins first. Null when nothing is left this week (smart skip). */
export function dailyPlanBody(data: AppData, day: string): string | null {
  const week = startOfWeek(day, data.settings.weekStart);
  const habits = habitsInWeek(activeHabits(data.habits), week).filter((h) => h.createdAt <= day);
  if (habits.length === 0) return null;
  const left = habits
    .map((h) => ({ h, more: targetForWeek(h, week) - weekCount(data.checks, h.id, week) }))
    .filter((x) => x.more > 0);
  if (left.length === 0) return null;
  const done = habits.length - left.length;
  const named = left
    .slice(0, MAX_NAMED)
    .map((x) => `${x.h.name} (${x.more} more)`)
    .join(', ');
  const extra = left.length > MAX_NAMED ? `, +${left.length - MAX_NAMED} more` : '';
  return `${done} of ${habits.length} habits done this week. Left: ${named}${extra}.`;
}

export function planNotifications(data: AppData, now: Date): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  const today = dateKey(now);
  const { settings } = data;

  for (let i = 0; i < PLAN_DAYS; i++) {
    const day = addDays(today, i);
    const dow = parseKey(day).getDay();
    const week = startOfWeek(day, settings.weekStart);

    if (settings.dailyReminder.enabled) {
      const when = at(day, settings.dailyReminder.time);
      const body = when > now ? dailyPlanBody(data, day) : null;
      if (body) {
        out.push({ id: `daily-${day}`, at: when, title: 'Plan your day', body, kind: 'daily' });
      }
    }

    for (const h of habitsInWeek(activeHabits(data.habits), week)) {
      const r = h.reminder;
      if (!r?.enabled || !r.days.includes(dow) || h.createdAt > day) continue;
      const when = at(day, r.time);
      if (when <= now) continue;
      if ((data.checks[h.id] ?? []).includes(day)) continue; // already ticked that day
      if (weekCount(data.checks, h.id, week) >= targetForWeek(h, week)) continue; // target met
      out.push({
        id: `habit-${h.id}-${day}`,
        at: when,
        title: `${h.emoji} ${h.name}`,
        body: 'Time for it?',
        kind: 'habit',
      });
    }
  }

  const backup = planBackupReminder(data, now);
  out.sort((a, b) => a.at.getTime() - b.at.getTime());
  const capped = out.slice(0, MAX_NOTIFICATIONS - (backup ? 1 : 0));
  return backup ? [...capped, backup] : capped;
}

/** One reminder 30 days after the last backup (or first use), at the daily reminder time. */
export function planBackupReminder(data: AppData, now: Date): PlannedNotification | null {
  const { settings } = data;
  if (!settings.backupReminder.enabled) return null;
  const since = settings.lastBackupAt ?? settings.firstUseAt;
  if (!since) return null;
  const today = dateKey(now);
  let day = addDays(since, BACKUP_EVERY_DAYS);
  if (day < today) day = today;
  let when = at(day, settings.dailyReminder.time);
  if (when <= now) when = at(addDays(day, 1), settings.dailyReminder.time);
  const body = settings.lastBackupAt
    ? `Last backup was over ${BACKUP_EVERY_DAYS} days ago. Back up your habits now?`
    : 'You have no backup yet. Back up your habits now?';
  return { id: 'backup', at: when, title: 'Keep your progress safe', body, kind: 'backup' };
}

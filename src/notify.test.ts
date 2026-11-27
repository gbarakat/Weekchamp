import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDays,
  ALL_DAYS,
  archiveHabit,
  dateKey,
  DEFAULT_SETTINGS,
  type AppData,
  type Habit,
  type Settings,
} from './logic.ts';
import { dailyPlanBody, MAX_PLANNED, planNotifications } from './notify.ts';

// Thursday 19 Nov 2026, 07:00 local. Sunday-start week is 15–21 Nov.
const NOW = new Date(2026, 10, 19, 7, 0);
const TODAY = '2026-11-19';

const habit = (id: string, target: number, extra: Partial<Habit> = {}): Habit => ({
  id,
  name: id,
  emoji: '⭐',
  createdAt: '2026-01-01',
  targets: [{ from: '2026-01-01', target }],
  archived: [],
  area: null,
  reminder: null,
  ...extra,
});

// Backup reminder off unless a test is about it, so counts stay readable.
const dataOf = (
  habits: Habit[],
  checks: AppData['checks'] = {},
  settings: Partial<Settings> = {},
): AppData => ({
  schemaVersion: 2,
  habits,
  checks,
  settings: { ...DEFAULT_SETTINGS, backupReminder: { enabled: false }, ...settings },
});

const stamp = (d: Date) => `${dateKey(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// ---------- daily plan ----------

test('daily plan is scheduled for the next 7 days at the set time', () => {
  const plan = planNotifications(dataOf([habit('Gym', 2)]), NOW);
  assert.equal(plan.length, 7);
  assert.ok(plan.every((p) => p.kind === 'daily' && p.tab === 'week'));
  assert.equal(stamp(plan[0].date), '2026-11-19 08:00');
  assert.equal(stamp(plan[6].date), '2026-11-25 08:00');
});

test('a time already past today starts tomorrow', () => {
  const late = new Date(2026, 10, 19, 9, 0);
  const plan = planNotifications(dataOf([habit('Gym', 2)]), late);
  assert.equal(plan.length, 6);
  assert.equal(stamp(plan[0].date), '2026-11-20 08:00');
});

test('daily plan text is wins-first and names at most three habits', () => {
  const habits = [habit('Gym', 2), habit('Read', 3), habit('Walk', 1), habit('Pray', 5), habit('Write', 4)];
  const checks = {
    Gym: ['2026-11-15'], // 1 more
    Read: ['2026-11-15'], // 2 more
    Walk: ['2026-11-15'], // done
    Write: ['2026-11-15'], // 3 more
  };
  assert.equal(
    dailyPlanBody(dataOf(habits, checks), TODAY),
    '1 of 5 habits done this week. Left: Gym (1 more), Read (2 more), Write (3 more), +1 more.',
  );
  assert.equal(
    dailyPlanBody(dataOf([habit('Gym', 2)]), TODAY),
    'Left this week: Gym (2 more).',
  );
});

test('smart skip: no daily plan once every target is met this week', () => {
  const data = dataOf([habit('Gym', 1)], { Gym: ['2026-11-15'] });
  assert.equal(dailyPlanBody(data, TODAY), null);
  const plan = planNotifications(data, NOW);
  // This week (19–21 Nov) is skipped; next week starts fresh on Sunday 22 Nov.
  assert.deepEqual(plan.map((p) => stamp(p.date)), [
    '2026-11-22 08:00',
    '2026-11-23 08:00',
    '2026-11-24 08:00',
    '2026-11-25 08:00',
  ]);
});

test('no daily plan when it is off or there are no habits', () => {
  assert.deepEqual(planNotifications(dataOf([]), NOW), []);
  const off = dataOf([habit('Gym', 2)], {}, { dailyReminder: { enabled: false, time: '08:00' } });
  assert.deepEqual(planNotifications(off, NOW), []);
});

// ---------- per-habit reminders ----------

const dailyOff: Partial<Settings> = { dailyReminder: { enabled: false, time: '08:00' } };

test('per-habit reminders fire on the chosen days and time', () => {
  const gym = habit('Gym', 3, {
    emoji: '💪',
    reminder: { enabled: true, time: '18:30', days: [1, 4] }, // Mon, Thu
  });
  const plan = planNotifications(dataOf([gym], {}, dailyOff), NOW);
  assert.deepEqual(plan.map((p) => stamp(p.date)), ['2026-11-19 18:30', '2026-11-23 18:30']);
  assert.deepEqual(
    { kind: plan[0].kind, title: plan[0].title, body: plan[0].body },
    { kind: 'habit', title: '💪 Gym', body: 'Time for it?' },
  );
});

test('smart skip: no reminder on a day already ticked', () => {
  const gym = habit('Gym', 3, { reminder: { enabled: true, time: '18:30', days: ALL_DAYS } });
  const plan = planNotifications(dataOf([gym], { Gym: [TODAY] }, dailyOff), NOW);
  assert.equal(plan.length, 6);
  assert.equal(stamp(plan[0].date), '2026-11-20 18:30');
});

test('smart skip: no reminder once the weekly target is met', () => {
  const gym = habit('Gym', 2, { reminder: { enabled: true, time: '18:30', days: ALL_DAYS } });
  const checks = { Gym: ['2026-11-15', '2026-11-16'] };
  const plan = planNotifications(dataOf([gym], checks, dailyOff), NOW);
  // Nothing for the rest of this week; reminders resume next week.
  assert.deepEqual(plan.map((p) => stamp(p.date)), [
    '2026-11-22 18:30',
    '2026-11-23 18:30',
    '2026-11-24 18:30',
    '2026-11-25 18:30',
  ]);
});

test('disabled and archived habits never get reminders', () => {
  const reminder = { enabled: true, time: '18:30', days: ALL_DAYS };
  const off = habit('Off', 3, { reminder: { ...reminder, enabled: false } });
  const archived = archiveHabit(habit('Old', 3, { reminder }), '2026-11-01');
  assert.deepEqual(planNotifications(dataOf([off, archived], {}, dailyOff), NOW), []);
  // Archived habits are also left out of the daily plan.
  assert.deepEqual(planNotifications(dataOf([archived]), NOW), []);
});

test('the plan is sorted and capped', () => {
  const reminder = { enabled: true, time: '18:30', days: ALL_DAYS };
  const many = Array.from({ length: 12 }, (_, i) => habit(`H${i}`, 7, { reminder }));
  const plan = planNotifications(dataOf(many), NOW);
  assert.equal(plan.length, MAX_PLANNED);
  for (let i = 1; i < plan.length; i++) {
    assert.ok(plan[i - 1].date.getTime() <= plan[i].date.getTime());
  }
  assert.equal(stamp(plan[0].date), '2026-11-19 08:00');
});

// ---------- backup reminder ----------

const backupOnly = (settings: Partial<Settings>) =>
  planNotifications(
    dataOf([], {}, { ...dailyOff, backupReminder: { enabled: true }, ...settings }),
    NOW,
  );

test('backup reminder comes 30 days after the last backup, at the daily time', () => {
  const [n, ...rest] = backupOnly({ lastBackupAt: '2026-11-10' });
  assert.deepEqual(rest, []);
  assert.equal(n.kind, 'backup');
  assert.equal(n.tab, 'stats');
  assert.equal(stamp(n.date), '2026-12-10 08:00');
  assert.equal(n.body, 'Last backup was 30 days ago. Back up your habits now?');
});

test('with no backup yet it counts from first launch', () => {
  const [n] = backupOnly({ firstLaunchAt: '2026-11-19' });
  assert.equal(stamp(n.date), addDays('2026-11-19', 30) + ' 08:00');
  assert.equal(n.body, 'Your habits are not backed up yet. Back them up now?');
});

test('an overdue backup reminder returns monthly, not daily', () => {
  // Last backup 40 days ago: the 30-day slot has passed, so the next one is day 60.
  const [n] = backupOnly({ lastBackupAt: addDays(TODAY, -40) });
  assert.equal(stamp(n.date), addDays(TODAY, 20) + ' 08:00');
  assert.equal(n.body, 'Last backup was 60 days ago. Back up your habits now?');
});

test('no backup reminder when it is off or there is no anchor date', () => {
  assert.deepEqual(backupOnly({ backupReminder: { enabled: false }, lastBackupAt: '2026-11-10' }), []);
  assert.deepEqual(backupOnly({}), []);
});

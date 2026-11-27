import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EMPTY_DATA, type AppData, type Habit } from './logic.ts';
import { dailyPlanBody, planBackupReminder, planNotifications } from './reminders.ts';

// Thursday 19 Nov 2026, 07:00. Week (Sunday start) = 15-21 Nov.
const NOW = new Date(2026, 10, 19, 7, 0);

const habit = (id: string, target: number, extra: Partial<Habit> = {}): Habit => ({
  id,
  name: id,
  emoji: '⭐',
  createdAt: '2026-11-01',
  targets: [{ from: '2026-11-01', target }],
  archived: [],
  area: null,
  reminder: null,
  ...extra,
});

const data = (habits: Habit[], checks: Record<string, string[]> = {}, settings = {}): AppData => ({
  ...EMPTY_DATA,
  habits,
  checks,
  settings: { ...EMPTY_DATA.settings, ...settings },
});

test('daily plan lists what is left, wins first', () => {
  const d = data([habit('Gym', 3), habit('Read', 2), habit('Walk', 1)], {
    Gym: ['2026-11-16'],
    Walk: ['2026-11-15'],
  });
  assert.equal(
    dailyPlanBody(d, '2026-11-19'),
    '1 of 3 habits done this week. Left: Gym (2 more), Read (2 more).',
  );
});

test('daily plan names at most 3 habits', () => {
  const d = data(['a', 'b', 'c', 'd', 'e'].map((id) => habit(id, 1)));
  assert.match(dailyPlanBody(d, '2026-11-19') ?? '', /Left: a \(1 more\), b \(1 more\), c \(1 more\), \+2 more\.$/);
});

test('daily plan is skipped when every target is met', () => {
  const d = data([habit('a', 1)], { a: ['2026-11-15'] });
  assert.equal(dailyPlanBody(d, '2026-11-19'), null);
  const planned = planNotifications(d, NOW).filter((n) => n.kind === 'daily');
  // Met this week (19-21 Nov skipped), plans again from the next week (22-25 Nov).
  assert.deepEqual(planned.map((n) => n.id), ['daily-2026-11-22', 'daily-2026-11-23', 'daily-2026-11-24', 'daily-2026-11-25']);
});

test('daily plan at a time already passed today starts tomorrow', () => {
  const d = data([habit('a', 7)], {}, { dailyReminder: { enabled: true, time: '06:00' } });
  const first = planNotifications(d, NOW).find((n) => n.kind === 'daily');
  assert.equal(first?.id, 'daily-2026-11-20');
});

test('daily plan off means no daily notifications', () => {
  const d = data([habit('a', 7)], {}, { dailyReminder: { enabled: false, time: '08:00' } });
  assert.equal(planNotifications(d, NOW).filter((n) => n.kind === 'daily').length, 0);
});

test('per-habit reminders respect days, ticks, targets and archive', () => {
  const reminder = { enabled: true, time: '18:00', days: [4, 5] }; // Thu, Fri
  const d = data(
    [
      habit('gym', 2, { reminder }),
      habit('done', 1, { reminder }),
      habit('ticked', 3, { reminder }),
      habit('off', 3, { reminder: { ...reminder, enabled: false } }),
      habit('gone', 3, { reminder, archived: [{ from: '2026-11-10', to: null }] }),
    ],
    { done: ['2026-11-15'], ticked: ['2026-11-19'] },
    { dailyReminder: { enabled: false, time: '08:00' }, backupReminder: { enabled: false } },
  );
  const ids = planNotifications(d, NOW).map((n) => n.id);
  assert.deepEqual([...ids].sort(), [
    'habit-gym-2026-11-19',
    'habit-gym-2026-11-20',
    'habit-ticked-2026-11-20', // ticked today, so only from tomorrow
  ]);
  // The plan covers 7 days (19-25 Nov); 'done' met its target, so no ping this week.
  assert.ok(!ids.includes('habit-ticked-2026-11-19'));
  assert.ok(!ids.includes('habit-done-2026-11-19'));
  assert.ok(!ids.some((id) => id.startsWith('habit-off') || id.startsWith('habit-gone')));
});

test('backup reminder comes 30 days after the last backup, or today if overdue', () => {
  const s = (o: object) => data([], {}, o);
  assert.equal(planBackupReminder(s({ lastBackupAt: '2026-11-10' }), NOW)?.at.toDateString(), new Date(2026, 11, 10).toDateString());
  assert.equal(planBackupReminder(s({ lastBackupAt: '2026-09-01' }), NOW)?.at.getDate(), 19); // 08:00 today
  assert.equal(planBackupReminder(s({ firstUseAt: '2026-11-19' }), NOW)?.body, 'You have no backup yet. Back up your habits now?');
  assert.equal(planBackupReminder(s({ backupReminder: { enabled: false }, lastBackupAt: '2026-09-01' }), NOW), null);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDays,
  habitStreak,
  sanitize,
  scoreHistory,
  startOfWeek,
  toggleCheck,
  weekCount,
  weekDays,
  weekScore,
  targetForWeek,
  changeTarget,
  archiveHabit,
  restoreHabit,
  isArchived,
  activeHabits,
  areaBalance,
  EMPTY_DATA,
  DEFAULT_SETTINGS,
  type AppData,
  type Habit,
} from './logic.ts';

// 2026-11-19 is a Thursday.
const TODAY = '2026-11-19';
const habit = (id: string, target: number, createdAt = '2026-01-01'): Habit => ({
  id,
  name: id,
  emoji: '⭐',
  createdAt,
  targets: [{ from: createdAt, target }],
  archived: [],
  area: null,
  reminder: null,
});
const withData = (habits: Habit[], checks: Record<string, string[]> = {}): AppData => ({
  ...EMPTY_DATA,
  habits,
  checks,
});

test('startOfWeek respects the configured first day', () => {
  assert.equal(startOfWeek(TODAY, 0), '2026-11-15'); // Sunday
  assert.equal(startOfWeek(TODAY, 1), '2026-11-16'); // Monday
  assert.equal(startOfWeek(TODAY, 6), '2026-11-14'); // Saturday
  assert.equal(startOfWeek('2026-11-15', 0), '2026-11-15');
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(weekDays('2026-11-29').at(-1), '2026-12-05');
});

test('weekCount only counts days inside the week', () => {
  const checks = { a: ['2026-11-14', '2026-11-15', '2026-11-21', '2026-11-22'] };
  assert.equal(weekCount(checks, 'a', '2026-11-15'), 2);
  assert.equal(weekCount(checks, 'missing', '2026-11-15'), 0);
});

test('weekScore caps each habit at 100% and averages', () => {
  const habits = [habit('a', 2), habit('b', 4)];
  const checks = {
    a: ['2026-11-15', '2026-11-16', '2026-11-17'], // 3/2 -> capped at 1
    b: ['2026-11-15'], // 1/4
  };
  assert.equal(weekScore(habits, checks, '2026-11-15'), 63); // (1 + 0.25) / 2
  assert.equal(weekScore([], checks, '2026-11-15'), null);
});

test('weekScore ignores habits created after the week', () => {
  const habits = [habit('a', 1), habit('late', 1, '2026-11-22')];
  const checks = { a: ['2026-11-15'] };
  assert.equal(weekScore(habits, checks, '2026-11-15'), 100);
  assert.equal(weekScore(habits, checks, '2026-11-22'), 0);
});

test('habitStreak counts back from the current week', () => {
  const h = habit('a', 1);
  const done = (weeksAgo: number) => addDays('2026-11-15', -7 * weeksAgo);

  // Current week unfinished, previous two done, then a gap.
  assert.equal(habitStreak(h, { a: [done(1), done(2), done(4)] }, TODAY, 0), 2);
  // Current week done as well.
  assert.equal(habitStreak(h, { a: [done(0), done(1), done(2)] }, TODAY, 0), 3);
  // Last week missed: streak is only the current week.
  assert.equal(habitStreak(h, { a: [done(0), done(2)] }, TODAY, 0), 1);
  assert.equal(habitStreak(h, {}, TODAY, 0), 0);
});

test('toggleCheck adds then removes without mutating', () => {
  const start = { a: ['2026-11-15'] };
  const added = toggleCheck(start, 'a', '2026-11-16');
  assert.deepEqual(added.a, ['2026-11-15', '2026-11-16']);
  assert.deepEqual(toggleCheck(added, 'a', '2026-11-16').a, ['2026-11-15']);
  assert.deepEqual(start.a, ['2026-11-15']);
});

test('scoreHistory returns n weeks, oldest first', () => {
  const data = withData([habit('a', 1, '2026-11-08')], { a: ['2026-11-10'] });
  const hist = scoreHistory(data, TODAY, 3);
  assert.deepEqual(hist, [
    { week: '2026-11-01', score: null },
    { week: '2026-11-08', score: 100 },
    { week: '2026-11-15', score: 0 },
  ]);
});

test('sanitize drops malformed data', () => {
  assert.deepEqual(sanitize(null), EMPTY_DATA);
  const out = sanitize({
    habits: [habit('a', 3), { id: 'bad' }, habit('b', 9), habit('a', 2)],
    checks: { a: ['2026-11-15', 5, 'nope'], ghost: ['2026-11-15'] },
    settings: { weekStart: 3, dailyReminder: { enabled: 'yes', time: '25:00' } },
  });
  assert.deepEqual(out.habits.map((h) => h.id), ['a']);
  assert.deepEqual(out.checks, { a: ['2026-11-15'] });
  assert.deepEqual(out.settings, DEFAULT_SETTINGS);
});

test('sanitize migrates v1 data without losing anything', () => {
  const v1 = {
    habits: [{ id: 'gym', name: 'Gym', emoji: '💪', target: 3, createdAt: '2026-10-01' }],
    checks: { gym: ['2026-11-15', '2026-11-16'] },
    weekStart: 1,
  };
  const out = sanitize(v1);
  assert.equal(out.schemaVersion, 2);
  assert.deepEqual(out.habits, [
    {
      id: 'gym',
      name: 'Gym',
      emoji: '💪',
      createdAt: '2026-10-01',
      targets: [{ from: '2026-10-01', target: 3 }],
      archived: [],
      area: null,
      reminder: null,
    },
  ]);
  assert.deepEqual(out.checks, v1.checks);
  assert.equal(out.settings.weekStart, 1);
  assert.equal(out.settings.dailyReminder.enabled, true);
  // Round trip through v2 keeps everything.
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(out))), out);
});

// ---------- F05: target changes ----------

test('changing the target "from this week on" keeps past weeks', () => {
  const h = habit('a', 3, '2026-11-01');
  const checks = { a: ['2026-11-01', '2026-11-02', '2026-11-03'] }; // champion week of 1 Nov
  const raised = changeTarget(h, 5, 'forward', '2026-11-15');
  assert.equal(targetForWeek(raised, '2026-11-01'), 3);
  assert.equal(targetForWeek(raised, '2026-11-15'), 5);
  assert.equal(weekScore([raised], checks, '2026-11-01'), 100);
});

test('changing the target for "all weeks" re-scores the past', () => {
  const h = habit('a', 3, '2026-11-01');
  const checks = { a: ['2026-11-01', '2026-11-02', '2026-11-03'] };
  const raised = changeTarget(h, 5, 'all', '2026-11-15');
  assert.deepEqual(raised.targets, [{ from: '2026-11-01', target: 5 }]);
  assert.equal(weekScore([raised], checks, '2026-11-01'), 60);
});

test('a second forward change in the same week replaces the first', () => {
  const h = changeTarget(changeTarget(habit('a', 3, '2026-11-01'), 5, 'forward', '2026-11-15'), 4, 'forward', '2026-11-15');
  assert.deepEqual(h.targets, [
    { from: '2026-11-01', target: 3 },
    { from: '2026-11-15', target: 4 },
  ]);
});

test('streaks use the target each week had', () => {
  const h = changeTarget(habit('a', 1, '2026-11-01'), 2, 'forward', '2026-11-15');
  const checks = { a: ['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-16'] };
  assert.equal(habitStreak(h, checks, TODAY, 0), 3);
});

// ---------- F06: archive ----------

test('archiving mid-week excludes that week and later weeks from the score', () => {
  const a = archiveHabit(habit('a', 2, '2026-11-01'), '2026-11-17');
  const b = habit('b', 1, '2026-11-01');
  const checks = { b: ['2026-11-15'] };
  assert.ok(isArchived(a));
  assert.deepEqual(activeHabits([a, b]).map((h) => h.id), ['b']);
  assert.equal(weekScore([a, b], checks, '2026-11-15'), 100);
  assert.equal(weekScore([a, b], {}, '2026-11-08'), 0); // before archiving it still counts
});

test('restoring keeps history and counts again from the next full week', () => {
  const h = restoreHabit(archiveHabit(habit('a', 1, '2026-10-01'), '2026-10-28'), '2026-11-10');
  assert.ok(!isArchived(h));
  const checks = { a: ['2026-10-20', '2026-11-15'] };
  assert.equal(weekScore([h], checks, '2026-10-18'), 100); // before archive
  assert.equal(weekScore([h], checks, '2026-11-01'), null); // archived week
  assert.equal(weekScore([h], checks, '2026-11-08'), null); // restored mid-week: no penalty
  assert.equal(weekScore([h], checks, '2026-11-15'), 100);
});

test('streak skips archived weeks without breaking', () => {
  const h = restoreHabit(archiveHabit(habit('a', 1, '2026-10-01'), '2026-10-27'), '2026-11-09');
  // Done 18 Oct week, archived 25 Oct - 14 Nov weeks, done 15 Nov week.
  const checks = { a: ['2026-10-12', '2026-10-19', '2026-11-15'] };
  assert.equal(habitStreak(h, checks, TODAY, 0), 3);
});

test('archive is idempotent', () => {
  const once = archiveHabit(habit('a', 1), '2026-11-17');
  assert.equal(archiveHabit(once, '2026-11-18'), once);
});

// ---------- F17: life areas ----------

test('areaBalance sums active habits per area, capped at target', () => {
  const gym = { ...habit('gym', 2), area: 'physical' as const };
  const run = { ...habit('run', 1), area: 'physical' as const };
  const pray = { ...habit('pray', 7), area: 'spiritual' as const };
  const old = archiveHabit({ ...habit('old', 1), area: 'mental' as const }, '2026-11-01');
  const data = withData([gym, run, pray, old], {
    gym: ['2026-11-15', '2026-11-16', '2026-11-17'],
    pray: ['2026-11-15'],
  });
  const bal = areaBalance(data, '2026-11-15');
  assert.deepEqual(bal.find((b) => b.area === 'physical'), { area: 'physical', habits: 2, done: 2, target: 3 });
  assert.deepEqual(bal.find((b) => b.area === 'spiritual'), { area: 'spiritual', habits: 1, done: 1, target: 7 });
  assert.deepEqual(bal.find((b) => b.area === 'mental'), { area: 'mental', habits: 0, done: 0, target: 0 });
});

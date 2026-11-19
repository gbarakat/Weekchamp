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
  type Habit,
} from './logic.ts';

// 2026-11-19 is a Thursday.
const TODAY = '2026-11-19';
const habit = (id: string, target: number, createdAt = '2026-01-01'): Habit => ({
  id,
  name: id,
  emoji: '⭐',
  target,
  createdAt,
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
  const data = { habits: [habit('a', 1, '2026-11-08')], checks: { a: ['2026-11-10'] }, weekStart: 0 as const };
  const hist = scoreHistory(data, TODAY, 3);
  assert.deepEqual(hist, [
    { week: '2026-11-01', score: null },
    { week: '2026-11-08', score: 100 },
    { week: '2026-11-15', score: 0 },
  ]);
});

test('sanitize drops malformed data', () => {
  assert.deepEqual(sanitize(null), { habits: [], checks: {}, weekStart: 0 });
  const out = sanitize({
    habits: [habit('a', 3), { id: 'bad' }, habit('b', 9)],
    checks: { a: ['2026-11-15', 5], ghost: ['2026-11-15'] },
    weekStart: 3,
  });
  assert.deepEqual(out.habits.map((h) => h.id), ['a']);
  assert.deepEqual(out.checks, { a: ['2026-11-15'] });
  assert.equal(out.weekStart, 0);
});

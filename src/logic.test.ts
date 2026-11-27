import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDays,
  archiveHabit,
  areaBalance,
  changeTarget,
  DEFAULT_SETTINGS,
  deleteHabit,
  habitStreak,
  habitsInWeek,
  habitsToShow,
  isArchivedNow,
  isDateKey,
  isValidTime,
  makeBackup,
  normalize,
  parseBackup,
  restoreHabit,
  sanitize,
  scoreHistory,
  startOfWeek,
  targetForWeek,
  toggleCheck,
  weekCount,
  weekDays,
  weekScore,
  type AppData,
  type Habit,
} from './logic.ts';

// 2026-11-19 is a Thursday. With a Sunday start its week is 15–21 Nov.
const TODAY = '2026-11-19';
const WEEK = '2026-11-15';
const LAST_WEEK = '2026-11-08';

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

const dataOf = (habits: Habit[], checks: AppData['checks'] = {}): AppData => ({
  schemaVersion: 2,
  habits,
  checks,
  settings: DEFAULT_SETTINGS,
});

const weeksAgo = (n: number) => addDays(WEEK, -7 * n);

// ---------- dates ----------

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

test('isDateKey and isValidTime reject malformed values', () => {
  assert.equal(isDateKey('2026-11-19'), true);
  assert.equal(isDateKey('2026-02-30'), false);
  assert.equal(isDateKey('19/11/2026'), false);
  assert.equal(isDateKey(20261119), false);
  assert.equal(isValidTime('08:00'), true);
  assert.equal(isValidTime('23:59'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(isValidTime('8:00'), false);
});

// ---------- scoring ----------

test('weekCount only counts days inside the week', () => {
  const checks = { a: ['2026-11-14', '2026-11-15', '2026-11-21', '2026-11-22'] };
  assert.equal(weekCount(checks, 'a', WEEK), 2);
  assert.equal(weekCount(checks, 'missing', WEEK), 0);
});

test('weekScore caps each habit at 100% and averages', () => {
  const habits = [habit('a', 2), habit('b', 4)];
  const checks = {
    a: ['2026-11-15', '2026-11-16', '2026-11-17'], // 3/2 -> capped at 1
    b: ['2026-11-15'], // 1/4
  };
  assert.equal(weekScore(habits, checks, WEEK), 63); // (1 + 0.25) / 2
  assert.equal(weekScore([], checks, WEEK), null);
});

test('weekScore ignores habits created after the week', () => {
  const habits = [habit('a', 1), habit('late', 1, '2026-11-22')];
  const checks = { a: ['2026-11-15'] };
  assert.equal(weekScore(habits, checks, WEEK), 100);
  assert.equal(weekScore(habits, checks, '2026-11-22'), 0);
});

test('habitStreak counts back from the current week', () => {
  const h = habit('a', 1);
  // Current week unfinished, previous two done, then a gap.
  assert.equal(habitStreak(h, { a: [weeksAgo(1), weeksAgo(2), weeksAgo(4)] }, TODAY, 0), 2);
  // Current week done as well.
  assert.equal(habitStreak(h, { a: [weeksAgo(0), weeksAgo(1), weeksAgo(2)] }, TODAY, 0), 3);
  // Last week missed: streak is only the current week.
  assert.equal(habitStreak(h, { a: [weeksAgo(0), weeksAgo(2)] }, TODAY, 0), 1);
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
  const data = dataOf([habit('a', 1, '2026-11-08')], { a: ['2026-11-10'] });
  assert.deepEqual(scoreHistory(data, TODAY, 3), [
    { week: '2026-11-01', score: null },
    { week: '2026-11-08', score: 100 },
    { week: '2026-11-15', score: 0 },
  ]);
});

// ---------- target changes (F05) ----------

test('targetForWeek uses the last change on or before the week end', () => {
  const h: Habit = {
    ...habit('a', 2),
    targets: [
      { from: '2026-01-01', target: 2 },
      { from: WEEK, target: 5 },
    ],
  };
  assert.equal(targetForWeek(h, LAST_WEEK), 2);
  assert.equal(targetForWeek(h, WEEK), 5);
  assert.equal(targetForWeek(h, addDays(WEEK, 7)), 5);
  // A week before the first entry falls back to it.
  assert.equal(targetForWeek(h, '2025-12-21'), 2);
});

test('raising the target "from this week on" keeps a past champion week at 100%', () => {
  const before = habit('a', 2);
  const checks = { a: ['2026-11-08', '2026-11-09'] }; // 2/2 last week
  assert.equal(weekScore([before], checks, LAST_WEEK), 100);

  const after = changeTarget(before, 4, 'fromThisWeek', WEEK);
  assert.deepEqual(after.targets, [
    { from: '2026-01-01', target: 2 },
    { from: WEEK, target: 4 },
  ]);
  assert.equal(weekScore([after], checks, LAST_WEEK), 100);
  assert.equal(targetForWeek(after, WEEK), 4);
});

test('"all weeks" re-scores past weeks', () => {
  const checks = { a: ['2026-11-08', '2026-11-09'] };
  const after = changeTarget(habit('a', 2), 4, 'allWeeks', WEEK);
  assert.deepEqual(after.targets, [{ from: '2026-01-01', target: 4 }]);
  assert.equal(weekScore([after], checks, LAST_WEEK), 50);
});

test('changing the target twice in one week replaces that week\'s entry', () => {
  const once = changeTarget(habit('a', 2), 4, 'fromThisWeek', WEEK);
  const twice = changeTarget(once, 3, 'fromThisWeek', WEEK);
  assert.deepEqual(twice.targets, [
    { from: '2026-01-01', target: 2 },
    { from: WEEK, target: 3 },
  ]);
  // A habit created this week keeps a single entry.
  const fresh = changeTarget(habit('b', 2, '2026-11-17'), 5, 'fromThisWeek', WEEK);
  assert.deepEqual(fresh.targets, [{ from: WEEK, target: 5 }]);
  assert.equal(targetForWeek(fresh, WEEK), 5);
});

test('streaks use the per-week target', () => {
  // 2 per week until this week, then 4 per week.
  const h = changeTarget(habit('a', 2), 4, 'fromThisWeek', WEEK);
  const twoTicks = (w: string) => [w, addDays(w, 1)];
  const checks = { a: [...twoTicks(weeksAgo(1)), ...twoTicks(weeksAgo(2)), ...twoTicks(WEEK)] };
  // Past weeks met 2/2. This week is 2/4: not done yet, but it does not break the streak.
  assert.equal(habitStreak(h, checks, TODAY, 0), 2);
  // With "all weeks" the past weeks become 2/4 and the streak is gone.
  assert.equal(habitStreak(changeTarget(h, 4, 'allWeeks', WEEK), checks, TODAY, 0), 0);
});

// ---------- archive (F06) ----------

test('archiving mid-week excludes that week from the score', () => {
  const kept = habit('kept', 1);
  const gone = archiveHabit(habit('gone', 3), '2026-11-18');
  const checks = { kept: ['2026-11-15'], gone: [] };

  assert.equal(isArchivedNow(gone), true);
  assert.deepEqual(habitsInWeek([kept, gone], WEEK).map((h) => h.id), ['kept']);
  assert.equal(weekScore([kept, gone], checks, WEEK), 100);
  // The week before it was archived still counts.
  assert.equal(weekScore([kept, gone], checks, LAST_WEEK), 0);
  // Archived habits leave the Week screen.
  assert.deepEqual(habitsToShow([kept, gone], WEEK, WEEK).map((h) => h.id), ['kept']);
});

test('restore keeps history and checks', () => {
  const checks = { a: [weeksAgo(3)] };
  const archived = archiveHabit(habit('a', 1), weeksAgo(2));
  const restored = restoreHabit(archived, TODAY);

  assert.equal(isArchivedNow(restored), false);
  assert.deepEqual(restored.archived, [{ from: weeksAgo(2), to: TODAY }]);
  assert.equal(weekScore([restored], checks, weeksAgo(3)), 100);
  // Weeks touched by the archive period do not count, including the restore week.
  assert.equal(weekScore([restored], checks, weeksAgo(1)), null);
  assert.equal(weekScore([restored], checks, WEEK), null);
  // It is back on the Week screen straight away, and scored again from next week.
  assert.deepEqual(habitsToShow([restored], WEEK, WEEK).map((h) => h.id), ['a']);
  assert.equal(weekScore([restored], checks, addDays(WEEK, 7)), 0);
});

test('archive then restore on the same day leaves no trace', () => {
  const h = restoreHabit(archiveHabit(habit('a', 1), TODAY), TODAY);
  assert.deepEqual(h.archived, []);
  assert.equal(weekScore([h], { a: [TODAY] }, WEEK), 100);
});

test('a streak spans an archived gap', () => {
  // Done 4 and 3 weeks ago, archived for the week after that, done last week.
  let h = archiveHabit(habit('a', 1), weeksAgo(2));
  h = restoreHabit(h, addDays(weeksAgo(1), -1)); // restored on the last day of the gap
  const checks = { a: [weeksAgo(4), weeksAgo(3), weeksAgo(1)] };
  assert.equal(habitStreak(h, checks, TODAY, 0), 3);
  // Without the archive the empty week would have broken it.
  assert.equal(habitStreak(habit('a', 1), checks, TODAY, 0), 1);
});

test('delete forever removes the habit and its checks', () => {
  const data = dataOf([habit('a', 1), habit('b', 1)], { a: [TODAY], b: [TODAY] });
  const out = deleteHabit(data, 'a');
  assert.deepEqual(out.habits.map((h) => h.id), ['b']);
  assert.deepEqual(out.checks, { b: [TODAY] });
});

// ---------- life areas (F17) ----------

test('areaBalance sums done and target per area for active habits', () => {
  const gym: Habit = { ...habit('gym', 3), area: 'physical' };
  const run: Habit = { ...habit('run', 2), area: 'physical' };
  const read: Habit = { ...habit('read', 4), area: 'mental' };
  const old: Habit = archiveHabit({ ...habit('old', 5), area: 'mental' }, '2026-11-01');
  const data = dataOf([gym, run, read, old, habit('none', 1)], {
    gym: ['2026-11-15', '2026-11-16'],
    run: ['2026-11-15', '2026-11-16', '2026-11-17'], // capped at its target
  });
  assert.deepEqual(areaBalance(data, WEEK), [
    { area: 'spiritual', habits: 0, done: 0, target: 0 },
    { area: 'physical', habits: 2, done: 4, target: 5 },
    { area: 'mental', habits: 1, done: 0, target: 4 },
    { area: 'emotional', habits: 0, done: 0, target: 0 },
  ]);
});

// ---------- migration and validation ----------

const V1 = {
  habits: [
    { id: 'a', name: 'Gym', emoji: '💪', target: 3, createdAt: '2026-11-01' },
    { id: 'b', name: 'Read', emoji: '📚', target: 5, createdAt: '2026-11-10' },
  ],
  checks: { a: ['2026-11-15', '2026-11-16'], b: ['2026-11-17'] },
  weekStart: 1,
};

test('v1 data migrates without losing anything', () => {
  const out = normalize(V1);
  assert.equal(out.schemaVersion, 2);
  assert.deepEqual(out.habits, [
    {
      id: 'a',
      name: 'Gym',
      emoji: '💪',
      createdAt: '2026-11-01',
      targets: [{ from: '2026-11-01', target: 3 }],
      archived: [],
      area: null,
      reminder: null,
    },
    {
      id: 'b',
      name: 'Read',
      emoji: '📚',
      createdAt: '2026-11-10',
      targets: [{ from: '2026-11-10', target: 5 }],
      archived: [],
      area: null,
      reminder: null,
    },
  ]);
  assert.deepEqual(out.checks, V1.checks);
  assert.deepEqual(out.settings, { ...DEFAULT_SETTINGS, weekStart: 1 });
});

test('migration gives the same scores as v1 did', () => {
  const out = normalize(V1);
  // Monday-start week 16–22 Nov: Gym 1/3 (the 15th is in the week before), Read 1/5.
  assert.equal(weekScore(out.habits, out.checks, '2026-11-16'), 27);
  assert.equal(weekScore(out.habits, out.checks, '2026-11-09'), 17); // Gym 1/3, Read 0/5
});

test('normalize is stable on v2 data', () => {
  const once = normalize(V1);
  assert.deepEqual(normalize(once), once);
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(once))), once);
});

test('sanitize drops malformed data and never throws', () => {
  for (const junk of [null, undefined, 5, 'x', [], { habits: 'no' }, { habits: [null, 3, []] }]) {
    assert.deepEqual(normalize(junk).habits, []);
    assert.deepEqual(sanitize(junk).settings, DEFAULT_SETTINGS);
  }
  const good = habit('a', 3);
  const out = sanitize({
    schemaVersion: 2,
    habits: [
      { ...good, area: 'physical', reminder: { enabled: true, time: '07:30', days: [1, 3, 9, 'x'] } },
      { ...good }, // duplicate id
      { id: 'no-targets', name: 'x', createdAt: '2026-01-01', targets: [] },
      { ...habit('bad-target', 9) },
      { ...habit('bad-date', 2, '2026-13-40') },
      {
        ...habit('mixed', 2),
        targets: [{ from: '2026-06-01', target: 4 }, { from: 'nope', target: 1 }, { from: '2026-01-01', target: 2 }],
        archived: [{ from: '2026-03-01', to: null }, { from: 7, to: null }],
        area: 'financial',
        reminder: { enabled: 'yes', time: '07:30', days: [] },
      },
    ],
    checks: { a: ['2026-11-15', 5, '2026-11-15', 'bad'], ghost: ['2026-11-15'] },
    settings: { weekStart: 3, dailyReminder: { enabled: false, time: '25:00' }, lastBackupAt: 'x' },
  });
  assert.deepEqual(out.habits.map((h) => h.id), ['a', 'mixed']);
  assert.equal(out.habits[0].area, 'physical');
  assert.deepEqual(out.habits[0].reminder, { enabled: true, time: '07:30', days: [1, 3] });
  assert.deepEqual(out.habits[1].targets, [
    { from: '2026-01-01', target: 2 },
    { from: '2026-06-01', target: 4 },
  ]);
  assert.deepEqual(out.habits[1].archived, [{ from: '2026-03-01', to: null }]);
  assert.equal(out.habits[1].area, null);
  assert.equal(out.habits[1].reminder, null);
  assert.deepEqual(out.checks, { a: ['2026-11-15'] });
  assert.deepEqual(out.settings, {
    ...DEFAULT_SETTINGS,
    dailyReminder: { enabled: false, time: '08:00' },
  });
});

// ---------- backup (F07) ----------

test('a backup round-trips exactly', () => {
  const data = normalize(V1);
  const file = makeBackup(data, '2026-11-19T10:00:00.000Z');
  assert.equal(file.app, 'weekchamp');
  assert.equal(file.schemaVersion, 2);
  const parsed = parseBackup(JSON.stringify(file));
  assert.deepEqual(parsed, { ok: true, data, exportedAt: '2026-11-19T10:00:00.000Z' });
});

test('a backup holding v1-shaped data is accepted', () => {
  const parsed = parseBackup(JSON.stringify({ app: 'weekchamp', data: V1 }));
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.deepEqual(parsed.data, normalize(V1));
    assert.equal(parsed.exportedAt, null);
  }
});

test('files that are not Weekchamp backups are rejected', () => {
  for (const text of [
    '',
    'not json',
    '[]',
    '{}',
    JSON.stringify({ app: 'other', data: V1 }),
    JSON.stringify({ app: 'weekchamp' }),
    JSON.stringify({ app: 'weekchamp', data: { habits: 'x' } }),
    JSON.stringify(V1), // raw data without the backup wrapper
  ]) {
    assert.deepEqual(parseBackup(text), { ok: false }, text);
  }
});

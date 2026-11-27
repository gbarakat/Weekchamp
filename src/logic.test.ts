import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDays,
  addMonths,
  assess,
  daysBetween,
  DEFAULT_SETTINGS,
  deleteGoal,
  deleteProject,
  goalSummary,
  isDateKey,
  lifeWheel,
  longTouchTask,
  projectDates,
  projectPhase,
  projectStats,
  sanitize,
  sortTasks,
  startOfWeek,
  taskGoalId,
  touchTask,
  type AppData,
  type Assessment,
  type Project,
  type Settings,
  type Task,
} from './logic.ts';

// Friday 27 Nov 2026. With a Sunday start its week is 22–28 Nov.
const TODAY = '2026-11-27';

const project = (id: string, extra: Partial<Project> = {}): Project => ({
  id,
  name: id,
  startDate: '2026-11-01',
  endDate: null,
  area: null,
  goalId: null,
  createdAt: '2026-11-01',
  ...extra,
});

let n = 0;
const task = (projectId: string, status: Task['status'] = 'open', statusAt: string | null = null, extra: Partial<Task> = {}): Task => ({
  id: `t${++n}`,
  projectId,
  name: `task ${n}`,
  status,
  statusAt: status === 'open' ? null : (statusAt ?? TODAY),
  goalId: null,
  createdAt: '2026-11-01',
  ...extra,
});

const dataOf = (parts: Partial<AppData> = {}, settings: Partial<Settings> = {}): AppData => ({
  schemaVersion: 3,
  goals: [],
  projects: [],
  tasks: [],
  ...parts,
  settings: { ...DEFAULT_SETTINGS, firstUseAt: '2026-11-01', ...settings },
});

const many = (count: number, make: () => Task) => Array.from({ length: count }, make);

// ---------- dates ----------

test('date helpers', () => {
  assert.equal(startOfWeek(TODAY, 0), '2026-11-22');
  assert.equal(startOfWeek(TODAY, 1), '2026-11-23');
  assert.equal(startOfWeek(TODAY, 6), '2026-11-21');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2026-12-15', 1), '2027-01-15');
  assert.equal(addMonths('2026-03-31', -1), '2026-02-28');
  assert.equal(daysBetween('2026-11-27', '2026-12-04'), 7);
  assert.equal(daysBetween('2026-03-01', '2026-02-27'), -2);
  assert.equal(isDateKey('2026-02-30'), false);
  assert.equal(isDateKey('2026-11-27'), true);
});

// ---------- Feature 1: one touch, long touch ----------

test('one touch marks an open task done, and reopens a closed one', () => {
  const open = task('p');
  const done = touchTask(open, TODAY);
  assert.deepEqual([done.status, done.statusAt], ['done', TODAY]);
  const reopened = touchTask(done, TODAY);
  assert.deepEqual([reopened.status, reopened.statusAt], ['open', null]);
  assert.equal(open.status, 'open'); // not mutated
});

test('long touch marks a task missed, from any state', () => {
  const missed = longTouchTask(task('p'), TODAY);
  assert.deepEqual([missed.status, missed.statusAt], ['missed', TODAY]);
  assert.equal(longTouchTask(task('p', 'done', '2026-11-20'), TODAY).status, 'missed');
  // Long touch on a missed task keeps the day it was first missed.
  assert.equal(longTouchTask(task('p', 'missed', '2026-11-20'), TODAY).statusAt, '2026-11-20');
  // One touch on a missed task reopens it.
  assert.equal(touchTask(missed, TODAY).status, 'open');
});

test('tasks list open first, then done, then missed, newest first', () => {
  const a = task('p', 'done');
  const b = task('p');
  const c = task('p', 'missed');
  const d = task('p');
  assert.deepEqual(sortTasks([a, b, c, d]).map((t) => t.id), [d.id, b.id, a.id, c.id]);
});

// ---------- Feature 3: project dates ----------

test('a project is not started, active or ended by its dates', () => {
  const p = project('p', { startDate: '2026-11-10', endDate: '2026-11-27' });
  assert.equal(projectPhase(p, '2026-11-09'), 'notStarted');
  assert.equal(projectPhase(p, '2026-11-10'), 'active');
  assert.equal(projectPhase(p, '2026-11-27'), 'active'); // the end date itself still counts
  assert.equal(projectPhase(p, '2026-11-28'), 'ended');
});

test('a project with no end date runs indefinitely', () => {
  const p = project('p', { startDate: '2026-11-10', endDate: null });
  assert.equal(projectPhase(p, '2040-01-01'), 'active');
  assert.equal(projectStats(dataOf({ projects: [p] }), p, TODAY).daysLeft, null);
  assert.equal(projectDates(p), 'From 10 Nov 2026, no end date');
  assert.equal(
    projectDates(project('q', { startDate: '2026-11-01', endDate: '2027-01-31' })),
    '1 Nov 2026 – 31 Jan 2027',
  );
});

// ---------- Feature 2: project statistics ----------

test('project statistics count its own tasks only', () => {
  const p = project('p', { endDate: '2026-12-07' });
  const tasks = [
    task('p', 'done', '2026-11-23'),
    task('p', 'done', '2026-11-25'),
    task('p', 'done', '2026-11-17'),
    task('p', 'missed', '2026-11-24'),
    task('p'),
    task('other', 'done', '2026-11-25'),
  ];
  const s = projectStats(dataOf({ projects: [p, project('other')], tasks }), p, TODAY);
  assert.deepEqual(
    { total: s.total, done: s.done, missed: s.missed, open: s.open, pct: s.completionPct },
    { total: 5, done: 3, missed: 1, open: 1, pct: 60 },
  );
  assert.equal(s.phase, 'active');
  assert.equal(s.daysLeft, 10);
  assert.deepEqual(s.perWeek, [
    { week: '2026-11-01', done: 0 },
    { week: '2026-11-08', done: 0 },
    { week: '2026-11-15', done: 1 },
    { week: '2026-11-22', done: 2 },
  ]);
});

test('an empty or future project has safe statistics', () => {
  const p = project('p', { startDate: '2026-12-01', endDate: '2026-12-31' });
  const s = projectStats(dataOf({ projects: [p] }), p, TODAY);
  assert.equal(s.completionPct, null);
  assert.equal(s.phase, 'notStarted');
  assert.equal(s.daysToStart, 4);
  const ended = project('e', { startDate: '2026-10-01', endDate: '2026-10-31' });
  assert.equal(projectStats(dataOf({ projects: [ended] }), ended, TODAY).daysLeft, 0);
});

// ---------- Feature 7: ultimate goals ----------

test('a task follows its project goal unless it has its own', () => {
  const goals = [
    { id: 'g1', name: 'Health', createdAt: '2026-11-01' },
    { id: 'g2', name: 'Faith', createdAt: '2026-11-01' },
  ];
  const withGoal = project('p1', { goalId: 'g1' });
  const noGoal = project('p2');
  const inherits = task('p1', 'done');
  const overrides = task('p1', 'open', null, { goalId: 'g2' });
  const direct = task('p2', 'done', TODAY, { goalId: 'g1' });
  const unlinked = task('p2');
  const data = dataOf({ goals, projects: [withGoal, noGoal], tasks: [inherits, overrides, direct, unlinked] });

  assert.equal(taskGoalId(data, inherits), 'g1');
  assert.equal(taskGoalId(data, overrides), 'g2');
  assert.equal(taskGoalId(data, direct), 'g1');
  assert.equal(taskGoalId(data, unlinked), null);

  const g1 = goalSummary(data, 'g1');
  assert.deepEqual(g1.projects.map((p) => p.id), ['p1']);
  assert.deepEqual(g1.tasks.map((t) => t.id), [inherits.id, direct.id]);
  assert.deepEqual([g1.done, g1.total], [2, 2]);
  const g2 = goalSummary(data, 'g2');
  assert.deepEqual([g2.projects.length, g2.done, g2.total], [0, 0, 1]);
});

test('deleting a goal keeps its projects and tasks, unlinked', () => {
  const data = dataOf({
    goals: [{ id: 'g1', name: 'Health', createdAt: '2026-11-01' }],
    projects: [project('p1', { goalId: 'g1' })],
    tasks: [task('p1', 'open', null, { goalId: 'g1' })],
  });
  const out = deleteGoal(data, 'g1');
  assert.deepEqual(out.goals, []);
  assert.equal(out.projects[0].goalId, null);
  assert.equal(out.tasks[0].goalId, null);
  assert.equal(out.tasks.length, 1);
});

test('deleting a project removes its tasks only', () => {
  const data = dataOf({ projects: [project('a'), project('b')], tasks: [task('a'), task('a'), task('b')] });
  const out = deleteProject(data, 'a');
  assert.deepEqual(out.projects.map((p) => p.id), ['b']);
  assert.deepEqual(out.tasks.map((t) => t.projectId), ['b']);
});

// ---------- Feature 6: life wheel ----------

test('the life wheel counts tasks through each project area', () => {
  const data = dataOf({
    projects: [
      project('gym', { area: 'physical' }),
      project('run', { area: 'physical' }),
      project('quran', { area: 'spiritual' }),
      project('misc'),
    ],
    tasks: [
      task('gym', 'done'),
      task('gym', 'missed'),
      task('run', 'done'),
      task('quran'),
      task('misc', 'done'),
    ],
  });
  assert.deepEqual(lifeWheel(data), [
    { area: 'spiritual', done: 0, total: 1 },
    { area: 'physical', done: 2, total: 3 },
    { area: 'mental', done: 0, total: 0 },
    { area: 'emotional', done: 0, total: 0 },
  ]);
});

// ---------- Feature 4: capacity assessment ----------

const ready = (a: Assessment) => {
  assert.equal(a.ready, true);
  if (!a.ready) throw new Error('not ready');
  return a;
};

test('no assessment until the first period is complete', () => {
  // First use Sunday 1 Nov, 2-week periods: the first assessment is due Sunday 15 Nov.
  const data = dataOf();
  assert.deepEqual(assess(data, '2026-11-01'), { ready: false, firstOn: '2026-11-15' });
  assert.deepEqual(assess(data, '2026-11-14'), { ready: false, firstOn: '2026-11-15' });
  assert.equal(assess(data, '2026-11-15').ready, true);
  // 3-week periods push it to 22 Nov.
  assert.deepEqual(assess(dataOf({}, { assessWeeks: 3 }), '2026-11-20'), { ready: false, firstOn: '2026-11-22' });
  // First use mid-week is anchored to the start of that week.
  assert.deepEqual(assess(dataOf({}, { firstUseAt: '2026-11-04' }), '2026-11-05'), { ready: false, firstOn: '2026-11-15' });
});

test('it assesses the last completed period, then the next one', () => {
  const a = ready(assess(dataOf(), '2026-11-20')); // inside period 2 (15–28 Nov)
  assert.deepEqual([a.from, a.to, a.nextOn], ['2026-11-01', '2026-11-14', '2026-11-29']);
  const b = ready(assess(dataOf(), '2026-11-29'));
  assert.deepEqual([b.from, b.to, b.nextOn], ['2026-11-15', '2026-11-28', '2026-12-13']);
});

// The example from the brief: streams 1–2 at 30%, 3–4 at 70%, 5–6 below 10%.
function briefExample(settings: Partial<Settings> = {}): AppData {
  const tasks: Task[] = [];
  const add = (id: string, done: number, missed: number) => {
    tasks.push(...many(done, () => task(id, 'done', '2026-11-03')));
    tasks.push(...many(missed, () => task(id, 'missed', '2026-11-10')));
  };
  add('s1', 3, 7);
  add('s2', 3, 7);
  add('s3', 7, 3);
  add('s4', 7, 3);
  add('s5', 0, 10);
  add('s6', 1, 19); // 5%
  return dataOf({ projects: ['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => project(id)), tasks }, settings);
}

test('streams are scored done / (done + missed) and banded by my thresholds', () => {
  const a = ready(assess(briefExample(), '2026-11-20'));
  assert.deepEqual(
    a.streams.map((s) => [s.project.id, s.pct, s.band]),
    [
      ['s3', 70, 'success'],
      ['s4', 70, 'success'],
      ['s1', 30, 'middle'],
      ['s2', 30, 'middle'],
      ['s6', 5, 'failure'],
      ['s5', 0, 'failure'],
    ],
  );
  assert.deepEqual(a.canManage, { min: 2, max: 4 });
  assert.equal(a.advice, 'Lower your expectations: you can manage 2 to 4 projects.');
});

test('changing the thresholds changes the bands and the advice', () => {
  const strict = ready(assess(briefExample({ successPct: 80, failPct: 50 }), '2026-11-20'));
  assert.deepEqual(strict.streams.map((s) => s.band), ['middle', 'middle', 'failure', 'failure', 'failure', 'failure']);
  assert.equal(strict.advice, 'Lower your expectations: you can manage up to 2 projects.');
  const harsh = ready(assess(briefExample({ successPct: 90, failPct: 80 }), '2026-11-20'));
  assert.equal(harsh.advice, 'Every project scored below your failure threshold of 80%. Lower your expectations: focus on 1 project next week.');
});

test('maximum capability is the best week of the period', () => {
  const tasks = [
    ...many(15, () => task('p', 'done', '2026-11-03')), // week 1
    ...many(9, () => task('p', 'done', '2026-11-10')), // week 2
    ...many(40, () => task('p', 'done', '2026-11-18')), // after the period
  ];
  const a = ready(assess(dataOf({ projects: [project('p')], tasks }), '2026-11-20'));
  assert.deepEqual(a.weeks, [
    { week: '2026-11-01', done: 15 },
    { week: '2026-11-08', done: 9 },
  ]);
  assert.equal(a.maxPerWeek, 15);
  assert.equal(a.capability, 'Your maximum capability is 15 tasks every week.');
  assert.equal(a.advice, 'Your project reached your success threshold. This load suits you.');
});

test('open tasks and marks outside the period do not count', () => {
  const tasks = [
    task('p', 'done', '2026-11-05'),
    task('p'), // open: ignored
    task('p', 'missed', '2026-11-16'), // after the period
    task('p', 'missed', '2026-10-30'), // before the period
  ];
  const a = ready(assess(dataOf({ projects: [project('p', { startDate: '2026-10-01' })], tasks }), '2026-11-20'));
  assert.deepEqual([a.streams[0].done, a.streams[0].missed, a.streams[0].pct], [1, 0, 100]);
});

test('projects with nothing marked are listed but not scored', () => {
  const data = dataOf({
    projects: [
      project('busy'),
      project('quiet'),
      project('later', { startDate: '2026-11-20' }), // had not started in the period
      project('old', { startDate: '2026-09-01', endDate: '2026-10-15' }), // ended before it
    ],
    tasks: [task('busy', 'done', '2026-11-05'), task('busy', 'done', '2026-11-06'), task('busy', 'missed', '2026-11-06')],
  });
  const a = ready(assess(data, '2026-11-20'));
  assert.deepEqual(a.streams.map((s) => [s.project.id, s.pct, s.band]), [
    ['busy', 67, 'middle'],
    ['quiet', null, 'none'],
  ]);
  assert.equal(a.advice, 'You can manage up to 1 project. Keep this load before adding more.');
});

test('a period with no marks says so', () => {
  const a = ready(assess(dataOf({ projects: [project('p')] }), '2026-11-20'));
  assert.equal(a.maxPerWeek, 0);
  assert.equal(a.capability, 'Your maximum capability is 0 tasks every week.');
  assert.equal(a.advice, 'No tasks were marked done or missed in this period, so there is nothing to assess yet.');
});

// ---------- persistence ----------

test('valid data survives sanitize unchanged', () => {
  const data = dataOf({
    goals: [{ id: 'g', name: 'Health', createdAt: '2026-11-01' }],
    projects: [project('p', { goalId: 'g', area: 'physical', endDate: '2026-12-31' })],
    tasks: [task('p', 'done', '2026-11-05', { goalId: 'g' }), task('p')],
  }, { assessWeeks: 3, successPct: 80, failPct: 20, weekStart: 6 });
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(data))), data);
});

test('sanitize drops malformed entries and dangling links, and never throws', () => {
  for (const junk of [null, undefined, 5, 'x', [], { projects: 'no' }, { tasks: [null, 3] }]) {
    const out = sanitize(junk);
    assert.deepEqual([out.goals, out.projects, out.tasks], [[], [], []]);
    assert.deepEqual(out.settings, DEFAULT_SETTINGS);
  }
  const out = sanitize({
    goals: [{ id: 'g', name: ' Health ', createdAt: '2026-11-01' }, { id: 'bad', name: '' }],
    projects: [
      { ...project('p'), goalId: 'ghost', area: 'financial', endDate: '2026-10-01' }, // end before start
      { ...project('p') }, // duplicate id
      { id: 'no-dates', name: 'x' },
    ],
    tasks: [
      { ...task('p', 'done'), id: 'ok', goalId: 'g' },
      { ...task('p'), id: 'half', status: 'done', statusAt: null }, // done without a day
      { ...task('p'), id: 'weird', status: 'paused' },
      { ...task('nowhere'), id: 'orphan' },
    ],
    settings: { weekStart: 3, assessWeeks: 5, successPct: 40, failPct: 60, firstUseAt: 'x' },
  });
  assert.deepEqual(out.goals, [{ id: 'g', name: 'Health', createdAt: '2026-11-01' }]);
  assert.equal(out.projects.length, 1);
  assert.deepEqual(
    [out.projects[0].goalId, out.projects[0].area, out.projects[0].endDate],
    [null, null, null],
  );
  assert.deepEqual(out.tasks.map((t) => [t.id, t.status, t.goalId]), [
    ['ok', 'done', 'g'],
    ['half', 'open', null],
    ['weird', 'open', null],
  ]);
  // A failure threshold above the success threshold is rejected.
  assert.deepEqual(out.settings, { ...DEFAULT_SETTINGS, successPct: 40, failPct: 30 });
});

// Pure data-shape, date and statistics logic. No React, storage or Expo imports, so it is unit-testable.
//
// Structure: Ultimate goal -> Project -> Task.

export type WeekStart = 0 | 1 | 6; // Sunday, Monday, Saturday

export type LifeArea = 'spiritual' | 'physical' | 'mental' | 'emotional';

export const LIFE_AREAS: { id: LifeArea; label: string; emoji: string; color: string }[] = [
  { id: 'spiritual', label: 'Spiritual', emoji: '🕌', color: '#7C5CE0' },
  { id: 'physical', label: 'Physical', emoji: '💪', color: '#12A150' },
  { id: 'mental', label: 'Mental', emoji: '🧠', color: '#2F80ED' },
  { id: 'emotional', label: 'Emotional', emoji: '💛', color: '#F5A524' },
];

export type Goal = { id: string; name: string; createdAt: string };

export type Project = {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // null = runs indefinitely
  area: LifeArea | null;
  goalId: string | null;
  createdAt: string;
};

export type TaskStatus = 'open' | 'done' | 'missed';

export type Task = {
  id: string;
  projectId: string;
  name: string;
  status: TaskStatus;
  statusAt: string | null; // day it was marked done or missed
  goalId: string | null; // own goal; null = follow the project's goal
  createdAt: string;
};

export type Settings = {
  weekStart: WeekStart;
  assessWeeks: 2 | 3; // length of one assessment period
  successPct: number; // a project at or above this counts as success
  failPct: number; // a project below this counts as failure
  firstUseAt: string | null; // anchors the assessment periods
};

export type AppData = {
  schemaVersion: 3;
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  weekStart: 0,
  assessWeeks: 2,
  successPct: 70,
  failPct: 30,
  firstUseAt: null,
};

export const EMPTY_DATA: AppData = {
  schemaVersion: 3,
  goals: [],
  projects: [],
  tasks: [],
  settings: DEFAULT_SETTINGS,
};

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

/** Moves a date by whole months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(key: string, n: number): string {
  const d = parseKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return dateKey(d);
}

/** Whole days from `a` to `b` (negative if b is earlier). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000);
}

/** First day (as key) of the week containing `key`. */
export function startOfWeek(key: string, weekStart: WeekStart): string {
  const dow = parseKey(key).getDay();
  return addDays(key, -((dow - weekStart + 7) % 7));
}

export function isDateKey(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return dateKey(parseKey(v)) === v;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function longDate(key: string): string {
  return `${shortDate(key)} ${parseKey(key).getFullYear()}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------- projects ----------

export type ProjectPhase = 'notStarted' | 'active' | 'ended';

export function projectPhase(project: Project, todayKey: string): ProjectPhase {
  if (todayKey < project.startDate) return 'notStarted';
  if (project.endDate !== null && todayKey > project.endDate) return 'ended';
  return 'active';
}

export const PHASE_LABEL: Record<ProjectPhase, string> = {
  notStarted: 'Not started',
  active: 'Active',
  ended: 'Ended',
};

/** "1 Nov 2026 – 31 Jan 2027" or "From 1 Nov 2026, no end date". */
export function projectDates(project: Project): string {
  return project.endDate
    ? `${longDate(project.startDate)} – ${longDate(project.endDate)}`
    : `From ${longDate(project.startDate)}, no end date`;
}

export function tasksOf(data: AppData, projectId: string): Task[] {
  return data.tasks.filter((t) => t.projectId === projectId);
}

export type ProjectStats = {
  phase: ProjectPhase;
  total: number;
  done: number;
  missed: number;
  open: number;
  completionPct: number | null; // done / all tasks; null when the project has no tasks
  daysLeft: number | null; // null when there is no end date
  daysToStart: number; // 0 once started
  perWeek: { week: string; done: number }[]; // last 4 weeks, oldest first
};

const WEEKS_SHOWN = 4;

export function projectStats(data: AppData, project: Project, todayKey: string): ProjectStats {
  const tasks = tasksOf(data, project.id);
  const done = tasks.filter((t) => t.status === 'done').length;
  const missed = tasks.filter((t) => t.status === 'missed').length;
  const current = startOfWeek(todayKey, data.settings.weekStart);
  const perWeek = Array.from({ length: WEEKS_SHOWN }, (_, i) => {
    const week = addDays(current, -7 * (WEEKS_SHOWN - 1 - i));
    return { week, done: doneBetween(tasks, week, addDays(week, 6)) };
  });
  return {
    phase: projectPhase(project, todayKey),
    total: tasks.length,
    done,
    missed,
    open: tasks.length - done - missed,
    completionPct: tasks.length === 0 ? null : Math.round((done / tasks.length) * 100),
    daysLeft: project.endDate === null ? null : Math.max(daysBetween(todayKey, project.endDate), 0),
    daysToStart: Math.max(daysBetween(todayKey, project.startDate), 0),
    perWeek,
  };
}

// ---------- tasks ----------

function countBetween(tasks: Task[], status: TaskStatus, from: string, to: string): number {
  return tasks.filter(
    (t) => t.status === status && t.statusAt !== null && t.statusAt >= from && t.statusAt <= to,
  ).length;
}

const doneBetween = (tasks: Task[], from: string, to: string) =>
  countBetween(tasks, 'done', from, to);

/** One touch: an open task becomes done; a done or missed task goes back to open. */
export function touchTask(task: Task, todayKey: string): Task {
  return task.status === 'open'
    ? { ...task, status: 'done', statusAt: todayKey }
    : { ...task, status: 'open', statusAt: null };
}

/** Long touch: the task becomes missed. */
export function longTouchTask(task: Task, todayKey: string): Task {
  return task.status === 'missed' ? task : { ...task, status: 'missed', statusAt: todayKey };
}

/** Open tasks first, then done, then missed; newest first inside each group. */
export function sortTasks(tasks: Task[]): Task[] {
  const order: Record<TaskStatus, number> = { open: 0, done: 1, missed: 2 };
  return tasks
    .map((t, i) => ({ t, i }))
    .sort((a, b) => order[a.t.status] - order[b.t.status] || b.i - a.i)
    .map((x) => x.t);
}

// ---------- goals ----------

/** A task's own goal if it has one, otherwise its project's goal. */
export function taskGoalId(data: AppData, task: Task): string | null {
  if (task.goalId) return task.goalId;
  return data.projects.find((p) => p.id === task.projectId)?.goalId ?? null;
}

export type GoalSummary = {
  projects: Project[]; // projects that belong to the goal
  tasks: Task[]; // every task linked to the goal, directly or through its project
  done: number;
  total: number;
};

export function goalSummary(data: AppData, goalId: string): GoalSummary {
  const tasks = data.tasks.filter((t) => taskGoalId(data, t) === goalId);
  return {
    projects: data.projects.filter((p) => p.goalId === goalId),
    tasks,
    done: tasks.filter((t) => t.status === 'done').length,
    total: tasks.length,
  };
}

// ---------- editing ----------

export function deleteProject(data: AppData, projectId: string): AppData {
  return {
    ...data,
    projects: data.projects.filter((p) => p.id !== projectId),
    tasks: data.tasks.filter((t) => t.projectId !== projectId),
  };
}

/** Removes the goal. Its projects and tasks stay, without a goal. */
export function deleteGoal(data: AppData, goalId: string): AppData {
  return {
    ...data,
    goals: data.goals.filter((g) => g.id !== goalId),
    projects: data.projects.map((p) => (p.goalId === goalId ? { ...p, goalId: null } : p)),
    tasks: data.tasks.map((t) => (t.goalId === goalId ? { ...t, goalId: null } : t)),
  };
}

// ---------- life wheel ----------

export type WheelSlice = { area: LifeArea; done: number; total: number };

/** Per life area: tasks done and tasks in total, counted through each project's area. */
export function lifeWheel(data: AppData): WheelSlice[] {
  return LIFE_AREAS.map(({ id }) => {
    const projectIds = new Set(data.projects.filter((p) => p.area === id).map((p) => p.id));
    const tasks = data.tasks.filter((t) => projectIds.has(t.projectId));
    return { area: id, done: tasks.filter((t) => t.status === 'done').length, total: tasks.length };
  });
}

// ---------- capacity assessment ----------

export type Band = 'success' | 'middle' | 'failure' | 'none';

export type Stream = {
  project: Project;
  done: number;
  missed: number;
  pct: number | null; // done / (done + missed) in the period; null when nothing was marked
  band: Band;
};

export type Assessment =
  | { ready: false; firstOn: string } // day the first assessment becomes available
  | {
      ready: true;
      from: string;
      to: string;
      nextOn: string;
      streams: Stream[]; // best first
      weeks: { week: string; done: number }[];
      maxPerWeek: number;
      canManage: { min: number; max: number }; // projects at success, projects above failure
      capability: string;
      advice: string;
    };

function bandOf(pct: number | null, settings: Settings): Band {
  if (pct === null) return 'none';
  if (pct >= settings.successPct) return 'success';
  if (pct < settings.failPct) return 'failure';
  return 'middle';
}

function adviceText(scored: number, min: number, max: number, settings: Settings): string {
  if (scored === 0) {
    return 'No tasks were marked done or missed in this period, so there is nothing to assess yet.';
  }
  if (max === 0) {
    return `Every project scored below your failure threshold of ${settings.failPct}%. Lower your expectations: focus on 1 project next week.`;
  }
  const range = min === max ? `${max}` : min === 0 ? `up to ${max}` : `${min} to ${max}`;
  const noun = max === 1 ? 'project' : 'projects';
  if (max < scored) return `Lower your expectations: you can manage ${range} ${noun}.`;
  if (min === scored) {
    return scored === 1
      ? 'Your project reached your success threshold. This load suits you.'
      : `All ${scored} projects reached your success threshold. This load suits you.`;
  }
  return `You can manage ${range} ${noun}. Keep this load before adding more.`;
}

/**
 * Assesses the most recently completed period of `assessWeeks` weeks, project by project.
 * Periods run back to back from the week of first use.
 */
export function assess(data: AppData, todayKey: string): Assessment {
  const { settings } = data;
  const length = settings.assessWeeks * 7;
  const anchor = startOfWeek(settings.firstUseAt ?? todayKey, settings.weekStart);
  const current = Math.floor(Math.max(daysBetween(anchor, todayKey), 0) / length);
  if (current === 0) return { ready: false, firstOn: addDays(anchor, length) };

  const from = addDays(anchor, (current - 1) * length);
  const to = addDays(from, length - 1);

  const streams: Stream[] = data.projects
    .map((project) => {
      const tasks = tasksOf(data, project.id);
      const done = doneBetween(tasks, from, to);
      const missed = countBetween(tasks, 'missed', from, to);
      const pct = done + missed === 0 ? null : Math.round((done / (done + missed)) * 100);
      return { project, done, missed, pct, band: bandOf(pct, settings) };
    })
    // Leave out projects that neither ran nor had anything marked in the period.
    .filter(
      (s) =>
        s.pct !== null ||
        (s.project.startDate <= to && (s.project.endDate === null || s.project.endDate >= from)),
    )
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  const weeks = Array.from({ length: settings.assessWeeks }, (_, i) => {
    const week = addDays(from, i * 7);
    return { week, done: doneBetween(data.tasks, week, addDays(week, 6)) };
  });
  const maxPerWeek = Math.max(...weeks.map((w) => w.done));

  const min = streams.filter((s) => s.band === 'success').length;
  const max = min + streams.filter((s) => s.band === 'middle').length;
  const scored = streams.filter((s) => s.pct !== null).length;

  return {
    ready: true,
    from,
    to,
    nextOn: addDays(anchor, (current + 1) * length),
    streams,
    weeks,
    maxPerWeek,
    canManage: { min, max },
    capability: `Your maximum capability is ${plural(maxPerWeek, 'task')} every week.`,
    advice: adviceText(scored, min, max, settings),
  };
}

// ---------- persistence ----------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const isName = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isId = (v: unknown): v is string => typeof v === 'string' && v !== '';
const isPct = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100;

function unique<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

/** Defensive parse of stored data: drops bad entries and dangling links, never throws. */
export function sanitize(raw: unknown): AppData {
  const r = isObj(raw) ? raw : {};
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(isObj) : []);

  const goals: Goal[] = unique(
    list(r.goals)
      .filter((g) => isId(g.id) && isName(g.name) && isDateKey(g.createdAt))
      .map((g) => ({
        id: g.id as string,
        name: (g.name as string).trim(),
        createdAt: g.createdAt as string,
      })),
  );
  const goalIds = new Set(goals.map((g) => g.id));
  const goalRef = (v: unknown) => (typeof v === 'string' && goalIds.has(v) ? v : null);

  const projects: Project[] = unique(
    list(r.projects)
      .filter((p) => isId(p.id) && isName(p.name) && isDateKey(p.startDate) && isDateKey(p.createdAt))
      .map((p) => ({
        id: p.id as string,
        name: (p.name as string).trim(),
        startDate: p.startDate as string,
        endDate: isDateKey(p.endDate) && p.endDate >= (p.startDate as string) ? p.endDate : null,
        area: LIFE_AREAS.some((a) => a.id === p.area) ? (p.area as LifeArea) : null,
        goalId: goalRef(p.goalId),
        createdAt: p.createdAt as string,
      })),
  );
  const projectIds = new Set(projects.map((p) => p.id));

  const tasks: Task[] = unique(
    list(r.tasks)
      .filter(
        (t) =>
          isId(t.id) &&
          isName(t.name) &&
          isDateKey(t.createdAt) &&
          typeof t.projectId === 'string' &&
          projectIds.has(t.projectId),
      )
      .map((t) => {
        const closed = (t.status === 'done' || t.status === 'missed') && isDateKey(t.statusAt);
        return {
          id: t.id as string,
          projectId: t.projectId as string,
          name: (t.name as string).trim(),
          status: closed ? (t.status as TaskStatus) : 'open',
          statusAt: closed ? (t.statusAt as string) : null,
          goalId: goalRef(t.goalId),
          createdAt: t.createdAt as string,
        };
      }),
  );

  const s = isObj(r.settings) ? r.settings : {};
  const successPct = isPct(s.successPct) ? s.successPct : DEFAULT_SETTINGS.successPct;
  const failPct = isPct(s.failPct) && s.failPct <= successPct ? s.failPct : Math.min(DEFAULT_SETTINGS.failPct, successPct);
  const settings: Settings = {
    weekStart: s.weekStart === 1 || s.weekStart === 6 ? s.weekStart : 0,
    assessWeeks: s.assessWeeks === 3 ? 3 : 2,
    successPct,
    failPct,
    firstUseAt: isDateKey(s.firstUseAt) ? s.firstUseAt : null,
  };

  return { schemaVersion: 3, goals, projects, tasks, settings };
}

// ---------- week view ----------

export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function weekDays(weekStartKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartKey, i));
}

export function weekLabel(weekStartKey: string): string {
  return `${shortDate(weekStartKey)} – ${shortDate(addDays(weekStartKey, 6))}`;
}

/** Projects that run on at least one day of the week. */
export function projectsInWeek(projects: Project[], weekStartKey: string): Project[] {
  const end = addDays(weekStartKey, 6);
  return projects.filter(
    (p) => p.startDate <= end && (p.endDate === null || p.endDate >= weekStartKey),
  );
}

export type ProjectWeek = {
  perDay: number[]; // tasks done on each of the 7 days
  done: number;
  missed: number;
  tasks: Task[]; // tasks marked that week, plus open tasks when it is the current week
};

export function projectWeek(
  data: AppData,
  project: Project,
  weekStartKey: string,
  isCurrentWeek: boolean,
): ProjectWeek {
  const days = weekDays(weekStartKey);
  const end = days[6];
  const all = tasksOf(data, project.id);
  const inWeek = (t: Task) => t.statusAt !== null && t.statusAt >= weekStartKey && t.statusAt <= end;
  const marked = all.filter(inWeek);
  return {
    perDay: days.map((d) => all.filter((t) => t.status === 'done' && t.statusAt === d).length),
    done: marked.filter((t) => t.status === 'done').length,
    missed: marked.filter((t) => t.status === 'missed').length,
    tasks: sortTasks(all.filter((t) => inWeek(t) || (isCurrentWeek && t.status === 'open'))),
  };
}

/** Tasks done and missed in the week, across all projects. */
export function weekSummary(data: AppData, weekStartKey: string): { done: number; missed: number } {
  const end = addDays(weekStartKey, 6);
  return {
    done: countBetween(data.tasks, 'done', weekStartKey, end),
    missed: countBetween(data.tasks, 'missed', weekStartKey, end),
  };
}

import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { CapacityScreen } from './src/CapacityScreen';
import { GoalPage, GoalsScreen } from './src/GoalsScreen';
import {
  dateKey,
  deleteGoal,
  deleteProject,
  longTouchTask,
  tasksOf,
  touchTask,
  type AppData,
  type Goal,
  type Project,
  type Task,
} from './src/logic';
import { ProjectEditor, type ProjectDraft } from './src/ProjectEditor';
import { ProjectPage } from './src/ProjectPage';
import { ProjectsScreen } from './src/ProjectsScreen';
import { colors } from './src/theme';
import { Chip, Dialog, shared } from './src/ui';
import { useAppData } from './src/useAppData';
import { WheelScreen } from './src/WheelScreen';

type Tab = 'projects' | 'goals' | 'wheel' | 'capacity';
const TABS: [Tab, string, string][] = [
  ['projects', '🗂️', 'Projects'],
  ['goals', '🎯', 'Goals'],
  ['wheel', '🧭', 'Wheel'],
  ['capacity', '📊', 'Capacity'],
];

/** An open project or goal page, with the page to go back to. */
type Page = { kind: 'project' | 'goal'; id: string; back: Page | null };

/** Re-renders whenever the app returns to the foreground, so "today" stays current. */
function useForegroundTick(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const mapTask = (data: AppData, id: string, fn: (t: Task) => Task): AppData => ({
  ...data,
  tasks: data.tasks.map((t) => (t.id === id ? fn(t) : t)),
});

export default function App() {
  const { data, update, loaded, error } = useAppData();
  useForegroundTick();
  const todayKey = dateKey(new Date());

  const [tab, setTab] = useState<Tab>('projects');
  const [page, setPage] = useState<Page | null>(null);

  // Project editor: { project: null } creates a new one.
  const [projectEdit, setProjectEdit] = useState<{ project: Project | null } | null>(null);
  const [taskEdit, setTaskEdit] = useState<Task | null>(null);
  const [taskName, setTaskName] = useState('');
  const [taskGoal, setTaskGoal] = useState<string | null>(null);
  const [goalEdit, setGoalEdit] = useState<Goal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Android back button leaves an open page before leaving the app.
  useEffect(() => {
    if (!page) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPage(page.back);
      return true;
    });
    return () => sub.remove();
  }, [page]);

  const openProject = (p: Project) => setPage({ kind: 'project', id: p.id, back: page });
  const openGoal = (g: Goal) => setPage({ kind: 'goal', id: g.id, back: null });

  const project = page?.kind === 'project' ? data.projects.find((p) => p.id === page.id) : undefined;
  const goal = page?.kind === 'goal' ? data.goals.find((g) => g.id === page.id) : undefined;

  const touch = (t: Task) => update((prev) => mapTask(prev, t.id, (x) => touchTask(x, todayKey)));
  const longTouch = (t: Task) =>
    update((prev) => mapTask(prev, t.id, (x) => longTouchTask(x, todayKey)));

  const saveProject = (draft: ProjectDraft) => {
    const editing = projectEdit?.project;
    update((prev) =>
      editing
        ? { ...prev, projects: prev.projects.map((p) => (p.id === editing.id ? { ...p, ...draft } : p)) }
        : { ...prev, projects: [...prev.projects, { id: newId(), createdAt: todayKey, ...draft }] },
    );
    setProjectEdit(null);
  };

  const removeProject = () => {
    const editing = projectEdit?.project;
    if (!editing) return;
    setPage(page?.back ?? null);
    setProjectEdit(null);
    update((prev) => deleteProject(prev, editing.id));
  };

  const addTask = (projectId: string, name: string) =>
    update((prev) => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        { id: newId(), projectId, name, status: 'open', statusAt: null, goalId: null, createdAt: todayKey },
      ],
    }));

  const openTaskEdit = (t: Task) => {
    setTaskEdit(t);
    setTaskName(t.name);
    setTaskGoal(t.goalId);
    setConfirmDelete(false);
  };

  const saveTask = () => {
    if (!taskEdit) return;
    const name = taskName.trim();
    update((prev) => mapTask(prev, taskEdit.id, (t) => ({ ...t, name, goalId: taskGoal })));
    setTaskEdit(null);
  };

  const removeTask = () => {
    if (!taskEdit) return;
    const id = taskEdit.id;
    update((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
    setTaskEdit(null);
  };

  const openGoalEdit = (g: Goal) => {
    setGoalEdit(g);
    setGoalName(g.name);
    setConfirmDelete(false);
  };

  const saveGoal = () => {
    if (!goalEdit) return;
    const name = goalName.trim();
    update((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === goalEdit.id ? { ...g, name } : g)),
    }));
    setGoalEdit(null);
  };

  const removeGoal = () => {
    if (!goalEdit) return;
    const id = goalEdit.id;
    setPage(null);
    setGoalEdit(null);
    update((prev) => deleteGoal(prev, id));
  };

  const taskProjectGoal = taskEdit
    ? data.goals.find(
        (g) => g.id === data.projects.find((p) => p.id === taskEdit.projectId)?.goalId,
      )
    : undefined;

  let body = null;
  if (!loaded) body = null;
  else if (project) {
    body = (
      <ProjectPage
        data={data}
        project={project}
        todayKey={todayKey}
        onBack={() => setPage(page?.back ?? null)}
        onEdit={() => setProjectEdit({ project })}
        onAddTask={(name) => addTask(project.id, name)}
        onTouch={touch}
        onLongTouch={longTouch}
        onEditTask={openTaskEdit}
      />
    );
  } else if (goal) {
    body = (
      <GoalPage
        data={data}
        goal={goal}
        onBack={() => setPage(null)}
        onEdit={() => openGoalEdit(goal)}
        onOpenProject={openProject}
        onTouch={touch}
        onLongTouch={longTouch}
      />
    );
  } else if (tab === 'projects') {
    body = (
      <ProjectsScreen
        data={data}
        todayKey={todayKey}
        onOpen={openProject}
        onAdd={() => setProjectEdit({ project: null })}
      />
    );
  } else if (tab === 'goals') {
    body = (
      <GoalsScreen
        data={data}
        onOpen={openGoal}
        onAdd={(name) =>
          update((prev) => ({
            ...prev,
            goals: [...prev.goals, { id: newId(), name, createdAt: todayKey }],
          }))
        }
      />
    );
  } else if (tab === 'wheel') {
    body = <WheelScreen data={data} />;
  } else {
    body = (
      <CapacityScreen
        data={data}
        todayKey={todayKey}
        onSettings={(patch) =>
          update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
        }
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.brand}>🏆 Weekchamp</Text>
        </View>

        {error && (
          <Text style={styles.notice}>
            {error === 'load'
              ? "Couldn't read your saved data. Please close and reopen the app. Changes made now won't be saved."
              : "Couldn't save to this phone's storage. Recent changes may not be kept."}
          </Text>
        )}

        <View style={styles.body}>{body}</View>

        <View style={styles.tabs}>
          {TABS.map(([key, icon, label]) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setTab(key);
                  setPage(null);
                }}
                style={styles.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label} tab`}
              >
                <Text style={[styles.tabIcon, !active && styles.tabInactive]}>{icon}</Text>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <ProjectEditor
          visible={projectEdit !== null}
          project={projectEdit?.project ?? null}
          taskCount={projectEdit?.project ? tasksOf(data, projectEdit.project.id).length : 0}
          goals={data.goals}
          todayKey={todayKey}
          onSave={saveProject}
          onDelete={removeProject}
          onClose={() => setProjectEdit(null)}
        />

        <Dialog
          visible={taskEdit !== null}
          title="Edit task"
          onClose={() => setTaskEdit(null)}
          buttons={[
            { label: 'Save', kind: 'primary', onPress: saveTask, disabled: taskName.trim() === '' },
            {
              label: confirmDelete ? 'Tap again to delete this task' : 'Delete task',
              kind: 'danger',
              onPress: () => (confirmDelete ? removeTask() : setConfirmDelete(true)),
            },
            { label: 'Cancel', onPress: () => setTaskEdit(null) },
          ]}
        >
          <TextInput
            value={taskName}
            onChangeText={setTaskName}
            style={[shared.input, styles.dialogInput]}
            maxLength={80}
            accessibilityLabel="Task name"
          />
          <Text style={shared.label}>Ultimate goal</Text>
          <View style={shared.wrap}>
            <Chip
              label={taskProjectGoal ? `Project's goal (${taskProjectGoal.name})` : "Project's goal (none)"}
              active={taskGoal === null}
              onPress={() => setTaskGoal(null)}
              accessibilityLabel="Follow the project's goal"
            />
            {data.goals.map((g) => (
              <Chip
                key={g.id}
                label={`🎯 ${g.name}`}
                active={taskGoal === g.id}
                onPress={() => setTaskGoal(g.id)}
                accessibilityLabel={`Link task to goal ${g.name}`}
              />
            ))}
          </View>
        </Dialog>

        <Dialog
          visible={goalEdit !== null}
          title="Edit goal"
          onClose={() => setGoalEdit(null)}
          buttons={[
            { label: 'Save', kind: 'primary', onPress: saveGoal, disabled: goalName.trim() === '' },
            {
              label: confirmDelete ? 'Tap again to delete this goal' : 'Delete goal',
              kind: 'danger',
              onPress: () => (confirmDelete ? removeGoal() : setConfirmDelete(true)),
            },
            { label: 'Cancel', onPress: () => setGoalEdit(null) },
          ]}
        >
          <TextInput
            value={goalName}
            onChangeText={setGoalName}
            style={[shared.input, styles.dialogInput]}
            maxLength={60}
            accessibilityLabel="Goal name"
          />
          <Text style={shared.caption}>
            Deleting a goal keeps its projects and tasks. They just lose the link.
          </Text>
        </Dialog>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  brand: { fontSize: 22, fontWeight: '900', color: colors.text },
  notice: {
    marginHorizontal: 16,
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.goldSoft,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  body: { flex: 1 },
  dialogInput: { marginTop: 12 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabIcon: { fontSize: 20 },
  tabInactive: { opacity: 0.45 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 2 },
  tabLabelActive: { color: colors.primary, fontWeight: '800' },
});

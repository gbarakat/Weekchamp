import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  LIFE_AREAS,
  PHASE_LABEL,
  projectDates,
  projectStats,
  shortDate,
  sortTasks,
  tasksOf,
  type AppData,
  type Project,
  type Task,
} from './logic';
import { colors } from './theme';
import { shared, TaskRow } from './ui';

type Props = {
  data: AppData;
  project: Project;
  todayKey: string;
  onBack: () => void;
  onEdit: () => void;
  onAddTask: (name: string) => void;
  onTouch: (task: Task) => void;
  onLongTouch: (task: Task) => void;
  onEditTask: (task: Task) => void;
};

export function ProjectPage({
  data,
  project,
  todayKey,
  onBack,
  onEdit,
  onAddTask,
  onTouch,
  onLongTouch,
  onEditTask,
}: Props) {
  const [name, setName] = useState('');
  const stats = projectStats(data, project, todayKey);
  const tasks = sortTasks(tasksOf(data, project.id));
  const area = LIFE_AREAS.find((a) => a.id === project.area);
  const goal = data.goals.find((g) => g.id === project.goalId);
  const peak = Math.max(...stats.perWeek.map((w) => w.done), 1);

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAddTask(trimmed);
    setName('');
  };

  const timing =
    stats.phase === 'notStarted'
      ? `Starts in ${stats.daysToStart} ${stats.daysToStart === 1 ? 'day' : 'days'}`
      : stats.phase === 'ended'
        ? 'Ended'
        : stats.daysLeft === null
          ? 'No end date'
          : `${stats.daysLeft} ${stats.daysLeft === 1 ? 'day' : 'days'} left`;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={onBack}
          style={shared.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={shared.backText}>‹ Back</Text>
        </Pressable>
        <View style={shared.pageTitleRow}>
          <Text style={shared.pageTitle}>{project.name}</Text>
          <Pressable
            onPress={onEdit}
            style={shared.editBtn}
            accessibilityRole="button"
            accessibilityLabel="Edit project"
          >
            <Text style={shared.editBtnText}>Edit</Text>
          </Pressable>
        </View>

        <View style={shared.card}>
          <Text style={styles.phase}>
            {PHASE_LABEL[stats.phase]} · {timing}
          </Text>
          <Text style={shared.caption}>{projectDates(project)}</Text>
          {(area || goal) && (
            <Text style={shared.caption}>
              {[area ? `${area.emoji} ${area.label}` : null, goal ? `🎯 ${goal.name}` : null]
                .filter(Boolean)
                .join('  ·  ')}
            </Text>
          )}
        </View>

        <Text style={shared.section}>Statistics</Text>
        <View style={styles.tiles}>
          {(
            [
              ['Done', String(stats.done)],
              ['Missed', String(stats.missed)],
              ['Open', String(stats.open)],
              ['Complete', stats.completionPct === null ? '–' : `${stats.completionPct}%`],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={styles.tile} accessibilityLabel={`${label} ${value}`}>
              <Text style={styles.tileValue}>{value}</Text>
              <Text style={styles.tileLabel}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={[shared.card, styles.chartCard]}>
          <Text style={styles.chartTitle}>Tasks done per week</Text>
          <View style={styles.chart}>
            {stats.perWeek.map((w, i) => (
              <View key={w.week} style={styles.barCol}>
                <Text style={styles.barValue}>{w.done}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${(w.done / peak) * 100}%` },
                      i === stats.perWeek.length - 1 && styles.barCurrent,
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{shortDate(w.week)}</Text>
              </View>
            ))}
          </View>
          <Text style={shared.caption}>Each bar is one week, labelled by its first day.</Text>
        </View>

        <Text style={shared.section}>Tasks</Text>
        <Text style={[shared.caption, styles.hint]}>
          Touch a task = done. Long touch = missed. Touch again to reopen.
        </Text>

        {tasks.length === 0 ? (
          <Text style={[shared.caption, styles.none]}>No tasks in this project yet.</Text>
        ) : (
          tasks.map((t) => {
            const own = t.goalId ? data.goals.find((g) => g.id === t.goalId) : undefined;
            return (
              <TaskRow
                key={t.id}
                task={t}
                detail={own ? `🎯 ${own.name}` : undefined}
                onTouch={() => onTouch(t)}
                onLongTouch={() => onLongTouch(t)}
                onMore={() => onEditTask(t)}
              />
            );
          })
        )}
      </ScrollView>
      {/* Fixed under the list so it sits right above the keyboard while typing. */}
      <View style={styles.addBar}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          placeholder="New task"
          placeholderTextColor={colors.muted}
          style={[shared.input, shared.addInput]}
          maxLength={80}
          returnKeyType="done"
          blurOnSubmit={false}
          accessibilityLabel="New task name"
        />
        <Pressable
          onPress={add}
          disabled={name.trim() === ''}
          style={[shared.addBtn, name.trim() === '' && shared.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          <Text style={shared.addBtnText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  addBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  phase: { fontSize: 15, fontWeight: '800', color: colors.text },
  tiles: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  tileLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  chartCard: { marginBottom: 0 },
  chartTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 8 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 12, color: colors.muted, fontWeight: '700', marginBottom: 2 },
  barTrack: {
    height: 70,
    width: '100%',
    backgroundColor: colors.bg,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: { width: '100%', backgroundColor: '#A5A1F3', borderRadius: 6 },
  barCurrent: { backgroundColor: colors.primary },
  barLabel: { fontSize: 10, color: colors.muted, marginTop: 6 },
  hint: { marginBottom: 12 },
  none: { marginTop: 4 },
});

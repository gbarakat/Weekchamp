import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { goalSummary, sortTasks, type AppData, type Goal, type Project, type Task } from './logic';
import { colors } from './theme';
import { ProgressBar, shared, TaskRow } from './ui';

const pct = (done: number, total: number) => (total === 0 ? 0 : (done / total) * 100);
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function GoalsScreen({
  data,
  onAdd,
  onOpen,
}: {
  data: AppData;
  onAdd: (name: string) => void;
  onOpen: (goal: Goal) => void;
}) {
  const [name, setName] = useState('');
  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName('');
  };

  return (
    <ScrollView contentContainerStyle={shared.screen} keyboardShouldPersistTaps="handled">
      <View style={shared.addRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          placeholder="New ultimate goal"
          placeholderTextColor={colors.muted}
          style={[shared.input, shared.addInput]}
          maxLength={60}
          returnKeyType="done"
          accessibilityLabel="New goal name"
        />
        <Pressable
          onPress={add}
          disabled={name.trim() === ''}
          style={[shared.addBtn, name.trim() === '' && shared.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Add goal"
        >
          <Text style={shared.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {data.goals.length === 0 ? (
        <View style={shared.empty}>
          <Text style={shared.emptyEmoji}>🎯</Text>
          <Text style={shared.emptyTitle}>No ultimate goals yet</Text>
          <Text style={shared.emptyText}>
            An ultimate goal is what your projects are for. Add one, then link projects or single
            tasks to it.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {data.goals.map((g) => {
            const s = goalSummary(data, g.id);
            return (
              <Pressable
                key={g.id}
                onPress={() => onOpen(g)}
                style={shared.card}
                accessibilityRole="button"
                accessibilityLabel={`Open goal ${g.name}`}
              >
                <Text style={shared.cardTitle}>🎯 {g.name}</Text>
                <Text style={shared.caption}>
                  {count(s.projects.length, 'project')} · {s.done}/{s.total} tasks done
                </Text>
                <View style={styles.bar}>
                  <ProgressBar value={pct(s.done, s.total)} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

export function GoalPage({
  data,
  goal,
  onBack,
  onEdit,
  onOpenProject,
  onTouch,
  onLongTouch,
}: {
  data: AppData;
  goal: Goal;
  onBack: () => void;
  onEdit: () => void;
  onOpenProject: (project: Project) => void;
  onTouch: (task: Task) => void;
  onLongTouch: (task: Task) => void;
}) {
  const s = goalSummary(data, goal.id);
  const projectName = (id: string) => data.projects.find((p) => p.id === id)?.name ?? '';

  return (
    <ScrollView contentContainerStyle={shared.screen}>
      <Pressable onPress={onBack} style={shared.back} accessibilityRole="button" accessibilityLabel="Back to goals">
        <Text style={shared.backText}>‹ Goals</Text>
      </Pressable>
      <View style={shared.pageTitleRow}>
        <Text style={shared.pageTitle}>🎯 {goal.name}</Text>
        <Pressable onPress={onEdit} style={shared.editBtn} accessibilityRole="button" accessibilityLabel="Edit goal">
          <Text style={shared.editBtnText}>Edit</Text>
        </Pressable>
      </View>

      <View style={shared.card}>
        <Text style={styles.progress}>
          {s.done}/{s.total} tasks done
        </Text>
        <View style={styles.bar}>
          <ProgressBar value={pct(s.done, s.total)} />
        </View>
      </View>

      <Text style={shared.section}>Projects</Text>
      {s.projects.length === 0 ? (
        <Text style={shared.caption}>
          No project belongs to this goal yet. Open a project, press Edit, and choose this goal.
        </Text>
      ) : (
        s.projects.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onOpenProject(p)}
            style={shared.card}
            accessibilityRole="button"
            accessibilityLabel={`Open project ${p.name}`}
          >
            <Text style={shared.cardTitle}>{p.name}</Text>
          </Pressable>
        ))
      )}

      <Text style={shared.section}>Linked tasks</Text>
      {s.tasks.length === 0 ? (
        <Text style={shared.caption}>
          No task is linked to this goal yet. Tasks follow their project's goal, or you can link a
          single task from its ⋯ menu.
        </Text>
      ) : (
        sortTasks(s.tasks).map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            detail={projectName(t.projectId)}
            onTouch={() => onTouch(t)}
            onLongTouch={() => onLongTouch(t)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 14 },
  bar: { marginTop: 10 },
  progress: { fontSize: 15, fontWeight: '800', color: colors.text },
});

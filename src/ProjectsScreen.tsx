import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  LIFE_AREAS,
  PHASE_LABEL,
  projectDates,
  projectPhase,
  tasksOf,
  type AppData,
  type Project,
  type ProjectPhase,
} from './logic';
import { colors } from './theme';
import { ProgressBar, shared } from './ui';

type Props = {
  data: AppData;
  todayKey: string;
  onOpen: (project: Project) => void;
  onAdd: () => void;
};

const ORDER: ProjectPhase[] = ['active', 'notStarted', 'ended'];

export function ProjectsScreen({ data, todayKey, onOpen, onAdd }: Props) {
  const groups = ORDER.map((phase) => ({
    phase,
    projects: data.projects.filter((p) => projectPhase(p, todayKey) === phase),
  })).filter((g) => g.projects.length > 0);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={shared.screen}>
        {data.projects.length === 0 && (
          <View style={shared.empty}>
            <Text style={shared.emptyEmoji}>🗂️</Text>
            <Text style={shared.emptyTitle}>No projects yet</Text>
            <Text style={shared.emptyText}>
              Add a project, give it a start and end date, then add tasks inside it. Touch a task
              to mark it done, long touch to mark it missed.
            </Text>
          </View>
        )}

        {groups.map((g) => (
          <View key={g.phase}>
            <Text style={[shared.section, styles.section]}>{PHASE_LABEL[g.phase]}</Text>
            {g.projects.map((p) => {
              const tasks = tasksOf(data, p.id);
              const done = tasks.filter((t) => t.status === 'done').length;
              const area = LIFE_AREAS.find((a) => a.id === p.area);
              const goal = data.goals.find((x) => x.id === p.goalId);
              const tags = [area ? `${area.emoji} ${area.label}` : null, goal ? `🎯 ${goal.name}` : null]
                .filter(Boolean)
                .join('  ·  ');
              return (
                <Pressable
                  key={p.id}
                  onPress={() => onOpen(p)}
                  style={shared.card}
                  accessibilityRole="button"
                  accessibilityLabel={`Open project ${p.name}`}
                >
                  <View style={styles.head}>
                    <Text style={[shared.cardTitle, styles.name]} numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text style={styles.count}>
                      {done}/{tasks.length}
                    </Text>
                  </View>
                  <Text style={shared.caption}>{projectDates(p)}</Text>
                  {tags !== '' && <Text style={shared.caption}>{tags}</Text>}
                  <View style={styles.bar}>
                    <ProgressBar value={tasks.length === 0 ? 0 : (done / tasks.length) * 100} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <Pressable
        onPress={onAdd}
        style={shared.fab}
        accessibilityRole="button"
        accessibilityLabel="Add project"
      >
        <Text style={shared.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: { marginTop: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { flex: 1 },
  count: { fontSize: 14, fontWeight: '800', color: colors.primary, marginLeft: 8 },
  bar: { marginTop: 10 },
});

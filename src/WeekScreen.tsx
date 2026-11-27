import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  addDays,
  DAY_LETTERS,
  parseKey,
  projectsInWeek,
  projectWeek,
  startOfWeek,
  weekDays,
  weekLabel,
  weekSummary,
  type AppData,
  type Project,
  type Task,
} from './logic';
import { colors } from './theme';
import { shared, TaskRow } from './ui';

type Props = {
  data: AppData;
  todayKey: string;
  onOpen: (project: Project) => void;
  onAdd: () => void;
  onTouch: (task: Task) => void;
  onLongTouch: (task: Task) => void;
  onEditTask: (task: Task) => void;
};

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function WeekScreen({ data, todayKey, onOpen, onAdd, onTouch, onLongTouch, onEditTask }: Props) {
  const [offset, setOffset] = useState(0); // weeks relative to the current one, <= 0

  const currentWeek = startOfWeek(todayKey, data.settings.weekStart);
  const week = addDays(currentWeek, offset * 7);
  const isCurrent = offset === 0;
  const days = weekDays(week);
  const projects = projectsInWeek(data.projects, week);
  const summary = weekSummary(data, week);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={shared.screen}>
        <View style={styles.weekNav}>
          <Pressable
            onPress={() => setOffset(offset - 1)}
            style={styles.navBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
          >
            <Text style={styles.navText}>‹</Text>
          </Pressable>
          <View style={styles.weekTitleWrap}>
            <Text style={styles.weekTitle}>
              {isCurrent ? 'This week' : offset === -1 ? 'Last week' : `${-offset} weeks ago`}
            </Text>
            <Text style={styles.weekRange}>{weekLabel(week)}</Text>
          </View>
          <Pressable
            onPress={() => setOffset(offset + 1)}
            disabled={isCurrent}
            style={[styles.navBtn, isCurrent && styles.navBtnDisabled]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Next week"
          >
            <Text style={styles.navText}>›</Text>
          </Pressable>
        </View>

        <View style={shared.card} accessibilityLabel="Week summary">
          <Text style={styles.summary}>
            {count(summary.done, 'task')} done {isCurrent ? 'this week' : 'that week'}
            {summary.missed > 0 ? `, ${summary.missed} missed` : ''}
          </Text>
        </View>

        {projects.length === 0 ? (
          <View style={shared.empty}>
            <Text style={shared.emptyEmoji}>🗂️</Text>
            <Text style={shared.emptyTitle}>
              {data.projects.length === 0 ? 'No projects yet' : 'No project was active this week'}
            </Text>
            {data.projects.length === 0 && (
              <Text style={shared.emptyText}>
                Add a project with the + button, then add tasks inside it. Touch a task to mark it
                done, long touch to mark it missed.
              </Text>
            )}
          </View>
        ) : (
          projects.map((p) => {
            const w = projectWeek(data, p, week, isCurrent);
            return (
              <View key={p.id} style={shared.card}>
                <Pressable
                  onPress={() => onOpen(p)}
                  style={styles.head}
                  accessibilityRole="button"
                  accessibilityLabel={`Open project ${p.name}`}
                >
                  <Text style={[shared.cardTitle, styles.name]} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <View style={[styles.pill, w.done > 0 && styles.pillDone]}>
                    <Text style={[styles.pillText, w.done > 0 && styles.pillTextDone]}>
                      {w.done} done
                    </Text>
                  </View>
                </Pressable>

                <View style={styles.days}>
                  {days.map((day, i) => {
                    const n = w.perDay[i];
                    const isToday = day === todayKey;
                    return (
                      <View
                        key={day}
                        style={styles.dayCol}
                        accessibilityLabel={`${p.name} ${day}: ${n} done`}
                      >
                        <Text style={[styles.dayLetter, isToday && styles.dayLetterToday]}>
                          {DAY_LETTERS[parseKey(day).getDay()]}
                        </Text>
                        <View
                          style={[
                            styles.dot,
                            isToday && styles.dotToday,
                            n > 0 && styles.dotDone,
                            day > todayKey && styles.dotFuture,
                          ]}
                        >
                          <Text style={[styles.dotText, n > 0 && styles.dotTextDone]}>
                            {n > 0 ? (n === 1 ? '✓' : n) : parseKey(day).getDate()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {w.tasks.length === 0 ? (
                  <Text style={shared.caption}>
                    {isCurrent ? 'No open tasks. Open the project to add some.' : 'Nothing was marked that week.'}
                  </Text>
                ) : (
                  <View style={styles.tasks}>
                    {w.tasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        onTouch={() => onTouch(t)}
                        onLongTouch={() => onLongTouch(t)}
                        onMore={() => onEditTask(t)}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
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
  weekNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navText: { fontSize: 24, lineHeight: 26, color: colors.text, fontWeight: '600' },
  weekTitleWrap: { flex: 1, alignItems: 'center' },
  weekTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  weekRange: { fontSize: 13, color: colors.muted, marginTop: 2 },
  summary: { fontSize: 15, fontWeight: '700', color: colors.text },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  name: { flex: 1 },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  pillDone: { backgroundColor: colors.successSoft },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  pillTextDone: { color: colors.success },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', flex: 1 },
  dayLetter: { fontSize: 11, color: colors.muted, marginBottom: 4, fontWeight: '600' },
  dayLetterToday: { color: colors.primary },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  dotToday: { borderColor: colors.primary },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotFuture: { opacity: 0.4 },
  dotText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  dotTextDone: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  tasks: { marginTop: 14, marginBottom: -8 },
});

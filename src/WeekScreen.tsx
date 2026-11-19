import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HabitCard } from './HabitCard';
import {
  addDays,
  habitStreak,
  habitsInWeek,
  startOfWeek,
  weekDays,
  weekLabel,
  weekScore,
  type AppData,
  type Habit,
} from './logic';
import { colors } from './theme';

type Props = {
  data: AppData;
  todayKey: string;
  onToggle: (habitId: string, day: string) => void;
  onAdd: () => void;
  onEdit: (habit: Habit) => void;
};

export function WeekScreen({ data, todayKey, onToggle, onAdd, onEdit }: Props) {
  const [offset, setOffset] = useState(0); // weeks relative to the current one, <= 0

  const currentWeek = startOfWeek(todayKey, data.weekStart);
  const week = addDays(currentWeek, offset * 7);
  const days = weekDays(week);
  const habits = habitsInWeek(data.habits, week);
  const score = weekScore(data.habits, data.checks, week);
  const champion = score === 100;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
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
              {offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${-offset} weeks ago`}
            </Text>
            <Text style={styles.weekRange}>{weekLabel(week)}</Text>
          </View>
          <Pressable
            onPress={() => setOffset(offset + 1)}
            disabled={offset === 0}
            style={[styles.navBtn, offset === 0 && styles.navBtnDisabled]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Next week"
          >
            <Text style={styles.navText}>›</Text>
          </Pressable>
        </View>

        {score !== null && (
          <View style={[styles.scoreCard, champion && styles.scoreCardChampion]}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>
                {champion ? '🏆 Week champion!' : 'Week score'}
              </Text>
              <Text style={[styles.scoreValue, champion && styles.scoreValueChampion]}>
                {score}%
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${score}%` },
                  champion && styles.fillChampion,
                ]}
              />
            </View>
          </View>
        )}

        {habits.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyTitle}>
              {data.habits.length === 0 ? 'No habits yet' : 'No habits existed this week'}
            </Text>
            {data.habits.length === 0 && (
              <Text style={styles.emptyText}>
                Add a habit, set how many times a week you want to do it, and tick off the days.
                Hit every target to become the week champion.
              </Text>
            )}
          </View>
        ) : (
          habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              days={days}
              checked={data.checks[h.id] ?? []}
              todayKey={todayKey}
              streak={habitStreak(h, data.checks, todayKey, data.weekStart)}
              onToggle={(day) => onToggle(h.id, day)}
              onEdit={() => onEdit(h)}
            />
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={onAdd}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Add habit"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 96 },
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
  scoreCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreCardChampion: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  scoreValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
  scoreValueChampion: { color: '#B46B00' },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginTop: 10,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  fillChampion: { backgroundColor: colors.gold },
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: '#FFFFFF', fontSize: 32, lineHeight: 34, fontWeight: '500' },
});

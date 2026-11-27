import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  archivedSince,
  areaBalance,
  habitStreak,
  isArchivedNow,
  LIFE_AREAS,
  longDate,
  scoreHistory,
  shortDate,
  startOfWeek,
  type AppData,
  type Habit,
} from './logic';
import { colors } from './theme';
import { Dialog } from './ui';

const WEEKS = 8;

type Props = {
  data: AppData;
  todayKey: string;
  onRestore: (habit: Habit) => void;
  onDeleteForever: (habit: Habit) => void;
  /** The Settings area, rendered at the bottom. */
  children: ReactNode;
};

export function StatsScreen({ data, todayKey, onRestore, onDeleteForever, children }: Props) {
  const [deleting, setDeleting] = useState<Habit | null>(null);

  const history = scoreHistory(data, todayKey, WEEKS);
  const scored = history.filter((h) => h.score !== null);
  const championWeeks = scored.filter((h) => h.score === 100).length;
  const average =
    scored.length === 0
      ? null
      : Math.round(scored.reduce((a, h) => a + (h.score ?? 0), 0) / scored.length);

  const active = data.habits.filter((h) => !isArchivedNow(h));
  const archived = data.habits.filter(isArchivedNow);
  const balance = areaBalance(data, startOfWeek(todayKey, data.settings.weekStart));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.tiles}>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>{average === null ? '–' : `${average}%`}</Text>
          <Text style={styles.tileLabel}>Average score</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>🏆 {championWeeks}</Text>
          <Text style={styles.tileLabel}>Champion weeks</Text>
        </View>
      </View>
      <Text style={styles.caption}>Based on the last {WEEKS} weeks.</Text>

      <Text style={styles.section}>Weekly score</Text>
      <View style={styles.card}>
        <View style={styles.chart}>
          {history.map((h, i) => {
            const isCurrent = i === history.length - 1;
            const score = h.score;
            return (
              <View key={h.week} style={styles.barCol}>
                <Text style={styles.barValue}>{score === null ? '' : score}</Text>
                <View style={styles.barTrack}>
                  {score !== null && (
                    <View
                      style={[
                        styles.bar,
                        { height: `${Math.max(score, 3)}%` },
                        score === 100 && styles.barChampion,
                        isCurrent && score !== 100 && styles.barCurrent,
                      ]}
                    />
                  )}
                </View>
                <Text style={[styles.barLabel, isCurrent && styles.barLabelCurrent]}>
                  {shortDate(h.week)}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.caption}>
          Each bar is one week, labelled by its first day. Gold = every target hit.
        </Text>
      </View>

      <Text style={styles.section}>Streaks</Text>
      <View style={styles.card}>
        {active.length === 0 ? (
          <Text style={styles.captionFlat}>Add a habit to start a streak.</Text>
        ) : (
          active.map((h, i) => {
            const streak = habitStreak(h, data.checks, todayKey, data.settings.weekStart);
            return (
              <View key={h.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={styles.rowEmoji}>{h.emoji}</Text>
                <Text style={styles.rowName} numberOfLines={1}>
                  {h.name}
                </Text>
                <Text style={[styles.rowValue, streak === 0 && styles.rowValueMuted]}>
                  {streak === 0 ? 'No streak yet' : `🔥 ${streak} ${streak === 1 ? 'week' : 'weeks'}`}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <Text style={styles.section}>Balance</Text>
      <View style={styles.card}>
        {balance.map((b, i) => {
          const area = LIFE_AREAS.find((a) => a.id === b.area)!;
          return (
            <View key={b.area} style={[styles.balanceRow, i > 0 && styles.rowBorder]}>
              <View style={styles.balanceHead}>
                <Text style={styles.rowName}>
                  {area.emoji} {area.label}
                </Text>
                {b.habits === 0 ? (
                  <Text style={styles.rowValueMuted}>No habits yet</Text>
                ) : (
                  <Text style={styles.balanceValue}>
                    {b.habits} {b.habits === 1 ? 'habit' : 'habits'} · {b.done}/{b.target}
                  </Text>
                )}
              </View>
              {b.habits > 0 && (
                <View style={styles.balanceTrack}>
                  <View
                    style={[styles.balanceFill, { width: `${(b.done / b.target) * 100}%` }]}
                  />
                </View>
              )}
            </View>
          );
        })}
        <Text style={styles.caption}>See where your week's effort goes.</Text>
      </View>

      {archived.length > 0 && (
        <>
          <Text style={styles.section}>Archived</Text>
          <View style={styles.card}>
            {archived.map((h, i) => {
              const since = archivedSince(h);
              return (
                <View key={h.id} style={[styles.archivedRow, i > 0 && styles.rowBorder]}>
                  <View style={styles.row}>
                    <Text style={styles.rowEmoji}>{h.emoji}</Text>
                    <View style={styles.archivedText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {h.name}
                      </Text>
                      <Text style={styles.archivedDate}>
                        Archived on {since ? longDate(since) : '–'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.archivedActions}>
                    <Pressable
                      onPress={() => onRestore(h)}
                      style={styles.restoreBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Restore ${h.name}`}
                    >
                      <Text style={styles.restoreText}>Restore</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setDeleting(h)}
                      style={styles.deleteBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${h.name} forever`}
                    >
                      <Text style={styles.deleteText}>Delete forever</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {children}

      <Dialog
        visible={deleting !== null}
        title="Delete forever?"
        message={`Delete ${deleting?.name ?? ''} and all its history? This can't be undone.`}
        onClose={() => setDeleting(null)}
        buttons={[
          {
            label: 'Delete forever',
            kind: 'danger',
            onPress: () => {
              if (deleting) onDeleteForever(deleting);
              setDeleting(null);
            },
          },
          { label: 'Cancel', onPress: () => setDeleting(null) },
        ]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileValue: { fontSize: 26, fontWeight: '800', color: colors.text },
  tileLabel: { fontSize: 13, color: colors.muted, marginTop: 4 },
  caption: { fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 17 },
  captionFlat: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  section: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 22, marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 11, color: colors.muted, fontWeight: '700', height: 16 },
  barTrack: {
    height: 120,
    width: '100%',
    backgroundColor: colors.bg,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: { width: '100%', backgroundColor: '#A5A1F3', borderRadius: 6 },
  barCurrent: { backgroundColor: colors.primary },
  barChampion: { backgroundColor: colors.gold },
  barLabel: { fontSize: 9, color: colors.muted, marginTop: 6 },
  barLabelCurrent: { color: colors.primary, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowEmoji: { fontSize: 20, marginRight: 10 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginLeft: 8 },
  rowValueMuted: { fontSize: 14, color: colors.muted, fontWeight: '500', marginLeft: 8 },
  balanceRow: { paddingVertical: 10 },
  balanceHead: { flexDirection: 'row', alignItems: 'center' },
  balanceValue: { fontSize: 13, fontWeight: '700', color: colors.text, marginLeft: 8 },
  balanceTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bg,
    marginTop: 8,
    overflow: 'hidden',
  },
  balanceFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  archivedRow: { paddingBottom: 10 },
  archivedText: { flex: 1 },
  archivedDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  archivedActions: { flexDirection: 'row', gap: 8 },
  restoreBtn: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  restoreText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  deleteBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteText: { fontSize: 14, fontWeight: '700', color: colors.danger },
});

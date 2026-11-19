import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  habitStreak,
  scoreHistory,
  shortDate,
  type AppData,
  type WeekStart,
} from './logic';
import { colors } from './theme';

const WEEKS = 8;
const WEEK_START_OPTIONS: { value: WeekStart; label: string }[] = [
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
];

type Props = {
  data: AppData;
  todayKey: string;
  onWeekStart: (value: WeekStart) => void;
};

export function StatsScreen({ data, todayKey, onWeekStart }: Props) {
  const history = scoreHistory(data, todayKey, WEEKS);
  const scored = history.filter((h) => h.score !== null);
  const championWeeks = scored.filter((h) => h.score === 100).length;
  const average =
    scored.length === 0
      ? null
      : Math.round(scored.reduce((a, h) => a + (h.score ?? 0), 0) / scored.length);

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
        {data.habits.length === 0 ? (
          <Text style={styles.caption}>Add a habit to start a streak.</Text>
        ) : (
          data.habits.map((h, i) => {
            const streak = habitStreak(h, data.checks, todayKey, data.weekStart);
            return (
              <View key={h.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={styles.rowEmoji}>{h.emoji || '⭐'}</Text>
                <Text style={styles.rowName} numberOfLines={1}>
                  {h.name}
                </Text>
                <Text style={[styles.rowValue, streak === 0 && styles.rowValueMuted]}>
                  {streak === 0 ? 'No streak' : `🔥 ${streak} ${streak === 1 ? 'week' : 'weeks'}`}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <Text style={styles.section}>Week starts on</Text>
      <View style={styles.segment}>
        {WEEK_START_OPTIONS.map((o) => {
          const active = data.weekStart === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onWeekStart(o.value)}
              style={[styles.segmentCell, active && styles.segmentCellActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.caption}>
        Changing this regroups your existing check-ins, so past scores can shift.
      </Text>
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
  rowValueMuted: { color: colors.muted, fontWeight: '500' },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentCell: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentCellActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: '700', color: colors.text },
  segmentTextActive: { color: '#FFFFFF' },
});

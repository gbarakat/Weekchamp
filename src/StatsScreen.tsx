import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import {
  activeHabits,
  areaBalance,
  habitStreak,
  isArchived,
  LIFE_AREAS,
  scoreHistory,
  shortDate,
  startOfWeek,
  type AppData,
  type Habit,
  type Settings,
  type WeekStart,
} from './logic';
import { colors } from './theme';
import { TimeStepper } from './TimeStepper';

const WEEKS = 8;
const WEEK_START_OPTIONS: { value: WeekStart; label: string }[] = [
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
];

type Props = {
  data: AppData;
  todayKey: string;
  notificationsOn: boolean;
  onSettings: (patch: Partial<Settings>) => void;
  onRestore: (habit: Habit) => void;
  onDeleteForever: (habit: Habit) => void;
  onExport: () => void;
  onImport: () => void;
  onAllowNotifications: () => void;
};

export function StatsScreen({
  data,
  todayKey,
  notificationsOn,
  onSettings,
  onRestore,
  onDeleteForever,
  onExport,
  onImport,
  onAllowNotifications,
}: Props) {
  const { settings } = data;
  const onWeekStart = (weekStart: WeekStart) => onSettings({ weekStart });
  const balance = areaBalance(data, startOfWeek(todayKey, settings.weekStart));
  const archived = data.habits.filter(isArchived);
  const confirmDelete = (h: Habit) =>
    Alert.alert(
      `Delete ${h.name}?`,
      "This deletes the habit and all its history. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: () => onDeleteForever(h) },
      ],
    );
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
        {activeHabits(data.habits).length === 0 ? (
          <Text style={styles.caption}>Add a habit to start a streak.</Text>
        ) : (
          activeHabits(data.habits).map((h, i) => {
            const streak = habitStreak(h, data.checks, todayKey, settings.weekStart);
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

      <Text style={styles.section}>Balance</Text>
      <View style={styles.card}>
        {balance.map((b, i) => {
          const a = LIFE_AREAS.find((x) => x.key === b.area)!;
          const pct = b.target === 0 ? 0 : Math.round((b.done / b.target) * 100);
          return (
            <View key={b.area} style={[styles.balanceRow, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowEmoji}>{a.emoji}</Text>
              <View style={styles.balanceMain}>
                <View style={styles.balanceHead}>
                  <Text style={styles.rowName}>{a.label}</Text>
                  <Text style={[styles.rowValue, b.habits === 0 && styles.rowValueMuted]}>
                    {b.habits === 0
                      ? 'No habits yet'
                      : `${b.done}/${b.target} · ${b.habits} ${b.habits === 1 ? 'habit' : 'habits'}`}
                  </Text>
                </View>
                {b.habits > 0 && (
                  <View style={styles.balanceTrack}>
                    <View style={[styles.balanceBar, { width: `${Math.max(pct, 2)}%` }]} />
                  </View>
                )}
              </View>
            </View>
          );
        })}
        <Text style={styles.caption}>
          See where your week's effort goes. Tag a habit with a life area when you edit it.
        </Text>
      </View>

      {archived.length > 0 && (
        <>
          <Text style={styles.section}>Archived</Text>
          <View style={styles.card}>
            {archived.map((h, i) => {
              const since = h.archived.find((p) => p.to === null)?.from;
              return (
                <View key={h.id} style={[styles.archivedRow, i > 0 && styles.rowBorder]}>
                  <View style={styles.row}>
                    <Text style={styles.rowEmoji}>{h.emoji || '⭐'}</Text>
                    <View style={styles.balanceMain}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {h.name}
                      </Text>
                      {since && <Text style={styles.caption}>Archived on {shortDate(since)}</Text>}
                    </View>
                  </View>
                  <View style={styles.archivedActions}>
                    <Pressable
                      onPress={() => onRestore(h)}
                      style={styles.smallBtn}
                      accessibilityRole="button"
                    >
                      <Text style={styles.smallBtnText}>Restore</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(h)}
                      style={styles.linkBtn}
                      accessibilityRole="button"
                    >
                      <Text style={styles.dangerText}>Delete forever</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      <Text style={styles.sectionBig}>Settings</Text>

      <Text style={styles.section}>Reminders</Text>
      <View style={styles.card}>
        {!notificationsOn && (
          <Pressable onPress={onAllowNotifications} style={styles.notice} accessibilityRole="button">
            <Text style={styles.noticeText}>
              Notifications are off for Weekchamp. Tap to allow them so reminders can reach you.
            </Text>
          </Pressable>
        )}
        <View style={styles.switchRow}>
          <View style={styles.balanceMain}>
            <Text style={styles.rowName}>Daily plan</Text>
            <Text style={styles.caption}>What's left this week. Skipped when every target is met.</Text>
          </View>
          <Switch
            value={settings.dailyReminder.enabled}
            onValueChange={(enabled) =>
              onSettings({ dailyReminder: { ...settings.dailyReminder, enabled } })
            }
            trackColor={{ true: colors.primary }}
            accessibilityLabel="Daily plan reminder"
          />
        </View>
        {settings.dailyReminder.enabled && (
          <View style={styles.stepperWrap}>
            <TimeStepper
              value={settings.dailyReminder.time}
              onChange={(time) => onSettings({ dailyReminder: { ...settings.dailyReminder, time } })}
              label="Daily plan time"
            />
          </View>
        )}
        <Text style={styles.caption}>
          Per-habit reminders are set in each habit (tap its name on the Week screen).
        </Text>
      </View>

      <Text style={styles.section}>Backup</Text>
      <View style={styles.card}>
        <Text style={styles.caption}>
          {settings.lastBackupAt
            ? `Last backup: ${shortDate(settings.lastBackupAt)}`
            : 'No backup yet. Your habits live only on this phone.'}
        </Text>
        <View style={styles.backupBtns}>
          <Pressable onPress={onExport} style={styles.primaryBtn} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>Export backup</Text>
          </Pressable>
          <Pressable onPress={onImport} style={styles.smallBtnWide} accessibilityRole="button">
            <Text style={styles.smallBtnText}>Import backup</Text>
          </Pressable>
        </View>
        <View style={[styles.switchRow, styles.rowBorder]}>
          <Text style={styles.rowName}>Monthly backup reminder</Text>
          <Switch
            value={settings.backupReminder.enabled}
            onValueChange={(enabled) => onSettings({ backupReminder: { enabled } })}
            trackColor={{ true: colors.primary }}
            accessibilityLabel="Monthly backup reminder"
          />
        </View>
      </View>

      <Text style={styles.section}>Week starts on</Text>
      <View style={styles.segment}>
        {WEEK_START_OPTIONS.map((o) => {
          const active = settings.weekStart === o.value;
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
  sectionBig: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 32, marginBottom: 2 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  balanceMain: { flex: 1 },
  balanceHead: { flexDirection: 'row', alignItems: 'center' },
  balanceTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bg,
    marginTop: 6,
    overflow: 'hidden',
  },
  balanceBar: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  archivedRow: { paddingVertical: 6 },
  archivedActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
  },
  smallBtnWide: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
  },
  smallBtnText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  linkBtn: { paddingVertical: 8 },
  dangerText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  backupBtns: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 12 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  stepperWrap: { paddingVertical: 8 },
  notice: { backgroundColor: colors.goldSoft, borderRadius: 12, padding: 12, marginBottom: 8 },
  noticeText: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '600' },
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

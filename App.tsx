import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { exportBackup, pickBackup } from './src/backupIO';
import { HabitEditor, type HabitDraft, type TargetMode } from './src/HabitEditor';
import {
  archiveHabit,
  changeTarget,
  dateKey,
  restoreHabit,
  shortDate,
  startOfWeek,
  targetForWeek,
  toggleCheck,
  type Habit,
  type Settings,
} from './src/logic';
import {
  notificationsAllowed,
  requestNotifications,
  syncNotifications,
  useLastNotificationResponse,
} from './src/notifications';
import { StatsScreen } from './src/StatsScreen';
import { colors } from './src/theme';
import { useAppData } from './src/useAppData';
import { WeekScreen } from './src/WeekScreen';

type Tab = 'week' | 'stats';

/** Today's date key, refreshed whenever the app returns to the foreground. */
function useTodayKey(): string {
  const [today, setToday] = useState(() => dateKey(new Date()));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(dateKey(new Date()));
    });
    return () => sub.remove();
  }, []);
  return today;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function App() {
  const { data, update, loaded, saveError } = useAppData();
  const todayKey = useTodayKey();
  const [tab, setTab] = useState<Tab>('week');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const lastResponse = useLastNotificationResponse();

  const currentWeek = startOfWeek(todayKey, data.settings.weekStart);

  // Re-plan reminders whenever the data or the day changes.
  useEffect(() => {
    if (!loaded) return;
    syncNotifications(data);
    notificationsAllowed().then(setNotificationsOn, () => setNotificationsOn(false));
  }, [data, loaded, todayKey]);

  // Tapping the backup reminder opens the Progress tab, where Backup lives.
  useEffect(() => {
    const kind = lastResponse?.notification.request.content.data?.kind;
    if (kind === 'backup') setTab('stats');
  }, [lastResponse]);

  const setSettings = (patch: Partial<Settings>) =>
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));

  const openEditor = (habit: Habit | null) => {
    setEditing(habit);
    setEditorOpen(true);
  };

  const saveHabit = (draft: HabitDraft, mode: TargetMode) => {
    const { target, ...rest } = draft;
    update((prev) => ({
      ...prev,
      habits: editing
        ? prev.habits.map((h) => {
            if (h.id !== editing.id) return h;
            const next = { ...h, ...rest };
            return target === targetForWeek(h, currentWeek)
              ? next
              : changeTarget(next, target, mode, currentWeek);
          })
        : [
            ...prev.habits,
            {
              id: newId(),
              createdAt: todayKey,
              targets: [{ from: todayKey, target }],
              archived: [],
              ...rest,
            },
          ],
    }));
    setEditorOpen(false);
    if (draft.reminder?.enabled) requestNotifications().then(setNotificationsOn);
  };

  const mapHabit = (id: string, fn: (h: Habit) => Habit) =>
    update((prev) => ({ ...prev, habits: prev.habits.map((h) => (h.id === id ? fn(h) : h)) }));

  const archiveEditing = () => {
    if (!editing) return;
    mapHabit(editing.id, (h) => archiveHabit(h, todayKey));
    setEditorOpen(false);
  };

  const deleteForever = (habit: Habit) =>
    update((prev) => {
      const { [habit.id]: _removed, ...checks } = prev.checks;
      return { ...prev, habits: prev.habits.filter((h) => h.id !== habit.id), checks };
    });

  const onExport = async () => {
    try {
      const shown = await exportBackup(data, todayKey);
      if (!shown) {
        Alert.alert('Sharing is not available', 'This phone cannot open the share menu.');
        return;
      }
      setSettings({ lastBackupAt: todayKey });
    } catch {
      Alert.alert('Backup failed', 'The backup file could not be created. Please try again.');
    }
  };

  const onImport = async () => {
    const result = await pickBackup().catch(() => null);
    if (!result) return;
    if (!result.ok) {
      Alert.alert('Import failed', result.reason);
      return;
    }
    const from = result.exportedAt ? ` from ${shortDate(dateKey(new Date(result.exportedAt)))}` : '';
    Alert.alert(
      'Replace your data?',
      `Replace all current habits and history with this backup${from}? Your current data will be overwritten.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () =>
            update((prev) => ({
              ...result.data,
              // Keep this phone's own notification state.
              settings: {
                ...result.data.settings,
                firstUseAt: prev.settings.firstUseAt,
                notificationsAsked: prev.settings.notificationsAsked,
              },
            })),
        },
      ],
    );
  };

  const answerReminderCard = async (turnOn: boolean) => {
    const granted = turnOn ? await requestNotifications() : false;
    setNotificationsOn(granted);
    setSettings({
      notificationsAsked: true,
      dailyReminder: { ...data.settings.dailyReminder, enabled: granted },
    });
  };

  const showReminderCard = loaded && !data.settings.notificationsAsked && tab === 'week';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.brand}>🏆 Weekchamp</Text>
        </View>

        {saveError && (
          <Text style={styles.error}>Could not save to device storage. Changes may be lost.</Text>
        )}

        {showReminderCard && (
          <View style={styles.promptCard}>
            <Text style={styles.promptTitle}>Get a gentle daily plan?</Text>
            <Text style={styles.promptBody}>
              One reminder a day at {data.settings.dailyReminder.time} with what's left this week.
              Nothing when you're done. Change it any time in Progress.
            </Text>
            <View style={styles.promptBtns}>
              <Pressable
                onPress={() => answerReminderCard(true)}
                style={styles.promptYes}
                accessibilityRole="button"
              >
                <Text style={styles.promptYesText}>Turn on</Text>
              </Pressable>
              <Pressable
                onPress={() => answerReminderCard(false)}
                style={styles.promptNo}
                accessibilityRole="button"
              >
                <Text style={styles.promptNoText}>Not now</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.body}>
          {!loaded ? null : tab === 'week' ? (
            <WeekScreen
              data={data}
              todayKey={todayKey}
              onToggle={(habitId, day) =>
                update((prev) => ({ ...prev, checks: toggleCheck(prev.checks, habitId, day) }))
              }
              onAdd={() => openEditor(null)}
              onEdit={openEditor}
            />
          ) : (
            <StatsScreen
              data={data}
              todayKey={todayKey}
              notificationsOn={notificationsOn}
              onSettings={(patch) => {
                setSettings(patch);
                if (patch.dailyReminder?.enabled) requestNotifications().then(setNotificationsOn);
              }}
              onRestore={(h) => mapHabit(h.id, (x) => restoreHabit(x, todayKey))}
              onDeleteForever={deleteForever}
              onExport={onExport}
              onImport={onImport}
              onAllowNotifications={() => requestNotifications().then(setNotificationsOn)}
            />
          )}
        </View>

        <View style={styles.tabs}>
          {(
            [
              ['week', '📅', 'Week'],
              ['stats', '📈', 'Progress'],
            ] as const
          ).map(([key, icon, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
            >
              <Text style={[styles.tabIcon, tab !== key && styles.tabInactive]}>{icon}</Text>
              <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <HabitEditor
          visible={editorOpen}
          habit={editing}
          currentTarget={editing ? targetForWeek(editing, currentWeek) : 3}
          onSave={saveHabit}
          onArchive={archiveEditing}
          onClose={() => setEditorOpen(false)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  brand: { fontSize: 22, fontWeight: '900', color: colors.text },
  error: {
    marginHorizontal: 16,
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FDE7E5',
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  body: { flex: 1 },
  promptCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  promptTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  promptBody: { fontSize: 13, color: colors.text, marginTop: 4, lineHeight: 18 },
  promptBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  promptYes: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  promptYesText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  promptNo: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  promptNoText: { color: colors.muted, fontWeight: '700', fontSize: 14 },
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

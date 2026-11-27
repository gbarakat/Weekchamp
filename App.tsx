import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { HabitEditor, type HabitDraft } from './src/HabitEditor';
import {
  archiveHabit,
  changeTarget,
  dateKey,
  deleteHabit,
  restoreHabit,
  startOfWeek,
  targetForWeek,
  toggleCheck,
  type AppData,
  type Habit,
  type TargetMode,
} from './src/logic';
import {
  clearOpenedNotification,
  getPermission,
  requestPermission,
  syncNotifications,
  useOpenedNotification,
  type PermissionState,
} from './src/notifications';
import { SettingsSection } from './src/SettingsSection';
import { StatsScreen } from './src/StatsScreen';
import { colors } from './src/theme';
import { useAppData } from './src/useAppData';
import { WeekScreen } from './src/WeekScreen';

type Tab = 'week' | 'stats';

/** Bumps whenever the app returns to the foreground. */
function useForegroundTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);
  return tick;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const mapHabit = (data: AppData, id: string, fn: (h: Habit) => Habit): AppData => ({
  ...data,
  habits: data.habits.map((h) => (h.id === id ? fn(h) : h)),
});

export default function App() {
  const { data, update, loaded, error } = useAppData();
  const foregroundTick = useForegroundTick();
  const todayKey = dateKey(new Date()); // re-read on every render; foreground ticks re-render
  const currentWeek = startOfWeek(todayKey, data.settings.weekStart);

  const [tab, setTab] = useState<Tab>('week');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [permission, setPermission] = useState<PermissionState>('unknown');

  // Permission can change in system settings while the app is in the background.
  useEffect(() => {
    getPermission().then(setPermission);
  }, [foregroundTick]);

  // Reschedule reminders on every data change and every time the app opens.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => void syncNotifications(data), 400);
    return () => clearTimeout(t);
  }, [data, loaded, permission, foregroundTick]);

  // A tapped notification opens its tab (the backup reminder opens Progress).
  const opened = useOpenedNotification();
  const openedId = opened?.id;
  const openedTab = opened?.tab;
  useEffect(() => {
    if (!openedTab) return;
    setTab(openedTab);
    clearOpenedNotification(); // otherwise the same tap is replayed on the next launch
  }, [openedId, openedTab]);

  const askPermission = useCallback(() => {
    requestPermission().then(setPermission);
  }, []);

  const answerExplainer = (allow: boolean) => {
    update((prev) => ({ ...prev, settings: { ...prev.settings, notificationsAsked: true } }));
    if (allow) askPermission();
  };

  const openEditor = (habit: Habit | null) => {
    setEditing(habit);
    setEditorOpen(true);
  };

  const saveHabit = (draft: HabitDraft, mode: TargetMode | null) => {
    const { target, ...fields } = draft;
    update((prev) => {
      if (!editing) {
        const habit: Habit = {
          id: newId(),
          createdAt: todayKey,
          targets: [{ from: todayKey, target }],
          archived: [],
          ...fields,
        };
        return { ...prev, habits: [...prev.habits, habit] };
      }
      return mapHabit(prev, editing.id, (h) => {
        const next = { ...h, ...fields };
        return mode ? changeTarget(next, target, mode, currentWeek) : next;
      });
    });
    setEditorOpen(false);
  };

  const archiveEditing = () => {
    if (editing) update((prev) => mapHabit(prev, editing.id, (h) => archiveHabit(h, todayKey)));
    setEditorOpen(false);
  };

  // A fresh install on Android 13+ reports 'denied' until the user has been asked once.
  const showExplainer =
    loaded &&
    !data.settings.notificationsAsked &&
    (permission === 'undetermined' || permission === 'denied');

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
              ? "Couldn't read your saved habits. Please close and reopen the app. Changes made now won't be saved."
              : "Couldn't save to this phone's storage. Recent changes may not be kept."}
          </Text>
        )}

        {showExplainer && (
          <View style={styles.explainer}>
            <Text style={styles.explainerTitle}>Want gentle reminders?</Text>
            <Text style={styles.explainerText}>
              One short note a day at {data.settings.dailyReminder.time} with what's left this
              week. Nothing once you're done. You can change this in Progress.
            </Text>
            <View style={styles.explainerRow}>
              <Pressable
                onPress={() => answerExplainer(true)}
                style={styles.explainerYes}
                accessibilityRole="button"
              >
                <Text style={styles.explainerYesText}>Turn on reminders</Text>
              </Pressable>
              <Pressable
                onPress={() => answerExplainer(false)}
                style={styles.explainerNo}
                accessibilityRole="button"
              >
                <Text style={styles.explainerNoText}>Not now</Text>
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
              onRestore={(habit) =>
                update((prev) => mapHabit(prev, habit.id, (h) => restoreHabit(h, todayKey)))
              }
              onDeleteForever={(habit) => update((prev) => deleteHabit(prev, habit.id))}
            >
              <SettingsSection
                data={data}
                todayKey={todayKey}
                permission={permission}
                update={update}
                onAllowNotifications={askPermission}
              />
            </StatsScreen>
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
          onReminderEnabled={() => {
            if (permission !== 'granted') askPermission();
          }}
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
  explainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  explainerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  explainerText: { fontSize: 13, color: colors.text, marginTop: 4, lineHeight: 18 },
  explainerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  explainerYes: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  explainerYesText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  explainerNo: { paddingVertical: 9, paddingHorizontal: 10 },
  explainerNoText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  body: { flex: 1 },
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

import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { HabitEditor, type HabitDraft } from './src/HabitEditor';
import { dateKey, toggleCheck, type Habit } from './src/logic';
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

  const openEditor = (habit: Habit | null) => {
    setEditing(habit);
    setEditorOpen(true);
  };

  const saveHabit = (draft: HabitDraft) => {
    update((prev) => ({
      ...prev,
      habits: editing
        ? prev.habits.map((h) => (h.id === editing.id ? { ...h, ...draft } : h))
        : [...prev.habits, { id: newId(), createdAt: todayKey, ...draft }],
    }));
    setEditorOpen(false);
  };

  const deleteHabit = () => {
    if (!editing) return;
    update((prev) => {
      const { [editing.id]: _removed, ...checks } = prev.checks;
      return { ...prev, habits: prev.habits.filter((h) => h.id !== editing.id), checks };
    });
    setEditorOpen(false);
  };

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
              onWeekStart={(weekStart) => update((prev) => ({ ...prev, weekStart }))}
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
          onSave={saveHabit}
          onDelete={deleteHabit}
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

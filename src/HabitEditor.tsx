import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DAY_LETTERS, LIFE_AREAS, type Habit, type HabitReminder, type LifeArea } from './logic';
import { colors, EMOJIS } from './theme';
import { TimeStepper } from './TimeStepper';

export type HabitDraft = {
  name: string;
  emoji: string;
  target: number;
  area: LifeArea | null;
  reminder: HabitReminder | null;
};

/** How a changed target applies: from this week on, or to every week. */
export type TargetMode = 'forward' | 'all';

type Props = {
  visible: boolean;
  habit: Habit | null; // null = creating a new habit
  currentTarget: number; // the habit's target this week (ignored for new habits)
  onSave: (draft: HabitDraft, mode: TargetMode) => void;
  onArchive: () => void;
  onClose: () => void;
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_REMINDER: HabitReminder = { enabled: false, time: '18:00', days: ALL_DAYS };

export function HabitEditor({ visible, habit, currentTarget, onSave, onArchive, onClose }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [target, setTarget] = useState(3);
  const [area, setArea] = useState<LifeArea | null>(null);
  const [reminder, setReminder] = useState<HabitReminder>(DEFAULT_REMINDER);
  const [askTargetMode, setAskTargetMode] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(habit?.name ?? '');
    setEmoji(habit?.emoji || EMOJIS[0]);
    setTarget(habit ? currentTarget : 3);
    setArea(habit?.area ?? null);
    setReminder(habit?.reminder ?? DEFAULT_REMINDER);
    setAskTargetMode(false);
  }, [visible, habit, currentTarget]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && (!reminder.enabled || reminder.days.length > 0);
  const draft: HabitDraft = {
    name: trimmed,
    emoji,
    target,
    area,
    reminder: reminder.enabled || habit?.reminder ? reminder : null,
  };

  const save = () => {
    if (habit && target !== currentTarget) setAskTargetMode(true);
    else onSave(draft, 'forward');
  };

  const toggleDay = (d: number) =>
    setReminder((r) => ({
      ...r,
      days: r.days.includes(d) ? r.days.filter((x) => x !== d) : [...r.days, d].sort(),
    }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{habit ? 'Edit habit' : 'New habit'}</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Go to the gym"
              placeholderTextColor={colors.muted}
              style={styles.input}
              maxLength={40}
              autoFocus={!habit}
              accessibilityLabel="Habit name"
            />

            <Text style={styles.label}>Icon</Text>
            <View style={styles.emojiGrid}>
              {EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setEmoji(e)}
                  style={[styles.emojiCell, e === emoji && styles.emojiCellActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Icon ${e}`}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Times per week</Text>
            <View style={styles.targetRow}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => {
                    setTarget(n);
                    setAskTargetMode(false);
                  }}
                  style={[styles.targetCell, n === target && styles.targetCellActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} times per week`}
                >
                  <Text style={[styles.targetText, n === target && styles.targetTextActive]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Life area (optional)</Text>
            <View style={styles.chipRow}>
              {[{ key: null, label: 'None', emoji: '' }, ...LIFE_AREAS].map((a) => {
                const active = area === a.key;
                return (
                  <Pressable
                    key={a.label}
                    onPress={() => setArea(a.key)}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {a.emoji ? `${a.emoji} ` : ''}
                      {a.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Remind me</Text>
              <Switch
                value={reminder.enabled}
                onValueChange={(enabled) => setReminder((r) => ({ ...r, enabled }))}
                trackColor={{ true: colors.primary }}
                accessibilityLabel="Remind me"
              />
            </View>
            {reminder.enabled && (
              <View style={styles.reminderBox}>
                <TimeStepper
                  value={reminder.time}
                  onChange={(time) => setReminder((r) => ({ ...r, time }))}
                  label="Reminder time"
                />
                <View style={styles.dayRow}>
                  {ALL_DAYS.map((d) => {
                    const on = reminder.days.includes(d);
                    return (
                      <Pressable
                        key={d}
                        onPress={() => toggleDay(d)}
                        style={[styles.dayCell, on && styles.dayCellActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={[styles.dayText, on && styles.dayTextActive]}>
                          {DAY_LETTERS[d]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.hint}>
                  {reminder.days.length === 0
                    ? 'Pick at least one day.'
                    : "No reminder on days you've already ticked, or once the week's target is met."}
                </Text>
              </View>
            )}

            {askTargetMode ? (
              <View style={styles.askBox}>
                <Text style={styles.askTitle}>
                  Change target from {currentTarget} to {target}?
                </Text>
                <Pressable
                  onPress={() => onSave(draft, 'forward')}
                  style={styles.save}
                  accessibilityRole="button"
                >
                  <Text style={styles.saveText}>From this week on</Text>
                </Pressable>
                <Pressable
                  onPress={() => onSave(draft, 'all')}
                  style={styles.secondary}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryText}>All weeks</Text>
                </Pressable>
                <Text style={styles.hint}>
                  Past weeks keep their old target unless you choose All weeks.
                </Text>
              </View>
            ) : (
              <Pressable
                disabled={!canSave}
                onPress={save}
                style={[styles.save, !canSave && styles.saveDisabled]}
                accessibilityRole="button"
              >
                <Text style={styles.saveText}>{habit ? 'Save changes' : 'Add habit'}</Text>
              </Pressable>
            )}

            {habit && (
              <Pressable onPress={onArchive} style={styles.archive} accessibilityRole="button">
                <Text style={styles.archiveText}>Archive habit</Text>
                <Text style={styles.hint}>Hides it and keeps its history. Restore it any time from Progress.</Text>
              </Pressable>
            )}

            <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(21,23,43,0.45)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 14, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiCellActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  emojiText: { fontSize: 22 },
  targetRow: { flexDirection: 'row', gap: 6 },
  targetCell: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  targetCellActive: { backgroundColor: colors.primary },
  targetText: { fontSize: 16, fontWeight: '700', color: colors.text },
  targetTextActive: { color: '#FFFFFF' },
  save: {
    marginTop: 22,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  archive: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  archiveText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  secondary: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
  },
  secondaryText: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  askBox: { marginTop: 22 },
  askTitle: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
  hint: { fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 17, textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bg },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#FFFFFF' },
  switchRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  reminderBox: { marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: colors.bg, gap: 10 },
  dayRow: { flexDirection: 'row', gap: 6 },
  dayCell: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  dayCellActive: { backgroundColor: colors.primary },
  dayText: { fontSize: 14, fontWeight: '700', color: colors.text },
  dayTextActive: { color: '#FFFFFF' },
  cancel: { marginTop: 2, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
});

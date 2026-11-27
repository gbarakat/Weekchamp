import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ALL_DAYS,
  DAY_LETTERS,
  DAY_NAMES,
  LIFE_AREAS,
  type Habit,
  type HabitReminder,
  type LifeArea,
  type TargetMode,
} from './logic';
import { colors, EMOJIS } from './theme';
import { Chip, TimeField, ToggleRow } from './ui';

export type HabitDraft = {
  name: string;
  emoji: string;
  target: number;
  area: LifeArea | null;
  reminder: HabitReminder | null;
};

const DEFAULT_REMINDER: HabitReminder = { enabled: true, time: '18:00', days: ALL_DAYS };

type Props = {
  visible: boolean;
  habit: Habit | null; // null = creating a new habit
  currentTarget: number; // this week's target of the habit being edited
  /** `mode` is set only when an existing habit's target changed. */
  onSave: (draft: HabitDraft, mode: TargetMode | null) => void;
  onArchive: () => void;
  /** Called when a reminder is switched on, so the app can ask for permission. */
  onReminderEnabled: () => void;
  onClose: () => void;
};

export function HabitEditor({
  visible,
  habit,
  currentTarget,
  onSave,
  onArchive,
  onReminderEnabled,
  onClose,
}: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [target, setTarget] = useState(3);
  const [area, setArea] = useState<LifeArea | null>(null);
  const [reminder, setReminder] = useState<HabitReminder | null>(null);
  const [choosingScope, setChoosingScope] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(habit?.name ?? '');
    setEmoji(habit?.emoji || EMOJIS[0]);
    setTarget(habit ? currentTarget : 3);
    setArea(habit?.area ?? null);
    setReminder(habit?.reminder ?? null);
    setChoosingScope(false);
  }, [visible, habit, currentTarget]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0;
  const draft: HabitDraft = { name: trimmed, emoji, target, area, reminder };
  const remindOn = reminder?.enabled ?? false;

  const save = () => {
    if (habit && target !== currentTarget) setChoosingScope(true);
    else onSave(draft, null);
  };

  const toggleReminder = (on: boolean) => {
    setReminder({ ...(reminder ?? DEFAULT_REMINDER), enabled: on });
    if (on) onReminderEnabled();
  };

  const toggleDay = (day: number) => {
    const r = reminder ?? DEFAULT_REMINDER;
    const days = r.days.includes(day) ? r.days.filter((d) => d !== day) : [...r.days, day].sort();
    setReminder({ ...r, days });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          {choosingScope ? (
            <View>
              <Text style={styles.title}>Apply the new target to…</Text>
              <Text style={styles.scopeChange}>
                {currentTarget}× → {target}× per week
              </Text>
              <Pressable
                onPress={() => onSave(draft, 'fromThisWeek')}
                style={styles.save}
                accessibilityRole="button"
              >
                <Text style={styles.saveText}>From this week on</Text>
              </Pressable>
              <Pressable
                onPress={() => onSave(draft, 'allWeeks')}
                style={styles.secondary}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}>All weeks</Text>
              </Pressable>
              <Text style={styles.helper}>
                Past weeks keep their old target unless you choose All weeks.
              </Text>
              <Pressable
                onPress={() => setChoosingScope(false)}
                style={styles.cancel}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Back</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
              <View style={styles.wrap}>
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
                    onPress={() => setTarget(n)}
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
              <View style={styles.wrap}>
                <Chip label="None" active={area === null} onPress={() => setArea(null)} accessibilityLabel="No life area" />
                {LIFE_AREAS.map((a) => (
                  <Chip
                    key={a.id}
                    label={`${a.emoji} ${a.label}`}
                    active={area === a.id}
                    onPress={() => setArea(a.id)}
                    accessibilityLabel={`Life area ${a.label}`}
                  />
                ))}
              </View>

              <View style={styles.reminder}>
                <ToggleRow
                  label="Remind me"
                  hint="Skipped on days you already ticked, and once the week's target is met."
                  value={remindOn}
                  onChange={toggleReminder}
                />
                {remindOn && reminder && (
                  <View>
                    <View style={styles.reminderTime}>
                      <Text style={styles.reminderLabel}>At</Text>
                      <TimeField
                        value={reminder.time}
                        onChange={(time) => setReminder({ ...reminder, time })}
                      />
                    </View>
                    <View style={styles.dayRow}>
                      {ALL_DAYS.map((d) => (
                        <Chip
                          key={d}
                          compact
                          label={DAY_LETTERS[d]}
                          active={reminder.days.includes(d)}
                          onPress={() => toggleDay(d)}
                          accessibilityLabel={`Remind on ${DAY_NAMES[d]}`}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <Pressable
                disabled={!canSave}
                onPress={save}
                style={[styles.save, !canSave && styles.saveDisabled]}
                accessibilityRole="button"
              >
                <Text style={styles.saveText}>{habit ? 'Save changes' : 'Add habit'}</Text>
              </Pressable>

              {habit && (
                <Pressable onPress={onArchive} style={styles.secondary} accessibilityRole="button">
                  <Text style={styles.secondaryText}>Archive habit</Text>
                </Pressable>
              )}
              {habit && (
                <Text style={styles.helper}>
                  Archiving keeps all history. Restore it any time from Progress.
                </Text>
              )}

              <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          )}
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
  scopeChange: { fontSize: 15, color: colors.muted, marginBottom: 4 },
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  reminder: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reminderTime: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  reminderLabel: { fontSize: 14, fontWeight: '700', color: colors.muted, marginRight: 12 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  save: {
    marginTop: 22,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondary: {
    marginTop: 10,
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  helper: { fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 17, textAlign: 'center' },
  cancel: { marginTop: 4, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
});

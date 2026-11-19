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

import type { Habit } from './logic';
import { colors, EMOJIS } from './theme';

export type HabitDraft = { name: string; emoji: string; target: number };

type Props = {
  visible: boolean;
  habit: Habit | null; // null = creating a new habit
  onSave: (draft: HabitDraft) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function HabitEditor({ visible, habit, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [target, setTarget] = useState(3);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(habit?.name ?? '');
    setEmoji(habit?.emoji || EMOJIS[0]);
    setTarget(habit?.target ?? 3);
    setConfirmDelete(false);
  }, [visible, habit]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0;

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

            <Pressable
              disabled={!canSave}
              onPress={() => onSave({ name: trimmed, emoji, target })}
              style={[styles.save, !canSave && styles.saveDisabled]}
              accessibilityRole="button"
            >
              <Text style={styles.saveText}>{habit ? 'Save changes' : 'Add habit'}</Text>
            </Pressable>

            {habit && (
              <Pressable
                onPress={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
                style={styles.delete}
                accessibilityRole="button"
              >
                <Text style={styles.deleteText}>
                  {confirmDelete ? 'Tap again to delete habit and its history' : 'Delete habit'}
                </Text>
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
  delete: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  deleteText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  cancel: { marginTop: 2, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
});

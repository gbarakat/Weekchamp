// Small shared controls.

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, addMonths, parseKey, type Task } from './logic';
import { colors } from './theme';

export function Chip({
  label,
  active,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** A value with − and + buttons. */
export function Stepper({
  label,
  text,
  onStep,
  wide,
}: {
  label: string;
  text: string;
  onStep: (delta: number) => void;
  wide?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onStep(-1)}
        style={styles.stepBtn}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${label} down`}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={[styles.stepValue, wide && styles.stepValueWide]} accessibilityLabel={`${label} ${text}`}>
        {text}
      </Text>
      <Pressable
        onPress={() => onStep(1)}
        style={styles.stepBtn}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${label} up`}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Date picker: day, month and year steppers. `label` prefixes the accessibility labels. */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (date: string) => void;
}) {
  const d = parseKey(value);
  return (
    <View style={styles.dateField}>
      <Stepper label={`${label} day`} text={String(d.getDate())} onStep={(n) => onChange(addDays(value, n))} />
      <Stepper label={`${label} month`} text={MONTHS[d.getMonth()]} onStep={(n) => onChange(addMonths(value, n))} />
      <Stepper label={`${label} year`} text={String(d.getFullYear())} wide onStep={(n) => onChange(addMonths(value, n * 12))} />
    </View>
  );
}

const STATUS_ICON = { open: '', done: '✓', missed: '✕' } as const;

/** One task. Touch = done (or reopen), long touch = missed. */
export function TaskRow({
  task,
  detail,
  onTouch,
  onLongTouch,
  onMore,
}: {
  task: Task;
  detail?: string;
  onTouch: () => void;
  onLongTouch: () => void;
  onMore?: () => void;
}) {
  const { status } = task;
  return (
    <View style={[styles.task, status === 'done' && styles.taskDone, status === 'missed' && styles.taskMissed]}>
      <Pressable
        onPress={onTouch}
        onLongPress={onLongTouch}
        delayLongPress={450}
        style={styles.taskMain}
        accessibilityRole="button"
        accessibilityLabel={`${task.name}, ${status}`}
        accessibilityHint="Touch to mark done. Long touch to mark missed."
      >
        <View style={[styles.mark, status === 'done' && styles.markDone, status === 'missed' && styles.markMissed]}>
          <Text style={styles.markText}>{STATUS_ICON[status]}</Text>
        </View>
        <View style={styles.taskText}>
          <Text style={[styles.taskName, status !== 'open' && styles.taskNameClosed]} numberOfLines={2}>
            {task.name}
          </Text>
          {(detail || status === 'missed') && (
            <Text style={styles.taskDetail} numberOfLines={1}>
              {[status === 'missed' ? 'Missed' : null, detail].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
      </Pressable>
      {onMore && (
        <Pressable
          onPress={onMore}
          style={styles.more}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Edit task ${task.name}`}
        >
          <Text style={styles.moreText}>⋯</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }, color ? { backgroundColor: color } : null]} />
    </View>
  );
}

export type DialogButton = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'danger' | 'plain';
  disabled?: boolean;
};

/** In-app dialog, so it looks and behaves the same everywhere. */
export function Dialog({
  visible,
  title,
  message,
  buttons,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  message?: string;
  buttons: DialogButton[];
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.dialogBackdrop} behavior="padding">
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{title}</Text>
          {message ? <Text style={styles.dialogMessage}>{message}</Text> : null}
          {children}
          {buttons.map((b) => (
            <Pressable
              key={b.label}
              onPress={b.onPress}
              disabled={b.disabled}
              style={[
                styles.dialogBtn,
                b.kind === 'primary' && styles.dialogBtnPrimary,
                b.disabled && styles.disabled,
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.dialogBtnText,
                  b.kind === 'primary' && styles.dialogBtnTextOn,
                  b.kind === 'danger' && styles.dialogBtnTextDanger,
                ]}
              >
                {b.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Shared text styles for screens. */
export const shared = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 96 },
  section: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 22, marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  caption: { fontSize: 12, color: colors.muted, marginTop: 6, lineHeight: 17 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 14, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addInput: { flex: 1 },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  back: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, alignSelf: 'flex-start' },
  backText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 12 },
  pageTitle: { flex: 1, fontSize: 22, fontWeight: '900', color: colors.text },
  editBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 8,
  },
  editBtnText: { fontSize: 14, fontWeight: '700', color: colors.text },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
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

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.primary, fontWeight: '800' },

  dateField: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 3,
  },
  stepBtn: {
    width: 32,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 20, lineHeight: 22, fontWeight: '700', color: colors.primary },
  stepValue: { width: 38, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.text },
  stepValueWide: { width: 48 },

  task: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  taskDone: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  taskMissed: { backgroundColor: colors.missedSoft, borderColor: colors.missedSoft },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  markDone: { backgroundColor: colors.success, borderColor: colors.success },
  markMissed: { backgroundColor: colors.missed, borderColor: colors.missed },
  markText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  taskText: { flex: 1 },
  taskName: { fontSize: 15, fontWeight: '600', color: colors.text },
  taskNameClosed: { color: colors.muted },
  taskDetail: { fontSize: 12, color: colors.muted, marginTop: 2 },
  more: { paddingHorizontal: 14, paddingVertical: 12 },
  moreText: { fontSize: 20, fontWeight: '800', color: colors.muted },

  track: { height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },

  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(21,23,43,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: { backgroundColor: colors.card, borderRadius: 20, padding: 20 },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  dialogMessage: { fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 20 },
  dialogBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  dialogBtnPrimary: { backgroundColor: colors.primary },
  dialogBtnText: { fontSize: 15, fontWeight: '700', color: colors.text },
  dialogBtnTextOn: { color: '#FFFFFF', fontWeight: '800' },
  dialogBtnTextDanger: { color: colors.danger },
  disabled: { opacity: 0.4 },
});

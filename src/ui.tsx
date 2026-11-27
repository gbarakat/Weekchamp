// Small shared controls.

import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { formatTime, parseTime } from './logic';
import { colors } from './theme';

export function Chip({
  label,
  active,
  onPress,
  accessibilityLabel,
  compact,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, compact && styles.chipCompact, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
      />
    </View>
  );
}

function Stepper({
  label,
  text,
  onStep,
}: {
  label: string;
  text: string;
  onStep: (delta: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onStep(-1)}
        style={styles.stepBtn}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${label} earlier`}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue} accessibilityLabel={`${label} ${text}`}>
        {text}
      </Text>
      <Pressable
        onPress={() => onStep(1)}
        style={styles.stepBtn}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${label} later`}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

const MINUTE_STEP = 5;

/** Time picker: hour and minute steppers (24-hour, 5-minute steps). */
export function TimeField({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const { hour, minute } = parseTime(value);
  const [hh, mm] = value.split(':');
  return (
    <View style={styles.timeField}>
      <Stepper label="Hour" text={hh} onStep={(d) => onChange(formatTime(hour + d, minute))} />
      <Text style={styles.timeColon}>:</Text>
      <Stepper
        label="Minute"
        text={mm}
        onStep={(d) =>
          onChange(formatTime(hour, Math.round(minute / MINUTE_STEP) * MINUTE_STEP + d * MINUTE_STEP))
        }
      />
    </View>
  );
}

export type DialogButton = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'danger' | 'plain';
};

/** In-app dialog. Used instead of Alert so it looks and behaves the same everywhere. */
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
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialog} accessibilityRole="alert">
          <Text style={styles.dialogTitle}>{title}</Text>
          {message ? <Text style={styles.dialogMessage}>{message}</Text> : null}
          {children}
          {buttons.map((b) => (
            <Pressable
              key={b.label}
              onPress={b.onPress}
              style={[
                styles.dialogBtn,
                b.kind === 'primary' && styles.dialogBtnPrimary,
                b.kind === 'danger' && styles.dialogBtnDanger,
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.dialogBtnText,
                  (b.kind === 'primary' || b.kind === 'danger') && styles.dialogBtnTextOn,
                ]}
              >
                {b.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipCompact: { paddingHorizontal: 0, width: 38, alignItems: 'center' },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.primary, fontWeight: '800' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  toggleText: { flex: 1, paddingRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  toggleHint: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },

  timeField: { flexDirection: 'row', alignItems: 'center' },
  timeColon: { fontSize: 18, fontWeight: '800', color: colors.text, marginHorizontal: 6 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 3,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 20, lineHeight: 22, fontWeight: '700', color: colors.primary },
  stepValue: {
    width: 36,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

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
  dialogBtnDanger: { backgroundColor: colors.danger },
  dialogBtnText: { fontSize: 15, fontWeight: '700', color: colors.text },
  dialogBtnTextOn: { color: '#FFFFFF', fontWeight: '800' },
});

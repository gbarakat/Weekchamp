import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

const pad = (n: number) => String(n).padStart(2, '0');

/** Shift an "HH:MM" time by `minutes`, wrapping around midnight. */
export function shiftTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

type Props = { value: string; onChange: (time: string) => void; label?: string };

/** Simple time picker: hour and 15-minute steppers. No native picker needed. */
export function TimeStepper({ value, onChange, label = 'Time' }: Props) {
  const step = (minutes: number, what: string) => (
    <Pressable
      onPress={() => onChange(shiftTime(value, minutes))}
      style={styles.btn}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={what}
    >
      <Text style={styles.btnText}>{minutes > 0 ? '+' : '−'}</Text>
    </Pressable>
  );
  return (
    <View style={styles.row} accessibilityLabel={`${label} ${value}`}>
      <View style={styles.group}>
        {step(-60, 'One hour earlier')}
        <Text style={styles.unit}>h</Text>
        {step(60, 'One hour later')}
      </View>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.group}>
        {step(-15, '15 minutes earlier')}
        <Text style={styles.unit}>min</Text>
        {step(15, '15 minutes later')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  group: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  unit: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  value: { fontSize: 24, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DAY_LETTERS, parseKey, type Habit } from './logic';
import { colors } from './theme';

type Props = {
  habit: Habit;
  days: string[]; // the 7 day keys of the shown week
  checked: string[];
  target: number; // this week's target
  scored: boolean; // false when the week does not count (restored from the archive this week)
  todayKey: string;
  streak: number;
  onToggle: (day: string) => void;
  onEdit: () => void;
};

export function HabitCard({
  habit,
  days,
  checked,
  target,
  scored,
  todayKey,
  streak,
  onToggle,
  onEdit,
}: Props) {
  const count = days.filter((d) => checked.includes(d)).length;
  const done = count >= target;

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <Pressable
        style={styles.header}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${habit.name}`}
      >
        <Text style={styles.emoji}>{habit.emoji || '⭐'}</Text>
        <View style={styles.titleWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.sub}>
            {target}× per week
            {!scored ? '  ·  not scored this week' : streak > 0 ? `  ·  🔥 ${streak}-week streak` : ''}
          </Text>
        </View>
        <View style={[styles.pill, done && styles.pillDone]}>
          <Text style={[styles.pillText, done && styles.pillTextDone]}>
            {done ? '✓ ' : ''}
            {count}/{target}
          </Text>
        </View>
      </Pressable>

      <View style={styles.days}>
        {days.map((day) => {
          const isChecked = checked.includes(day);
          const isFuture = day > todayKey;
          const isToday = day === todayKey;
          return (
            <Pressable
              key={day}
              disabled={isFuture}
              onPress={() => onToggle(day)}
              hitSlop={4}
              style={styles.dayCol}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked, disabled: isFuture }}
              accessibilityLabel={`${habit.name} ${day}`}
            >
              <Text style={[styles.dayLetter, isToday && styles.dayLetterToday]}>
                {DAY_LETTERS[parseKey(day).getDay()]}
              </Text>
              <View
                style={[
                  styles.dot,
                  isToday && styles.dotToday,
                  isChecked && styles.dotChecked,
                  isFuture && styles.dotFuture,
                ]}
              >
                <Text style={[styles.dotText, isChecked && styles.dotTextChecked]}>
                  {isChecked ? '✓' : parseKey(day).getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDone: { borderColor: colors.success },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  emoji: { fontSize: 28, marginRight: 10 },
  titleWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  pillDone: { backgroundColor: colors.successSoft },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  pillTextDone: { color: colors.success },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', flex: 1 },
  dayLetter: { fontSize: 11, color: colors.muted, marginBottom: 4, fontWeight: '600' },
  dayLetterToday: { color: colors.primary },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  dotToday: { borderColor: colors.primary },
  dotChecked: { backgroundColor: colors.success, borderColor: colors.success },
  dotFuture: { opacity: 0.4 },
  dotText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  dotTextChecked: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});

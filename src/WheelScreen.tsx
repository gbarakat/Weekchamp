import { ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { LIFE_AREAS, lifeWheel, type AppData, type LifeArea } from './logic';
import { colors } from './theme';
import { shared } from './ui';

const R = 130; // wheel radius
const MIN = 0.12; // a slice with at least one done task is never invisible

// Where each quarter sits around the centre, and which corner is rounded.
const QUARTER: Record<LifeArea, (r: number) => ViewStyle> = {
  spiritual: (r) => ({ right: R, bottom: R, borderTopLeftRadius: r }),
  physical: (r) => ({ left: R, bottom: R, borderTopRightRadius: r }),
  mental: (r) => ({ left: R, top: R, borderBottomRightRadius: r }),
  emotional: (r) => ({ right: R, top: R, borderBottomLeftRadius: r }),
};

export function WheelScreen({ data }: { data: AppData }) {
  const slices = lifeWheel(data);
  const peak = Math.max(...slices.map((s) => s.done), 1);

  return (
    <ScrollView contentContainerStyle={shared.screen}>
      <View style={shared.card}>
        <View style={styles.wheelWrap}>
          <View style={styles.wheel} accessibilityLabel="Life wheel">
            {[1, 2 / 3, 1 / 3].map((f) => (
              <View
                key={f}
                style={[
                  styles.ring,
                  { width: 2 * R * f, height: 2 * R * f, borderRadius: R * f, left: R - R * f, top: R - R * f },
                ]}
              />
            ))}
            {slices.map((s) => {
              const area = LIFE_AREAS.find((a) => a.id === s.area)!;
              const r = s.done === 0 ? 0 : R * (MIN + (1 - MIN) * (s.done / peak));
              return (
                <View
                  key={s.area}
                  style={[
                    styles.quarter,
                    { width: r, height: r, backgroundColor: area.color },
                    QUARTER[s.area](r),
                  ]}
                />
              );
            })}
            <View style={styles.axisH} />
            <View style={styles.axisV} />
          </View>
        </View>
        <Text style={shared.caption}>
          Each quarter grows with the tasks you have done in that life area. The fullest area
          reaches the outer ring.
        </Text>
      </View>

      <View style={shared.card}>
        {slices.map((s, i) => {
          const area = LIFE_AREAS.find((a) => a.id === s.area)!;
          return (
            <View
              key={s.area}
              style={[styles.row, i > 0 && styles.rowBorder]}
              accessibilityLabel={`${area.label}: ${s.done} of ${s.total} tasks done`}
            >
              <View style={[styles.dot, { backgroundColor: area.color }]} />
              <Text style={styles.rowName}>
                {area.emoji} {area.label}
              </Text>
              <Text style={s.total === 0 ? styles.rowMuted : styles.rowValue}>
                {s.total === 0 ? 'No tasks yet' : `${s.done} done of ${s.total}`}
              </Text>
            </View>
          );
        })}
        <Text style={shared.caption}>
          A project's life area is set on the project (Edit). Projects with no life area are not on
          the wheel.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wheelWrap: { alignItems: 'center', paddingVertical: 8 },
  wheel: { width: 2 * R, height: 2 * R },
  ring: { position: 'absolute', borderWidth: 1, borderColor: colors.border },
  quarter: { position: 'absolute' },
  axisH: { position: 'absolute', left: 0, right: 0, top: R, height: 1, backgroundColor: colors.border },
  axisV: { position: 'absolute', top: 0, bottom: 0, left: R, width: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowMuted: { fontSize: 14, color: colors.muted },
});

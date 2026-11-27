import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  assess,
  longDate,
  shortDate,
  type AppData,
  type Band,
  type Settings,
  type WeekStart,
} from './logic';
import { colors } from './theme';
import { Chip, ProgressBar, shared, Stepper } from './ui';

const BAND_LABEL: Record<Band, string> = {
  success: 'Success',
  middle: 'In between',
  failure: 'Below your failure line',
  none: 'Nothing marked',
};
const BAND_COLOR: Record<Band, string> = {
  success: colors.success,
  middle: colors.gold,
  failure: colors.missed,
  none: colors.border,
};

const WEEK_START_OPTIONS: { value: WeekStart; label: string }[] = [
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
];

const STEP = 5;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

type Props = {
  data: AppData;
  todayKey: string;
  onSettings: (patch: Partial<Settings>) => void;
};

export function CapacityScreen({ data, todayKey, onSettings }: Props) {
  const { settings } = data;
  const a = assess(data, todayKey);

  return (
    <ScrollView contentContainerStyle={shared.screen}>
      {!a.ready ? (
        <View style={shared.card}>
          <Text style={shared.cardTitle}>Not enough data yet</Text>
          <Text style={[shared.body, styles.gap]}>
            Your first assessment will be ready on {longDate(a.firstOn)}.
          </Text>
          <Text style={shared.caption}>
            The app needs {settings.assessWeeks} full weeks of done and missed marks before it can
            tell you your real capacity.
          </Text>
        </View>
      ) : (
        <>
          <View style={[shared.card, styles.result]}>
            <Text style={styles.period}>
              Assessment · {shortDate(a.from)} – {longDate(a.to)}
            </Text>
            <Text style={styles.capability}>{a.capability}</Text>
            <Text style={[shared.body, styles.gap]}>{a.advice}</Text>
            <Text style={shared.caption}>
              Tasks done per week: {a.weeks.map((w) => w.done).join(', ')}. Next assessment on{' '}
              {longDate(a.nextOn)}.
            </Text>
          </View>

          <Text style={shared.section}>Project by project</Text>
          <View style={shared.card}>
            {a.streams.length === 0 ? (
              <Text style={shared.caption}>No project was running in this period.</Text>
            ) : (
              a.streams.map((s, i) => (
                <View
                  key={s.project.id}
                  style={[styles.stream, i > 0 && styles.streamBorder]}
                  accessibilityLabel={`${s.project.name}: ${s.pct === null ? 'nothing marked' : `${s.pct}%`}, ${BAND_LABEL[s.band]}`}
                >
                  <View style={styles.streamHead}>
                    <Text style={styles.streamName} numberOfLines={1}>
                      {s.project.name}
                    </Text>
                    <Text style={styles.streamPct}>{s.pct === null ? '–' : `${s.pct}%`}</Text>
                  </View>
                  <ProgressBar value={s.pct ?? 0} color={BAND_COLOR[s.band]} />
                  <Text style={shared.caption}>
                    {BAND_LABEL[s.band]}
                    {s.pct === null ? '' : ` · ${s.done} done, ${s.missed} missed`}
                  </Text>
                </View>
              ))
            )}
            <Text style={shared.caption}>
              Score = tasks done ÷ (done + missed) in the period. Open tasks are not counted.
            </Text>
          </View>
        </>
      )}

      <Text style={shared.section}>Your rules</Text>
      <View style={shared.card}>
        <Text style={styles.ruleLabel}>Assess every</Text>
        <View style={shared.wrap}>
          {([2, 3] as const).map((n) => (
            <Chip
              key={n}
              label={`${n} weeks`}
              active={settings.assessWeeks === n}
              onPress={() => onSettings({ assessWeeks: n })}
              accessibilityLabel={`Assess every ${n} weeks`}
            />
          ))}
        </View>

        <View style={styles.ruleRow}>
          <Text style={styles.ruleText}>Success at or above</Text>
          <Stepper
            label="Success threshold"
            text={`${settings.successPct}%`}
            wide
            onStep={(d) =>
              onSettings({ successPct: clamp(settings.successPct + d * STEP, settings.failPct, 100) })
            }
          />
        </View>
        <View style={styles.ruleRow}>
          <Text style={styles.ruleText}>Failure below</Text>
          <Stepper
            label="Failure threshold"
            text={`${settings.failPct}%`}
            wide
            onStep={(d) =>
              onSettings({ failPct: clamp(settings.failPct + d * STEP, 0, settings.successPct) })
            }
          />
        </View>

        <Text style={[styles.ruleLabel, styles.gapLarge]}>Week starts on</Text>
        <View style={styles.segment}>
          {WEEK_START_OPTIONS.map((o) => {
            const active = settings.weekStart === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => onSettings({ weekStart: o.value })}
                style={[styles.segmentCell, active && styles.segmentCellActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={shared.caption}>
          Changing these re-reads your existing marks, so the assessment can shift.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: 8 },
  gapLarge: { marginTop: 18 },
  result: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  period: { fontSize: 12, fontWeight: '700', color: colors.muted },
  capability: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 6, lineHeight: 26 },
  stream: { paddingVertical: 10 },
  streamBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  streamHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  streamName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  streamPct: { fontSize: 15, fontWeight: '800', color: colors.text, marginLeft: 8 },
  ruleLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 8 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  ruleText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 12, padding: 4 },
  segmentCell: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentCellActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: '700', color: colors.text },
  segmentTextActive: { color: '#FFFFFF' },
});

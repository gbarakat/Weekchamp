import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { pickBackupText, shareBackupFile } from './backupFiles';
import {
  backupFileName,
  dateKey,
  longDate,
  makeBackup,
  parseBackup,
  type AppData,
  type Settings,
  type WeekStart,
} from './logic';
import type { PermissionState } from './notifications';
import { colors } from './theme';
import { Dialog, TimeField, ToggleRow } from './ui';

const WEEK_START_OPTIONS: { value: WeekStart; label: string }[] = [
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
];

type Props = {
  data: AppData;
  todayKey: string;
  permission: PermissionState;
  update: (fn: (prev: AppData) => AppData) => void;
  /** Ask for the notification permission (or open system settings if it can't be asked). */
  onAllowNotifications: () => void;
};

type Pending = { data: AppData; exportedAt: string | null };

export function SettingsSection({ data, todayKey, permission, update, onAllowNotifications }: Props) {
  const { settings } = data;
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  // Short-lived status line under the backup buttons.
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(t);
  }, [note]);

  const setSettings = (patch: Partial<Settings>) =>
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));

  const anyReminderOn =
    settings.dailyReminder.enabled ||
    settings.backupReminder.enabled ||
    data.habits.some((h) => h.reminder?.enabled);
  const showPermissionNotice =
    anyReminderOn && (permission === 'denied' || permission === 'undetermined');

  const exportBackup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const file = makeBackup(data, new Date().toISOString());
      await shareBackupFile(backupFileName(todayKey), JSON.stringify(file, null, 2));
      setSettings({ lastBackupAt: todayKey });
      setNote('Backup saved');
    } catch {
      setNote("Couldn't create the backup. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const text = await pickBackupText();
      if (text === null) return; // cancelled
      const parsed = parseBackup(text);
      if (!parsed.ok) setNote("This file isn't a Weekchamp backup.");
      else setPending({ data: parsed.data, exportedAt: parsed.exportedAt });
    } catch {
      setNote("This file isn't a Weekchamp backup.");
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    const imported = pending.data;
    // The file being restored is itself a backup, taken on its export day.
    const exportedDay = pending.exportedAt ? dateKey(new Date(pending.exportedAt)) : null;
    const lastBackupAt =
      [imported.settings.lastBackupAt, exportedDay].filter((d): d is string => !!d).sort().pop() ??
      null;
    update((prev) => ({
      ...imported,
      settings: {
        ...imported.settings,
        lastBackupAt,
        // These describe this phone, not the backup.
        firstLaunchAt: prev.settings.firstLaunchAt,
        notificationsAsked: prev.settings.notificationsAsked,
      },
    }));
    setPending(null);
    setNote('Backup restored');
  };

  const pendingDate = pending?.exportedAt ? longDate(dateKey(new Date(pending.exportedAt))) : null;

  return (
    <View>
      <Text style={styles.section}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Week starts on</Text>
        <View style={styles.segment}>
          {WEEK_START_OPTIONS.map((o) => {
            const active = settings.weekStart === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => setSettings({ weekStart: o.value })}
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
        <Text style={styles.caption}>
          Changing this regroups your existing check-ins, so past scores can shift.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reminders</Text>
        {permission === 'unsupported' && (
          <Text style={styles.captionTop}>Reminders work in the Android app.</Text>
        )}
        {showPermissionNotice && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Notifications are off for Weekchamp on this phone, so reminders can't appear yet.
            </Text>
            <Pressable
              onPress={onAllowNotifications}
              style={styles.noticeBtn}
              accessibilityRole="button"
            >
              <Text style={styles.noticeBtnText}>Allow notifications</Text>
            </Pressable>
          </View>
        )}
        <ToggleRow
          label="Daily plan reminder"
          hint="What's left this week. Skipped once every target is met."
          value={settings.dailyReminder.enabled}
          onChange={(enabled) => {
            setSettings({ dailyReminder: { ...settings.dailyReminder, enabled } });
            if (enabled && permission !== 'granted') onAllowNotifications();
          }}
        />
        {settings.dailyReminder.enabled && (
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>At</Text>
            <TimeField
              value={settings.dailyReminder.time}
              onChange={(time) => setSettings({ dailyReminder: { ...settings.dailyReminder, time } })}
            />
          </View>
        )}
        <View style={styles.divider} />
        <ToggleRow
          label="Monthly backup reminder"
          hint="A nudge 30 days after your last backup."
          value={settings.backupReminder.enabled}
          onChange={(enabled) => {
            setSettings({ backupReminder: { enabled } });
            if (enabled && permission !== 'granted') onAllowNotifications();
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backup</Text>
        <Text style={styles.captionTop}>
          Your habits live only on this phone. A backup file lets you bring them back.
        </Text>
        <View style={styles.backupRow}>
          <Pressable
            onPress={exportBackup}
            style={[styles.primaryBtn, busy && styles.btnBusy]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>Export backup</Text>
          </Pressable>
          <Pressable
            onPress={importBackup}
            style={[styles.plainBtn, busy && styles.btnBusy]}
            accessibilityRole="button"
          >
            <Text style={styles.plainBtnText}>Import backup</Text>
          </Pressable>
        </View>
        <Text style={styles.caption}>
          {settings.lastBackupAt ? `Last backup: ${longDate(settings.lastBackupAt)}` : 'No backup yet'}
        </Text>
        {note && (
          <Text style={styles.note} accessibilityLiveRegion="polite">
            {note}
          </Text>
        )}
      </View>

      <Dialog
        visible={pending !== null}
        title="Replace current data?"
        message={`Replace all current habits and history with this backup${
          pendingDate ? ` from ${pendingDate}` : ''
        }? Your current data will be overwritten.`}
        onClose={() => setPending(null)}
        buttons={[
          { label: 'Replace', kind: 'primary', onPress: confirmImport },
          { label: 'Cancel', onPress: () => setPending(null) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 22, marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8 },
  caption: { fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 17 },
  captionTop: { fontSize: 12, color: colors.muted, marginBottom: 10, lineHeight: 17 },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 12, padding: 4 },
  segmentCell: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentCellActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: '700', color: colors.text },
  segmentTextActive: { color: '#FFFFFF' },
  notice: { backgroundColor: colors.goldSoft, borderRadius: 12, padding: 12, marginBottom: 8 },
  noticeText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  noticeBtn: { marginTop: 8, alignSelf: 'flex-start' },
  noticeBtnText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 6 },
  timeLabel: { fontSize: 14, fontWeight: '700', color: colors.muted, marginRight: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  backupRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  plainBtn: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  plainBtnText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  btnBusy: { opacity: 0.5 },
  note: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 8 },
});

# Weekchamp

Weekly habit tracker for Android, built with Expo (React Native + TypeScript).

## Features

- **Weekly targets.** Set how many times a week (1–7) you want to do each habit, and tick off the days.
- **Week score and champion weeks.** The score is the average of each habit's progress toward its target. Hit every target to become the week champion.
- **History stays true.** Change a target "from this week on" and past weeks keep their old target, or choose "all weeks" to re-score them.
- **Archive, don't delete.** Archived habits keep all their history and can be restored any time from Progress. Archived weeks never lower a score or break a streak.
- **Backup.** Export everything to a file, import it back, and get a nudge 30 days after the last backup.
- **Gentle reminders.** One daily note with what's left this week, plus optional per-habit reminders. Both are skipped when there is nothing left to do.
- **Life areas.** Tag habits as Spiritual, Physical, Mental or Emotional and see where the week's effort goes.
- **Private.** All data stays on the phone. No account, no server, no analytics.

## Install

1. Open the [latest release](https://github.com/gbarakat/Weekchamp/releases/latest) on your phone.
2. Download `weekchamp-v<version>.apk` and open it.
3. Allow "install unknown apps" when Android asks.

Until a release is published, the APK is in the **Artifacts** of the latest green run under [Actions](https://github.com/gbarakat/Weekchamp/actions/workflows/android-apk.yml).

### Upgrading from v1

Install v2 **over** v1. Do not uninstall v1 first.

v1 has no export, so uninstalling it deletes your habits for good. Installing v2 on top keeps them: your data is migrated on first launch, and the v1 copy is left in place as a safety net. Both versions are signed with the same key, and every build checks that. After upgrading, use **Progress → Backup → Export backup** to make your first backup.

The APK is signed with a debug key: fine for installing directly, not for the Play Store.

## Develop

```bash
npm install
npx expo start        # scan the QR code with Expo Go on Android
```

Test reminders in a real build (the APK). They have not been checked in Expo Go.

```bash
npm run typecheck
npm test
```

## Release

1. Set the version in `app.json` (`version`, `android.versionCode`) and `package.json`.
2. Merge, then push a matching tag:

   ```bash
   git tag v2.0.0 && git push origin v2.0.0
   ```

The workflow builds the APK and attaches it to a GitHub Release as `weekchamp-v2.0.0.apk`.

## Layout

| Path | Purpose |
| --- | --- |
| `App.tsx` | Shell, tabs, habit create/edit/archive |
| `src/logic.ts` | Dates, targets, scores, streaks, archive, migration, backup format (pure, unit-tested) |
| `src/notify.ts` | Which reminders to schedule (pure, unit-tested) |
| `src/notifications.ts` | Expo notifications wrapper |
| `src/backupFiles.ts` | Share-sheet export and file-picker import |
| `src/useAppData.ts` | Load, migrate and save to device storage |
| `src/WeekScreen.tsx` | Week view with day check-offs |
| `src/StatsScreen.tsx` | Progress tab: history, streaks, balance, archive |
| `src/SettingsSection.tsx` | Week start, reminders, backup |
| `src/HabitEditor.tsx` | Add/edit sheet |

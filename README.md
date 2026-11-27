# Weekchamp

Weekly habit tracker for Android, built with Expo (React Native + TypeScript).

- Set a weekly target per habit (1–7 times).
- Tick off the days you did it.
- Week score = average of each habit's progress toward its target.
- Hit every target to become the week champion.
- Change a target from this week on (past weeks keep theirs) or for all weeks.
- Archive habits instead of deleting them; restore any time with full history.
- Daily "plan your day" reminder and optional per-habit reminders, skipped when you're already done.
- Export / import a backup file, with a monthly backup reminder.
- Tag habits with a life area (spiritual, physical, mental, emotional) and see the balance.
- Data stays on the device (AsyncStorage). No account, no network.

## Install

Open the [latest release](https://github.com/gbarakat/Weekchamp/releases/latest) on your Android phone, download the `.apk` and open it. Updating from an earlier version keeps your habits.

## Run

```bash
npm install
npx expo start        # scan the QR code with Expo Go on Android
```

## Build an APK

Every push builds an APK in GitHub Actions (artifact `weekchamp-v<version>-apk`). Pushing a tag such as `v2.0.0` also publishes it on a GitHub Release.

Or with EAS:

```bash
npx eas-cli@latest build -p android --profile preview
```

Needs a free Expo account. The `preview` profile in `eas.json` produces an installable APK.

## Check

```bash
npm run typecheck
npm test
```

## Layout

| Path | Purpose |
| --- | --- |
| `App.tsx` | Shell, tabs, habit create/edit/delete |
| `src/logic.ts` | Dates, scores, streaks (pure, unit-tested) |
| `src/useAppData.ts` | Load/save to device storage (migrates release 1 data) |
| `src/WeekScreen.tsx` | Week view with day check-offs |
| `src/StatsScreen.tsx` | Progress: history, streaks, balance, archived habits, settings |
| `src/HabitEditor.tsx` | Add/edit sheet: target, life area, reminder, archive |
| `src/reminders.ts` | Which notifications to schedule (pure, unit-tested) |
| `src/notifications.ts` | Schedules them with expo-notifications |
| `src/backup.ts` / `src/backupIO.ts` | Backup file format / export and import |
| `src/TimeStepper.tsx` | Simple time picker |

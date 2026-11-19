# Weekchamp

Weekly habit tracker for Android, built with Expo (React Native + TypeScript).

- Set a weekly target per habit (1–7 times).
- Tick off the days you did it.
- Week score = average of each habit's progress toward its target.
- Hit every target to become the week champion.
- Data stays on the device (AsyncStorage). No account, no network.

## Run

```bash
npm install
npx expo start        # scan the QR code with Expo Go on Android
```

## Build an APK

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
| `src/useAppData.ts` | Load/save to device storage |
| `src/WeekScreen.tsx` | Week view with day check-offs |
| `src/StatsScreen.tsx` | 8-week history, streaks, week-start setting |
| `src/HabitEditor.tsx` | Add/edit sheet |

# Weekchamp

A goal, project and task tracker for Android, built with Expo (React Native + TypeScript).

```
Ultimate goal  ->  Project  ->  Task
```

## Features

- **One touch, long touch.** Touch a task to mark it done. Long touch to mark it missed. Touch a done or missed task to reopen it.
- **Project page.** Press a project to open its page: tasks done, missed and open, completion, tasks done per week, and days left. Add tasks there.
- **Project dates.** Every project has a start date and either an end date or no end date.
- **Capacity assessment.** Every 2 or 3 weeks the app scores each project (done ÷ (done + missed)), sorts them by your own success and failure thresholds, tells you the most tasks you finished in a week, and suggests how many projects you can manage.
- **Life wheel.** A wheel of four life areas (Spiritual, Physical, Mental, Emotional), sized by the tasks you have done in each. A project's life area is set on the project.
- **Ultimate goals.** Define goals, give a project a goal, and optionally link a single task to a different goal.
- **Private.** All data stays on the phone. No account, no server, no analytics.

## Install

Download the APK from the [latest release](https://github.com/gbarakat/Weekchamp/releases/latest), open it on your phone, and allow "install unknown apps" when Android asks.

Version 3 installs over versions 1 and 2 (same signing key; every build checks that). It starts empty: data saved by earlier versions is left on the phone but is not used.

The APK is signed with a debug key: fine for installing directly, not for the Play Store.

There is no backup or export. Uninstalling the app, or losing the phone, loses the data.

## Develop

```bash
npm install
npx expo start        # scan the QR code with Expo Go on Android
npm run typecheck
npm test
```

## Release

Set the version in `app.json` (`version`, `android.versionCode`) and `package.json`, then push to the default branch. When the build is green, the workflow publishes `weekchamp-v<version>.apk` on a GitHub Release. A version that already has a release is not published again.

## Layout

| Path | Purpose |
| --- | --- |
| `App.tsx` | Shell, tabs, page navigation, edit dialogs |
| `src/logic.ts` | Data shapes, dates, project statistics, goals, life wheel, capacity assessment (pure, unit-tested) |
| `src/useAppData.ts` | Load and save to device storage |
| `src/ProjectsScreen.tsx` | Project list |
| `src/ProjectPage.tsx` | One project: statistics and tasks |
| `src/ProjectEditor.tsx` | Add/edit a project |
| `src/GoalsScreen.tsx` | Goal list and goal page |
| `src/WheelScreen.tsx` | Life wheel |
| `src/CapacityScreen.tsx` | Assessment and its rules |
| `src/ui.tsx` | Shared controls |

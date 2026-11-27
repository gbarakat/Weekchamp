// Thin wrapper around expo-notifications. What to schedule is decided in reminders.ts.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AppData } from './logic';
import { planNotifications } from './reminders';

const CHANNEL_ID = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function notificationsAllowed(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}

/** Ask for permission (Android 13+ shows the system prompt). Returns whether it was granted. */
export async function requestNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

let queue: Promise<void> = Promise.resolve();

/** Cancel everything and schedule the next few days again. Calls run one after another. */
export function syncNotifications(data: AppData): Promise<void> {
  queue = queue
    .then(async () => {
      if (!(await notificationsAllowed())) return;
      await ensureChannel();
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const n of planNotifications(data, new Date())) {
        await Notifications.scheduleNotificationAsync({
          identifier: n.id,
          content: { title: n.title, body: n.body, data: { kind: n.kind } },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: n.at,
            channelId: CHANNEL_ID,
          },
        });
      }
    })
    .catch(() => {
      // Reminders are best effort; never crash the app over them.
    });
  return queue;
}

export const useLastNotificationResponse = Notifications.useLastNotificationResponse;

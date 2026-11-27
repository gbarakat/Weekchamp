// Thin wrapper around expo-notifications. What to schedule is decided in notify.ts.

import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { AppData } from './logic';
import { planNotifications } from './notify';

// 'unknown' = not checked yet; 'unsupported' = this platform has no local notifications (web).
export type PermissionState = 'unknown' | 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const notificationsSupported = Platform.OS !== 'web';
const CHANNEL = 'reminders';

if (notificationsSupported) {
  // Show reminders even when the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function getPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? 'granted' : p.status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/**
 * Asks for the notification permission. If the system will not show the prompt again,
 * opens the app's system settings instead.
 */
export async function requestPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  try {
    // Android 13+ only shows the prompt once a channel exists.
    await ensureChannel();
    const before = await Notifications.getPermissionsAsync();
    if (before.granted) return 'granted';
    if (!before.canAskAgain) {
      await Linking.openSettings();
      return 'denied';
    }
    const after = await Notifications.requestPermissionsAsync();
    return after.granted ? 'granted' : after.status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

async function reschedule(data: AppData): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await getPermission()) !== 'granted') return;
  await ensureChannel();
  for (const n of planNotifications(data, new Date())) {
    await Notifications.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: { tab: n.tab } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: n.date,
        channelId: CHANNEL,
      },
    });
  }
}

let queue: Promise<void> = Promise.resolve();

/** Replace every scheduled notification with the current plan. Calls run one at a time. */
export function syncNotifications(data: AppData): Promise<void> {
  if (!notificationsSupported) return Promise.resolve();
  queue = queue.then(() => reschedule(data)).catch(() => {
    // Scheduling is best effort; the next data change or app open retries.
  });
  return queue;
}

type Opened = { id: string; tab: 'week' | 'stats' } | null;

function useOpenedNative(): Opened {
  const response = Notifications.useLastNotificationResponse();
  if (!response) return null;
  const tab = response.notification.request.content.data?.tab;
  return {
    id: `${response.notification.request.identifier}:${response.notification.date}`,
    tab: tab === 'stats' ? 'stats' : 'week',
  };
}

/** The notification the user last tapped, if any. */
export const useOpenedNotification: () => Opened = notificationsSupported
  ? useOpenedNative
  : () => null;

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';

const CHANNEL = 'workout-reminders';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Asks for notification permission once, at the moment the member opts in.
 * Returns whether reminders can be delivered.
 */
export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false; // never re-prompt after a denial
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

/**
 * Schedules local weekly reminders on the chosen days (0 = Sunday … 6).
 * Local notifications work in Expo Go and offline.
 */
export async function scheduleWeeklyReminders(days: number[], time: string, goalMessage?: string) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const [hour, minute] = time.split(':').map(Number);
  for (const day of days) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to train 💪',
        body: goalMessage ?? 'Your workout is waiting. Small steps. Stronger every day.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day + 1, // expo: 1 = Sunday
        hour,
        minute,
        channelId: CHANNEL,
      },
    });
  }
}

export async function cancelReminders() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Registers an Expo push token when a project id is configured (dev builds). */
export async function registerPushToken() {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) return;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/profile/push-tokens', { token: data, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
  } catch {
    // push is optional; local reminders still work
  }
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function deviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

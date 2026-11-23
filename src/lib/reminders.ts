import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';

const CHANNEL = 'workout-reminders';
let channelReady: boolean | null = null;

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
 * Creates the Android channel once. Some environments (e.g. Expo Go on certain
 * Android builds) reject channel creation natively — that must never block the
 * app, so failures are swallowed and notifications fall back to the default channel.
 */
async function ensureChannel() {
  if (Platform.OS !== 'android' || channelReady !== null) return channelReady ?? false;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Workout reminders',
      description: 'Reminders on your training days',
      importance: AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C8F135',
      enableVibrate: true,
      showBadge: false,
    });
    channelReady = true;
  } catch (e) {
    console.warn('[reminders] Could not create notification channel, using default channel.', e);
    channelReady = false;
  }
  return channelReady;
}

/**
 * Asks for notification permission once, at the moment the member opts in.
 * Never throws; returns whether reminders can be delivered.
 */
export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false; // never re-prompt after a denial
    const res = await Notifications.requestPermissionsAsync();
    return res.granted;
  } catch (e) {
    console.warn('[reminders] Permission request failed', e);
    return false;
  }
}

/**
 * Schedules local weekly reminders on the chosen days (0 = Sunday … 6).
 * Local notifications work in Expo Go and offline. Never throws — returns
 * whether scheduling succeeded so callers can inform the member.
 */
export async function scheduleWeeklyReminders(days: number[], time: string, goalMessage?: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const useChannel = await ensureChannel();
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
          ...(useChannel ? { channelId: CHANNEL } : {}),
        },
      });
    }
    return true;
  } catch (e) {
    console.warn('[reminders] Scheduling failed', e);
    return false;
  }
}

export async function cancelReminders() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // nothing scheduled / unsupported — ignore
  }
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

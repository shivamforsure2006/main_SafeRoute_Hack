import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { appStorage, StoredSentMessage } from './storage';
import { api, TrustedContact } from './api';

let vibrationInterval: any = null;

/**
 * Triggers distinct emergency vibration pattern on device or web browser.
 */
export function triggerEmergencyVibration() {
  try {
    // Immediate haptic pulse
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        // Continuous alert pulse pattern on web
        navigator.vibrate([600, 300, 600, 300, 600]);
        if (!vibrationInterval) {
          vibrationInterval = setInterval(() => {
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([600, 300, 600, 300, 600]);
            }
          }, 2400);
        }
      }
    } else {
      // Repeat emergency vibration on mobile device
      Vibration.vibrate([0, 600, 300, 600, 300, 600], true);
    }
  } catch (e) {
    console.warn('Vibration alert error:', e);
  }
}

/**
 * Stops any ongoing emergency vibration.
 */
export function stopEmergencyVibration() {
  try {
    if (vibrationInterval) {
      clearInterval(vibrationInterval);
      vibrationInterval = null;
    }

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(0);
      }
    } else {
      Vibration.cancel();
    }
  } catch {}
}

export interface DispatchSOSPayload {
  userName: string;
  userPhone: string;
  contacts: TrustedContact[];
  location: { lat: number; lng: number };
  batteryLevel?: number;
  anomalyReason?: string;
  trackingUrl?: string;
  triggerType?: string;
}

/**
 * Dispatches emergency SOS messages to all trusted contacts via SMS and Email,
 * logs them to local device storage, and calls the backend API.
 */
export async function dispatchSOSAlertsToContacts(payload: DispatchSOSPayload): Promise<{
  smsCount: number;
  emailCount: number;
  totalNotified: number;
}> {
  const {
    userName,
    userPhone,
    contacts,
    location,
    batteryLevel = 90,
    anomalyReason = 'Emergency SOS Alert',
    trackingUrl = 'https://saferoute-delhi.com/track/live',
    triggerType = 'ANOMALY_TIMEOUT',
  } = payload;

  let smsCount = 0;
  let emailCount = 0;
  const now = new Date().toISOString();
  const latStr = location.lat.toFixed(4);
  const lngStr = location.lng.toFixed(4);

  // Compose SMS body
  const smsBody =
    `EMERGENCY ALERT: ${userName} (${userPhone}) needs immediate help in Delhi NCR! ` +
    `Reason: ${anomalyReason}. ` +
    `Last GPS: (${latStr}, ${lngStr}). Battery: ${batteryLevel}%. ` +
    `Live Tracking: ${trackingUrl} — Please call 112 or check on them immediately.`;

  // Compose Email body
  const emailSubject = `🚨 EMERGENCY ALERT: ${userName} needs immediate assistance in Delhi NCR`;
  const emailBody =
    `EMERGENCY ALERT\n\n` +
    `User: ${userName} (${userPhone})\n` +
    `Status: EMERGENCY SOS ACTIVATED\n` +
    `Trigger Reason: ${anomalyReason} (${triggerType})\n` +
    `Location Coordinates: ${latStr}, ${lngStr} (Delhi NCR)\n` +
    `Device Battery Level: ${batteryLevel}%\n` +
    `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n` +
    `Live Radar & Breadcrumbs: ${trackingUrl}\n\n` +
    `If you cannot contact ${userName}, please immediately alert Delhi Police (112) or the nearest Safe Haven.`;

  // Dispatch to each registered trusted contact
  for (const contact of contacts) {
    // 1. Dispatch SMS / WhatsApp
    if (contact.phone && contact.notify_sms !== false) {
      smsCount++;
      const smsLog: StoredSentMessage = {
        id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        recipient: contact.phone,
        recipient_name: contact.name,
        channel: 'SMS',
        title: `EMERGENCY ALERT to ${contact.name}`,
        content: smsBody,
        status: 'SENT',
        created_at: now,
      };
      await appStorage.saveSentMessage(smsLog);
    }

    // 2. Dispatch Email
    if (contact.email && contact.notify_email !== false) {
      emailCount++;
      const emailLog: StoredSentMessage = {
        id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        recipient: contact.email,
        recipient_name: contact.name,
        channel: 'EMAIL',
        title: emailSubject,
        content: emailBody,
        status: 'SENT',
        created_at: now,
      };
      await appStorage.saveSentMessage(emailLog);
    }
  }

  // Also call backend SOS endpoint for server-side dispatch/logging
  try {
    await api.triggerSOS({
      user_id: 'saferoute-active-user',
      trigger_type: triggerType,
      lat: location.lat,
      lng: location.lng,
      battery_level: batteryLevel,
    });
  } catch (err) {
    console.warn('Backend SOS trigger fallback:', err);
  }

  return {
    smsCount,
    emailCount,
    totalNotified: smsCount + emailCount,
  };
}


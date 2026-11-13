import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useTripStore, useUserStore } from '@/store';

export function useShakeDetection() {
  const shakeCountRef = useRef(0);
  const lastShakeTimeRef = useRef(0);
  const shakeSensitivity = useUserStore((s) => s.shakeSensitivity);
  const triggerCheckIn = useTripStore((s) => s.triggerCheckIn);
  const triggerSOS = useTripStore((s) => s.triggerSOS);

  useEffect(() => {
    // Web browser environment: Accelerometer native module does not exist
    if (Platform.OS === 'web') {
      const handleMotion = (event: any) => {
        const acc = event.accelerationIncludingGravity || event.acceleration;
        if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
        const gMagnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z) / 9.8;
        if (gMagnitude > 2.2) {
          const now = Date.now();
          if (now - lastShakeTimeRef.current < 1500) {
            shakeCountRef.current += 1;
          } else {
            shakeCountRef.current = 1;
          }
          lastShakeTimeRef.current = now;
          if (shakeCountRef.current >= 3) {
            shakeCountRef.current = 0;
            triggerCheckIn('Shake gesture / motion impact detected');
          }
        }
      };

      if (typeof window !== 'undefined' && 'addEventListener' in window) {
        window.addEventListener('devicemotion', handleMotion);
      }
      return () => {
        if (typeof window !== 'undefined' && 'removeEventListener' in window) {
          window.removeEventListener('devicemotion', handleMotion);
        }
      };
    }

    // Native iOS & Android
    let subscription: any = null;

    try {
      const thresholdMap = {
        low: 2.8,    // in g-force (~27 m/s^2)
        medium: 2.2, // ~21 m/s^2
        high: 1.7,   // ~16 m/s^2
      };

      const threshold = thresholdMap[shakeSensitivity] || 2.2;

      if (Accelerometer && typeof Accelerometer.setUpdateInterval === 'function') {
        Accelerometer.setUpdateInterval(100);
      }

      if (Accelerometer && typeof Accelerometer.addListener === 'function') {
        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const gMagnitude = Math.sqrt(x * x + y * y + z * z);

          if (gMagnitude > threshold) {
            const now = Date.now();
            if (now - lastShakeTimeRef.current < 1500) {
              shakeCountRef.current += 1;
            } else {
              shakeCountRef.current = 1;
            }
            lastShakeTimeRef.current = now;

            // 3 rapid shakes detected
            if (shakeCountRef.current >= 3) {
              shakeCountRef.current = 0;
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              } catch (_) {}
              triggerCheckIn('Shake gesture / fall impact detected');
            }
          }
        });
      }
    } catch (err) {
      console.warn('Accelerometer initialization skipped:', err);
    }

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, [shakeSensitivity, triggerSOS]);
}

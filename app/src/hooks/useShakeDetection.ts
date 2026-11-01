import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useTripStore, useUserStore } from '@/store';

export function useShakeDetection() {
  const shakeCountRef = useRef(0);
  const lastShakeTimeRef = useRef(0);
  const shakeSensitivity = useUserStore((s) => s.shakeSensitivity);
  const triggerSOS = useTripStore((s) => s.triggerSOS);

  useEffect(() => {
    let subscription: any;

    const thresholdMap = {
      low: 2.8,    // in g-force (~27 m/s^2)
      medium: 2.2, // ~21 m/s^2
      high: 1.7,   // ~16 m/s^2
    };

    const threshold = thresholdMap[shakeSensitivity] || 2.2;

    Accelerometer.setUpdateInterval(100);

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
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          triggerSOS('SHAKE_GESTURE');
        }
      }
    });

    return () => {
      if (subscription) subscription.remove();
    };
  }, [shakeSensitivity, triggerSOS]);
}

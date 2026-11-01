import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AlertCircle } from 'lucide-react-native';
import { lightColors } from '@/theme/tokens';
import { useTripStore } from '@/store';

interface SOSButtonProps {
  size?: number;
}

export function SOSButton({ size = 68 }: SOSButtonProps) {
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const triggerSOS = useTripStore((s) => s.triggerSOS);

  const startHold = () => {
    setIsPressing(true);
    setProgress(0);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (_) {}

    const startTime = Date.now();
    const duration = 2000; // 2 seconds

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(intervalRef.current);
        setIsPressing(false);
        setProgress(100);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (_) {}
        triggerSOS('BUTTON_HOLD_2S');
      }
    }, 40);
  };

  const cancelHold = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPressing(false);
    setProgress(0);
  };

  return (
    <View style={styles.container}>
      {isPressing && (
        <View style={styles.indicatorContainer}>
          <Text style={styles.holdText}>Keep holding for SOS...</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={startHold}
        onPressOut={cancelHold}
        style={[
          styles.circleBtn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: lightColors.danger,
            transform: [{ scale: isPressing ? 1.08 : 1 }],
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS button. Hold for 2 seconds to alert trusted contacts and nearby volunteers."
      >
        <AlertCircle size={size * 0.42} color="#ffffff" strokeWidth={2.5} />
        <Text style={[styles.sosLabel, { fontSize: size * 0.18 }]}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 999,
  },
  circleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d9453d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  sosLabel: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: -2,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 80,
    right: 0,
    width: 170,
    backgroundColor: '#1b1f3b',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    alignItems: 'center',
  },
  holdText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#d9453d',
    borderRadius: 3,
  },
});

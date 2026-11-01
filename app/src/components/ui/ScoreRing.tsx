import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react-native';
import { lightColors, darkColors } from '@/theme/tokens';
import { useUserStore } from '@/store';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export function ScoreRing({ score, size = 64, strokeWidth = 5, showLabel = true }: ScoreRingProps) {
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;

  let scoreColor = colors.safe;
  let statusText = 'Safe';
  let IconComponent = ShieldCheck;

  if (score < 50) {
    scoreColor = colors.danger;
    statusText = 'Unsafe';
    IconComponent = ShieldAlert;
  } else if (score < 75) {
    scoreColor = colors.caution;
    statusText = 'Caution';
    IconComponent = AlertTriangle;
  }

  const roundedScore = Math.round(score);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.ringOuter,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: scoreColor,
            backgroundColor: isDarkMode ? colors.surface : colors.surfaceSubtle,
          },
        ]}
      >
        <Text style={[styles.scoreText, { color: colors.ink, fontSize: size * 0.32 }]}>
          {roundedScore}
        </Text>
      </View>
      {showLabel && (
        <View style={styles.labelRow}>
          <IconComponent size={14} color={scoreColor} />
          <Text style={[styles.labelText, { color: scoreColor }]}>{statusText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreText: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

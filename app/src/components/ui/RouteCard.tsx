import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, Navigation, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { RouteAlternative } from '@/services/api';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useUserStore } from '@/store';

interface RouteCardProps {
  route: RouteAlternative;
  isSelected: boolean;
  onSelect: () => void;
  onOpenDetails: () => void;
}

export function RouteCard({ route, isSelected, onSelect, onOpenDetails }: RouteCardProps) {
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;

  const durationMin = Math.ceil(route.duration_s / 60);
  const distanceKm = (route.distance_m / 1000).toFixed(1);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onSelect}
      style={[
        styles.card,
        {
          backgroundColor: isDarkMode ? colors.surface : colors.surface,
          borderColor: isSelected ? colors.signal : colors.line,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${route.title}, Safety score ${route.safety_score}, Duration ${durationMin} minutes`}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={styles.titleBadgeRow}>
            <Text style={[styles.title, { color: colors.ink }]}>{route.title}</Text>
            {isSelected && (
              <View style={[styles.selectedBadge, { backgroundColor: colors.signal }]}>
                <CheckCircle2 size={12} color="#ffffff" />
                <Text style={styles.selectedBadgeText}>Selected</Text>
              </View>
            )}
          </View>
          <Text style={[styles.reason, { color: colors.muted }]} numberOfLines={2}>
            {route.one_line_reason}
          </Text>
        </View>
        <ScoreRing score={route.safety_score} size={52} strokeWidth={4} />
      </View>

      <View style={[styles.metricsDivider, { backgroundColor: colors.line }]} />

      <View style={styles.footerRow}>
        <View style={styles.metricGroup}>
          <View style={styles.metricItem}>
            <Clock size={15} color={colors.muted} />
            <Text style={[styles.metricText, { color: colors.ink }]}>{durationMin} mins</Text>
          </View>
          <View style={styles.metricItem}>
            <Navigation size={15} color={colors.muted} />
            <Text style={[styles.metricText, { color: colors.ink }]}>{distanceKm} km</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onOpenDetails}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.detailsLink, { color: colors.signal }]}>Breakdown</Text>
        </TouchableOpacity>
      </View>

      {route.weakest_stretch && (
        <View
          style={[
            styles.weakStretchBanner,
            {
              backgroundColor: colors.cautionSubtle,
              borderColor: colors.caution,
            },
          ]}
        >
          <AlertTriangle size={14} color={colors.caution} />
          <Text style={[styles.weakStretchText, { color: colors.ink }]} numberOfLines={1}>
            {route.weakest_stretch.reason}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: themeTokens.radii.card,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleContainer: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  selectedBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  reason: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  metricsDivider: {
    height: 1,
    marginVertical: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsLink: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  weakStretchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  weakStretchText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});

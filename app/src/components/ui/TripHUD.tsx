import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Clock, Navigation, Battery, Share2, StopCircle } from 'lucide-react-native';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useTripStore, useUserStore } from '@/store';
import { ScoreRing } from '@/components/ui/ScoreRing';

export function TripHUD() {
  const selectedRoute = useTripStore((s) => s.selectedRoute);
  const origin = useTripStore((s) => s.origin);
  const destination = useTripStore((s) => s.destination);
  const batteryLevel = useTripStore((s) => s.batteryLevel);
  const currentSpeed = useTripStore((s) => s.currentSpeed);
  const trackingUrl = useTripStore((s) => s.trackingUrl);
  const endTrip = useTripStore((s) => s.endTrip);

  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;

  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  if (!selectedRoute) return null;

  const durationMin = Math.ceil(selectedRoute.duration_s / 60);
  const distanceKm = (selectedRoute.distance_m / 1000).toFixed(1);

  const handleShareLive = async () => {
    if (trackingUrl) {
      try {
        await Share.share({
          message: `I'm traveling safely in Delhi via SafeRoute. Follow my live journey here: ${trackingUrl}`,
          url: trackingUrl,
        });
      } catch (e) {
        console.warn('Share error', e);
      }
    }
  };

  const handleConfirmEnd = () => {
    endTrip();
    setConfirmEndOpen(false);
  };

  return (
    <View style={[styles.hudCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {/* Top row: Destination + Safety Ring */}
      <View style={styles.topRow}>
        <View style={styles.destContainer}>
          <Text style={[styles.headingLabel, { color: colors.muted }]} numberOfLines={1}>
            From {origin.name}
          </Text>
          <Text style={[styles.destName, { color: colors.ink }]} numberOfLines={1}>
            ➔ {destination.name}
          </Text>
          <View style={styles.shareBadge}>
            <View style={[styles.liveDot, { backgroundColor: colors.signal }]} />
            <Text style={[styles.shareText, { color: colors.signal }]}>Live sharing active</Text>
          </View>
        </View>

        <ScoreRing score={selectedRoute.safety_score} size={50} strokeWidth={4} />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.line }]} />

      {/* Metrics Row: ETA, Distance, Speed, Battery */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Clock size={16} color={colors.muted} />
          <View>
            <Text style={[styles.metricSub, { color: colors.muted }]}>ETA</Text>
            <Text style={[styles.metricVal, { color: colors.ink }]}>{durationMin} mins</Text>
          </View>
        </View>

        <View style={styles.metricItem}>
          <Navigation size={16} color={colors.muted} />
          <View>
            <Text style={[styles.metricSub, { color: colors.muted }]}>Distance</Text>
            <Text style={[styles.metricVal, { color: colors.ink }]}>{distanceKm} km</Text>
          </View>
        </View>

        <View style={styles.metricItem}>
          <Battery size={16} color={colors.muted} />
          <View>
            <Text style={[styles.metricSub, { color: colors.muted }]}>Battery</Text>
            <Text style={[styles.metricVal, { color: colors.ink }]}>{batteryLevel}%</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons: Share & End Trip */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          onPress={handleShareLive}
          style={[styles.shareBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}
          accessibilityRole="button"
          accessibilityLabel="Share live tracking link"
        >
          <Share2 size={16} color={colors.ink} />
          <Text style={[styles.btnText, { color: colors.ink }]}>Share Link</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setConfirmEndOpen(true)}
          style={[styles.endTripBtn, { backgroundColor: colors.dangerSubtle, borderColor: colors.danger }]}
          accessibilityRole="button"
          accessibilityLabel="End trip"
        >
          <StopCircle size={16} color={colors.danger} />
          <Text style={[styles.btnText, { color: colors.danger }]}>End Trip</Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      {confirmEndOpen && (
        <View style={[styles.confirmOverlay, { backgroundColor: colors.surface }]}>
          <Text style={[styles.confirmTitle, { color: colors.ink }]}>Arrived safely?</Text>
          <Text style={[styles.confirmSub, { color: colors.muted }]}>
            Ending your trip will notify your trusted contacts that you have arrived safely.
          </Text>
          <View style={styles.confirmBtnRow}>
            <TouchableOpacity
              onPress={() => setConfirmEndOpen(false)}
              style={[styles.confirmCancelBtn, { backgroundColor: colors.surfaceSubtle }]}
            >
              <Text style={{ color: colors.ink, fontWeight: '600' }}>Keep Going</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirmEnd}
              style={[styles.confirmOkBtn, { backgroundColor: colors.ink }]}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700' }}>Yes, End Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hudCard: {
    borderRadius: themeTokens.radii.card,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  destContainer: {
    flex: 1,
  },
  headingLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  destName: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 4,
  },
  shareBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shareText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricSub: {
    fontSize: 11,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: themeTokens.radii.button,
    borderWidth: 1,
  },
  endTripBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: themeTokens.radii.button,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: themeTokens.radii.card,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  confirmSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmOkBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});

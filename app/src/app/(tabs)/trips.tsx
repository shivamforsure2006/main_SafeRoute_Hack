import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Navigation, Clock, ShieldCheck, MessageSquare, Trash2, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react-native';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { TripHUD } from '@/components/ui/TripHUD';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useTripStore, useUserStore } from '@/store';
import { appStorage, StoredPastTrip } from '@/services/storage';

export default function TripsScreen() {
  const router = useRouter();
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;
  const status = useTripStore((s) => s.status);
  const isTripActive = status === 'ACTIVE';

  const [trips, setTrips] = useState<StoredPastTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load trips from browser's local storage on mount and when status changes
  useEffect(() => {
    loadTrips();
  }, [status]);

  const loadTrips = async () => {
    setIsLoading(true);
    let loaded = await appStorage.loadPastTrips();
    if (!loaded || loaded.length === 0) {
      // Seed initial demo trips so the user sees sample data
      const defaultTrips: StoredPastTrip[] = [
        {
          id: 'past-1',
          date: 'Today, 6:30 PM',
          origin: 'Connaught Place, Central Delhi',
          destination: 'Hauz Khas Village, South Delhi',
          safetyScore: 89.5,
          durationMin: 32,
          distanceKm: 8.2,
          status: 'ARRIVED_SAFELY',
          summary: 'Well-lit corridor via Janpath and AIIMS emergency zone. No alerts triggered.',
          created_at: new Date().toISOString(),
        },
        {
          id: 'past-2',
          date: 'Yesterday, 8:15 PM',
          origin: 'New Delhi Railway Station (NDLS)',
          destination: 'India Gate, Rajpath',
          safetyScore: 92.0,
          durationMin: 18,
          distanceKm: 3.1,
          status: 'ARRIVED_SAFELY',
          summary: 'Monitored central corridor with high police presence. Live tracking shared with 3 contacts.',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      for (const t of defaultTrips) {
        await appStorage.savePastTrip(t);
      }
      loaded = defaultTrips;
    }
    setTrips(loaded);
    setIsLoading(false);
  };

  const handleDeleteTrip = (id: string, destination: string) => {
    Alert.alert(
      'Delete Trip Record',
      `Delete past trip to "${destination}" from your local storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await appStorage.deletePastTrip(id);
            setTrips((prev) => prev.filter((t) => t.id !== id));
          },
        },
      ]
    );
  };

  const handleClearAllTrips = () => {
    Alert.alert(
      'Clear All Trip Records',
      'Are you sure you want to delete all past trips stored in your browser local storage?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await appStorage.clearPastTrips();
            setTrips([]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.ink }]}>My Trips</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            Stored locally in your browser
          </Text>
        </View>
        <View style={styles.headerBtnGroup}>
          <TouchableOpacity
            onPress={() => router.push('/sent-messages')}
            style={[styles.messageLogBtn, { backgroundColor: colors.surfaceSubtle }]}
            accessibilityLabel="View sent alert messages log"
          >
            <MessageSquare size={15} color={colors.signal} />
            <Text style={[styles.messageLogText, { color: colors.signal }]}>Sent Alerts</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Active Journey Card */}
        {isTripActive && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.signal }]}>ACTIVE JOURNEY IN PROGRESS</Text>
            <TripHUD />
          </View>
        )}

        {/* Past Trips History */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.ink }]}>
              Completed Trips ({trips.length})
            </Text>
            {trips.length > 0 && (
              <TouchableOpacity
                onPress={handleClearAllTrips}
                style={[styles.clearAllBtn, { borderColor: colors.line }]}
              >
                <Trash2 size={13} color={colors.danger} />
                <Text style={[styles.clearAllText, { color: colors.danger }]}>Clear History</Text>
              </TouchableOpacity>
            )}
          </View>

          {trips.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Navigation size={36} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.ink }]}>No Past Trips Recorded</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                When you start and complete a route from the Map tab, your trip details will automatically appear here and persist in your browser's local storage.
              </Text>
              <TouchableOpacity
                onPress={loadTrips}
                style={[styles.restoreDemoBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}
              >
                <RotateCcw size={14} color={colors.signal} />
                <Text style={[styles.restoreDemoText, { color: colors.signal }]}>Load Sample Records</Text>
              </TouchableOpacity>
            </View>
          ) : (
            trips.map((trip) => (
              <View
                key={trip.id}
                style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.destMeta}>
                    <Text style={[styles.tripDate, { color: colors.muted }]}>{trip.date}</Text>
                    <Text style={[styles.tripDest, { color: colors.ink }]}>➔ {trip.destination}</Text>
                    <Text style={[styles.tripOrigin, { color: colors.muted }]}>From {trip.origin}</Text>
                  </View>
                  <View style={styles.scoreAndDeleteCol}>
                    <ScoreRing score={trip.safetyScore} size={46} strokeWidth={4} />
                    <TouchableOpacity
                      onPress={() => handleDeleteTrip(trip.id, trip.destination)}
                      style={[styles.deleteTripBtn, { backgroundColor: colors.surfaceSubtle }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete trip to ${trip.destination}`}
                    >
                      <Trash2 size={13} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.line }]} />

                <View style={styles.cardMetrics}>
                  <View style={styles.metricItem}>
                    <Clock size={13} color={colors.muted} />
                    <Text style={[styles.metricText, { color: colors.ink }]}>{trip.durationMin} mins</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Navigation size={13} color={colors.muted} />
                    <Text style={[styles.metricText, { color: colors.ink }]}>{trip.distanceKm} km</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <CheckCircle2 size={13} color={colors.safe} />
                    <Text style={[styles.metricText, { color: colors.safe }]}>Arrived Safely</Text>
                  </View>
                </View>

                {trip.summary ? (
                  <Text style={[styles.summaryText, { color: colors.muted }]}>{trip.summary}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  headerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  messageLogText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollBody: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tripCard: {
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  destMeta: {
    flex: 1,
    paddingRight: 10,
  },
  tripDate: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  tripDest: {
    fontSize: 16,
    fontWeight: '700',
  },
  tripOrigin: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreAndDeleteCol: {
    alignItems: 'center',
    gap: 8,
  },
  deleteTripBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cardMetrics: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 12,
    marginTop: 10,
    lineHeight: 16,
  },
  emptyBox: {
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 380,
  },
  restoreDemoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  restoreDemoText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

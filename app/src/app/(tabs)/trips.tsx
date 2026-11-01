import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Navigation, Clock, ShieldCheck, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { TripHUD } from '@/components/ui/TripHUD';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useTripStore, useUserStore } from '@/store';

export default function TripsScreen() {
  const router = useRouter();
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;
  const status = useTripStore((s) => s.status);
  const isTripActive = status === 'ACTIVE';

  // Demo past trips
  const pastTrips = [
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
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        <Text style={[styles.headerTitle, { color: colors.ink }]}>My Trips</Text>
        <TouchableOpacity
          onPress={() => router.push('/sent-messages')}
          style={[styles.messageLogBtn, { backgroundColor: colors.surfaceSubtle }]}
          accessibilityLabel="View sent alert messages log"
        >
          <MessageSquare size={16} color={colors.signal} />
          <Text style={[styles.messageLogText, { color: colors.signal }]}>Sent Alerts</Text>
        </TouchableOpacity>
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
          <Text style={[styles.sectionHeading, { color: colors.ink }]}>Completed Trips</Text>

          {pastTrips.map((trip) => (
            <View
              key={trip.id}
              style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.destMeta}>
                  <Text style={[styles.tripDate, { color: colors.muted }]}>{trip.date}</Text>
                  <Text style={[styles.tripDest, { color: colors.ink }]}>{trip.destination}</Text>
                  <Text style={[styles.tripOrigin, { color: colors.muted }]}>From {trip.origin}</Text>
                </View>
                <ScoreRing score={trip.safetyScore} size={48} strokeWidth={4} />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.line }]} />

              <View style={styles.cardMetrics}>
                <View style={styles.metricItem}>
                  <Clock size={14} color={colors.muted} />
                  <Text style={[styles.metricText, { color: colors.ink }]}>{trip.durationMin} mins</Text>
                </View>
                <View style={styles.metricItem}>
                  <Navigation size={14} color={colors.muted} />
                  <Text style={[styles.metricText, { color: colors.ink }]}>{trip.distanceKm} km</Text>
                </View>
                <View style={styles.metricItem}>
                  <CheckCircle2 size={14} color={colors.safe} />
                  <Text style={[styles.metricText, { color: colors.safe }]}>Arrived Safely</Text>
                </View>
              </View>

              <Text style={[styles.summaryText, { color: colors.muted }]}>{trip.summary}</Text>
            </View>
          ))}
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
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
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
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  tripCard: {
    borderRadius: themeTokens.radii.card,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  destMeta: {
    flex: 1,
  },
  tripDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  tripDest: {
    fontSize: 16,
    fontWeight: '700',
  },
  tripOrigin: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cardMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

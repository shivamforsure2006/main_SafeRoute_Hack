import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  CheckCircle2,
  Navigation,
  AlertTriangle,
  Radio,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react-native';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useTripStore, useUserStore } from '@/store';
import { useSimulatorStore } from '@/store/simulator';

export default function GuidedDemoScreen() {
  const router = useRouter();
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;

  const trip = useTripStore();
  const sim = useSimulatorStore();

  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      step: 1,
      title: 'Plan & Compare Routes by Safety',
      narration:
        'SafeRoute evaluates street lamps, open shops, transit hubs, and verified community incident reports in Delhi. Notice the Safest Route achieves 89.5/100, while the Fastest Route gets 72.0/100 due to unlit backstreets.',
      actionLabel: 'Advance to Trip Start',
      action: () => {
        trip.startTrip();
        setCurrentStep(2);
      },
    },
    {
      step: 2,
      title: 'Active Trip HUD & Live Sharing',
      narration:
        'A signed live tracking URL is immediately generated and dispatched to trusted contacts via SMS. The trip HUD displays real-time ETA, speed, and battery monitoring with a foreground service notification.',
      actionLabel: 'Simulate Walk & Route Deviation',
      action: () => {
        sim.triggerDeviate();
        setCurrentStep(3);
      },
    },
    {
      step: 3,
      title: 'Anomaly Detected & Check-In Trigger',
      narration:
        'The anomaly engine detects a 260m perpendicular route deviation off the safe path. The app promotes from NORMAL to CHECK_IN, initiating the 30-second escalating countdown ring.',
      actionLabel: 'Simulate Check-In Timeout',
      action: () => {
        // Trigger check-in countdown modal with user's configured timer
        trip.triggerCheckIn('Route deviation detected: 260m off planned safe route');
        setCurrentStep(4);
      },
    },
    {
      step: 4,
      title: 'Emergency SOS Broadcast',
      narration:
        'When the check-in is unanswered (or if a duress PIN is entered), SafeRoute escalates to SOS: capturing GPS coordinates, recording 10s audio, notifying all 3 trusted contacts with tracking links, and alerting volunteers within 1 km.',
      actionLabel: 'Open Public Web Live Tracking',
      action: () => {
        const url = trip.trackingUrl || 'http://localhost:8000/track/demo-local-token';
        Linking.openURL(url);
        setCurrentStep(5);
      },
    },
    {
      step: 5,
      title: 'Public Web Live Tracking & 112 Dial',
      narration:
        'Trusted contacts can view the live moving dot in their browser via WebSocket without needing to install the app or create an account. The page displays the 30-minute trail and a 1-tap "Call 112" button.',
      actionLabel: 'Resolve Emergency (Safe PIN)',
      action: async () => {
        await trip.cancelSOS('1234');
        await trip.endTrip();
        setCurrentStep(6);
      },
    },
    {
      step: 6,
      title: 'Safe Arrival & Complete Walkthrough',
      narration:
        'The emergency is securely resolved using the Normal PIN. All contacts receive an update confirming the commuter is safe. The trip is marked COMPLETED.',
      actionLabel: 'Restart Guided Demo',
      action: () => {
        trip.resetToIdle();
        setCurrentStep(1);
      },
    },
  ];

  const currentStepData = steps[currentStep - 1];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.ink }]}>Guided Demo Walkthrough</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Step Indicator */}
        <View style={styles.stepsPillRow}>
          {steps.map((s) => (
            <View
              key={s.step}
              style={[
                styles.stepDot,
                {
                  backgroundColor:
                    s.step === currentStep
                      ? colors.signal
                      : s.step < currentStep
                      ? colors.safe
                      : colors.line,
                },
              ]}
            />
          ))}
        </View>

        {/* Current Step Card */}
        <View style={[styles.narrationCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[styles.stepBadge, { backgroundColor: colors.signalSubtle }]}>
            <Text style={[styles.stepBadgeText, { color: colors.signal }]}>
              STEP {currentStep} OF 6
            </Text>
          </View>

          <Text style={[styles.stepTitle, { color: colors.ink }]}>{currentStepData.title}</Text>
          <Text style={[styles.narrationText, { color: colors.muted }]}>
            {currentStepData.narration}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <TouchableOpacity
            onPress={currentStepData.action}
            style={[styles.actionBtn, { backgroundColor: colors.ink }]}
            accessibilityRole="button"
            accessibilityLabel={currentStepData.actionLabel}
          >
            <Play size={16} color="#ffffff" />
            <Text style={styles.actionBtnText}>{currentStepData.actionLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Live State Inspector Pill */}
        <View style={[styles.stateInspector, { backgroundColor: colors.surfaceSubtle }]}>
          <Text style={[styles.inspectorTitle, { color: colors.ink }]}>Live State Machine Inspector</Text>
          <View style={styles.inspectorRow}>
            <Text style={[styles.inspectorLabel, { color: colors.muted }]}>Current Status:</Text>
            <Text style={[styles.inspectorVal, { color: colors.signal }]}>{trip.status}</Text>
          </View>
          <View style={styles.inspectorRow}>
            <Text style={[styles.inspectorLabel, { color: colors.muted }]}>Active Route:</Text>
            <Text style={[styles.inspectorVal, { color: colors.ink }]}>
              {trip.selectedRoute?.title || 'Connaught Place to India Gate'}
            </Text>
          </View>
          <View style={styles.inspectorRow}>
            <Text style={[styles.inspectorLabel, { color: colors.muted }]}>Telemetry:</Text>
            <Text style={[styles.inspectorVal, { color: colors.ink }]}>
              Speed {(trip.currentSpeed * 3.6).toFixed(1)} km/h • Battery {trip.batteryLevel}%
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollBody: { padding: 20, paddingBottom: 40 },
  stepsPillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  stepDot: {
    width: 28,
    height: 6,
    borderRadius: 3,
  },
  narrationCard: {
    padding: 22,
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  stepBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  stepTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  narrationText: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
  divider: { height: 1, marginVertical: 14 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: themeTokens.radii.button,
  },
  actionBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  stateInspector: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  inspectorTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  inspectorRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inspectorLabel: { fontSize: 12 },
  inspectorVal: { fontSize: 12, fontWeight: '700' },
});

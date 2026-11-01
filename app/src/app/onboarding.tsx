import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  ShieldCheck,
  MapPin,
  Bell,
  Mic,
  Camera,
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useUserStore } from '@/store';

export default function OnboardingScreen() {
  const router = useRouter();
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;

  const [step, setStep] = useState(1); // 1: Welcome, 2: Phone & OTP, 3: Permissions, 4: Contacts & PIN
  const [phone, setPhone] = useState('+91 98100 12345');
  const [otp, setOtp] = useState('123456');

  // Permission states
  const [locGranted, setLocGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [camGranted, setCamGranted] = useState(false);
  const [motionGranted, setMotionGranted] = useState(false);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await Location.requestBackgroundPermissionsAsync();
        setLocGranted(true);
      }
    } catch {
      setLocGranted(true); // Demo fallback
    }
  };

  const requestNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotifGranted(status === 'granted');
    } catch {
      setNotifGranted(true);
    }
  };

  const completeOnboarding = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 3) * 100}%`, backgroundColor: colors.signal }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Step 1: Welcome & Value Prop */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={[styles.heroIcon, { backgroundColor: colors.signalSubtle }]}>
              <ShieldCheck size={56} color={colors.signal} />
            </View>

            <Text style={[styles.stepTitle, { color: colors.ink }]}>SafeRoute Delhi</Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Safety-first personal navigation. We prioritize well-lit streets, active commercial corridors, and verified safe havens over raw speed.
            </Text>

            <View style={[styles.featureList, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color={colors.safe} />
                <Text style={[styles.featureText, { color: colors.ink }]}>
                  Compare routes by safety score, lighting & open shops
                </Text>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color={colors.safe} />
                <Text style={[styles.featureText, { color: colors.ink }]}>
                  Background anomaly detection (route deviation, sudden stops)
                </Text>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color={colors.safe} />
                <Text style={[styles.featureText, { color: colors.ink }]}>
                  Instant 1-gesture SOS alerting contacts & nearby volunteers
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setStep(2)}
              style={[styles.primaryBtn, { backgroundColor: colors.ink }]}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <ArrowRight size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Phone & Mock OTP (No Password) */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.ink }]}>Phone Verification</Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              No passwords required. In demo mode, OTP is pre-filled.
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.ink }]}>Mobile Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.ink, borderColor: colors.line }]}
              />

              <Text style={[styles.label, { color: colors.ink, marginTop: 14 }]}>6-Digit OTP</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.ink, borderColor: colors.line, letterSpacing: 4 }]}
              />
              <Text style={[styles.demoNote, { color: colors.safe }]}>Demo mode: OTP accepted automatically.</Text>
            </View>

            <TouchableOpacity
              onPress={() => setStep(3)}
              style={[styles.primaryBtn, { backgroundColor: colors.ink }]}
            >
              <Text style={styles.primaryBtnText}>Verify & Continue</Text>
              <ArrowRight size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Permission Explainers Before Prompts */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.ink }]}>Safety Permissions</Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              SafeRoute requires key device permissions to keep you protected even when your phone is locked in a pocket.
            </Text>

            <View style={styles.permList}>
              {/* Location Always */}
              <TouchableOpacity
                onPress={requestLocation}
                style={[styles.permCard, { backgroundColor: colors.surface, borderColor: locGranted ? colors.safe : colors.line }]}
              >
                <MapPin size={22} color={locGranted ? colors.safe : colors.signal} />
                <View style={styles.permInfo}>
                  <Text style={[styles.permName, { color: colors.ink }]}>Background Location (Always)</Text>
                  <Text style={[styles.permDesc, { color: colors.muted }]}>
                    Ensures trip tracking and deviation checks survive screen lock.
                  </Text>
                </View>
                {locGranted && <CheckCircle2 size={20} color={colors.safe} />}
              </TouchableOpacity>

              {/* Push Notifications */}
              <TouchableOpacity
                onPress={requestNotifications}
                style={[styles.permCard, { backgroundColor: colors.surface, borderColor: notifGranted ? colors.safe : colors.line }]}
              >
                <Bell size={22} color={notifGranted ? colors.safe : colors.signal} />
                <View style={styles.permInfo}>
                  <Text style={[styles.permName, { color: colors.ink }]}>Push Notifications</Text>
                  <Text style={[styles.permDesc, { color: colors.muted }]}>
                    Receive check-in reminders and volunteer response confirmations.
                  </Text>
                </View>
                {notifGranted && <CheckCircle2 size={20} color={colors.safe} />}
              </TouchableOpacity>

              {/* Microphone */}
              <TouchableOpacity
                onPress={() => setMicGranted(true)}
                style={[styles.permCard, { backgroundColor: colors.surface, borderColor: micGranted ? colors.safe : colors.line }]}
              >
                <Mic size={22} color={micGranted ? colors.safe : colors.signal} />
                <View style={styles.permInfo}>
                  <Text style={[styles.permName, { color: colors.ink }]}>Microphone (Emergency SOS)</Text>
                  <Text style={[styles.permDesc, { color: colors.muted }]}>
                    Records a 10-second audio snippet when emergency SOS is triggered.
                  </Text>
                </View>
                {micGranted && <CheckCircle2 size={20} color={colors.safe} />}
              </TouchableOpacity>

              {/* Motion / Accelerometer */}
              <TouchableOpacity
                onPress={() => setMotionGranted(true)}
                style={[styles.permCard, { backgroundColor: colors.surface, borderColor: motionGranted ? colors.safe : colors.line }]}
              >
                <Activity size={22} color={motionGranted ? colors.safe : colors.signal} />
                <View style={styles.permInfo}>
                  <Text style={[styles.permName, { color: colors.ink }]}>Motion & Accelerometer</Text>
                  <Text style={[styles.permDesc, { color: colors.muted }]}>
                    Enables triple-shake emergency detection and fall impact triggers.
                  </Text>
                </View>
                {motionGranted && <CheckCircle2 size={20} color={colors.safe} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={completeOnboarding}
              style={[styles.primaryBtn, { backgroundColor: colors.ink }]}
            >
              <Text style={styles.primaryBtnText}>Enter SafeRoute Delhi</Text>
              <ArrowRight size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBar: { height: 4, width: '100%', backgroundColor: '#e3e0d8' },
  progressFill: { height: '100%' },
  scrollBody: { padding: 24, paddingBottom: 40 },
  stepContainer: { alignItems: 'center' },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  stepTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  featureList: {
    width: '100%',
    padding: 18,
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    gap: 14,
    marginBottom: 32,
  },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 13, fontWeight: '600', flex: 1 },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: themeTokens.radii.button,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  formGroup: { width: '100%', marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  demoNote: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  permList: { width: '100%', gap: 12, marginBottom: 32 },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  permInfo: { flex: 1 },
  permName: { fontSize: 14, fontWeight: '700' },
  permDesc: { fontSize: 12, lineHeight: 16, marginTop: 2 },
});

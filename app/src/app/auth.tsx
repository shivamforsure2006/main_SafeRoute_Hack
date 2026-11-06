import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ShieldCheck,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  User,
  X,
  MapPin,
  ChevronRight,
} from 'lucide-react-native';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useUserStore } from '@/store';

export default function AuthScreen() {
  const router = useRouter();
  const user = useUserStore();
  const isDarkMode = user.isDarkMode;
  const colors = isDarkMode ? darkColors : lightColors;

  const [activeTab, setActiveTab] = useState<'google' | 'phone' | 'email'>('google');
  const [loading, setLoading] = useState(false);

  // Phone input states
  const [phoneNumber, setPhoneNumber] = useState('+91 98100 12345');
  const [otp, setOtp] = useState('123456');
  const [otpSent, setOtpSent] = useState(false);

  // Email input states
  const [emailInput, setEmailInput] = useState('user.delhi@gmail.com');
  const [passwordInput, setPasswordInput] = useState('safedelhi2026');

  // Google interactive modal states
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [customGoogleName, setCustomGoogleName] = useState('Shivam Kumar');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('shivam.safedrive@gmail.com');

  // Pre-configured Google demo accounts for instant 1-click selection
  const googleAccounts = [
    {
      name: 'Shivam Kumar',
      email: 'shivam.safedrive@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&h=160&fit=crop&crop=faces',
    },
    {
      name: 'Ananya Sharma',
      email: 'ananya.delhi@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=faces',
    },
    {
      name: 'Priya Verma',
      email: 'priya.verma@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=faces',
    },
  ];

  const handleGoogleLogin = async (acc: { name: string; email: string; avatarUrl: string }) => {
    setLoading(true);
    setGoogleModalVisible(false);
    try {
      await user.loginWithGoogle({
        name: acc.name,
        email: acc.email,
        avatarUrl: acc.avatarUrl,
      });
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Login Error', 'Failed to complete Google Sign In. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleSubmit = async () => {
    if (!customGoogleEmail.trim() || !customGoogleName.trim()) {
      Alert.alert('Required', 'Please enter your Google name and email address.');
      return;
    }
    const avatarUrl = `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(customGoogleName)}`;
    await handleGoogleLogin({
      name: customGoogleName.trim(),
      email: customGoogleEmail.trim(),
      avatarUrl,
    });
  };

  const handleSendOtp = () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Required', 'Please enter a valid phone number.');
      return;
    }
    setOtpSent(true);
    Alert.alert('OTP Sent', `A 6-digit verification code has been sent to ${phoneNumber}. Demo code: 123456`);
  };

  const handleVerifyPhoneOtp = async () => {
    setLoading(true);
    try {
      await user.loginWithPhone(phoneNumber.trim(), otp);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!emailInput.trim()) {
      Alert.alert('Required', 'Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      await user.loginWithGoogle({
        name: emailInput.split('@')[0],
        email: emailInput.trim(),
        avatarUrl: `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(emailInput)}`,
      });
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    user.loginWithDemo();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* SafeRoute Brand Header */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoShield, { backgroundColor: colors.safeSubtle, borderColor: colors.safe }]}>
            <ShieldCheck size={48} color={colors.safe} />
          </View>
          <Text style={[styles.brandTitle, { color: colors.ink }]}>SafeRoute Delhi</Text>
          <Text style={[styles.brandTagline, { color: colors.muted }]}>
            Safety-First Navigation • Delhi NCR
          </Text>
          <View style={styles.pillBadge}>
            <MapPin size={12} color={colors.signal} />
            <Text style={[styles.pillBadgeText, { color: colors.signal }]}>
              Verified Safe Corridors & Real-time SOS
            </Text>
          </View>
        </View>

        {/* Authentication Card */}
        <View style={[styles.authCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.authCardTitle, { color: colors.ink }]}>Welcome to SafeRoute</Text>
          <Text style={[styles.authCardSubtitle, { color: colors.muted }]}>
            Sign in to sync your emergency contacts, safety PINs, and real-time trip tracking.
          </Text>

          {/* Primary Action: Google Sign In Button */}
          <TouchableOpacity
            onPress={() => setGoogleModalVisible(true)}
            style={[styles.googleSignInBtn, { backgroundColor: '#ffffff', borderColor: '#dadce0' }]}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
            disabled={loading}
          >
            {/* Google "G" 4-color Vector Emblem */}
            <View style={styles.googleGWrapper}>
              <Text style={styles.googleGText}>G</Text>
            </View>
            <Text style={styles.googleSignInText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.orDivider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
            <Text style={[styles.orText, { color: colors.muted }]}>OR SIGN IN WITH</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
          </View>

          {/* Provider Tabs */}
          <View style={[styles.tabBar, { backgroundColor: colors.surfaceSubtle }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('google')}
              style={[
                styles.tabBtn,
                activeTab === 'google' && { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 },
              ]}
            >
              <Text style={[styles.tabText, { color: activeTab === 'google' ? colors.signal : colors.muted }]}>
                Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('phone')}
              style={[
                styles.tabBtn,
                activeTab === 'phone' && { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 },
              ]}
            >
              <Text style={[styles.tabText, { color: activeTab === 'phone' ? colors.signal : colors.muted }]}>
                Phone & OTP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('email')}
              style={[
                styles.tabBtn,
                activeTab === 'email' && { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 },
              ]}
            >
              <Text style={[styles.tabText, { color: activeTab === 'email' ? colors.signal : colors.muted }]}>
                Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab 1: Google Quick Accounts */}
          {activeTab === 'google' && (
            <View style={styles.tabContent}>
              <Text style={[styles.sectionHeading, { color: colors.ink }]}>Choose a Google Account</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Select an account to instantly authenticate and link your emergency profile:
              </Text>

              {googleAccounts.map((acc, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleGoogleLogin(acc)}
                  style={[styles.accountOptionRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}
                >
                  <Image source={{ uri: acc.avatarUrl }} style={styles.accountAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accountName, { color: colors.ink }]}>{acc.name}</Text>
                    <Text style={[styles.accountEmail, { color: colors.muted }]}>{acc.email}</Text>
                  </View>
                  <ChevronRight size={16} color={colors.muted} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => setGoogleModalVisible(true)}
                style={[styles.addAnotherGoogleBtn, { borderColor: colors.line }]}
              >
                <User size={14} color={colors.signal} />
                <Text style={[styles.addAnotherGoogleText, { color: colors.signal }]}>
                  Use another Google account...
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tab 2: Phone & OTP */}
          {activeTab === 'phone' && (
            <View style={styles.tabContent}>
              <Text style={[styles.inputLabel, { color: colors.ink }]}>Indian Mobile Number</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="+91 98100 12345"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />

              {!otpSent ? (
                <TouchableOpacity
                  onPress={handleSendOtp}
                  style={[styles.actionSubmitBtn, { backgroundColor: colors.signal }]}
                >
                  <Text style={styles.actionSubmitText}>Send 6-Digit OTP</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={[styles.inputLabel, { color: colors.ink, marginTop: 10 }]}>6-Digit OTP Code</Text>
                  <TextInput
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="numeric"
                    maxLength={6}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        color: colors.ink,
                        borderColor: colors.line,
                        letterSpacing: 4,
                        textAlign: 'center',
                        fontWeight: '800',
                      },
                    ]}
                  />
                  <Text style={[styles.demoOtpNotice, { color: colors.safe }]}>
                    Demo Mode: 123456 is pre-filled for instant verification.
                  </Text>
                  <TouchableOpacity
                    onPress={handleVerifyPhoneOtp}
                    style={[styles.actionSubmitBtn, { backgroundColor: colors.signal }]}
                  >
                    <Text style={styles.actionSubmitText}>Verify & Sign In</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Tab 3: Email & Password */}
          {activeTab === 'email' && (
            <View style={styles.tabContent}>
              <Text style={[styles.inputLabel, { color: colors.ink }]}>Email Address</Text>
              <TextInput
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="user@example.com"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />

              <Text style={[styles.inputLabel, { color: colors.ink, marginTop: 10 }]}>Password</Text>
              <TextInput
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />

              <TouchableOpacity
                onPress={handleEmailLogin}
                style={[styles.actionSubmitBtn, { backgroundColor: colors.signal }]}
              >
                <Text style={styles.actionSubmitText}>Sign In with Email</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Instant Hackathon / Demo Evaluator Quick Login */}
        <TouchableOpacity
          onPress={handleQuickDemo}
          style={[styles.quickDemoCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <View style={[styles.quickDemoIconCircle, { backgroundColor: colors.cautionSubtle }]}>
            <Sparkles size={20} color={colors.caution} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.quickDemoTitle, { color: colors.ink }]}>
              Fast Demo / Evaluator Access
            </Text>
            <Text style={[styles.quickDemoDesc, { color: colors.muted }]}>
              Explore as Ananya Sharma with verified Delhi emergency contacts and pre-seeded safe routes.
            </Text>
          </View>
          <ArrowRight size={18} color={colors.signal} />
        </TouchableOpacity>

        {/* Skip to Map Link */}
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={styles.skipBtn}
        >
          <Text style={[styles.skipBtnText, { color: colors.muted }]}>
            Continue as Guest without signing in $\rightarrow$
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Interactive Google Sign-In Dialog Modal */}
      <Modal visible={googleModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.googleModalBox, { backgroundColor: '#ffffff' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.googleGWrapperSmall}>
                  <Text style={styles.googleGTextSmall}>G</Text>
                </View>
                <Text style={styles.googleModalBrand}>Sign in with Google</Text>
              </View>
              <TouchableOpacity onPress={() => setGoogleModalVisible(false)}>
                <X size={20} color="#5f6368" />
              </TouchableOpacity>
            </View>

            <Text style={styles.googleModalInstruction}>
              Choose an account to continue to <Text style={{ fontWeight: '700' }}>SafeRoute Delhi</Text>
            </Text>

            {/* List of accounts */}
            <View style={styles.modalAccountList}>
              {googleAccounts.map((acc, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleGoogleLogin(acc)}
                  style={styles.modalAccountItem}
                >
                  <Image source={{ uri: acc.avatarUrl }} style={styles.modalAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{acc.name}</Text>
                    <Text style={styles.modalEmail}>{acc.email}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customGoogleForm}>
              <Text style={styles.customFormLabel}>Or sign in with your own Google email:</Text>
              <TextInput
                value={customGoogleName}
                onChangeText={setCustomGoogleName}
                placeholder="Full Name (e.g., Shivam Kumar)"
                placeholderTextColor="#9aa0a6"
                style={styles.googleModalInput}
              />
              <TextInput
                value={customGoogleEmail}
                onChangeText={setCustomGoogleEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@gmail.com"
                placeholderTextColor="#9aa0a6"
                style={styles.googleModalInput}
              />
              <TouchableOpacity
                onPress={handleCustomGoogleSubmit}
                style={styles.googleModalSubmitBtn}
              >
                <Text style={styles.googleModalSubmitText}>Sign In & Authorize</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.googlePrivacyNotice}>
              To continue, Google will share your name, email address, and profile picture with SafeRoute.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollBody: { padding: 20, paddingBottom: 40 },
  brandContainer: { alignItems: 'center', marginTop: 16, marginBottom: 20 },
  logoShield: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  brandTagline: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(235, 110, 75, 0.1)',
    marginTop: 10,
  },
  pillBadgeText: { fontSize: 11, fontWeight: '700' },
  authCard: {
    padding: 20,
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  authCardTitle: { fontSize: 18, fontWeight: '800' },
  authCardSubtitle: { fontSize: 12, marginTop: 4, marginBottom: 16, lineHeight: 18 },
  googleSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  googleGWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleGText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleSignInText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3c4043',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 8,
  },
  dividerLine: { flex: 1, height: 1 },
  orText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: { fontSize: 12, fontWeight: '700' },
  tabContent: { marginTop: 4 },
  sectionHeading: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, marginBottom: 12 },
  accountOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  accountAvatar: { width: 38, height: 38, borderRadius: 19 },
  accountName: { fontSize: 13, fontWeight: '700' },
  accountEmail: { fontSize: 11, marginTop: 1 },
  addAnotherGoogleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addAnotherGoogleText: { fontSize: 12, fontWeight: '700' },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: 12,
  },
  actionSubmitBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  actionSubmitText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  demoOtpNotice: { fontSize: 11, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  quickDemoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    marginBottom: 16,
  },
  quickDemoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickDemoTitle: { fontSize: 14, fontWeight: '800' },
  quickDemoDesc: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipBtnText: { fontSize: 13, fontWeight: '600' },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  googleModalBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  googleGWrapperSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleGTextSmall: { fontSize: 16, fontWeight: '900', color: '#4285F4' },
  googleModalBrand: { fontSize: 16, fontWeight: '700', color: '#202124' },
  googleModalInstruction: { fontSize: 13, color: '#5f6368', marginBottom: 16 },
  modalAccountList: { marginBottom: 16 },
  modalAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8eaed',
    marginBottom: 8,
  },
  modalAvatar: { width: 36, height: 36, borderRadius: 18 },
  modalName: { fontSize: 13, fontWeight: '700', color: '#202124' },
  modalEmail: { fontSize: 11, color: '#5f6368' },
  customGoogleForm: {
    borderTopWidth: 1,
    borderTopColor: '#e8eaed',
    paddingTop: 14,
    marginBottom: 12,
  },
  customFormLabel: { fontSize: 12, fontWeight: '700', color: '#3c4043', marginBottom: 8 },
  googleModalInput: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dadce0',
    fontSize: 13,
    color: '#202124',
    marginBottom: 8,
  },
  googleModalSubmitBtn: {
    backgroundColor: '#1a73e8',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  googleModalSubmitText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  googlePrivacyNotice: { fontSize: 10, color: '#70757a', lineHeight: 14, textAlign: 'center' },
});

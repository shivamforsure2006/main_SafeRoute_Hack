import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Shield,
  Phone,
  Mail,
  Lock,
  Clock,
  Activity,
  Globe,
  Moon,
  Trash2,
  Edit2,
  Send,
  Plus,
  PlayCircle,
  MessageSquare,
  Share2,
  CheckCircle2,
  Database,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react-native';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useUserStore, useTripStore } from '@/store';
import { strings } from '@/i18n/strings';
import { TrustedContact } from '@/services/api';
import { appStorage } from '@/services/storage';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useUserStore();
  const trip = useTripStore();
  const isDarkMode = user.isDarkMode;
  const lang = user.language;
  const t = strings[lang] || strings.en;
  const colors = isDarkMode ? darkColors : lightColors;

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone);
  const [profileEmail, setProfileEmail] = useState(user.email || '');

  // PINs editing state
  const [normalPin, setNormalPin] = useState(user.normalPin);
  const [duressPin, setDuressPin] = useState(user.duressPin);

  // Timer custom input state
  const [customTimerInput, setCustomTimerInput] = useState(String(user.checkInTimeout));

  // Contact add / edit modal state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactRelation, setContactRelation] = useState('Friend');
  const [contactNotifySms, setContactNotifySms] = useState(true);
  const [contactNotifyEmail, setContactNotifyEmail] = useState(true);

  // Save Name & Phone & Email to local storage
  const handleSaveProfile = () => {
    if (!profileName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    if (!profilePhone.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }
    user.updateProfile({
      name: profileName.trim(),
      phone: profilePhone.trim(),
      email: profileEmail.trim(),
    });
    setIsEditingProfile(false);
    Alert.alert('Profile Saved', 'Your Name and Phone Number have been saved to local storage.');
  };

  // Save PINs to local storage
  const handleSavePins = () => {
    if (normalPin.length !== 4 || duressPin.length !== 4) {
      Alert.alert('Error', 'PINs must be exactly 4 digits.');
      return;
    }
    if (normalPin === duressPin) {
      Alert.alert('Error', 'Safety Code (Normal PIN) and Duress PIN must be different for security.');
      return;
    }
    user.updatePins(normalPin, duressPin);
    Alert.alert('Security Saved', 'Your Safety Code and Duress PIN are securely saved to local storage.');
  };

  // Save SOS message countdown timer
  const handleSelectTimer = (sec: number) => {
    user.setCheckInTimeout(sec);
    setCustomTimerInput(String(sec));
  };

  const handleSaveCustomTimer = () => {
    const parsed = parseInt(customTimerInput, 10);
    if (isNaN(parsed) || parsed < 10 || parsed > 300) {
      Alert.alert('Invalid Timer', 'Please enter a timer duration between 10 and 300 seconds.');
      return;
    }
    user.setCheckInTimeout(parsed);
    Alert.alert('Timer Updated', `SOS emergency message timer set to ${parsed} seconds (${(parsed / 60).toFixed(1)} min).`);
  };

  // Open modal to add contact
  const handleOpenAddContact = () => {
    setEditingContactId(null);
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setContactRelation('Friend');
    setContactNotifySms(true);
    setContactNotifyEmail(true);
    setContactModalOpen(true);
  };

  // Open modal to edit existing contact
  const handleOpenEditContact = (c: TrustedContact) => {
    setEditingContactId(c.id);
    setContactName(c.name);
    setContactPhone(c.phone);
    setContactEmail(c.email || '');
    setContactRelation(c.relationship || 'Friend');
    setContactNotifySms(c.notify_sms !== false);
    setContactNotifyEmail(c.notify_email !== false);
    setContactModalOpen(true);
  };

  // Save contact (add or update)
  const handleSaveContact = () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      Alert.alert('Required', 'Please enter contact name and phone number.');
      return;
    }

    if (editingContactId) {
      // Update existing contact
      user.updateContact(editingContactId, {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        email: contactEmail.trim(),
        relationship: contactRelation,
        notify_sms: contactNotifySms,
        notify_email: contactNotifyEmail,
      });
      Alert.alert('Contact Updated', `${contactName} updated and saved to local storage.`);
    } else {
      // Add new contact
      if (user.contacts.length >= 6) {
        Alert.alert('Limit Reached', 'You can register up to 6 trusted emergency contacts.');
        return;
      }
      user.addContact({
        name: contactName.trim(),
        phone: contactPhone.trim(),
        email: contactEmail.trim(),
        relationship: contactRelation,
        notify_sms: contactNotifySms,
        notify_email: contactNotifyEmail,
        notify_whatsapp: true,
      });
      Alert.alert('Contact Added', `${contactName} added and saved to local storage.`);
    }

    setContactModalOpen(false);
  };

  // Delete contact
  const handleDeleteContact = (id: string, name: string) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${name} from your trusted emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            user.removeContact(id);
          },
        },
      ]
    );
  };

  // Send test verification alert
  const handleSendTestMessage = async (c: TrustedContact) => {
    const channels: string[] = [];
    if (c.notify_sms !== false) channels.push(`SMS (${c.phone})`);
    if (c.email && c.notify_email !== false) channels.push(`Email (${c.email})`);

    const channelStr = channels.length > 0 ? channels.join(' & ') : `SMS (${c.phone})`;

    // Record test message log
    await appStorage.saveSentMessage({
      id: `test-${Date.now()}`,
      recipient: c.phone,
      recipient_name: c.name,
      channel: 'SMS',
      title: `Verification Test to ${c.name}`,
      content: `SafeRoute Test: ${user.name} tested their emergency alert channel with you. In case of an anomaly in Delhi, you will receive live GPS tracking links here.`,
      status: 'SENT',
      created_at: new Date().toISOString(),
    });

    Alert.alert(
      'Test Alert Dispatched',
      `Verification test dispatched to ${c.name} via ${channelStr}. This has been recorded in your Sent Alerts log.`
    );
  };

  // Simulate Anomaly Alert right now
  const handleSimulateAnomaly = () => {
    trip.triggerCheckIn('Test Anomaly: Unscheduled 2-minute stationary stop detected');
    Alert.alert(
      'Anomaly Alert Triggered',
      `A safety check-in has started with vibration! If you do not enter Safety Code ${user.normalPin} within ${user.checkInTimeout}s, emergency SOS alerts will be dispatched to your trusted contacts.`
    );
  };

  // Reset all to defaults
  const handleResetDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Reset name, contacts, PINs, and timer back to Delhi default demo data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            user.resetToDefaults();
            setProfileName('Ananya Sharma');
            setProfilePhone('+919810012345');
            setProfileEmail('ananya.sharma@example.com');
            setNormalPin('1234');
            setDuressPin('9999');
            setCustomTimerInput('60');
            Alert.alert('Reset Complete', 'Default settings restored and saved.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        <View>
          <Text style={[styles.title, { color: colors.ink }]}>{user.name}</Text>
          <Text style={[styles.sub, { color: colors.muted }]}>
            {user.phone} • {user.email || 'Delhi NCR'}
          </Text>
        </View>

        <View style={styles.headerBtnGroup}>
          <TouchableOpacity
            onPress={() => router.push('/guided-demo')}
            style={[styles.guidedDemoBtn, { backgroundColor: colors.signal }]}
            accessibilityRole="button"
            accessibilityLabel="Run guided demo walkthrough"
          >
            <PlayCircle size={15} color="#ffffff" />
            <Text style={styles.guidedDemoText}>Demo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Local Storage Intact Indicator */}
        <View style={[styles.storageBadgeBanner, { backgroundColor: colors.safeSubtle, borderColor: colors.safe }]}>
          <Database size={16} color={colors.safe} />
          <Text style={[styles.storageBadgeText, { color: colors.safe }]}>
            Persisted in Local Storage: All profile details, trusted contacts, and emergency timers remain intact on this device.
          </Text>
        </View>

        {/* Quick Links: Sent Alerts */}
        <TouchableOpacity
          onPress={() => router.push('/sent-messages')}
          style={[styles.alertLogBanner, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}
        >
          <View style={styles.alertLogIconText}>
            <MessageSquare size={18} color={colors.signal} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertLogTitle, { color: colors.ink }]}>Sent Emergency Alerts Log</Text>
              <Text style={[styles.alertLogSub, { color: colors.muted }]}>
                Review dispatched SMS, Email & WhatsApp emergency alerts
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Section 1: User Profile Customisation (Name & Phone Number & Email) */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <User size={18} color={colors.signal} />
              <Text style={[styles.cardTitle, { color: colors.ink }]}>User Profile</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditingProfile(!isEditingProfile)}
              style={[styles.smallActionBtn, { backgroundColor: colors.surfaceSubtle }]}
            >
              <Edit2 size={13} color={colors.signal} />
              <Text style={[styles.smallActionText, { color: colors.signal }]}>
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditingProfile ? (
            <View style={styles.editProfileForm}>
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Full Name</Text>
              <TextInput
                value={profileName}
                onChangeText={setProfileName}
                placeholder="Your Name (e.g., Ananya Sharma)"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Phone Number</Text>
              <TextInput
                value={profilePhone}
                onChangeText={setProfilePhone}
                placeholder="Phone (+91 98100 12345)"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Email Address (for Emergency Notifications)</Text>
              <TextInput
                value={profileEmail}
                onChangeText={setProfileEmail}
                placeholder="Email (e.g., ananya@example.com)"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />

              <TouchableOpacity
                onPress={handleSaveProfile}
                style={[styles.saveBtn, { backgroundColor: colors.signal }]}
              >
                <CheckCircle2 size={16} color="#ffffff" />
                <Text style={styles.saveBtnText}>Save Profile to Storage</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.profileSummaryRow}>
              <View style={styles.profileDataCol}>
                <Text style={[styles.profileLabel, { color: colors.muted }]}>Name</Text>
                <Text style={[styles.profileValue, { color: colors.ink }]}>{user.name}</Text>
              </View>
              <View style={styles.profileDataCol}>
                <Text style={[styles.profileLabel, { color: colors.muted }]}>Phone</Text>
                <Text style={[styles.profileValue, { color: colors.ink }]}>{user.phone}</Text>
              </View>
              {user.email ? (
                <View style={styles.profileDataCol}>
                  <Text style={[styles.profileLabel, { color: colors.muted }]}>Email</Text>
                  <Text style={[styles.profileValue, { color: colors.ink }]}>{user.email}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Section 2: Anomaly & SOS Message Countdown Timer (Customisable) */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeaderLeft}>
            <Clock size={18} color={colors.danger} />
            <Text style={[styles.cardTitle, { color: colors.ink }]}>
              SOS Message Timer ({user.checkInTimeout}s / {(user.checkInTimeout / 60).toFixed(1)} min)
            </Text>
          </View>

          <Text style={[styles.cardExplainer, { color: colors.muted }]}>
            When an anomaly (route deviation, unusual stop) is detected, SafeRoute alerts you with{' '}
            <Text style={{ fontWeight: '700', color: colors.ink }}>vibration</Text>. If you do not enter your Safety Code within this timer, an emergency SOS is dispatched to your trusted contacts via{' '}
            <Text style={{ fontWeight: '700', color: colors.signal }}>Email & SMS</Text>.
          </Text>

          {/* Preset Pills */}
          <View style={styles.timerPillsRow}>
            {[
              { label: '30s', value: 30 },
              { label: '60s (1 min - Recommended)', value: 60 },
              { label: '90s', value: 90 },
              { label: '120s (2 min)', value: 120 },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => handleSelectTimer(item.value)}
                style={[
                  styles.timerPill,
                  {
                    backgroundColor:
                      user.checkInTimeout === item.value ? colors.ink : colors.surfaceSubtle,
                    borderColor:
                      user.checkInTimeout === item.value ? colors.ink : colors.line,
                  },
                ]}
              >
                <Text
                  style={{
                    color: user.checkInTimeout === item.value ? '#ffffff' : colors.ink,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom seconds input */}
          <View style={styles.customTimerRow}>
            <Text style={[styles.customTimerLabel, { color: colors.ink }]}>Custom Seconds:</Text>
            <TextInput
              value={customTimerInput}
              onChangeText={setCustomTimerInput}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor={colors.muted}
              style={[
                styles.customTimerInput,
                { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line },
              ]}
            />
            <TouchableOpacity
              onPress={handleSaveCustomTimer}
              style={[styles.customTimerBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}
            >
              <Text style={[styles.customTimerBtnText, { color: colors.ink }]}>Set</Text>
            </TouchableOpacity>
          </View>

          {/* Simulate Anomaly Button */}
          <TouchableOpacity
            onPress={handleSimulateAnomaly}
            style={[styles.simulateAnomalyBtn, { backgroundColor: colors.cautionSubtle, borderColor: colors.caution }]}
          >
            <AlertTriangle size={15} color={colors.caution} />
            <Text style={[styles.simulateAnomalyText, { color: colors.caution }]}>
              Test Anomaly Vibration & Countdown Alert
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section 3: Trusted Emergency Contacts (Add, Edit, Delete, Email/SMS) */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Phone size={18} color={colors.signal} />
              <Text style={[styles.cardTitle, { color: colors.ink }]}>
                Trusted Contacts ({user.contacts.length}/6)
              </Text>
            </View>
            {user.contacts.length < 6 && (
              <TouchableOpacity
                onPress={handleOpenAddContact}
                style={[styles.addBtnSmall, { backgroundColor: colors.signal }]}
              >
                <Plus size={14} color="#ffffff" />
                <Text style={styles.addBtnText}>Add Contact</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.cardExplainer, { color: colors.muted, marginBottom: 12 }]}>
            These contacts will receive emergency SOS alerts via Email & SMS when an anomaly is detected and not disarmed.
          </Text>

          {user.contacts.map((c) => (
            <View key={c.id} style={[styles.contactCardItem, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}>
              <View style={styles.contactHeaderLine}>
                <View>
                  <Text style={[styles.contactName, { color: colors.ink }]}>{c.name}</Text>
                  <Text style={[styles.contactMeta, { color: colors.muted }]}>
                    {c.relationship} • {c.phone}
                  </Text>
                  {c.email ? (
                    <Text style={[styles.contactEmail, { color: colors.signal }]}>
                      ✉️ {c.email}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.contactActions}>
                  <TouchableOpacity
                    onPress={() => handleSendTestMessage(c)}
                    style={[styles.iconActionBtn, { backgroundColor: colors.surface }]}
                    accessibilityLabel="Send test alert"
                  >
                    <Send size={13} color={colors.signal} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenEditContact(c)}
                    style={[styles.iconActionBtn, { backgroundColor: colors.surface }]}
                    accessibilityLabel="Edit contact"
                  >
                    <Edit2 size={13} color={colors.ink} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteContact(c.id, c.name)}
                    style={[styles.iconActionBtn, { backgroundColor: colors.surface }]}
                    accessibilityLabel="Delete contact"
                  >
                    <Trash2 size={13} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notification Badges */}
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.channelBadge,
                    { backgroundColor: c.notify_sms !== false ? colors.safeSubtle : colors.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.channelBadgeText,
                      { color: c.notify_sms !== false ? colors.safe : colors.muted },
                    ]}
                  >
                    📱 SMS: {c.notify_sms !== false ? 'Enabled' : 'Off'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.channelBadge,
                    { backgroundColor: c.notify_email !== false && c.email ? colors.safeSubtle : colors.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.channelBadgeText,
                      { color: c.notify_email !== false && c.email ? colors.safe : colors.muted },
                    ]}
                  >
                    ✉️ Email: {c.notify_email !== false && c.email ? 'Enabled' : 'Off'}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* Add / Edit Contact Form Modal */}
          {contactModalOpen && (
            <View style={[styles.addContactForm, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}>
              <Text style={[styles.formHeading, { color: colors.ink }]}>
                {editingContactId ? 'Edit Trusted Contact' : 'Add Trusted Contact'}
              </Text>

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Contact Name</Text>
              <TextInput
                placeholder="Full Name (e.g., Mom, Priya)"
                placeholderTextColor={colors.muted}
                value={contactName}
                onChangeText={setContactName}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.ink, borderColor: colors.line }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Phone Number (for SMS Alerts)</Text>
              <TextInput
                placeholder="Phone (+91 98111 22233)"
                placeholderTextColor={colors.muted}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.ink, borderColor: colors.line }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Email Address (for Email Alerts)</Text>
              <TextInput
                placeholder="Email (e.g., priya@example.com)"
                placeholderTextColor={colors.muted}
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.ink, borderColor: colors.line }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Relationship</Text>
              <View style={styles.relationPills}>
                {['Parent', 'Spouse', 'Friend', 'Sibling', 'Colleague'].map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    onPress={() => setContactRelation(rel)}
                    style={[
                      styles.relationPill,
                      {
                        backgroundColor: contactRelation === rel ? colors.ink : colors.surface,
                        borderColor: contactRelation === rel ? colors.ink : colors.line,
                      },
                    ]}
                  >
                    <Text style={{ color: contactRelation === rel ? '#ffffff' : colors.ink, fontSize: 11, fontWeight: '700' }}>
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notification Toggle Row */}
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.ink }]}>Send SOS via SMS</Text>
                <Switch
                  value={contactNotifySms}
                  onValueChange={setContactNotifySms}
                  trackColor={{ false: colors.line, true: colors.signal }}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.ink }]}>Send SOS via Email</Text>
                <Switch
                  value={contactNotifyEmail}
                  onValueChange={setContactNotifyEmail}
                  trackColor={{ false: colors.line, true: colors.signal }}
                />
              </View>

              <View style={styles.formBtnRow}>
                <TouchableOpacity
                  onPress={() => setContactModalOpen(false)}
                  style={[styles.formCancelBtn, { borderColor: colors.line }]}
                >
                  <Text style={{ color: colors.muted, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveContact}
                  style={[styles.formSaveBtn, { backgroundColor: colors.signal }]}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    {editingContactId ? 'Update Contact' : 'Save Contact'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Section 4: Safety Code (Normal PIN) & Silent Duress PIN */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeaderLeft}>
            <Lock size={18} color={colors.signal} />
            <Text style={[styles.cardTitle, { color: colors.ink }]}>Safety Code & Security PINs</Text>
          </View>

          <Text style={[styles.cardExplainer, { color: colors.muted }]}>
            Your 4-digit Safety Code is required to dismiss the anomaly countdown before the timer sends an SOS.
            The Duress PIN silently alerts police and contacts under coercion.
          </Text>

          <View style={styles.pinInputsRow}>
            <View style={styles.pinInputCol}>
              <Text style={[styles.pinLabel, { color: colors.ink }]}>Safety Code (Normal PIN)</Text>
              <TextInput
                value={normalPin}
                onChangeText={setNormalPin}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                style={[styles.pinInput, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />
              <Text style={[styles.pinHint, { color: colors.muted }]}>Cancels anomaly alert</Text>
            </View>

            <View style={styles.pinInputCol}>
              <Text style={[styles.pinLabel, { color: colors.danger }]}>Silent Duress PIN</Text>
              <TextInput
                value={duressPin}
                onChangeText={setDuressPin}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                style={[styles.pinInput, { backgroundColor: colors.dangerSubtle, color: colors.danger, borderColor: colors.danger }]}
              />
              <Text style={[styles.pinHint, { color: colors.danger }]}>Silently sends SOS</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSavePins}
            style={[styles.savePinsBtn, { backgroundColor: colors.signal }]}
          >
            <Text style={styles.savePinsText}>Save Security PINs to Storage</Text>
          </TouchableOpacity>
        </View>

        {/* Section 5: App Preferences (Language, Theme) */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.ink, marginBottom: 14 }]}>App Preferences</Text>

          {/* Language Switch */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Globe size={16} color={colors.muted} />
              <Text style={[styles.settingLabel, { color: colors.ink }]}>Language / भाषा</Text>
            </View>
            <View style={styles.timeoutPills}>
              <TouchableOpacity
                onPress={() => user.setLanguage('en')}
                style={[styles.timeoutPill, { backgroundColor: lang === 'en' ? colors.ink : colors.surfaceSubtle }]}
              >
                <Text style={{ color: lang === 'en' ? '#ffffff' : colors.ink, fontSize: 12, fontWeight: '700' }}>
                  English
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => user.setLanguage('hi')}
                style={[styles.timeoutPill, { backgroundColor: lang === 'hi' ? colors.ink : colors.surfaceSubtle }]}
              >
                <Text style={{ color: lang === 'hi' ? '#ffffff' : colors.ink, fontSize: 12, fontWeight: '700' }}>
                  हिंदी
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          {/* Dark Mode */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Moon size={16} color={colors.muted} />
              <Text style={[styles.settingLabel, { color: colors.ink }]}>Dark Theme</Text>
            </View>
            <Switch
              value={user.isDarkMode}
              onValueChange={user.toggleDarkMode}
              trackColor={{ false: colors.line, true: colors.signal }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Section 6: Reset / Restore */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.ink, marginBottom: 8 }]}>Storage & Diagnostics</Text>
          <Text style={[styles.privacyNotice, { color: colors.muted }]}>
            All customizations are stored on your local device. You can reset to standard Delhi defaults at any time.
          </Text>

          <TouchableOpacity
            onPress={handleResetDefaults}
            style={[styles.resetDefaultsBtn, { borderColor: colors.line }]}
          >
            <RotateCcw size={15} color={colors.muted} />
            <Text style={[styles.resetDefaultsText, { color: colors.muted }]}>Reset to Demo Defaults</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 2 },
  headerBtnGroup: { flexDirection: 'row', gap: 8 },
  guidedDemoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  guidedDemoText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  scrollBody: { padding: 18, paddingBottom: 50 },
  storageBadgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  storageBadgeText: { fontSize: 11, fontWeight: '600', flex: 1, lineHeight: 16 },
  alertLogBanner: {
    padding: 14,
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertLogIconText: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertLogTitle: { fontSize: 14, fontWeight: '700' },
  alertLogSub: { fontSize: 12, marginTop: 2 },
  card: {
    padding: 18,
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardExplainer: { fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 14 },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  smallActionText: { fontSize: 12, fontWeight: '700' },
  profileSummaryRow: { marginTop: 6, gap: 8 },
  profileDataCol: { marginBottom: 4 },
  profileLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: '700' },
  profileValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  editProfileForm: { marginTop: 6 },
  inputLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  timerPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  timerPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  customTimerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  customTimerLabel: { fontSize: 13, fontWeight: '600' },
  customTimerInput: {
    width: 70,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  customTimerBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, borderWidth: 1 },
  customTimerBtnText: { fontSize: 12, fontWeight: '700' },
  simulateAnomalyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  simulateAnomalyText: { fontSize: 12, fontWeight: '700' },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  contactCardItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  contactHeaderLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  contactName: { fontSize: 14, fontWeight: '700' },
  contactMeta: { fontSize: 12, marginTop: 2 },
  contactEmail: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  contactActions: { flexDirection: 'row', gap: 6 },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  channelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  channelBadgeText: { fontSize: 10, fontWeight: '700' },
  addContactForm: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  formHeading: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  relationPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  relationPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  switchLabel: { fontSize: 13, fontWeight: '600' },
  formBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  formCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1 },
  formSaveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  pinInputsRow: { flexDirection: 'row', gap: 16, marginTop: 4, marginBottom: 12 },
  pinInputCol: { flex: 1 },
  pinLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  pinInput: {
    paddingVertical: 10,
    textAlign: 'center',
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 4,
  },
  pinHint: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  savePinsBtn: { paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  savePinsText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  timeoutPills: { flexDirection: 'row', gap: 6 },
  timeoutPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  divider: { height: 1, marginVertical: 6 },
  privacyNotice: { fontSize: 12, lineHeight: 18, marginBottom: 14 },
  resetDefaultsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetDefaultsText: { fontSize: 12, fontWeight: '700' },
});

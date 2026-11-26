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
  Modal,
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
  Plus,
  MessageSquare,
  CheckCircle2,
  Database,
  RotateCcw,
  X,
  Send,
  AlertCircle,
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

  // Save Name, Phone & Email directly to browser local storage
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
    Alert.alert('Profile Saved', 'Your name, phone number, and email have been saved to browser local storage.');
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

  // Save contact (add or update) to local storage
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
      if (user.contacts.length >= 8) {
        Alert.alert('Limit Reached', 'You can register up to 8 trusted emergency contacts.');
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

  // Delete contact from local storage
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

  // Reset profile to clean defaults
  const handleResetDefaults = () => {
    Alert.alert(
      'Reset Local Data',
      'Reset all profile details, contacts, PINs, and timer back to default values?',
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
            Alert.alert('Reset Complete', 'Default local profile restored.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.signal }]}>
            <User size={22} color="#ffffff" />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.ink }]}>{user.name}</Text>
            <Text style={[styles.sub, { color: colors.muted }]}>
              {user.phone} {user.email ? `• ${user.email}` : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/sent-messages')}
          style={[styles.headerActionBtn, { backgroundColor: colors.surfaceSubtle }]}
          accessibilityRole="button"
          accessibilityLabel="View sent alert messages"
        >
          <MessageSquare size={16} color={colors.signal} />
          <Text style={[styles.headerActionText, { color: colors.signal }]}>Alerts</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Local Storage Status Banner */}
        <View style={[styles.storageBadgeBanner, { backgroundColor: colors.safeSubtle, borderColor: colors.safe }]}>
          <Database size={16} color={colors.safe} />
          <Text style={[styles.storageBadgeText, { color: colors.safe }]}>
            Browser Local Storage Active: All personal details, emergency contacts, Safety PINs, and timers are securely persisted locally in your browser.
          </Text>
        </View>

        {/* Section 1: User Profile Customisation (Name & Phone Number & Email) */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <User size={18} color={colors.signal} />
              <Text style={[styles.cardTitle, { color: colors.ink }]}>Personal Profile</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditingProfile(!isEditingProfile)}
              style={[styles.smallActionBtn, { backgroundColor: colors.surfaceSubtle }]}
            >
              <Edit2 size={13} color={colors.signal} />
              <Text style={[styles.smallActionText, { color: colors.signal }]}>
                {isEditingProfile ? 'Cancel' : 'Edit Info'}
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

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Email Address (for SOS Dispatches)</Text>
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
                <Text style={styles.saveBtnText}>Save to Browser LocalStorage</Text>
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
              <View style={styles.profileDataCol}>
                <Text style={[styles.profileLabel, { color: colors.muted }]}>Email</Text>
                <Text style={[styles.profileValue, { color: colors.ink }]}>{user.email || 'Not configured'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Section 2: Anomaly & SOS Message Countdown Timer (Customisable) */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeaderLeft}>
            <Clock size={18} color={colors.danger} />
            <Text style={[styles.cardTitle, { color: colors.ink }]}>
              Anomaly SOS Timer ({user.checkInTimeout}s / {(user.checkInTimeout / 60).toFixed(1)} min)
            </Text>
          </View>

          <Text style={[styles.cardExplainer, { color: colors.muted }]}>
            When an anomaly (route deviation, stationary stop) occurs during a live trip, SafeRoute prompts you with an alert and starts this countdown. If you do not stop or dismiss it within this time, emergency SOS alerts are dispatched to your trusted contacts via Email & SMS.
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
                    backgroundColor: user.checkInTimeout === item.value ? colors.signal : colors.surfaceSubtle,
                    borderColor: user.checkInTimeout === item.value ? colors.signal : colors.line,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.timerPillText,
                    { color: user.checkInTimeout === item.value ? '#ffffff' : colors.ink },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom seconds input */}
          <View style={styles.customTimerRow}>
            <Text style={[styles.customTimerLabel, { color: colors.muted }]}>Custom Duration (seconds):</Text>
            <View style={styles.customTimerInputGroup}>
              <TextInput
                value={customTimerInput}
                onChangeText={setCustomTimerInput}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor={colors.muted}
                style={[styles.customTimerInput, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />
              <TouchableOpacity
                onPress={handleSaveCustomTimer}
                style={[styles.customTimerSaveBtn, { backgroundColor: colors.signal }]}
              >
                <Text style={styles.customTimerSaveBtnText}>Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section 3: Trusted Emergency Contacts (Keep, Remove, Edit) */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Phone size={18} color={colors.safe} />
              <Text style={[styles.cardTitle, { color: colors.ink }]}>
                Trusted Contacts ({user.contacts.length})
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleOpenAddContact}
              style={[styles.addContactBtn, { backgroundColor: colors.signal }]}
            >
              <Plus size={14} color="#ffffff" />
              <Text style={styles.addContactBtnText}>Add Contact</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardExplainer, { color: colors.muted }]}>
            These contacts will receive immediate SMS & Email alerts containing your live GPS tracking link when an anomaly timer expires or panic SOS is triggered.
          </Text>

          {user.contacts.map((c) => (
            <View
              key={c.id}
              style={[styles.contactCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}
            >
              <View style={styles.contactInfoRow}>
                <View style={styles.contactTextCol}>
                  <View style={styles.contactNameRow}>
                    <Text style={[styles.contactName, { color: colors.ink }]}>{c.name}</Text>
                    <View style={[styles.relationBadge, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                      <Text style={[styles.relationText, { color: colors.muted }]}>{c.relationship || 'Contact'}</Text>
                    </View>
                  </View>

                  <Text style={[styles.contactPhone, { color: colors.muted }]}>📞 {c.phone}</Text>
                  {c.email ? (
                    <Text style={[styles.contactEmail, { color: colors.muted }]}>✉️ {c.email}</Text>
                  ) : null}

                  {/* Channel Notification Badges */}
                  <View style={styles.channelsRow}>
                    <View style={[styles.channelChip, { backgroundColor: c.notify_sms !== false ? 'rgba(34, 197, 94, 0.15)' : colors.surface }]}>
                      <Text style={[styles.channelChipText, { color: c.notify_sms !== false ? colors.safe : colors.muted }]}>
                        {c.notify_sms !== false ? '✓ SMS' : '✕ SMS'}
                      </Text>
                    </View>
                    <View style={[styles.channelChip, { backgroundColor: c.notify_email !== false && c.email ? 'rgba(16, 185, 129, 0.15)' : colors.surface }]}>
                      <Text style={[styles.channelChipText, { color: c.notify_email !== false && c.email ? colors.signal : colors.muted }]}>
                        {c.notify_email !== false && c.email ? '✓ Email' : '✕ Email'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Edit & Remove Action Buttons */}
                <View style={styles.contactActionsCol}>
                  <TouchableOpacity
                    onPress={() => handleOpenEditContact(c)}
                    style={[styles.contactIconBtn, { backgroundColor: colors.surface }]}
                    accessibilityLabel={`Edit ${c.name}`}
                  >
                    <Edit2 size={14} color={colors.signal} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteContact(c.id, c.name)}
                    style={[styles.contactIconBtn, { backgroundColor: colors.surface }]}
                    accessibilityLabel={`Remove ${c.name}`}
                  >
                    <Trash2 size={14} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Section 4: Security PINs */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeaderLeft}>
            <Lock size={18} color={colors.signal} />
            <Text style={[styles.cardTitle, { color: colors.ink }]}>Security PIN Codes</Text>
          </View>

          <Text style={[styles.cardExplainer, { color: colors.muted }]}>
            Use your <Text style={{ fontWeight: '700', color: colors.safe }}>Safety Code</Text> to dismiss check-ins. Use your secret <Text style={{ fontWeight: '700', color: colors.danger }}>Duress PIN</Text> if forced by an assailant to silence your phone (it visually dismisses the modal but triggers silent SOS in background).
          </Text>

          <View style={styles.pinsFormRow}>
            <View style={styles.pinFieldCol}>
              <Text style={[styles.inputLabel, { color: colors.safe }]}>Safety Code (Normal PIN)</Text>
              <TextInput
                value={normalPin}
                onChangeText={setNormalPin}
                maxLength={4}
                keyboardType="number-pad"
                secureTextEntry
                placeholder="1234"
                placeholderTextColor={colors.muted}
                style={[styles.pinInput, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />
            </View>

            <View style={styles.pinFieldCol}>
              <Text style={[styles.inputLabel, { color: colors.danger }]}>Duress PIN (Coercion)</Text>
              <TextInput
                value={duressPin}
                onChangeText={setDuressPin}
                maxLength={4}
                keyboardType="number-pad"
                secureTextEntry
                placeholder="9999"
                placeholderTextColor={colors.muted}
                style={[styles.pinInput, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSavePins}
            style={[styles.saveBtn, { backgroundColor: colors.signal, marginTop: 12 }]}
          >
            <CheckCircle2 size={16} color="#ffffff" />
            <Text style={styles.saveBtnText}>Save Security PINs</Text>
          </TouchableOpacity>
        </View>

        {/* Section 5: Preferences (Dark Theme & Language) */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeaderLeft}>
            <Moon size={18} color={colors.signal} />
            <Text style={[styles.cardTitle, { color: colors.ink }]}>Display & Theme</Text>
          </View>

          {/* Dark Emerald Mode Toggle */}
          <View style={styles.prefRow}>
            <View>
              <Text style={[styles.prefTitle, { color: colors.ink }]}>Dark Emerald Mode</Text>
              <Text style={[styles.prefSub, { color: colors.muted }]}>
                High-contrast night safety theme
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={user.toggleDarkMode}
              trackColor={{ false: colors.line, true: colors.signal }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Language Toggle */}
          <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }]}>
            <View>
              <Text style={[styles.prefTitle, { color: colors.ink }]}>Language / भाषा</Text>
              <Text style={[styles.prefSub, { color: colors.muted }]}>
                {user.language === 'en' ? 'English' : 'हिंदी (Hindi)'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => user.setLanguage(user.language === 'en' ? 'hi' : 'en')}
              style={[styles.langBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}
            >
              <Globe size={14} color={colors.signal} />
              <Text style={[styles.langBtnText, { color: colors.signal }]}>
                {user.language === 'en' ? 'हिंदी' : 'English'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reset All Local Data Button */}
        <TouchableOpacity
          onPress={handleResetDefaults}
          style={[styles.resetBtn, { borderColor: colors.line }]}
        >
          <RotateCcw size={14} color={colors.muted} />
          <Text style={[styles.resetBtnText, { color: colors.muted }]}>Reset to Initial Demo Data</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal: Add or Edit Trusted Contact */}
      <Modal visible={contactModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>
                {editingContactId ? 'Edit Trusted Contact' : 'Add Trusted Contact'}
              </Text>
              <TouchableOpacity onPress={() => setContactModalOpen(false)}>
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Name</Text>
              <TextInput
                value={contactName}
                onChangeText={setContactName}
                placeholder="Contact Name (e.g., Priya Singh)"
                placeholderTextColor={colors.muted}
                style={[styles.input, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Phone Number (Receives SMS Alerts)</Text>
              <TextInput
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Email Address (Receives Email Alerts)</Text>
              <TextInput
                value={contactEmail}
                onChangeText={setContactEmail}
                placeholder="contact@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Relationship</Text>
              <View style={styles.relationPillsRow}>
                {['Parent', 'Sibling', 'Spouse', 'Friend', 'Colleague'].map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    onPress={() => setContactRelation(rel)}
                    style={[
                      styles.relPill,
                      {
                        backgroundColor: contactRelation === rel ? colors.signal : colors.surfaceSubtle,
                        borderColor: contactRelation === rel ? colors.signal : colors.line,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.relPillText,
                        { color: contactRelation === rel ? '#ffffff' : colors.ink },
                      ]}
                    >
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.notifyTogglesRow}>
                <View style={styles.notifyToggleItem}>
                  <Text style={[styles.notifyToggleText, { color: colors.ink }]}>SMS Alert</Text>
                  <Switch
                    value={contactNotifySms}
                    onValueChange={setContactNotifySms}
                    trackColor={{ false: colors.line, true: colors.safe }}
                  />
                </View>

                <View style={styles.notifyToggleItem}>
                  <Text style={[styles.notifyToggleText, { color: colors.ink }]}>Email Alert</Text>
                  <Switch
                    value={contactNotifyEmail}
                    onValueChange={setContactNotifyEmail}
                    trackColor={{ false: colors.line, true: colors.signal }}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSaveContact}
                style={[styles.saveBtn, { backgroundColor: colors.signal, marginTop: 16 }]}
              >
                <CheckCircle2 size={16} color="#ffffff" />
                <Text style={styles.saveBtnText}>
                  {editingContactId ? 'Update Contact' : 'Save Contact'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  sub: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  storageBadgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  storageBadgeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardExplainer: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 12,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  profileSummaryRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 6,
  },
  profileDataCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  profileLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  editProfileForm: {
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  timerPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  timerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  timerPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  customTimerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  customTimerInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customTimerInput: {
    width: 64,
    textAlign: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  customTimerSaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  customTimerSaveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addContactBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  contactCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  contactInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
  },
  relationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  relationText: {
    fontSize: 10,
    fontWeight: '600',
  },
  contactPhone: {
    fontSize: 12,
  },
  contactEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  channelsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  channelChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  channelChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contactActionsCol: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  contactIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinsFormRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pinFieldCol: {
    flex: 1,
  },
  pinInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  prefSub: {
    fontSize: 11,
    marginTop: 2,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  relationPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  relPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  relPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notifyTogglesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  notifyToggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifyToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

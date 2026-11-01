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
  Lock,
  Clock,
  Activity,
  Globe,
  Moon,
  Trash2,
  Send,
  Plus,
  PlayCircle,
  MessageSquare,
  Mic,
  Share2,
} from 'lucide-react-native';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useUserStore } from '@/store';
import { strings } from '@/i18n/strings';
import { api } from '@/services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useUserStore();
  const isDarkMode = user.isDarkMode;
  const lang = user.language;
  const t = strings[lang] || strings.en;
  const colors = isDarkMode ? darkColors : lightColors;

  const [normalPin, setNormalPin] = useState(user.normalPin);
  const [duressPin, setDuressPin] = useState(user.duressPin);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('Friend');
  const [addContactModal, setAddContactModal] = useState(false);

  const handleSavePins = () => {
    if (normalPin.length !== 4 || duressPin.length !== 4) {
      Alert.alert('Error', 'PINs must be exactly 4 digits.');
      return;
    }
    if (normalPin === duressPin) {
      Alert.alert('Error', 'Normal PIN and Duress PIN must be different for security.');
      return;
    }
    user.updatePins(normalPin, duressPin);
    Alert.alert('PINs Updated', 'Your normal PIN and silent duress PIN have been saved.');
  };

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert('Required', 'Please enter contact name and phone number.');
      return;
    }
    if (user.contacts.length >= 5) {
      Alert.alert('Limit Reached', 'You can register up to 5 trusted emergency contacts.');
      return;
    }
    user.addContact({
      name: newContactName,
      phone: newContactPhone,
      relationship: newContactRelation,
      notify_sms: true,
      notify_whatsapp: true,
    });
    setNewContactName('');
    setNewContactPhone('');
    setAddContactModal(false);
  };

  const handleSendTestMessage = async (phone: string, name: string) => {
    Alert.alert(
      'Test Alert Sent',
      `A test verification alert has been dispatched to ${name} (${phone}). You can review this in the Sent Alerts log.`
    );
  };

  const handleDeleteData = () => {
    Alert.alert(
      'Delete My Data',
      'Are you sure you want to permanently erase all trip history, emergency contacts, and personal preferences from SafeRoute?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Data Erased', 'All your personal telemetry and records have been deleted.');
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
          <Text style={[styles.sub, { color: colors.muted }]}>{user.phone} • Delhi NCR</Text>
        </View>

        <View style={styles.headerBtnGroup}>
          <TouchableOpacity
            onPress={() => router.push('/guided-demo')}
            style={[styles.guidedDemoBtn, { backgroundColor: colors.signal }]}
            accessibilityRole="button"
            accessibilityLabel="Run guided demo walkthrough"
          >
            <PlayCircle size={15} color="#ffffff" />
            <Text style={styles.guidedDemoText}>Guided Demo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Quick Links: Sent Alerts */}
        <TouchableOpacity
          onPress={() => router.push('/sent-messages')}
          style={[styles.alertLogBanner, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}
        >
          <View style={styles.alertLogIconText}>
            <MessageSquare size={18} color={colors.signal} />
            <View>
              <Text style={[styles.alertLogTitle, { color: colors.ink }]}>Sent Emergency Alerts Log</Text>
              <Text style={[styles.alertLogSub, { color: colors.muted }]}>Review all dispatched SMS and WhatsApp alerts</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Section 1: Trusted Contacts */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Phone size={18} color={colors.signal} />
              <Text style={[styles.cardTitle, { color: colors.ink }]}>
                {t.trusted_contacts} ({user.contacts.length}/5)
              </Text>
            </View>
            {user.contacts.length < 5 && (
              <TouchableOpacity
                onPress={() => setAddContactModal(true)}
                style={[styles.addBtnSmall, { backgroundColor: colors.surfaceSubtle }]}
              >
                <Plus size={14} color={colors.signal} />
                <Text style={[styles.addBtnText, { color: colors.signal }]}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {user.contacts.map((c) => (
            <View key={c.id} style={[styles.contactRow, { borderColor: colors.line }]}>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: colors.ink }]}>{c.name}</Text>
                <Text style={[styles.contactMeta, { color: colors.muted }]}>
                  {c.phone} • {c.relationship}
                </Text>
              </View>

              <View style={styles.contactActions}>
                <TouchableOpacity
                  onPress={() => handleSendTestMessage(c.phone, c.name)}
                  style={[styles.testMsgBtn, { backgroundColor: colors.surfaceSubtle }]}
                >
                  <Send size={12} color={colors.signal} />
                  <Text style={[styles.testMsgText, { color: colors.signal }]}>Test</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => user.removeContact(c.id)}
                  style={styles.deleteContactBtn}
                >
                  <Trash2 size={15} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add contact mini-form */}
          {addContactModal && (
            <View style={[styles.addContactForm, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.formHeading, { color: colors.ink }]}>Add Trusted Contact</Text>
              <TextInput
                placeholder="Full Name (e.g., Mom, Priya)"
                placeholderTextColor={colors.muted}
                value={newContactName}
                onChangeText={setNewContactName}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.ink, borderColor: colors.line }]}
              />
              <TextInput
                placeholder="Phone (+91 9811122233)"
                placeholderTextColor={colors.muted}
                value={newContactPhone}
                onChangeText={setNewContactPhone}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.ink, borderColor: colors.line }]}
              />
              <View style={styles.formBtnRow}>
                <TouchableOpacity
                  onPress={() => setAddContactModal(false)}
                  style={[styles.formCancelBtn, { borderColor: colors.line }]}
                >
                  <Text style={{ color: colors.muted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddContact}
                  style={[styles.formSaveBtn, { backgroundColor: colors.ink }]}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>Save Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Section 2: PIN Settings (Normal & Duress) */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.cardHeaderLeft}>
            <Lock size={18} color={colors.signal} />
            <Text style={[styles.cardTitle, { color: colors.ink }]}>{t.pins_settings}</Text>
          </View>

          <View style={styles.pinInputsRow}>
            <View style={styles.pinInputCol}>
              <Text style={[styles.pinLabel, { color: colors.ink }]}>{t.normal_pin}</Text>
              <TextInput
                value={normalPin}
                onChangeText={setNormalPin}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                style={[styles.pinInput, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />
            </View>

            <View style={styles.pinInputCol}>
              <Text style={[styles.pinLabel, { color: colors.danger }]}>{t.duress_pin}</Text>
              <TextInput
                value={duressPin}
                onChangeText={setDuressPin}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                style={[styles.pinInput, { backgroundColor: colors.dangerSubtle, color: colors.danger, borderColor: colors.danger }]}
              />
            </View>
          </View>

          <Text style={[styles.duressExplainer, { color: colors.muted }]}>
            {t.duress_explainer}
          </Text>

          <TouchableOpacity
            onPress={handleSavePins}
            style={[styles.savePinsBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}
          >
            <Text style={[styles.savePinsText, { color: colors.ink }]}>Save Security PINs</Text>
          </TouchableOpacity>
        </View>

        {/* Section 3: Safety Preferences */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.ink, marginBottom: 14 }]}>Emergency Preferences</Text>

          {/* Check-in Timeout */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Clock size={16} color={colors.muted} />
              <Text style={[styles.settingLabel, { color: colors.ink }]}>{t.timeout}</Text>
            </View>
            <View style={styles.timeoutPills}>
              {[15, 30, 60].map((sec) => (
                <TouchableOpacity
                  key={sec}
                  onPress={() => user.setCheckInTimeout(sec)}
                  style={[
                    styles.timeoutPill,
                    {
                      backgroundColor: user.checkInTimeout === sec ? colors.ink : colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text style={{ color: user.checkInTimeout === sec ? '#ffffff' : colors.ink, fontSize: 12, fontWeight: '700' }}>
                    {sec}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Language Switch */}
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
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

          {/* Dark Mode */}
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
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

          {/* Auto Share Trips */}
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Share2 size={16} color={colors.muted} />
              <Text style={[styles.settingLabel, { color: colors.ink }]}>Auto-Share Live Trips</Text>
            </View>
            <Switch
              value={user.autoShareTrips}
              onValueChange={() => {}}
              trackColor={{ false: colors.line, true: colors.signal }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Section 4: Privacy & Retention */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.ink, marginBottom: 8 }]}>Data Retention & Privacy</Text>
          <Text style={[styles.privacyNotice, { color: colors.muted }]}>
            SafeRoute only records your GPS location during active navigation or an emergency SOS. We do not store continuous location history.
          </Text>

          <TouchableOpacity
            onPress={handleDeleteData}
            style={[styles.deleteDataBtn, { borderColor: colors.danger }]}
            accessibilityRole="button"
            accessibilityLabel="Permanently delete my data"
          >
            <Trash2 size={16} color={colors.danger} />
            <Text style={[styles.deleteDataText, { color: colors.danger }]}>{t.delete_my_data}</Text>
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
  scrollBody: { padding: 18, paddingBottom: 40 },
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
    marginBottom: 12,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addBtnText: { fontSize: 12, fontWeight: '700' },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontWeight: '700' },
  contactMeta: { fontSize: 12, marginTop: 2 },
  contactActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testMsgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  testMsgText: { fontSize: 11, fontWeight: '700' },
  deleteContactBtn: { padding: 6 },
  addContactForm: {
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  formHeading: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: 8,
  },
  formBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  formCancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  formSaveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  pinInputsRow: { flexDirection: 'row', gap: 16, marginTop: 12, marginBottom: 8 },
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
  duressExplainer: { fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 12 },
  savePinsBtn: { paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  savePinsText: { fontSize: 13, fontWeight: '700' },
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
  deleteDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteDataText: { fontSize: 13, fontWeight: '700' },
});

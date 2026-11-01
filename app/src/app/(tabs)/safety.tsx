import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import {
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
  ThumbsUp,
  Flag,
  Lightbulb,
  Building2,
  Users,
  MapPin,
  X,
  AlertTriangle,
} from 'lucide-react-native';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useUserStore, useTripStore } from '@/store';
import { api, IncidentReport } from '@/services/api';
import { strings } from '@/i18n/strings';

export default function SafetyScreen() {
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const lang = useUserStore((s) => s.language);
  const t = strings[lang] || strings.en;
  const colors = isDarkMode ? darkColors : lightColors;

  const isVolunteer = useUserStore((s) => s.isVolunteer);
  const volunteerAvailable = useUserStore((s) => s.volunteerAvailable);
  const toggleVolunteer = useUserStore((s) => s.toggleVolunteer);

  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // New report form state
  const [category, setCategory] = useState('poor_lighting');
  const [severity, setSeverity] = useState(2);
  const [locationLabel, setLocationLabel] = useState('Connaught Place Outer Circle, Delhi');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const list = await api.fetchReports();
    if (list && list.length > 0) {
      setReports(list);
    } else {
      // Fallback demo reports for instant visual richness
      setReports([
        {
          id: 'demo-rep-1',
          category: 'poor_lighting',
          severity: 2,
          lat: 28.636,
          lng: 77.214,
          address_label: 'Paharganj back alley near NDLS North',
          description: 'Street lights non-functional for past 3 nights.',
          confirmations_count: 5,
          flags_count: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: 'demo-rep-2',
          category: 'harassment',
          severity: 3,
          lat: 28.6385,
          lng: 77.218,
          address_label: 'Underpass near New Delhi Rly Station',
          description: 'Unsafe catcalling and absence of security guards.',
          confirmations_count: 8,
          flags_count: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: 'demo-rep-3',
          category: 'isolated_area',
          severity: 2,
          lat: 28.552,
          lng: 77.198,
          address_label: 'Hauz Khas Village back entrance walkway',
          description: 'Dark walkway with very low late night footfall.',
          confirmations_count: 3,
          flags_count: 0,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleConfirmReport = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, confirmations_count: r.confirmations_count + 1 } : r))
    );
  };

  const handleFlagReport = (id: string) => {
    Alert.alert('Report Flagged', 'Thank you. If 3 users flag this report, it will be automatically hidden.');
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextFlags = r.flags_count + 1;
          return { ...r, flags_count: nextFlags };
        }
        return r;
      }).filter((r) => r.flags_count < 3)
    );
  };

  const handleSubmitNewReport = async () => {
    if (!description.trim()) {
      Alert.alert('Required', 'Please add a brief description of the safety hazard.');
      return;
    }

    const payload = {
      category,
      severity,
      lat: 28.6328,
      lng: 77.2197,
      address_label: locationLabel,
      description,
      is_anonymous: isAnonymous,
      user_id: useUserStore.getState().id,
    };

    await api.submitReport(payload);
    
    // Add locally to immediate display
    const newRep: IncidentReport = {
      id: `rep-${Date.now()}`,
      category,
      severity,
      lat: 28.6328,
      lng: 77.2197,
      address_label: locationLabel,
      description,
      confirmations_count: 1,
      flags_count: 0,
      created_at: new Date().toISOString(),
    };

    setReports([newRep, ...reports]);
    setReportModalOpen(false);
    setDescription('');
    Alert.alert('Report Submitted', 'Your report has been logged and will immediately adjust nearby route safety scores.');
  };

  const categories = [
    { key: 'poor_lighting', label: t.poor_lighting },
    { key: 'harassment', label: t.harassment },
    { key: 'isolated_area', label: t.isolated_area },
    { key: 'unsafe_crowd', label: t.unsafe_crowd },
    { key: 'stray_animals', label: t.stray_animals },
    { key: 'road_hazard', label: t.road_hazard },
  ];

  const filteredReports = filterCategory
    ? reports.filter((r) => r.category === filterCategory)
    : reports;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        <View>
          <Text style={[styles.title, { color: colors.ink }]}>Delhi Safety & Community</Text>
          <Text style={[styles.sub, { color: colors.muted }]}>Verified safe havens & community reports</Text>
        </View>

        <TouchableOpacity
          onPress={() => setReportModalOpen(true)}
          style={[styles.addReportBtn, { backgroundColor: colors.danger }]}
          accessibilityRole="button"
          accessibilityLabel="Report an unsafe spot"
        >
          <PlusCircle size={16} color="#ffffff" />
          <Text style={styles.addReportText}>Report Spot</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Volunteer Responder Opt-In Card */}
        <View style={[styles.volunteerCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.volHeader}>
            <View style={styles.volIconText}>
              <Users size={20} color={colors.signal} />
              <View>
                <Text style={[styles.volTitle, { color: colors.ink }]}>{t.volunteer_optin}</Text>
                <Text style={[styles.volSub, { color: colors.muted }]}>{t.volunteer_sub}</Text>
              </View>
            </View>
            <Switch
              value={volunteerAvailable}
              onValueChange={toggleVolunteer}
              trackColor={{ false: colors.line, true: colors.signal }}
              thumbColor="#ffffff"
            />
          </View>
          {volunteerAvailable && (
            <View style={[styles.volActiveBox, { backgroundColor: colors.safeSubtle, borderColor: colors.safe }]}>
              <ShieldCheck size={16} color={colors.safe} />
              <Text style={[styles.volActiveText, { color: colors.ink }]}>
                Active on Delhi volunteer radar. If you respond to an alert: always call 112 first and never confront anyone alone.
              </Text>
            </View>
          )}
        </View>

        {/* Safe Havens Quick Counts */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Building2 size={20} color={colors.safe} />
            <Text style={[styles.statNum, { color: colors.ink }]}>15+</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Police Stations</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <ShieldCheck size={20} color={colors.safe} />
            <Text style={[styles.statNum, { color: colors.ink }]}>12+</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>24x7 Hospitals</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Users size={20} color={colors.signal} />
            <Text style={[styles.statNum, { color: colors.ink }]}>15</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Active Volunteers</Text>
          </View>
        </View>

        {/* Hazard Category Filter Chips */}
        <Text style={[styles.sectionHeading, { color: colors.ink }]}>Recent Hazard Reports</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilterCategory(null)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filterCategory === null ? colors.ink : colors.surface,
                borderColor: colors.line,
              },
            ]}
          >
            <Text style={{ color: filterCategory === null ? '#ffffff' : colors.ink, fontSize: 12, fontWeight: '600' }}>
              All ({reports.length})
            </Text>
          </TouchableOpacity>

          {categories.map((c) => (
            <TouchableOpacity
              key={c.key}
              onPress={() => setFilterCategory(c.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filterCategory === c.key ? colors.ink : colors.surface,
                  borderColor: colors.line,
                },
              ]}
            >
              <Text style={{ color: filterCategory === c.key ? '#ffffff' : colors.ink, fontSize: 12, fontWeight: '600' }}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Reports List */}
        {filteredReports.map((report) => (
          <View
            key={report.id}
            style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <View style={styles.reportHeader}>
              <View style={[styles.categoryPill, { backgroundColor: colors.dangerSubtle, borderColor: colors.danger }]}>
                <AlertTriangle size={12} color={colors.danger} />
                <Text style={[styles.categoryText, { color: colors.danger }]}>
                  {report.category.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.severityBadge, { color: colors.muted }]}>
                Severity {report.severity}/3
              </Text>
            </View>

            <Text style={[styles.reportAddress, { color: colors.ink }]}>
              {report.address_label || 'Delhi Location'}
            </Text>
            <Text style={[styles.reportDesc, { color: colors.muted }]}>{report.description}</Text>

            <View style={[styles.reportDivider, { backgroundColor: colors.line }]} />

            <View style={styles.reportFooter}>
              <TouchableOpacity
                onPress={() => handleConfirmReport(report.id)}
                style={[styles.confirmBtn, { backgroundColor: colors.surfaceSubtle }]}
                accessibilityLabel="Confirm this report"
              >
                <ThumbsUp size={14} color={colors.safe} />
                <Text style={[styles.confirmText, { color: colors.safe }]}>
                  I've seen this ({report.confirmations_count})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleFlagReport(report.id)}
                style={styles.flagBtn}
                accessibilityLabel="Flag inappropriate report"
              >
                <Flag size={14} color={colors.muted} />
                <Text style={[styles.flagText, { color: colors.muted }]}>Flag</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Report Unsafe Spot Modal */}
      <Modal visible={reportModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>{t.report_unsafe_spot}</Text>
              <TouchableOpacity onPress={() => setReportModalOpen(false)}>
                <X size={22} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category selector */}
              <Text style={[styles.inputLabel, { color: colors.ink }]}>{t.category}</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    style={[
                      styles.catSelectBtn,
                      {
                        backgroundColor: category === cat.key ? colors.ink : colors.surfaceSubtle,
                        borderColor: category === cat.key ? colors.ink : colors.line,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catSelectText,
                        { color: category === cat.key ? '#ffffff' : colors.ink },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Severity Level */}
              <Text style={[styles.inputLabel, { color: colors.ink, marginTop: 14 }]}>
                {t.severity}
              </Text>
              <View style={styles.severityRow}>
                {[1, 2, 3].map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => setSeverity(lvl)}
                    style={[
                      styles.severityBtn,
                      {
                        backgroundColor:
                          severity === lvl
                            ? lvl === 3
                              ? colors.danger
                              : lvl === 2
                              ? colors.caution
                              : colors.safe
                            : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: severity === lvl ? '#ffffff' : colors.ink,
                        fontWeight: '700',
                      }}
                    >
                      {lvl === 1 ? t.severity_low : lvl === 2 ? t.severity_med : t.severity_high}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Location Input */}
              <Text style={[styles.inputLabel, { color: colors.ink, marginTop: 14 }]}>Location</Text>
              <TextInput
                value={locationLabel}
                onChangeText={setLocationLabel}
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />

              {/* Description Input */}
              <Text style={[styles.inputLabel, { color: colors.ink, marginTop: 14 }]}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the condition (e.g. unlit road, broken street lamps, stalking)..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                style={[styles.textArea, { backgroundColor: colors.surfaceSubtle, color: colors.ink, borderColor: colors.line }]}
              />

              {/* Anonymous Toggle */}
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.ink }]}>{t.anonymous}</Text>
                <Switch
                  value={isAnonymous}
                  onValueChange={setIsAnonymous}
                  trackColor={{ false: colors.line, true: colors.signal }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmitNewReport}
                style={[styles.submitReportBtn, { backgroundColor: colors.danger }]}
              >
                <Text style={styles.submitReportBtnText}>{t.submit_report}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addReportText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  scrollBody: { padding: 18, paddingBottom: 40 },
  volunteerCard: {
    padding: 16,
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    marginBottom: 16,
  },
  volHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  volIconText: { flexDirection: 'row', gap: 10, flex: 1, paddingRight: 10 },
  volTitle: { fontSize: 15, fontWeight: '700' },
  volSub: { fontSize: 12, marginTop: 2 },
  volActiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  volActiveText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNum: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 11, textAlign: 'center' },
  sectionHeading: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 14 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  reportCard: {
    padding: 16,
    borderRadius: themeTokens.radii.card,
    borderWidth: 1,
    marginBottom: 12,
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: { fontSize: 11, fontWeight: '700' },
  severityBadge: { fontSize: 12, fontWeight: '600' },
  reportAddress: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  reportDesc: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  reportDivider: { height: 1, marginVertical: 10 },
  reportFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confirmText: { fontSize: 12, fontWeight: '700' },
  flagBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  flagText: { fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 31, 59, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  catSelectText: { fontSize: 12, fontWeight: '600' },
  severityRow: { flexDirection: 'row', gap: 10 },
  severityBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  textInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  textArea: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
  },
  switchLabel: { fontSize: 14, fontWeight: '600' },
  submitReportBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitReportBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});

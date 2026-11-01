import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Lightbulb, Store, Building2, AlertTriangle, Moon, Info } from 'lucide-react-native';
import { RouteAlternative } from '@/services/api';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useUserStore } from '@/store';
import { ScoreRing } from '@/components/ui/ScoreRing';

interface BreakdownSheetProps {
  route: RouteAlternative | null;
  visible: boolean;
  onClose: () => void;
}

export function BreakdownSheet({ route, visible, onClose }: BreakdownSheetProps) {
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;

  if (!route) return null;

  const { breakdown } = route;

  const renderMetricBar = (label: string, value: number, icon: any, color: string, unit = '/ 100') => {
    const IconComp = icon;
    const clampedWidth = Math.max(0, Math.min(100, value));
    return (
      <View style={styles.metricContainer}>
        <View style={styles.metricLabelRow}>
          <View style={styles.iconLabel}>
            <IconComp size={16} color={color} />
            <Text style={[styles.metricLabel, { color: colors.ink }]}>{label}</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.ink }]}>
            {Math.round(value)} {unit}
          </Text>
        </View>
        <View style={[styles.barBackground, { backgroundColor: colors.line }]}>
          <View
            style={[
              styles.barFill,
              { width: `${clampedWidth}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.ink }]}>Safety Score Breakdown</Text>
              <Text style={[styles.sheetSub, { color: colors.muted }]}>{route.title} Analysis</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
              accessibilityLabel="Close breakdown sheet"
            >
              <X size={20} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={[styles.scoreHero, { backgroundColor: colors.surfaceSubtle }]}>
              <ScoreRing score={route.safety_score} size={70} strokeWidth={6} />
              <View style={styles.heroTextContainer}>
                <Text style={[styles.heroHeading, { color: colors.ink }]}>Overall {route.safety_score}/100</Text>
                <Text style={[styles.heroSub, { color: colors.muted }]}>{route.one_line_reason}</Text>
              </View>
            </View>

            <View style={styles.factorsSection}>
              <Text style={[styles.sectionTitle, { color: colors.ink }]}>Core Safety Features</Text>

              {renderMetricBar('Street Lighting & Poles', breakdown.lighting, Lightbulb, '#e0a21b')}
              {renderMetricBar('Commercial Activity & Transit', breakdown.activity, Store, '#3b4cca')}
              {renderMetricBar('Police & Hospital Density', breakdown.help_density, Building2, '#1f9d6b')}
              {renderMetricBar('Incident Deduction', breakdown.incident_penalty, AlertTriangle, '#d9453d')}

              {breakdown.night_multiplier < 1.0 && (
                <View style={[styles.nightNote, { backgroundColor: colors.cautionSubtle, borderColor: colors.caution }]}>
                  <Moon size={16} color={colors.caution} />
                  <Text style={[styles.nightText, { color: colors.ink }]}>
                    Night multiplier active (0.7x applied to raw scores due to reduced visibility).
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.honestNoteCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}>
              <Info size={18} color={colors.signal} style={styles.infoIcon} />
              <View style={styles.honestTextWrap}>
                <Text style={[styles.honestTitle, { color: colors.ink }]}>How is this calculated?</Text>
                <Text style={[styles.honestDesc, { color: colors.muted }]}>
                  SafeRoute weights OSM infrastructure (30% lighting, 25% footfall, 20% emergency help) minus recent verified hazards.
                  Our scores dynamically improve as Delhi commuters report unlit stretches or hazards.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 31, 59, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: themeTokens.radii.sheet,
    borderTopRightRadius: themeTokens.radii.sheet,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sheetSub: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  scoreHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroHeading: {
    fontSize: 17,
    fontWeight: '700',
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  factorsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  metricContainer: {
    marginBottom: 14,
  },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  barBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  nightNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  nightText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  honestNoteCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  infoIcon: {
    marginTop: 2,
  },
  honestTextWrap: {
    flex: 1,
  },
  honestTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  honestDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
});

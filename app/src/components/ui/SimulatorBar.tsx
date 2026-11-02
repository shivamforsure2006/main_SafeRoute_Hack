import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Play, Square, CornerDownRight, Hand, Zap, Activity, ChevronDown, ChevronUp } from 'lucide-react-native';
import { lightColors, darkColors } from '@/theme/tokens';
import { useSimulatorStore } from '@/store/simulator';
import { useUserStore } from '@/store';

export function SimulatorBar() {
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;

  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = useSimulatorStore((s) => s.isActive);
  const speedMultiplier = useSimulatorStore((s) => s.speedMultiplier);
  const startSimulation = useSimulatorStore((s) => s.startSimulation);
  const stopSimulation = useSimulatorStore((s) => s.stopSimulation);
  const setSpeedMultiplier = useSimulatorStore((s) => s.setSpeedMultiplier);
  const triggerDeviate = useSimulatorStore((s) => s.triggerDeviate);
  const triggerStop3Min = useSimulatorStore((s) => s.triggerStop3Min);
  const triggerSpeedSpike = useSimulatorStore((s) => s.triggerSpeedSpike);
  const triggerShake = useSimulatorStore((s) => s.triggerShake);

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? colors.surface : '#1b1f3b' }]}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => setIsCollapsed(!isCollapsed)}
          style={styles.titleBadge}
          accessibilityRole="button"
          accessibilityLabel="Toggle simulator controls"
        >
          <Text style={styles.badgeText}>SIMULATOR</Text>
          {isCollapsed ? <ChevronDown size={11} color="#ffffff" /> : <ChevronUp size={11} color="#ffffff" />}
        </TouchableOpacity>

        <View style={styles.speedGroup}>
          {([1, 5, 10] as const).map((spd) => (
            <TouchableOpacity
              key={spd}
              onPress={() => setSpeedMultiplier(spd)}
              style={[
                styles.speedPill,
                {
                  backgroundColor: speedMultiplier === spd ? colors.signal : 'rgba(255,255,255,0.15)',
                },
              ]}
            >
              <Text style={styles.speedText}>{spd}x</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={isActive ? stopSimulation : startSimulation}
          style={[styles.playBtn, { backgroundColor: isActive ? colors.danger : colors.safe }]}
          accessibilityRole="button"
          accessibilityLabel={isActive ? 'Stop simulation' : 'Simulate walk'}
        >
          {isActive ? <Square size={13} color="#ffffff" /> : <Play size={13} color="#ffffff" />}
          <Text style={styles.playText}>{isActive ? 'Stop' : 'Simulate'}</Text>
        </TouchableOpacity>
      </View>

      {/* Simulator Trigger Buttons (collapsible) */}
      {!isCollapsed && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.triggerRow}>
          <TouchableOpacity
            onPress={triggerDeviate}
            style={[styles.triggerBtn, { borderColor: colors.caution }]}
            accessibilityLabel="Simulate route deviation"
          >
            <CornerDownRight size={13} color={colors.caution} />
            <Text style={[styles.triggerBtnText, { color: '#ffffff' }]}>Deviate &gt;150m</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={triggerStop3Min}
            style={[styles.triggerBtn, { borderColor: colors.caution }]}
            accessibilityLabel="Simulate 3 minute unusual stop"
          >
            <Hand size={13} color={colors.caution} />
            <Text style={[styles.triggerBtnText, { color: '#ffffff' }]}>Stop 3 mins</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={triggerSpeedSpike}
            style={[styles.triggerBtn, { borderColor: colors.danger }]}
            accessibilityLabel="Simulate speed jump"
          >
            <Zap size={13} color={colors.danger} />
            <Text style={[styles.triggerBtnText, { color: '#ffffff' }]}>Speed Spike</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={triggerShake}
            style={[styles.triggerBtn, { borderColor: colors.danger }]}
            accessibilityLabel="Simulate shake / fall spike"
          >
            <Activity size={13} color={colors.danger} />
            <Text style={[styles.triggerBtnText, { color: '#ffffff' }]}>Shake / Fall</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  speedGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  speedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  speedText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  playText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  triggerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  triggerBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Shield, AlertTriangle, Lightbulb, Store, Building2 } from 'lucide-react-native';
import { RouteAlternative, IncidentReport } from '@/services/api';
import { lightColors, darkColors } from '@/theme/tokens';
import { useTripStore, useUserStore } from '@/store';

interface SafeMapViewProps {
  selectedRoute: RouteAlternative | null;
  routes: RouteAlternative[];
  currentLocation: { lat: number; lng: number };
  reports?: IncidentReport[];
}

export function SafeMapView({ selectedRoute, routes, currentLocation, reports = [] }: SafeMapViewProps) {
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const colors = isDarkMode ? darkColors : lightColors;
  const status = useTripStore((s) => s.status);
  const isSos = status === 'SOS_ACTIVE';

  const showStreetLights = useTripStore((s) => s.showStreetLights);
  const showOpenShops = useTripStore((s) => s.showOpenShops);
  const showSafeHavens = useTripStore((s) => s.showSafeHavens);
  const showHeatmap = useTripStore((s) => s.showHeatmap);

  // Fallback high-contrast visual interactive representation for web & native
  // If native Maps is installed, we conditionally load react-native-maps
  let NativeMapView: any = null;
  let NativeMarker: any = null;
  let NativePolyline: any = null;
  let NativeCircle: any = null;

  if (Platform.OS !== 'web') {
    try {
      const Maps = require('react-native-maps');
      NativeMapView = Maps.default;
      NativeMarker = Maps.Marker;
      NativePolyline = Maps.Polyline;
      NativeCircle = Maps.Circle;
    } catch (e) {
      // Graceful fallback to styled vector layout
    }
  }

  // Curated Delhi Safe Havens
  const delhiSafeHavens = [
    { name: 'Connaught Place Police Station', lat: 28.6315, lng: 77.2167, type: 'police' },
    { name: 'Parliament Street Police Post', lat: 28.6234, lng: 77.2112, type: 'police' },
    { name: 'AIIMS Emergency & Trauma', lat: 28.5672, lng: 77.2100, type: 'hospital' },
    { name: 'Safdarjung Hospital', lat: 28.5695, lng: 77.2075, type: 'hospital' },
    { name: 'Hauz Khas Police Station', lat: 28.5489, lng: 77.2058, type: 'police' },
    { name: 'India Gate Police Post', lat: 28.6128, lng: 77.2295, type: 'police' },
  ];

  if (NativeMapView && Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <NativeMapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: 28.6139,
            longitude: 77.2090,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
          showsCompass={false}
          showsUserLocation={false}
        >
          {/* User Location Marker */}
          <NativeMarker
            coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }}
            title={isSos ? 'EMERGENCY SOS ACTIVE' : 'Your Location'}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.liveMarkerDot,
                {
                  backgroundColor: isSos ? colors.danger : colors.signal,
                  borderColor: '#ffffff',
                },
              ]}
            />
          </NativeMarker>

          {/* Unselected alternative routes (thin grey) */}
          {routes
            .filter((r) => r.id !== selectedRoute?.id)
            .map((r) => (
              <NativePolyline
                key={`alt-${r.id}`}
                coordinates={r.geometry.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))}
                strokeColor={colors.muted}
                strokeWidth={3}
                lineDashPattern={[4, 6]}
              />
            ))}

          {/* Selected Route Colored Segments */}
          {selectedRoute?.segments?.map((seg, idx) => {
            const segColor =
              seg.category === 'safe'
                ? colors.safe
                : seg.category === 'caution'
                ? colors.caution
                : colors.danger;
            return (
              <NativePolyline
                key={`seg-${idx}`}
                coordinates={seg.coordinates.map(([lat, lng]) => ({
                  latitude: lat,
                  longitude: lng,
                }))}
                strokeColor={segColor}
                strokeWidth={6}
              />
            );
          })}

          {/* Weakest Stretch Marker */}
          {selectedRoute?.weakest_stretch && (
            <NativeMarker
              coordinate={{
                latitude: selectedRoute.weakest_stretch.start_lat,
                longitude: selectedRoute.weakest_stretch.start_lng,
              }}
              title="Weakest Stretch"
              description={selectedRoute.weakest_stretch.reason}
            >
              <View style={[styles.weakStretchPin, { backgroundColor: colors.caution }]}>
                <AlertTriangle size={14} color="#ffffff" />
              </View>
            </NativeMarker>
          )}

          {/* Safe Havens Layer */}
          {showSafeHavens &&
            delhiSafeHavens.map((h, i) => (
              <NativeMarker
                key={`haven-${i}`}
                coordinate={{ latitude: h.lat, longitude: h.lng }}
                title={h.name}
              >
                <View style={[styles.poiBadge, { backgroundColor: colors.safe }]}>
                  <Shield size={12} color="#ffffff" />
                </View>
              </NativeMarker>
            ))}

          {/* Incident Heatmap Layer */}
          {showHeatmap &&
            reports.map((rep, idx) => (
              <NativeCircle
                key={`heat-${idx}`}
                center={{ latitude: rep.lat, longitude: rep.lng }}
                radius={200}
                fillColor={rep.severity >= 3 ? 'rgba(217, 69, 61, 0.35)' : 'rgba(224, 162, 27, 0.25)'}
                strokeColor="transparent"
              />
            ))}
        </NativeMapView>
      </View>
    );
  }

  // Cross-platform vector interactive view for Web & simulated environments
  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#13172e' : '#eef2f5' }]}>
      {/* Delhi Map Canvas Simulation Grid */}
      <View style={styles.mapGridPattern}>
        <View style={[styles.delhiRingRoad, { borderColor: isDarkMode ? '#242a4d' : '#d5dbe3' }]} />
        <View style={[styles.delhiInnerRing, { borderColor: isDarkMode ? '#2b3361' : '#c9d1dd' }]} />
      </View>

      {/* Delhi Landmarks Callouts */}
      <View style={[styles.landmarkLabel, { top: '22%', left: '46%' }]}>
        <Text style={[styles.landmarkText, { color: colors.muted }]}>Connaught Place</Text>
      </View>
      <View style={[styles.landmarkLabel, { top: '48%', left: '55%' }]}>
        <Text style={[styles.landmarkText, { color: colors.muted }]}>India Gate</Text>
      </View>
      <View style={[styles.landmarkLabel, { top: '78%', left: '38%' }]}>
        <Text style={[styles.landmarkText, { color: colors.muted }]}>Hauz Khas</Text>
      </View>

      {/* Live User Location Dot */}
      <View
        style={[
          styles.simUserDot,
          {
            backgroundColor: isSos ? colors.danger : colors.signal,
            borderColor: '#ffffff',
            transform: [{ scale: isSos ? 1.25 : 1 }],
          },
        ]}
      >
        <View
          style={[
            styles.simPulseRing,
            { borderColor: isSos ? colors.danger : colors.signal },
          ]}
        />
      </View>

      {/* Weakest stretch indicator pill */}
      {selectedRoute?.weakest_stretch && (
        <View
          style={[
            styles.simWeakestPill,
            { backgroundColor: colors.surface, borderColor: colors.caution },
          ]}
        >
          <AlertTriangle size={14} color={colors.caution} />
          <Text style={[styles.simWeakestText, { color: colors.ink }]} numberOfLines={1}>
            Weakest Stretch: {selectedRoute.weakest_stretch.reason}
          </Text>
        </View>
      )}

      {/* Layer Icons overlay */}
      {showSafeHavens && (
        <View style={[styles.simHavenMarker, { top: '35%', left: '42%', backgroundColor: colors.safe }]}>
          <Shield size={12} color="#ffffff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  liveMarkerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  weakStretchPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  poiBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  mapGridPattern: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delhiRingRoad: {
    width: '88%',
    height: '70%',
    borderRadius: 180,
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  delhiInnerRing: {
    position: 'absolute',
    width: '45%',
    height: '35%',
    borderRadius: 100,
    borderWidth: 2,
  },
  landmarkLabel: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  landmarkText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  simUserDot: {
    position: 'absolute',
    top: '32%',
    left: '49%',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  simPulseRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    opacity: 0.4,
  },
  simWeakestPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 20,
  },
  simWeakestText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  simHavenMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
});

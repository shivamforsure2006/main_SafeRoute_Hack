import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import {
  Search,
  Moon,
  Footprints,
  Car,
  Layers,
  MapPin,
  Compass,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react-native';
import { SafeMapView } from '@/components/Map/SafeMapView';
import { RouteCard } from '@/components/ui/RouteCard';
import { BreakdownSheet } from '@/components/ui/BreakdownSheet';
import { TripHUD } from '@/components/ui/TripHUD';
import { SOSButton } from '@/components/ui/SOSButton';
import { CheckInModal } from '@/components/ui/CheckInModal';
import { CalmSOSModal } from '@/components/ui/CalmSOSModal';
import { SimulatorBar } from '@/components/ui/SimulatorBar';
import { useShakeDetection } from '@/hooks/useShakeDetection';
import { lightColors, darkColors, themeTokens } from '@/theme/tokens';
import { useTripStore, useUserStore } from '@/store';
import { api, RouteAlternative } from '@/services/api';
import { strings } from '@/i18n/strings';

export default function MapScreen() {
  const isDarkMode = useUserStore((s) => s.isDarkMode);
  const lang = useUserStore((s) => s.language);
  const t = strings[lang] || strings.en;
  const colors = isDarkMode ? darkColors : lightColors;

  const status = useTripStore((s) => s.status);
  const origin = useTripStore((s) => s.origin);
  const destination = useTripStore((s) => s.destination);
  const travelMode = useTripStore((s) => s.travelMode);
  const isNightPreview = useTripStore((s) => s.isNightPreview);
  const routes = useTripStore((s) => s.routes);
  const selectedRoute = useTripStore((s) => s.selectedRoute);
  const currentLocation = useTripStore((s) => s.currentLocation);

  const setOrigin = useTripStore((s) => s.setOrigin);
  const setDestination = useTripStore((s) => s.setDestination);
  const setTravelMode = useTripStore((s) => s.setTravelMode);
  const toggleNightPreview = useTripStore((s) => s.toggleNightPreview);
  const setRoutes = useTripStore((s) => s.setRoutes);
  const selectRoute = useTripStore((s) => s.selectRoute);
  const startTrip = useTripStore((s) => s.startTrip);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [breakdownRoute, setBreakdownRoute] = useState<RouteAlternative | null>(null);
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);

  // Activate hardware accelerometer shake detection
  useShakeDetection();

  // Load default routes on mount (Connaught Place to India Gate)
  useEffect(() => {
    fetchRoutes(origin, destination, travelMode, isNightPreview);
  }, [travelMode, isNightPreview]);

  const fetchRoutes = async (
    orig: { lat: number; lng: number },
    dest: { lat: number; lng: number },
    mode: string,
    night: boolean
  ) => {
    setIsSearching(true);
    const plan = await api.planRoutes(orig, dest, mode, night);
    setRoutes(plan);
    setIsSearching(false);
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setIsSearching(true);
    const results = await api.geocodeSearch(searchQuery);
    setSearchResults(results);
    setIsSearching(false);

    if (results.length > 0) {
      const top = results[0];
      setDestination({ name: top.name, lat: top.lat, lng: top.lng });
      fetchRoutes(origin, { lat: top.lat, lng: top.lng }, travelMode, isNightPreview);
      setSearchResults([]);
    }
  };

  const setPresetDestination = (name: string, lat: number, lng: number) => {
    setDestination({ name, lat, lng });
    fetchRoutes(origin, { lat, lng }, travelMode, isNightPreview);
    setSearchQuery('');
  };

  const isTripActive = status === 'ACTIVE';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.paper }]}>
      {/* Top Search & Controls Bar */}
      <View style={[styles.topControls, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}>
          <Search size={18} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            placeholder={t.search_placeholder}
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.ink }]}
            returnKeyType="search"
            accessibilityLabel="Destination search in Delhi"
          />
          {isSearching && <ActivityIndicator size="small" color={colors.signal} />}
        </View>

        {/* Quick Toggles: Night preview, Walking/Driving */}
        <View style={styles.quickToggleRow}>
          <View style={styles.modeGroup}>
            <TouchableOpacity
              onPress={() => setTravelMode('walking')}
              style={[
                styles.modeBtn,
                travelMode === 'walking' && { backgroundColor: colors.ink },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Walking mode"
            >
              <Footprints size={14} color={travelMode === 'walking' ? '#ffffff' : colors.muted} />
              <Text style={[styles.modeBtnText, { color: travelMode === 'walking' ? '#ffffff' : colors.muted }]}>
                {t.walking}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTravelMode('driving')}
              style={[
                styles.modeBtn,
                travelMode === 'driving' && { backgroundColor: colors.ink },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Driving mode"
            >
              <Car size={14} color={travelMode === 'driving' ? '#ffffff' : colors.muted} />
              <Text style={[styles.modeBtnText, { color: travelMode === 'driving' ? '#ffffff' : colors.muted }]}>
                {t.driving}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={toggleNightPreview}
            style={[
              styles.nightBtn,
              {
                backgroundColor: isNightPreview ? colors.cautionSubtle : colors.surfaceSubtle,
                borderColor: isNightPreview ? colors.caution : colors.line,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle night safety preview"
          >
            <Moon size={14} color={isNightPreview ? colors.caution : colors.muted} />
            <Text style={[styles.nightText, { color: isNightPreview ? colors.caution : colors.muted }]}>
              {t.night_preview}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preset Delhi Quick Destinations */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
          <TouchableOpacity
            onPress={() => setPresetDestination('India Gate, Rajpath', 28.6129, 77.2295)}
            style={[styles.presetChip, { borderColor: colors.line }]}
          >
            <MapPin size={12} color={colors.signal} />
            <Text style={[styles.presetChipText, { color: colors.ink }]}>India Gate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPresetDestination('Hauz Khas Village', 28.5489, 77.2058)}
            style={[styles.presetChip, { borderColor: colors.line }]}
          >
            <MapPin size={12} color={colors.signal} />
            <Text style={[styles.presetChipText, { color: colors.ink }]}>Hauz Khas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPresetDestination('Connaught Place', 28.6328, 77.2197)}
            style={[styles.presetChip, { borderColor: colors.line }]}
          >
            <MapPin size={12} color={colors.signal} />
            <Text style={[styles.presetChipText, { color: colors.ink }]}>Connaught Place</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPresetDestination('Saket Select CITYWALK', 28.5285, 77.2185)}
            style={[styles.presetChip, { borderColor: colors.line }]}
          >
            <MapPin size={12} color={colors.signal} />
            <Text style={[styles.presetChipText, { color: colors.ink }]}>Saket</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Map Canvas */}
      <View style={styles.mapContainer}>
        <SafeMapView
          selectedRoute={selectedRoute}
          routes={routes}
          currentLocation={currentLocation}
        />

        {/* Simulator Bar during testing */}
        <View style={styles.simulatorWrapper}>
          <SimulatorBar />
        </View>

        {/* SOS Button: Always visible, never covered */}
        <SOSButton size={68} />
      </View>

      {/* Bottom Route Comparison / Trip HUD Drawer */}
      <View style={[styles.bottomSheet, { backgroundColor: colors.surface, borderTopColor: colors.line }]}>
        {isTripActive ? (
          <TripHUD />
        ) : (
          <View>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.ink }]}>{t.plan_route}</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.muted }]}>
                  {routes.length} routes evaluated in Delhi NCR
                </Text>
              </View>

              {selectedRoute && (
                <TouchableOpacity
                  onPress={startTrip}
                  style={[styles.startTripBtn, { backgroundColor: colors.ink }]}
                  accessibilityRole="button"
                  accessibilityLabel="Start safe journey"
                >
                  <Text style={styles.startTripText}>{t.start_trip}</Text>
                  <ArrowRight size={16} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.routesScroll} showsVerticalScrollIndicator={false}>
              {routes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  isSelected={selectedRoute?.id === route.id}
                  onSelect={() => selectRoute(route)}
                  onOpenDetails={() => setBreakdownRoute(route)}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Score Breakdown Modal */}
      <BreakdownSheet
        route={breakdownRoute}
        visible={breakdownRoute !== null}
        onClose={() => setBreakdownRoute(null)}
      />

      {/* Anomaly Check-In Modal ("Are you okay?", 30s Countdown, Duress PIN) */}
      <CheckInModal />

      {/* Calm Emergency SOS Modal (Post-trigger state, 112, PIN cancel) */}
      <CalmSOSModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topControls: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    zIndex: 50,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: themeTokens.radii.input,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  quickToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  modeGroup: {
    flexDirection: 'row',
    backgroundColor: '#e8e7e1',
    borderRadius: 8,
    padding: 2,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  nightText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingBottom: 2,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  simulatorWrapper: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  bottomSheet: {
    borderTopLeftRadius: themeTokens.radii.sheet,
    borderTopRightRadius: themeTokens.radii.sheet,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  startTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  startTripText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  routesScroll: {
    maxHeight: 180,
  },
});

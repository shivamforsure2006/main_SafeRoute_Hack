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
  Platform,
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
  ArrowUpDown,
  Locate,
  LocateFixed,
  X,
  Crosshair,
  Navigation,
  Maximize2,
  Minimize2,
  StopCircle,
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
import { useLocationTracking } from '@/hooks/useLocationTracking';
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
  const currentSpeed = useTripStore((s) => s.currentSpeed);

  const setOrigin = useTripStore((s) => s.setOrigin);
  const setDestination = useTripStore((s) => s.setDestination);
  const swapOriginAndDestination = useTripStore((s) => s.swapOriginAndDestination);
  const setTravelMode = useTripStore((s) => s.setTravelMode);
  const toggleNightPreview = useTripStore((s) => s.toggleNightPreview);
  const setRoutes = useTripStore((s) => s.setRoutes);
  const selectRoute = useTripStore((s) => s.selectRoute);
  const startTrip = useTripStore((s) => s.startTrip);
  const endTrip = useTripStore((s) => s.endTrip);

  // Real-time GPS location tracking hook
  const {
    isLocating,
    isGpsTracking,
    setOriginToGps,
    toggleTracking,
    getCurrentLocation,
  } = useLocationTracking();

  // Search & input state for both Origin (From) and Destination (To)
  const [originInput, setOriginInput] = useState(origin.name);
  const [destInput, setDestInput] = useState(destination.name);
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [breakdownRoute, setBreakdownRoute] = useState<RouteAlternative | null>(null);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  // Activate hardware accelerometer shake detection
  useShakeDetection();

  // Keep text inputs in sync with store state
  useEffect(() => {
    setOriginInput(origin.name);
  }, [origin.name]);

  useEffect(() => {
    setDestInput(destination.name);
  }, [destination.name]);

  // Load default routes on mount or mode change
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

  // Handle typing in origin or destination search
  const handleTextChange = async (text: string, field: 'origin' | 'destination') => {
    if (field === 'origin') {
      setOriginInput(text);
    } else {
      setDestInput(text);
    }
    setActiveField(field);

    if (text.trim().length >= 2) {
      setIsSearching(true);
      const results = await api.geocodeSearch(text);
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  // Submit search from keyboard
  const handleSearchSubmit = async (field: 'origin' | 'destination') => {
    Keyboard.dismiss();
    const query = field === 'origin' ? originInput : destInput;
    if (!query.trim()) return;

    setIsSearching(true);
    const results = await api.geocodeSearch(query);
    setIsSearching(false);

    if (results.length > 0) {
      handleSelectPlace(results[0], field);
    }
  };

  // Select place from autocomplete results
  const handleSelectPlace = (place: { name: string; lat: number; lng: number }, fieldOverride?: 'origin' | 'destination') => {
    Keyboard.dismiss();
    const targetField = fieldOverride || activeField;

    if (targetField === 'origin') {
      const newOrigin = { name: place.name, lat: place.lat, lng: place.lng };
      setOrigin(newOrigin);
      setOriginInput(place.name);
      fetchRoutes({ lat: place.lat, lng: place.lng }, destination, travelMode, isNightPreview);
    } else {
      const newDest = { name: place.name, lat: place.lat, lng: place.lng };
      setDestination(newDest);
      setDestInput(place.name);
      fetchRoutes(origin, { lat: place.lat, lng: place.lng }, travelMode, isNightPreview);
    }

    setActiveField(null);
    setSearchResults([]);
  };

  // Use GPS to set origin to device location
  const handleUseGpsAsOrigin = async () => {
    Keyboard.dismiss();
    setActiveField(null);
    setSearchResults([]);

    const loc = await setOriginToGps();
    if (loc) {
      setOriginInput(loc.name);
      fetchRoutes({ lat: loc.lat, lng: loc.lng }, destination, travelMode, isNightPreview);
    }
  };

  // Swap origin and destination
  const handleSwap = () => {
    Keyboard.dismiss();
    setActiveField(null);
    setSearchResults([]);

    const oldOrigin = origin;
    const oldDest = destination;
    swapOriginAndDestination();

    setOriginInput(oldDest.name);
    setDestInput(oldOrigin.name);

    fetchRoutes(oldDest, oldOrigin, travelMode, isNightPreview);
  };

  // Handle Preset selection
  const handleSelectPreset = (name: string, lat: number, lng: number) => {
    Keyboard.dismiss();
    if (activeField === 'origin') {
      setOrigin({ name, lat, lng });
      setOriginInput(name);
      fetchRoutes({ lat, lng }, destination, travelMode, isNightPreview);
    } else {
      setDestination({ name, lat, lng });
      setDestInput(name);
      fetchRoutes(origin, { lat, lng }, travelMode, isNightPreview);
    }
    setActiveField(null);
    setSearchResults([]);
  };

  const isTripActive = status === 'ACTIVE';
  const durationMin = selectedRoute ? Math.ceil(selectedRoute.duration_s / 60) : 0;
  const distanceKm = selectedRoute ? (selectedRoute.distance_m / 1000).toFixed(1) : '0.0';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.paper }]}>
      {/* Top Header / Controls Bar */}
      <View style={[styles.topControls, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        
        {isTripActive ? (
          /* ACTIVE TRAVELLING NAVIGATION HEADER - Maximum Map Visibility */
          <View style={[styles.navHeaderCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}>
            <View style={styles.navHeaderRow}>
              <View style={[styles.navModeIconBox, { backgroundColor: colors.surface }]}>
                {travelMode === 'walking' ? (
                  <Footprints size={18} color={colors.signal} />
                ) : (
                  <Car size={18} color={colors.signal} />
                )}
              </View>

              <View style={styles.navHeaderTextCol}>
                <View style={styles.navLiveBadgeRow}>
                  <View style={[styles.liveDotPill, { backgroundColor: colors.signal }]} />
                  <Text style={[styles.navLiveText, { color: colors.signal }]}>
                    {isGpsTracking ? 'LIVE GPS NAVIGATION' : 'TRAVELLING (ACTIVE)'}
                  </Text>
                  <View style={[styles.navSpeedBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.navSpeedText, { color: colors.ink }]}>
                      {(currentSpeed * 3.6).toFixed(1)} km/h
                    </Text>
                  </View>
                </View>
                <Text style={[styles.navDestTitle, { color: colors.ink }]} numberOfLines={1}>
                  ➔ {destination.name}
                </Text>
                <Text style={[styles.navOriginSub, { color: colors.muted }]} numberOfLines={1}>
                  From {origin.name}
                </Text>
              </View>

              {/* Toggle Full Map vs HUD */}
              <TouchableOpacity
                onPress={() => setHudCollapsed(!hudCollapsed)}
                style={[styles.collapseBtn, { backgroundColor: colors.surface, borderColor: colors.line }]}
                accessibilityRole="button"
                accessibilityLabel="Toggle navigation map view"
              >
                {hudCollapsed ? (
                  <Maximize2 size={16} color={colors.ink} />
                ) : (
                  <Minimize2 size={16} color={colors.ink} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Route Planning Mode - Dual Start (Origin) & Destination Input Card */
          <>
            <View style={[styles.routeCardContainer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.line }]}>
              {/* Start Location (Origin) Row */}
              <View style={styles.inputRow}>
                <View style={[styles.inputIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Compass size={15} color={colors.safe} />
                </View>
                <TextInput
                  value={originInput}
                  onChangeText={(text) => handleTextChange(text, 'origin')}
                  onFocus={() => setActiveField('origin')}
                  onSubmitEditing={() => handleSearchSubmit('origin')}
                  placeholder={t.origin_placeholder || 'Start location / GPS...'}
                  placeholderTextColor={colors.muted}
                  style={[styles.routeInput, { color: colors.ink }]}
                  returnKeyType="search"
                  selectTextOnFocus
                  accessibilityLabel="Choose where you want to start"
                />
                {/* Quick GPS Button to set start to live location */}
                <TouchableOpacity
                  onPress={handleUseGpsAsOrigin}
                  style={[styles.gpsActionBtn, isLocating && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Use device GPS location as starting point"
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color={colors.signal} />
                  ) : (
                    <Locate size={16} color={colors.signal} />
                  )}
                </TouchableOpacity>
                {originInput.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setOriginInput('');
                      setActiveField('origin');
                    }}
                    style={styles.clearBtn}
                  >
                    <X size={13} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Divider with Swap Button */}
              <View style={styles.swapDividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
                <TouchableOpacity
                  onPress={handleSwap}
                  style={[styles.swapBtn, { backgroundColor: colors.surface, borderColor: colors.line }]}
                  accessibilityRole="button"
                  accessibilityLabel={t.swap_locations || 'Swap start and destination'}
                >
                  <ArrowUpDown size={14} color={colors.ink} />
                </TouchableOpacity>
              </View>

              {/* Destination Row */}
              <View style={styles.inputRow}>
                <View style={[styles.inputIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <MapPin size={15} color={colors.danger} />
                </View>
                <TextInput
                  value={destInput}
                  onChangeText={(text) => handleTextChange(text, 'destination')}
                  onFocus={() => setActiveField('destination')}
                  onSubmitEditing={() => handleSearchSubmit('destination')}
                  placeholder={t.destination_placeholder || 'Where to (Destination)...'}
                  placeholderTextColor={colors.muted}
                  style={[styles.routeInput, { color: colors.ink }]}
                  returnKeyType="search"
                  selectTextOnFocus
                  accessibilityLabel="Choose destination"
                />
                {destInput.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setDestInput('');
                      setActiveField('destination');
                    }}
                    style={styles.clearBtn}
                  >
                    <X size={13} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Autocomplete / Suggestions Dropdown */}
            {activeField !== null && (
              <View style={[styles.autocompleteSheet, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                {/* Top Option: Use GPS Location */}
                {activeField === 'origin' && (
                  <TouchableOpacity
                    onPress={handleUseGpsAsOrigin}
                    style={[styles.suggestionItem, { borderBottomColor: colors.line }]}
                  >
                    <View style={[styles.suggIconBox, { backgroundColor: 'rgba(59, 76, 202, 0.12)' }]}>
                      {isLocating ? (
                        <ActivityIndicator size="small" color={colors.signal} />
                      ) : (
                        <Locate size={16} color={colors.signal} />
                      )}
                    </View>
                    <View style={styles.suggTextBox}>
                      <Text style={[styles.suggTitle, { color: colors.signal, fontWeight: '700' }]}>
                        {t.use_current_location || 'Use Current Location (GPS)'}
                      </Text>
                      <Text style={[styles.suggSub, { color: colors.muted }]}>
                        Track GPS coordinates directly
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Search results list */}
                {searchResults.map((item, idx) => (
                  <TouchableOpacity
                    key={`sugg-${idx}`}
                    onPress={() => handleSelectPlace(item)}
                    style={[styles.suggestionItem, { borderBottomColor: colors.line }]}
                  >
                    <View style={[styles.suggIconBox, { backgroundColor: colors.surfaceSubtle }]}>
                      <MapPin size={15} color={colors.muted} />
                    </View>
                    <View style={styles.suggTextBox}>
                      <Text style={[styles.suggTitle, { color: colors.ink }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.suggSub, { color: colors.muted }]}>
                        {item.type || 'Delhi NCR Landmark'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Dismiss search button */}
                <TouchableOpacity
                  onPress={() => {
                    setActiveField(null);
                    setSearchResults([]);
                    Keyboard.dismiss();
                  }}
                  style={styles.closeSuggestionsBtn}
                >
                  <Text style={[styles.closeSuggestionsText, { color: colors.muted }]}>Cancel search</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Toggles: Night preview, Walking/Driving, GPS Status */}
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

              {/* GPS Tracking Toggle Button */}
              <TouchableOpacity
                onPress={toggleTracking}
                style={[
                  styles.gpsToggleBtn,
                  {
                    backgroundColor: isGpsTracking ? 'rgba(16, 185, 129, 0.15)' : colors.surfaceSubtle,
                    borderColor: isGpsTracking ? colors.safe : colors.line,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Toggle live GPS tracking"
              >
                {isGpsTracking ? (
                  <LocateFixed size={14} color={colors.safe} />
                ) : (
                  <Locate size={14} color={colors.muted} />
                )}
                <Text
                  style={[
                    styles.gpsToggleText,
                    { color: isGpsTracking ? colors.safe : colors.muted },
                  ]}
                >
                  {isGpsTracking ? 'GPS Active' : 'Track GPS'}
                </Text>
              </TouchableOpacity>

              {/* Night preview toggle */}
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

            {/* Preset Delhi Quick Destinations & Shortcuts */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {/* Quick GPS Start Shortcut */}
              <TouchableOpacity
                onPress={handleUseGpsAsOrigin}
                style={[styles.presetChipGps, { borderColor: colors.signal, backgroundColor: colors.signalSubtle }]}
              >
                <Locate size={12} color={colors.signal} />
                <Text style={[styles.presetChipText, { color: colors.signal, fontWeight: '700' }]}>
                  Current GPS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectPreset('India Gate, Rajpath', 28.6129, 77.2295)}
                style={[styles.presetChip, { borderColor: colors.line }]}
              >
                <MapPin size={12} color={colors.signal} />
                <Text style={[styles.presetChipText, { color: colors.ink }]}>India Gate</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectPreset('Connaught Place', 28.6328, 77.2197)}
                style={[styles.presetChip, { borderColor: colors.line }]}
              >
                <MapPin size={12} color={colors.signal} />
                <Text style={[styles.presetChipText, { color: colors.ink }]}>Connaught Place</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectPreset('Hauz Khas Village', 28.5489, 77.2058)}
                style={[styles.presetChip, { borderColor: colors.line }]}
              >
                <MapPin size={12} color={colors.signal} />
                <Text style={[styles.presetChipText, { color: colors.ink }]}>Hauz Khas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectPreset('Saket Select CITYWALK', 28.5285, 77.2185)}
                style={[styles.presetChip, { borderColor: colors.line }]}
              >
                <MapPin size={12} color={colors.signal} />
                <Text style={[styles.presetChipText, { color: colors.ink }]}>Saket</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectPreset('AIIMS New Delhi', 28.5672, 77.2100)}
                style={[styles.presetChip, { borderColor: colors.line }]}
              >
                <MapPin size={12} color={colors.signal} />
                <Text style={[styles.presetChipText, { color: colors.ink }]}>AIIMS</Text>
              </TouchableOpacity>
            </ScrollView>
          </>
        )}
      </View>

      {/* Main Map Canvas - Dominant full screen experience */}
      <View style={styles.mapContainer}>
        <SafeMapView
          origin={origin}
          destination={destination}
          selectedRoute={selectedRoute}
          routes={routes}
          currentLocation={currentLocation}
          isGpsTracking={isGpsTracking}
          isLocating={isLocating}
          onLocateMe={toggleTracking}
        />

        {/* Simulator Bar during testing (collapsible) */}
        <View style={styles.simulatorWrapper}>
          <SimulatorBar />
        </View>

        {/* SOS Button: Always accessible floating over map */}
        <SOSButton size={68} />
      </View>

      {/* Bottom Sheet Drawer */}
      <View style={[styles.bottomSheet, { backgroundColor: colors.surface, borderTopColor: colors.line }]}>
        {isTripActive ? (
          hudCollapsed ? (
            /* Minimised Travelling Pill - 90% Screen given to Map */
            <View style={styles.collapsedHudRow}>
              <View style={styles.collapsedInfoCol}>
                <Text style={[styles.collapsedTitle, { color: colors.ink }]} numberOfLines={1}>
                  {destination.name}
                </Text>
                <Text style={[styles.collapsedSub, { color: colors.muted }]}>
                  {distanceKm} km • ~{durationMin} mins remaining • Safety: {selectedRoute?.safety_score}/100
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => endTrip()}
                style={[styles.miniEndBtn, { backgroundColor: colors.dangerSubtle, borderColor: colors.danger }]}
                accessibilityRole="button"
                accessibilityLabel="End journey"
              >
                <StopCircle size={14} color={colors.danger} />
                <Text style={[styles.miniEndText, { color: colors.danger }]}>End</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setHudCollapsed(false)}
                style={[styles.miniExpandBtn, { backgroundColor: colors.surfaceSubtle }]}
                accessibilityRole="button"
                accessibilityLabel="Show full metrics"
              >
                <Maximize2 size={14} color={colors.ink} />
              </TouchableOpacity>
            </View>
          ) : (
            /* Full Trip HUD */
            <TripHUD />
          )
        ) : !isSheetExpanded ? (
          /* Compact Docked Route Pill - Gives 75% Page Area Directly to Map */
          <View style={styles.compactDockRow}>
            <TouchableOpacity
              onPress={() => setIsSheetExpanded(true)}
              style={styles.compactRouteMeta}
              accessibilityRole="button"
              accessibilityLabel="Expand route alternatives"
            >
              <View>
                <Text style={[styles.compactRouteTitle, { color: colors.ink }]} numberOfLines={1}>
                  {selectedRoute?.title || 'Safest Route'} ({selectedRoute?.safety_score ?? 88}/100)
                </Text>
                <Text style={[styles.compactRouteSub, { color: colors.muted }]}>
                  {routes.length} paths • {durationMin} min • {distanceKm} km • Tap to compare ▴
                </Text>
              </View>
            </TouchableOpacity>

            {selectedRoute && (
              <TouchableOpacity
                onPress={startTrip}
                style={[styles.startTripBtn, { backgroundColor: colors.signal }]}
                accessibilityRole="button"
                accessibilityLabel="Start safe journey"
              >
                <Text style={styles.startTripText}>{t.start_trip}</Text>
                <ArrowRight size={15} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* Expanded Route Comparison Drawer */
          <View>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.ink }]}>{t.plan_route}</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.muted }]}>
                  {routes.length} routes evaluated in Delhi NCR
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setIsSheetExpanded(false)}
                  style={[styles.collapseSheetBtn, { borderColor: colors.line }]}
                >
                  <Text style={[styles.collapseSheetText, { color: colors.muted }]}>Map View ▾</Text>
                </TouchableOpacity>

                {selectedRoute && (
                  <TouchableOpacity
                    onPress={startTrip}
                    style={[styles.startTripBtn, { backgroundColor: colors.signal }]}
                    accessibilityRole="button"
                    accessibilityLabel="Start safe journey"
                  >
                    <Text style={styles.startTripText}>{t.start_trip}</Text>
                    <ArrowRight size={15} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>
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


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topControls: {
    // 20% area of the total page
    height: '20%',
    paddingTop: 6,
    paddingHorizontal: 14,
    paddingBottom: 6,
    borderBottomWidth: 1,
    zIndex: 50,
    justifyContent: 'space-between',
  },
  navHeaderCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navModeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHeaderTextCol: {
    flex: 1,
  },
  navLiveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  liveDotPill: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  navLiveText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  navSpeedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4,
  },
  navSpeedText: {
    fontSize: 10,
    fontWeight: '800',
  },
  navDestTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  navOriginSub: {
    fontSize: 11,
    marginTop: 1,
  },
  collapseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCardContainer: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    gap: 8,
  },
  inputIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },
  gpsActionBtn: {
    padding: 6,
    borderRadius: 8,
  },
  clearBtn: {
    padding: 4,
    borderRadius: 8,
  },
  swapDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: -2,
    paddingRight: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    marginLeft: 34,
  },
  swapBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  autocompleteSheet: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 220,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    gap: 10,
  },
  suggIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggTextBox: {
    flex: 1,
  },
  suggTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  suggSub: {
    fontSize: 11,
    marginTop: 1,
  },
  closeSuggestionsBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSuggestionsText: {
    fontSize: 12,
    fontWeight: '500',
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
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gpsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  gpsToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
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
  presetChipGps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
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
    // 75% of the total page area!
    height: '75%',
    flex: 1,
    position: 'relative',
  },
  compactDockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  compactRouteMeta: {
    flex: 1,
  },
  compactRouteTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  compactRouteSub: {
    fontSize: 11,
    marginTop: 2,
  },
  collapseSheetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  collapseSheetText: {
    fontSize: 11,
    fontWeight: '600',
  },
  simulatorWrapper: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    zIndex: 100,
  },
  bottomSheet: {
    borderTopLeftRadius: themeTokens.radii.sheet,
    borderTopRightRadius: themeTokens.radii.sheet,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  collapsedHudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 10,
  },
  collapsedInfoCol: {
    flex: 1,
  },
  collapsedTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  collapsedSub: {
    fontSize: 11,
    marginTop: 2,
  },
  miniEndBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniEndText: {
    fontSize: 12,
    fontWeight: '700',
  },
  miniExpandBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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

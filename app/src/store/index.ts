import { create } from 'zustand';
import { RouteAlternative, TrustedContact, api } from '@/services/api';
import { Language } from '@/i18n/strings';

export interface UserState {
  id: string;
  name: string;
  phone: string;
  normalPin: string;
  duressPin: string;
  language: Language;
  checkInTimeout: number; // 15, 30, 60s
  shakeSensitivity: 'low' | 'medium' | 'high';
  voiceKeyword: string;
  autoShareTrips: boolean;
  isVolunteer: boolean;
  volunteerAvailable: boolean;
  contacts: TrustedContact[];
  isDarkMode: boolean;
  
  // Actions
  setLanguage: (lang: Language) => void;
  toggleDarkMode: () => void;
  updatePins: (normal: string, duress: string) => void;
  setCheckInTimeout: (timeout: number) => void;
  addContact: (contact: Omit<TrustedContact, 'id'>) => void;
  removeContact: (id: string) => void;
  toggleVolunteer: (available: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  id: 'demo-delhi-user-01',
  name: 'Ananya Sharma',
  phone: '+919810012345',
  normalPin: '1234',
  duressPin: '9999',
  language: 'en',
  checkInTimeout: 30,
  shakeSensitivity: 'medium',
  voiceKeyword: 'Help SafeRoute',
  autoShareTrips: true,
  isVolunteer: false,
  volunteerAvailable: false,
  isDarkMode: false,
  contacts: [
    { id: 'c1', name: 'Mom (Dr. Sunita)', phone: '+919811122233', relationship: 'Parent', notify_sms: true, notify_whatsapp: true },
    { id: 'c2', name: 'Rohit (Partner)', phone: '+919877788899', relationship: 'Spouse', notify_sms: true, notify_whatsapp: true },
    { id: 'c3', name: 'Pooja (Colleague)', phone: '+919822233344', relationship: 'Friend', notify_sms: true, notify_whatsapp: false },
  ],

  setLanguage: (language) => set({ language }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  updatePins: (normalPin, duressPin) => set({ normalPin, duressPin }),
  setCheckInTimeout: (checkInTimeout) => set({ checkInTimeout }),
  addContact: (contact) =>
    set((state) => ({
      contacts: [...state.contacts, { ...contact, id: `c-${Date.now()}` }],
    })),
  removeContact: (id) =>
    set((state) => ({
      contacts: state.contacts.filter((c) => c.id !== id),
    })),
  toggleVolunteer: (volunteerAvailable) =>
    set({ isVolunteer: true, volunteerAvailable }),
}));

export type TripStatus = 'IDLE' | 'PLANNING' | 'ACTIVE' | 'CHECK_IN' | 'SOS_ACTIVE' | 'COMPLETED';

export interface TripState {
  status: TripStatus;
  origin: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  travelMode: 'walking' | 'driving';
  isNightPreview: boolean;
  routes: RouteAlternative[];
  selectedRoute: RouteAlternative | null;
  activeTripId: string | null;
  activeSosId: string | null;
  trackingToken: string | null;
  trackingUrl: string | null;
  
  // Real-time telemetry
  currentLocation: { lat: number; lng: number };
  currentSpeed: number; // m/s
  batteryLevel: number;
  anomalyReason: string | null;
  checkInCountdown: number;
  isGpsTracking: boolean;

  // Layer Toggles
  showStreetLights: boolean;
  showOpenShops: boolean;
  showSafeHavens: boolean;
  showHeatmap: boolean;

  // Actions
  setOrigin: (origin: { name: string; lat: number; lng: number }) => void;
  setDestination: (destination: { name: string; lat: number; lng: number }) => void;
  swapOriginAndDestination: () => void;
  setGpsTracking: (isTracking: boolean) => void;
  setTravelMode: (mode: 'walking' | 'driving') => void;
  toggleNightPreview: () => void;
  setRoutes: (routes: RouteAlternative[]) => void;
  selectRoute: (route: RouteAlternative) => void;
  startTrip: () => Promise<void>;
  updateLocation: (lat: number, lng: number, speed?: number) => void;
  triggerCheckIn: (reason: string) => void;
  decrementCountdown: () => void;
  resolveCheckIn: (pin: string) => { success: boolean; isDuress: boolean };
  triggerSOS: (triggerType: string) => Promise<void>;
  cancelSOS: (pin: string) => Promise<boolean>;
  endTrip: () => Promise<void>;
  resetToIdle: () => void;
  toggleLayer: (layer: 'streetLights' | 'openShops' | 'safeHavens' | 'heatmap') => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  status: 'IDLE',
  // Default centered on Delhi
  origin: { name: 'Connaught Place, Central Delhi', lat: 28.6328, lng: 77.2197 },
  destination: { name: 'India Gate, Rajpath', lat: 28.6129, lng: 77.2295 },
  travelMode: 'walking',
  isNightPreview: false,
  routes: [],
  selectedRoute: null,
  activeTripId: null,
  activeSosId: null,
  trackingToken: null,
  trackingUrl: null,
  
  currentLocation: { lat: 28.6328, lng: 77.2197 },
  currentSpeed: 1.3,
  batteryLevel: 94,
  anomalyReason: null,
  checkInCountdown: 30,
  isGpsTracking: false,

  showStreetLights: true,
  showOpenShops: true,
  showSafeHavens: true,
  showHeatmap: false,

  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  swapOriginAndDestination: () => {
    const state = get();
    const oldOrigin = state.origin;
    const oldDest = state.destination;
    set({
      origin: oldDest,
      destination: oldOrigin,
      currentLocation: { lat: oldDest.lat, lng: oldDest.lng },
    });
  },
  setGpsTracking: (isGpsTracking) => set({ isGpsTracking }),
  setTravelMode: (travelMode) => set({ travelMode }),
  toggleNightPreview: () => set((state) => ({ isNightPreview: !state.isNightPreview })),
  setRoutes: (routes) => {
    const safest = routes.find((r) => r.id === 'safest') || routes[0] || null;
    set({ routes, selectedRoute: safest, status: routes.length > 0 ? 'PLANNING' : 'IDLE' });
  },
  selectRoute: (selectedRoute) => set({ selectedRoute }),

  startTrip: async () => {
    const state = get();
    if (!state.selectedRoute) return;

    const res = await api.startTrip({
      user_id: useUserStore.getState().id,
      origin_name: state.origin.name,
      origin: state.origin,
      destination_name: state.destination.name,
      destination: state.destination,
      travel_mode: state.travelMode,
      route_type: state.selectedRoute.id,
      planned_route_geometry: state.selectedRoute.geometry,
      planned_duration_s: state.selectedRoute.duration_s,
      planned_distance_m: state.selectedRoute.distance_m,
      safety_score: state.selectedRoute.safety_score,
      battery_level: state.batteryLevel,
    });

    set({
      status: 'ACTIVE',
      activeTripId: res.id,
      trackingToken: res.tracking_token,
      trackingUrl: res.tracking_url,
      currentLocation: { lat: state.origin.lat, lng: state.origin.lng },
    });
  },

  updateLocation: (lat, lng, speed = 1.3) => {
    const state = get();
    set({ currentLocation: { lat, lng }, currentSpeed: speed });
    if (state.activeTripId) {
      api.updateBreadcrumb(state.activeTripId, lat, lng, speed, state.batteryLevel);
    }
  },

  triggerCheckIn: (reason) => {
    const timeout = useUserStore.getState().checkInTimeout;
    set({
      status: 'CHECK_IN',
      anomalyReason: reason,
      checkInCountdown: timeout,
    });
  },

  decrementCountdown: () => {
    const state = get();
    if (state.status !== 'CHECK_IN') return;
    if (state.checkInCountdown <= 1) {
      // Escalated!
      get().triggerSOS('CHECK_IN_TIMEOUT');
    } else {
      set({ checkInCountdown: state.checkInCountdown - 1 });
    }
  },

  resolveCheckIn: (pin) => {
    const { normalPin, duressPin } = useUserStore.getState();
    if (pin === normalPin) {
      set({ status: 'ACTIVE', anomalyReason: null });
      return { success: true, isDuress: false };
    } else if (pin === duressPin) {
      // Duress: mask visually but silently trigger SOS
      get().triggerSOS('DURESS_PIN');
      return { success: true, isDuress: true };
    }
    return { success: false, isDuress: false };
  },

  triggerSOS: async (triggerType) => {
    const state = get();
    const user = useUserStore.getState();
    const res = await api.triggerSOS({
      user_id: user.id,
      trip_id: state.activeTripId || undefined,
      trigger_type: triggerType,
      lat: state.currentLocation.lat,
      lng: state.currentLocation.lng,
      battery_level: state.batteryLevel,
    });

    set({
      status: 'SOS_ACTIVE',
      activeSosId: res.id,
      trackingUrl: res.tracking_url || state.trackingUrl,
    });
  },

  cancelSOS: async (pin) => {
    const state = get();
    const { normalPin } = useUserStore.getState();
    if (pin !== normalPin) return false;

    if (state.activeSosId) {
      await api.cancelSOS(state.activeSosId, pin);
    }
    set({
      status: state.activeTripId ? 'ACTIVE' : 'IDLE',
      activeSosId: null,
      anomalyReason: null,
    });
    return true;
  },

  endTrip: async () => {
    const state = get();
    if (state.activeTripId) {
      await api.endTrip(state.activeTripId);
    }
    set({
      status: 'COMPLETED',
      activeTripId: null,
      anomalyReason: null,
    });
  },

  resetToIdle: () =>
    set({
      status: 'IDLE',
      activeTripId: null,
      activeSosId: null,
      routes: [],
      selectedRoute: null,
    }),

  toggleLayer: (layer) => {
    set((state) => {
      switch (layer) {
        case 'streetLights':
          return { showStreetLights: !state.showStreetLights };
        case 'openShops':
          return { showOpenShops: !state.showOpenShops };
        case 'safeHavens':
          return { showSafeHavens: !state.showSafeHavens };
        case 'heatmap':
          return { showHeatmap: !state.showHeatmap };
      }
    });
  },
}));

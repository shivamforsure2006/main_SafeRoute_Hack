import { create } from 'zustand';
import { RouteAlternative, TrustedContact, api } from '@/services/api';
import { Language } from '@/i18n/strings';
import { appStorage, StoredUserProfile } from '@/services/storage';
import {
  triggerEmergencyVibration,
  stopEmergencyVibration,
  dispatchSOSAlertsToContacts,
} from '@/services/alert';

export interface UserState {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  isAuthenticated: boolean;
  authProvider: 'google' | 'phone' | 'email' | 'demo' | null;
  normalPin: string; // Safety Code
  duressPin: string;
  language: Language;
  checkInTimeout: number; // in seconds: default 60s (1 min), customisable
  shakeSensitivity: 'low' | 'medium' | 'high';
  voiceKeyword: string;
  autoShareTrips: boolean;
  isVolunteer: boolean;
  volunteerAvailable: boolean;
  contacts: TrustedContact[];
  isDarkMode: boolean;

  // Actions
  updateProfile: (profile: { name?: string; phone?: string; email?: string; avatarUrl?: string }) => void;
  loginWithGoogle: (data: { name: string; email: string; avatarUrl?: string }) => Promise<void>;
  loginWithPhone: (phone: string, otp?: string) => Promise<void>;
  loginWithDemo: () => void;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  toggleDarkMode: () => void;
  updatePins: (normal: string, duress: string) => void;
  setCheckInTimeout: (timeout: number) => void;
  addContact: (contact: Omit<TrustedContact, 'id'>) => void;
  updateContact: (id: string, contact: Partial<TrustedContact>) => void;
  removeContact: (id: string) => void;
  resetToDefaults: () => void;
  loadStoredProfile: () => Promise<void>;
  toggleVolunteer: (available: boolean) => void;
}

const DEFAULT_PROFILE: StoredUserProfile = {
  id: 'demo-delhi-user-01',
  name: 'Ananya Sharma',
  phone: '+919810012345',
  email: 'ananya.sharma@example.com',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
  isAuthenticated: true,
  authProvider: 'demo',
  normalPin: '1234',
  duressPin: '9999',
  language: 'en',
  checkInTimeout: 60, // 1 minute default
  isDarkMode: false,
  contacts: [
    {
      id: 'c1',
      name: 'Mom (Dr. Sunita)',
      phone: '+919811122233',
      email: 'sunita.sharma@example.com',
      relationship: 'Parent',
      notify_sms: true,
      notify_email: true,
      notify_whatsapp: true,
    },
    {
      id: 'c2',
      name: 'Rohit (Partner)',
      phone: '+919877788899',
      email: 'rohit.verma@example.com',
      relationship: 'Spouse',
      notify_sms: true,
      notify_email: true,
      notify_whatsapp: true,
    },
    {
      id: 'c3',
      name: 'Pooja (Colleague)',
      phone: '+919822233344',
      email: 'pooja.k@example.com',
      relationship: 'Friend',
      notify_sms: true,
      notify_email: true,
      notify_whatsapp: false,
    },
  ],
};

// Attempt to load from synchronous storage on initial load
const initialStored = appStorage.loadUserProfileSync() || DEFAULT_PROFILE;

function persistHelper(state: UserState) {
  const profileToSave: StoredUserProfile = {
    id: state.id,
    name: state.name,
    phone: state.phone,
    email: state.email,
    avatarUrl: state.avatarUrl,
    isAuthenticated: state.isAuthenticated,
    authProvider: state.authProvider,
    normalPin: state.normalPin,
    duressPin: state.duressPin,
    language: state.language,
    checkInTimeout: state.checkInTimeout,
    isDarkMode: state.isDarkMode,
    contacts: state.contacts,
  };
  appStorage.saveUserProfile(profileToSave);
}

export const useUserStore = create<UserState>((set, get) => ({
  id: initialStored.id || DEFAULT_PROFILE.id,
  name: initialStored.name || DEFAULT_PROFILE.name,
  phone: initialStored.phone || DEFAULT_PROFILE.phone,
  email: initialStored.email || DEFAULT_PROFILE.email,
  avatarUrl: initialStored.avatarUrl || DEFAULT_PROFILE.avatarUrl,
  isAuthenticated: initialStored.isAuthenticated ?? true,
  authProvider: initialStored.authProvider || 'demo',
  normalPin: initialStored.normalPin || DEFAULT_PROFILE.normalPin,
  duressPin: initialStored.duressPin || DEFAULT_PROFILE.duressPin,
  language: (initialStored.language as Language) || DEFAULT_PROFILE.language,
  checkInTimeout: initialStored.checkInTimeout || 60,
  shakeSensitivity: 'medium',
  voiceKeyword: 'Help SafeRoute',
  autoShareTrips: true,
  isVolunteer: false,
  volunteerAvailable: false,
  isDarkMode: initialStored.isDarkMode ?? DEFAULT_PROFILE.isDarkMode,
  contacts: initialStored.contacts?.length ? initialStored.contacts : DEFAULT_PROFILE.contacts,

  loginWithGoogle: async ({ name, email, avatarUrl }) => {
    const res = await api.loginWithGoogle({ email, name, avatar_url: avatarUrl });
    set((state) => {
      const next = {
        isAuthenticated: true,
        authProvider: 'google' as const,
        name: res.name || name,
        email: res.email || email,
        avatarUrl: avatarUrl || res.avatar_url || 'https://lh3.googleusercontent.com/a/default-user',
        phone: res.phone || state.phone,
      };
      const updated = { ...state, ...next };
      persistHelper(updated);
      return next;
    });
  },

  loginWithPhone: async (phone: string, otp = '123456') => {
    const res = await api.loginWithPhone(phone, otp);
    set((state) => {
      const next = {
        isAuthenticated: true,
        authProvider: 'phone' as const,
        name: res.name || state.name,
        phone: res.phone || phone,
      };
      const updated = { ...state, ...next };
      persistHelper(updated);
      return next;
    });
  },

  loginWithDemo: () => {
    set((state) => {
      const next = {
        isAuthenticated: true,
        authProvider: 'demo' as const,
        name: 'Ananya Sharma',
        phone: '+919810012345',
        email: 'ananya.sharma@example.com',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
      };
      const updated = { ...state, ...next };
      persistHelper(updated);
      return next;
    });
  },

  logout: () => {
    set((state) => {
      const next = {
        isAuthenticated: false,
        authProvider: null,
      };
      const updated = { ...state, ...next };
      persistHelper(updated);
      return next;
    });
  },

  updateProfile: ({ name, phone, email, avatarUrl }) => {
    set((state) => {
      const next = {
        name: name !== undefined ? name : state.name,
        phone: phone !== undefined ? phone : state.phone,
        email: email !== undefined ? email : state.email,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : state.avatarUrl,
      };
      const updated = { ...state, ...next };
      persistHelper(updated);
      return next;
    });
  },

  setLanguage: (language) => {
    set((state) => {
      const updated = { ...state, language };
      persistHelper(updated);
      return { language };
    });
  },

  toggleDarkMode: () => {
    set((state) => {
      const isDarkMode = !state.isDarkMode;
      const updated = { ...state, isDarkMode };
      persistHelper(updated);
      return { isDarkMode };
    });
  },

  updatePins: (normalPin, duressPin) => {
    set((state) => {
      const updated = { ...state, normalPin, duressPin };
      persistHelper(updated);
      return { normalPin, duressPin };
    });
  },

  setCheckInTimeout: (checkInTimeout) => {
    set((state) => {
      const updated = { ...state, checkInTimeout };
      persistHelper(updated);
      return { checkInTimeout };
    });
  },

  addContact: (contact) => {
    set((state) => {
      const newContact: TrustedContact = {
        ...contact,
        id: `c-${Date.now()}`,
        notify_sms: contact.notify_sms ?? true,
        notify_email: contact.notify_email ?? true,
        notify_whatsapp: contact.notify_whatsapp ?? false,
      };
      const contacts = [...state.contacts, newContact];
      const updated = { ...state, contacts };
      persistHelper(updated);
      return { contacts };
    });
  },

  updateContact: (id, contactUpdates) => {
    set((state) => {
      const contacts = state.contacts.map((c) =>
        c.id === id ? { ...c, ...contactUpdates } : c
      );
      const updated = { ...state, contacts };
      persistHelper(updated);
      return { contacts };
    });
  },

  removeContact: (id) => {
    set((state) => {
      const contacts = state.contacts.filter((c) => c.id !== id);
      const updated = { ...state, contacts };
      persistHelper(updated);
      return { contacts };
    });
  },

  resetToDefaults: () => {
    set(DEFAULT_PROFILE);
    persistHelper(get());
  },

  loadStoredProfile: async () => {
    const stored = await appStorage.loadUserProfile();
    if (stored) {
      set({
        name: stored.name || DEFAULT_PROFILE.name,
        phone: stored.phone || DEFAULT_PROFILE.phone,
        email: stored.email || DEFAULT_PROFILE.email,
        avatarUrl: stored.avatarUrl || DEFAULT_PROFILE.avatarUrl,
        isAuthenticated: stored.isAuthenticated ?? DEFAULT_PROFILE.isAuthenticated,
        authProvider: stored.authProvider ?? DEFAULT_PROFILE.authProvider,
        normalPin: stored.normalPin || DEFAULT_PROFILE.normalPin,
        duressPin: stored.duressPin || DEFAULT_PROFILE.duressPin,
        language: stored.language || DEFAULT_PROFILE.language,
        checkInTimeout: stored.checkInTimeout || 60,
        isDarkMode: stored.isDarkMode ?? DEFAULT_PROFILE.isDarkMode,
        contacts: stored.contacts?.length ? stored.contacts : DEFAULT_PROFILE.contacts,
      });
    }
  },

  toggleVolunteer: (volunteerAvailable) =>
    set({ isVolunteer: true, volunteerAvailable }),
}));

// Trigger asynchronous rehydration in background
appStorage.loadUserProfile().then((stored) => {
  if (stored) {
    useUserStore.getState().loadStoredProfile();
  }
});

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
  checkInCountdown: 60,
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
    const timeout = useUserStore.getState().checkInTimeout || 60;
    // Trigger physical alert vibration on anomaly detection
    triggerEmergencyVibration();

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
      // Escalated! Timer expired without safety code
      stopEmergencyVibration();

      const user = useUserStore.getState();
      const trackingUrl = state.trackingUrl || `https://saferoute-delhi.com/track/${state.trackingToken || 'emergency'}`;

      // Dispatch emergency messages via Email & SMS to all trusted contacts
      dispatchSOSAlertsToContacts({
        userName: user.name,
        userPhone: user.phone,
        contacts: user.contacts,
        location: state.currentLocation,
        batteryLevel: state.batteryLevel,
        anomalyReason: state.anomalyReason || 'Anomaly check-in timer expired without safety code',
        trackingUrl,
        triggerType: 'ANOMALY_TIMEOUT',
      });

      // Also trigger backend SOS flow
      get().triggerSOS('CHECK_IN_TIMEOUT');
    } else {
      set({ checkInCountdown: state.checkInCountdown - 1 });
    }
  },

  resolveCheckIn: (pin) => {
    const { normalPin, duressPin, name, phone, contacts } = useUserStore.getState();
    const state = get();

    if (pin === normalPin) {
      // User entered safety code: stop alert vibration and resume safe journey
      stopEmergencyVibration();
      set({ status: 'ACTIVE', anomalyReason: null });
      return { success: true, isDuress: false };
    } else if (pin === duressPin) {
      // Duress: mask visually to protect user, but immediately dispatch SOS
      stopEmergencyVibration();
      dispatchSOSAlertsToContacts({
        userName: name,
        userPhone: phone,
        contacts,
        location: state.currentLocation,
        batteryLevel: state.batteryLevel,
        anomalyReason: 'Silent Duress Code entered under coercion',
        trackingUrl: state.trackingUrl || 'https://saferoute-delhi.com/track/emergency',
        triggerType: 'DURESS_PIN',
      });
      get().triggerSOS('DURESS_PIN');
      return { success: true, isDuress: true };
    }
    return { success: false, isDuress: false };
  },

  triggerSOS: async (triggerType) => {
    const state = get();
    const user = useUserStore.getState();

    // Dispatch messages to contacts locally as well
    dispatchSOSAlertsToContacts({
      userName: user.name,
      userPhone: user.phone,
      contacts: user.contacts,
      location: state.currentLocation,
      batteryLevel: state.batteryLevel,
      anomalyReason: triggerType,
      trackingUrl: state.trackingUrl || 'https://saferoute-delhi.com/track/emergency',
      triggerType,
    });

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

    stopEmergencyVibration();

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
    stopEmergencyVibration();

    // Automatically record completed trip into browser's local storage
    if (state.selectedRoute) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const durationMin = Math.ceil(state.selectedRoute.duration_s / 60);
      const distanceKm = Number((state.selectedRoute.distance_m / 1000).toFixed(1));

      try {
        await appStorage.savePastTrip({
          id: `trip-${Date.now()}`,
          date: `${dateStr}, ${timeStr}`,
          origin: state.origin.name,
          destination: state.destination.name,
          safetyScore: state.selectedRoute.safety_score,
          durationMin,
          distanceKm,
          status: 'ARRIVED_SAFELY',
          summary: `Completed journey to ${state.destination.name}. Traveled along monitored safe corridor.`,
          created_at: now.toISOString(),
        });
      } catch (err) {
        console.warn('Failed saving trip to local storage', err);
      }
    }

    if (state.activeTripId) {
      await api.endTrip(state.activeTripId);
    }
    set({
      status: 'COMPLETED',
      activeTripId: null,
      anomalyReason: null,
    });
  },

  resetToIdle: () => {
    stopEmergencyVibration();
    set({
      status: 'IDLE',
      activeTripId: null,
      activeSosId: null,
      routes: [],
      selectedRoute: null,
    });
  },

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

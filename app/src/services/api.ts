import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getApiBaseUrl(): string {
  // Check if custom base url is set in environment or config
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  // If running on Android emulator, 10.0.2.2 points to host machine
  if (Platform.OS === 'android') {
    // If Expo hostUri exists, extract host IP
    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      return `http://${ip}:8000`;
    }
    return 'http://10.0.2.2:8000';
  }

  return 'http://localhost:8000';
}

const BASE_URL = getApiBaseUrl();

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteAlternative {
  id: string;
  title: string;
  distance_m: number;
  duration_s: number;
  safety_score: number;
  one_line_reason: string;
  geometry: [number, number][];
  segments: {
    coordinates: [[number, number], [number, number]];
    score: number;
    category: 'safe' | 'caution' | 'danger';
  }[];
  weakest_stretch?: {
    start_lat: number;
    start_lng: number;
    end_lat: number;
    end_lng: number;
    score: number;
    reason: string;
  };
  breakdown: {
    lighting: number;
    activity: number;
    help_density: number;
    incident_penalty: number;
    night_multiplier: number;
  };
}

export interface IncidentReport {
  id: string;
  category: string;
  severity: number;
  lat: number;
  lng: number;
  address_label?: string;
  description: string;
  confirmations_count: number;
  flags_count: number;
  created_at: string;
}

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  notify_sms: boolean;
  notify_whatsapp: boolean;
}

export const api = {
  async getHealth() {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      return await res.json();
    } catch {
      return { status: 'offline', demo_mode: true };
    }
  },

  async geocodeSearch(query: string) {
    try {
      const res = await fetch(`${BASE_URL}/api/geocode/search?q=${encodeURIComponent(query)}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Geocode API offline, returning fallback', e);
    }
    return [
      { name: `${query}, Delhi NCR`, lat: 28.6139, lng: 77.2090, type: 'search' }
    ];
  },

  async planRoutes(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, mode = 'walking', isNightPreview = false) {
    try {
      const res = await fetch(`${BASE_URL}/api/routes/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, mode, is_night_preview: isNightPreview })
      });
      if (res.ok) {
        const data = await res.json();
        return data.routes as RouteAlternative[];
      }
    } catch (e) {
      console.warn('Routing API failed, using client fallback', e);
    }
    return [];
  },

  async startTrip(payload: any) {
    try {
      const res = await fetch(`${BASE_URL}/api/trips/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Trip start error', e);
    }
    return {
      id: 'demo-local-trip',
      tracking_token: 'demo-local-token',
      tracking_url: `${BASE_URL}/track/demo-local-token`,
      status: 'ACTIVE'
    };
  },

  async updateBreadcrumb(tripId: string, lat: number, lng: number, speed = 0, battery = 100) {
    try {
      await fetch(`${BASE_URL}/api/trips/${tripId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, speed, battery })
      });
    } catch {}
  },

  async endTrip(tripId: string) {
    try {
      const res = await fetch(`${BASE_URL}/api/trips/${tripId}/end`, { method: 'POST' });
      return await res.json();
    } catch {
      return { success: true };
    }
  },

  async triggerSOS(payload: {
    user_id: string;
    trip_id?: string;
    trigger_type: string;
    lat: number;
    lng: number;
    battery_level?: number;
  }) {
    try {
      const res = await fetch(`${BASE_URL}/api/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('SOS trigger backend error', e);
    }
    return {
      id: 'sos-local-event',
      status: 'ACTIVE',
      tracking_url: `${BASE_URL}/track/demo-sos-token`,
      contacts_notified_count: 3,
      volunteers_notified_count: 5
    };
  },

  async cancelSOS(sosId: string, pin: string) {
    try {
      const res = await fetch(`${BASE_URL}/api/sos/cancel/${sosId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      return await res.json();
    } catch {
      return { success: true, message: 'Resolved offline' };
    }
  },

  async fetchReports(): Promise<IncidentReport[]> {
    try {
      const res = await fetch(`${BASE_URL}/api/reports`);
      if (res.ok) return await res.json();
    } catch {}
    return [];
  },

  async submitReport(payload: any) {
    try {
      const res = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },

  async fetchSentMessages() {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/overview?key=SafeDelhi2026`);
      if (res.ok) {
        const data = await res.json();
        return data.message_logs || [];
      }
    } catch {}
    return [];
  }
};

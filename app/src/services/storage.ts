import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { TrustedContact } from './api';

export interface StoredUserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  isAuthenticated?: boolean;
  authProvider?: 'google' | 'phone' | 'email' | 'demo' | null;
  normalPin: string;
  duressPin: string;
  checkInTimeout: number; // in seconds, default 60 (1 minute)
  language: 'en' | 'hi';
  isDarkMode: boolean;
  contacts: TrustedContact[];
}

export interface StoredSentMessage {
  id: string;
  recipient: string;
  recipient_name?: string;
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'PUSH';
  title: string;
  content: string;
  status: 'SENT' | 'MOCKED';
  created_at: string;
}

export interface StoredPastTrip {
  id: string;
  date: string;
  origin: string;
  destination: string;
  safetyScore: number;
  durationMin: number;
  distanceKm: number;
  status: 'ARRIVED_SAFELY' | 'SOS_TRIGGERED' | 'CANCELLED';
  summary: string;
  created_at: string;
}

const PROFILE_KEY = 'saferoute_user_profile_v2';
const MESSAGES_KEY = 'saferoute_sent_messages_v2';
const TRIPS_KEY = 'saferoute_user_past_trips_v1';

class StorageService {
  private memoryFallback: Record<string, string> = {};

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return this.memoryFallback[key] || null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`StorageService.getItem error for key ${key}:`, e);
      return this.memoryFallback[key] || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      this.memoryFallback[key] = value;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn(`StorageService.setItem error for key ${key}:`, e);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      delete this.memoryFallback[key];
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn(`StorageService.removeItem error for key ${key}:`, e);
    }
  }

  // Synchronous Web helper for immediate initial render
  getSyncItem(key: string): string | null {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return this.memoryFallback[key] || null;
  }

  async loadUserProfile(): Promise<StoredUserProfile | null> {
    try {
      const raw = await this.getItem(PROFILE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse stored user profile:', e);
    }
    return null;
  }

  loadUserProfileSync(): StoredUserProfile | null {
    try {
      const raw = this.getSyncItem(PROFILE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  }

  async saveUserProfile(profile: StoredUserProfile): Promise<void> {
    await this.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  async loadSentMessages(): Promise<StoredSentMessage[]> {
    try {
      const raw = await this.getItem(MESSAGES_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load sent messages:', e);
    }
    return [];
  }

  loadSentMessagesSync(): StoredSentMessage[] {
    try {
      const raw = this.getSyncItem(MESSAGES_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  async saveSentMessage(msg: StoredSentMessage): Promise<void> {
    try {
      const current = await this.loadSentMessages();
      const updated = [msg, ...current.filter((m) => m.id !== msg.id)].slice(0, 50);
      await this.setItem(MESSAGES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save sent message:', e);
    }
  }

  async clearSentMessages(): Promise<void> {
    await this.removeItem(MESSAGES_KEY);
  }

  async loadPastTrips(): Promise<StoredPastTrip[]> {
    try {
      const raw = await this.getItem(TRIPS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load past trips:', e);
    }
    return [];
  }

  loadPastTripsSync(): StoredPastTrip[] {
    try {
      const raw = this.getSyncItem(TRIPS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  async savePastTrip(trip: StoredPastTrip): Promise<void> {
    try {
      const current = await this.loadPastTrips();
      const updated = [trip, ...current.filter((t) => t.id !== trip.id)].slice(0, 100);
      await this.setItem(TRIPS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save past trip:', e);
    }
  }

  async deletePastTrip(tripId: string): Promise<void> {
    try {
      const current = await this.loadPastTrips();
      const updated = current.filter((t) => t.id !== tripId);
      await this.setItem(TRIPS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to delete past trip:', e);
    }
  }

  async clearPastTrips(): Promise<void> {
    await this.removeItem(TRIPS_KEY);
  }
}

export const appStorage = new StorageService();


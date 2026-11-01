import { create } from 'zustand';
import { useTripStore } from '@/store';

interface SimulatorState {
  isActive: boolean;
  speedMultiplier: 1 | 5 | 10;
  currentIndex: number;
  timerId: any | null;

  startSimulation: () => void;
  stopSimulation: () => void;
  setSpeedMultiplier: (speed: 1 | 5 | 10) => void;
  triggerDeviate: () => void;
  triggerStop3Min: () => void;
  triggerSpeedSpike: () => void;
  triggerShake: () => void;
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  isActive: false,
  speedMultiplier: 1,
  currentIndex: 0,
  timerId: null,

  startSimulation: () => {
    const { selectedRoute } = useTripStore.getState();
    if (!selectedRoute || selectedRoute.geometry.length < 2) return;

    // Ensure trip is started
    if (useTripStore.getState().status !== 'ACTIVE') {
      useTripStore.getState().startTrip();
    }

    const intervalMs = Math.max(200, 1500 / get().speedMultiplier);
    
    const timer = setInterval(() => {
      const state = get();
      const tripState = useTripStore.getState();
      
      // Stop if trip ended or SOS active
      if (tripState.status === 'COMPLETED' || tripState.status === 'SOS_ACTIVE') {
        get().stopSimulation();
        return;
      }

      const geom = tripState.selectedRoute?.geometry || [];
      if (state.currentIndex >= geom.length - 1) {
        // Reached destination!
        tripState.endTrip();
        get().stopSimulation();
        return;
      }

      const nextIdx = state.currentIndex + 1;
      const pt = geom[nextIdx];
      tripState.updateLocation(pt[0], pt[1], 1.4 * state.speedMultiplier);
      set({ currentIndex: nextIdx });
    }, intervalMs);

    set({ isActive: true, timerId: timer, currentIndex: 0 });
  },

  stopSimulation: () => {
    const { timerId } = get();
    if (timerId) clearInterval(timerId);
    set({ isActive: false, timerId: null });
  },

  setSpeedMultiplier: (speedMultiplier) => {
    set({ speedMultiplier });
    if (get().isActive) {
      get().stopSimulation();
      get().startSimulation();
    }
  },

  triggerDeviate: () => {
    const tripState = useTripStore.getState();
    const curr = tripState.currentLocation;
    // Displace by ~250m east
    const offLat = curr.lat + 0.0022;
    const offLng = curr.lng + 0.0025;
    tripState.updateLocation(offLat, offLng, 1.2);
    
    // Trigger check-in within state machine
    tripState.triggerCheckIn('Route deviation detected: 260m off planned safe route');
  },

  triggerStop3Min: () => {
    const tripState = useTripStore.getState();
    tripState.updateLocation(tripState.currentLocation.lat, tripState.currentLocation.lng, 0.0);
    tripState.triggerCheckIn('Unusual stop detected: stationary for 180s in unmonitored area');
  },

  triggerSpeedSpike: () => {
    const tripState = useTripStore.getState();
    tripState.updateLocation(tripState.currentLocation.lat, tripState.currentLocation.lng, 11.5);
    tripState.triggerCheckIn('Sudden velocity spike: walking speed jumped to 41 km/h');
  },

  triggerShake: () => {
    const tripState = useTripStore.getState();
    tripState.triggerCheckIn('Physical impact / fall detected (accelerometer peak 26.8 m/s²)');
  },
}));

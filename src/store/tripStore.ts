import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dbStorage } from '../lib/dbStorage';
import { TripMode, Passenger } from '../types/trip';

interface TripState {
  mode: TripMode | null;
  source: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  
  passengers: Passenger[];
  selectedTransports: { passengerId: string; transportOptionId: string; cost: number; }[];
  selectedHotel: Hotel | null;

  // Actions
  setTripDetails: (details: Partial<Pick<TripState, 'mode' | 'source' | 'destination' | 'startDate' | 'endDate'>>) => void;
  
  addPassenger: (passenger: Passenger) => void;
  removePassenger: (id: string) => void;
  updatePassenger: (id: string, updates: Partial<Passenger>) => void;
  duplicatePassenger: (id: string, newId: string) => void;
  selectTransport: (passengerId: string, option: any) => void;
  deselectTransport: (passengerId: string) => void;
  setHotel: (hotel: Hotel | null) => void;
  reset: () => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
  mode: null,
  source: '',
  destination: '',
  startDate: null,
  endDate: null,
  
  passengers: [],
  selectedTransports: [],
  selectedHotel: null,

  setTripDetails: (details) => set((state) => ({ ...state, ...details })),

  addPassenger: (passenger) => set((state) => ({
    passengers: [...state.passengers, passenger]
  })),

  removePassenger: (id) => set((state) => ({
    passengers: state.passengers.filter(p => p.id !== id),
    selectedTransports: state.selectedTransports.filter(t => t.passengerId !== id)
  })),

  updatePassenger: (id, updates) => set((state) => ({
    passengers: state.passengers.map(p => (p.id === id ? { ...p, ...updates } : p))
  })),

  duplicatePassenger: (id, newId) => set((state) => {
    const existing = state.passengers.find(p => p.id === id);
    if (!existing) return state;
    
    const clone: Passenger = { 
      ...existing, 
      id: newId, 
      name: `${existing.name} (Copy)` 
    };
    return { passengers: [...state.passengers, clone] };
  }),

  selectTransport: (passengerId, option) => set((state) => {
    const newSelection = {
      passengerId,
      transportOptionId: option.id,
      cost: option.price
    };
    return {
      selectedTransports: [
        ...state.selectedTransports.filter(t => t.passengerId !== passengerId),
        newSelection
      ]
    };
  }),

  deselectTransport: (passengerId) => set((state) => ({
    selectedTransports: state.selectedTransports.filter(t => t.passengerId !== passengerId)
  })),

  setHotel: (hotel) => set({ selectedHotel: hotel }),

  reset: () => set({
    mode: null,
    source: '',
    destination: '',
    startDate: null,
    endDate: null,
    passengers: [],
    selectedTransports: [],
    selectedHotel: null
  })
  }),
  {
    name: 'trip-store', // name of the item in the storage (must be unique)
    storage: createJSONStorage(() => dbStorage),
  }
));

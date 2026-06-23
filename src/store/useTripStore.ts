import { create } from 'zustand';

// --- TYPES ---

export type Passenger = {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  pincode: string;
  city: string;
  transportPreference: 'flight' | 'train' | 'bus' | 'any';
};

export type TransportOption = {
  id: string;
  type: 'flight' | 'train' | 'bus' | 'car';
  price: number;
  duration: string; // e.g., '2h 30m'
  departure: string;
  arrival: string;
  availability: string; // e.g., 'Confirmed', 'WL 12'
};

export type SelectedTransport = {
  passengerId: string;
  transportOptionId: string;
  cost: number;
};

export type Place = {
  id: string;
  name: string;
  category: string;
  entryFee: number;
  visitDurationHours: number;
  travelTimeHours: number; // estimated time to reach from base/cluster
};

export type Hotel = {
  id: string;
  name: string;
  pricePerNight: number;
  nights: number;
};

export type ItineraryDay = {
  dayNumber: number;
  date: string;
  placeIds: string[]; // Ordered list of places to visit
};

export type BudgetState = {
  totalBudget: number;
  spent: {
    transport: number;
    places: number;
    hotel: number;
  };
  remaining: number;
  projectedTotal: number;
};

// --- STORE DEFINITION ---

interface TripState {
  // 1. Trip Setup
  mode: 'recommend' | 'direct' | null;
  source: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  baseBudget: number;

  // 2. Passengers
  passengers: Passenger[];

  // 3. Selections
  selectedTransports: SelectedTransport[];
  selectedPlaces: Place[];
  selectedHotel: Hotel | null;

  // 4. Itinerary (Drag and Drop state)
  itineraryDays: ItineraryDay[];

  // --- ACTIONS ---
  setTripSetup: (data: Partial<Pick<TripState, 'mode' | 'source' | 'destination' | 'startDate' | 'endDate' | 'baseBudget'>>) => void;
  
  addPassenger: (passenger: Passenger) => void;
  removePassenger: (id: string) => void;
  updatePassenger: (id: string, data: Partial<Passenger>) => void;
  
  selectTransport: (passengerId: string, transport: TransportOption) => void;
  removeTransport: (passengerId: string) => void;

  togglePlaceSelection: (place: Place) => void; // Adds if missing, removes if exists
  
  setHotel: (hotel: Hotel | null) => void;

  // Itinerary Actions for DnD
  movePlaceToDay: (placeId: string, toDay: number, newIndex: number) => void;

  // --- COMPUTED / DERIVED LOGIC ---
  // Zustand allows getting current state to compute things. We use a function to get the current budget status live.
  getLiveBudget: () => BudgetState;
}

export const useTripStore = create<TripState>((set, get) => ({
  mode: null,
  source: '',
  destination: '',
  startDate: null,
  endDate: null,
  baseBudget: 0,
  passengers: [],
  selectedTransports: [],
  selectedPlaces: [],
  selectedHotel: null,
  itineraryDays: [],

  setTripSetup: (data) => set((state) => ({ ...state, ...data })),

  addPassenger: (passenger) => set((state) => ({ passengers: [...state.passengers, passenger] })),
  
  removePassenger: (id) => set((state) => ({ passengers: state.passengers.filter(p => p.id !== id) })),
  
  updatePassenger: (id, data) => set((state) => ({
    passengers: state.passengers.map(p => p.id === id ? { ...p, ...data } : p)
  })),

  selectTransport: (passengerId, transport) => set((state) => {
    const existing = state.selectedTransports.filter(t => t.passengerId !== passengerId);
    return {
      selectedTransports: [...existing, { passengerId, transportOptionId: transport.id, cost: transport.price }]
    };
  }),

  removeTransport: (passengerId) => set((state) => ({
    selectedTransports: state.selectedTransports.filter(t => t.passengerId !== passengerId)
  })),

  togglePlaceSelection: (place) => set((state) => {
    const exists = state.selectedPlaces.some(p => p.id === place.id);
    if (exists) {
      return { selectedPlaces: state.selectedPlaces.filter(p => p.id !== place.id) };
    }
    return { selectedPlaces: [...state.selectedPlaces, place] };
  }),

  setHotel: (hotel) => set({ selectedHotel: hotel }),

  movePlaceToDay: (placeId, toDay, newIndex) => set((state) => {
    // Advanced DnD logic goes here (remove from old day, insert into new day at index)
    // Stub implementation for structure
    return { ...state };
  }),

  getLiveBudget: () => {
    const state = get();
    
    const spentTransport = state.selectedTransports.reduce((sum, t) => sum + t.cost, 0);
    const spentPlaces = state.selectedPlaces.reduce((sum, p) => sum + p.entryFee, 0); // Excludes dynamic local commute for now
    const spentHotel = state.selectedHotel ? (state.selectedHotel.pricePerNight * state.selectedHotel.nights) : 0;
    
    const totalSpent = spentTransport + spentPlaces + spentHotel;
    const remaining = state.baseBudget - totalSpent;

    return {
      totalBudget: state.baseBudget,
      spent: {
        transport: spentTransport,
        places: spentPlaces,
        hotel: spentHotel
      },
      remaining,
      projectedTotal: totalSpent // In a real app, we'd add an estimated food/commute buffer here
    };
  }
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Place, ItineraryDay } from '../types/trip';

interface ItineraryState {
  days: ItineraryDay[];
  selectedPlaces: Place[]; // Global bag of places selected

  // Actions
  initializeDays: (numberOfDays: number, startDate: string) => void;
  
  addPlaceToBag: (place: Place) => void;
  removePlaceFromBag: (placeId: string) => void;

  assignPlaceToDay: (placeId: string, dayNumber: number) => void;
  movePlaceBetweenDays: (placeId: string, fromDay: number, toDay: number, newIndex?: number) => void;
  
  recalcDay: (dayNumber: number) => void;
}

export const useItineraryStore = create<ItineraryState>()(
  persist(
    (set, get) => ({
  days: [],
  selectedPlaces: [],

  initializeDays: (numberOfDays, startDate) => {
    const newDays: ItineraryDay[] = Array.from({ length: numberOfDays }).map((_, i) => {
      // Very basic date parsing increment (for mock setup)
      const baseDate = new Date(startDate);
      baseDate.setDate(baseDate.getDate() + i);
      
      return {
        dayNumber: i + 1,
        date: baseDate.toISOString().split('T')[0],
        placeIds: [],
        totalTimeHours: 0,
        totalCost: 0,
        warnings: []
      };
    });
    set({ days: newDays });
  },

  addPlaceToBag: (place) => set((state) => {
    if (state.selectedPlaces.some(p => p.id === place.id)) return state;
    return { selectedPlaces: [...state.selectedPlaces, place] };
  }),

  removePlaceFromBag: (placeId) => set((state) => {
    // Also remove it from any day it was assigned to
    const newDays = state.days.map(d => ({
      ...d,
      placeIds: d.placeIds.filter(id => id !== placeId)
    }));

    return {
      selectedPlaces: state.selectedPlaces.filter(p => p.id !== placeId),
      days: newDays
    };
  }),

  assignPlaceToDay: (placeId, dayNumber) => set((state) => {
    const newDays = state.days.map(day => {
      if (day.dayNumber === dayNumber) {
        if (!day.placeIds.includes(placeId)) {
          return { ...day, placeIds: [...day.placeIds, placeId] };
        }
      }
      return day;
    });
    return { days: newDays };
  }),

  movePlaceBetweenDays: (placeId, fromDay, toDay, newIndex) => set((state) => {
    let newDays = [...state.days];
    
    // Remove from old day
    newDays = newDays.map(day => {
      if (day.dayNumber === fromDay) {
        return { ...day, placeIds: day.placeIds.filter(id => id !== placeId) };
      }
      return day;
    });

    // Add to new day
    newDays = newDays.map(day => {
      if (day.dayNumber === toDay) {
        const ids = [...day.placeIds];
        if (newIndex !== undefined) {
          ids.splice(newIndex, 0, placeId);
        } else {
          ids.push(placeId);
        }
        return { ...day, placeIds: ids };
      }
      return day;
    });

    return { days: newDays };
  }),

  recalcDay: (dayNumber) => set((state) => {
    const day = state.days.find(d => d.dayNumber === dayNumber);
    if (!day) return state;

    // Grab actual place data from the selectedPlaces bag
    const placesInDay = day.placeIds.map(id => state.selectedPlaces.find(p => p.id === id)).filter(Boolean) as Place[];

    let totalTime = 0;
    let totalCost = 0;
    
    placesInDay.forEach(p => {
      totalTime += (p.visitDurationHours + p.travelTimeHours);
      totalCost += p.entryFee;
    });

    const warnings: string[] = [];
    if (totalTime > 8) warnings.push('This day is getting too packed (>8 hours)');

    const newDays = state.days.map(d => 
      d.dayNumber === dayNumber ? { ...d, totalTimeHours: totalTime, totalCost, warnings } : d
    );

    return { days: newDays };
  })
  }),
  {
    name: 'itinerary-store', // name of the item in the storage (must be unique)
  }
));

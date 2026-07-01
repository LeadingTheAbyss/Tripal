export type TripMode = 'recommend' | 'direct';

export type Trip = {
  id: string;
  mode: TripMode;
  source: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number;
};

export type Passenger = {
  id: string;
  tripId: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  pincode: string;
  city: string;
  transportPreference: 'flight' | 'train' | 'bus' | 'cab' | 'any';
  remember?: boolean;
};

export type TransportAvailability = 'Confirmed' | string; // e.g. 'WL 12'

export type TransportOption = {
  id: string;
  type: 'flight' | 'train' | 'bus' | 'car' | 'cab';
  source: string;
  destination: string;
  price: number;
  duration: string;
  departure: string;
  arrival: string;
  availability: TransportAvailability;
  comfortScore: number;
  safetyScore: number;
  recommendationScore: number;
};

export type PlaceCategory = 'historical' | 'nature' | 'adventure' | 'religious' | 'food' | 'shopping' | 'nightlife' | 'museum' | 'beach' | 'mountain' | 'wildlife';

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  entryFee: number;
  visitDurationHours: number;
  travelTimeHours: number; // Avg commute
  rating: number;
  safetyScore: number;
  weatherScore: number;
  crowdScore: number;
  recommendationScore: number;
};

export type Hotel = {
  id: string;
  name: string;
  pricePerNight: number;
  distanceToCluster: number;
  safetyScore: number;
  comfortScore: number;
  recommendationScore: number;
  rating: number;
};

export type ItineraryDay = {
  dayNumber: number;
  date: string;
  placeIds: string[];
  totalTimeHours: number;
  totalCost: number;
  warnings: string[];
};

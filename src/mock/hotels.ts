import { Hotel } from '../types/trip';

export const mockHotels: Hotel[] = [
  {
    id: 'h_1',
    name: 'Hotel Snow Peak',
    pricePerNight: 3500,
    distanceToCluster: 1.2,
    safetyScore: 9,
    comfortScore: 8,
    recommendationScore: 92,
    rating: 4.8
  },
  {
    id: 'h_2',
    name: 'Luxury Resort Manali',
    pricePerNight: 8000,
    distanceToCluster: 5.0,
    safetyScore: 9,
    comfortScore: 10,
    recommendationScore: 75, // Lower because of distance
    rating: 4.9
  },
  {
    id: 'h_3',
    name: 'Budget Backpacker Hostel',
    pricePerNight: 800,
    distanceToCluster: 0.5,
    safetyScore: 6,
    comfortScore: 5,
    recommendationScore: 85,
    rating: 4.2
  }
];

import { TransportOption } from '../types/trip';

export const mockTransportOptions: Record<string, TransportOption[]> = {
  'Lucknow-Manali': [
    {
      id: 'tr_1',
      type: 'flight',
      source: 'Lucknow',
      destination: 'Manali',
      price: 8500,
      duration: '7h 20m',
      departure: '08:00',
      arrival: '15:20',
      availability: 'Confirmed',
      comfortScore: 9,
      safetyScore: 8,
      recommendationScore: 87
    },
    {
      id: 'tr_2',
      type: 'train',
      source: 'Lucknow',
      destination: 'Manali',
      price: 1800,
      duration: '16h 00m',
      departure: '17:00',
      arrival: '07:00',
      availability: 'WL 12',
      comfortScore: 6,
      safetyScore: 7,
      recommendationScore: 75
    },
    {
      id: 'tr_3',
      type: 'bus',
      source: 'Lucknow',
      destination: 'Manali',
      price: 2200,
      duration: '14h 00m',
      departure: '19:00',
      arrival: '09:00',
      availability: 'Confirmed',
      comfortScore: 5,
      safetyScore: 6,
      recommendationScore: 68
    }
  ],
  'Pune-Manali': [
    {
      id: 'tr_4',
      type: 'flight',
      source: 'Pune',
      destination: 'Manali',
      price: 6500,
      duration: '4h 20m',
      departure: '08:00',
      arrival: '12:20',
      availability: 'Confirmed',
      comfortScore: 9,
      safetyScore: 9,
      recommendationScore: 92
    }
  ]
};

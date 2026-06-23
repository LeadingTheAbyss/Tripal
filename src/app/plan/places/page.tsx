'use client';

import React, { useEffect, useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { Place } from '@/types/trip';
import { api } from '@/lib/api';
import { ArrowRight, Clock, IndianRupee, MapPin, ShieldCheck, Sun, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PlacesPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  const itinerary = useItineraryStore();
  
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      const data = await api.getPlaces(trip.destination);
      setPlaces(data);
      setLoading(false);
    };
    if (trip.destination) fetchPlaces();
    else setLoading(false);
  }, [trip.destination]);

  const handleTogglePlace = (place: Place) => {
    const isSelected = itinerary.selectedPlaces.some(p => p.id === place.id);

    if (isSelected) {
      // Remove from bag
      itinerary.removePlaceFromBag(place.id);
      // Refund cost
      budget.refundExpense('places', place.entryFee);
    } else {
      // Add to bag
      itinerary.addPlaceToBag(place);
      // Charge cost
      budget.addExpense('places', place.entryFee);
    }
    
    budget.recalcBudget();
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-10 px-4 text-white">
      <div className="max-w-5xl mx-auto space-y-10 pb-24">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">Place Discovery</h1>
            <p className="text-zinc-400">What do you want to experience in {trip.destination || 'the destination'}?</p>
          </div>
          <div className="text-sm font-medium bg-blue-900/50 text-blue-300 px-4 py-2 rounded-full border border-blue-800">
            {itinerary.selectedPlaces.length} Places Selected
          </div>
        </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-500 animate-pulse">
          Curating best attractions...
        </div>
      ) : places.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
          No places found. Go back to Setup and enter a destination.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {places.map((place) => {
            const isSelected = itinerary.selectedPlaces.some(p => p.id === place.id);

            return (
              <div 
                key={place.id}
                className={`
                  relative flex flex-col p-5 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden
                  ${isSelected 
                    ? 'border-blue-500 bg-zinc-900 shadow-md shadow-blue-900/20' 
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:shadow-lg'
                  }
                `}
                onClick={() => handleTogglePlace(place)}
              >
                {/* Visual state toggle */}
                <div className={`absolute top-0 right-0 w-16 h-16 transition-all ${isSelected ? 'bg-blue-500' : 'bg-transparent'} rounded-bl-full -mr-8 -mt-8`} />

                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
                    {place.category}
                  </div>
                  <h3 className="text-xl font-bold text-white leading-tight">{place.name}</h3>
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                      <Clock size={16} className="text-zinc-500" /> {place.visitDurationHours} hrs
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                      <IndianRupee size={16} className="text-zinc-500" /> 
                      {place.entryFee === 0 ? 'Free' : place.entryFee}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                      <ShieldCheck size={16} className={place.safetyScore >= 8 ? "text-green-500" : "text-yellow-500"} /> 
                      Safe ({place.safetyScore}/10)
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                      <Users size={16} className={place.crowdScore >= 8 ? "text-red-500" : "text-zinc-500"} /> 
                      Crowd: {place.crowdScore}/10
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-500">★ {place.rating}</span>
                  <button 
                    className={`font-bold text-sm px-4 py-2 rounded-lg transition-colors ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {isSelected ? '✓ ADDED' : '+ ADD'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONTINUATION */}
      <div className="flex justify-between items-center pt-8 border-t border-zinc-800">
        <button 
          onClick={() => router.push('/plan/transport')}
          className="text-zinc-400 hover:text-white font-medium transition-colors"
        >
          ← Back to Transport
        </button>
        <button 
          onClick={() => router.push('/plan/hotels')}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-transform hover:-translate-y-1"
        >
          Find Hotels <ArrowRight size={20} />
        </button>
      </div>
    </div>
    </div>
  );
}

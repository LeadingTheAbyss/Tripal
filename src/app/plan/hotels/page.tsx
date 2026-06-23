'use client';

import React, { useEffect, useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { Hotel } from '@/types/trip';
import { api } from '@/lib/api';
import { ArrowRight, CheckCircle2, Circle, AlertCircle, MapPin, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HotelsPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate nights
  const calculateNights = () => {
    if (!trip.startDate || !trip.endDate) return 3; // default fallback
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays > 0 ? diffDays : 1;
  };

  const nights = calculateNights();

  useEffect(() => {
    const fetchHotels = async () => {
      setLoading(true);
      const data = await api.getHotels(trip.destination);
      setHotels(data);
      setLoading(false);
    };
    if (trip.destination) fetchHotels();
    else setLoading(false);
  }, [trip.destination]);

  const handleSelectHotel = (hotel: Hotel) => {
    // Refund previous hotel if exists
    if (trip.selectedHotel) {
      budget.refundExpense('hotel', trip.selectedHotel.pricePerNight * trip.selectedHotel.nights);
    }

    const hotelWithNights = { ...hotel, nights };

    // Set new hotel
    trip.setHotel(hotelWithNights);
    
    // Charge new hotel
    budget.addExpense('hotel', hotel.pricePerNight * nights);
    
    budget.recalcBudget();
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-10 px-4 text-white">
      <div className="max-w-4xl mx-auto space-y-12 pb-24">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">Hotel Selection</h1>
            <p className="text-zinc-400">
              Where will you stay for {nights} nights in {trip.destination || 'the destination'}?
            </p>
          </div>
        </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-500 animate-pulse">
          Clustering places and finding best hotels...
        </div>
      ) : hotels.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
          No hotels found. Go back to Setup and enter a destination.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-2 text-sm">
            <button className="bg-blue-900/50 text-blue-300 font-medium px-4 py-2 rounded-lg border border-blue-800">
              Best Overall
            </button>
            <button className="bg-zinc-900 text-zinc-400 font-medium px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors">
              Closest to Places
            </button>
            <button className="bg-zinc-900 text-zinc-400 font-medium px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors">
              Budget
            </button>
          </div>

          <div className="space-y-4">
            {hotels.map((hotel) => {
              const isSelected = trip.selectedHotel?.id === hotel.id;
              const totalCost = hotel.pricePerNight * nights;
              const remainingAfter = budget.remaining + (isSelected ? 0 : (trip.selectedHotel ? (trip.selectedHotel.pricePerNight * nights) : 0)) - totalCost;

              return (
                  <div 
                    key={hotel.id}
                    onClick={() => handleSelectHotel(hotel)}
                    className={`
                      relative flex items-center justify-between p-6 rounded-2xl border-2 cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-900/10 shadow-md shadow-blue-900/20' 
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:shadow-lg'
                      }
                    `}
                  >
                    <div className="flex items-center gap-6">
                      {isSelected ? (
                        <CheckCircle2 className="text-blue-500 w-8 h-8 shrink-0" />
                      ) : (
                        <Circle className="text-zinc-600 w-8 h-8 shrink-0" />
                      )}

                      <div>
                        <h3 className="text-xl font-bold text-white leading-tight mb-1">
                          {hotel.name} <span className="text-sm font-bold text-zinc-500 ml-2">★ {hotel.rating}</span>
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm mt-2">
                          <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                            <MapPin size={16} className="text-zinc-500" /> 
                            {hotel.distanceToCluster}km from your places
                          </span>
                          <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                            <ShieldCheck size={16} className={hotel.safetyScore >= 8 ? "text-green-500" : "text-yellow-500"} /> 
                            Safety: {hotel.safetyScore}/10
                          </span>
                        </div>

                        {/* Warnings if budget tight */}
                        {remainingAfter < 0 && !isSelected && (
                          <div className="mt-3 text-xs font-semibold text-red-400 flex items-center gap-1 bg-red-900/30 px-2 py-1 rounded inline-flex">
                            <AlertCircle size={14} /> Exceeds remaining budget by ₹{Math.abs(remainingAfter).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <div className="text-zinc-400 text-sm mb-1 font-medium">
                        ₹{hotel.pricePerNight.toLocaleString()} / night
                      </div>
                      <div className="text-2xl font-black text-white">
                        ₹{totalCost.toLocaleString()}
                      </div>
                      <div className="text-xs font-bold text-zinc-500 mt-1 uppercase tracking-wider">
                      For {nights} Nights
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTINUATION */}
      <div className="flex justify-between items-center pt-8 border-t border-zinc-800">
        <button 
          onClick={() => router.push('/plan/places')}
          className="text-zinc-400 hover:text-white font-medium transition-colors"
        >
          ← Back to Places
        </button>
        <button 
          onClick={() => router.push('/plan/itinerary')}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-transform hover:-translate-y-1"
        >
          Build Itinerary <ArrowRight size={20} />
        </button>
      </div>
    </div>
    </div>
  );
}

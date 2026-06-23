'use client';

import React, { useEffect, useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { TransportOption, Passenger } from '@/types/trip';
import { api } from '@/lib/api';
import { Plane, Train, Bus, Car, ArrowRight, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TransportPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  
  // Local state to store fetched options per passenger
  const [transportMap, setTransportMap] = useState<Record<string, TransportOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recommended' | 'cheapest' | 'fastest' | 'earliest'>('recommended');

  // Fetch transport options for all passengers on mount
  useEffect(() => {
    const fetchAllTransport = async () => {
      setLoading(true);
      const newMap: Record<string, TransportOption[]> = {};
      
      for (const pax of trip.passengers) {
        if (!pax.city) continue; // Skip if no origin city
        const options = await api.getTransportOptions(pax.city, trip.destination);
        newMap[pax.id] = options;
      }
      
      setTransportMap(newMap);
      setLoading(false);
    };

    if (trip.passengers.length > 0 && trip.destination) {
      fetchAllTransport();
    } else {
      setLoading(false);
    }
  }, [trip.passengers, trip.destination]);

  // Handle transport selection
  const handleSelectTransport = (paxId: string, option: TransportOption) => {
    const existingSelection = trip.selectedTransports.find(t => t.passengerId === paxId);
    if (existingSelection) {
      budget.refundExpense('transport', existingSelection.cost);
    }
    trip.selectTransport(paxId, option);
    budget.addExpense('transport', option.price);
    budget.recalcBudget();
  };

  const getTransportIcon = (type: string) => {
    if (type === 'flight') return <Plane className="text-blue-500" size={20} />;
    if (type === 'train') return <Train className="text-orange-500" size={20} />;
    if (type === 'cab' || type === 'car') return <Car className="text-purple-500" size={20} />;
    return <Bus className="text-green-500" size={20} />;
  };

  const parseDuration = (dur: string) => {
    const hMatch = dur.match(/(\d+)h/);
    const mMatch = dur.match(/(\d+)m/);
    return (hMatch ? parseInt(hMatch[1]) * 60 : 0) + (mMatch ? parseInt(mMatch[1]) : 0);
  };

  const parseTime = (time: string) => {
    const timePart = time.includes(', ') ? time.split(', ')[1] : time;
    if (!timePart) return 0;
    const [h, m] = timePart.split(':').map(Number);
    return h * 60 + m;
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-10 px-4">
      <div className="max-w-4xl mx-auto space-y-12 pb-24 text-white">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">Transport Options</h1>
            <p className="text-zinc-400">Select how everyone is getting to {trip.destination || 'the destination'}.</p>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sort Options</label>
            <select 
              className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 outline-none focus:border-blue-500 text-sm font-medium text-white cursor-pointer shadow-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="recommended">★ Recommended</option>
              <option value="cheapest">Cheapest First</option>
              <option value="fastest">Fastest First</option>
              <option value="earliest">Earliest Departure</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 animate-pulse">
            Searching routes across multiple APIs...
          </div>
        ) : trip.passengers.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
            No passengers added yet. Please go back to Setup.
          </div>
        ) : (
          <div className="space-y-10">
            {trip.passengers.map((pax) => {
              const rawOptions = transportMap[pax.id] || [];
              
              // Sort options based on user preference
              let options = [...rawOptions];
              if (sortBy === 'cheapest') {
                options.sort((a, b) => a.price - b.price);
              } else if (sortBy === 'fastest') {
                options.sort((a, b) => parseDuration(a.duration) - parseDuration(b.duration));
              } else if (sortBy === 'earliest') {
                options.sort((a, b) => parseTime(a.departure) - parseTime(b.departure));
              } else {
                // 'recommended' - already sorted by backend recommendation engine
                options = [...rawOptions];
              }

              const selectedTransportId = trip.selectedTransports.find(t => t.passengerId === pax.id)?.transportOptionId;

              return (
                <section key={pax.id} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
                  <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{pax.name}</h3>
                      <p className="text-sm text-zinc-400">
                        {pax.city || 'Unknown Origin'} → {trip.destination}
                      </p>
                    </div>
                    {pax.transportPreference && pax.transportPreference !== 'any' && (
                      <div className="text-sm font-medium bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">
                        Prefers: {pax.transportPreference}
                      </div>
                    )}
                  </div>

                  {options.length === 0 ? (
                    <div className="text-zinc-500 text-sm flex items-center gap-2">
                      <AlertCircle size={16} /> No transport options found for this route.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {options.map((opt) => {
                        const isSelected = selectedTransportId === opt.id;
                        // Only show recommended badge if we are in recommended sort mode
                        const isRecommended = sortBy === 'recommended' && opt.recommendationScore > 85;

                        return (
                          <div 
                            key={opt.id}
                            onClick={() => handleSelectTransport(pax.id, opt)}
                            className={`
                              relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all
                              ${isSelected 
                                ? 'border-blue-500 bg-blue-900/20 shadow-sm' 
                                : 'border-zinc-800 hover:border-blue-500 hover:bg-zinc-800/50'
                              }
                            `}
                          >
                            <div className="flex items-center gap-4">
                              {isSelected ? (
                                <CheckCircle2 className="text-blue-500" />
                              ) : (
                                <Circle className="text-zinc-600" />
                              )}
                              
                              <div className="p-3 bg-zinc-800 rounded-lg shadow-sm border border-zinc-700">
                                {getTransportIcon(opt.type)}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold uppercase tracking-wider text-sm">{opt.provider || opt.type}</span>
                                  {isRecommended && (
                                    <span className="text-[10px] bg-yellow-900/30 text-yellow-500 border border-yellow-900/50 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                      ★ RECOMMENDED
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-zinc-400 mt-1">
                                  {opt.departure} <ArrowRight className="inline mx-1" size={14}/> {opt.arrival} ({opt.duration})
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xl font-bold text-white">₹{opt.price.toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* CONTINUATION */}
        <div className="flex justify-between items-center pt-8 border-t border-zinc-800">
          <button 
            onClick={() => router.push('/plan/setup')}
            className="text-zinc-400 hover:text-white font-medium"
          >
            ← Back to Setup
          </button>
          <button 
            onClick={() => router.push('/plan/places')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-transform hover:-translate-y-1"
          >
            Discover Places <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

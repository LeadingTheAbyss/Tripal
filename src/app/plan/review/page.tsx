'use client';

import React from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { Place } from '@/types/trip';
import { 
  CheckCircle, AlertTriangle, CloudRain, ShieldAlert, 
  MapPin, IndianRupee, Clock, Users, ArrowRight 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReviewPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  const itinerary = useItineraryStore();

  // Phase 9 & 10: Validation & Weather Mocks
  const generateWarnings = () => {
    const warnings = [];
    
    // Budget Validation
    if (budget.remaining < 0) {
      warnings.push({
        type: 'critical',
        icon: <IndianRupee className="text-red-500" />,
        text: `You are over budget by ₹${Math.abs(budget.remaining).toLocaleString()}.`
      });
    } else if (budget.remaining < budget.totalBudget * 0.1) {
      warnings.push({
        type: 'warning',
        icon: <AlertTriangle className="text-yellow-500" />,
        text: 'Budget is very tight. Consider leaving a 10% buffer for local commute and food.'
      });
    }

    // Weather Mock (Phase 10)
    if (trip.destination?.toLowerCase().includes('manali') && trip.startDate?.includes('-07-') || trip.startDate?.includes('-08-')) {
      warnings.push({
        type: 'weather',
        icon: <CloudRain className="text-blue-500" />,
        text: 'Monsoon season detected. Keep flexible indoor fallbacks for outdoor activities.'
      });
    }

    // Safety Mock (Phase 9)
    const lowSafetyPlaces = itinerary.selectedPlaces.filter(p => p.safetyScore < 7);
    if (lowSafetyPlaces.length > 0) {
      warnings.push({
        type: 'safety',
        icon: <ShieldAlert className="text-orange-500" />,
        text: `Safety alert: ${lowSafetyPlaces.map(p => p.name).join(', ')} have lower safety ratings. Avoid visiting after sunset.`
      });
    }

    // Itinerary Packing Validation
    const overloadedDays = itinerary.days.filter(d => d.totalTimeHours > 8);
    if (overloadedDays.length > 0) {
      warnings.push({
        type: 'time',
        icon: <Clock className="text-yellow-500" />,
        text: `Days ${overloadedDays.map(d => d.dayNumber).join(', ')} are packed with over 8 hours of activity. This may cause burnout.`
      });
    }

    return warnings;
  };

  const warnings = generateWarnings();

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Your Final Trip Plan</h1>
        <p className="text-zinc-500 text-lg">
          {trip.source || 'Origin'} to {trip.destination || 'Destination'} • {trip.startDate} to {trip.endDate}
        </p>
      </div>

      {/* WARNINGS & INTELLIGENCE LAYER */}
      {warnings.length > 0 && (
        <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2">
            Intelligence Report
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {warnings.map((w, i) => (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${
                w.type === 'critical' ? 'bg-red-50 border-red-200 text-red-900' :
                w.type === 'weather' ? 'bg-blue-50 border-blue-200 text-blue-900' :
                'bg-yellow-50 border-yellow-200 text-yellow-900'
              }`}>
                <div className="mt-0.5 shrink-0">{w.icon}</div>
                <div className="font-medium text-sm leading-relaxed">{w.text}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FINANCIAL SUMMARY */}
      <section className="bg-zinc-900 text-white p-8 rounded-2xl shadow-xl">
        <h3 className="text-xl font-bold mb-6 text-zinc-100 flex items-center gap-2">
          Financial Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-zinc-400 text-sm font-medium mb-1">Total Budget</div>
            <div className="text-2xl font-bold">₹{budget.totalBudget.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-zinc-400 text-sm font-medium mb-1">Transport</div>
            <div className="text-2xl font-bold">₹{budget.spentTransport.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-zinc-400 text-sm font-medium mb-1">Stay & Places</div>
            <div className="text-2xl font-bold">₹{(budget.spentHotels + budget.spentPlaces).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-zinc-400 text-sm font-medium mb-1">Remaining</div>
            <div className={`text-2xl font-bold ${budget.remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
              ₹{budget.remaining.toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      {/* LOGISTICS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2"><Users size={18}/> Passengers</h3>
            <button onClick={() => router.push('/plan/setup')} className="text-sm text-blue-600 font-medium hover:underline">Edit</button>
          </div>
          <ul className="space-y-3">
            {trip.passengers.map(pax => {
              const transport = trip.selectedTransports.find(t => t.passengerId === pax.id);
              return (
                <li key={pax.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-zinc-700">{pax.name}</span>
                  <span className="text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                    {transport ? 'Ticket booked' : 'No transport'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2"><MapPin size={18}/> Hotel</h3>
            <button onClick={() => router.push('/plan/hotels')} className="text-sm text-blue-600 font-medium hover:underline">Edit</button>
          </div>
          {trip.selectedHotel ? (
            <div>
              <div className="font-bold text-zinc-900">{trip.selectedHotel.name}</div>
              <div className="text-sm text-zinc-500 mt-1">{trip.selectedHotel.nights} Nights • ₹{(trip.selectedHotel.pricePerNight * trip.selectedHotel.nights).toLocaleString()}</div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500 italic">No hotel selected.</div>
          )}
        </section>
      </div>

      {/* FULL ITINERARY */}
      <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-zinc-900">Your Itinerary</h3>
          <button onClick={() => router.push('/plan/itinerary')} className="text-sm text-blue-600 font-medium hover:underline">Edit Schedule</button>
        </div>
        
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 before:to-transparent">
          {itinerary.days.map((day) => {
            const places = day.placeIds.map(id => itinerary.selectedPlaces.find(p => p.id === id)).filter(Boolean) as Place[];
            
            return (
              <div key={day.dayNumber} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white font-bold text-sm shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  {day.dayNumber}
                </div>
                
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-zinc-900">{day.date}</span>
                    <span className="text-xs font-bold text-zinc-500 bg-zinc-200 px-2 py-0.5 rounded">{day.totalTimeHours} hrs</span>
                  </div>
                  
                  {places.length > 0 ? (
                    <ul className="space-y-2 mt-3">
                      {places.map((p, idx) => (
                        <li key={p.id} className="text-sm flex items-start gap-2 text-zinc-700">
                          <span className="text-blue-500 font-bold mt-0.5">{idx + 1}.</span> 
                          <div>
                            <span className="font-medium">{p.name}</span>
                            <div className="text-xs text-zinc-400">{p.visitDurationHours}h • ₹{p.entryFee}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-zinc-400 italic mt-2">Free day / No places scheduled.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CONTINUATION */}
      <div className="flex justify-center pt-8">
        <button 
          onClick={() => alert('Trip saved! In a real app, this would lock the snapshot in the database.')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-xl font-bold flex items-center gap-2 shadow-xl transition-transform hover:-translate-y-1 text-lg"
        >
          <CheckCircle size={24} /> Confirm & Save Trip
        </button>
      </div>

    </div>
  );
}

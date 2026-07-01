'use client';

import React, { useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import CityAutocomplete from '@/components/CityAutocomplete';
import ModernDateRangePicker from '@/components/ModernDateRangePicker';
import { Plane, Plus, Trash2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const TRIP_STYLES = [
  { id: 'family', label: 'Family' },
  { id: 'solo', label: 'Solo' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'luxury', label: 'Luxury' }
];

export default function TripSetupPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  const { user } = useAuthStore();
  const [tripStyle, setTripStyle] = useState('family');
  const [error, setError] = useState('');
  const [savedPassengers, setSavedPassengers] = useState<any[]>([]);

  React.useEffect(() => {
    if (user) {
      fetch('/api/passengers', {
        headers: { 'x-user-id': user.id }
      })
        .then(res => res.json())
        .then(data => {
          if (data.passengers) setSavedPassengers(data.passengers);
        })
        .catch(console.error);
    }
  }, [user]);

  const handleAddPassenger = () => {
    trip.addPassenger({
      id: `pax_${Date.now()}`,
      tripId: 'TRIP_CURRENT',
      name: '',
      age: '' as unknown as number,
      gender: '' as any,
      pincode: '',
      city: '',
      transportPreference: 'any'
    });
  };

  const handleContinue = async () => {
    setError('');
    const validPassengers = trip.passengers.filter(p => p.name.trim() !== '');
    if (validPassengers.length === 0) {
      setError('Please add at least one passenger.');
      return;
    }
    if (!budget.totalBudget || budget.totalBudget <= 0) {
      setError('Please enter a valid total budget for the trip.');
      return;
    }

    // Save remembered passengers to DB
    if (user) {
      const passengersToSave = validPassengers.filter(p => p.remember);
      if (passengersToSave.length > 0) {
        await Promise.all(passengersToSave.map(p => 
          fetch('/api/passengers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
            body: JSON.stringify({ name: p.name, age: p.age, gender: p.gender, city: p.city })
          }).catch(console.error)
        ));
      }
    }

    router.push('/plan/transport');
  };

  return (
    <div className="w-full min-h-full flex items-center justify-center p-8" style={{ fontFamily: "'Outfit', sans-serif" }}>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl flex flex-col md:flex-row shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800"
      >
        
        {/* Main Configuration Body */}
        <div className="flex-[2] bg-white dark:bg-[#111111] text-black dark:text-white p-8 lg:p-12 relative border-r border-neutral-200 dark:border-neutral-900 transition-colors">
          
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-light tracking-tight text-neutral-900 dark:text-white">Trip Details</h2>
          </div>

          <div className="space-y-10">
            {/* Row 1: Destination & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Destination</label>
                <div className="relative text-white z-50">
                  <CityAutocomplete 
                    label="" 
                    placeholder="Where to?" 
                    value={trip.destination} 
                    onChange={(val) => {
                      if (val !== trip.destination) {
                        budget.reset();
                        useItineraryStore.getState().reset();
                        trip.setTripDetails({ destination: val, selectedTransports: [], selectedHotel: null });
                      }
                    }} 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Dates</label>
                <div className="relative text-white z-40">
                  <ModernDateRangePicker 
                    label=""
                    startDate={trip.startDate}
                    endDate={trip.endDate}
                    onChange={(start, end) => trip.setTripDetails({ startDate: start, endDate: end })}
                    minDate={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Passengers */}
            <div className="pt-8 border-t border-neutral-800">
               <div className="flex justify-between items-end mb-5">
                 <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Passengers</label>
                 <button onClick={handleAddPassenger} className="text-neutral-400 hover:text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                   <Plus size={12}/> Add Passenger
                 </button>
               </div>

               <div className="space-y-4">
                  {trip.passengers.map((pax, i) => (
                    <div key={pax.id} className="relative bg-white dark:bg-[#161616] border border-neutral-200 dark:border-neutral-800/60 rounded-2xl p-6 mb-4 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
                      {/* Header */}
                      <div className="flex justify-between items-center mb-5">
                        <div className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">Passenger {String(i + 1).padStart(2, '0')}</div>
                        {i > 0 && (
                          <button onClick={() => trip.removePassenger(pax.id)} className="text-red-500/50 hover:text-red-500 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        {/* Name Input with Autocomplete */}
                        <div className="md:col-span-5 relative">
                          <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Full Name</label>
                          <input 
                            type="text" placeholder="e.g. John Doe"
                            className="w-full h-11 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 text-sm text-black dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                            value={pax.name} 
                            onChange={(e) => trip.updatePassenger(pax.id, { name: e.target.value })}
                          />
                          {pax.name && [...savedPassengers, ...trip.passengers.filter(p => p.remember && p.id !== pax.id && p.name)]
                            .filter((sp, index, self) => index === self.findIndex((t) => t.name === sp.name))
                            .filter(sp => sp.name.toLowerCase().startsWith(pax.name.toLowerCase()) && sp.name !== pax.name).length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                              {[...savedPassengers, ...trip.passengers.filter(p => p.remember && p.id !== pax.id && p.name)]
                                .filter((sp, index, self) => index === self.findIndex((t) => t.name === sp.name))
                                .filter(sp => sp.name.toLowerCase().startsWith(pax.name.toLowerCase()) && sp.name !== pax.name)
                                .map((sp, idx) => (
                                  <button
                                    key={idx}
                                    className="w-full text-left px-4 py-3 text-sm text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors border-b border-neutral-100 dark:border-neutral-800/50 last:border-0"
                                    onClick={() => {
                                      trip.updatePassenger(pax.id, {
                                        name: sp.name,
                                        age: sp.age,
                                        gender: sp.gender as any,
                                        city: sp.city || pax.city
                                      });
                                    }}
                                  >
                                    <div className="font-medium text-black dark:text-white">{sp.name}</div>
                                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 tracking-wide uppercase">{sp.city || 'Unknown City'} • {sp.age}yo • {sp.gender}</div>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Age Input */}
                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Age</label>
                          <input 
                            type="number" placeholder="Years" min="1" max="120"
                            className="w-full h-11 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 text-sm text-black dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                            value={pax.age || ''} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              trip.updatePassenger(pax.id, { age: isNaN(val) ? '' as any : Math.max(1, val) });
                            }}
                          />
                        </div>

                        {/* Gender Select */}
                        <div className="md:col-span-4">
                          <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Gender</label>
                          <div className="relative">
                            <select 
                              className="w-full h-11 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 text-sm text-black dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all appearance-none"
                              value={pax.gender || ''} 
                              onChange={(e) => trip.updatePassenger(pax.id, { gender: e.target.value as any })}
                            >
                              <option value="" disabled>Select</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* City Input */}
                        <div className="md:col-span-6 relative z-10">
                          <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Current City</label>
                          <CityAutocomplete 
                            label="" placeholder="Where is this person currently" 
                            value={pax.city || ''} 
                            onChange={(val) => trip.updatePassenger(pax.id, { city: val })} 
                          />
                        </div>

                        {/* Remember Checkbox */}
                        <div className="md:col-span-6 flex items-end pb-3 pl-2">
                           <label className="flex items-center gap-2.5 cursor-pointer text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest hover:text-black dark:hover:text-white transition-colors">
                             <input 
                               type="checkbox" 
                               checked={pax.remember || false}
                               onChange={(e) => trip.updatePassenger(pax.id, { remember: e.target.checked })}
                               className="accent-black dark:accent-white w-4 h-4 rounded-md border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 cursor-pointer"
                             />
                             Remember this passenger
                           </label>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

          </div>
        </div>

        {/* Right Configuration Stub */}
        <div className="flex-1 bg-neutral-50 dark:bg-[#0A0A0A] text-black dark:text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden transition-colors">
           
           <div className="space-y-10 relative z-10">
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-4">Total Budget (INR)</label>
                <div className="flex items-center gap-3 border-b border-neutral-300 dark:border-neutral-800 pb-3 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors">
                  <span className="text-xl font-medium text-neutral-500">₹</span>
                  <input 
                    type="number" min="1" placeholder="100000"
                    value={budget.totalBudget || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      budget.setTotalBudget(isNaN(val) ? 0 : Math.max(1, val));
                    }}
                    className="w-full bg-transparent border-none focus:outline-none text-3xl font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-700"
                  />
                </div>
             </div>

             <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-4">Trip Style</label>
                <div className="flex flex-wrap gap-2.5">
                  {TRIP_STYLES.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setTripStyle(style.id)}
                      className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-full transition-all ${tripStyle === style.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent border border-neutral-300 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
             </div>
           </div>

           <div className="mt-12 relative z-10 flex flex-col items-center">
             {error && (
               <div className="mb-4 text-red-400 text-[11px] font-bold uppercase tracking-widest bg-red-500/10 px-4 py-2 rounded">
                 {error}
               </div>
             )}
             <button 
                onClick={handleContinue}
                className="w-full py-3.5 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2.5 rounded-lg"
              >
                Continue to Transport <ArrowRight size={14}/>
              </button>
           </div>
           
           {/* Subtle Background Accent */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
        </div>

      </motion.div>
    </div>
  );
}

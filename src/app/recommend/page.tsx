'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { api } from '@/lib/api';
import { useTripStore } from '@/store/tripStore';
import { useAuthStore } from '@/store/authStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Map, IndianRupee, Plus, Trash2, CalendarDays, SlidersHorizontal, Filter, X, ChevronRight, Compass, Zap, ShieldCheck } from 'lucide-react';
import CityAutocomplete from '@/components/CityAutocomplete';
import { motion, AnimatePresence } from 'framer-motion';

const PREFERENCES = [
  { id: 'mountains', label: 'Mountains' },
  { id: 'beaches', label: 'Beaches' },
  { id: 'heritage', label: 'Heritage' },
  { id: 'wildlife', label: 'Wildlife' },
  { id: 'spiritual', label: 'Spiritual' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'food', label: 'Food & Culinary' },
  { id: 'nightlife', label: 'Nightlife' },
];

export default function RecommendPage() {
  const router = useRouter();
  const trip = useTripStore();
  const { user, isLoading, fetchUser } = useAuthStore();
  
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/recommend');
    }
  }, [user, isLoading, router]);
  
  const [form, setForm] = useState({
    passengers: [{ city: '' }],
    budget: 100000,
    days: 4,
    preference: ['mountains'] as string[]
  });
  const [showCustomVibe, setShowCustomVibe] = useState(false);
  const [customVibe, setCustomVibe] = useState('');

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);
  const [rawResults, setRawResults] = useState<any[]>([]);
  
  // Filters State
  const [sortBy, setSortBy] = useState('match');
  const [filterPrimaryOnly, setFilterPrimaryOnly] = useState(false);

  const handleAddPassenger = () => {
    if (form.passengers.length >= 10) return;
    setForm({ ...form, passengers: [...form.passengers, { city: '' }] });
  };

  const handleCityChange = (index: number, city: string) => {
    const newPax = [...form.passengers];
    newPax[index].city = city;
    setForm({ ...form, passengers: newPax });
  };

  const handleSearch = async () => {
    setError('');
    
    const validPassengers = form.passengers.filter(p => p.city && p.city.trim() !== '');
    if (validPassengers.length === 0) {
      setError('Please select a Current City.');
      return;
    }

    if (!form.days || form.days <= 0) {
      setError('Please enter a valid Duration (in days).');
      return;
    }

    const finalPreferences = [...form.preference];
    if (showCustomVibe && customVibe.trim() !== '') {
      finalPreferences.push(customVibe.trim());
    }

    if (finalPreferences.length === 0) {
      setError('Please select at least one Vibe Filter or type a custom one.');
      return;
    }

    setLoading(true);

    const data = await api.getRecommendations({
      passengers: validPassengers,
      total_budget: form.budget,
      days: form.days,
      preference: finalPreferences.join(' and ')
    });
    setRawResults(data);
    setLoading(false);
  };

  const handleSelectDestination = (destName: string) => {
    useTripStore.getState().reset();
    useBudgetStore.getState().reset();
    useItineraryStore.getState().reset();

    trip.setTripDetails({ 
      mode: 'recommend',
      destination: destName.split(',')[0],
      baseBudget: form.budget
    });

    useBudgetStore.getState().setTotalBudget(form.budget);

    if (trip.passengers.length === 0) {
      form.passengers.filter(p => p.city.trim() !== '').forEach((p, i) => {
        trip.addPassenger({
          id: `pax_${Date.now()}_${i}`,
          tripId: 'TRIP_CURRENT',
          name: `Traveler ${i+1}`,
          age: 25,
          gender: 'other',
          pincode: '',
          city: p.city,
          transportPreference: 'any'
        });
      });
    }

    router.push('/plan/setup');
  };

  const filteredResults = useMemo(() => {
    let filtered = [...rawResults];
    if (filterPrimaryOnly) filtered = filtered.filter(r => r.isPrimaryMatch);

    filtered.sort((a, b) => {
      if (sortBy === 'price_asc') return (a.budgetEstimate || 0) - (b.budgetEstimate || 0);
      if (sortBy === 'price_desc') return (b.budgetEstimate || 0) - (a.budgetEstimate || 0);
      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    return filtered;
  }, [rawResults, filterPrimaryOnly, sortBy]);

  return (
    <div className="w-full h-full pb-24">

      <main className="max-w-[1400px] mx-auto px-12 pt-20 flex flex-col gap-24">
        
        {/* Intent Configuration (Distilled) */}
        <section className="flex flex-col xl:flex-row gap-16 items-start pb-24 border-b border-neutral-200 dark:border-neutral-900 transition-colors">
          <div className="flex-1 space-y-6 self-start">
            <h2 className="text-6xl lg:text-8xl font-light tracking-tighter text-neutral-900 dark:text-white transition-colors">Where next?</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-2xl font-light transition-colors">Tell us your vibe, and our AI will handle the rest.</p>
          </div>
          
          <div className="flex-[2] flex flex-wrap gap-10 items-end justify-end">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center w-64">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Current Cities</label>
                {form.passengers.length < 10 && (
                  <button onClick={handleAddPassenger} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-widest flex items-center gap-1">
                    <Plus size={12}/> Add
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-3 w-64 text-black">
                {form.passengers.map((pax, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <CityAutocomplete 
                        label="" placeholder={`Person ${idx + 1} city...`} 
                        value={pax.city}
                        onChange={(val) => handleCityChange(idx, val)}
                      />
                    </div>
                    {form.passengers.length > 1 && (
                      <button 
                        onClick={() => {
                          const newPax = [...form.passengers];
                          newPax.splice(idx, 1);
                          setForm({ ...form, passengers: newPax });
                        }} 
                        className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Budget limit (Optional)</label>
              <div className="flex items-center gap-3 border-b border-neutral-300 dark:border-neutral-800 pb-3 transition-colors">
                <span className="text-neutral-400 dark:text-neutral-600 font-light text-xl">₹</span>
                <input 
                  type="number" min="1" className="w-32 bg-transparent border-none focus:outline-none text-2xl text-neutral-900 dark:text-white font-light"
                  value={form.budget || ''} onChange={e => {
                    const val = parseInt(e.target.value);
                    setForm({...form, budget: isNaN(val) ? '' as any : Math.max(1, val)});
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Duration</label>
              <div className="flex items-center gap-3 border-b border-neutral-300 dark:border-neutral-800 pb-3 transition-colors">
                <input 
                  type="number" min="1" className="w-16 bg-transparent border-none focus:outline-none text-2xl text-neutral-900 dark:text-white font-light text-center"
                  value={form.days || ''} onChange={e => {
                    const val = parseInt(e.target.value);
                    setForm({...form, days: isNaN(val) ? '' as any : Math.max(1, val)});
                  }}
                />
                <span className="text-neutral-600 text-sm font-light uppercase tracking-widest">Days</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Vibe Filter</label>
              <div className="flex flex-wrap gap-3 max-w-[600px]">
                {PREFERENCES.map(pref => (
                  <button
                    key={pref.id}
                    onClick={() => setForm({ ...form, preference: form.preference.includes(pref.id) ? form.preference.filter(p => p !== pref.id) : [...form.preference, pref.id] })}
                    className={`px-5 py-3 text-[10px] uppercase tracking-widest font-bold transition-all ${form.preference.includes(pref.id) ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-white'}`}
                  >
                    {pref.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowCustomVibe(!showCustomVibe)}
                  className={`px-5 py-3 text-[10px] uppercase tracking-widest font-bold transition-all ${showCustomVibe ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent text-neutral-500 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-white'}`}
                >
                  Other
                </button>
                
                {showCustomVibe && (
                  <input 
                    type="text" 
                    placeholder="Type your vibe..."
                    value={customVibe}
                    onChange={(e) => setCustomVibe(e.target.value)}
                    className="px-5 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs outline-none focus:border-neutral-500 dark:focus:border-white w-48 transition-colors"
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 items-end ml-6">
              {error && (
                <div className="text-red-500 text-[10px] font-bold tracking-widest uppercase bg-red-500/10 px-4 py-2 border border-red-500/20">
                  {error}
                </div>
              )}
              <button 
                onClick={handleSearch} disabled={loading}
                className="bg-blue-600 text-white px-10 py-5 font-bold uppercase tracking-widest text-xs hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center gap-4 w-full justify-center"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Compass size={18} />} 
                {loading ? 'Synthesizing...' : 'Execute'}
              </button>
            </div>
          </div>
        </section>

        {/* Results Dashboard */}
        <AnimatePresence mode="wait">
          {rawResults.length > 0 && !loading && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-20"
            >
              <div className="flex justify-between items-end pb-8">
                <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Recommended Itineraries</h2>
                <div className="flex items-center gap-4">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.2em]">Sort</label>
                  <select 
                    className="bg-transparent border-none text-neutral-300 text-xs font-bold uppercase tracking-widest focus:outline-none cursor-pointer"
                    value={sortBy} onChange={e => setSortBy(e.target.value)}
                  >
                    <option value="match" className="bg-[#111]">Optimal Match</option>
                    <option value="price_asc" className="bg-[#111]">Lowest Cost</option>
                    <option value="price_desc" className="bg-[#111]">Highest Cost</option>
                  </select>
                </div>
              </div>

              {/* Layout Overhaul: Dynamic Presentation */}
              <div className="flex flex-col gap-24">
                
                {/* Hero Block (First Result) */}
                {filteredResults.length > 0 && (
                  <div className="w-full flex flex-col lg:flex-row gap-20 group">
                    <div className="flex-1 space-y-10">
                      <div className="flex items-center gap-6">
                        <span className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em]">
                          Primary Recommendation
                        </span>
                        <span className="text-neutral-500 text-xs font-bold tracking-[0.2em]">
                          {filteredResults[0].matchScore}% Match
                        </span>
                      </div>

                      <div>
                        <h3 className="text-7xl lg:text-9xl font-light tracking-tighter text-white leading-none mb-4">
                          {filteredResults[0].name}
                        </h3>
                        <p className="text-3xl font-light text-neutral-500">{filteredResults[0].state}</p>
                      </div>

                      <p className="text-2xl font-light leading-relaxed text-neutral-400 max-w-3xl">
                        {filteredResults[0].why}
                      </p>

                      <div className="flex gap-16 pt-12 mt-12 border-t border-neutral-900">
                        <div>
                          <p className="text-xs text-neutral-600 font-bold uppercase tracking-[0.2em] mb-3">Est. Budget</p>
                          <p className="text-5xl font-light text-white">₹{filteredResults[0].budgetEstimate?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-600 font-bold uppercase tracking-[0.2em] mb-3">Per Person</p>
                          <p className="text-3xl font-light text-neutral-500 mt-2">~₹{filteredResults[0].perPersonEstimate?.toLocaleString()}</p>
                        </div>
                      </div>

                      <button onClick={() => handleSelectDestination(filteredResults[0].name)} className="mt-8 px-10 py-5 bg-white text-black hover:bg-neutral-200 transition-colors font-bold uppercase tracking-widest text-sm flex items-center gap-4">
                        Initiate Plan <ArrowRight size={18}/>
                      </button>
                    </div>

                    <div className="flex-[0.8] aspect-square lg:aspect-auto bg-[#0A0A0A] overflow-hidden relative">
                       {/* Sleek monochromatic aesthetic for the placeholder */}
                       <div className="absolute inset-0 bg-gradient-to-br from-[#111111] to-[#000000]" />
                       <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                         <Map size={300} />
                       </div>
                    </div>
                  </div>
                )}

                {/* Alternative Rows (List Layout) */}
                <div className="flex flex-col gap-12 pt-20 border-t border-neutral-900">
                  {filteredResults.slice(1).map((dest, i) => (
                    <div key={dest.id || i} className="flex flex-col md:flex-row items-start md:items-center justify-between py-12 group hover:px-8 transition-all duration-500 cursor-pointer -mx-8 bg-transparent hover:bg-[#0A0A0A]" onClick={() => handleSelectDestination(dest.name)}>
                      
                      <div className="flex-1 flex items-center gap-12">
                        <div className="w-16 text-center">
                          <span className="text-neutral-800 font-bold text-3xl group-hover:text-neutral-600 transition-colors">
                            {String(i + 2).padStart(2, '0')}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-5xl font-light text-white">{dest.name}</h3>
                          <p className="text-xl font-light text-neutral-500 mt-2">{dest.state}</p>
                        </div>
                      </div>

                      <div className="flex-1 px-12 hidden lg:block">
                        <p className="text-lg font-light text-neutral-400 line-clamp-2">
                          {dest.why}
                        </p>
                      </div>

                      <div className="flex items-center gap-12 text-right pl-8">
                        <div>
                          <p className="text-xs text-neutral-600 font-bold uppercase tracking-[0.2em] mb-2">Score</p>
                          <p className="text-2xl font-light text-white">{dest.matchScore}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-600 font-bold uppercase tracking-[0.2em] mb-2">Budget</p>
                          <p className="text-2xl font-light text-white">₹{dest.budgetEstimate?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-600 font-bold uppercase tracking-[0.2em] mb-2">Per Person</p>
                          <p className="text-2xl font-light text-white">~₹{dest.perPersonEstimate?.toLocaleString()}</p>
                        </div>
                        <div className="w-16 h-16 shrink-0 flex items-center justify-center rounded-full border border-neutral-800 group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-500">
                          <ArrowRight size={24} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500"/>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {loading && (
            <div className="py-40 flex flex-col items-center justify-center space-y-12">
              <div className="w-20 h-20 border border-neutral-800 border-t-white rounded-full animate-spin" />
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em] animate-pulse">Running location analysis algorithms...</p>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

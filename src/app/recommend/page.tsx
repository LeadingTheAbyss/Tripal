'use client';

import React, { useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Map, IndianRupee, Plus, Trash2, CalendarDays, SlidersHorizontal, Filter, X, ChevronRight, Compass, Zap, ShieldCheck } from 'lucide-react';
import CityAutocomplete from '@/components/CityAutocomplete';
import { motion, AnimatePresence } from 'framer-motion';

const PREFERENCES = [
  { id: 'mountains', label: '🏔️ Mountains' },
  { id: 'beaches', label: '🏖️ Beaches' },
  { id: 'heritage', label: '🏛️ Heritage' },
  { id: 'wildlife', label: '🌿 Wildlife' },
  { id: 'spiritual', label: '🛕 Spiritual' }
];

export default function RecommendPage() {
  const router = useRouter();
  const trip = useTripStore();
  
  const [form, setForm] = useState({
    passengers: [{ city: '' }],
    budget: 100000,
    days: 4,
    preference: ['mountains']
  });

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
    setLoading(true);
    const validPassengers = form.passengers.filter(p => p.city.trim() !== '');
    
    const data = await api.getRecommendations({
      passengers: validPassengers,
      total_budget: form.budget,
      days: form.days,
      preference: form.preference.join(' and ')
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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 font-sans pb-24 relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vw] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <header className="relative z-50 p-8 flex justify-between items-center border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <h1 className="text-2xl font-bold tracking-tight text-white cursor-pointer" onClick={() => router.push('/')}>
          Ghumi-Ghumi <span className="text-primary text-sm font-normal uppercase tracking-widest ml-2">Intelligence</span>
        </h1>
        <div className="flex gap-4 items-center">
          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/70 flex items-center gap-2">
            <Sparkles size={14} className="text-primary" /> AI Active
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 flex flex-col gap-12">
        
        {/* Intent Configuration */}
        <section className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-2xl flex flex-col xl:flex-row gap-8 items-center">
          <div className="flex-1 space-y-2">
            <h2 className="text-3xl font-light">Tell us what you crave.</h2>
            <p className="text-white/50">Our AI will map out the optimal destinations, routes, and budget distributions.</p>
          </div>
          
          <div className="flex-[2] flex flex-wrap gap-4 items-center justify-end">
            <div className="relative group text-black min-w-[200px]">
              <CityAutocomplete 
                label="" placeholder="Starting from..." 
                value={form.passengers[0].city}
                onChange={(val) => handleCityChange(0, val)}
              />
            </div>
            
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl p-2 pl-4">
              <IndianRupee size={16} className="text-white/40"/>
              <input 
                type="number" className="w-24 bg-transparent border-none focus:outline-none text-white placeholder:text-white/20"
                value={form.budget} onChange={e => setForm({...form, budget: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl p-2 pl-4">
              <CalendarDays size={16} className="text-white/40"/>
              <input 
                type="number" className="w-16 bg-transparent border-none focus:outline-none text-white placeholder:text-white/20"
                value={form.days} onChange={e => setForm({...form, days: parseInt(e.target.value) || 0})}
              />
              <span className="text-white/40 text-sm pr-3">Days</span>
            </div>

            <div className="flex gap-2">
              {PREFERENCES.slice(0, 3).map(pref => (
                <button
                  key={pref.id}
                  onClick={() => setForm({ ...form, preference: form.preference.includes(pref.id) ? form.preference.filter(p => p !== pref.id) : [...form.preference, pref.id] })}
                  className={`px-4 py-3 rounded-2xl text-sm transition-all border ${form.preference.includes(pref.id) ? 'bg-primary/20 border-primary text-white shadow-lg shadow-primary/30' : 'bg-black/40 border-white/10 text-white/50 hover:bg-white/5'}`}
                >
                  {pref.label}
                </button>
              ))}
            </div>

            <button 
              onClick={handleSearch} disabled={loading}
              className="bg-white text-black px-8 py-3 rounded-2xl font-medium hover:bg-white/90 transition-all shadow-lg shadow-white/20 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Sparkles className="animate-spin" size={18}/> : <Compass size={18} />} 
              {loading ? 'Analyzing...' : 'Discover'}
            </button>
          </div>
        </section>

        {/* Results Dashboard */}
        <AnimatePresence mode="wait">
          {rawResults.length > 0 && !loading && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                  <h3 className="text-3xl font-light">AI Recommendations</h3>
                  <p className="text-white/50 mt-1">Based on global mapping, pricing, and vibe alignment.</p>
                </div>
                <div className="flex gap-4">
                  <select 
                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white/70 focus:outline-none focus:border-primary/50"
                    value={sortBy} onChange={e => setSortBy(e.target.value)}
                  >
                    <option value="match" className="bg-gray-900">Sort by Match Score</option>
                    <option value="price_asc" className="bg-gray-900">Sort by Lowest Price</option>
                    <option value="price_desc" className="bg-gray-900">Sort by Highest Price</option>
                  </select>
                </div>
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Hero Card (First Result) */}
                {filteredResults.length > 0 && (
                  <div className="lg:col-span-12 xl:col-span-8 bg-white/[0.03] border border-primary/30 rounded-[2rem] p-8 flex flex-col md:flex-row gap-8 relative overflow-hidden shadow-2xl shadow-primary/10 group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
                    
                    <div className="flex-1 space-y-6 relative z-10">
                      <div className="flex gap-2">
                        <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/50 text-primary text-xs font-bold tracking-widest uppercase flex items-center gap-1">
                          <Zap size={12}/> Top Match {filteredResults[0].matchScore}%
                        </span>
                        {filteredResults[0].category && (
                          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold tracking-widest uppercase">
                            {filteredResults[0].category}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-5xl font-bold tracking-tight mb-2">{filteredResults[0].name}</h4>
                        <p className="text-xl text-white/60">{filteredResults[0].state}</p>
                      </div>

                      <p className="text-white/80 text-lg italic border-l-2 border-primary/50 pl-4 py-1">
                        "{filteredResults[0].why}"
                      </p>

                      <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-white/40 text-sm mb-1 uppercase tracking-wider">Est. Budget</p>
                          <p className="text-3xl font-light">₹{filteredResults[0].budgetEstimate?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-sm mb-1 uppercase tracking-wider">Per Person</p>
                          <p className="text-xl font-light text-white/70">~₹{filteredResults[0].perPersonEstimate?.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Budget Impact Visualizer */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-white/50">
                          <span>Budget Impact</span>
                          <span>{Math.round(((filteredResults[0].budgetEstimate || 0) / form.budget) * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-blue-400" 
                            style={{ width: `${Math.min(100, ((filteredResults[0].budgetEstimate || 0) / form.budget) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <button onClick={() => handleSelectDestination(filteredResults[0].name)} className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-medium hover:brightness-110 transition-all flex justify-center items-center gap-2 mt-4 shadow-lg shadow-primary/30">
                        Select Destination <ArrowRight size={18}/>
                      </button>
                    </div>

                    <div className="flex-[0.8] rounded-2xl bg-black/40 border border-white/10 overflow-hidden relative min-h-[300px]">
                       {/* Placeholder for real images if we had them, currently just a beautiful gradient mesh */}
                       <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40" />
                       <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay" />
                       <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                         {filteredResults[0].tags?.map((t: string) => (
                           <span key={t} className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10">
                             {t}
                           </span>
                         ))}
                       </div>
                    </div>
                  </div>
                )}

                {/* Alternative Cards */}
                {filteredResults.slice(1).map((dest, i) => (
                  <div key={dest.id || i} className="lg:col-span-6 xl:col-span-4 bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all rounded-[2rem] p-6 flex flex-col justify-between group relative overflow-hidden">
                    <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-2xl font-bold">{dest.name}</h4>
                          <p className="text-sm text-white/50">{dest.state}</p>
                        </div>
                        <span className="px-2 py-1 rounded bg-white/10 text-xs font-bold">{dest.matchScore}%</span>
                      </div>
                      
                      <p className="text-sm text-white/70 line-clamp-3">
                        {dest.why}
                      </p>

                      <div className="pt-4 border-t border-white/5">
                        <p className="text-2xl font-light">₹{dest.budgetEstimate?.toLocaleString()}</p>
                        <p className="text-xs text-white/40">Total estimated cost</p>
                      </div>
                    </div>

                    <button onClick={() => handleSelectDestination(dest.name)} className="mt-6 w-full py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex justify-center items-center gap-2 group-hover:border-primary/50 group-hover:text-primary">
                      Plan this <ChevronRight size={16}/>
                    </button>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {loading && (
            <div className="py-32 flex flex-col items-center justify-center space-y-6">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="text-primary" size={24}/>
                </div>
              </div>
              <p className="text-xl font-light text-white/60 animate-pulse">Synthesizing optimal itineraries...</p>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

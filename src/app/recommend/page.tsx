'use client';

import React, { useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Map, IndianRupee, Plus, Trash2, CalendarDays, SlidersHorizontal, Filter, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import CityAutocomplete from '@/components/CityAutocomplete';

const PREFERENCES = [
  { id: 'mountains', label: '🏔️ Mountains' },
  { id: 'beaches', label: '🏖️ Beaches' },
  { id: 'desert', label: '🏜️ Desert' },
  { id: 'heritage', label: '🏛️ Heritage' },
  { id: 'wildlife', label: '🌿 Wildlife' },
  { id: 'spiritual', label: '🛕 Spiritual' },
  { id: 'hills', label: '🌄 Hill Stations' }
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
  const [sortBy, setSortBy] = useState('match'); // 'match', 'price_asc', 'price_desc'
  const [filterPrimaryOnly, setFilterPrimaryOnly] = useState(false);
  const [filterMaxBudget, setFilterMaxBudget] = useState<number | null>(null);

  const handleAddPassenger = () => {
    if (form.passengers.length >= 10) return;
    setForm({ ...form, passengers: [...form.passengers, { city: '' }] });
  };

  const handleRemovePassenger = (index: number) => {
    if (form.passengers.length <= 1) return;
    const newPax = [...form.passengers];
    newPax.splice(index, 1);
    setForm({ ...form, passengers: newPax });
  };

  const handleCityChange = (index: number, city: string) => {
    const newPax = [...form.passengers];
    newPax[index].city = city;
    setForm({ ...form, passengers: newPax });
  };

  const handleSearch = async () => {
    setLoading(true);
    // Filter out empty cities
    const validPassengers = form.passengers.filter(p => p.city.trim() !== '');
    
    const data = await api.getRecommendations({
      passengers: validPassengers,
      total_budget: form.budget,
      days: form.days,
      preference: form.preference.join(' and ')
    });
    setRawResults(data);
    
    // Reset filters
    setSortBy('match');
    setFilterPrimaryOnly(false);
    
    // Set dynamic max budget based on results
    if (data.length > 0) {
      const maxCost = Math.max(...data.map((d: any) => d.budgetEstimate || 0));
      setFilterMaxBudget(maxCost);
    }
    
    setLoading(false);
  };

  const handleSelectDestination = (destName: string) => {
    // Reset previous trip data but retain budget
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

    if (filterPrimaryOnly) {
      filtered = filtered.filter(r => r.isPrimaryMatch);
    }
    
    if (filterMaxBudget !== null) {
      filtered = filtered.filter(r => (r.budgetEstimate || 0) <= filterMaxBudget);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'price_asc') return (a.budgetEstimate || 0) - (b.budgetEstimate || 0);
      if (sortBy === 'price_desc') return (b.budgetEstimate || 0) - (a.budgetEstimate || 0);
      // match
      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    return filtered;
  }, [rawResults, filterPrimaryOnly, filterMaxBudget, sortBy]);

  const maxPossibleBudget = useMemo(() => {
    if (rawResults.length === 0) return form.budget;
    return Math.max(...rawResults.map(r => r.budgetEstimate || 0), form.budget);
  }, [rawResults, form.budget]);

  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-8 transition-colors duration-300">
      
      <div className="mb-8 flex justify-between items-center">
        <div className="cursor-pointer" onClick={() => router.push('/')}>
          <h1 className="text-xl font-bold text-primary">Ghumi-Ghumi ✈️</h1>
        </div>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Input Form */}
        <div className="lg:col-span-1 bg-card p-6 rounded-2xl border border-border shadow-sm h-fit space-y-6 sticky top-8">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-1">
              <Sparkles className="text-primary" /> AI Discovery
            </h2>
            <p className="text-sm text-muted-foreground">Ollama will find the perfect middle-ground.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700 flex items-center gap-2 mb-2">
                Home Cities
              </label>
              <div className="space-y-3">
                {form.passengers.map((pax, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <CityAutocomplete 
                        label=""
                        placeholder={`Traveler ${i+1} City`}
                        value={pax.city}
                        onChange={(val) => handleCityChange(i, val)}
                      />
                    </div>
                    {form.passengers.length > 1 && (
                      <button onClick={() => handleRemovePassenger(i)} className="p-3 mt-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleAddPassenger} className="text-sm text-blue-600 font-medium flex items-center gap-1 mt-2 hover:underline">
                <Plus size={16} /> Add Traveler
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2"><IndianRupee size={16}/> Total Budget</label>
                <input 
                  type="number" 
                  min={1}
                  className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2"><CalendarDays size={16}/> Days</label>
                <input 
                  type="number" 
                  min={1}
                  className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={form.days}
                  onChange={(e) => setForm({ ...form, days: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2"><Map size={16}/> Preferred Vibe</label>
              <div className="flex flex-wrap gap-2">
                {PREFERENCES.map(pref => {
                  const isSelected = form.preference.includes(pref.id);
                  return (
                  <button
                    key={pref.id}
                    onClick={() => {
                      if (isSelected) {
                        // Prevent unselecting the last option
                        if (form.preference.length > 1) {
                          setForm({ ...form, preference: form.preference.filter(p => p !== pref.id) });
                        }
                      } else {
                        setForm({ ...form, preference: [...form.preference, pref.id] });
                      }
                    }}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors border ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground border-primary shadow-md' 
                        : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {pref.label}
                  </button>
                )})}
              </div>
            </div>

            <button 
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-primary hover:opacity-90 disabled:bg-muted-foreground text-primary-foreground p-4 rounded-xl font-bold flex justify-center items-center gap-2 mt-4 transition-all"
            >
              {loading ? 'AI is thinking...' : 'Ask Ollama'} <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-zinc-400">
              <Sparkles className="animate-spin mb-4 text-blue-500" size={48} />
              <p className="text-lg font-medium text-zinc-600">Ollama is analyzing the map...</p>
              <p className="text-sm">Calculating budgets and travel routes for everyone.</p>
            </div>
          ) : rawResults.length > 0 ? (
            <>
              {/* Filter Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <Filter size={18} className="text-blue-500" /> Filter & Sort
                  </h3>
                  <div className="text-sm font-medium text-zinc-500">
                    Showing {filteredResults.length} of {rawResults.length} destinations
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sort */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Sort By</label>
                    <select 
                      className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500"
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                    >
                      <option value="match">Best Match (Score)</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                    </select>
                  </div>

                  {/* Vibe Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Vibe Match</label>
                    <div className="flex items-center h-[38px]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300"
                          checked={filterPrimaryOnly}
                          onChange={(e) => setFilterPrimaryOnly(e.target.checked)}
                        />
                        <span className="text-sm font-medium text-zinc-700">Show only my preferred vibe</span>
                      </label>
                    </div>
                  </div>

                  {/* Budget Slider */}
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between">
                      <label className="text-xs font-semibold text-zinc-500 uppercase">Max Budget: ₹{filterMaxBudget?.toLocaleString()}</label>
                    </div>
                    <input 
                      type="range" 
                      min={0} 
                      max={maxPossibleBudget} 
                      step={1000}
                      value={filterMaxBudget || maxPossibleBudget}
                      onChange={(e) => setFilterMaxBudget(parseInt(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 gap-4">
                {filteredResults.length === 0 && (
                  <div className="p-8 text-center text-zinc-500 border-2 border-dashed border-zinc-200 rounded-2xl">
                    No destinations match your current filters.
                  </div>
                )}
                {filteredResults.map((dest, i) => {
                  const isPrimary = dest.isPrimaryMatch;

                  return (
                    <div key={dest.id || i} className={`bg-white p-6 rounded-2xl border ${isPrimary ? 'border-blue-200 shadow-md' : 'border-zinc-200 shadow-sm'} flex flex-col md:flex-row md:items-center gap-6 relative overflow-hidden group hover:border-blue-400 transition-colors`}>
                      {isPrimary && <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />}
                      
                      <div className="flex-1 pl-2">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h4 className="text-2xl font-bold text-zinc-900">{dest.name}</h4>
                          <span className="text-sm text-zinc-500 font-medium">{dest.state}</span>
                          {dest.category && (
                            <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs font-bold uppercase tracking-wider">
                              {dest.category}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-bold ml-auto md:ml-0 ${dest.matchScore > 80 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {dest.matchScore}% Match
                          </span>
                        </div>
                        
                        <p className="text-sm text-zinc-600 mb-4 bg-zinc-50 p-3 rounded-lg border border-zinc-100 italic">
                          "{dest.why}"
                        </p>

                        <div className="flex gap-2 text-xs font-medium text-zinc-500 mb-4 flex-wrap">
                          {dest.tags?.map((t: string) => <span key={t} className="bg-zinc-100 px-2 py-1 rounded-full">{t}</span>)}
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col md:items-end border-t md:border-t-0 md:border-l border-zinc-100 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                        <div className="text-sm font-medium text-zinc-500 mb-1">Estimated Cost (All)</div>
                        <div className="text-2xl font-black text-zinc-900 mb-1">₹{dest.budgetEstimate?.toLocaleString()}</div>
                        <div className="text-xs text-zinc-400 mb-4">~₹{dest.perPersonEstimate?.toLocaleString()} / person</div>
                        
                        <button 
                          onClick={() => handleSelectDestination(dest.name)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-6 py-3 rounded-xl font-bold w-full transition-colors mt-auto"
                        >
                          Plan this Trip
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-zinc-400 border-2 border-dashed border-zinc-200 rounded-2xl bg-white/50">
              <Map size={48} className="mb-4 text-zinc-300" />
              <p>Enter your constraints on the left to see where you can go.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

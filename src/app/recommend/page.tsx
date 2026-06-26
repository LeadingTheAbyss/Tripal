'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useTripStore } from '@/store/tripStore';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Map, IndianRupee, Plus, Trash2, CalendarDays } from 'lucide-react';
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
    preference: 'mountains'
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

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
      preference: form.preference
    });
    setResults(data);
    setLoading(false);
  };

  const handleSelectDestination = (destName: string) => {
    trip.setTripDetails({ 
      mode: 'recommend',
      destination: destName.split(',')[0],
      baseBudget: form.budget
    });

    // Optionally pre-fill passengers if store is empty
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

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col p-8">
      
      {/* Header */}
      <div className="mb-8 cursor-pointer" onClick={() => router.push('/')}>
        <h1 className="text-xl font-bold text-blue-600">Ghumi-Ghumi ✈️</h1>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Input Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm h-fit space-y-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-1">
              <Sparkles className="text-blue-500" /> AI Discovery
            </h2>
            <p className="text-sm text-zinc-500">Ollama will find the perfect middle-ground.</p>
          </div>

          <div className="space-y-4">
            {/* Passenger Cities */}
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

            {/* Budget & Days */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 flex items-center gap-2"><IndianRupee size={16}/> Total Budget</label>
                <input 
                  type="number" 
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 flex items-center gap-2"><CalendarDays size={16}/> Days</label>
                <input 
                  type="number" 
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.days}
                  onChange={(e) => setForm({ ...form, days: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 flex items-center gap-2"><Map size={16}/> Preferred Vibe</label>
              <div className="flex flex-wrap gap-2">
                {PREFERENCES.map(pref => (
                  <button
                    key={pref.id}
                    onClick={() => setForm({ ...form, preference: pref.id })}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors border ${
                      form.preference === pref.id 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-300'
                    }`}
                  >
                    {pref.label}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-black hover:bg-zinc-800 disabled:bg-zinc-400 text-white p-4 rounded-xl font-bold flex justify-center items-center gap-2 mt-4"
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
          ) : results.length > 0 ? (
            <>
              {results.some(r => r.isPrimaryMatch) && (
                 <h3 className="text-xl font-bold text-zinc-900 mb-2">Best for You</h3>
              )}
              <div className="grid grid-cols-1 gap-4">
                {results.map((dest, i) => {
                  const isPrimary = dest.isPrimaryMatch;
                  // If we transition from primary to non-primary, show a divider header
                  const showOtherHeader = !isPrimary && i > 0 && results[i-1].isPrimaryMatch;

                  return (
                    <React.Fragment key={dest.id || i}>
                      {showOtherHeader && (
                        <h3 className="text-xl font-bold text-zinc-900 mt-6 mb-2">You Might Also Like</h3>
                      )}
                      <div className={`bg-white p-6 rounded-2xl border ${isPrimary ? 'border-blue-200 shadow-md' : 'border-zinc-200 shadow-sm'} flex flex-col md:flex-row md:items-center gap-6 relative overflow-hidden group hover:border-blue-400 transition-colors`}>
                        {isPrimary && <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />}
                        
                        <div className="flex-1 pl-2">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-2xl font-bold text-zinc-900">{dest.name}</h4>
                            <span className="text-sm text-zinc-500 font-medium">{dest.state}</span>
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

                        <div className="shrink-0 flex flex-col md:items-end border-t md:border-t-0 md:border-l border-zinc-100 pt-4 md:pt-0 md:pl-6">
                          <div className="text-sm font-medium text-zinc-500 mb-1">Estimated Cost (All)</div>
                          <div className="text-2xl font-black text-zinc-900 mb-1">₹{dest.budgetEstimate?.toLocaleString()}</div>
                          <div className="text-xs text-zinc-400 mb-4">~₹{dest.perPersonEstimate?.toLocaleString()} / person</div>
                          
                          <button 
                            onClick={() => handleSelectDestination(dest.name)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-6 py-3 rounded-xl font-bold w-full md:w-auto transition-colors"
                          >
                            Plan this Trip
                          </button>
                        </div>
                      </div>
                    </React.Fragment>
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

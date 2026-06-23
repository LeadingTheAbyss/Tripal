'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useTripStore } from '@/store/tripStore';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Map, IndianRupee, Users } from 'lucide-react';

export default function RecommendPage() {
  const router = useRouter();
  const trip = useTripStore();
  
  const [form, setForm] = useState({
    travelers: 4,
    budget: 100000,
    setting: 'mountains'
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    setLoading(true);
    const data = await api.getRecommendations(form);
    setResults(data);
    setLoading(false);
  };

  const handleSelectDestination = (destName: string) => {
    trip.setTripDetails({ 
      mode: 'recommend',
      destination: destName.split(',')[0], // Take just 'Manali' from 'Manali, HP'
      baseBudget: form.budget
    });
    router.push('/plan/setup');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col p-8">
      
      {/* Header */}
      <div className="mb-8 cursor-pointer" onClick={() => router.push('/')}>
        <h1 className="text-xl font-bold text-blue-600">Ghumi-Ghumi ✈️</h1>
      </div>

      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Input Form */}
        <div className="lg:col-span-1 bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm h-fit">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="text-blue-500" /> Discovery Mode
          </h2>
          <p className="text-sm text-zinc-500 mb-8">Tell us what you have, and we'll tell you where to go.</p>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 flex items-center gap-2"><Users size={16}/> Travelers</label>
              <input 
                type="number" 
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.travelers}
                onChange={(e) => setForm({ ...form, travelers: parseInt(e.target.value) || 0 })}
              />
            </div>
            
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
              <label className="text-sm font-medium text-zinc-700 flex items-center gap-2"><Map size={16}/> Preferred Vibe</label>
              <select 
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.setting}
                onChange={(e) => setForm({ ...form, setting: e.target.value })}
              >
                <option value="mountains">Mountains & Hills</option>
                <option value="beaches">Beaches & Coastal</option>
                <option value="history">Heritage & Culture</option>
                <option value="any">Surprise Me</option>
              </select>
            </div>

            <button 
              onClick={handleSearch}
              className="w-full bg-black hover:bg-zinc-800 text-white p-4 rounded-xl font-bold flex justify-center items-center gap-2 mt-4"
            >
              Find Destinations <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-zinc-400">
              <Sparkles className="animate-spin mb-4" size={32} />
              <p>Analyzing weather, safety, and budget constraints...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <h3 className="text-xl font-bold text-zinc-900 mb-4">Recommended for you</h3>
              <div className="grid grid-cols-1 gap-6">
                {results.map((dest, i) => (
                  <div key={dest.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center gap-6 relative overflow-hidden group hover:border-blue-300 transition-colors">
                    {i === 0 && <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />}
                    
                    <div className="flex-1 pl-2">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-2xl font-bold text-zinc-900">{dest.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${dest.score > 90 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {dest.score}% Match
                        </span>
                      </div>
                      
                      <p className="text-sm text-zinc-600 mb-4 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                        <span className="font-semibold text-zinc-900">Why this place?</span> {dest.why}
                      </p>

                      <div className="flex gap-2 text-xs font-medium text-zinc-500 mb-4">
                        {dest.tags.map((t: string) => <span key={t} className="bg-zinc-100 px-2 py-1 rounded-full">{t}</span>)}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col md:items-end border-t md:border-t-0 md:border-l border-zinc-100 pt-4 md:pt-0 md:pl-6">
                      <div className="text-sm font-medium text-zinc-500 mb-1">Estimated Cost</div>
                      <div className="text-2xl font-black text-zinc-900 mb-4">₹{dest.budgetEstimate.toLocaleString()}</div>
                      <button 
                        onClick={() => handleSelectDestination(dest.name)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-6 py-3 rounded-xl font-bold w-full md:w-auto transition-colors"
                      >
                        Plan this Trip
                      </button>
                    </div>
                  </div>
                ))}
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

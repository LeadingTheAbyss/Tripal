'use client';

import React, { useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { Passenger } from '@/types/trip';
import { api } from '@/lib/api';
import { Plus, Copy, Trash2, ArrowRight, MapPin, Calendar, IndianRupee } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CityAutocomplete from '@/components/CityAutocomplete';
import ModernDatePicker from '@/components/ModernDatePicker';

export default function TripSetupPage() {
  const router = useRouter();
  const trip = useTripStore();

  const handleAddPassenger = () => {
    trip.addPassenger({
      id: `pax_${Date.now()}`,
      tripId: 'TRIP_CURRENT',
      name: '',
      age: 0,
      gender: 'other',
      pincode: '',
      city: '',
      transportPreference: 'any'
    });
  };

  const handlePincodeBlur = async (id: string, pincode: string) => {
    if (pincode.length >= 6) {
      const location = await api.getCityFromPincode(pincode);
      if (location) {
        trip.updatePassenger(id, { city: location.city });
      }
    }
  };

  const handleContinue = () => {
    // Basic validation could go here
    router.push('/plan/transport');
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-10 px-4">
      <div className="max-w-4xl mx-auto space-y-12 pb-24 text-white">
        {/* SECTION 1: TRIP BASICS */}
      <section className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white">
          <MapPin className="text-blue-500" /> Trip Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CityAutocomplete 
            label="To" 
            placeholder="e.g. Manali" 
            value={trip.destination} 
            onChange={(val) => trip.setTripDetails({ destination: val })} 
          />
          <ModernDatePicker 
            label="Start Date"
            value={trip.startDate}
            onChange={(date) => trip.setTripDetails({ startDate: date })}
            minDate={new Date().toISOString().split('T')[0]} // Cannot pick past dates
          />
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <IndianRupee size={16}/> Total Budget (Optional)
            </label>
            <input 
              type="number"
              placeholder="e.g. 100000"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-zinc-600"
              onChange={(e) => { /* budget state connected later */ }}
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: PASSENGERS (IRCTC Style) */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-white">👥 Who is traveling?</h2>
        <div className="space-y-4">
          {trip.passengers.map((pax, index) => (
            <div key={pax.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-4 items-end relative group shadow-lg">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => trip.duplicatePassenger(pax.id, `pax_${Date.now()}`)}
                  className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded-md"
                  title="Duplicate Passenger"
                >
                  <Copy size={16} />
                </button>
                <button 
                  onClick={() => trip.removePassenger(pax.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md"
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="w-full md:w-auto flex-1 space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Passenger {index + 1}</label>
                <input 
                  type="text" 
                  placeholder="Full Name"
                  className="w-full p-2 border-b-2 border-zinc-800 bg-transparent text-white focus:border-blue-500 outline-none font-medium placeholder:text-zinc-600"
                  value={pax.name}
                  onChange={(e) => trip.updatePassenger(pax.id, { name: e.target.value })}
                />
              </div>

              <div className="w-20 space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Age</label>
                <input 
                  type="number" 
                  className="w-full p-2 border-b-2 border-zinc-800 bg-transparent text-white focus:border-blue-500 outline-none"
                  value={pax.age || ''}
                  onChange={(e) => trip.updatePassenger(pax.id, { age: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="w-32 space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Gender</label>
                <select 
                  className="w-full p-2 border-b-2 border-zinc-800 bg-transparent text-white focus:border-blue-500 outline-none"
                  value={pax.gender}
                  onChange={(e) => trip.updatePassenger(pax.id, { gender: e.target.value as any })}
                >
                  <option value="male" className="bg-zinc-900 text-white">Male</option>
                  <option value="female" className="bg-zinc-900 text-white">Female</option>
                  <option value="other" className="bg-zinc-900 text-white">Other</option>
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <CityAutocomplete 
                  label="CITY" 
                  placeholder="e.g. Lucknow" 
                  value={pax.city || ''} 
                  onChange={(val) => trip.updatePassenger(pax.id, { city: val })} 
                />
              </div>



            </div>
          ))}

          {trip.passengers.length === 0 && (
            <div className="text-center p-8 bg-zinc-900 border border-zinc-800 border-dashed rounded-xl text-zinc-500">
              No passengers added yet.
            </div>
          )}

          <button 
            onClick={handleAddPassenger}
            className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:bg-zinc-800 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus size={20} /> Add Another Passenger
          </button>
        </div>
      </section>

      {/* CONTINUATION */}
      <div className="flex justify-end pt-8 border-t border-zinc-800">
        <button 
          onClick={handleContinue}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-transform hover:-translate-y-1"
        >
          Find Transport <ArrowRight size={20} />
        </button>
      </div>

      </div>
    </div>
  );
}

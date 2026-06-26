'use client';

import React, { useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { Passenger } from '@/types/trip';
import { api } from '@/lib/api';
import { Plus, Copy, Trash2, ArrowRight, MapPin, Calendar, IndianRupee } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CityAutocomplete from '@/components/CityAutocomplete';
import ModernDateRangePicker from '@/components/ModernDateRangePicker';
import { motion, AnimatePresence } from 'framer-motion';

export default function TripSetupPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();

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
    <div className="min-h-screen bg-background pt-10 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-12 pb-24 text-foreground">
        {/* SECTION 1: TRIP BASICS */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-foreground">
            <MapPin className="text-primary" /> Trip Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CityAutocomplete 
              label="To" 
              placeholder="e.g. Manali" 
              value={trip.destination} 
              onChange={(val) => trip.setTripDetails({ destination: val })} 
            />
            <ModernDateRangePicker 
              label="Duration of Stay"
              startDate={trip.startDate}
              endDate={trip.endDate}
              onChange={(start, end) => trip.setTripDetails({ startDate: start, endDate: end })}
              minDate={new Date().toISOString().split('T')[0]} // Cannot pick past dates
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <IndianRupee size={16}/> Total Budget (Optional)
              </label>
              <input 
                type="number"
                placeholder="e.g. 100000"
                value={budget.totalBudget || ''}
                className="w-full p-3 bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground transition-all duration-200"
                onChange={(e) => budget.setTotalBudget(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </motion.section>

        {/* SECTION 2: PASSENGERS */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
            <span className="text-primary">👥</span> Who is traveling?
          </h2>
          <div className="space-y-4">
            <AnimatePresence>
              {trip.passengers.map((pax, index) => (
                <motion.div 
                  key={pax.id} 
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-card border border-border rounded-2xl p-5 flex flex-wrap gap-5 items-end relative group shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300"
                >
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => trip.duplicatePassenger(pax.id, `pax_${Date.now()}`)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                      title="Duplicate Passenger"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => trip.removePassenger(pax.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-muted rounded-md transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="w-full md:w-auto flex-1 space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passenger {index + 1}</label>
                    <input 
                      type="text" 
                      placeholder="Full Name"
                      className="w-full p-2 border-b-2 border-border bg-transparent text-foreground focus:border-primary outline-none font-medium placeholder:text-muted-foreground/50 transition-colors"
                      value={pax.name}
                      onChange={(e) => trip.updatePassenger(pax.id, { name: e.target.value })}
                    />
                  </div>

                  <div className="w-20 space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border-b-2 border-border bg-transparent text-foreground focus:border-primary outline-none transition-colors"
                      value={pax.age || ''}
                      onChange={(e) => trip.updatePassenger(pax.id, { age: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="w-32 space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender</label>
                    <select 
                      className="w-full p-2 border-b-2 border-border bg-transparent text-foreground focus:border-primary outline-none transition-colors cursor-pointer"
                      value={pax.gender}
                      onChange={(e) => trip.updatePassenger(pax.id, { gender: e.target.value as any })}
                    >
                      <option value="male" className="bg-background text-foreground">Male</option>
                      <option value="female" className="bg-background text-foreground">Female</option>
                      <option value="other" className="bg-background text-foreground">Other</option>
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
                </motion.div>
              ))}
            </AnimatePresence>

            {trip.passengers.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="text-center p-8 bg-card border border-border border-dashed rounded-xl text-muted-foreground"
              >
                No passengers added yet.
              </motion.div>
            )}

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleAddPassenger}
              className="w-full py-4 border-2 border-dashed border-border/60 rounded-2xl text-muted-foreground hover:bg-primary/5 hover:border-primary hover:text-primary transition-all duration-300 flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={20} /> Add Another Passenger
            </motion.button>
          </div>
        </motion.section>

        {/* CONTINUATION */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-end pt-8 border-t border-border"
        >
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all duration-300"
          >
            Find Transport <ArrowRight size={20} />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

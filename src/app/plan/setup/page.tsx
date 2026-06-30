'use client';

import React, { useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { api } from '@/lib/api';
import { Plus, Copy, Trash2, ArrowRight, MapPin, Calendar, IndianRupee, ChevronRight, ChevronLeft, Sparkles, User, Users, CheckCircle2, Heart, Mountain, Gem, Compass, Plane, Train, Car, Bus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CityAutocomplete from '@/components/CityAutocomplete';
import ModernDateRangePicker from '@/components/ModernDateRangePicker';
import { motion, AnimatePresence } from 'framer-motion';

const TRIP_STYLES = [
  { id: 'family', label: 'Family Vacation' },
  { id: 'solo', label: 'Solo Backpacking' },
  { id: 'romantic', label: 'Romantic Getaway' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'luxury', label: 'Luxury Leisure' }
];

export default function TripSetupPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  
  const [step, setStep] = useState(1);
  const [tripStyle, setTripStyle] = useState('family');
  
  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleAddPassenger = () => {
    trip.addPassenger({
      id: `pax_${Date.now()}`,
      tripId: 'TRIP_CURRENT',
      name: '',
      age: 25,
      gender: 'other',
      pincode: '',
      city: '',
      transportPreference: 'any'
    });
  };

  const handleContinue = () => {
    router.push('/plan/transport');
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
  };

  return (
    <div className="w-full relative selection:bg-primary/30 font-sans">
      {/* Inline Stepper Header */}
      <div className="flex justify-between items-center mb-8 border-b border-border pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Trip Builder
        </h1>
        
        <div className="flex gap-4 items-center">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-500 ${step > i ? 'bg-green-500 text-white shadow-sm' : step === i ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground border border-border'}`}>
                {step > i ? <CheckCircle2 size={16} /> : i}
              </div>
              {i < 3 && <div className={`w-12 h-[2px] rounded-full transition-colors duration-500 ${step > i ? 'bg-green-500' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
      </div>

      <main className="relative z-10 flex flex-col lg:flex-row gap-12 pb-12 items-start">
        
        {/* Left Side: Wizard Form */}
        <div className="flex-1 flex flex-col justify-start max-w-2xl w-full">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                <div>
                  <h2 className="text-4xl lg:text-6xl font-light tracking-tight mb-4 text-foreground">Where are we <span className="font-semibold text-primary">going?</span></h2>
                  <p className="text-muted-foreground text-lg">Let's craft the perfect itinerary for your next escape.</p>
                </div>

                <div className="p-8 rounded-2xl bg-card border border-border shadow-sm space-y-8 relative">
                  <div className="space-y-4 relative z-20 text-white">
                    <label className="text-sm font-medium text-white/60 uppercase tracking-widest">Destination</label>
                    <div className="relative text-black">
                      <CityAutocomplete 
                        label="" 
                        placeholder="e.g. Kyoto, Japan" 
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

                  <div className="space-y-4 relative z-10">
                    <label className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                      Travel Dates <Calendar size={16} className="text-primary" />
                    </label>
                    <div className="text-black">
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
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                <div>
                  <h2 className="text-4xl lg:text-5xl font-light tracking-tight mb-4 text-foreground">Who is <span className="font-semibold text-primary">traveling?</span></h2>
                  <p className="text-muted-foreground text-lg">We use this to find the best seats, family-friendly spots, and optimal pricing.</p>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                  <AnimatePresence>
                    {trip.passengers.map((pax, index) => (
                      <motion.div 
                        key={pax.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-6 rounded-2xl bg-card border border-border shadow-sm group hover:border-primary/50 transition-all"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                            <User size={14} /> Passenger {index + 1}
                          </h4>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => trip.duplicatePassenger(pax.id, `pax_${Date.now()}`)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Copy size={14} /></button>
                            <button onClick={() => trip.removePassenger(pax.id)} className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input 
                            type="text" placeholder="Full Name"
                            className="w-full p-4 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            value={pax.name} onChange={(e) => trip.updatePassenger(pax.id, { name: e.target.value })}
                          />
                          <div className="text-black">
                            <CityAutocomplete 
                              label="" placeholder="Starting City" 
                              value={pax.city || ''} 
                              onChange={(val) => trip.updatePassenger(pax.id, { city: val })} 
                            />
                          </div>
                          <div className="flex gap-4">
                            <input 
                              type="number" min="0" placeholder="Age"
                              className="w-24 p-4 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                              value={pax.age || ''} onChange={(e) => trip.updatePassenger(pax.id, { age: Math.max(0, parseInt(e.target.value) || 0) })}
                            />
                            <select 
                              className="flex-1 p-4 bg-background border border-input rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all appearance-none cursor-pointer"
                              value={pax.gender} onChange={(e) => trip.updatePassenger(pax.id, { gender: e.target.value as any })}
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <button 
                    onClick={handleAddPassenger}
                    className="w-full py-5 border border-dashed border-border rounded-2xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Add Traveler
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                <div>
                  <h2 className="text-4xl lg:text-5xl font-light tracking-tight mb-4 text-foreground">Set the <span className="font-semibold text-primary">Vibe & Budget</span></h2>
                  <p className="text-muted-foreground text-lg">Help the AI concierge optimize your experiences and stays.</p>
                </div>

                <div className="space-y-8 p-8 rounded-2xl bg-card border border-border shadow-sm relative">
                  
                  <div className="space-y-4 relative z-10">
                    <label className="text-sm font-semibold text-muted-foreground uppercase">Trip Style</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {TRIP_STYLES.map(style => (
                        <button
                          key={style.id}
                          onClick={() => setTripStyle(style.id)}
                          className={`p-4 rounded-xl flex flex-col items-center justify-center transition-all border ${tripStyle === style.id ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/50'}`}
                        >
                          <span className="text-sm font-medium">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5 relative z-10">
                    <label className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                      <IndianRupee size={16}/> Total Budget
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-white/40 font-medium">₹</span>
                      <input 
                        type="number" min="0"
                        placeholder="1,00,000"
                        value={budget.totalBudget || ''}
                        onChange={(e) => budget.setTotalBudget(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full p-5 pl-10 bg-background border border-input rounded-2xl text-2xl font-light text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="mt-12 flex gap-4">
            {step > 1 && (
              <button 
                onClick={prevStep}
                className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2 font-medium"
              >
                <ChevronLeft size={20} /> Back
              </button>
            )}
            
            {step < 3 ? (
              <button 
                onClick={nextStep}
                className="px-8 py-4 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-colors flex items-center gap-2 font-medium ml-auto shadow-md"
              >
                Next Step <ChevronRight size={20} />
              </button>
            ) : (
              <button 
                onClick={handleContinue}
                className="px-8 py-4 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center gap-2 font-medium ml-auto shadow-md"
              >
                Build My Trip
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Smart Summary Panel */}
        <div className="hidden lg:flex w-[28rem] flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col drop-shadow-xl"
          >
            
            {/* Top Red Bar */}
            <div className="flex bg-[#9B2C2C] text-white rounded-t-2xl relative overflow-hidden">
              <div className="flex-1 p-3 px-6 flex justify-between items-center border-r-2 border-dashed border-white/30">
                <span className="text-sm font-semibold tracking-widest uppercase">Boarding Pass</span>
                <div className="flex items-center gap-1.5 opacity-80">
                  <Plane size={14} className="transform rotate-45" />
                  <Train size={14} />
                  <Bus size={14} />
                  <Car size={14} />
                </div>
              </div>
              <div className="w-32 p-3 px-4 flex justify-center items-center">
                {/* Empty right stub header */}
              </div>
              {/* Top notch for perforation */}
              <div className="absolute -bottom-2 right-[7.6rem] w-4 h-4 bg-background rounded-full" />
            </div>

            {/* Ticket Body */}
            <div className="flex bg-[#FDFBF7] text-gray-900 relative">
              {/* Main Left Section */}
              <div className="flex-1 p-6 px-8 border-r-2 border-dashed border-gray-300/70 flex flex-col justify-between">
                <h3 className="text-xl font-bold tracking-widest uppercase text-center mb-6">Trip Ticket</h3>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div>
                    <p className="font-mono text-[10px] text-gray-500 font-bold uppercase tracking-wider">Name:</p>
                    <div className="font-mono font-bold text-sm truncate">
                      {trip.passengers.length === 1 ? (
                        trip.passengers[0]?.name?.toUpperCase() || 'TRAVELER'
                      ) : (
                        <div className="flex flex-col">
                          {trip.passengers.map((p, i) => (
                            <span key={p.id}>{i + 1}. {p.name?.toUpperCase() || 'TRAVELER'}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-gray-500 font-bold uppercase tracking-wider">From:</p>
                    <div className="font-mono font-bold text-sm truncate">
                      {trip.passengers.length === 1 ? (
                        trip.passengers[0]?.city?.toUpperCase() || '---'
                      ) : (
                        <div className="flex flex-col">
                          {trip.passengers.map((p, i) => (
                            <span key={p.id}>{i + 1}. {p.city?.toUpperCase() || '---'}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-mono text-[10px] text-gray-500 font-bold uppercase tracking-wider">Date:</p>
                    <p className="font-mono font-bold text-sm">{trip.startDate ? new Date(trip.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : 'OPEN'}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-gray-500 font-bold uppercase tracking-wider">To:</p>
                    <p className="font-mono font-bold text-sm truncate">{trip.destination?.toUpperCase() || 'DESTINATION'}</p>
                  </div>

                  <div>
                    <p className="font-mono text-[10px] text-gray-500 font-bold uppercase tracking-wider">Travelers:</p>
                    <p className="font-mono font-bold text-sm">{trip.passengers.length}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-gray-500 font-bold uppercase tracking-wider">Budget:</p>
                    <p className="font-mono font-bold text-sm">{budget.totalBudget ? `₹${budget.totalBudget.toLocaleString()}` : 'TBD'}</p>
                  </div>
                </div>


              </div>

              {/* Right Stub Section */}
              <div className="w-32 p-4 flex flex-col justify-between relative overflow-hidden bg-[#FDFBF7]">
                {/* Background Plane Silhouette */}
                <Plane size={100} className="absolute -right-4 top-1/4 text-gray-200/50 transform rotate-45 z-0" strokeWidth={1} />
                
                <div className="relative z-10 space-y-3">
                  <div>
                    <p className="font-mono text-[9px] text-gray-500 font-bold uppercase">Name:</p>
                    <p className="font-mono font-bold text-xs truncate">{trip.passengers[0]?.name?.toUpperCase() || 'TRAVELER'}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] text-gray-500 font-bold uppercase">To:</p>
                    <p className="font-mono font-bold text-xs truncate">{trip.destination?.toUpperCase() || 'DEST'}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] text-gray-500 font-bold uppercase">Date:</p>
                    <p className="font-mono font-bold text-xs">{trip.startDate ? new Date(trip.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : 'OPEN'}</p>
                  </div>
                </div>
                

              </div>
            </div>

            {/* Bottom Red Bar */}
            <div className="flex bg-[#9B2C2C] h-6 rounded-b-2xl relative">
              <div className="flex-1 border-r-2 border-dashed border-white/30" />
              <div className="w-32" />
              {/* Bottom notch for perforation */}
              <div className="absolute -top-2 right-[7.6rem] w-4 h-4 bg-background rounded-full" />
            </div>

          </motion.div>
        </div>
        
      </main>
    </div>
  );
}

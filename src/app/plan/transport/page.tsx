'use client';

import React, { useEffect, useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { TransportOption, Passenger } from '@/types/trip';
import { api } from '@/lib/api';
import { Plane, Train, Bus, Car, ArrowRight, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { TrainRouteModal, LiveStatusModal, StationBoardModal } from '@/components/ui/TrainModals';

export default function TransportPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  
  // Local state to store fetched options per passenger
  const [transportMap, setTransportMap] = useState<Record<string, TransportOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recommended' | 'cheapest' | 'fastest' | 'earliest'>('recommended');

  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [stationBoardOpen, setStationBoardOpen] = useState(false);
  const [activeTrainId, setActiveTrainId] = useState('');

  // Fetch transport options for all passengers on mount
  useEffect(() => {
    const fetchAllTransport = async () => {
      setLoading(true);
      const newMap: Record<string, TransportOption[]> = {};
      
      for (const pax of trip.passengers) {
        if (!pax.city) continue; // Skip if no origin city
        const options = await api.getTransportOptions(pax.city, trip.destination);
        newMap[pax.id] = options;
      }
      
      setTransportMap(newMap);
      setLoading(false);
    };

    if (trip.passengers.length > 0 && trip.destination) {
      fetchAllTransport();
    } else {
      setLoading(false);
    }
  }, [trip.passengers, trip.destination]);

  // Handle transport selection
  const handleSelectTransport = (paxId: string, option: TransportOption) => {
    const existingSelection = trip.selectedTransports.find(t => t.passengerId === paxId);
    
    // If clicking the currently selected option, deselect it
    if (existingSelection && existingSelection.transportOptionId === option.id) {
      budget.refundExpense('transport', existingSelection.cost);
      trip.deselectTransport(paxId);
      budget.recalcBudget();
      return;
    }

    // Otherwise, select the new one (refunding the old one if it exists)
    if (existingSelection) {
      budget.refundExpense('transport', existingSelection.cost);
    }
    trip.selectTransport(paxId, option);
    budget.addExpense('transport', option.price);
    budget.recalcBudget();
  };

  const getTransportIcon = (type: string) => {
    if (type === 'flight') return <Plane className="text-blue-500" size={20} />;
    if (type === 'train') return <Train className="text-orange-500" size={20} />;
    if (type === 'cab' || type === 'car') return <Car className="text-purple-500" size={20} />;
    return <Bus className="text-green-500" size={20} />;
  };

  const parseDuration = (dur: string) => {
    const hMatch = dur.match(/(\d+)h/);
    const mMatch = dur.match(/(\d+)m/);
    return (hMatch ? parseInt(hMatch[1]) * 60 : 0) + (mMatch ? parseInt(mMatch[1]) : 0);
  };

  const parseTime = (time: string) => {
    const timePart = time.includes(', ') ? time.split(', ')[1] : time;
    if (!timePart) return 0;
    const [h, m] = timePart.split(':').map(Number);
    return h * 60 + m;
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-background pt-10 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-12 pb-24 text-foreground">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-end"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">Transport Options</h1>
            <p className="text-muted-foreground">Select how everyone is getting to <span className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => setStationBoardOpen(true)}>{trip.destination || 'the destination'}</span>.</p>
            <button onClick={() => setStationBoardOpen(true)} className="mt-2 text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 rounded-full hover:bg-orange-500/20 transition-colors">
              Explore Live Station Board
            </button>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort Options</label>
            <select 
              className="p-2 border border-border rounded-lg bg-card outline-none focus:border-primary text-sm font-medium text-foreground cursor-pointer shadow-sm transition-colors"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="recommended">★ Recommended</option>
              <option value="cheapest">Cheapest First</option>
              <option value="fastest">Fastest First</option>
              <option value="earliest">Earliest Departure</option>
            </select>
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-12 text-center text-muted-foreground animate-pulse"
            >
              Searching routes across multiple APIs...
            </motion.div>
          ) : trip.passengers.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-8 border-2 border-dashed border-border rounded-xl text-center text-muted-foreground"
            >
              No passengers added yet. Please go back to Setup.
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-10"
            >
              {trip.passengers.map((pax) => {
                const rawOptions = transportMap[pax.id] || [];
                
                // Sort options based on user preference
                let options = [...rawOptions];
                if (sortBy === 'cheapest') {
                  options.sort((a, b) => a.price - b.price);
                } else if (sortBy === 'fastest') {
                  options.sort((a, b) => parseDuration(a.duration) - parseDuration(b.duration));
                } else if (sortBy === 'earliest') {
                  options.sort((a, b) => parseTime(a.departure) - parseTime(b.departure));
                } else {
                  // 'recommended'
                  options = [...rawOptions];
                }

                const selectedTransportId = trip.selectedTransports.find(t => t.passengerId === pax.id)?.transportOptionId;

                return (
                  <motion.section 
                    variants={itemVariants}
                    key={pax.id} 
                    className="bg-card p-6 rounded-2xl border border-border shadow-lg transition-colors"
                  >
                    <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{pax.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {pax.city || 'Unknown Origin'} → {trip.destination}
                        </p>
                      </div>
                      {pax.transportPreference && pax.transportPreference !== 'any' && (
                        <div className="text-sm font-medium bg-muted text-muted-foreground px-3 py-1 rounded-full border border-border">
                          Prefers: {pax.transportPreference}
                        </div>
                      )}
                    </div>

                    {options.length === 0 ? (
                      <div className="text-muted-foreground text-sm flex items-center gap-2">
                        <AlertCircle size={16} /> No transport options found for this route.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <AnimatePresence>
                          {options.map((opt, idx) => {
                            const isSelected = selectedTransportId === opt.id;
                            const isRecommended = sortBy === 'recommended' && opt.recommendationScore > 85;

                            return (
                              <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={opt.id}
                                onClick={() => handleSelectTransport(pax.id, opt)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className={`
                                  relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors
                                  ${isSelected 
                                    ? 'border-primary bg-primary/10 shadow-sm' 
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                  }
                                `}
                              >
                                <div className="flex items-center gap-4">
                                  {isSelected ? (
                                    <CheckCircle2 className="text-primary" />
                                  ) : (
                                    <Circle className="text-muted-foreground/50" />
                                  )}
                                  
                                  <div className="p-3 bg-background rounded-lg shadow-sm border border-border">
                                    {getTransportIcon(opt.type)}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold uppercase tracking-wider text-sm">{opt.provider || opt.type}</span>
                                      {isRecommended && (
                                        <span className="text-[10px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 border border-yellow-500/30 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                          ★ RECOMMENDED
                                        </span>
                                      )}
                                    </div>
                                      <div className="text-sm text-muted-foreground mt-1">
                                        {opt.departure} <ArrowRight className="inline mx-1" size={14}/> {opt.arrival} ({opt.duration})
                                      </div>
                                      
                                      {opt.type === 'train' && opt.id.startsWith('tr_') && (
                                        <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                          <button 
                                            onClick={() => {
                                              setActiveTrainId(opt.id.split('_')[1]);
                                              setRouteModalOpen(true);
                                            }}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-colors border border-border"
                                          >
                                            View Route
                                          </button>
                                          <button 
                                            onClick={() => {
                                              setActiveTrainId(opt.id.split('_')[1]);
                                              setLiveModalOpen(true);
                                            }}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                                          >
                                            Live Status
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-xl font-bold text-foreground">₹{opt.price.toLocaleString()}</div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.section>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTINUATION */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between items-center pt-8 border-t border-border"
        >
          <button 
            onClick={() => router.push('/plan/setup')}
            className="text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            ← Back to Setup
          </button>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/plan/places')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
          >
            Discover Places <ArrowRight size={20} />
          </motion.button>
        </motion.div>
      </div>

      <TrainRouteModal 
        isOpen={routeModalOpen} 
        onClose={() => setRouteModalOpen(false)} 
        trainNumber={activeTrainId} 
      />
      <LiveStatusModal 
        isOpen={liveModalOpen} 
        onClose={() => setLiveModalOpen(false)} 
        trainNumber={activeTrainId} 
      />
      <StationBoardModal 
        isOpen={stationBoardOpen} 
        onClose={() => setStationBoardOpen(false)} 
        stationCode={trip.destination}
        stationName={trip.destination}
      />
    </div>
  );
}

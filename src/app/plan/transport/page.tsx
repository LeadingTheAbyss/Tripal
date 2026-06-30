'use client';

import React, { useEffect, useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { TransportOption, Passenger } from '@/types/trip';
import { api } from '@/lib/api';
import { Train, Plane, MapPin, Building, Bus, Car, Loader2, IndianRupee, Clock, ShieldCheck, Armchair, ChevronDown, ArrowRight, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { TrainRouteModal, LiveStatusModal, StationBoardModal } from '@/components/ui/TrainModals';

const LoadingScreen = ({ isFinished, onComplete }: { isFinished: boolean, onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);

  // Asymptotic progress logic
  useEffect(() => {
    if (isFinished) {
      setProgress(100);
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }

    const interval = setInterval(() => {
      setProgress(p => {
        const remaining = 99 - p;
        const jump = Math.max(0.8, remaining * 0.08); 
        const next = p + jump;
        return next >= 99 ? 99 : next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isFinished, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] w-full h-screen bg-[#1e1424] flex flex-col justify-end items-center pb-16 overflow-hidden select-none">
      {/* Epic Background Illustration */}
      <img 
        src="/images/travel_loading_bg.png" 
        alt="Epic Journey Horizon" 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

      {/* Title Header (Top Right style alignment) */}
      <div className="absolute top-12 right-12 text-right z-50">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-wider drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] uppercase">
          Ghumi-Ghumi
        </h1>
      </div>

      {/* Gamified UI Loading Container */}
      <div className="w-full max-w-2xl px-6 z-50 flex flex-col items-center">
        <span className="text-xl font-black text-amber-400 tracking-widest uppercase mb-2 animate-pulse drop-shadow">
          Finding Transport Options... {Math.floor(progress)}%
        </span>

        {/* The Track */}
        <div className="relative w-full h-6 bg-black/60 rounded-full border border-white/10 backdrop-blur-sm flex items-center p-1">
          {/* Progress Fill */}
          <motion.div 
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: "easeInOut" }}
          />
          
          {/* Slider Head (Animated Train) */}
          <motion.div 
            className="absolute top-1/2 -translate-y-1/2 -ml-6 flex items-center z-10"
            style={{ left: `${progress}%` }}
            transition={{ ease: "easeInOut" }}
          >
            {/* Animated Smoke Puffs */}
            <div className="absolute -left-6 -top-4 flex gap-1 pointer-events-none scale-x-[-1]">
              <motion.div 
                animate={{ x: [-2, -15], y: [-5, -15], opacity: [0.8, 0], scale: [0.5, 2] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                className="w-2.5 h-2.5 bg-gray-200/80 rounded-full blur-[1px]"
              />
              <motion.div 
                animate={{ x: [-1, -10], y: [-2, -10], opacity: [0.6, 0], scale: [0.6, 1.5] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 }}
                className="w-2 h-2 bg-gray-300/60 rounded-full blur-[1px]"
              />
              <motion.div 
                animate={{ x: [0, -8], y: [0, -8], opacity: [0.9, 0], scale: [0.4, 1.8] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: 0.6 }}
                className="w-1.5 h-1.5 bg-white/70 rounded-full blur-[0.5px]"
              />
            </div>
            
            {/* The Train (Flipped horizontally to face right) */}
            <motion.div 
              className="text-4xl scale-x-[-1] filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]"
              animate={{ y: [-1.5, 1.5, -1.5], rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 0.4, ease: "easeInOut" }}
            >
                <Train size={48} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            </motion.div>
          </motion.div>
        </div>

        {/* Waiting Message */}
        <div className="h-12 mt-4 flex items-center justify-center overflow-hidden">
          <motion.p 
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-xs md:text-sm text-gray-300 text-center max-w-lg font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,1)]"
          >
            Searching across multiple sources. This might take a few moments...
          </motion.p>
        </div>
      </div>
    </div>
  );
};

export default function TransportPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  
  // Local state to store fetched options per passenger
  const [transportMap, setTransportMap] = useState<Record<string, TransportOption[]>>({});
  const [loading, setLoading] = useState(false);
  const [backendFinished, setBackendFinished] = useState(true);
  const [sortBy, setSortBy] = useState<'recommended' | 'cheapest' | 'fastest' | 'earliest'>('recommended');

  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [stationBoardOpen, setStationBoardOpen] = useState(false);
  const [activeTrainId, setActiveTrainId] = useState('');
  
  // Track active transport tab per passenger
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  
  // Track lazy loading states
  const [fetchedModes, setFetchedModes] = useState<Record<string, boolean>>({});
  const [loadingMode, setLoadingMode] = useState<Record<string, boolean>>({});

  const handleAccordionClick = async (pax: Passenger, type: string) => {
    const key = `${pax.id}-${type}`;
    const isActive = activeTabs[pax.id] === type;

    if (!fetchedModes[key] && !loadingMode[key]) {
      setLoadingMode(prev => ({ ...prev, [key]: true }));
      setActiveTabs({ ...activeTabs, [pax.id]: type });
      
      const options = await api.getTransportOptions(pax.city, trip.destination, type);
      
      setTransportMap(prev => {
        const current = prev[pax.id] || [];
        return { ...prev, [pax.id]: [...current, ...options] };
      });
      setFetchedModes(prev => ({ ...prev, [key]: true }));
      setLoadingMode(prev => ({ ...prev, [key]: false }));
    } else {
      setActiveTabs({ ...activeTabs, [pax.id]: isActive ? '' : type });
    }
  };

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
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}
            >
              <LoadingScreen isFinished={backendFinished} onComplete={() => setLoading(false)} />
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

                    {/* Accordion Sections for Transport Types */}
                    <div className="space-y-4">
                      {['flight', 'train', 'bus', 'cab'].map((type) => {
                        const key = `${pax.id}-${type}`;
                        const isFetched = fetchedModes[key];
                        const isLoading = loadingMode[key];

                        const typeOptions = options.filter(o => o.type === type || (type === 'cab' && o.type === 'car'));
                        
                        const currentActive = activeTabs[pax.id] ?? '';
                        const isActive = currentActive === type && (isFetched ? typeOptions.length > 0 : true);
                        
                        return (
                          <div key={type} className={`border-2 border-border rounded-xl overflow-hidden bg-card transition-all ${isFetched && typeOptions.length === 0 ? 'opacity-60' : ''}`}>
                            {/* Accordion Header */}
                            <button
                              onClick={() => handleAccordionClick(pax, type)}
                              disabled={isFetched && typeOptions.length === 0}
                              className={`w-full px-6 py-4 flex items-center justify-between font-bold transition-colors ${
                                isActive 
                                  ? 'bg-primary/10 text-primary' 
                                  : (isFetched && typeOptions.length === 0 ? 'bg-muted/30 text-muted-foreground cursor-not-allowed' : 'hover:bg-muted/50 text-foreground')
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {getTransportIcon(type)}
                                <span className="capitalize text-lg">{type === 'bus' ? 'buses' : `${type}s`}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-sm px-3 py-1 rounded-full border ${isFetched && typeOptions.length === 0 ? 'bg-muted/50 border-transparent text-muted-foreground' : 'bg-background border-border'} ${isLoading ? 'animate-pulse text-primary' : ''}`}>
                                  {isLoading ? 'Searching...' : (!isFetched ? 'Click to search' : (typeOptions.length === 0 ? `No ${type === 'bus' ? 'buses' : type + 's'} available` : `${typeOptions.length} Options`))}
                                </span>
                                {(!isFetched || typeOptions.length > 0) && (
                                  <motion.div
                                    animate={{ rotate: isActive ? 180 : 0 }}
                                    className="text-muted-foreground"
                                  >
                                    ▼
                                  </motion.div>
                                )}
                              </div>
                            </button>
                            
                            {/* Accordion Content */}
                            <AnimatePresence initial={false}>
                              {isActive && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 space-y-3 bg-muted/20 border-t-2 border-border">
                                    {isLoading ? (
                                      <div className="flex items-center justify-center p-8 text-muted-foreground font-medium">
                                        <Loader2 className="animate-spin mr-3" size={20} /> Searching live {type === 'bus' ? 'buses' : type + 's'}...
                                      </div>
                                    ) : typeOptions.map((opt, idx) => {
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
                                                relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors bg-card
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
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
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

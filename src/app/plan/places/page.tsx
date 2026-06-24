'use client';

import React, { useEffect, useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { Place } from '@/types/trip';
import { api } from '@/lib/api';
import { ArrowRight, Clock, IndianRupee, MapPin, Star, X, Map, Bookmark, Navigation, Smartphone, Share2, Info, Ticket, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import WikiImage from '@/components/WikiImage';

function PlaceModal({ place, destination, isOpen, onClose, onToggle, isSelected }: { place: Place, destination: string, isOpen: boolean, onClose: () => void, onToggle: () => void, isSelected: boolean }) {
  const [activeTab, setActiveTab] = useState('Overview');
  
  if (!isOpen) return null;
  
  const reviewCount = (place.id.length * 1234) % 25000;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-zinc-900 rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full transition-colors">
          <X size={20} />
        </button>

        {/* Hero Image */}
        <div className="relative h-64 w-full shrink-0">
          <WikiImage placeName={place.name} destination={destination} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Header Info */}
          <h2 className="text-3xl font-bold text-white mb-1">{place.name}</h2>
          <p className="text-zinc-400 text-sm mb-3">Historical Landmark • <span className="text-blue-400">{place.category}</span></p>
          
          <div className="flex items-center gap-2 mb-6">
            <span className="text-zinc-300 font-bold">{place.rating || 4.5}</span>
            <div className="flex text-yellow-500">
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" className="opacity-50" />
            </div>
            <span className="text-zinc-500 text-sm">({reviewCount.toLocaleString()})</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-zinc-800 mb-6">
            {['Overview', 'Tickets', 'Reviews', 'About'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'Overview' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {/* Action Buttons */}
              <div className="flex justify-between px-2 mb-8">
                {[
                  { icon: Navigation, label: 'Directions', color: 'bg-blue-600', text: 'text-white' },
                  { icon: Bookmark, label: 'Save', color: 'bg-blue-900/30', text: 'text-blue-400' },
                  { icon: MapPin, label: 'Nearby', color: 'bg-blue-900/30', text: 'text-blue-400' },
                  { icon: Smartphone, label: 'Send', color: 'bg-blue-900/30', text: 'text-blue-400' },
                  { icon: Share2, label: 'Share', color: 'bg-blue-900/30', text: 'text-blue-400' },
                ].map(action => (
                  <div key={action.label} className="flex flex-col items-center gap-2 cursor-pointer group">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${action.color} ${action.text}`}>
                      <action.icon size={20} />
                    </div>
                    <span className={`text-xs font-medium ${action.text === 'text-white' ? 'text-zinc-300' : 'text-zinc-400'}`}>{action.label}</span>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-800/50 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-zinc-300">
                    <Clock size={18} className="text-zinc-500" />
                    <span>Duration: {place.visitDurationHours} hours</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-zinc-300">
                    <IndianRupee size={18} className="text-green-500" />
                    <span>Entry: {place.entryFee === 0 ? 'Free' : `₹${place.entryFee}`}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Tickets' && (
            <div className="text-zinc-400 py-8 text-center animate-in slide-in-from-right-4 duration-300">
              <Ticket size={32} className="mx-auto mb-3 opacity-20" />
              Tickets can be purchased at the venue counter.
            </div>
          )}

          {activeTab === 'Reviews' && (
            <div className="text-zinc-400 py-8 text-center animate-in slide-in-from-right-4 duration-300">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
              Showing {reviewCount.toLocaleString()} reviews from travelers.
            </div>
          )}

          {activeTab === 'About' && (
            <div className="text-zinc-400 py-8 text-center animate-in slide-in-from-right-4 duration-300">
              <Info size={32} className="mx-auto mb-3 opacity-20" />
              Historical and cultural significance information goes here.
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
          <button 
            onClick={() => {
              onToggle();
              onClose();
            }}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              isSelected 
                ? 'bg-red-900/50 text-red-400 hover:bg-red-900 border border-red-800' 
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30'
            }`}
          >
            {isSelected ? 'Remove from Plan' : 'Add to Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlacesPage() {
  const router = useRouter();
  const trip = useTripStore();
  const budget = useBudgetStore();
  const itinerary = useItineraryStore();
  
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModalPlace, setSelectedModalPlace] = useState<Place | null>(null);
  const [sortBy, setSortBy] = useState<'top_rated' | 'cheapest' | 'shortest_visit'>('top_rated');

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      const data = await api.getPlaces(trip.destination);
      setPlaces(data);
      setLoading(false);
    };
    if (trip.destination) fetchPlaces();
    else setLoading(false);
  }, [trip.destination]);

  const handleTogglePlace = (place: Place) => {
    const isSelected = itinerary.selectedPlaces.some(p => p.id === place.id);
    if (isSelected) {
      itinerary.removePlaceFromBag(place.id);
      budget.refundExpense('places', place.entryFee);
    } else {
      itinerary.addPlaceToBag(place);
      budget.addExpense('places', place.entryFee);
    }
    budget.recalcBudget();
  };

  return (
    <div className="min-h-screen bg-background pt-10 px-4 text-foreground transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-10 pb-24">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">Place Discovery</h1>
            <p className="text-zinc-400">What do you want to experience in {trip.destination || 'the destination'}?</p>
          </div>
          <div className="text-sm font-medium bg-blue-900/50 text-blue-300 px-4 py-2 rounded-full border border-blue-800">
            {itinerary.selectedPlaces.length} Places Selected
          </div>
        </div>

        <div className="flex gap-2 text-sm mt-6">
          <button 
            onClick={() => setSortBy('top_rated')}
            className={`${sortBy === 'top_rated' ? 'bg-primary/20 text-primary border-primary/50' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'} font-medium px-4 py-2 rounded-lg border transition-colors`}
          >
            Top Rated
          </button>
          <button 
            onClick={() => setSortBy('cheapest')}
            className={`${sortBy === 'cheapest' ? 'bg-primary/20 text-primary border-primary/50' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'} font-medium px-4 py-2 rounded-lg border transition-colors`}
          >
            Cheapest First
          </button>
          <button 
            onClick={() => setSortBy('shortest_visit')}
            className={`${sortBy === 'shortest_visit' ? 'bg-primary/20 text-primary border-primary/50' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'} font-medium px-4 py-2 rounded-lg border transition-colors`}
          >
            Shortest Visit
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 animate-pulse">
            Curating best attractions...
          </div>
        ) : places.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
            No places found. Go back to Setup and enter a destination.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(() => {
              let sortedPlaces = [...places];
              if (sortBy === 'cheapest') {
                sortedPlaces.sort((a, b) => a.entryFee - b.entryFee);
              } else if (sortBy === 'shortest_visit') {
                sortedPlaces.sort((a, b) => a.visitDurationHours - b.visitDurationHours);
              } else {
                sortedPlaces.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
              }

              return sortedPlaces.map((place) => {
              const isSelected = itinerary.selectedPlaces.some(p => p.id === place.id);

              return (
                <div 
                  key={place.id}
                  onClick={() => setSelectedModalPlace(place)}
                  className={`
                    relative flex flex-col rounded-3xl border-2 transition-all cursor-pointer overflow-hidden group
                    ${isSelected 
                      ? 'border-blue-500 bg-zinc-900 shadow-md shadow-blue-900/20' 
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:shadow-xl'
                    }
                  `}
                >
                  {/* Image Section (Click opens modal) */}
                  <div 
                    className="relative h-48 w-full overflow-hidden"
                    onClick={() => setSelectedModalPlace(place)}
                  >
                    <WikiImage 
                      placeName={place.name} 
                      destination={trip.destination} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
                    
                    {/* Visual state toggle */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        ✓ ADDED
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 
                        className="text-lg font-bold text-white leading-tight hover:text-blue-400 transition-colors"
                        onClick={() => setSelectedModalPlace(place)}
                      >
                        {place.name}
                      </h3>
                      <div className="text-green-500 font-bold whitespace-nowrap ml-3">
                        {place.entryFee === 0 ? 'Free' : `₹${place.entryFee}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-yellow-500 mb-4 text-sm">
                      <span className="font-bold text-zinc-300 mr-1">{place.rating || 4.5}</span>
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} className="opacity-50" fill="currentColor" />
                      <span className="text-zinc-500 ml-1">({((place.id.length * 1234) % 25000).toLocaleString()})</span>
                    </div>

                    <div className="space-y-2 mt-auto text-sm text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-zinc-500" /> 
                        <span>Takes {place.visitDurationHours} hrs to visit</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePlace(place);
                      }}
                      className={`mt-6 w-full font-bold py-3 rounded-xl transition-all ${
                        isSelected 
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' 
                          : 'bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Remove' : '+ Add to Plan'}
                    </button>
                  </div>
                </div>
              );
            })})()}
          </div>
        )}

        <div className="flex justify-between items-center pt-8 border-t border-zinc-800">
          <button 
            onClick={() => router.push('/plan/transport')}
            className="text-zinc-400 hover:text-white font-medium transition-colors"
          >
            ← Back to Transport
          </button>
          <button 
            onClick={() => router.push('/plan/hotels')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-transform hover:-translate-y-1"
          >
            Find Hotels <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* Expanded Modal */}
      {selectedModalPlace && (
        <PlaceModal 
          place={selectedModalPlace} 
          destination={trip.destination}
          isOpen={!!selectedModalPlace} 
          onClose={() => setSelectedModalPlace(null)}
          onToggle={() => handleTogglePlace(selectedModalPlace)}
          isSelected={itinerary.selectedPlaces.some(p => p.id === selectedModalPlace.id)}
        />
      )}
    </div>
  );
}

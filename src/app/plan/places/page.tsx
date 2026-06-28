'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { Place } from '@/types/trip';
import { api } from '@/lib/api';
import {
  ArrowRight, Clock, IndianRupee, MapPin, Star, X,
  Bookmark, Navigation, Smartphone, Share2, Ticket,
  Filter, SlidersHorizontal
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import WikiImage from '@/components/WikiImage';

function PlaceModal({ place, destination, isOpen, onClose, onToggle, isSelected }: {
  place: Place;
  destination: string;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  isSelected: boolean;
}) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (activeTab === 'Reviews' && reviews.length === 0) {
      const fetchReviews = async () => {
        setLoadingReviews(true);
        try {
          const res = await fetch(`http://localhost:8000/api/places/reviews?location_id=${place.id}`);
          const data = await res.json();
          setReviews(data);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingReviews(false);
        }
      };
      fetchReviews();
    }
  }, [activeTab, place.id]);

  if (!isOpen) return null;

  const reviewCount = (place.id.length * 1234) % 25000;

  const handleActionClick = (action: string) => {
    switch (action) {
      case 'Directions':
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + destination)}`, '_blank');
        break;
      case 'Nearby':
        window.open(`https://www.google.com/maps/search/restaurants+near+${encodeURIComponent(place.name + ' ' + destination)}`, '_blank');
        break;
      case 'Save':
        alert(`Saved ${place.name} to your bookmarks!`);
        break;
      case 'Send':
        alert(`Sent ${place.name} details to your device.`);
        break;
      case 'Share':
        if (navigator.share) {
          navigator.share({ title: place.name, text: `Check out ${place.name} in ${destination}!`, url: window.location.href })
            .catch(() => alert('Link copied!'));
        } else {
          alert('Link copied to clipboard!');
        }
        break;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white p-2 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        {/* Hero Image */}
        <div className="relative h-64 w-full shrink-0">
          <WikiImage placeName={place.name} destination={destination} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
          {/* Category pill overlaid on image */}
          <div className="absolute bottom-4 left-4">
            <span className="bg-blue-600/80 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
              {place.category}
            </span>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Header */}
          <h2 className="text-2xl font-bold text-white mb-1">{place.name}</h2>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-1">
              <span className="text-zinc-300 font-bold text-sm">{place.rating || 4.5}</span>
              <div className="flex text-yellow-400">
                {[...Array(4)].map((_, i) => <Star key={i} size={13} fill="currentColor" />)}
                <Star size={13} fill="currentColor" className="opacity-40" />
              </div>
              <span className="text-zinc-500 text-xs">({reviewCount.toLocaleString()})</span>
            </div>
            <span className="text-zinc-700">•</span>
            <span className="text-zinc-400 text-sm flex items-center gap-1">
              <MapPin size={13} className="text-zinc-500" /> {destination}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-5 border-b border-zinc-800 mb-5 sticky top-0 bg-zinc-900 z-10 pt-1">
            {['Overview', 'Tickets', 'Reviews', 'About'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'Overview' && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              {/* Action Buttons */}
              <div className="flex justify-between px-1 mb-2">
                {[
                  { icon: Navigation, label: 'Directions', color: 'bg-blue-600', text: 'text-white' },
                  { icon: Bookmark, label: 'Save', color: 'bg-zinc-800', text: 'text-blue-400' },
                  { icon: MapPin, label: 'Nearby', color: 'bg-zinc-800', text: 'text-blue-400' },
                  { icon: Smartphone, label: 'Send', color: 'bg-zinc-800', text: 'text-blue-400' },
                  { icon: Share2, label: 'Share', color: 'bg-zinc-800', text: 'text-blue-400' },
                ].map(action => (
                  <div
                    key={action.label}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group"
                    onClick={() => handleActionClick(action.label)}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 group-hover:brightness-110 ${action.color} ${action.text}`}>
                      <action.icon size={19} />
                    </div>
                    <span className="text-[11px] font-medium text-zinc-400">{action.label}</span>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-3 text-zinc-300">
                  <Clock size={17} className="text-zinc-500 shrink-0" />
                  <span className="text-sm">Duration: <span className="font-semibold text-white">{place.visitDurationHours} hours</span></span>
                </div>
                <div className="border-t border-zinc-700/50" />
                <div className="flex items-center gap-3 text-zinc-300">
                  <IndianRupee size={17} className="text-green-500 shrink-0" />
                  <span className="text-sm">
                    Entry: <span className="font-semibold text-white">
                      {place.entryFee === 0 ? 'Free' : `₹${place.entryFee}`}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tickets Tab */}
          {activeTab === 'Tickets' && (
            <div className="text-zinc-400 py-10 text-center animate-in slide-in-from-right-4 duration-300">
              <Ticket size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Tickets can be purchased at the venue counter.</p>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'Reviews' && (
            <div className="text-zinc-300 py-2 animate-in slide-in-from-right-4 duration-300 space-y-3">
              <p className="text-xs text-zinc-500 mb-3">Showing {reviews.length} of {reviewCount.toLocaleString()} reviews</p>
              {loadingReviews ? (
                <div className="text-center py-8 text-zinc-500 animate-pulse text-sm">Fetching reviews...</div>
              ) : reviews.length > 0 ? (
                reviews.map((review, i) => {
                  const colorHue = (place.id.charCodeAt(0) + i * 37) % 360;
                  return (
                    <div key={review.id || i} className="flex items-start gap-3 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/30">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-white uppercase text-sm"
                        style={{ backgroundColor: `hsl(${colorHue}, 60%, 40%)` }}
                      >
                        {review.author[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{review.author}</span>
                          <div className="flex text-yellow-400">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star key={idx} size={11} fill="currentColor" className={idx < Math.floor(review.rating) ? '' : 'opacity-25'} />
                            ))}
                          </div>
                        </div>
                        {review.title && <p className="text-xs font-semibold text-zinc-300 mb-1">{review.title}</p>}
                        <p className="text-xs text-zinc-400 leading-relaxed">{review.text}</p>
                        {review.date && <p className="text-[11px] text-zinc-600 mt-1.5">{review.date}</p>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-zinc-500 text-sm">No reviews found.</div>
              )}
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'About' && (
            <div className="text-zinc-300 py-2 animate-in slide-in-from-right-4 duration-300 text-sm leading-relaxed space-y-3">
              <p>
                <span className="font-semibold text-white">{place.name}</span> is one of the most prominent{' '}
                <span className="text-blue-400">{place.category}</span> attractions in {destination}. It takes
                approximately <span className="font-semibold text-white">{place.visitDurationHours} hours</span> to fully explore.
              </p>
              <p className="text-zinc-400">
                It has a safety score of <span className="font-semibold text-white">{place.safetyScore}/10</span>, making it
                suitable for all types of travelers, and is rated <span className="font-semibold text-white">{place.rating || 4.5}</span> stars
                by visitors.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
          <button
            onClick={() => { onToggle(); onClose(); }}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${isSelected
              ? 'bg-red-950/60 text-red-400 hover:bg-red-900/60 border border-red-900'
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30'
            }`}
          >
            {isSelected ? '✕ Remove from Plan' : '+ Add to Plan'}
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
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'cheapest' | 'shortest'>('recommended');

  // Derive unique categories from places data
  const categories = useMemo(() => {
    const unique = Array.from(new Set(places.map(p => p.category).filter(Boolean)));
    return ['All', ...unique.sort()];
  }, [places]);

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

  const displayedPlaces = useMemo(() => {
    let filtered = activeCategory === 'All' ? places : places.filter(p => p.category === activeCategory);
    const sorted = [...filtered];
    if (sortBy === 'cheapest') sorted.sort((a, b) => a.entryFee - b.entryFee);
    else if (sortBy === 'shortest') sorted.sort((a, b) => a.visitDurationHours - b.visitDurationHours);
    return sorted;
  }, [places, activeCategory, sortBy]);

  return (
    <div className="min-h-screen bg-background pt-10 px-4 text-foreground transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6 pb-24">

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-1">Place Discovery</h1>
            <p className="text-zinc-400 text-sm">
              Explore top attractions in <span className="text-white font-medium">{trip.destination || 'your destination'}</span>
            </p>
          </div>
          <div className="text-sm font-semibold bg-blue-900/40 text-blue-300 px-4 py-2 rounded-full border border-blue-800/50 shrink-0">
            {itinerary.selectedPlaces.length} Selected
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Category filter tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 flex-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-900/40'
                    : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal size={15} className="text-zinc-500" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-zinc-800 text-zinc-300 text-sm border border-zinc-700 rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="cheapest">Cheapest First</option>
              <option value="shortest">Shortest Visit</option>
            </select>
          </div>
        </div>

        {/* Places Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="h-48 bg-zinc-800" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-zinc-800 rounded w-3/4" />
                  <div className="h-4 bg-zinc-800 rounded w-1/2" />
                  <div className="h-10 bg-zinc-800 rounded w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedPlaces.length === 0 ? (
          <div className="p-12 border-2 border-dashed border-zinc-800 rounded-2xl text-center text-zinc-500">
            <MapPin size={32} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No places found</p>
            <p className="text-sm mt-1">Try selecting a different category or go back and set a destination.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedPlaces.map(place => {
              const isSelected = itinerary.selectedPlaces.some(p => p.id === place.id);
              return (
                <div
                  key={place.id}
                  onClick={() => setSelectedModalPlace(place)}
                  className={`relative flex flex-col rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden group hover:-translate-y-1 bg-zinc-900 ${
                    isSelected
                      ? 'border-blue-500 shadow-lg shadow-blue-900/30'
                      : 'border-zinc-800 hover:border-zinc-600 hover:shadow-xl hover:shadow-black/40'
                  }`}
                >
                  {/* Image */}
                  <div className="relative h-48 w-full overflow-hidden shrink-0">
                    <WikiImage
                      placeName={place.name}
                      destination={trip.destination}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

                    {/* Category badge */}
                    <div className="absolute top-3 left-3">
                      <span className="bg-black/50 backdrop-blur-sm text-zinc-300 text-[11px] font-medium px-2.5 py-1 rounded-full">
                        {place.category}
                      </span>
                    </div>

                    {/* Selected badge */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                        ✓ ADDED
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="text-base font-bold text-white leading-tight group-hover:text-blue-400 transition-colors">
                        {place.name}
                      </h3>
                      <span className={`text-sm font-bold shrink-0 ${place.entryFee === 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                        {place.entryFee === 0 ? 'Free' : `₹${place.entryFee}`}
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3">
                      <Star size={12} className="text-yellow-400" fill="currentColor" />
                      <span className="text-xs font-semibold text-zinc-300">{place.rating || 4.5}</span>
                      <span className="text-xs text-zinc-600 ml-1">({((place.id.length * 1234) % 25000).toLocaleString()})</span>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-auto mb-3">
                      <Clock size={12} />
                      <span>{place.visitDurationHours} hrs visit</span>
                    </div>

                    {/* Add button */}
                    <button
                      onClick={e => { e.stopPropagation(); handleTogglePlace(place); }}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                        isSelected
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                          : 'bg-transparent text-blue-400 border-blue-600/40 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                      }`}
                    >
                      {isSelected ? 'Remove' : '+ Add to Plan'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-zinc-800">
          <button
            onClick={() => router.push('/plan/transport')}
            className="text-zinc-400 hover:text-white font-medium transition-colors text-sm"
          >
            ← Back to Transport
          </button>
          <button
            onClick={() => router.push('/plan/hotels')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-transform hover:-translate-y-0.5 text-sm"
          >
            Find Hotels <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Modal */}
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

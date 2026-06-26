'use client';

import React, { useEffect, useState } from 'react';
import { useTripStore } from '@/store/tripStore';
import { useItineraryStore } from '@/store/itineraryStore';
import { Place } from '@/types/trip';
import { ArrowRight, Clock, AlertTriangle, GripVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- DROPPABLE LIST COMPONENT ---
function DroppableList({ id, items, children, className }: { id: string, items: string[], children: React.ReactNode, className?: string }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className={className}>
        {children}
      </div>
    </SortableContext>
  );
}

// --- SORTABLE CARD COMPONENT ---
function SortablePlaceCard({ place, isOverlay = false }: { place: Place, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: place.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group bg-card/80 backdrop-blur-sm border rounded-xl p-4 flex items-center gap-4 transition-all duration-200 
        ${isOverlay ? 'shadow-2xl shadow-primary/20 border-primary/50 rotate-2 scale-105 z-50 bg-card' : 'border-border hover:border-primary/50 hover:bg-card hover:shadow-lg hover:shadow-primary/5'}
      `}
    >
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground group-hover:text-primary active:cursor-grabbing p-1 -ml-2 rounded-md hover:bg-primary/10 transition-colors">
        <GripVertical size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-foreground truncate">{place.name}</h4>
        <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-2 mt-1.5">
          <span className="text-primary/90 uppercase tracking-wider font-bold">{place.category}</span>
          <span className="w-1 h-1 rounded-full bg-border"></span>
          <span className="flex items-center gap-1.5"><Clock size={11} className="text-muted-foreground/70"/> {place.visitDurationHours + place.travelTimeHours} hrs total</span>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function ItineraryPage() {
  const router = useRouter();
  const trip = useTripStore();
  const itinerary = useItineraryStore();
  
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize days on mount
  useEffect(() => {
    if (itinerary.days.length === 0) {
      const startDateStr = trip.startDate || new Date().toISOString().split('T')[0];
      const start = new Date(startDateStr);
      
      let nights = 3; // Default 3 days if no end date
      if (trip.startDate && trip.endDate) {
        const end = new Date(trip.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      if (nights === 0) nights = 1; // Ensure at least 1 day

      itinerary.initializeDays(nights, startDateStr);
    }
  }, [trip.startDate, trip.endDate, itinerary.days.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Calculate unassigned places
  const assignedPlaceIds = new Set(itinerary.days.flatMap(d => d.placeIds));
  const unassignedPlaces = itinerary.selectedPlaces.filter(p => !assignedPlaceIds.has(p.id));

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const place = itinerary.selectedPlaces.find(p => p.id === active.id);
    if (place) setActivePlace(place);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const findContainerDay = (id: string) => {
      if (id === 'unassigned') return 0;
      const day = itinerary.days.find(d => d.dayNumber.toString() === id || d.placeIds.includes(id));
      return day ? day.dayNumber : 0;
    };

    const sourceDay = findContainerDay(activeId);
    const destDay = findContainerDay(overId);

    if (sourceDay !== destDay) {
      let newIndex: number | undefined;
      if (destDay !== 0 && overId !== destDay.toString() && overId !== 'unassigned') {
        const destDayObj = itinerary.days.find(d => d.dayNumber === destDay);
        if (destDayObj) {
          newIndex = destDayObj.placeIds.indexOf(overId);
          if (newIndex === -1) newIndex = undefined;
        }
      }

      itinerary.movePlaceBetweenDays(activeId, sourceDay, destDay, newIndex);
      if (sourceDay !== 0) itinerary.recalcDay(sourceDay);
      if (destDay !== 0) itinerary.recalcDay(destDay);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePlace(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const findContainerDay = (id: string) => {
      if (id === 'unassigned') return 0;
      const day = itinerary.days.find(d => d.dayNumber.toString() === id || d.placeIds.includes(id));
      return day ? day.dayNumber : 0;
    };

    const sourceDay = findContainerDay(activeId);
    const destDay = findContainerDay(overId);

    if (sourceDay === destDay && sourceDay !== 0 && activeId !== overId) {
      const day = itinerary.days.find(d => d.dayNumber === sourceDay);
      if (day) {
        const oldIndex = day.placeIds.indexOf(activeId);
        const newIndex = day.placeIds.indexOf(overId);
        
        // Use arrayMove to reorder within the same list
        const newPlaceIds = arrayMove(day.placeIds, oldIndex, newIndex);
        
        // Update store with new order
        useItineraryStore.setState(state => {
          const newDays = [...state.days];
          const dayIdx = newDays.findIndex(d => d.dayNumber === sourceDay);
          if (dayIdx >= 0) {
            newDays[dayIdx] = { ...newDays[dayIdx], placeIds: newPlaceIds };
          }
          return { days: newDays };
        });
      }
    }
  };

  if (!isMounted) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 h-full flex flex-col px-4 text-foreground">
      {/* Header */}
      <div className="flex justify-between items-end shrink-0 py-6 border-b border-border">
        <div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">Schedule <span className="text-primary">Planner</span></h1>
          <p className="text-muted-foreground text-sm font-medium">Design your perfect itinerary. Drag and drop places into your daily schedule.</p>
        </div>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 flex-1 overflow-hidden">
          
          {/* Unassigned Places (Bag) */}
          <div className="w-80 flex flex-col bg-card/40 backdrop-blur-xl rounded-3xl border border-border/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] shrink-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-border/50 bg-card/60 backdrop-blur-md">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                Available Places
                <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-bold">{unassignedPlaces.length}</span>
              </h3>
            </div>
            
            <DroppableList id="unassigned" items={unassignedPlaces.map(p => p.id)} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {unassignedPlaces.map(place => (
                <SortablePlaceCard key={place.id} place={place} />
              ))}
              {unassignedPlaces.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                  <div className="w-12 h-12 rounded-full bg-border/50 flex items-center justify-center mb-3">
                    <Clock size={20} />
                  </div>
                  <p className="text-sm font-medium">All places scheduled!</p>
                </div>
              )}
            </DroppableList>
          </div>

          {/* Day Columns */}
          <div className="flex-1 overflow-x-auto flex gap-5 pb-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 px-2">
            {itinerary.days.map((day) => {
              const dayPlaces = day.placeIds.map(id => itinerary.selectedPlaces.find(p => p.id === id)).filter(Boolean) as Place[];
              const isOverloaded = day.totalTimeHours > 8;

              return (
                <div key={day.dayNumber} className="w-80 shrink-0 flex flex-col bg-card/40 backdrop-blur-xl rounded-3xl border border-border/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden transition-colors duration-300">
                  <div className={`p-5 border-b border-border/50 transition-colors ${isOverloaded ? 'bg-red-500/5' : 'bg-card/60 backdrop-blur-md'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-lg tracking-tight">Day {day.dayNumber}</h3>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-background/50 border border-border text-muted-foreground">{day.date}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                      <span className={isOverloaded ? 'text-red-500' : 'text-primary'}>
                        {day.totalTimeHours} hrs scheduled
                      </span>
                    </div>

                    {isOverloaded && (
                      <div className="mt-4 text-xs font-medium text-red-400 flex items-start gap-2 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                        <AlertTriangle size={16} className="shrink-0 text-red-500" /> 
                        <p>Schedule is over 8 hours. Consider shifting places.</p>
                      </div>
                    )}
                  </div>

                  <DroppableList id={day.dayNumber.toString()} items={day.placeIds} className="flex-1 p-4 space-y-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] min-h-[300px]">
                    {dayPlaces.map(place => (
                      <SortablePlaceCard key={place.id} place={place} />
                    ))}
                    {dayPlaces.length === 0 && (
                      <div className="text-xs text-muted-foreground font-medium text-center border-2 border-dashed border-border/50 rounded-2xl p-8 h-full flex flex-col items-center justify-center opacity-60">
                         Drop places here to build your day
                      </div>
                    )}
                  </DroppableList>
                </div>
              );
            })}
          </div>

        </div>

        <DragOverlay>
          {activePlace ? <SortablePlaceCard place={activePlace} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-6 shrink-0">
        <button 
          onClick={() => router.push('/plan/hotels')}
          className="text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          ← Back to Hotels
        </button>
        <button 
          onClick={() => router.push('/plan/review')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 hover:shadow-primary/30"
        >
          Final Review <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

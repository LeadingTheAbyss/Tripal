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
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border-2 rounded-xl p-4 flex items-center gap-4 ${isOverlay ? 'shadow-2xl border-blue-500 rotate-2' : 'border-zinc-200 hover:border-zinc-300'}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab text-zinc-400 hover:text-black active:cursor-grabbing">
        <GripVertical size={20} />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-sm text-zinc-900">{place.name}</h4>
        <div className="text-xs text-zinc-500 font-medium flex items-center gap-2 mt-1">
          <span className="text-blue-500 uppercase">{place.category}</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Clock size={12}/> {place.visitDurationHours + place.travelTimeHours} hrs total</span>
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

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePlace(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source and destination containers
    const findContainerDay = (id: string) => {
      if (id === 'unassigned') return 0;
      const day = itinerary.days.find(d => d.dayNumber.toString() === id || d.placeIds.includes(id));
      return day ? day.dayNumber : 0;
    };

    const sourceDay = findContainerDay(activeId);
    const destDay = findContainerDay(overId);

    let newIndex: number | undefined;
    if (destDay !== 0 && overId !== destDay.toString() && overId !== 'unassigned') {
      const destDayObj = itinerary.days.find(d => d.dayNumber === destDay);
      if (destDayObj) {
        newIndex = destDayObj.placeIds.indexOf(overId);
        if (newIndex === -1) newIndex = undefined;
      }
    }

    if (sourceDay !== destDay) {
      itinerary.movePlaceBetweenDays(activeId, sourceDay, destDay, newIndex);
      if (sourceDay !== 0) itinerary.recalcDay(sourceDay);
      if (destDay !== 0) itinerary.recalcDay(destDay);
    } else {
      // Reordering within same day (basic swap logic for MVP)
      if (sourceDay !== 0 && activeId !== overId) {
        const day = itinerary.days.find(d => d.dayNumber === sourceDay);
        if (day) {
          const newIdx = day.placeIds.indexOf(overId);
          itinerary.movePlaceBetweenDays(activeId, sourceDay, destDay, newIdx);
        }
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-3xl font-bold mb-2">Itinerary Engine</h1>
          <p className="text-zinc-500">Drag places into days. We'll warn you if a day gets too packed.</p>
        </div>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-8 flex-1 overflow-hidden">
          
          {/* Unassigned Places (Bag) */}
          <div className="w-80 flex flex-col bg-zinc-100 rounded-2xl border-2 border-dashed border-zinc-300 p-4 shrink-0">
            <h3 className="font-bold text-zinc-600 mb-4 px-2">Unscheduled Bag ({unassignedPlaces.length})</h3>
            
            <DroppableList id="unassigned" items={unassignedPlaces.map(p => p.id)} className="flex-1 space-y-3 overflow-y-auto px-2 pb-4">
              {unassignedPlaces.map(place => (
                <SortablePlaceCard key={place.id} place={place} />
              ))}
              {unassignedPlaces.length === 0 && (
                <div className="text-sm text-zinc-400 text-center mt-10">All places assigned!</div>
              )}
            </DroppableList>
          </div>

          {/* Day Columns */}
          <div className="flex-1 overflow-x-auto flex gap-6 pb-4">
            {itinerary.days.map((day) => {
              const dayPlaces = day.placeIds.map(id => itinerary.selectedPlaces.find(p => p.id === id)).filter(Boolean) as Place[];
              const isOverloaded = day.totalTimeHours > 8;

              return (
                <div key={day.dayNumber} className="w-80 shrink-0 flex flex-col bg-white rounded-2xl border-2 border-zinc-200 shadow-sm overflow-hidden">
                  <div className={`p-4 border-b-2 ${isOverloaded ? 'bg-red-50 border-red-200' : 'bg-zinc-50 border-zinc-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-lg">Day {day.dayNumber}</h3>
                      <span className="text-xs font-bold text-zinc-500">{day.date}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className={isOverloaded ? 'text-red-600' : 'text-blue-600'}>
                        ⏱️ {day.totalTimeHours} hrs scheduled
                      </span>
                    </div>

                    {isOverloaded && (
                      <div className="mt-2 text-xs font-bold text-red-600 flex items-start gap-1 bg-white p-2 rounded border border-red-100">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" /> 
                        Warning: You've packed too much. Shift places to another day.
                      </div>
                    )}
                  </div>

                  <DroppableList id={day.dayNumber.toString()} items={day.placeIds} className="flex-1 p-4 space-y-3 overflow-y-auto bg-zinc-50/50 min-h-[300px]">
                    {dayPlaces.map(place => (
                      <SortablePlaceCard key={place.id} place={place} />
                    ))}
                    {dayPlaces.length === 0 && (
                      <div className="text-xs text-zinc-400 font-medium text-center border-2 border-dashed border-zinc-200 rounded-xl p-8 h-full flex items-center justify-center">
                        Drop places here
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

      {/* CONTINUATION */}
      <div className="flex justify-between items-center pt-8 border-t border-zinc-200 shrink-0 mt-8">
        <button 
          onClick={() => router.push('/plan/hotels')}
          className="text-zinc-500 hover:text-black font-medium"
        >
          ← Back to Hotels
        </button>
        <button 
          onClick={() => router.push('/plan/review')}
          className="bg-black hover:bg-zinc-800 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-1"
        >
          Final Review <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

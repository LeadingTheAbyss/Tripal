'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { MapPin } from 'lucide-react';
import { INDIAN_CITIES } from '@/lib/cities';

interface CityAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}

export default function CityAutocomplete({ label, placeholder, value, onChange }: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal query with external value if it changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // Keep parent state updated

    if (val.length >= 1) {
      const filtered = INDIAN_CITIES.filter(city => 
        city.toLowerCase().startsWith(val.toLowerCase())
      )
      .sort((a, b) => a.localeCompare(b)) // Alphabetical sort
      .slice(0, 8); // Top 8 matches
      
      setResults(filtered);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (city: string) => {
    setQuery(city);
    onChange(city);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      <input 
        type="text" 
        placeholder={placeholder}
        className="w-full p-3 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-zinc-600"
        value={query}
        onChange={handleInputChange}
        onFocus={() => { if (results.length > 0) setIsOpen(true); }}
      />
      
      {isOpen && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden top-[100%]">
          {results.map((res, i) => (
            <div 
              key={i} 
              className="p-3 hover:bg-zinc-800 cursor-pointer flex flex-col border-b last:border-0 border-zinc-800"
              onClick={() => handleSelect(res)}
            >
              <div className="font-semibold text-white flex items-center gap-2">
                <MapPin size={14} className="text-zinc-500" />
                {res}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

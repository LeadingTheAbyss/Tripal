'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { MapPin, Loader2 } from 'lucide-react';


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
  const [loading, setLoading] = useState(false);
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

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // Keep parent state updated

    if (val.length >= 2) {
      setLoading(true);
      const apiResults = await api.searchCity(val);
      setResults(apiResults);
      setIsOpen(true);
      setLoading(false);
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
      {label && <label className="text-sm font-medium text-muted-foreground">{label}</label>}
      <div className="relative">
        <input 
          type="text" 
          placeholder={placeholder}
          className="w-full p-3 bg-background border border-input text-foreground rounded-lg focus:ring-2 focus:ring-primary outline-none placeholder:text-muted-foreground/50 pr-10 transition-colors"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="animate-spin text-muted-foreground" size={18} />
          </div>
        )}
      </div>
      
      {isOpen && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden top-[100%]">
          {results.map((res, i) => (
            <div 
              key={i} 
              className="p-3 hover:bg-muted cursor-pointer flex flex-col border-b last:border-0 border-border transition-colors"
              onClick={() => handleSelect(res.name)}
            >
              <div className="font-semibold text-foreground flex items-center gap-2">
                <MapPin size={14} className="text-muted-foreground" />
                {res.name} <span className="text-muted-foreground text-xs font-normal">({res.state})</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

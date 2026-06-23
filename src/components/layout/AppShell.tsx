'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBudgetStore } from '@/store/budgetStore';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const budget = useBudgetStore();

  const navLinks = [
    { href: '/plan/setup', label: '1. Trip Setup' },
    { href: '/plan/transport', label: '2. Transport' },
    { href: '/plan/places', label: '3. Places' },
    { href: '/plan/hotels', label: '4. Hotels' },
    { href: '/plan/itinerary', label: '5. Itinerary' },
    { href: '/plan/review', label: '6. Review' },
  ];

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r bg-white p-6 flex flex-col justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold mb-8 text-blue-600">Ghumi-Ghumi ✈️</h1>
          <nav className="space-y-2">
            {navLinks.map(link => (
              <Link 
                key={link.href}
                href={link.href} 
                className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                  pathname.startsWith(link.href) 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Sticky Live Budget Widget */}
        <div className="mt-8 p-5 bg-zinc-50 rounded-xl border-2 border-zinc-200">
          <h3 className="font-bold text-sm mb-4 tracking-wider text-zinc-500">THE PURSE 💰</h3>
          
          <div className="space-y-4">
            <div>
              <div className="text-xs text-zinc-400 font-medium">TOTAL BUDGET</div>
              <div className="text-xl font-black">₹{budget.totalBudget.toLocaleString()}</div>
            </div>
            
            <div className="space-y-2 border-t border-zinc-200 pt-3">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-zinc-500">Transport ✈️</span>
                <span className="text-zinc-900">₹{budget.spentTransport.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-zinc-500">Places 🏛️</span>
                <span className="text-zinc-900">₹{budget.spentPlaces.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-zinc-500">Hotels 🏨</span>
                <span className="text-zinc-900">₹{budget.spentHotels.toLocaleString()}</span>
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-3">
              <div className="text-xs text-zinc-400 font-medium">REMAINING</div>
              <div className={`text-xl font-black ${budget.remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
                ₹{budget.remaining.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Progress Indicator */}
        <header className="h-16 border-b bg-white flex items-center px-8 shrink-0">
          <div className="flex items-center space-x-2 text-sm font-medium">
            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-md">Live Simulation Mode</span>
            <span className="text-zinc-300">/</span>
            <span className="text-zinc-600 capitalize">
              {pathname.split('/').pop()?.replace('-', ' ')}
            </span>
          </div>
        </header>

        {/* Dynamic Screen Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/50">
          {children}
        </div>
      </main>
    </div>
  );
}

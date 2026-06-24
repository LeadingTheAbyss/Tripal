'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBudgetStore } from '@/store/budgetStore';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const budget = useBudgetStore();
  const { theme, setTheme } = useTheme();

  const navLinks = [
    { href: '/plan/setup', label: '1. Trip Setup' },
    { href: '/plan/transport', label: '2. Transport' },
    { href: '/plan/places', label: '3. Places' },
    { href: '/plan/hotels', label: '4. Hotels' },
    { href: '/plan/itinerary', label: '5. Itinerary' },
    { href: '/plan/review', label: '6. Review' },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-card p-6 flex flex-col justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold mb-8 text-primary">Ghumi-Ghumi ✈️</h1>
          <nav className="space-y-2">
            {navLinks.map(link => (
              <Link 
                key={link.href}
                href={link.href} 
                className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                  pathname.startsWith(link.href) 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Sticky Live Budget Widget */}
        <div className="mt-8 p-5 bg-muted/50 rounded-xl border border-border">
          <h3 className="font-bold text-sm mb-4 tracking-wider text-muted-foreground">THE PURSE 💰</h3>
          
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground font-medium">TOTAL BUDGET</div>
              <div className="text-xl font-black">₹{budget.totalBudget.toLocaleString()}</div>
            </div>
            
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Transport ✈️</span>
                <span className="text-foreground">₹{budget.spentTransport.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Places 🏛️</span>
                <span className="text-foreground">₹{budget.spentPlaces.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Hotels 🏨</span>
                <span className="text-foreground">₹{budget.spentHotels.toLocaleString()}</span>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="text-xs text-muted-foreground font-medium">REMAINING</div>
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
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-2 text-sm font-medium">
            <span className="text-primary font-bold bg-primary/10 px-2 py-1 rounded-md">Live Simulation Mode</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground capitalize">
              {pathname.split('/').pop()?.replace('-', ' ')}
            </span>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        {/* Dynamic Screen Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-background">
          {children}
        </div>
      </main>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBudgetStore } from '@/store/budgetStore';
import { Moon, Sun, Plane, Wallet, Landmark, Building, MapPin } from 'lucide-react';
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
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-card p-6 flex flex-col justify-between shrink-0 overflow-y-auto shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-10">
        <div>
          <Link href="/" className="block cursor-pointer hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-black mb-8 tracking-tight text-foreground flex items-center gap-2">Ghumi-<span className="text-primary">Ghumi</span> <Plane className="text-primary" size={24} /></h1>
          </Link>
          <nav className="space-y-1.5">
            {navLinks.map(link => (
              <Link 
                key={link.href}
                href={link.href} 
                className={`block px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  pathname.startsWith(link.href) 
                    ? 'bg-primary/10 text-primary font-bold shadow-sm translate-x-1' 
                    : 'text-muted-foreground font-medium hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Sticky Live Budget Widget */}
        <div className="mt-8 p-5 bg-background rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">The Purse</h3>
            <Wallet size={18} className="text-primary" />
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-[11px] uppercase text-muted-foreground font-semibold mb-0.5">Total Budget</div>
              <div className="text-2xl font-black tracking-tight text-foreground">₹{budget.totalBudget.toLocaleString()}</div>
            </div>
            
            <div className="space-y-2.5 border-t border-border/60 pt-3">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-muted-foreground flex items-center gap-1.5"><Plane size={14} /> <span className="mt-0.5">Transport</span></span>
                <span className="text-foreground font-semibold">₹{budget.spentTransport.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-muted-foreground flex items-center gap-1.5"><Landmark size={14} /> <span className="mt-0.5">Places</span></span>
                <span className="text-foreground font-semibold">₹{budget.spentPlaces.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-muted-foreground flex items-center gap-1.5"><Building size={14} /> <span className="mt-0.5">Hotels</span></span>
                <span className="text-foreground font-semibold">₹{budget.spentHotels.toLocaleString()}</span>
              </div>
            </div>

            <div className="border-t border-border/60 pt-3">
              <div className="text-[11px] uppercase text-muted-foreground font-semibold mb-0.5">Remaining</div>
              <div className={`text-xl font-black tracking-tight ${budget.remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
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

'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, LogOut, Map, History, Compass, ChevronRight } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { UserAvatar } from '@/components/UserAvatar';

export default function ProfilePage() {
  const { user, fetchUser, isLoading, logout } = useAuthStore();
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      fetch('/api/trips')
        .then(res => res.json())
        .then(data => {
          setTrips(data.trips || []);
          setLoadingTrips(false);
        })
        .catch(() => setLoadingTrips(false));
    } else if (!isLoading) {
      // If not loading and no user, redirect to login
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (isLoading || !user) {
    return (
      <AppShell>
        <div className="w-full min-h-[calc(100vh-2rem)] bg-[#0A0A0A] text-[#EDEDED] flex items-center justify-center rounded-3xl">
          <div className="flex flex-col items-center gap-6">
             <div className="w-12 h-12 border border-white/20 border-t-white rounded-full animate-spin" />
             <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest animate-pulse">Authenticating...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="w-full min-h-[calc(100vh-2rem)] bg-[#0A0A0A] text-[#EDEDED] p-8 lg:p-16 rounded-3xl font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-16 border-b border-white/10 pb-8">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => router.push('/')} 
              className="text-white/40 hover:text-white transition-colors flex items-center gap-2 font-bold text-xs uppercase tracking-widest group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </button>
            <h1 className="text-4xl lg:text-5xl font-light tracking-tighter text-white">Profile</h1>
          </div>

          <button 
            onClick={handleLogout} 
            className="text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-20">
          
          {/* Identity Section (Left) */}
          <div className="w-full lg:w-80 flex flex-col items-start space-y-8">
            
            <div>
              <UserAvatar user={user} className="w-40 h-40 text-5xl border border-white/10 shadow-xl" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-light tracking-tight text-white">{user.name}</h2>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{user.email}</p>
            </div>

            <div className="pt-8 border-t border-white/10 w-full space-y-4">
               {['kartikeykumarsingh27jun2006@gmail.com', 'growwayushh@gmail.com', 'aawasthiapoorv@gmail.com'].includes(user.email) && (
                 <div className="flex justify-between items-center text-sm font-light">
                   <span className="text-white/40">Account Type</span>
                   <span className="text-white">Admin</span>
                 </div>
               )}
               <div className="flex justify-between items-center text-sm font-light">
                 <span className="text-white/40">Trips Planned</span>
                 <span className="text-white">{trips.length}</span>
               </div>
            </div>

          </div>

          {/* Mission History Section (Right) */}
          <div className="flex-1 flex flex-col">
            
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-8 flex items-center gap-3">
              <History size={14} className="text-white/20"/> Past Trips
            </h3>
            
            {loadingTrips ? (
              <div className="py-20 flex justify-center border-t border-white/10">
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest animate-pulse">Retrieving trips...</p>
              </div>
            ) : trips.length === 0 ? (
              <div className="py-20 flex flex-col items-start border-t border-white/10">
                <p className="text-2xl font-light text-white/40 mb-2">No trips on record.</p>
                <p className="text-sm font-light text-white/20 mb-8">You haven't planned any trips yet.</p>
                <button 
                  onClick={() => router.push('/plan/setup')}
                  className="bg-white text-black px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-white/90 transition-all flex items-center gap-3"
                >
                  Plan a New Trip <Compass size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col border-t border-white/10">
                {trips.map((trip, i) => {
                  const snap = trip.snapshot as any;
                  return (
                    <div key={trip.id} className="group flex items-center justify-between py-8 border-b border-white/10 hover:bg-white/[0.02] -mx-8 px-8 transition-colors cursor-pointer" onClick={() => {/* Future route to view past trip */}}>
                      
                      <div className="flex items-center gap-8">
                        <span className="text-white/20 font-bold text-xl group-hover:text-white/40 transition-colors">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <h4 className="text-2xl font-light text-white">{trip.destination}</h4>
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">
                            Created {new Date(trip.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-16">
                        <div className="hidden md:block">
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Pax</p>
                          <p className="text-lg font-light text-white">{snap.passengers?.length || 0}</p>
                        </div>
                        <div className="hidden sm:block">
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Budget Expended</p>
                          <p className="text-lg font-light text-white">₹{snap.budget?.spent?.toLocaleString() || 0}</p>
                        </div>
                        <ChevronRight size={20} className="text-white/20 group-hover:text-white transition-colors" />
                      </div>

                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}

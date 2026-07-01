'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Users, Compass, Activity, ArrowLeft, RefreshCw, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ADMIN_EMAILS = [
  'kartikeykumarsingh27jun2006@gmail.com',
  'growwayushh@gmail.com',
  'aawasthiapoorv@gmail.com'
];

interface StatsData {
  stats: {
    totalUsers: number;
    totalTrips: number;
    totalApiCallsToday: number;
    apiBreakdown: Record<string, number>;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    picture: string | null;
    apiCalls: number;
    apiCallsFlights: number;
    apiCallsTrains: number;
    apiCallsBusses: number;
    apiCallsHotels: number;
    apiCallsPlaces: number;
    lastApiCallDate: string;
    createdAt: string;
    _count: {
      tripHistories: number;
    };
  }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

// Custom animated counter component
const Counter = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 1500; // 1.5s
    const startValue = 0;
    const endValue = value;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutExpo)
      const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      
      setDisplayValue(Math.floor(startValue + (endValue - startValue) * ease));

      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <>{displayValue}</>;
};

// Custom SVG Bar Chart for API Breakdown
const ApiBreakdownChart = ({ data }: { data: Record<string, number> }) => {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <div className="text-white/40 text-sm py-10 text-center flex flex-col items-center gap-2"><BarChart2 size={24} className="opacity-50" /> No API telemetry data yet.</div>;
  
  const maxVal = Math.max(...entries.map(e => e[1]), 1);

  return (
    <div className="w-full space-y-4 mt-6">
      {entries.map(([key, value], i) => (
        <motion.div 
          key={key} 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + (i * 0.1) }}
          className="w-full"
        >
          <div className="flex justify-between text-xs mb-2">
            <span className="font-mono text-white/80">{key}</span>
            <span className="font-bold text-white"><Counter value={value} /> <span className="text-white/40 font-light ml-1">calls</span></span>
          </div>
          <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(value / maxVal) * 100}%` }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 + (i * 0.1) }}
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 rounded-full relative"
            >
              <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30" />
            </motion.div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default function AdminStatsPage() {
  const { user, isLoading, fetchUser } = useAuthStore();
  const router = useRouter();
  
  const [data, setData] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const fetchStats = async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/profile');
          return;
        }
        throw new Error('Failed to fetch stats');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        router.push('/');
        return;
      }
      fetchStats();
    }
  }, [user, isLoading, router]);

  if (isLoading || loadingStats) {
    return (
      <AppShell>
        <div className="w-full min-h-[calc(100vh-2rem)] flex items-center justify-center bg-[#050505]">
          <div className="flex flex-col items-center gap-6">
             <div className="relative w-16 h-16">
               <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
               <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-spin" />
               <div className="absolute inset-2 border-2 border-transparent border-b-blue-500 rounded-full animate-[spin_1.5s_linear_reverse_infinite]" />
             </div>
             <motion.p 
               animate={{ opacity: [0.3, 1, 0.3] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]"
             >
               Establishing Secure Uplink
             </motion.p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="w-full min-h-[calc(100vh-2rem)] flex items-center justify-center flex-col gap-4 bg-[#050505]">
          <p className="text-red-500 font-mono text-sm">SYSTEM_ERR: {error || 'Failed to load telemetry'}</p>
          <button onClick={fetchStats} className="text-xs bg-white text-black px-6 py-3 font-bold uppercase tracking-widest rounded hover:bg-white/90 transition-all">Retry Uplink</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="w-full min-h-[calc(100vh-2rem)] bg-[#050505] text-[#EDEDED] p-6 lg:p-10 font-sans overflow-x-hidden relative">
        
        {/* Background ambient glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-7xl mx-auto relative z-10"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => router.push('/profile')} 
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all group"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div>
                <h1 className="text-4xl font-light tracking-tight text-white mb-1">Command Center</h1>
                <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Admin Telemetry Overview</p>
              </div>
            </div>

            <button 
              onClick={fetchStats}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest group"
            >
              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" /> Refresh Data
            </button>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
            
            {/* KPI 1 */}
            <motion.div variants={itemVariants} className="col-span-1 md:col-span-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-white/20 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors duration-700" />
              <div className="text-white/40 flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-6">
                <Users size={16} /> Global Users
              </div>
              <div className="text-7xl font-light text-white tracking-tighter">
                <Counter value={data.stats.totalUsers} />
              </div>
            </motion.div>

            {/* KPI 2 */}
            <motion.div variants={itemVariants} className="col-span-1 md:col-span-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-white/20 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-500/10 transition-colors duration-700" />
              <div className="text-white/40 flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-6">
                <Compass size={16} /> Total Missions
              </div>
              <div className="text-7xl font-light text-white tracking-tighter">
                <Counter value={data.stats.totalTrips} />
              </div>
            </motion.div>

            {/* KPI 3 */}
            <motion.div variants={itemVariants} className="col-span-1 md:col-span-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-white/20 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/10 transition-colors duration-700" />
              <div className="text-white/40 flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-6">
                <Activity size={16} /> API Calls (24H)
              </div>
              <div className="text-7xl font-light text-white tracking-tighter">
                <Counter value={data.stats.totalApiCallsToday} />
              </div>
            </motion.div>

            {/* API Breakdown Chart */}
            <motion.div variants={itemVariants} className="col-span-1 md:col-span-12 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div>
                  <h3 className="text-xl font-light text-white mb-1">API Telemetry Breakdown</h3>
                  <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Network Usage by Endpoint</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <BarChart2 size={18} />
                </div>
              </div>
              
              <div className="py-2">
                <ApiBreakdownChart data={data.stats.apiBreakdown || {}} />
              </div>
            </motion.div>

            {/* Users Table */}
            <motion.div variants={itemVariants} className="col-span-1 md:col-span-12 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live User Roster
                </h3>
                <span className="text-xs font-mono text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  {data.users.length} Records
                </span>
              </div>
              
              <div className="w-full overflow-x-auto rounded-xl border border-white/5 bg-white/[0.02]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-white/30 uppercase tracking-widest border-b border-white/10">
                      <th className="py-5 px-6 font-medium">Operative</th>
                      <th className="py-5 px-6 font-medium">Contact</th>
                      <th className="py-5 px-6 font-medium">Clearance</th>
                      <th className="py-5 px-6 font-medium">Deployed</th>
                      <th className="py-5 px-6 font-medium text-right">Missions</th>
                      <th className="py-5 px-6 font-medium text-right">Requests</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <AnimatePresence>
                      {data.users.map((u, i) => (
                        <React.Fragment key={u.id}>
                          <motion.tr 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className="border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                            onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-4">
                                {u.picture ? (
                                  <img src={u.picture} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-white/30 transition-colors" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 group-hover:border-white/30 transition-colors flex items-center justify-center text-xs font-light text-white">
                                    {u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-light text-white tracking-wide">{u.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-white/40 font-mono text-xs tracking-tight">{u.email}</td>
                            <td className="py-4 px-6">
                              {ADMIN_EMAILS.includes(u.email) ? (
                                <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold uppercase tracking-widest text-blue-400">Admin</span>
                              ) : (
                                <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40">User</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-white/40 text-xs">
                              {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-4 px-6 text-right font-light text-white text-lg">{u._count.tripHistories}</td>
                            <td className="py-4 px-6 text-right font-light text-white text-lg">
                              <div className="flex flex-col items-end group relative">
                                <span>{u.apiCalls}</span>
                                
                                {u.apiCalls > 0 && (
                                  <div className="flex flex-col items-end gap-1 mt-1">
                                    <span className="text-[9px] text-white/30 font-mono uppercase tracking-widest">
                                      Last Login: {new Date(u.lastApiCallDate).toLocaleDateString()}
                                    </span>
                                    <span className="text-[9px] text-blue-400/80 font-bold uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {expandedUserId === u.id ? 'Hide Breakdown ▼' : 'View Breakdown ▶'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                          
                          <AnimatePresence>
                            {expandedUserId === u.id && u.apiCalls > 0 && (
                              <motion.tr
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="border-b border-white/5 bg-[#111111]"
                              >
                                <td colSpan={6} className="py-4 px-6">
                                  <div className="w-full max-w-sm ml-auto grid grid-cols-2 gap-4">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 col-span-2 border-b border-white/10 pb-2 mb-1">API Usage Breakdown</div>
                                    <div className="flex justify-between items-center text-xs"><span className="text-white/60">Flights</span> <span className="font-mono text-white/90">{u.apiCallsFlights || 0}</span></div>
                                    <div className="flex justify-between items-center text-xs"><span className="text-white/60">Trains</span> <span className="font-mono text-white/90">{u.apiCallsTrains || 0}</span></div>
                                    <div className="flex justify-between items-center text-xs"><span className="text-white/60">Busses</span> <span className="font-mono text-white/90">{u.apiCallsBusses || 0}</span></div>
                                    <div className="flex justify-between items-center text-xs"><span className="text-white/60">Hotels</span> <span className="font-mono text-white/90">{u.apiCallsHotels || 0}</span></div>
                                    <div className="flex justify-between items-center text-xs"><span className="text-white/60">Places</span> <span className="font-mono text-white/90">{u.apiCallsPlaces || 0}</span></div>
                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                
                {data.users.length === 0 && (
                  <div className="py-16 flex flex-col items-center justify-center text-sm text-white/30 gap-4">
                    <Users size={32} className="opacity-50" />
                    <span className="font-mono uppercase tracking-widest text-xs">No records found</span>
                  </div>
                )}
              </div>
            </motion.div>

          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}

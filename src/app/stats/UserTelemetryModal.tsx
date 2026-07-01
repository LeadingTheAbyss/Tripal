'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, CalendarDays, Loader2 } from 'lucide-react';

interface DailyStat {
  date: string;
  loginCount: number;
  apiCalls: number;
}

interface UserTelemetryModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

export const UserTelemetryModal: React.FC<UserTelemetryModalProps> = ({ userId, userName, onClose }) => {
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/user/${userId}/stats`);
        if (!res.ok) throw new Error('Failed to fetch telemetry');
        const json = await res.json();
        setStats(json.stats || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId]);

  // Generate last 30 days
  const last30Days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  // Map stats to days
  const statsMap = stats.reduce((acc, stat) => {
    acc[stat.date] = stat;
    return acc;
  }, {} as Record<string, DailyStat>);

  const chartData = last30Days.map(date => ({
    date,
    apiCalls: statsMap[date]?.apiCalls || 0,
    loginCount: statsMap[date]?.loginCount || 0,
  }));

  const maxApiCalls = Math.max(...chartData.map(d => d.apiCalls), 1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        {/* Modal Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-blue-900/20"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>

          <div className="mb-8">
            <h2 className="text-2xl font-light text-white mb-1">Telemetry: {userName}</h2>
            <p className="text-xs font-mono text-white/40 uppercase tracking-widest">30-Day Activity History</p>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 text-white/40">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <span className="text-xs font-mono uppercase tracking-widest">Fetching classified records...</span>
            </div>
          ) : error ? (
            <div className="h-64 flex items-center justify-center text-red-500/80 text-sm font-mono">{error}</div>
          ) : (
            <div className="space-y-12">
              
              {/* API Calls Graph */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Activity size={16} className="text-emerald-500" />
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest">Network Requests (API)</h3>
                </div>
                
                <div className="h-48 flex items-end gap-2 w-full overflow-x-auto pb-4 custom-scrollbar">
                  {chartData.map((data, i) => (
                    <div key={data.date} className="flex flex-col items-center gap-2 flex-1 min-w-[20px] group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/10 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-10 pointer-events-none">
                        {data.apiCalls} calls<br/>
                        <span className="text-white/40">{new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      
                      <div className="w-full bg-white/5 rounded-t-sm relative h-full flex items-end overflow-hidden">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${(data.apiCalls / maxApiCalls) * 100}%` }}
                          transition={{ duration: 1, delay: i * 0.02, ease: 'easeOut' }}
                          className="w-full bg-gradient-to-t from-blue-600 to-indigo-400 opacity-80 group-hover:opacity-100 transition-opacity relative"
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                        </motion.div>
                      </div>
                      <span className="text-[8px] text-white/30 font-mono rotate-45 origin-left w-4 overflow-visible">
                        {new Date(data.date).getDate()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logins Timeline */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <CalendarDays size={16} className="text-purple-500" />
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest">Authentication Log</h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {chartData.map((data, i) => {
                    const isActive = data.loginCount > 0;
                    return (
                      <motion.div
                        key={`login-${data.date}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + (i * 0.02) }}
                        className={`group relative flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-mono cursor-default transition-all duration-300
                          ${isActive 
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.4)]' 
                            : 'bg-white/5 border-white/5 text-white/20 hover:border-white/20'
                          }
                        `}
                      >
                        {new Date(data.date).getDate()}
                        
                        {isActive && (
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-purple-500/30 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-10 pointer-events-none text-purple-200">
                            {data.loginCount} login(s)<br/>
                            <span className="text-white/40">{new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

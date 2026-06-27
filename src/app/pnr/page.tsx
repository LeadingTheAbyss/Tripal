'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Train, Users, IndianRupee, MapPin, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PnrPassenger {
  passengerNo: string;
  bookingStatus: string;
  currentStatus: string;
  coachNo: string;
}

interface PnrData {
  pnrNumber: string;
  journeyDetails: {
    trainNumber: string;
    trainName: string;
    boardingDate: string;
    from: string;
    to: string;
    reservedUpto: string;
    boardingPoint: string;
    class: string;
  };
  passengerDetails: PnrPassenger[];
  otherDetails: {
    currency: string;
    totalFare: string;
    chartingStatus: string;
    remarksIfAny: string;
    trainStatus: string;
  };
}

export default function PnrTracker() {
  const [pnr, setPnr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pnrData, setPnrData] = useState<PnrData | null>(null);
  const [cached, setCached] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pnr || pnr.length !== 10) {
      setError('Please enter a valid 10-digit PNR number.');
      return;
    }

    setLoading(true);
    setError('');
    setPnrData(null);
    setCached(false);

    try {
      const response = await fetch(`/api/pnr?pnr=${pnr}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch PNR status.');
      }

      setPnrData(data.data);
      setCached(data.cached);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl pt-10">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tight mb-4">
            IRCTC PNR Status
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-xl mx-auto">
            Get real-time Indian Railway PNR updates instantly.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-200/50 dark:border-slate-800 p-6 md:p-10 mb-8 backdrop-blur-xl">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Enter 10-digit PNR Number"
                value={pnr}
                onChange={(e) => setPnr(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                className="pl-12 h-14 text-lg rounded-2xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
            <Button 
              type="submit"
              disabled={loading || pnr.length !== 10}
              className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Checking...' : 'Check Status'}
            </Button>
          </form>

          {error && (
            <div className="mt-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 flex items-center justify-center gap-2">
              <Info className="w-5 h-5" />
              <p className="font-medium">{error}</p>
            </div>
          )}
        </div>

        {pnrData && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
            {/* Journey Header */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-semibold tracking-wide">
                      PNR: {pnrData.pnrNumber}
                    </span>
                    {cached && (
                      <span className="bg-green-500/20 text-green-100 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border border-green-500/30">
                        Cached Result
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                    <Train className="w-8 h-8 opacity-80" />
                    {pnrData.journeyDetails.trainName}
                  </h2>
                  <p className="text-blue-100 mt-1 flex items-center gap-2 text-lg">
                    Train No: <span className="font-semibold text-white">{pnrData.journeyDetails.trainNumber}</span> • Class: <span className="font-semibold text-white">{pnrData.journeyDetails.class}</span>
                  </p>
                </div>
                
                <div className="flex flex-col gap-2 min-w-[200px] bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-100 flex items-center gap-1"><MapPin className="w-4 h-4"/> Boarding</span>
                    <span className="font-bold">{pnrData.journeyDetails.boardingPoint}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-100 flex items-center gap-1"><MapPin className="w-4 h-4"/> Destination</span>
                    <span className="font-bold">{pnrData.journeyDetails.to}</span>
                  </div>
                  <div className="h-px bg-white/20 my-1"></div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-100 flex items-center gap-1"><Clock className="w-4 h-4"/> Date</span>
                    <span className="font-bold">{pnrData.journeyDetails.boardingDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Passenger Details */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-6 h-6 text-slate-400" />
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Passenger Status</h3>
              </div>
              
              <div className="grid gap-4">
                {pnrData.passengerDetails.map((pass, index) => {
                  const isConfirmed = pass.currentStatus.toUpperCase().includes('CNF');
                  const isWaitlist = pass.currentStatus.toUpperCase().includes('WL');
                  
                  return (
                    <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                      <div className="mb-2 sm:mb-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{pass.passengerNo}</p>
                        <p className="text-sm text-slate-500">Booking Status: {pass.bookingStatus}</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {pass.coachNo && (
                          <div className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold">
                            Coach: {pass.coachNo}
                          </div>
                        )}
                        <div className={`px-4 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 ${
                          isConfirmed 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' 
                            : isWaitlist
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${isConfirmed ? 'bg-green-500' : isWaitlist ? 'bg-orange-500' : 'bg-blue-500'} animate-pulse`}></div>
                          {pass.currentStatus}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Other Details */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800 p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Fare</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {pnrData.otherDetails.currency === 'INR' ? '₹' : pnrData.otherDetails.currency} {pnrData.otherDetails.totalFare}
                  </p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800 p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Charting Status</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {pnrData.otherDetails.chartingStatus}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

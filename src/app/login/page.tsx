'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, ArrowLeft } from 'lucide-react';
import Script from 'next/script';

export default function LoginPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = async (response: any) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      });
      
      if (res.ok) {
        // Use user-provided redirect URL if available, otherwise default to /profile
        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/profile';
        router.push(redirect);
      } else {
        console.error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  useEffect(() => {
    // Only initialize if the script is loaded and the container exists
    const initGoogle = () => {
      if (typeof window !== 'undefined' && (window as any).google && googleButtonRef.current) {
        (window as any).google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
        (window as any).google.accounts.id.renderButton(
          googleButtonRef.current,
          { theme: 'outline', size: 'large', width: 300, text: 'continue_with' } // Classic light button
        );
      }
    };

    // If already loaded, initialize immediately
    if (typeof window !== 'undefined' && (window as any).google) {
        initGoogle();
    } else {
        // Otherwise wait for it
        window.addEventListener('google-loaded', initGoogle);
        return () => window.removeEventListener('google-loaded', initGoogle);
    }
  }, []);

  return (
    <div className="min-h-screen relative text-slate-800 overflow-hidden landing-body" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#D0CBC7' }}>
      {/* Homepage Sky Background Elements */}
      <div className="content !h-screen !min-h-screen">
        <div className="sunset !h-screen !min-h-screen !absolute !top-0 !left-0 !w-full !z-0">
          <div className="silhouette-back !absolute !bottom-0 !w-full" style={{ opacity: 0.8, transform: 'translateY(0vh)' }}></div>
          <div className="silhouette-front !absolute !bottom-0 !w-full" style={{ opacity: 1, transform: 'translateY(0vh)' }}></div>
        </div>
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="lazyOnload"
        onLoad={() => {
            window.dispatchEvent(new Event('google-loaded'));
        }}
      />

      {/* Back Button */}
      <button 
        onClick={() => router.push('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors z-20 group font-semibold"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </button>

      {/* The White Box */}
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl p-10 flex flex-col items-center text-center relative z-10 border border-white/50">
        
        {/* Logo area */}
        <div className="mb-6 flex items-center justify-center">
          <img src="/large_logo.png" alt="PlanBro Logo" className="w-48 h-auto object-contain" />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">Welcome Back</h1>
        <p className="text-slate-500 text-sm mb-10 px-4 leading-relaxed font-medium">
          To ensure the continued availability and optimal performance of our services, we kindly require users to log in. This measure helps us manage our limited system resources effectively and prevents potential misuse. We sincerely appreciate your understanding and cooperation.
        </p>

        {/* Google Auth Button Container */}
        <div className="w-full flex justify-center h-[44px] mb-8">
          <div ref={googleButtonRef}></div>
        </div>
        
        <p className="text-center text-slate-400 text-xs leading-relaxed">
          By signing in, you agree to our <br/>
          <a href="#" className="text-indigo-500 hover:text-indigo-600 font-medium">Terms of Service</a> & <a href="#" className="text-indigo-500 hover:text-indigo-600 font-medium">Privacy Policy</a>
        </p>
      </div>
      
      </div>
    </div>
  );
}

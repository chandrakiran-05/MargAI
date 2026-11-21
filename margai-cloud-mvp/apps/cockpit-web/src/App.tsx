import React, { useState, useEffect } from 'react';
import { Smartphone, LayoutDashboard, Car, Layers } from 'lucide-react';
import { PhoneNode } from './pages/PhoneNode.js';
import { InfotainmentHUD } from './pages/InfotainmentHUD.js';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<'launcher' | 'phone' | 'infotainment'>('infotainment');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    if (params.get('mode') === 'phone' || path === '/phone') {
      setCurrentRoute('phone');
    } else if (params.get('mode') === 'infotainment' || path === '/infotainment') {
      setCurrentRoute('infotainment');
    }
  }, []);

  return (
    <div className="w-full h-screen flex flex-col bg-[#0d0e10] text-slate-100 font-sans overflow-hidden">
      {/* Top Universal App Switcher Ribbon */}
      <div className="h-10 bg-black/90 border-b border-white/10 px-4 flex items-center justify-between text-xs font-mono z-40">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white">Marg<span className="text-[#4285F4]">AI</span></span>
          <span className="text-[10px] text-slate-400 bg-white/10 px-1.5 py-0.5 rounded">Buildathon 2026</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setCurrentRoute('infotainment')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${
              currentRoute === 'infotainment'
                ? 'bg-[#4285F4] text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>In-Car Infotainment</span>
          </button>

          <button
            onClick={() => setCurrentRoute('phone')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${
              currentRoute === 'phone'
                ? 'bg-[#4285F4] text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Smartphone Cam</span>
          </button>
        </div>

        <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Cloud Run Relay Online</span>
        </div>
      </div>

      {/* Main View Router */}
      <div className="flex-1 w-full h-[calc(100vh-40px)] overflow-hidden">
        {currentRoute === 'phone' && <PhoneNode />}
        {currentRoute === 'infotainment' && <InfotainmentHUD />}
      </div>
    </div>
  );
};

export default App;

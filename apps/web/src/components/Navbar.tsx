import React from 'react';
import { SUPPORTED_LANGUAGES } from '@margai/localization';
import {
  ShieldAlert,
  Car,
  FileCheck2,
  Cpu,
  Globe2,
  Sparkles,
  Radio,
} from 'lucide-react';

export type TabType = 'public' | 'driver' | 'civic' | 'google-stack';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  isBackendConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  selectedLanguage,
  onSelectLanguage,
  isBackendConnected,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Buildathon Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectTab('public')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                  MargAI
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  मर्ग · Road Safety
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-800 text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-medium text-slate-300">Google Startup Buildathon 2026</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-sm">
          <button
            onClick={() => onSelectTab('public')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentTab === 'public'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Product Showcase</span>
          </button>

          <button
            onClick={() => onSelectTab('driver')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentTab === 'driver'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Driver Companion</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
              Live
            </span>
          </button>

          <button
            onClick={() => onSelectTab('civic')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentTab === 'civic'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Civic Portal</span>
          </button>

          <button
            onClick={() => onSelectTab('google-stack')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentTab === 'google-stack'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Google Cloud Stack</span>
          </button>
        </nav>

        {/* Right side controls: Language & Health */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs">
            <Globe2 className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs font-medium"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-200">
                  {lang.nativeName} ({lang.name.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Cloud Run WebSocket Status */}
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <Radio
              className={`w-3.5 h-3.5 ${
                isBackendConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
              }`}
            />
            <span className="hidden sm:inline text-slate-300 font-mono text-[11px]">
              {isBackendConnected ? 'Cloud Run: 28ms' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

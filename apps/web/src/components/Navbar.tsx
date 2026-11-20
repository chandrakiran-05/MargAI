import React from 'react';
import { SUPPORTED_LANGUAGES } from '@margai/localization';
import {
  ShieldAlert,
  Car,
  FileCheck2,
  Cpu,
  Globe2,
  Radio,
  SlidersHorizontal,
  Presentation,
} from 'lucide-react';

export type TabType = 'command-center' | 'driver' | 'deck' | 'civic' | 'google-stack' | 'public';

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
    <header className="sticky top-0 z-50 bg-[#07090F] border-b border-[#1E293B]">
      {/* Google 4-Color Signature Gradient Strip */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 px-4 lg:px-8 py-2.5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => onSelectTab('command-center')}
          >
            {/* Google 4-Color Glyph Icon */}
            <div className="grid grid-cols-2 gap-0.5 w-7 h-7 p-1 rounded-lg bg-[#090D16] border border-[#1E293B] group-hover:border-[#4285F4] transition-all">
              <div className="bg-[#4285F4] rounded-tl-sm"></div>
              <div className="bg-[#EA4335] rounded-tr-sm"></div>
              <div className="bg-[#FBBC05] rounded-bl-sm"></div>
              <div className="bg-[#34A853] rounded-br-sm"></div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white tracking-tight">MargAI</span>
              <span className="text-[10px] font-mono text-slate-300 border border-[#1E293B] px-1.5 py-0.5 rounded bg-[#090D16]">
                Google Buildathon '26
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[#1E293B] text-[11px] font-mono text-slate-400">
            <span className="text-[#4285F4] font-bold">Google DeepMind</span>
            <span>|</span>
            <span className="text-[#EA4335] font-bold">Google Cloud</span>
          </div>
        </div>

        {/* Navigation Tabs with Google Palette Accents */}
        <nav className="flex items-center gap-1 bg-[#090D16] p-1 rounded-xl border border-[#1E293B] text-xs font-mono">
          <button
            onClick={() => onSelectTab('command-center')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'command-center'
                ? 'bg-[#4285F4]/15 text-[#4285F4] border border-[#4285F4]/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>3-Pane HUD</span>
          </button>

          <button
            onClick={() => onSelectTab('driver')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'driver'
                ? 'bg-[#FBBC05]/15 text-[#FBBC05] border border-[#FBBC05]/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Driver View</span>
          </button>

          <button
            onClick={() => onSelectTab('deck')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'deck'
                ? 'bg-[#EA4335]/15 text-[#EA4335] border border-[#EA4335]/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>Buildathon Deck</span>
          </button>

          <button
            onClick={() => onSelectTab('civic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'civic'
                ? 'bg-[#34A853]/15 text-[#34A853] border border-[#34A853]/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Civic Cases</span>
          </button>

          <button
            onClick={() => onSelectTab('google-stack')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'google-stack'
                ? 'bg-[#4285F4]/15 text-[#4285F4] border border-[#4285F4]/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Cloud Stack</span>
          </button>

          <button
            onClick={() => onSelectTab('public')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'public'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Overview</span>
          </button>
        </nav>

        {/* Right side: Language & Health */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#090D16] border border-[#1E293B] px-2.5 py-1 rounded-lg text-xs font-mono">
            <Globe2 className="w-3 h-3 text-[#4285F4]" />
            <select
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-[#090D16] text-slate-200">
                  {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[#090D16] border border-[#1E293B] font-mono text-slate-400">
            <Radio
              className={`w-3 h-3 ${isBackendConnected ? 'text-[#34A853]' : 'text-[#FBBC05]'}`}
            />
            <span className="hidden sm:inline text-[11px]">
              {isBackendConnected ? 'Relay Active' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

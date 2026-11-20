import React, { useState, useEffect } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { CommandCenter } from './components/CommandCenter';
import { DriverCompanion } from './components/DriverCompanion';
import { BuildathonDeck } from './components/BuildathonDeck';
import { CivicDashboard } from './components/CivicDashboard';
import { GoogleStackInspector } from './components/GoogleStackInspector';
import { PublicSite } from './components/PublicSite';
import { apiClient } from './services/apiClient';

export const App: React.FC = () => {
  // Default to the 3-Pane Command Center
  const [currentTab, setCurrentTab] = useState<TabType>('command-center');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('hi');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  // Poll health status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await apiClient.getHealth();
        if (res.status === 'ok') {
          setIsBackendConnected(true);
        }
      } catch (err) {
        setIsBackendConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Sticky Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        isBackendConnected={isBackendConnected}
      />

      {/* Main Content Pane */}
      <main className="flex-1">
        {currentTab === 'command-center' && (
          <CommandCenter selectedLanguage={selectedLanguage} />
        )}

        {currentTab === 'driver' && (
          <DriverCompanion selectedLanguage={selectedLanguage} />
        )}

        {currentTab === 'deck' && (
          <BuildathonDeck onLaunchHUD={() => setCurrentTab('command-center')} />
        )}

        {currentTab === 'civic' && <CivicDashboard />}

        {currentTab === 'google-stack' && <GoogleStackInspector />}

        {currentTab === 'public' && (
          <PublicSite
            onNavigateTab={setCurrentTab}
            selectedLanguage={selectedLanguage}
          />
        )}
      </main>

      {/* Sleek Command Center Footer with Google 4-Color Branding */}
      <footer className="border-t border-[#1E293B] bg-[#07090F] py-4 px-4 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
              <div className="bg-[#4285F4] rounded-tl-sm"></div>
              <div className="bg-[#EA4335] rounded-tr-sm"></div>
              <div className="bg-[#FBBC05] rounded-bl-sm"></div>
              <div className="bg-[#34A853] rounded-br-sm"></div>
            </div>
            <span className="font-extrabold text-white tracking-wide">MargAI</span>
            <span className="text-slate-400 font-mono text-[11px]">
              — Automotive Command Center HUD & Civic Intelligence
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
            <span className="text-[#34A853]">✓ Relay Online</span>
            <span>·</span>
            <span className="text-[#4285F4]">Google DeepMind</span>
            <span>·</span>
            <span className="text-[#EA4335]">Google Cloud</span>
            <span>·</span>
            <span>Startup Buildathon India 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

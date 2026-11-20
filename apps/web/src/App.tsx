import React, { useState, useEffect } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { PublicSite } from './components/PublicSite';
import { DriverCompanion } from './components/DriverCompanion';
import { CivicDashboard } from './components/CivicDashboard';
import { GoogleStackInspector } from './components/GoogleStackInspector';
import { apiClient } from './services/apiClient';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('public');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
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
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
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
        {currentTab === 'public' && (
          <PublicSite
            onNavigateTab={setCurrentTab}
            selectedLanguage={selectedLanguage}
          />
        )}

        {currentTab === 'driver' && (
          <DriverCompanion selectedLanguage={selectedLanguage} />
        )}

        {currentTab === 'civic' && <CivicDashboard />}

        {currentTab === 'google-stack' && <GoogleStackInspector />}
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070A12] py-8 px-4 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">MargAI</span>
            <span>— Smartphone-First Road Safety & Civic Intelligence</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 font-mono">
            <span>Google Startup Buildathon India 2026</span>
            <span>·</span>
            <span>Bengaluru Grand Finale (2 Dec)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

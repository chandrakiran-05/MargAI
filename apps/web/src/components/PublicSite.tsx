import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Cpu,
  Layers,
  MapPin,
  ArrowRight,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Compass,
} from 'lucide-react';
import { TabType } from './Navbar';
import { audioSynthesizer } from '@margai/localization';

interface PublicSiteProps {
  onNavigateTab: (tab: TabType) => void;
  selectedLanguage: string;
}

export const PublicSite: React.FC<PublicSiteProps> = ({
  onNavigateTab,
  selectedLanguage,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentScene, setCurrentScene] = useState(0);

  const scenes = [
    {
      time: '0 - 5s',
      title: '1. On-Device Edge Perception',
      subtitle: 'LiteRT quantized model detects Class D40 pothole on Bangalore Outer Ring Road.',
      leadState: 'D40 Detection (0.94 conf, 7.8cm depth)',
      relayState: 'Observation queued for Cloud Run ingestion',
      trailingState: 'Approaching corridor at 54 km/h',
      visualBadge: 'LiteRT-v1.4 FP16',
    },
    {
      time: '5 - 10s',
      title: '2. Low-Latency WebSocket Relay',
      subtitle: 'Spatially clustered in Cloud Firestore and broadcast to approaching vehicles within 28ms.',
      leadState: 'Lead vehicle passes hazard',
      relayState: 'Relayed to corridor subscribers',
      trailingState: 'Matching corridor edge & direction',
      visualBadge: 'Cloud Run + Firestore',
    },
    {
      time: '10 - 15s',
      title: '3. Trailing Driver Audio Alert',
      subtitle: 'Trailing vehicle receives alert with graduated acoustic tone in selected regional language.',
      leadState: 'Trip continuing',
      relayState: '28ms delivery confirmed',
      trailingState: 'Alert: Pothole in 30m, slow down',
      visualBadge: 'In-Cabin Audio Ducking',
    },
    {
      time: '15 - 20s',
      title: '4. Multi-Hazard Intelligence',
      subtitle: 'Stray cattle crossing, pedestrian collision risk, flyover sharp turns, and winter fog detection.',
      leadState: 'TTC path-conflict evaluated',
      relayState: 'Corridor synchronization',
      trailingState: 'Advisory speed calculated for curve',
      visualBadge: 'Deterministic Risk Engine',
    },
    {
      time: '20 - 25s',
      title: '5. Municipal Maintenance Dispatch',
      subtitle: 'Observations consolidated into a statutory road defect notice for BBMP / NHAI.',
      leadState: 'Hazard passed, cleared locally',
      relayState: 'Corroboration logged in audit trail',
      trailingState: 'Ticket: BBMP-RD-666762',
      visualBadge: 'IRC:SP:84-2019 Notice',
    },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentScene((prev) => (prev + 1) % scenes.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleTestAudio = () => {
    audioSynthesizer.playRiskChime('urgent');
    if (selectedLanguage === 'hi') {
      audioSynthesizer.speakLocalVoicePhrase('आगे गड्ढा है, धीमे चलें।', 'hi');
    } else if (selectedLanguage === 'kn') {
      audioSynthesizer.speakLocalVoicePhrase('ಮುಂದೆ ಗುಂಡಿ ಇದೆ, ನಿಧಾನಿಸಿ.', 'kn');
    } else {
      audioSynthesizer.speakLocalVoicePhrase('Caution: Pothole ahead, slow down.', 'en');
    }
  };

  return (
    <div className="min-h-screen pb-16 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Buildathon Bar */}
      <div className="bg-[#0D1322] border-b border-[#1E293B] px-4 py-2 text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>MargAI System Architecture · Google Startup Buildathon India 2026</span>
          <span className="text-cyan-400">Bangalore Grand Finale (2 Dec 2026)</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 pt-10 pb-12">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-mono mb-4">
            <span>Smartphone-First Active Road Safety & Civic Telematics</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
            Collaborative Road Hazard Detection & Relay
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 max-w-2xl mx-auto">
            Detects potholes, road obstacles, and sharp curves on-device using Google LiteRT,
            distributes warnings to approaching corridor vehicles in under 50ms via Google Cloud Run,
            and prepares statutory road repair notices for municipal authorities.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigateTab('command-center')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono transition-all"
            >
              <span>Launch 3-Pane HUD</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigateTab('civic')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0D1322] hover:bg-slate-800 text-slate-200 border border-[#1E293B] font-bold text-xs font-mono transition-all"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Civic Registry</span>
            </button>

            <button
              onClick={handleTestAudio}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#090D16] hover:bg-[#101626] text-slate-300 border border-[#1E293B] text-xs font-mono transition-all"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test Audio Tone</span>
            </button>
          </div>
        </div>

        {/* 16:9 Sequence Viewer */}
        <div className="relative rounded-2xl overflow-hidden border border-[#1E293B] bg-[#090D16] shadow-xl">
          <div className="flex items-center justify-between px-5 py-3 bg-[#0D1322] border-b border-[#1E293B] text-xs font-mono">
            <div className="flex items-center gap-2.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Sequence Simulation · Corridor: Bangalore ORR</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#090D16] border border-[#1E293B] text-cyan-400 text-[11px]">
                {scenes[currentScene].visualBadge}
              </span>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded bg-slate-800 text-slate-200"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>

              <button
                onClick={() => setCurrentScene(0)}
                className="p-1.5 rounded bg-slate-800 text-slate-200"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="relative aspect-video max-h-[460px] w-full bg-[#05070E] p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono text-cyan-400">
                  Step {currentScene + 1} of {scenes.length} · {scenes[currentScene].time}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                  {scenes[currentScene].title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                  {scenes[currentScene].subtitle}
                </p>
              </div>

              <div className="flex gap-1.5 self-end sm:self-auto">
                {scenes.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentScene(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentScene ? 'w-6 bg-cyan-400' : 'w-2 bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Telemetry Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-auto py-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#090D16] border border-[#1E293B]">
                <div className="text-[10px] text-slate-400 uppercase mb-1">Lead Vehicle (KA-03)</div>
                <div className="text-white font-bold">{scenes[currentScene].leadState}</div>
                <div className="text-[10px] text-slate-500 mt-1">12.9372° N, 77.6953° E</div>
              </div>

              <div className="p-3 rounded-xl bg-[#090D16] border border-[#1E293B]">
                <div className="text-[10px] text-slate-400 uppercase mb-1">Cloud Run Relay</div>
                <div className="text-cyan-300 font-bold">{scenes[currentScene].relayState}</div>
                <div className="text-[10px] text-slate-500 mt-1">Measured: 28ms Fanout</div>
              </div>

              <div className="p-3 rounded-xl bg-[#090D16] border border-[#1E293B]">
                <div className="text-[10px] text-slate-400 uppercase mb-1">Trailing Vehicle (KA-05)</div>
                <div className="text-rose-300 font-bold">{scenes[currentScene].trailingState}</div>
                <div className="text-[10px] text-slate-500 mt-1">Along-route: 38m Ahead</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-[#1E293B] pt-2">
              <span>Deterministic Alert Policy Engine (Sub-10ms Decision)</span>
              <span>WGS84 Geodesic Coordinates</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-10 border-t border-[#1E293B]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-5 rounded-xl bg-[#0D1322] border border-[#1E293B]">
            <div className="text-cyan-400 font-bold text-sm mb-1.5">01 · Road Defect Perception</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Class D40 pothole detection using on-device LiteRT models. Spatial clustering combines multi-vehicle passes to confirm defects without double-counting frames.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0D1322] border border-[#1E293B]">
            <div className="text-cyan-400 font-bold text-sm mb-1.5">02 · Directional Corridor Relevance</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Along-track projection and 3-point Menger curvature analysis. Automatically suppresses opposite-carriageway warnings on divided flyovers.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0D1322] border border-[#1E293B]">
            <div className="text-cyan-400 font-bold text-sm mb-1.5">03 · Civic Maintenance Dispatch</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Formats corroborated road defect records into statutory maintenance notices adhering to IRC:SP:84-2019 standards for BBMP and NHAI engineers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

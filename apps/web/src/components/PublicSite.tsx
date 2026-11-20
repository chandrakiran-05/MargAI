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
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Compass,
  Trophy,
  ExternalLink,
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
      title: '1. On-Device Edge Perception (Lead Vehicle)',
      subtitle: 'Google LiteRT vision model detects severe Class D40 pothole on Bangalore Outer Ring Road.',
      leadState: 'Detecting: Pothole #D40 (94% conf, 7.8cm depth)',
      relayState: 'Observation queued for Google Cloud Run ingestion',
      trailingState: 'Approaching corridor at 54 km/h (Normal)',
      visualBadge: 'LiteRT Edge Perception',
      badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
    },
    {
      time: '5 - 10s',
      title: '2. Low-Latency Cloud Run WebSocket Relay',
      subtitle: 'Spatially clustered in Cloud Firestore and broadcast to approaching vehicles within 28ms.',
      leadState: 'Vehicle KA-03-8821 safely passes hazard',
      relayState: 'Broadcasting to 4 vehicles on ORR Southbound',
      trailingState: 'Matching corridor edge & direction: Alert Armed',
      visualBadge: 'Google Cloud Run + Firestore',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    },
    {
      time: '10 - 15s',
      title: '3. Trailing Driver Regional Audio Warning',
      subtitle: 'Trailing vehicle infotainment receives urgent alert in local language with graduated acoustic tone.',
      leadState: 'Continuing on trip',
      relayState: 'Sub-50ms delivery confirmed (Zero cellular lag)',
      trailingState: 'URGENT ALERT: "आगे गड्ढा है, धीमे चलें" / "ಮುಂದೆ ಗುಂಡಿ ಇದೆ"',
      visualBadge: 'In-Cabin Audio Ducking',
      badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    },
    {
      time: '15 - 20s',
      title: '4. Expanded Multi-Hazard Intelligence',
      subtitle: 'Stray cattle crossing, pedestrian collision risk, flyover sharp turns, and winter fog detection.',
      leadState: 'TTC Engine: Path-conflict evaluated in real time',
      relayState: 'Multi-hazard corridor awareness synchronized',
      trailingState: 'Advisory speed calculated for upcoming sharp curve',
      visualBadge: 'Deterministic Risk Engine',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    },
    {
      time: '20 - 25s',
      title: '5. Google Gemini Grounded Civic Dispatch',
      subtitle: 'Observations automatically consolidated into a statutory road defect notice for BBMP / NHAI.',
      leadState: 'Driver passes hazard; cleared locally from queue',
      relayState: 'Corroboration logged in municipal audit trail',
      trailingState: 'Grievance ticket dispatched: BBMP-RD-2026-891234',
      visualBadge: 'Google Gemini 2.5 Flash',
      badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
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
      audioSynthesizer.speakLocalVoicePhrase('Caution: Deep pothole ahead, slow down.', 'en');
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Official Buildathon Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-[#07090F] border-b border-white/[0.07] px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <span className="font-bold text-white tracking-wide">Google Startup Buildathon India 2026</span>
            <span className="text-slate-400 hidden md:inline">
              · Powered by Google AI, Google Cloud for Startups & Hack2skill
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
            <span>10 City Buildathons: 20–21 Nov</span>
            <span className="text-blue-400 font-bold">Grand Finale: Google Bengaluru (2 Dec)</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 pt-12 pb-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Smartphone-First Road Safety & Civic Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
            Anticipate Road Hazards <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300 bg-clip-text text-transparent">
              Before They Become Crashes
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg font-normal leading-relaxed mb-9 max-w-2xl mx-auto">
            MargAI turns everyday smartphones into collaborative road sentinels.
            Detect potholes, stray cattle, and blind curves locally on-device, warn trailing drivers within 50ms,
            and empower Indian municipal authorities with evidence-backed repair directives.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onNavigateTab('driver')}
              className="flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold shadow-xl shadow-indigo-600/25 transition-all text-sm ring-1 ring-white/20 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Launch Driver Companion</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigateTab('civic')}
              className="flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/10 font-bold transition-all text-sm backdrop-blur-xl"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Civic Authority Dashboard</span>
            </button>

            <button
              onClick={handleTestAudio}
              className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-[#090D18] hover:bg-[#101626] text-blue-400 border border-blue-500/20 font-semibold transition-all text-xs"
              title="Test Graduated Audio Chime and Local Speech"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test Audio Alert</span>
            </button>
          </div>
        </div>

        {/* 16:9 Interactive Storyboard Container */}
        <div className="relative rounded-3xl overflow-hidden border border-white/[0.09] bg-[#080C16] shadow-2xl">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#0B101D]/90 border-b border-white/[0.07] text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 font-bold text-white tracking-wider uppercase text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                Interactive Storyboard (16:9)
              </span>
              <span className="text-slate-400 hidden sm:inline font-mono">
                Corridor: Bangalore Outer Ring Road (ORR)
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border ${scenes[currentScene].badgeColor}`}>
                {scenes[currentScene].visualBadge}
              </span>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 transition-all"
                title={isPlaying ? 'Pause Demo' : 'Play Demo'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setCurrentScene(0)}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 transition-all"
                title="Reset to Scene 1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Simulation Surface */}
          <div className="relative aspect-video max-h-[520px] w-full bg-gradient-to-b from-[#060913] via-[#0A1020] to-[#050810] p-7 flex flex-col justify-between overflow-hidden">
            {/* Subtle Aura */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3B82F6_1px,transparent_1px)] [background-size:24px_24px]"></div>

            {/* Top Scene Progress & Title */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-blue-400 font-bold uppercase tracking-wider">
                  Scene {currentScene + 1} of {scenes.length} · {scenes[currentScene].time}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                  {scenes[currentScene].title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
                  {scenes[currentScene].subtitle}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex gap-2 self-end sm:self-auto">
                {scenes.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentScene(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentScene
                        ? 'w-9 bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]'
                        : 'w-2.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Live Telemetry Display Cards */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 my-auto py-4">
              {/* Card 1: Lead Vehicle */}
              <div className="p-4 rounded-2xl bg-[#090D18]/90 border border-white/[0.08] backdrop-blur-xl shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Lead Vehicle (KA-03)
                  </span>
                  <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]"></span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="truncate">{scenes[currentScene].leadState}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  GPS: 12.9372° N, 77.6953° E · 54 km/h
                </div>
              </div>

              {/* Card 2: Google Cloud Run Relay */}
              <div className="p-4 rounded-2xl bg-[#090D18]/90 border border-white/[0.08] backdrop-blur-xl shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Google Cloud Run WebSocket Relay
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{scenes[currentScene].relayState}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  Latency: 28ms · Cluster Radius: 15m
                </div>
              </div>

              {/* Card 3: Trailing Vehicle */}
              <div
                className={`p-4 rounded-2xl border backdrop-blur-xl transition-all shadow-lg ${
                  currentScene === 2
                    ? 'bg-[#1E080C]/90 border-rose-500 alert-luxury-urgent'
                    : 'bg-[#090D18]/90 border-white/[0.08]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Trailing Vehicle (KA-05)
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      currentScene === 2
                        ? 'bg-rose-400 animate-ping shadow-[0_0_8px_rgba(244,63,94,1)]'
                        : 'bg-slate-500'
                    }`}
                  ></span>
                </div>
                <div
                  className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${
                    currentScene === 2 ? 'text-rose-200' : 'text-slate-200'
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 flex-shrink-0 ${
                      currentScene === 2 ? 'text-rose-400 animate-bounce' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{scenes[currentScene].trailingState}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  Distance: 38m · TTC: 2.5s · Car Audio Ducked
                </div>
              </div>
            </div>

            {/* Bottom Status Strip */}
            <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/[0.06] font-mono">
              <span className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Deterministic Risk Engine: Evaluated on-device in 8ms</span>
              </span>
              <span className="text-slate-500 hidden sm:inline">
                WGS84 High-Precision Mathematics
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Breakdown Grid */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16 border-t border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
            Designed for Indian Road Realities
          </h2>
          <p className="text-slate-400 text-sm">
            Tackling unexpected road craters, stray cattle, unscientific speed breakers, and dense winter smog.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-7 rounded-3xl bg-[#090D18]/70 border border-white/[0.08] hover:border-blue-500/40 transition-all shadow-xl backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5 ring-1 ring-blue-500/20 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Pothole & Defect Detection</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
              Detects Class D40 potholes and road fissures. Distinguishes harmless road patches from lethal suspension-breaking craters.
            </p>
            <div className="text-[11px] text-blue-400 font-mono">
              Model: LiteRT Quantized MobileNet
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-7 rounded-3xl bg-[#090D18]/70 border border-white/[0.08] hover:border-amber-500/40 transition-all shadow-xl backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5 ring-1 ring-amber-500/20 group-hover:scale-110 transition-transform">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Stray Cattle & Pedestrians</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
              Evaluates Time-to-Collision (TTC) and lateral encroachment. Alerts for crossing cows while suppressing harmless sidewalk foot traffic.
            </p>
            <div className="text-[11px] text-amber-400 font-mono">
              Vector Trajectory & Cross-Track Logic
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-7 rounded-3xl bg-[#090D18]/70 border border-white/[0.08] hover:border-purple-500/40 transition-all shadow-xl backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-5 ring-1 ring-purple-500/20 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Sharp Curve Anticipation</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
              Calculates 3-point Menger curvature radius from Google Maps route polylines. Warns drivers before blind flyover descents.
            </p>
            <div className="text-[11px] text-purple-400 font-mono">
              IRC Safe Speed Formula Calculation
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-7 rounded-3xl bg-[#090D18]/70 border border-white/[0.08] hover:border-indigo-500/40 transition-all shadow-xl backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5 ring-1 ring-indigo-500/20 group-hover:scale-110 transition-transform">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Fog & Low Visibility</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
              Monitors visual atmospheric transmission during North Indian winter smog. Emits speed reduction advisories before entering low-visibility corridors.
            </p>
            <div className="text-[11px] text-indigo-400 font-mono">
              AutoWeather Density Classifier
            </div>
          </div>

          {/* Card 5 */}
          <div className="p-7 rounded-3xl bg-[#090D18]/70 border border-white/[0.08] hover:border-sky-500/40 transition-all shadow-xl backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-5 ring-1 ring-sky-500/20 group-hover:scale-110 transition-transform">
              <Volume2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Regional Audio Warnings</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
              Multi-lingual voice alerts across Hindi, Kannada, Tamil, Telugu, Marathi, and Bengali. Graduated acoustic chimes prevent driver distraction.
            </p>
            <div className="text-[11px] text-sky-400 font-mono">
              On-Device Web Audio Chimes
            </div>
          </div>

          {/* Card 6 */}
          <div className="p-7 rounded-3xl bg-[#090D18]/70 border border-white/[0.08] hover:border-rose-500/40 transition-all shadow-xl backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-5 ring-1 ring-rose-500/20 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Gemini Civic Intelligence</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
              Consolidates multi-vehicle evidence into formal statutory notices for municipal authorities (BBMP, NHAI) citing IRC:SP:84 with a 48h SLA.
            </p>
            <div className="text-[11px] text-rose-400 font-mono">
              Google Gemini 2.5 Flash Integration
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

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
      visualBadge: 'LiteRT On-Device Vision',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    },
    {
      time: '5 - 10s',
      title: '2. Low-Latency Cloud Run WebSocket Relay',
      subtitle: 'Spatially clustered in Cloud Firestore and broadcast to approaching vehicles within 28ms.',
      leadState: 'Vehicle KA-03-8821 safely passes hazard',
      relayState: 'Broadcasting to 4 vehicles on ORR Southbound',
      trailingState: 'Matching corridor edge & direction: Alert Armed',
      visualBadge: 'Google Cloud Run + Firestore',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    },
    {
      time: '10 - 15s',
      title: '3. Trailing Driver Regional Audio Warning',
      subtitle: 'Trailing vehicle infotainment receives urgent alert in local language with graduated acoustic tone.',
      leadState: 'Continuing on trip',
      relayState: 'Sub-50ms delivery confirmed (Zero cellular lag)',
      trailingState: 'URGENT ALERT: "आगे गड्ढा है, धीमे चलें" / "ಮುಂದೆ ಗುಂಡಿ ಇದೆ"',
      visualBadge: 'Automotive Audio Ducking',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
    },
    {
      time: '15 - 20s',
      title: '4. Expanded Multi-Hazard Intelligence',
      subtitle: 'Stray cattle crossing, pedestrian collision risk, flyover sharp turns, and winter fog detection.',
      leadState: 'TTC Engine: Path-conflict evaluated in real time',
      relayState: 'Multi-hazard corridor awareness synchronized',
      trailingState: 'Advisory speed calculated for upcoming sharp curve',
      visualBadge: 'Deterministic Risk Engine',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    },
    {
      time: '20 - 25s',
      title: '5. Google Gemini Grounded Civic Dispatch',
      subtitle: 'Observations automatically consolidated into a statutory road defect notice for BBMP / NHAI.',
      leadState: 'Driver passes hazard; cleared locally from queue',
      relayState: 'Corroboration logged in municipal audit trail',
      trailingState: 'Grievance ticket dispatched: BBMP-RD-2026-891234',
      visualBadge: 'Google Gemini 2.5 Flash',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
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
      <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border-b border-blue-500/30 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-white">Google Startup Buildathon India 2026</span>
            <span className="text-slate-400 hidden md:inline">
              · Powered by Google AI, Google Cloud for Startups & Hack2skill
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <span>City Buildathons: 20–21 Nov (10 Cities)</span>
            <span className="text-blue-400 font-medium">Grand Finale: Google Bengaluru (2 Dec)</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 pt-10 pb-16">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smartphone-First Road Safety & Civic Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Anticipate Road Hazards <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
              Before They Become Crashes
            </span>
          </h1>

          <p className="text-slate-300 text-lg sm:text-xl font-normal leading-relaxed mb-8">
            MargAI turns everyday smartphones into real-time collaborative road sentinels.
            Detect potholes, stray cattle, and blind curves locally, warn trailing drivers within 50ms,
            and empower Indian municipal authorities with evidence-backed road repair directives.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onNavigateTab('driver')}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all text-sm"
            >
              <span>Open Driver Companion</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigateTab('civic')}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-semibold transition-all text-sm"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Civic Authority Dashboard</span>
            </button>

            <button
              onClick={handleTestAudio}
              className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-900/60 font-medium transition-all text-xs"
              title="Test Graduated Audio Chime and Local Speech"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test Audio Alert</span>
            </button>
          </div>
        </div>

        {/* 16:9 Interactive Product Demonstration Storyboard */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0F1626] shadow-2xl">
          {/* Video Header Controls */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                Interactive Storyboard Demo (16:9)
              </span>
              <span className="text-slate-400 hidden sm:inline">
                Corridor: Bangalore Outer Ring Road (ORR)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-mono text-[11px] border ${scenes[currentScene].badgeColor}`}>
                {scenes[currentScene].visualBadge}
              </span>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                title={isPlaying ? 'Pause Demo' : 'Play Demo'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setCurrentScene(0)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                title="Reset to Scene 1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas Simulation Surface */}
          <div className="relative aspect-video max-h-[500px] w-full bg-gradient-to-b from-[#090D16] via-[#10182A] to-[#0A0E1A] p-6 flex flex-col justify-between overflow-hidden">
            {/* Visual Road Corridor Grid Effect */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#3B82F6_1px,transparent_1px)] [background-size:24px_24px]"></div>

            {/* Top Scene Tracker */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono text-blue-400 font-semibold">
                  Scene {currentScene + 1} of {scenes.length} · {scenes[currentScene].time}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  {scenes[currentScene].title}
                </h3>
                <p className="text-sm text-slate-300 max-w-2xl mt-0.5">
                  {scenes[currentScene].subtitle}
                </p>
              </div>

              {/* Timeline pills */}
              <div className="flex gap-1.5 self-end sm:self-auto">
                {scenes.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentScene(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentScene ? 'w-8 bg-blue-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Interactive Cause-and-Effect Live Telemetry Display */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 my-auto py-4">
              {/* Card 1: Lead Vehicle */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Lead Vehicle (KA-03)
                  </span>
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                </div>
                <div className="text-sm font-medium text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>{scenes[currentScene].leadState}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  GPS: 12.9372° N, 77.6953° E · 54 km/h
                </div>
              </div>

              {/* Card 2: Google Cloud Run Relay */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Google Cloud Run WebSocket Relay
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
                <div className="text-sm font-medium text-emerald-300 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <span>{scenes[currentScene].relayState}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  Latency: 28ms · Cluster Radius: 15m
                </div>
              </div>

              {/* Card 3: Trailing Vehicle */}
              <div className={`p-4 rounded-xl border backdrop-blur-md transition-all ${
                currentScene === 2
                  ? 'bg-red-950/60 border-red-500/80 alert-urgent-glow'
                  : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Trailing Vehicle (KA-05)
                  </span>
                  <span className={`w-2 h-2 rounded-full ${currentScene === 2 ? 'bg-red-400' : 'bg-slate-500'}`}></span>
                </div>
                <div className={`text-sm font-medium flex items-center gap-2 ${
                  currentScene === 2 ? 'text-red-200 font-bold' : 'text-slate-200'
                }`}>
                  <AlertTriangle className={`w-4 h-4 ${currentScene === 2 ? 'text-red-400' : 'text-slate-400'}`} />
                  <span>{scenes[currentScene].trailingState}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  Distance: 38m · TTC: 2.5s · In-Cabin Audio Ducked
                </div>
              </div>
            </div>

            {/* Bottom Scene Indicator Bar */}
            <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Deterministic Risk Engine: Evaluated on-device in 8ms</span>
              </span>
              <span className="font-mono text-slate-400">
                WGS84 High-Precision Coordinate Math
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Breakdown Grid */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16 border-t border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">
            Designed for Indian Road Conditions
          </h2>
          <p className="text-slate-400 text-sm">
            Tackling the complex chaos of Indian roadways: sudden craters, stray cattle, unscientific speed breakers, and dense winter smog.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Pothole & Defect Detection</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Detects Class D40 potholes and structural surface fissures. Distinguishes harmless road patches from lethal suspension-breaking craters.
            </p>
            <div className="text-xs text-blue-400 font-mono">
              Model: LiteRT Quantized MobileNet
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Stray Cattle & Pedestrians</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Evaluates Time-to-Collision (TTC) and lateral encroachment. Alerts for crossing cows and pedestrians while suppressing harmless sidewalk foot traffic.
            </p>
            <div className="text-xs text-amber-400 font-mono">
              Vector Trajectory & Cross-Track Logic
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Sharp Curve Anticipation</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Calculates 3-point Menger curvature radius from Google Maps route polylines. Computes lateral acceleration and warns drivers before blind flyover turns.
            </p>
            <div className="text-xs text-emerald-400 font-mono">
              IRC Safe Speed Formula Calculation
            </div>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Fog & Low Visibility</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Monitors visual atmospheric transmission during North Indian winter smog. Emits speed reduction advisories before entering low-visibility corridors.
            </p>
            <div className="text-xs text-purple-400 font-mono">
              AutoWeather Density Classifier
            </div>
          </div>

          {/* Feature 5 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Regional Audio Warnings</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Multi-lingual voice alerts across Hindi, Kannada, Tamil, Telugu, Marathi, and Bengali. Graduated acoustic chimes prevent driver distraction and alert fatigue.
            </p>
            <div className="text-xs text-sky-400 font-mono">
              On-Device Web Audio Chimes
            </div>
          </div>

          {/* Feature 6 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Gemini Civic Intelligence</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Consolidates multi-vehicle evidence into formal statutory notices for municipal authorities (BBMP, NHAI) citing IRC:SP:84 and Municipal Acts with 48h SLA.
            </p>
            <div className="text-xs text-rose-400 font-mono">
              Google Gemini 2.5 Flash Integration
            </div>
          </div>
        </div>
      </section>

      {/* Edge vs Cloud Privacy & Architecture */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
        <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800">
          <div className="max-w-3xl">
            <h3 className="text-2xl font-bold text-white mb-3">
              Privacy-by-Design: Local Edge vs Anonymous Shared Events
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Camera video frames are processed entirely on-device and never continuously streamed to the cloud.
              Only anonymous, verified hazard coordinates and encrypted evidence clips are transmitted to Google Cloud Run
              for peer corroboration and civic maintenance.
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-mono">
              <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/30">
                ✓ No Facial Data Captured
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/30">
                ✓ Anonymized Coordinate Offsets
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/30">
                ✓ Encrypted Cloud Storage Buckets
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

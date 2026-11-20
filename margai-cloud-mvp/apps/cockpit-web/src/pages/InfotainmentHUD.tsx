import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Compass,
  Radio,
  Smartphone,
  Navigation,
  Music,
  Fan,
  Thermometer,
  ShieldAlert,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
} from 'lucide-react';
import { DriverAlert, HazardType, RiskLevel, LocalizedMessages } from '@margai/contracts';
import { alertAudio } from '../audio/alertAudio.js';

interface ActiveHazard {
  id: string;
  type: HazardType;
  riskLevel: RiskLevel;
  distanceM: number;
  laneOffsetM: number;
  nReports: number;
  localized: LocalizedMessages;
}

export const InfotainmentHUD: React.FC = () => {
  // Tesla MCU State
  const [vehicleSpeed, setVehicleSpeed] = useState<number>(54); // km/h
  const [roadTiltDeg, setRoadTiltDeg] = useState<number>(0);
  const [isBumpShockActive, setIsBumpShockActive] = useState<boolean>(false);
  const [clockStr, setClockStr] = useState<string>('12:45 PM');
  const [currentLang, setCurrentLang] = useState<'en' | 'hi' | 'ta' | 'te' | 'kn'>('en');
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);

  // Phone Cam PiP & Telemetry
  const [phoneConnected, setPhoneConnected] = useState<boolean>(true);
  const [phoneFps, setPhoneFps] = useState<number>(24);
  const [phoneFrameB64, setPhoneFrameB64] = useState<string | null>(null);

  // Active Hazard Queue
  const [hazards, setHazards] = useState<ActiveHazard[]>([
    {
      id: 'hz_init_1',
      type: 'pothole',
      riskLevel: 'caution',
      distanceM: 180,
      laneOffsetM: 0.0,
      nReports: 3,
      localized: {
        en: 'Pothole ahead in lane. Slow down.',
        hi: 'आगे गड्ढा है। गति धीमी करें।',
        ta: 'முன்னே குழி உள்ளது. வேகத்தைக் குறையுங்கள்.',
        te: 'ముందు గుంత ఉంది. వేగం తగ్గించండి.',
        kn: 'ಮುಂದೆ ಗುಂಡಿ ಇದೆ. ವೇಗ ಕಡಿಮೆ ಮಾಡಿ.',
      },
    },
    {
      id: 'hz_init_2',
      type: 'cattle',
      riskLevel: 'information',
      distanceM: 290,
      laneOffsetM: 2.1,
      nReports: 1,
      localized: {
        en: 'Stray cattle at roadside.',
        hi: 'सड़क किनारे मवेशी हैं।',
        ta: 'சாலையோரத்தில் கால்நடைகள்.',
        te: 'రోడ్డు పక్కన పశువులు ఉన్నాయి.',
        kn: 'ರಸ್ತೆ ಬದಿಯಲ್ಲಿ ದನಗಳಿವೆ.',
      },
    },
  ]);

  // Media Player & HVAC Dummy State for Tesla MCU realism
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [driverTemp, setDriverTemp] = useState<number>(21.5);
  const [passengerTemp, setPassengerTemp] = useState<number>(21.5);

  const wsRef = useRef<WebSocket | null>(null);
  const lastLoopTimeRef = useRef<number>(performance.now());
  const mapProgressRef = useRef<number>(0);

  // 1. Live Time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. WebSocket Connection to Cloud Run Relay
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket;

    const connectWs = () => {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setPhoneConnected(true);
        ws.send(
          JSON.stringify({
            action: 'register',
            role: 'infotainment_hud',
            topics: ['alerts', 'telemetry'],
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);

          // A. Real-time Telemetry (Speed, Geometry, Shockwave)
          if (envelope.topic === 'telemetry.heartbeat') {
            const tel = envelope.payload;
            if (tel.speedKmh !== undefined && tel.speedKmh > 0) {
              setVehicleSpeed(Math.round(tel.speedKmh));
            }
            if (tel.roadCurve) {
              if (tel.roadCurve === 'SHARP_LEFT' || tel.roadCurve === 'HAIRPIN_BEND') {
                setRoadTiltDeg(-5);
              } else if (tel.roadCurve === 'SHARP_RIGHT') {
                setRoadTiltDeg(5);
              } else {
                setRoadTiltDeg(0);
              }
            }
            if (tel.zAccelG && tel.zAccelG > 1.8 && !isBumpShockActive) {
              triggerBumpCockpit(tel.zAccelG);
            }
            if (tel.frameB64) {
              setPhoneFrameB64(tel.frameB64);
            }
          }

          // B. Real-time Alert Broadcast
          if (envelope.topic === 'alert.broadcast') {
            const alert: DriverAlert = envelope.payload;
            ingestDriverAlert(alert);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setPhoneConnected(false);
        setTimeout(connectWs, 3000);
      };
    };

    connectWs();
    return () => {
      if (ws) ws.close();
    };
  }, [isBumpShockActive]);

  // 3. Ingest Incoming Driver Alert
  const ingestDriverAlert = (alert: DriverAlert) => {
    setHazards((prev) => {
      const exists = prev.find((h) => h.type === alert.hazardType && h.distanceM > 40);
      if (exists) {
        return prev.map((h) => (h.id === exists.id ? { ...h, nReports: h.nReports + 1 } : h));
      }
      return [
        {
          id: alert.alertId,
          type: alert.hazardType,
          riskLevel: alert.riskLevel,
          distanceM: alert.distanceM || 220,
          laneOffsetM: alert.targetLane === 'current_lane' ? 0.0 : 1.8,
          nReports: 1,
          localized: alert.localizedMessages,
        },
        ...prev,
      ];
    });

    // Sound alert chime & speak localized phrase
    if (!muted) {
      alertAudio.playChime(alert.riskLevel);
      alertAudio.speakAlert(alert.localizedMessages, currentLang);
    }
  };

  // 4. Physical Cockpit Bounce on Pothole Shockwave
  const triggerBumpCockpit = (gVal: number) => {
    setIsBumpShockActive(true);
    if (!muted) alertAudio.playChime('caution');

    setTimeout(() => {
      setIsBumpShockActive(false);
    }, 1200);
  };

  // 5. Real-Time Distance Countdown Animation Loop
  useEffect(() => {
    let animId: number;

    const loop = (timestamp: number) => {
      const dt = Math.min(0.1, (timestamp - lastLoopTimeRef.current) / 1000);
      lastLoopTimeRef.current = timestamp;

      const speedMps = vehicleSpeed / 3.6;
      mapProgressRef.current = (mapProgressRef.current + speedMps * dt * 0.1) % 1000;

      // Decrement hazard distance based on real vehicle speed
      setHazards((prev) =>
        prev
          .map((h) => ({
            ...h,
            distanceM: Math.max(0, h.distanceM - speedMps * dt),
          }))
          .filter((h) => h.distanceM > 4)
      );

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [vehicleSpeed]);

  // Mathematical center dashed lane flow duration
  const dashFlowDuration = `${(17.5 / Math.max(vehicleSpeed / 3.6, 0.5)).toFixed(2)}s`;

  // Top critical hazard
  const topHazard = hazards.slice().sort((a, b) => {
    const rank: Record<RiskLevel, number> = { urgent: 3, caution: 2, information: 1 };
    return rank[b.riskLevel] - rank[a.riskLevel] || a.distanceM - b.distanceM;
  })[0];

  return (
    <div
      className={`w-full h-screen min-h-[640px] flex flex-col bg-[#0d0e10] text-slate-100 font-sans select-none overflow-hidden transition-transform duration-100 ${
        isBumpShockActive ? 'translate-y-2.5' : ''
      }`}
    >
      {/* 1. TOP TESLA MCU STATUS BAR */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-white/10 bg-[#0d0e10] text-xs font-mono z-30">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">{clockStr}</span>
          <span className="text-slate-400">24°C</span>
          <div className="flex items-center gap-1 text-slate-400">
            <span className="font-semibold text-white">Marg</span>
            <span className="font-semibold text-[#4285F4]">AI</span>
            <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded">FSD v12+</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Smartphone Link Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              phoneConnected
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>{phoneConnected ? `Phone Node (${phoneFps} FPS)` : 'Connecting Phone'}</span>
          </div>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-medium"
            >
              {{ en: 'English', hi: 'हिन्दी', ta: 'தமிழ்', te: 'తెలుగు', kn: 'ಕನ್ನಡ' }[currentLang]} ▾
            </button>
            {langMenuOpen && (
              <div className="absolute right-0 top-7 z-50 bg-[#1a1b1f] border border-white/10 rounded-xl shadow-2xl py-1 text-xs min-w-[110px]">
                {(['en', 'hi', 'ta', 'te', 'kn'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setCurrentLang(l);
                      alertAudio.setLanguage(l);
                      setLangMenuOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 hover:bg-white/10 ${
                      currentLang === l ? 'text-[#4285F4] font-bold' : 'text-slate-300'
                    }`}
                  >
                    {{ en: 'English', hi: 'हिन्दी', ta: 'தமிழ்', te: 'తెలుగు', kn: 'ಕನ್ನಡ' }[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setMuted(!muted);
              alertAudio.setMuted(!muted);
            }}
            className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#4285F4]" />}
          </button>

          <span className="text-slate-400">82% 🔋</span>
        </div>
      </div>

      {/* 2. MAIN TESLA MCU SPLIT SCREEN: LEFT 38% FSD 3D ROAD | RIGHT 62% VECTOR MAP */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* =========================================================================
            LEFT 38%: TESLA FSD 3D PERSPECTIVE ROAD VISUALIZATION
        ========================================================================= */}
        <div className="w-[38%] relative border-r border-white/10 bg-[#0f1012] flex flex-col justify-between overflow-hidden p-3">
          {/* Top HUD: Speedometer, Gear, Speed Limit */}
          <div className="flex items-start justify-between z-20">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-light tracking-tight text-white tabular-nums">
                  {vehicleSpeed}
                </span>
                <span className="text-xs font-mono text-slate-400">KM/H</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono mt-1 text-slate-400">
                <span>P</span>
                <span>R</span>
                <span>N</span>
                <span className="text-white font-black text-sm bg-white/20 px-1 rounded">D</span>
              </div>
            </div>

            {/* Speed Limit Circle */}
            <div className="w-10 h-10 rounded-full border-2 border-[#EA4335] bg-white flex items-center justify-center text-slate-900 font-black text-sm shadow-lg">
              50
            </div>
          </div>

          {/* 3D Road Viewport SVG */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <svg
              viewBox="0 0 500 450"
              preserveAspectRatio="xMidYMax slice"
              className="w-full h-full"
            >
              <defs>
                <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#383b42" />
                  <stop offset="1" stopColor="#22242a" />
                </linearGradient>
                <linearGradient id="horizonFade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#0f1012" />
                  <stop offset="0.45" stopColor="#0f1012" stopOpacity="0.85" />
                  <stop offset="1" stopColor="#0f1012" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Road World (Tilts ±5° on Curves) */}
              <g
                style={{
                  transform: `rotate(${roadTiltDeg}deg)`,
                  transformOrigin: '250px 450px',
                  transition: 'transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1)',
                }}
              >
                {/* Asphalt Trapezoid */}
                <polygon points="175,70 325,70 480,450 20,450" fill="url(#roadGrad)" />

                {/* Shoulder Boundary Lines */}
                <line x1="175" y1="70" x2="20" y2="450" stroke="#d7dae0" strokeWidth="2.5" strokeOpacity="0.6" />
                <line x1="325" y1="70" x2="480" y2="450" stroke="#d7dae0" strokeWidth="2.5" strokeOpacity="0.6" />

                {/* Flowing Center Dashed Line */}
                <line
                  x1="250"
                  y1="70"
                  x2="250"
                  y2="450"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeOpacity="0.8"
                  strokeDasharray="22 18"
                  style={{
                    animation: `flow ${dashFlowDuration} linear infinite`,
                  }}
                />

                {/* 3D Perspective Hazards */}
                {hazards.map((h) => {
                  const s = 0.08 + 0.92 * (1 - Math.min(h.distanceM, 300) / 300);
                  const y = 70 + Math.pow(s, 1.6) * 380;
                  const x = 250 + h.laneOffsetM * 35 * s;
                  const col = h.riskLevel === 'urgent' ? '#EA4335' : h.riskLevel === 'caution' ? '#FBBC05' : '#4285F4';

                  if (h.type === 'pothole') {
                    return (
                      <g key={h.id} transform={`translate(${x},${y}) scale(${s})`}>
                        <ellipse rx="36" ry="11" fill="#000" opacity="0.7" />
                        <ellipse rx="42" ry="14" fill="none" stroke={col} strokeWidth="3" />
                        <circle cy="-28" r="10" fill={col} />
                        <text y="-24" textAnchor="middle" fontSize="13" fontWeight="900" fill="#111">
                          !
                        </text>
                      </g>
                    );
                  }

                  if (h.type === 'waterlogging') {
                    return (
                      <g key={h.id} transform={`translate(${x},${y}) scale(${s})`}>
                        <ellipse rx="85" ry="22" fill="#1e40af" opacity="0.8" />
                        <ellipse rx="75" ry="16" fill="#38bdf8" opacity="0.5" />
                        <ellipse rx="88" ry="24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="6 4" />
                        <circle cy="-34" r="10" fill="#38bdf8" />
                        <text y="-30" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0f172a">
                          🌊
                        </text>
                      </g>
                    );
                  }

                  if (h.type === 'pedestrian') {
                    return (
                      <g key={h.id} transform={`translate(${x},${y}) scale(${s * 1.15})`}>
                        <ellipse rx="22" ry="7" fill="#000" opacity="0.4" />
                        <rect x="-8" y="-55" width="16" height="32" rx="6" fill="#e6e9ee" />
                        <circle cy="-65" r="7" fill="#e6e9ee" />
                        <circle cy="-82" r="9" fill={col} />
                        <text y="-78" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#111">
                          🚶
                        </text>
                      </g>
                    );
                  }

                  if (h.type === 'cattle') {
                    return (
                      <g key={h.id} transform={`translate(${x},${y}) scale(${s * 1.1})`}>
                        <ellipse rx="28" ry="9" fill="#000" opacity="0.4" />
                        <rect x="-14" y="-36" width="28" height="20" rx="6" fill="#e6e9ee" />
                        <circle cx="-16" cy="-42" r="8" fill="#e6e9ee" />
                        <circle cy="-56" r="9" fill={col} />
                        <text y="-52" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#111">
                          🐄
                        </text>
                      </g>
                    );
                  }

                  return (
                    <g key={h.id} transform={`translate(${x},${y}) scale(${s})`}>
                      <circle r="16" fill={col} opacity="0.85" />
                      <text y="5" textAnchor="middle" fontSize="14">
                        ⚠️
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Horizon Soft Fade */}
              <rect x="0" y="0" width="500" height="180" fill="url(#horizonFade)" />

              {/* Tesla Vehicle Avatar (Bottom Center) */}
              <g transform="translate(250, 440)">
                <ellipse cx="0" cy="-6" rx="80" ry="14" fill="#000" opacity="0.6" />
                <path d="M-64 -26 Q-68 -60 -52 -64 L52 -64 Q68 -60 64 -26 Z" fill="#f3f4f6" />
                <path d="M-45 -64 L-34 -102 Q-32 -106 -24 -106 L24 -106 Q32 -106 34 -102 L45 -64 Z" fill="#2d323b" />
                <rect x="-56" y="-48" width="112" height="5" rx="2" fill="#ff3b30" />
              </g>
            </svg>
          </div>

          {/* Top Floating Glass HUD Alert Pill */}
          {topHazard && (
            <div className="z-20 mt-4 bg-slate-900/90 border border-white/20 rounded-2xl p-2.5 backdrop-blur-xl shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: topHazard.riskLevel === 'urgent' ? '#EA433530' : '#FBBC0530',
                    color: topHazard.riskLevel === 'urgent' ? '#EA4335' : '#FBBC05',
                  }}
                >
                  {topHazard.type === 'pothole' ? '🕳️' : topHazard.type === 'cattle' ? '🐄' : '⚠️'}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    {topHazard.riskLevel.toUpperCase()} · Ahead in lane
                  </p>
                  <p className="text-xs font-bold text-white leading-tight">
                    {topHazard.localized[currentLang] || topHazard.localized.en}
                  </p>
                </div>
              </div>

              <div className="text-right font-mono pr-1">
                <span className="text-xl font-light text-white">{Math.round(topHazard.distanceM)}</span>
                <span className="text-[10px] text-slate-400 ml-1">m</span>
              </div>
            </div>
          )}

          {/* Picture-in-Picture Phone Rear Camera Feed (Bottom Left) */}
          <div className="z-20 self-end w-36 aspect-video bg-black/80 rounded-xl overflow-hidden border border-white/20 shadow-2xl relative">
            {phoneFrameB64 ? (
              <img src={phoneFrameB64} alt="Phone Cam PiP" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400">
                <Smartphone className="w-4 h-4 text-[#4285F4] animate-pulse mb-1" />
                <span>Phone PiP Live</span>
              </div>
            )}
            <span className="absolute top-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[8px] font-mono text-emerald-400">
              📱 Dashcam
            </span>
          </div>
        </div>

        {/* =========================================================================
            RIGHT 62%: TESLA NAVIGATION VECTOR MAP & MEDIA/HVAC DOCK
        ========================================================================= */}
        <div className="w-[62%] relative bg-[#15171b] flex flex-col justify-between overflow-hidden">
          {/* Navigation Vector Map SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 500" preserveAspectRatio="none">
            {/* Background land */}
            <rect width="800" height="500" fill="#15171b" />

            {/* City blocks */}
            <rect x="40" y="40" width="160" height="120" rx="8" fill="#1e2126" />
            <rect x="240" y="40" width="220" height="120" rx="8" fill="#1e2126" />
            <rect x="500" y="40" width="260" height="120" rx="8" fill="#1e2126" />

            <rect x="40" y="220" width="180" height="160" rx="8" fill="#1e2126" />
            <rect x="260" y="220" width="200" height="160" rx="8" fill="#1e2126" />
            <rect x="500" y="220" width="260" height="160" rx="8" fill="#1e2126" />

            {/* Park & Water */}
            <rect x="500" y="40" width="260" height="120" rx="8" fill="#13291b" />
            <ellipse cx="620" cy="90" rx="80" ry="35" fill="#10283b" />
            <text x="620" y="94" textAnchor="middle" fontSize="11" fill="#6c97ff" opacity="0.6">
              Cubbon Lake
            </text>

            {/* Road Network Grid */}
            <path d="M0,190 H800 M0,410 H800 M210,0 V500 M480,0 V500" stroke="#2f343c" strokeWidth="18" fill="none" />
            <path d="M0,190 H800 M0,410 H800 M210,0 V500 M480,0 V500" stroke="#3d444f" strokeWidth="14" fill="none" />

            {/* Active Navigation Route (Blue Neon Polyline) */}
            <path
              d="M100,190 L480,190 L480,360 L780,360"
              stroke="#4285F4"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.95"
            />

            {/* Vehicle Location on Map */}
            <g transform="translate(320, 190) rotate(90)">
              <circle r="24" fill="#4285F4" opacity="0.25" />
              <path d="M0 -16 L10 10 L0 5 L-10 10 Z" fill="#4285F4" stroke="#fff" strokeWidth="2" />
            </g>

            {/* POI & Hazard Markers on Map */}
            <g transform="translate(480, 190)">
              <circle r="14" fill="#EA4335" />
              <text y="5" textAnchor="middle" fontSize="12">
                🕳️
              </text>
            </g>

            <g transform="translate(640, 360)">
              <circle r="14" fill="#FBBC05" />
              <text y="5" textAnchor="middle" fontSize="12">
                🐄
              </text>
            </g>
          </svg>

          {/* Top Navigation Banner */}
          <div className="z-20 m-4 max-w-md bg-slate-900/90 border border-white/20 rounded-2xl p-3.5 backdrop-blur-xl shadow-2xl flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#4285F4] flex items-center justify-center text-white">
              <Navigation className="w-6 h-6 rotate-45" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">In 280 meters</p>
              <p className="text-sm font-bold text-white">Turn right onto Outer Ring Road</p>
            </div>
            <div className="text-right border-l border-white/10 pl-3">
              <p className="text-sm font-bold text-white">14 min</p>
              <p className="text-[11px] text-slate-400">6.2 km</p>
            </div>
          </div>

          {/* Bottom Floating Media Player & HVAC Dock */}
          <div className="z-20 m-4 flex flex-col gap-2">
            {/* Spotify / Media Dock */}
            <div className="bg-slate-900/85 border border-white/10 rounded-2xl p-2.5 backdrop-blur-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white text-xs">A.R. Rahman – Jai Ho</p>
                  <p className="text-[10px] text-slate-400">Slumdog Millionaire OST</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tesla MCU HVAC Climate Bar */}
            <div className="bg-black/90 border border-white/10 rounded-2xl px-4 py-2 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-slate-400" />
                <button onClick={() => setDriverTemp(driverTemp - 0.5)} className="text-slate-400 hover:text-white">
                  -
                </button>
                <span className="font-bold text-white text-sm">{driverTemp.toFixed(1)}°C</span>
                <button onClick={() => setDriverTemp(driverTemp + 0.5)} className="text-slate-400 hover:text-white">
                  +
                </button>
              </div>

              <div className="flex items-center gap-4 text-slate-400">
                <span className="cursor-pointer hover:text-white">♨️ Front</span>
                <span className="cursor-pointer hover:text-white">💺 Left</span>
                <Fan className="w-4 h-4 text-[#4285F4]" />
                <span className="cursor-pointer hover:text-white">💺 Right</span>
                <span className="cursor-pointer hover:text-white">♨️ Rear</span>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setPassengerTemp(passengerTemp - 0.5)} className="text-slate-400 hover:text-white">
                  -
                </button>
                <span className="font-bold text-white text-sm">{passengerTemp.toFixed(1)}°C</span>
                <button onClick={() => setPassengerTemp(passengerTemp + 0.5)} className="text-slate-400 hover:text-white">
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

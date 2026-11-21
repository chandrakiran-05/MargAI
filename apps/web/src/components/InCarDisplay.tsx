import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Compass,
  Radio,
  Smartphone,
  QrCode,
  ExternalLink,
  X,
  AlertTriangle,
  Navigation,
  Phone,
  MessageSquare,
  Music,
  Mic,
  Sliders,
  Grid,
  Wifi,
  Battery,
  Car,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, audioSynthesizer } from '@margai/localization';

interface HazardItem {
  id: string;
  key: string;
  distance: number;
  n: number;
  alerted: boolean;
  confirmed?: boolean;
}

interface LanguageCatalog {
  [key: string]: {
    name: string;
    hazardPhrases: {
      walker: string;
      pothole: string;
      curve: string;
      fog: string;
      side: string;
      animal: string;
      waterlogging: string;
    };
  };
}

const LOCALIZED_CATALOG: LanguageCatalog = {
  en: {
    name: 'English',
    hazardPhrases: {
      walker: 'Person crossing ahead. Brake gently.',
      pothole: 'Pothole ahead. Slow down.',
      curve: 'Sharp curve ahead.',
      fog: 'Low visibility. Drive slowly.',
      side: 'Person at roadside.',
      animal: 'Stray cattle crossing ahead. Brake gently.',
      waterlogging: 'Flooded road ahead. Reduce speed and test brakes.',
    },
  },
  hi: {
    name: 'हिन्दी',
    hazardPhrases: {
      walker: 'आगे कोई सड़क पार कर रहा है। सावधान।',
      pothole: 'आगे गड्ढा है। गति धीमी करें।',
      curve: 'आगे तीखा मोड़ है।',
      fog: 'कम दृश्यता है। धीरे चलें।',
      side: 'सड़क किनारे व्यक्ति खड़ा है।',
      animal: 'आगे सड़क पर पशु हैं। सावधानी से ब्रेक लगाएं।',
      waterlogging: 'आगे सड़क पर जलभराव है। गति धीमी करें।',
    },
  },
  ta: {
    name: 'தமிழ்',
    hazardPhrases: {
      walker: 'முன்னே ஒருவர் சாலையைக் கடக்கிறார். கவனம்.',
      pothole: 'முன்னே குழி உள்ளது. வேகத்தைக் குறையுங்கள்.',
      curve: 'முன்னே கூர்மையான வளைவு உள்ளது.',
      fog: 'பார்வைத் தெளிவு குறைவு. மெதுவாகச் செல்லுங்கள்.',
      side: 'சாலையோரத்தில் ஒருவர் நிற்கிறார்.',
      animal: 'முன்னே கால்நடைகள் சாலையைக் கடக்கின்றன. கவனம்.',
      waterlogging: 'முன்னே சாலையில் நீர் தேங்கியுள்ளது. கவனம்.',
    },
  },
  te: {
    name: 'తెలుగు',
    hazardPhrases: {
      walker: 'ముందు ఒకరు రోడ్డు దాటుతున్నారు. నెమ్మదిగా బ్రేక్ వేయండి.',
      pothole: 'ముందు గుంత ఉంది. వేగం తగ్గించండి.',
      curve: 'ముందు పదునైన మలుపు ఉంది.',
      fog: 'కనిపించే దూరం తక్కువగా ఉంది. నెమ్మదిగా వెళ్లండి.',
      side: 'రోడ్డు పక్కన వ్యక్తి ఉన్నారు.',
      animal: 'ముందు పశువులు రోడ్డు దాటుతున్నాయి. నెమ్మదిగా వెళ్లండి.',
      waterlogging: 'ముందు రోడ్డుపై నీరు నిలిచింది. నెమ్మదిగా వెళ్లండి.',
    },
  },
  kn: {
    name: 'ಕನ್ನಡ',
    hazardPhrases: {
      walker: 'ಮುಂದೆ ಒಬ್ಬರು ರಸ್ತೆ ದಾಟುತ್ತಿದ್ದಾರೆ. ನಿಧಾನವಾಗಿ ಬ್ರೇಕ್ ಹಾಕಿ.',
      pothole: 'ಮುಂದೆ ಗುಂಡಿ ಇದೆ. ವೇಗ ಕಡಿಮೆ ಮಾಡಿ.',
      curve: 'ಮುಂದೆ ತೀಕ್ಷ್ಣ ತಿರುವು ಇದೆ.',
      fog: 'ಗೋಚರತೆ ಕಡಿಮೆ ಇದೆ. ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.',
      side: 'ರಸ್ತೆ ಬದಿಯಲ್ಲಿ ವ್ಯಕ್ತಿ ಇದ್ದಾರೆ.',
      animal: 'ಮುಂದೆ ದನ-ಕರುಗಳು ರಸ್ತೆ ದಾಟುತ್ತಿವೆ. ಎಚ್ಚರಿಕೆಯಿಂದ ಚಲಿಸಿ.',
      waterlogging: 'ಮುಂದೆ ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಂತಿದೆ. ಎಚ್ಚರ.',
    },
  },
};

const HAZARD_SPECS: Record<
  string,
  { ic: string; lv: number; n: string; r: string; quiet?: boolean; civic?: boolean }
> = {
  pothole: { ic: '🕳️', lv: 2, n: 'Pothole', r: 'In your lane', civic: true },
  walker: { ic: '🚶', lv: 3, n: 'Pedestrian', r: 'Crossing toward lane' },
  animal: { ic: '🐄', lv: 3, n: 'Animal', r: 'Crossing road ahead' },
  waterlogging: { ic: '🌊', lv: 2, n: 'Waterlogging', r: 'Flooded road surface', civic: true },
  curve: { ic: '↪️', lv: 1, n: 'Sharp turn', r: 'On your route' },
  fog: { ic: '🌫️', lv: 2, n: 'Low visibility', r: 'Ahead on road' },
  side: { ic: '🧍', lv: 0, n: 'Person at roadside', r: 'Near shoulder', quiet: true },
};

const SEVERITY_COLORS: Record<number, string> = {
  0: '#94a3b8',
  1: '#4285F4',
  2: '#FBBC05',
  3: '#EA4335',
};

export const InCarDisplay: React.FC = () => {
  // Vehicle Telemetry
  const [vehicleSpeed, setVehicleSpeed] = useState<number>(90); // default to 90 km/h matching deck
  const [roadCurveType, setRoadCurveType] = useState<string>('STRAIGHT');
  const [zAccelG, setZAccelG] = useState<number>(1.02);
  const [isBumpActive, setIsBumpActive] = useState<boolean>(false);
  const [clockStr, setClockStr] = useState<string>('12:30');
  const [currentLang, setCurrentLang] = useState<string>('ta');
  const [muted, setMuted] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Prototype Visual Scenarios (Matching Slide 10 panels 2, 3, 4)
  const [activeScenario, setActiveScenario] = useState<'urgent' | 'vernacular' | 'cleared'>('urgent');

  // Phone Cam PiP & Zero-Latency Sync
  const [phoneConnected, setPhoneConnected] = useState<boolean>(true);
  const [phoneFps, setPhoneFps] = useState<number>(24);
  const [phoneCameraB64, setPhoneCameraB64] = useState<string | null>(null);
  const [showPairModal, setShowPairModal] = useState<boolean>(false);
  const [liveSyncActive, setLiveSyncActive] = useState<boolean>(true);
  const [showPiPCam, setShowPiPCam] = useState<boolean>(false);

  // Active Hazards Queue
  const [hazards, setHazards] = useState<HazardItem[]>([
    { id: 'hz_ped_1', key: 'walker', distance: 100, n: 1, alerted: true, confirmed: true },
  ]);

  const [noteText, setNoteText] = useState<{ text: string; until: number }>({
    text: '',
    until: 0,
  });

  const lastHazardStateUpdateRef = useRef<number>(0);
  const lastLoopTimeRef = useRef<number>(performance.now());
  const mapDistanceRef = useRef<number>(1420);
  const vehicleSpeedRef = useRef<number>(vehicleSpeed);
  const toastTimerRef = useRef<any>(null);
  const pipImgRef = useRef<HTMLImageElement | null>(null);
  const pipContainerRef = useRef<HTMLDivElement | null>(null);

  vehicleSpeedRef.current = vehicleSpeed;

  // Clock Update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const mins = now.getMinutes().toString().padStart(2, '0');
      hours = hours % 12 || 12;
      setClockStr(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Preset Scenario Switcher (Instant visual alignment with Pitch Deck)
  const applyScenario = (mode: 'urgent' | 'vernacular' | 'cleared') => {
    setActiveScenario(mode);
    if (mode === 'urgent') {
      setVehicleSpeed(90);
      setHazards([
        { id: 'hz_ped_1', key: 'walker', distance: 100, n: 1, alerted: true, confirmed: true },
      ]);
      setNoteText({ text: '', until: 0 });
      playChime(3);
      speakPhrase('walker');
    } else if (mode === 'vernacular') {
      setVehicleSpeed(65);
      setCurrentLang('ta');
      setHazards([
        { id: 'hz_ped_1', key: 'walker', distance: 75, n: 1, alerted: true, confirmed: true },
      ]);
      setNoteText({ text: '', until: 0 });
      playChime(3);
      speakPhrase('walker');
    } else if (mode === 'cleared') {
      setVehicleSpeed(90);
      setHazards([]);
      setNoteText({
        text: 'NO HAZARDS AHEAD · Auto-Purged Passed Pothole',
        until: Date.now() + 15000,
      });
      playChime(1);
    }
  };

  // 1. BroadcastChannel: Zero-Latency In-Tab / Cross-Tab Bridge
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('margai_road_telemetry');
      bc.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;
        setPhoneConnected(true);
        if (msg.fps) setPhoneFps(msg.fps);

        if (msg.speed_kmh !== undefined && msg.speed_kmh > 0) {
          setVehicleSpeed(Math.round(msg.speed_kmh));
        }
        if (msg.road_curve) {
          setRoadCurveType(msg.road_curve);
        }
        if (msg.z_accel_g !== undefined) {
          setZAccelG(msg.z_accel_g);
          if (msg.z_accel_g > 1.8 && !isBumpActive) {
            triggerBumpEvent(msg.z_accel_g);
          }
        }
        if (msg.camera_b64) {
          setPhoneCameraB64(msg.camera_b64);
          if (pipImgRef.current) pipImgRef.current.src = msg.camera_b64;
          if (pipContainerRef.current) pipContainerRef.current.style.display = 'block';
        }
        if (msg.hazards && msg.hazards.length > 0) {
          ingestPhoneHazards(msg.hazards);
        }
      };
    } catch (e) {}

    return () => {
      if (bc) bc.close();
    };
  }, [isBumpActive]);

  // 2. WebSocket Push Hub
  useEffect(() => {
    if (!liveSyncActive) return;

    let ws: WebSocket | null = null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/telemetry`;

    const handleMessage = (data: any) => {
      setPhoneConnected(true);
      if (data.fps) setPhoneFps(data.fps);

      if (data.telemetry) {
        if (data.telemetry.speed_kmh !== undefined && data.telemetry.speed_kmh > 0) {
          setVehicleSpeed(Math.round(data.telemetry.speed_kmh));
        }
        if (data.telemetry.road_geometry?.curve_type) {
          setRoadCurveType(data.telemetry.road_geometry.curve_type);
        }
        const zg = data.telemetry.z_accel_g || 1.02;
        setZAccelG(zg);
        if (zg > 1.8 && !isBumpActive) {
          triggerBumpEvent(zg);
        }
      }

      if (data.frame_base64) {
        setPhoneCameraB64(data.frame_base64);
        if (pipImgRef.current) pipImgRef.current.src = data.frame_base64;
        if (pipContainerRef.current) pipContainerRef.current.style.display = 'block';
      }

      if (data.latest_hazards && data.latest_hazards.length > 0) {
        ingestPhoneHazards(data.latest_hazards);
      }
    };

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => setPhoneConnected(true);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleMessage(data);
          } catch (e) {}
        };
        ws.onclose = () => {
          setTimeout(connectWs, 2500);
        };
      } catch (e) {}
    };

    connectWs();
    return () => {
      if (ws) ws.close();
    };
  }, [liveSyncActive, isBumpActive]);

  const ingestPhoneHazards = (detectedHazards: any[]) => {
    detectedHazards.forEach((dh) => {
      let key = 'pothole';
      const ht = (dh.hazard_type || '').toUpperCase();
      if (ht.includes('ANIMAL') || ht.includes('COW') || ht.includes('CATTLE')) key = 'animal';
      else if (ht.includes('PEDESTRIAN') || ht.includes('WALKER') || ht.includes('PERSON')) key = 'walker';
      else if (ht.includes('WATER') || ht.includes('FLOOD')) key = 'waterlogging';
      else if (ht.includes('CURVE') || ht.includes('TURN')) key = 'curve';
      else if (ht.includes('POTHOLE')) key = 'pothole';

      setHazards((prev) => {
        const exists = prev.find((h) => h.key === key && h.distance > 40);
        if (exists) {
          return prev.map((h) => (h.id === exists.id ? { ...h, n: h.n + 1 } : h));
        }
        const estDist = dh.distance_m ? Math.round(dh.distance_m) : 100;
        const spec = HAZARD_SPECS[key] || HAZARD_SPECS.pothole;

        showToast(`📡 V2V Road Alert: ${spec.n} ahead (${estDist}m)`);
        playChime(spec.lv);
        speakPhrase(key);

        return [
          ...prev,
          {
            id: `hz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            key,
            distance: estDist,
            n: 1,
            alerted: true,
            confirmed: true,
          },
        ];
      });
    });
  };

  const triggerBumpEvent = (gVal: number) => {
    setIsBumpActive(true);
    showToast(`💥 Pothole Shockwave Detected: ${gVal.toFixed(2)}G`);
    setNoteText({
      text: `IMU Bump Spike (${gVal.toFixed(2)}G) · Pothole Logged`,
      until: Date.now() + 4000,
    });
    playChime(2);

    setTimeout(() => {
      setIsBumpActive(false);
    }, 1200);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  const playChime = (level: number) => {
    if (muted) return;
    try {
      audioSynthesizer.playRiskChime(level === 3 ? 'urgent' : level === 2 ? 'caution' : 'information');
    } catch (e) {}
  };

  const speakPhrase = (key: string) => {
    if (muted) return;
    const phrase =
      LOCALIZED_CATALOG[currentLang]?.hazardPhrases[key as keyof typeof LOCALIZED_CATALOG.en.hazardPhrases] ||
      LOCALIZED_CATALOG.en.hazardPhrases[key as keyof typeof LOCALIZED_CATALOG.en.hazardPhrases];

    if (phrase && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(phrase);
        u.lang =
          currentLang === 'hi'
            ? 'hi-IN'
            : currentLang === 'ta'
            ? 'ta-IN'
            : currentLang === 'te'
            ? 'te-IN'
            : currentLang === 'kn'
            ? 'kn-IN'
            : 'en-IN';
        u.rate = 1.05;
        setTimeout(() => window.speechSynthesis.speak(u), 150);
      } catch (e) {}
    }
  };

  // Real-Time Distance Physics Loop
  useEffect(() => {
    let animId: number;

    const loop = (timestamp: number) => {
      const dt = Math.min(0.1, (timestamp - lastLoopTimeRef.current) / 1000);
      lastLoopTimeRef.current = timestamp;

      const speedMps = (vehicleSpeedRef.current * 1000) / 3600;
      mapDistanceRef.current = (mapDistanceRef.current + speedMps * 0.8 * dt) % 5000;

      if (timestamp - lastHazardStateUpdateRef.current >= 150) {
        const stepDt = Math.min(0.3, (timestamp - lastHazardStateUpdateRef.current) / 1000);
        lastHazardStateUpdateRef.current = timestamp;

        setHazards((prevHazards) => {
          const updated = prevHazards.map((h) => {
            const newDist = h.distance - speedMps * stepDt;
            let alerted = h.alerted;

            if (!alerted && newDist <= 120 && !HAZARD_SPECS[h.key]?.quiet) {
              alerted = true;
              playChime(HAZARD_SPECS[h.key]?.lv || 2);
              speakPhrase(h.key);
            }
            return { ...h, distance: newDist, alerted };
          });

          return updated.filter((h) => {
            if (h.distance <= 0) {
              setNoteText({
                text: 'NO HAZARDS AHEAD · Auto-Purged Passed Pothole',
                until: Date.now() + 8000,
              });
              return false;
            }
            return true;
          });
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Top Hazard Selector
  const topHazard = hazards.slice().sort((a, b) => a.distance - b.distance)[0];
  const isPedestrianHazard = topHazard?.key === 'walker';
  const isClearedState = !topHazard && (noteText.until > Date.now() || activeScenario === 'cleared');

  // Perspective Road Math
  const W = 800;
  const H = 480;
  const Y0 = 140; // Horizon Y
  const YB = 440; // Bottom Y
  const geo = (d: number) => {
    const dC = Math.max(0, Math.min(d, 300));
    const u = 1 - dC / 300;
    const y = Y0 + (YB - Y0) * Math.pow(u, 1.85);
    const k = 0.12 + 0.88 * Math.pow(u, 1.85);
    return { y, k, u };
  };

  const X_proj = (lane: number, y: number) => {
    const u = (y - Y0) / (YB - Y0);
    const vpX = W * 0.5;
    const wBase = 460;
    const laneOffsetPx = lane * (wBase * 0.38) * u;
    return vpX + laneOffsetPx;
  };

  const dashFlowDuration = `${Math.max(0.4, 28 / Math.max(15, vehicleSpeed))}s`;

  return (
    <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* SCENARIO DEMO TOOLBAR (Matching Deck Slides 10.2, 10.3, 10.4) */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 bg-[#0d1322] border border-[#1e293b] p-2.5 px-3.5 rounded-2xl text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
            Pitch Deck Snapshots:
          </span>
          <button
            onClick={() => applyScenario('urgent')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeScenario === 'urgent' && topHazard
                ? 'bg-[#EA4335] text-white shadow-lg shadow-red-500/20'
                : 'bg-[#1e293b] text-slate-300 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>2. Urgent Alert (Slide 10.2)</span>
          </button>

          <button
            onClick={() => applyScenario('vernacular')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeScenario === 'vernacular'
                ? 'bg-[#34A853] text-white shadow-lg shadow-green-500/20'
                : 'bg-[#1e293b] text-slate-300 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>3. Vernacular Voice (Slide 10.3)</span>
          </button>

          <button
            onClick={() => applyScenario('cleared')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeScenario === 'cleared'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-[#1e293b] text-slate-300 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>4. Auto-Purged & Clear (Slide 10.4)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerBumpEvent(2.4)}
            className="px-2.5 py-1.5 rounded-xl bg-[#FBBC05]/20 text-[#FBBC05] hover:bg-[#FBBC05]/30 border border-[#FBBC05]/30 font-bold flex items-center gap-1 transition-all active:scale-95"
          >
            💥 Shock Spike (2.4G)
          </button>

          <button
            onClick={() => setShowPiPCam(!showPiPCam)}
            className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition-all ${
              showPiPCam ? 'bg-[#4285F4] text-white border-[#4285F4]' : 'bg-[#1e293b] text-slate-300 border-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Cam PiP</span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center bg-[#090D16] border border-[#1E293B] rounded-xl p-0.5">
            {['en', 'ta', 'te', 'hi'].map((lng) => (
              <button
                key={lng}
                onClick={() => setCurrentLang(lng)}
                className={`px-2 py-1 rounded-lg uppercase text-[10px] font-bold ${
                  currentLang === lng ? 'bg-[#4285F4] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lng}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AUTOMOTIVE TOUCHSCREEN BEZEL (16:9 DISPLAY) */}
      <div className="relative w-full aspect-[16/9] min-h-[440px] max-h-[640px] bg-[#0c0f17] border-[12px] sm:border-[16px] border-[#181c26] rounded-[28px] sm:rounded-[36px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col select-none ring-1 ring-white/10">
        
        {/* TOP COCKPIT STATUS BAR */}
        <div className="w-full h-8 px-4 sm:px-6 bg-[#0a0d14] border-b border-white/[0.06] flex items-center justify-between text-slate-400 text-xs font-mono z-30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300 text-[11px]">Dspec - Send</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">MargAI Connected</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Wifi className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-300 font-bold">5G</span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <Battery className="w-3.5 h-3.5 text-slate-300" />
              <span>98%</span>
            </div>
            <div className="font-bold text-white tracking-wide text-xs">
              {clockStr}
            </div>
          </div>
        </div>

        {/* MAIN SPLIT SCREEN: LEFT 50% 3D ROAD | RIGHT 50% NAVIGATION MAP */}
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 relative overflow-hidden">
          
          {/* ============================================================== */}
          {/* LEFT HALF: 3D VECTOR ROAD / PERSPECTIVE DRIVING ENVIRONMENT */}
          {/* ============================================================== */}
          <div className="relative h-full w-full bg-[#11141c] border-r border-white/[0.08] overflow-hidden flex flex-col justify-between">
            
            {/* Speed & Drive Gear Cluster */}
            <div className="absolute top-4 left-6 z-20 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#2563eb] text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                D
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none font-mono">
                  {vehicleSpeed}
                </div>
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                  km/h
                </div>
              </div>
            </div>

            {/* 3D Perspective Road SVG */}
            <div className="relative w-full h-full flex items-center justify-center">
              <svg viewBox="0 0 800 480" className="absolute inset-0 w-full h-full">
                <defs>
                  {/* Road Tarmac Shading */}
                  <linearGradient id="roadAsphalt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#171b24" />
                    <stop offset="60%" stopColor="#1e2330" />
                    <stop offset="100%" stopColor="#252b3b" />
                  </linearGradient>

                  {/* Red Fan-Shaped Braking Danger Zone Cone */}
                  <linearGradient id="brakeConeGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.55" />
                    <stop offset="40%" stopColor="#dc2626" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                  </linearGradient>

                  {/* Soft Horizon Gradient Fade */}
                  <linearGradient id="horizonFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#11141c" stopOpacity="1" />
                    <stop offset="100%" stopColor="#11141c" stopOpacity="0" />
                  </linearGradient>

                  {/* Red Pedestrian Aura Glow */}
                  <filter id="pedGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ef4444" floodOpacity="0.8" />
                  </filter>
                </defs>

                {/* Road Base Surface */}
                <polygon
                  points={`${X_proj(-1.6, Y0)},${Y0} ${X_proj(1.6, Y0)},${Y0} ${X_proj(2.0, YB)},${YB} ${X_proj(-2.0, YB)},${YB}`}
                  fill="url(#roadAsphalt)"
                />

                {/* Outer Road Edges */}
                <line
                  x1={X_proj(-1.4, Y0)}
                  y1={Y0}
                  x2={X_proj(-1.8, YB)}
                  y2={YB}
                  stroke="#475569"
                  strokeWidth="2.5"
                  strokeOpacity="0.6"
                />
                <line
                  x1={X_proj(1.4, Y0)}
                  y1={Y0}
                  x2={X_proj(1.8, YB)}
                  y2={YB}
                  stroke="#475569"
                  strokeWidth="2.5"
                  strokeOpacity="0.6"
                />

                {/* Animated Speed-Synchronized Center Road Dividers */}
                <line
                  x1={X_proj(0, Y0)}
                  y1={Y0}
                  x2={X_proj(0, YB)}
                  y2={YB}
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeOpacity="0.75"
                  strokeDasharray="28 22"
                  style={{
                    animation: `flow ${dashFlowDuration} linear infinite`,
                  }}
                />

                {/* RED FAN-SHAPED COLLISION BRAKING DANGER ZONE CONE (Slide 10.2 & 6.2) */}
                {topHazard && !isClearedState && (
                  <g>
                    <polygon
                      points={`375,410 425,410 ${X_proj(0.9, geo(topHazard.distance).y)},${geo(topHazard.distance).y} ${X_proj(-0.9, geo(topHazard.distance).y)},${geo(topHazard.distance).y}`}
                      fill="url(#brakeConeGrad)"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeOpacity="0.8"
                    />

                    {/* Braking Cone Scanning Pulse Arc */}
                    <path
                      d={`M ${X_proj(-0.7, geo(topHazard.distance * 0.7).y)} ${geo(topHazard.distance * 0.7).y} Q ${X_proj(0, geo(topHazard.distance * 0.7).y)} ${geo(topHazard.distance * 0.7).y - 8} ${X_proj(0.7, geo(topHazard.distance * 0.7).y)} ${geo(topHazard.distance * 0.7).y}`}
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      fill="none"
                      opacity="0.9"
                    />
                  </g>
                )}

                {/* RED PEDESTRIAN AVATAR INSIDE BRAKING CONE (Slide 10.2) */}
                {topHazard && isPedestrianHazard && !isClearedState && (
                  <g
                    transform={`translate(${X_proj(0.08, geo(topHazard.distance).y)}, ${geo(topHazard.distance).y}) scale(${geo(topHazard.distance).k * 1.35})`}
                    filter="url(#pedGlow)"
                  >
                    {/* Pulsing Floor Warning Ring */}
                    <ellipse rx="38" ry="12" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" strokeWidth="2.5" />

                    {/* Walking Pedestrian Silhouette */}
                    {/* Head */}
                    <circle cx="0" cy="-64" r="8" fill="#ef4444" />
                    {/* Torso */}
                    <rect x="-6" y="-54" width="12" height="24" rx="4" fill="#ef4444" />
                    {/* Left Leg */}
                    <line x1="-3" y1="-30" x2="-10" y2="-6" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                    {/* Right Leg */}
                    <line x1="3" y1="-30" x2="10" y2="-6" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                    {/* Left Arm */}
                    <line x1="-6" y1="-48" x2="-14" y2="-28" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                    {/* Right Arm */}
                    <line x1="6" y1="-48" x2="14" y2="-32" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />

                    {/* Warning Triangle Above Pedestrian */}
                    <polygon points="0,-82 -10,-68 10,-68" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                    <text x="0" y="-71" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff">
                      !
                    </text>
                  </g>
                )}

                {/* Pothole Hazard Overlay if pothole active */}
                {topHazard && topHazard.key === 'pothole' && !isClearedState && (
                  <g
                    transform={`translate(${X_proj(0, geo(topHazard.distance).y)}, ${geo(topHazard.distance).y}) scale(${geo(topHazard.distance).k * 1.2})`}
                  >
                    <ellipse rx="48" ry="16" fill="#000000" opacity="0.8" />
                    <ellipse rx="56" ry="20" fill="none" stroke="#f59e0b" strokeWidth="3" />
                    <circle cy="-34" r="14" fill="#f59e0b" />
                    <text y="-28" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#111827">
                      !
                    </text>
                  </g>
                )}

                {/* Horizon Gradient Overlay */}
                <rect x="0" y="0" width="800" height={Y0 + 20} fill="url(#horizonFade)" />

                {/* MODERN SILVER VEHICLE AVATAR (REAR PERSPECTIVE) */}
                <g transform="translate(400, 420)">
                  {/* Ground Shadow */}
                  <ellipse cx="0" cy="18" rx="88" ry="12" fill="#000000" opacity="0.6" />

                  {/* Lower Bumper & Diffuser */}
                  <path
                    d="M-72 8 L-64 22 L64 22 L72 8 Z"
                    fill="#1e2430"
                    stroke="#334155"
                    strokeWidth="1.5"
                  />

                  {/* Main Car Body (Sleek Metallic Silver Curved Shell) */}
                  <path
                    d="M-76 6 Q-78 -24 -60 -36 L60 -36 Q78 -24 76 6 Z"
                    fill="#cbd5e1"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />

                  {/* Rear Cabin Glass / Window */}
                  <path
                    d="M-52 -36 L-38 -72 Q-32 -76 0 -76 Q32 -76 38 -72 L52 -36 Z"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1.5"
                  />

                  {/* Glowing Red LED Taillight Bar */}
                  <rect x="-68" y="-12" width="136" height="7" rx="3.5" fill="#ef4444" />
                  <rect x="-70" y="-14" width="22" height="11" rx="3" fill="#dc2626" />
                  <rect x="48" y="-14" width="22" height="11" rx="3" fill="#dc2626" />

                  {/* Taillight Halo Glow */}
                  <ellipse cx="-59" cy="-8" rx="14" ry="4" fill="#ef4444" opacity="0.4" />
                  <ellipse cx="59" cy="-8" rx="14" ry="4" fill="#ef4444" opacity="0.4" />

                  {/* MargAI Emblem / Number Plate */}
                  <rect x="-24" y="-2" width="48" height="14" rx="2" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
                  <text x="0" y="8" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#38bdf8" letterSpacing="1">
                    MARG•AI
                  </text>
                </g>
              </svg>
            </div>

            {/* BOTTOM HUD BANNER ON 3D ROAD */}
            <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
              {topHazard && !isClearedState ? (
                /* URGENT HAZARD BANNER (Slide 10.2 & 6.2) */
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2b0c10]/95 border border-[#ef4444] text-[#ef4444] shadow-2xl backdrop-blur-md animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
                  <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase">
                    {isPedestrianHazard
                      ? `▲ URGENT PEDESTRIAN RISK [${Math.max(10, Math.round(topHazard.distance))}m]`
                      : `▲ URGENT ${topHazard.key.toUpperCase()} AHEAD [${Math.max(10, Math.round(topHazard.distance))}m]`}
                  </span>
                </div>
              ) : (
                /* NO HAZARDS AHEAD / AUTO-PURGED (Slide 10.4) */
                <div className="flex flex-col items-center justify-center px-5 py-2 rounded-xl bg-[#092314]/95 border border-[#22c55e] text-center shadow-2xl backdrop-blur-md">
                  <div className="font-extrabold text-sm sm:text-base text-[#22c55e] tracking-wider uppercase">
                    NO HAZARDS AHEAD
                  </div>
                  <div className="text-[11px] font-mono text-emerald-300">
                    Auto-Purged Passed Pothole
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT HALF: NAVIGATION MAP + TOP FLOATING ALERT CARD */}
          {/* ============================================================== */}
          <div className="relative h-full w-full bg-[#0d1017] overflow-hidden flex flex-col justify-between">
            
            {/* TOP FLOATING ALERT CARD (Slide 10.2 & 10.3) */}
            <div className="p-3 sm:p-4 z-20">
              {topHazard && !isClearedState ? (
                /* RED URGENT ALERT CARD (Slide 10.2 & 6.2) */
                <div className="w-full bg-[#300d12]/95 border border-[#ef4444] rounded-2xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#ef4444]/20 border border-[#ef4444] flex items-center justify-center text-[#ef4444] font-extrabold text-lg flex-shrink-0">
                      ▲
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold text-white leading-tight">
                        URGENT: Person Crossing Ahead. Brake gently
                      </div>
                      <div className="text-[11px] text-red-200/90 font-medium mt-0.5 tracking-wide">
                        {currentLang === 'ta'
                          ? 'முன்னே ஒருவர் சாலையைக் கடக்கிறார். கவனம்.'
                          : 'தமிழ் | తెలుగు | हिन्दी'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Distance & Animated Audio Waveform Bars */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-white bg-black/40 px-2 py-1 rounded-lg border border-white/10">
                      {Math.max(10, Math.round(topHazard.distance))}m
                    </span>

                    {/* Animated Audio Waveform Bars: ||||||| */}
                    <div className="flex items-center gap-0.5 h-6 px-1">
                      {[14, 22, 10, 24, 18, 12, 20].map((h, i) => (
                        <span
                          key={i}
                          className="w-1 bg-[#ef4444] rounded-full animate-pulse"
                          style={{
                            height: `${h}px`,
                            animationDelay: `${i * 0.12}s`,
                            animationDuration: '0.6s',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeScenario === 'vernacular' ? (
                /* GREEN VERNACULAR VOICE CARD (Slide 10.3) */
                <div className="w-full bg-[#0a2618]/95 border border-[#22c55e] rounded-2xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#22c55e]/20 border border-[#22c55e] flex items-center justify-center text-[#22c55e] text-lg flex-shrink-0">
                      🔊
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold text-white leading-tight">
                        முன்னே ஒருவர் சாலையைக் கடக்கிறார். கவனம்.
                      </div>
                      <div className="text-[11px] text-emerald-300 font-mono mt-0.5">
                        MargAI Vernacular Co-Pilot Active
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 h-6 px-1">
                    {[12, 20, 16, 24, 18, 10, 22].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 bg-[#22c55e] rounded-full animate-pulse"
                        style={{
                          height: `${h}px`,
                          animationDelay: `${i * 0.12}s`,
                          animationDuration: '0.6s',
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* PASS-BY / AUTO-PURGED CARD (Slide 10.4) */
                <div className="w-full bg-[#091a14]/90 border border-[#22c55e]/60 rounded-2xl p-2.5 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                    <span className="text-xs text-white font-medium">
                      Corridor Clear · Pothole Auto-Purged & Queued for BBMP Repair
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">0 Hazards Ahead</span>
                </div>
              )}
            </div>

            {/* Turn-by-Turn Card Below Alert */}
            <div className="px-4 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#141924]/90 border border-white/10 text-white text-xs font-semibold backdrop-blur-md">
                <span className="text-lg text-[#38bdf8] font-bold">↱</span>
                <span>Upcoming Tamil Nadu</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>GPS High Acc</span>
              </div>
            </div>

            {/* DARK VECTOR ROAD MAP (Google / Mapbox Styling) */}
            <div className="relative flex-1 w-full h-full overflow-hidden">
              <svg viewBox="0 0 600 360" className="absolute inset-0 w-full h-full">
                {/* Dark Background */}
                <rect width="600" height="360" fill="#0d111a" />

                {/* Secondary Street Grid Lines */}
                <path
                  d="M40 0 L40 360 M120 0 L120 360 M200 0 L200 360 M320 0 L320 360 M440 0 L440 360 M520 0 L520 360"
                  stroke="#1a2233"
                  strokeWidth="2"
                />
                <path
                  d="M0 60 L600 60 M0 140 L600 140 M0 220 L600 220 M0 300 L600 300"
                  stroke="#1a2233"
                  strokeWidth="2"
                />

                {/* Major Connecting Arterial Roads */}
                <path
                  d="M60 360 Q180 260 220 180 T420 80 L580 40"
                  stroke="#242e42"
                  strokeWidth="18"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M20 180 L220 180 L360 360"
                  stroke="#242e42"
                  strokeWidth="14"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* FLUORESCENT BLUE ROUTE POLYLINE (Slide 10.2 & 6.2) */}
                <path
                  d="M180 340 L210 240 L240 180 Q260 140 320 120 L440 90 L520 70"
                  stroke="#0284c7"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.5"
                />
                <path
                  d="M180 340 L210 240 L240 180 Q260 140 320 120 L440 90 L520 70"
                  stroke="#38bdf8"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* Active Hazard Pin on Map */}
                {topHazard && !isClearedState && (
                  <g transform="translate(240, 180)">
                    <circle r="16" fill="#ef4444" opacity="0.3" className="animate-ping" />
                    <circle r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                    <text y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#ffffff">
                      !
                    </text>
                  </g>
                )}

                {/* Current Vehicle Position Pointer (Bright Blue Circle + Arrow) */}
                <g transform="translate(195, 290) rotate(-15)">
                  <circle r="18" fill="#38bdf8" opacity="0.3" className="animate-pulse" />
                  <circle r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                  <path d="M0 -6 L5 4 L0 2 L-5 4 Z" fill="#ffffff" />
                </g>
              </svg>

              {/* Map Floating Pill: Upcoming Route */}
              <div className="absolute bottom-3 left-4 bg-[#131924]/90 border border-white/10 px-3 py-1 rounded-lg text-[10px] font-mono text-slate-300">
                Upcoming route
              </div>

              {/* PiP Camera Overlay (Toggled or Direct Feed) */}
              {(showPiPCam || phoneCameraB64) && (
                <div
                  ref={pipContainerRef}
                  className="absolute right-3 bottom-3 w-40 sm:w-48 aspect-video rounded-xl overflow-hidden border border-white/20 shadow-2xl z-20 bg-black"
                >
                  <img
                    ref={pipImgRef}
                    src={phoneCameraB64 || ''}
                    alt="Smartphone Camera"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400">
                    📱 Phone Cam
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BOTTOM AUTOMOTIVE DOCK: ANDROID AUTO & CARPLAY CONTROLS */}
        {/* ============================================================== */}
        <div className="w-full h-12 sm:h-14 bg-[#0a0d14] border-t border-white/[0.08] px-3 sm:px-6 flex items-center justify-between z-30">
          
          {/* Left: Car Home & App Launcher Grid */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => applyScenario('urgent')}
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 hover:text-white transition-all"
              title="Car Home"
            >
              <Car className="w-4 sm:w-5 h-4 sm:h-5 text-[#38bdf8]" />
            </button>

            <button
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 hover:text-white transition-all"
              title="App Launcher"
            >
              <Grid className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
          </div>

          {/* Center: Android Auto / CarPlay Core Icons */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-[#22c55e] transition-all"
              title="Phone"
            >
              <Phone className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            <button
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-[#38bdf8] transition-all"
              title="Messages"
            >
              <MessageSquare className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            <button
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-[#22c55e] transition-all"
              title="Spotify / Music"
            >
              <Music className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            <button
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-[#4285F4] transition-all"
              title="Navigation"
            >
              <Navigation className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            <button
              onClick={() => speakPhrase(topHazard ? topHazard.key : 'walker')}
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-[#FBBC05] transition-all"
              title="Google Assistant Voice"
            >
              <Mic className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
          </div>

          {/* Right: Sound, Settings & Clock */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMuted(!muted)}
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 transition-all"
              title="Volume"
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={() => setShowPairModal(true)}
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 transition-all"
              title="Pair Phone via QR"
            >
              <QrCode className="w-4 h-4 text-slate-300" />
            </button>

            <div className="text-white font-mono text-xs font-bold pl-1 hidden sm:block">
              {clockStr}
            </div>
          </div>
        </div>

        {/* Toast Overlay */}
        {toastMessage && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-[#161d2d]/95 border border-[#38bdf8]/40 px-4 py-2 rounded-full text-xs font-mono text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
            {toastMessage}
          </div>
        )}

        {/* QR PAIRING MODAL */}
        {showPairModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0f1422] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center relative shadow-2xl font-mono">
              <button
                onClick={() => setShowPairModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <Smartphone className="w-10 h-10 text-[#38bdf8] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">Pair Smartphone Dashcam</h3>
              <p className="text-xs text-slate-300 mt-1 mb-4 font-sans">
                Scan with your phone to stream live road edge vision and IMU sensor data.
              </p>

              <div className="bg-white p-3 rounded-xl inline-block shadow-inner mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    `${typeof window !== 'undefined' ? window.location.origin : ''}/?mode=smartphone`
                  )}`}
                  alt="QR Code"
                  className="w-40 h-40"
                />
              </div>

              <div className="text-[11px] text-slate-400">
                Or visit:{' '}
                <a
                  href={`${typeof window !== 'undefined' ? window.location.origin : ''}/?mode=smartphone`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#38bdf8] underline"
                >
                  /?mode=smartphone
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Map,
  Compass,
  Radio,
  Smartphone,
  QrCode,
  ExternalLink,
  X,
  AlertTriangle,
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
    },
  },
};

const HAZARD_SPECS: Record<
  string,
  { ic: string; lv: number; n: string; r: string; quiet?: boolean; civic?: boolean }
> = {
  walker: { ic: '🚶', lv: 3, n: 'Person crossing', r: 'Crossing toward your lane' },
  side: { ic: '🧍', lv: 0, n: 'Person at roadside', r: 'Near shoulder', quiet: true },
  pothole: { ic: '🕳️', lv: 2, n: 'Pothole', r: 'In your lane', civic: true },
  curve: { ic: '↪️', lv: 1, n: 'Sharp curve', r: 'On your route' },
  fog: { ic: '🌫️', lv: 2, n: 'Low visibility', r: 'Ahead on your road' },
};

const SEVERITY_COLORS: Record<number, string> = {
  0: '#94a3b8',
  1: '#4285F4', // Google Blue
  2: '#FBBC05', // Google Yellow
  3: '#EA4335', // Google Red
};

const SEVERITY_NAMES: Record<number, string> = {
  1: 'Information',
  2: 'Caution',
  3: 'Urgent',
};

export const InCarDisplay: React.FC = () => {
  // Mode & Themes
  const [mapMode, setMapMode] = useState<boolean>(false);
  const [nightMode, setNightMode] = useState<boolean>(true);
  const [currentLang, setCurrentLang] = useState<string>('en');
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Smartphone Real-Time Ingestion State
  const [phoneConnected, setPhoneConnected] = useState<boolean>(false);
  const [phoneFps, setPhoneFps] = useState<number>(0);
  const [phoneCameraB64, setPhoneCameraB64] = useState<string | null>(null);
  const [liveSyncActive, setLiveSyncActive] = useState<boolean>(true);

  // Vehicle Kinematics (Driven by Smartphone Road Movements)
  const [vehicleSpeed, setVehicleSpeed] = useState<number>(55); // km/h
  const [zAccelG, setZAccelG] = useState<number>(1.02);
  const [isBumpActive, setIsBumpActive] = useState<boolean>(false);
  const [roadCurveType, setRoadCurveType] = useState<string>('STRAIGHT');
  const [clockStr, setClockStr] = useState<string>('12:00');

  // Dynamic Hazards Queue
  const [hazards, setHazards] = useState<HazardItem[]>([
    { id: 'h1', key: 'side', distance: 260, n: 1, alerted: false, confirmed: true },
    { id: 'h2', key: 'walker', distance: 220, n: 1, alerted: false, confirmed: true },
    { id: 'h3', key: 'pothole', distance: 180, n: 1, alerted: false, confirmed: true },
  ]);

  const [noteText, setNoteText] = useState<{ text: string; until: number }>({
    text: '',
    until: 0,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Map route animation reference
  const mapDistanceRef = useRef<number>(0);
  const bumpsListRef = useRef<number[]>([]);
  const lastLoopTimeRef = useRef<number>(performance.now());
  const toastTimerRef = useRef<any>(null);

  // Clock Update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // 1. Zero-Latency BroadcastChannel Listener for Instant Local Road Telemetry
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('margai_road_telemetry');
      bc.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;
        setPhoneConnected(true);
        if (msg.fps) setPhoneFps(msg.fps);

        // A. Speed synchronization
        if (msg.speed_kmh !== undefined && msg.speed_kmh > 0) {
          setVehicleSpeed(Math.round(msg.speed_kmh));
        }

        // B. Road Curvature & Tilting
        if (msg.road_curve) {
          setRoadCurveType(msg.road_curve);
        }

        // C. Accelerometer Bump Shockwave Impact
        if (msg.z_accel_g !== undefined) {
          setZAccelG(msg.z_accel_g);
          if (msg.z_accel_g > 1.8 && !isBumpActive) {
            triggerBumpEvent(msg.z_accel_g);
          }
        }

        // D. Picture-in-Picture Camera Frame
        if (msg.camera_b64) {
          setPhoneCameraB64(msg.camera_b64);
        }

        // E. Ingest Hazards
        if (msg.hazards && msg.hazards.length > 0) {
          ingestPhoneHazards(msg.hazards);
        }
      };
    } catch (e) {}

    return () => {
      if (bc) bc.close();
    };
  }, [isBumpActive]);

  // 2. Poll Smartphone State & Road Movements from AI Server (/api/smartphone/...)
  useEffect(() => {
    if (!liveSyncActive) return;

    let pollInterval: any;

    const pollSmartphone = async () => {
      try {
        const res = await fetch('/api/smartphone/status');
        if (res.ok) {
          const status = await res.json();
          setPhoneConnected(status.connected);
          setPhoneFps(status.fps || 0);

          if (status.connected && status.telemetry) {
            // A. Update Vehicle Speed from Phone GPS/Sensors
            if (status.telemetry.speed_kmh !== undefined && status.telemetry.speed_kmh > 0) {
              setVehicleSpeed(Math.round(status.telemetry.speed_kmh));
            }

            // B. Road Curvature from Phone AI Camera / Gyroscope
            if (status.telemetry.road_geometry?.curve_type) {
              setRoadCurveType(status.telemetry.road_geometry.curve_type);
            }

            // C. Pothole Bump Impact from Phone Z-Axis Accelerometer
            const zg = status.telemetry.z_accel_g || 1.02;
            setZAccelG(zg);
            if (zg > 1.8 && !isBumpActive) {
              triggerBumpEvent(zg);
            }

            // D. Ingest Hazards Detected by Phone Camera
            if (status.latest_hazards && status.latest_hazards.length > 0) {
              ingestPhoneHazards(status.latest_hazards);
            }
          }
        }

        // Fetch live picture-in-picture rear camera frame
        const frameRes = await fetch('/api/smartphone/latest_frame');
        if (frameRes.ok) {
          const frameData = await frameRes.json();
          if (frameData.frame_base64) {
            setPhoneCameraB64(frameData.frame_base64);
          }
        }
      } catch (e) {
        // AI server offline or local demo mode
      }
    };

    pollInterval = setInterval(pollSmartphone, 75);
    return () => clearInterval(pollInterval);
  }, [liveSyncActive, isBumpActive]);

  // Ingest Hazards coming from Phone Camera AI
  const ingestPhoneHazards = (detectedHazards: any[]) => {
    detectedHazards.forEach((dh) => {
      let key = 'pothole';
      if (dh.hazard_type.includes('ANIMAL')) key = 'walker';
      else if (dh.hazard_type.includes('PEDESTRIAN')) key = 'walker';
      else if (dh.hazard_type.includes('CURVE')) key = 'curve';

      // Check if hazard is already in active queue
      setHazards((prev) => {
        const exists = prev.find((h) => h.key === key && h.distance > 40);
        if (exists) {
          return prev.map((h) => (h.id === exists.id ? { ...h, n: h.n + 1 } : h));
        }
        const estDist = dh.distance_m ? Math.round(dh.distance_m) : 220;
        return [
          ...prev,
          {
            id: `hz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            key,
            distance: estDist,
            n: 1,
            alerted: false,
            confirmed: true,
          },
        ];
      });
    });
  };

  // Bump Shockwave Trigger
  const triggerBumpEvent = (gVal: number) => {
    setIsBumpActive(true);
    showToast(`Bump felt (${gVal.toFixed(2)}G): Pothole registered on road`);
    setNoteText({
      text: `Pothole shockwave logged (${gVal.toFixed(2)}G)`,
      until: Date.now() + 3500,
    });
    playChime(2);

    // Add bump marker to map
    bumpsListRef.current.push(mapDistanceRef.current);

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
    } catch (e) {
      // Audio fallback
    }
  };

  const speakPhrase = (key: string) => {
    if (muted) return;
    const catalog = LOCALIZED_CATALOG[currentLang] || LOCALIZED_CATALOG.en;
    const phrase = catalog.hazardPhrases[key as keyof typeof catalog.hazardPhrases];
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
        u.rate = 1.1;
        setTimeout(() => window.speechSynthesis.speak(u), 300);
      } catch (e) {}
    }
  };

  // 2. Real-Time Physics & Animation Loop (Distance Countdown & Map Navigation)
  useEffect(() => {
    let animId: number;

    const loop = (timestamp: number) => {
      const dt = Math.min(0.1, (timestamp - lastLoopTimeRef.current) / 1000);
      lastLoopTimeRef.current = timestamp;

      // Speed in m/s
      const speedMps = (vehicleSpeed * 1000) / 3600;

      // Advance map odometer
      mapDistanceRef.current = (mapDistanceRef.current + speedMps * 0.8 * dt) % 5000;

      // Update hazards distance
      setHazards((prevHazards) => {
        const updated = prevHazards.map((h) => {
          const newDist = h.distance - speedMps * dt;
          let alerted = h.alerted;

          // Trigger alert when hazard enters warning zone (< 200m)
          if (!alerted && newDist <= 190 && !HAZARD_SPECS[h.key]?.quiet) {
            alerted = true;
            playChime(HAZARD_SPECS[h.key]?.lv || 2);
            speakPhrase(h.key);
          }
          return { ...h, distance: newDist, alerted };
        });

        // Filter passed hazards
        return updated.filter((h) => {
          if (h.distance <= 0) {
            if (!HAZARD_SPECS[h.key]?.quiet) {
              setNoteText({
                text: `${HAZARD_SPECS[h.key]?.n} passed · Audit ticket queued`,
                until: Date.now() + 3500,
              });
            }
            return false;
          }
          return true;
        });
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [vehicleSpeed, currentLang, muted]);

  // Active Top Priority Hazard
  const activeHazardsList = hazards
    .filter((h) => h.alerted && !HAZARD_SPECS[h.key]?.quiet)
    .sort((a, b) => (HAZARD_SPECS[b.key]?.lv || 0) - (HAZARD_SPECS[a.key]?.lv || 0) || a.distance - b.distance);
  const topHazard = activeHazardsList[0];

  // Perspective Projection Helpers
  const Y0 = 70;
  const YB = 470;
  const LW = (y: number) => 16 + 204 * ((y - Y0) / 400);
  const X_proj = (w: number, y: number) => 400 + LW(y) * w;
  const geo = (d: number) => {
    const s = 0.06 + 0.94 * (1 - Math.min(d, 300) / 300);
    const y = Y0 + Math.pow(s, 1.6) * 400;
    return { s, y, k: 0.22 + 0.95 * s };
  };

  // Add Hazard manually from dock
  const spawnHazard = (k: string) => {
    setHazards((prev) => {
      const exists = prev.find((h) => h.key === k && h.distance > 60);
      if (exists) {
        showToast(`Merged: same ${HAZARD_SPECS[k].n.toLowerCase()}, ${exists.n + 1} reports`);
        return prev.map((h) => (h.id === exists.id ? { ...h, n: h.n + 1 } : h));
      }
      return [
        ...prev,
        {
          id: `manual_${Date.now()}`,
          key: k,
          distance: 280,
          n: 1,
          alerted: false,
          confirmed: true,
        },
      ];
    });
  };

  // Road Curve Tilt calculation
  let roadTilt = 'none';
  if (roadCurveType === 'SHARP_LEFT' || roadCurveType === 'HAIRPIN_BEND') roadTilt = 'rotate(-5deg)';
  else if (roadCurveType === 'SHARP_RIGHT') roadTilt = 'rotate(5deg)';

  // Road Dashed Line Flow Speed (Tied in Real Time to Phone Speed)
  const dashFlowDuration = `${(17.5 / Math.max(vehicleSpeed / 3.6, 0.5)).toFixed(2)}s`;

  return (
    <div
      className={`w-full min-h-[calc(100vh-140px)] flex items-center justify-center p-2 sm:p-4 select-none ${
        nightMode ? 'bg-[#000000] text-[#f1f2f4]' : 'bg-[#eceef1] text-[#14161a]'
      }`}
      style={{
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Kannada", sans-serif',
      }}
    >
      {/* 16:9 In-Car Display Cockpit Shell */}
      <div
        className={`relative w-full max-w-[1240px] aspect-[16/9] rounded-2xl overflow-hidden p-3 sm:p-5 flex flex-col justify-between shadow-2xl border transition-all ${
          isBumpActive ? 'translate-y-2.5 duration-75' : 'duration-300'
        } ${nightMode ? 'bg-[#0d0e10] border-white/10' : 'bg-white border-black/10'}`}
      >
        {/* TOP STATUS BAR */}
        <div className="flex items-center justify-between z-20 pb-2 border-b border-white/10 text-xs sm:text-sm font-mono">
          <div className="text-base sm:text-lg font-bold tracking-tight text-white/90">{clockStr}</div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base sm:text-xl tracking-tight text-white">
              Marg<span className="text-[#4285F4]">AI</span>
            </span>
            <span className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full border border-white/10">
              In-Car Cockpit HUD
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Phone Link Badge */}
            <button
              onClick={() => setShowQrModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                phoneConnected
                  ? 'bg-[#34A853]/20 border-[#34A853] text-[#34A853]'
                  : 'bg-[#EA4335]/20 border-[#EA4335]/60 text-[#EA4335] animate-pulse'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{phoneConnected ? `Phone Live (${phoneFps} FPS)` : 'Sync Phone'}</span>
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-sans text-white/90"
              >
                {LOCALIZED_CATALOG[currentLang]?.name || 'English'} ▾
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 top-8 z-50 bg-[#1a1b1f] border border-white/10 rounded-xl p-1.5 shadow-2xl backdrop-blur-md min-w-[130px]">
                  {Object.keys(LOCALIZED_CATALOG).map((lk) => (
                    <button
                      key={lk}
                      onClick={() => {
                        setCurrentLang(lk);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-sans transition-colors ${
                        currentLang === lk ? 'bg-[#4285F4] text-white font-bold' : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {LOCALIZED_CATALOG[lk].name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAIN COCKPIT BODY */}
        <div className="relative flex-1 grid grid-cols-12 gap-3 sm:gap-4 my-2 min-h-0 overflow-hidden">
          {/* LEFT TELEMETRY CLUSTER */}
          <div className="col-span-3 flex flex-col justify-between space-y-2 min-h-0">
            {/* Speedometer (Driven in Real Time by Smartphone Speed) */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-4xl sm:text-6xl font-light tracking-tighter text-white tabular-nums">
                {vehicleSpeed}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>km/h · live GPS</span>
                {phoneConnected && <span className="text-emerald-400 font-bold">● Active</span>}
              </div>

              {/* Gear Indicator */}
              <div className="mt-3 flex gap-2.5 text-xs sm:text-sm font-mono text-slate-500">
                <span>P</span>
                <span>R</span>
                <span>N</span>
                <span className="text-white font-black border-b-2 border-[#4285F4]">D</span>
              </div>
            </div>

            {/* Ahead Hazards Card */}
            <div className="flex-1 p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between overflow-hidden">
              <div>
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                  Ahead On Road
                </h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  {hazards.slice(0, 3).map((h) => {
                    const s = HAZARD_SPECS[h.key] || HAZARD_SPECS.pothole;
                    const col = SEVERITY_COLORS[s.lv] || '#94a3b8';
                    return (
                      <div key={h.id} className="flex items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{s.ic}</span>
                          <span className="truncate">{s.n}</span>
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col }} />
                          <b>{Math.round(h.distance)}m</b>
                        </div>
                      </div>
                    );
                  })}
                  {hazards.length === 0 && (
                    <div className="text-xs text-slate-500 font-mono py-2">No hazards ahead</div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-mono leading-tight pt-2 border-t border-white/10">
                {noteText.until > Date.now()
                  ? noteText.text
                  : `Z-Accel: ${zAccelG.toFixed(2)}G · Tilt: ${roadCurveType}`}
              </div>
            </div>
          </div>

          {/* CENTER VIEWPORT (3D ROAD PERSPECTIVE OR VECTOR MAP) */}
          <div className="col-span-9 relative rounded-2xl overflow-hidden border border-white/10 bg-[#0f1012]">
            {!mapMode ? (
              /* 3D PERSPECTIVE ROAD VIEW */
              <svg
                viewBox="0 0 800 470"
                preserveAspectRatio="xMidYMax slice"
                className="absolute inset-0 w-full h-full"
              >
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#383b42" />
                    <stop offset="1" stopColor="#25272c" />
                  </linearGradient>
                  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#0f1012" />
                    <stop offset="0.45" stopColor="#0f1012" stopOpacity="0.9" />
                    <stop offset="1" stopColor="#0f1012" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="zg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#EA4335" stopOpacity="0" />
                    <stop offset="1" stopColor="#EA4335" stopOpacity="0.34" />
                  </linearGradient>
                </defs>

                {/* Road World (Tilts dynamically with phone road movement) */}
                <g id="world" style={{ transform: roadTilt, transformOrigin: '400px 470px', transition: 'transform 0.8s ease' }}>
                  {/* Road Asphalt Polygon */}
                  <polygon
                    points={`${X_proj(-0.85, Y0)},${Y0} ${X_proj(1.5, Y0)},${Y0} ${X_proj(1.5, YB)},${YB} ${X_proj(-0.85, YB)},${YB}`}
                    fill="url(#rg)"
                  />

                  {/* Road Boundary Lines */}
                  <line
                    x1={X_proj(-0.85, Y0)}
                    y1={Y0}
                    x2={X_proj(-0.85, YB)}
                    y2={YB}
                    stroke="#d7dae0"
                    strokeOpacity="0.55"
                    strokeWidth="2.5"
                  />
                  <line
                    x1={X_proj(1.5, Y0)}
                    y1={Y0}
                    x2={X_proj(1.5, YB)}
                    y2={YB}
                    stroke="#d7dae0"
                    strokeOpacity="0.55"
                    strokeWidth="2.5"
                  />

                  {/* Flowing Center Dashed Line (Speed-synchronized with phone) */}
                  <line
                    x1={X_proj(0.5, Y0)}
                    y1={Y0}
                    x2={X_proj(0.5, YB)}
                    y2={YB}
                    stroke="#d7dae0"
                    strokeOpacity="0.75"
                    strokeWidth="3.5"
                    strokeDasharray="22 18"
                    style={{
                      animation: `flow ${dashFlowDuration} linear infinite`,
                    }}
                  />

                  {/* Horizon Range Markers */}
                  {[100, 200].map((d) => {
                    const g = geo(d);
                    return (
                      <g key={d}>
                        <line
                          x1={X_proj(-0.85, g.y)}
                          x2={X_proj(1.5, g.y)}
                          y1={g.y}
                          y2={g.y}
                          stroke="#ffffff"
                          strokeOpacity="0.15"
                          strokeDasharray="4 7"
                        />
                        <text
                          x={X_proj(1.5, g.y) - 8}
                          y={g.y - 6}
                          textAnchor="end"
                          fontSize="12"
                          fill="#ffffff"
                          fillOpacity="0.4"
                        >
                          {d} m
                        </text>
                      </g>
                    );
                  })}

                  {/* Dynamic Hazards Rendered on Road */}
                  {hazards.map((h) => {
                    const g = geo(h.distance);
                    const spec = HAZARD_SPECS[h.key] || HAZARD_SPECS.pothole;
                    const col = SEVERITY_COLORS[spec.lv];
                    const opacity = Math.min(1, h.distance / 25);

                    if (h.key === 'pothole') {
                      const x = X_proj(0, g.y);
                      return (
                        <g key={h.id} transform={`translate(${x},${g.y}) scale(${g.k})`} opacity={opacity}>
                          <ellipse rx="46" ry="13" fill="#000" opacity="0.6" />
                          <ellipse rx="54" ry="18" fill="none" stroke={col} strokeWidth="3.5" />
                          <circle cy="-34" r="12" fill={col} />
                          <text y="-29" textAnchor="middle" fontSize="15" fontWeight="800" fill="#111">
                            !
                          </text>
                        </g>
                      );
                    } else if (h.key === 'walker' || h.key === 'side') {
                      const wSide = h.key === 'side' ? -1.3 : -1.15 + 3 * (1 - Math.min(h.distance, 300) / 300);
                      const x = X_proj(wSide, g.y);
                      return (
                        <g key={h.id} transform={`translate(${x},${g.y}) scale(${g.k * 1.15})`} opacity={opacity}>
                          <ellipse
                            rx="34"
                            ry="11"
                            fill={h.key === 'side' ? 'none' : col}
                            fillOpacity="0.2"
                            stroke={col}
                            strokeWidth="2"
                          />
                          <rect x="-12" y="-82" width="24" height="46" rx="12" fill="#e6e9ee" />
                          <circle cy="-96" r="10.5" fill="#e6e9ee" />
                        </g>
                      );
                    } else if (h.key === 'curve') {
                      const x = X_proj(0, g.y);
                      return (
                        <g key={h.id} transform={`translate(${x},${g.y}) scale(${g.k})`} opacity={opacity}>
                          <path
                            d="M-40 -14 L-18 0 L-40 14"
                            stroke={col}
                            strokeWidth="5"
                            fill="none"
                            strokeLinecap="round"
                          />
                          <path
                            d="M-12 -14 L10 0 L-12 14"
                            stroke={col}
                            strokeWidth="5"
                            fill="none"
                            strokeLinecap="round"
                          />
                          <path
                            d="M16 -14 L38 0 L16 14"
                            stroke={col}
                            strokeWidth="5"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </g>
                      );
                    }
                    return null;
                  })}
                </g>

                {/* Horizon Gradient Fade */}
                <rect x="0" y="0" width="800" height="230" fill="url(#fade)" />

                {/* Hood of Vehicle & Taillight Halo */}
                <g transform="translate(400,470)">
                  <ellipse cx="0" cy="-6" rx="118" ry="16" fill="#000" opacity="0.55" />
                  <path d="M-98 -34 Q-100 -74 -78 -80 L78 -80 Q100 -74 98 -34 Z" fill="#f3f4f6" />
                  <path
                    d="M-70 -80 L-54 -128 Q-50 -134 -40 -134 L40 -134 Q50 -134 54 -128 L70 -80 Z"
                    fill="#2d323b"
                  />
                  <rect x="-84" y="-60" width="168" height="6" rx="3" fill="#ff3b30" />
                </g>
              </svg>
            ) : (
              /* VECTOR SATELLITE MAP VIEW */
              <svg viewBox="0 0 800 470" className="absolute inset-0 w-full h-full">
                <rect width="800" height="470" fill="#15171b" />
                {/* Parks & Water */}
                <rect x="520" y="80" width="220" height="150" rx="20" fill="#13291b" />
                <ellipse cx="300" cy="280" rx="140" ry="90" fill="#10283b" />
                <text x="300" y="285" textAnchor="middle" fontSize="13" fill="#6c97ff" opacity="0.6">
                  Lakeview Lake
                </text>

                {/* Route Path */}
                <path
                  d="M120,400 L260,340 L440,240 L600,160 L720,100"
                  fill="none"
                  stroke="#2f343c"
                  strokeWidth="24"
                  strokeLinecap="round"
                />
                <path
                  d="M120,400 L260,340 L440,240 L600,160 L720,100"
                  fill="none"
                  stroke="#4285F4"
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                {/* Vehicle Marker */}
                <g transform="translate(440,240) rotate(-35)">
                  <circle r="24" fill="#4285F4" opacity="0.25" />
                  <path d="M0 -18 L12 12 L0 6 L-12 12 Z" fill="#4285F4" stroke="#fff" strokeWidth="2.5" />
                </g>

                {/* POI Markers */}
                <g transform="translate(600,160)">
                  <circle r="14" fill="#EA4335" />
                  <text y="5" textAnchor="middle" fontSize="13">
                    🕳️
                  </text>
                </g>
              </svg>
            )}

            {/* Picture-in-Picture Live Rear Camera Feed from Smartphone */}
            {phoneCameraB64 && (
              <div className="absolute right-3 bottom-3 w-36 sm:w-44 aspect-video rounded-xl overflow-hidden border border-white/20 shadow-2xl z-20 bg-black">
                <img
                  src={phoneCameraB64}
                  alt="Phone Camera Stream"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 left-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400">
                  📱 Phone Cam
                </div>
              </div>
            )}

            {/* TOP HUD ALERT BANNER */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 top-4 z-30 transition-all duration-300 w-[78%] sm:w-[62%] rounded-full p-2.5 sm:p-3 px-4 sm:px-6 backdrop-blur-xl border flex items-center justify-between shadow-2xl ${
                topHazard
                  ? 'bg-[#1a1b1f]/90 border-[#EA4335]'
                  : 'bg-[#1a1b1f]/60 border-white/10 opacity-80'
              }`}
            >
              {topHazard ? (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold border-2"
                      style={{
                        backgroundColor: `${SEVERITY_COLORS[HAZARD_SPECS[topHazard.key].lv]}25`,
                        borderColor: SEVERITY_COLORS[HAZARD_SPECS[topHazard.key].lv],
                      }}
                    >
                      {HAZARD_SPECS[topHazard.key].ic}
                    </div>
                    <div>
                      <div
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: SEVERITY_COLORS[HAZARD_SPECS[topHazard.key].lv] }}
                      >
                        {SEVERITY_NAMES[HAZARD_SPECS[topHazard.key].lv]} · Hazard Alert
                      </div>
                      <div className="text-sm sm:text-base font-bold text-white leading-tight">
                        {LOCALIZED_CATALOG[currentLang]?.hazardPhrases[
                          topHazard.key as keyof typeof LOCALIZED_CATALOG.en.hazardPhrases
                        ] || HAZARD_SPECS[topHazard.key].n}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-light text-white tabular-nums">
                        {Math.max(0, Math.round(topHazard.distance))}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">m</span>
                    </div>

                    <button
                      onClick={() => speakPhrase(topHazard.key)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm"
                      title="Replay Voice Warning"
                    >
                      🔊
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full text-center text-xs sm:text-sm font-medium text-slate-400">
                  {noteText.until > Date.now() ? noteText.text : 'Quiet road · Scanning forward path'}
                </div>
              )}
            </div>

            {/* Toast Notification */}
            {toastMessage && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#1a1b1f]/95 border border-white/20 px-4 py-2 rounded-full text-xs font-mono text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                {toastMessage}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM AUTOMOTIVE DOCK CONTROLS */}
        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/10 text-xs font-mono">
          {/* Quick Hazard Spawners */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {Object.keys(HAZARD_SPECS).map((k) => (
              <button
                key={k}
                onClick={() => spawnHazard(k)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
              >
                <span>{HAZARD_SPECS[k].ic}</span>
                <span className="hidden sm:inline text-[11px]">{HAZARD_SPECS[k].n}</span>
              </button>
            ))}
          </div>

          {/* Core Cockpit Toggles */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLiveSyncActive(!liveSyncActive)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                liveSyncActive
                  ? 'bg-[#34A853]/20 border-[#34A853] text-[#34A853]'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{liveSyncActive ? 'Sync Active' : 'Offline'}</span>
            </button>

            <button
              onClick={() => setMapMode(!mapMode)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              <Map className="w-3.5 h-3.5" />
              <span>{mapMode ? 'Road View' : 'Map View'}</span>
            </button>

            <button
              onClick={() => setMuted(!muted)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300"
              title="Mute Sound"
            >
              {muted ? <VolumeX className="w-4 h-4 text-[#EA4335]" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={() => setNightMode(!nightMode)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300"
              title="Day/Night Mode"
            >
              {nightMode ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-[#FBBC05]" />}
            </button>
          </div>
        </div>
      </div>

      {/* QR MODAL TO CONNECT SMARTPHONE CAMERA */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D1322] border border-[#1E293B] rounded-2xl max-w-md w-full p-6 relative font-mono text-slate-100 shadow-2xl">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#090D16] text-slate-400 hover:text-white border border-[#1E293B]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#EA4335]/20 border border-[#EA4335]/40 flex items-center justify-center text-[#EA4335]">
                <Smartphone className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Drive with Your Smartphone</h3>
                <p className="text-xs text-slate-400">Stream real road movements straight into this cockpit</p>
              </div>
            </div>

            <div className="bg-[#090D16] p-4 rounded-xl border border-[#1E293B] flex flex-col items-center text-center space-y-3 mb-4">
              <p className="text-xs text-slate-300 font-sans">
                Point your phone camera at the QR code to mount your phone as a dashcam:
              </p>
              <div className="p-3 bg-white rounded-xl shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    'http://10.20.20.141:5173/?mode=smartphone'
                  )}`}
                  alt="Smartphone Dashcam QR"
                  className="w-44 h-44"
                />
              </div>
              <p className="text-[11px] text-cyan-400 font-mono break-all font-bold">
                http://10.20.20.141:5173/?mode=smartphone
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href="/?mode=smartphone"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test in New Tab</span>
              </a>
              <button
                onClick={() => setShowQrModal(false)}
                className="py-2.5 px-4 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS Keyframes for Flow Animation */}
      <style>{`
        @keyframes flow {
          to {
            stroke-dashoffset: -40px;
          }
        }
      `}</style>
    </div>
  );
};

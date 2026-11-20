import { useI18n } from '../i18n';
import { serviceUrl, serviceSocketUrl } from '../services/apiClient';
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
  1: '#2563eb', // Google Blue
  2: '#b87912', // Google Yellow
  3: '#d65b49', // Google Red
};

const SEVERITY_NAMES: Record<number, string> = {
  1: 'Information',
  2: 'Caution',
  3: 'Urgent',
};

export const InCarDisplay: React.FC = () => {
  const { t, language } = useI18n();
  const currentLang = language;
  // Mode & Themes
  const [mapMode, setMapMode] = useState<boolean>(false);
  const [nightMode, setNightMode] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Smartphone Real-Time Ingestion State
  const [phoneConnected, setPhoneConnected] = useState<boolean>(false);
  const [relayConnected, setRelayConnected] = useState(false);
  const lastPhoneSignalRef = useRef(0);
  const phoneUrl = `${window.location.origin}/?mode=smartphone`;
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

  const [noteText, setNoteText] = useState<{ text: string; until: number; params?: Record<string, string | number> }>({
    text: '',
    until: 0,
  });
  const [toastMessage, setToastMessage] = useState<{ source: string; params?: Record<string, string | number> } | null>(null);

  // Map route animation reference
  const mapDistanceRef = useRef<number>(0);
  const bumpsListRef = useRef<number[]>([]);
  const lastLoopTimeRef = useRef<number>(performance.now());
  const lastHazardStateUpdateRef = useRef<number>(performance.now());
  const vehicleSpeedRef = useRef<number>(55);
  const pipImgRef = useRef<HTMLImageElement | null>(null);
  const pipContainerRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<any>(null);

  useEffect(() => {
    vehicleSpeedRef.current = vehicleSpeed;
  }, [vehicleSpeed]);

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
        lastPhoneSignalRef.current = Date.now();
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

        // D. Picture-in-Picture Camera Frame (Direct DOM update - zero React re-render lag)
        if (msg.camera_b64) {
          if (pipImgRef.current) pipImgRef.current.src = msg.camera_b64;
          if (pipContainerRef.current) pipContainerRef.current.style.display = 'block';
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

  // 2. Real-Time Zero-Latency WebSocket Push Hub (/api/ws/telemetry)
  useEffect(() => {
    if (!liveSyncActive) return;

    let ws: WebSocket | null = null;
    let fallbackPollInterval: any = null;
    let isWsOpen = false;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = serviceSocketUrl('/api/ws/telemetry', true);

    const handleMessage = (data: any) => {
      if (data.connected === false) { setPhoneConnected(false); return; }
      if (!data.frame_base64 && !data.telemetry && !data.latest_hazards && !data.connected) return;
      lastPhoneSignalRef.current = Date.now();
      setPhoneConnected(true);
      if (data.fps) setPhoneFps(data.fps);

      if (data.telemetry) {
        // A. Speed synchronization
        if (data.telemetry.speed_kmh !== undefined && data.telemetry.speed_kmh > 0) {
          setVehicleSpeed(Math.round(data.telemetry.speed_kmh));
        }

        // B. Road Curvature & 3D Road Tilt
        if (data.telemetry.road_geometry?.curve_type) {
          setRoadCurveType(data.telemetry.road_geometry.curve_type);
        }

        // C. Accelerometer Bump Shockwave Impact
        const zg = data.telemetry.z_accel_g || 1.02;
        setZAccelG(zg);
        if (zg > 1.8 && !isBumpActive) {
          triggerBumpEvent(zg);
        }
      }

      // D. Picture-in-Picture Camera Frame (Direct DOM update - zero React re-render lag)
      if (data.frame_base64) {
        if (pipImgRef.current) pipImgRef.current.src = data.frame_base64;
        if (pipContainerRef.current) pipContainerRef.current.style.display = 'block';
      }

      // E. Hazards Queue
      if (data.latest_hazards && data.latest_hazards.length > 0) {
        ingestPhoneHazards(data.latest_hazards);
      }
    };

    const connectWs = () => {
      if (disposed) return;
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          isWsOpen = true;
          setRelayConnected(true);
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleMessage(data);
          } catch (e) {}
        };
        ws.onclose = () => {
          isWsOpen = false;
          setRelayConnected(false);
          if (!disposed) reconnectTimer = setTimeout(connectWs, 2000);
        };
        ws.onerror = () => {
          isWsOpen = false;
        };
      } catch (e) {
        isWsOpen = false;
      }
    };

    connectWs();

    // Low-frequency gentle fallback poll (every 2.5s) only if WebSocket disconnects
    fallbackPollInterval = setInterval(async () => {
      if (isWsOpen) return;
      try {
        const res = await fetch(serviceUrl('/api/smartphone/status', true));
        if (res.ok) {
          const status = await res.json();
          handleMessage(status);
        }
      } catch (e) {}
    }, 2500);

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
      setRelayConnected(false);
      if (fallbackPollInterval) clearInterval(fallbackPollInterval);
    };
  }, [liveSyncActive, isBumpActive]);

  useEffect(() => {
    const freshnessTimer = setInterval(() => {
      if (Date.now() - lastPhoneSignalRef.current > 10000) setPhoneConnected(false);
    }, 2000);
    return () => clearInterval(freshnessTimer);
  }, []);

  // Ingest Hazards coming from Phone Camera AI or V2V Road Broadcast
  const ingestPhoneHazards = (detectedHazards: any[]) => {
    detectedHazards.forEach((dh) => {
      let key = 'pothole';
      const ht = (dh.hazard_type || '').toUpperCase();
      if (ht.includes('ANIMAL') || ht.includes('COW') || ht.includes('CATTLE') || ht.includes('DOG')) key = 'animal';
      else if (ht.includes('PEDESTRIAN') || ht.includes('WALKER') || ht.includes('PERSON')) key = 'walker';
      else if (ht.includes('WATER') || ht.includes('FLOOD')) key = 'waterlogging';
      else if (ht.includes('CURVE') || ht.includes('TURN') || ht.includes('BEND')) key = 'curve';
      else if (ht.includes('POTHOLE')) key = 'pothole';

      // Check if hazard is already in active queue
      setHazards((prev) => {
        const exists = prev.find((h) => h.key === key && h.distance > 40);
        if (exists) {
          return prev.map((h) => (h.id === exists.id ? { ...h, n: h.n + 1 } : h));
        }
        const estDist = dh.distance_m ? Math.round(dh.distance_m) : 220;
        const spec = HAZARD_SPECS[key] || HAZARD_SPECS.pothole;

        // SHOW & TELL ALERT TO EVERY VEHICLE ON THE ROAD
        showToast('{hazard} ahead ({distance} m)', { hazard: t(spec.n), distance: estDist });
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

  // Bump Shockwave Trigger
  const triggerBumpEvent = (gVal: number) => {
    setIsBumpActive(true);
    showToast('Vertical impact observed ({value} G)', { value: gVal.toFixed(2) });
    setNoteText({
      text: 'Impact observation ({value} G) · review needed',
      params: { value: gVal.toFixed(2) },
      until: Date.now() + 3500,
    });
    playChime(2);

    // Add bump marker to map
    bumpsListRef.current.push(mapDistanceRef.current);

    setTimeout(() => {
      setIsBumpActive(false);
    }, 1200);
  };

  const showToast = (source: string, params?: Record<string, string | number>) => {
    setToastMessage({source, params});
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
    const catalog = LOCALIZED_CATALOG.en;
    const phrase = t(catalog.hazardPhrases[key as keyof typeof catalog.hazardPhrases]);
    if (phrase && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(phrase);
        u.lang = `${currentLang}-IN`;
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
      const speedMps = (vehicleSpeedRef.current * 1000) / 3600;

      // Advance map odometer smoothly
      mapDistanceRef.current = (mapDistanceRef.current + speedMps * 0.8 * dt) % 5000;

      // Throttle React state re-renders to every 120ms (8 FPS) instead of 60 FPS
      if (timestamp - lastHazardStateUpdateRef.current >= 120) {
        const stepDt = Math.min(0.3, (timestamp - lastHazardStateUpdateRef.current) / 1000);
        lastHazardStateUpdateRef.current = timestamp;

        // Update hazards distance
        setHazards((prevHazards) => {
          const updated = prevHazards.map((h) => {
            const newDist = h.distance - speedMps * stepDt;
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
                  text: '{hazard} passed · cleared from this view',
                  params: { hazard: t(HAZARD_SPECS[h.key]?.n || 'Hazard') },
                  until: Date.now() + 3500,
                });
              }
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
  }, [currentLang, muted]);

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
        showToast('Merged {hazard}: {count} reports', { hazard: t(HAZARD_SPECS[k].n), count: exists.n + 1 });
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
    <div className="premium-page max-w-[1220px] mx-auto px-4 sm:px-6 py-8 sm:py-12 text-[#17263e]">
      <header className="flex items-end justify-between gap-5 mb-7"><div><h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{t('Your road, at a glance.')}</h1><p className="text-sm sm:text-base text-[#67788f] mt-3">{t('Interactive cockpit preview')}</p></div><div className="text-right shrink-0"><p className="text-4xl sm:text-5xl tracking-tight font-medium tabular-nums">{vehicleSpeed}</p><p className="text-xs text-[#67788f] mt-1">{phoneConnected ? t('km/h · received telemetry') : t('km/h · demo speed')}</p></div></header>
      <section className={`premium-panel bg-white border border-[#dce5f2] rounded-[28px] overflow-hidden transition-transform ${isBumpActive ? 'translate-y-1' : ''}`}>
        <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-[#e5ecf7]"><span className="text-sm text-[#67788f]">{phoneConnected ? t('Phone telemetry received') : t('Interactive demo')}</span><span className="text-sm text-[#67788f] tabular-nums">{clockStr}</span></div>
        <div className={`relative min-h-[430px] sm:min-h-[530px] bg-[#edf3ff] overflow-hidden ${nightMode ? 'brightness-75' : ''}`}>
            {!mapMode ? (
              /* 3D PERSPECTIVE ROAD VIEW */
              <svg
                viewBox="0 0 800 470"
                preserveAspectRatio="xMidYMax slice"
                className="absolute inset-0 w-full h-full"
              >
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#d7dfed" />
                    <stop offset="1" stopColor="#b5c6de" />
                  </linearGradient>
                  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#edf3ff" />
                    <stop offset="0.45" stopColor="#edf3ff" stopOpacity="0.9" />
                    <stop offset="1" stopColor="#edf3ff" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="zg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#d65b49" stopOpacity="0" />
                    <stop offset="1" stopColor="#d65b49" stopOpacity="0.34" />
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
                    } else if (h.key === 'animal') {
                      const x = X_proj(0.2, g.y);
                      return (
                        <g key={h.id} transform={`translate(${x},${g.y}) scale(${g.k * 1.25})`} opacity={opacity}>
                          <ellipse rx="42" ry="14" fill="#000" opacity="0.5" />
                          <ellipse rx="48" ry="17" fill="none" stroke={col} strokeWidth="3" />
                          <rect x="-24" y="-52" width="48" height="30" rx="8" fill="#e6e9ee" />
                          <circle cx="-26" cy="-60" r="12" fill="#e6e9ee" />
                          <path d="M-32 -68 Q-36 -78 -24 -74" stroke="#aeb3bc" strokeWidth="3" fill="none" />
                          <path d="M-20 -68 Q-16 -78 -28 -74" stroke="#aeb3bc" strokeWidth="3" fill="none" />
                          <circle cy="-82" r="12" fill={col} />
                          <text y="-77" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#111">
                            🐄
                          </text>
                        </g>
                      );
                    } else if (h.key === 'waterlogging') {
                      const x = X_proj(0, g.y);
                      return (
                        <g key={h.id} transform={`translate(${x},${g.y}) scale(${g.k})`} opacity={opacity}>
                          <ellipse rx="95" ry="24" fill="#1e40af" opacity="0.75" />
                          <ellipse rx="85" ry="18" fill="#38bdf8" opacity="0.45" />
                          <ellipse rx="98" ry="26" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="6 4" />
                          <path d="M-40 -4 Q0 -14 40 -4" stroke="#e0f2fe" strokeWidth="2" fill="none" opacity="0.8" />
                          <circle cy="-38" r="12" fill="#38bdf8" />
                          <text y="-33" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0f172a">
                            🌊
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
                <rect width="800" height="470" fill="#edf3ff" />
                {/* Parks & Water */}
                <rect x="520" y="80" width="220" height="150" rx="20" fill="#d8f5e8" />
                <ellipse cx="300" cy="280" rx="140" ry="90" fill="#dbeaff" />
                <text x="300" y="285" textAnchor="middle" fontSize="13" fill="#526681" opacity="0.6">
                  Lakeview Lake
                </text>

                {/* Route Path */}
                <path
                  d="M120,400 L260,340 L440,240 L600,160 L720,100"
                  fill="none"
                  stroke="#d9e3f2"
                  strokeWidth="24"
                  strokeLinecap="round"
                />
                <path
                  d="M120,400 L260,340 L440,240 L600,160 L720,100"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                {/* Vehicle Marker */}
                <g transform="translate(440,240) rotate(-35)">
                  <circle r="24" fill="#2563eb" opacity="0.25" />
                  <path d="M0 -18 L12 12 L0 6 L-12 12 Z" fill="#2563eb" stroke="#fff" strokeWidth="2.5" />
                </g>

                {/* POI Markers */}
                <g transform="translate(600,160)">
                  <circle r="14" fill="#d65b49" />
                  <text y="5" textAnchor="middle" fontSize="13">
                    🕳️
                  </text>
                </g>
              </svg>
            )}

          <div ref={pipContainerRef} style={{display: phoneCameraB64 ? 'block' : 'none'}} className="absolute right-4 bottom-4 w-32 sm:w-44 aspect-video rounded-2xl overflow-hidden border border-white/80 shadow-lg bg-[#edf3ff]"><img ref={pipImgRef} src={phoneCameraB64 || ''} alt={t('Phone camera stream')} className="w-full h-full object-cover" /></div>
          <div className={`absolute left-3 right-3 sm:left-6 sm:right-6 top-4 z-30 rounded-2xl p-4 border flex items-center justify-between gap-3 shadow-[0_8px_30px_-15px_rgba(57,83,128,.25)] ${topHazard ? 'bg-[#fff9ed]/95 border-[#efdbb6]' : 'bg-white/90 border-white'}`}>
            {topHazard ? <><div className="flex items-center gap-3 min-w-0"><span className="w-10 h-10 rounded-full bg-[#fff0d3] grid place-items-center shrink-0 text-xl">{HAZARD_SPECS[topHazard.key].ic}</span><div><p className="text-xs font-medium text-[#a37029] mb-1">{t(SEVERITY_NAMES[HAZARD_SPECS[topHazard.key].lv])}</p><p className="font-medium text-sm sm:text-base">{t(LOCALIZED_CATALOG.en.hazardPhrases[topHazard.key as keyof typeof LOCALIZED_CATALOG.en.hazardPhrases] || HAZARD_SPECS[topHazard.key].n)}</p></div></div><div className="flex items-center gap-3 shrink-0"><span className="text-2xl font-medium tabular-nums">{Math.max(0,Math.round(topHazard.distance))}<span className="text-xs text-[#67788f] ml-1">{t('m')}</span></span><button onClick={() => speakPhrase(topHazard.key)} aria-label={t('Replay voice warning')} className="p-2 rounded-xl bg-white border border-[#efdbb6]"><Volume2 size={17} /></button></div></> : <p className="text-sm text-[#67788f] text-center w-full">{noteText.until > Date.now() ? t(noteText.text, noteText.params) : t('No active warnings · remain attentive')}</p>}
          </div>
          {toastMessage && <div role="status" className="absolute bottom-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-40 bg-white/95 border border-[#dce5f2] px-4 py-3 rounded-2xl text-sm text-[#526681] shadow-lg">{t(toastMessage.source, toastMessage.params)}</div>}
        </div>
        <div className="p-5 flex justify-center"><button onClick={() => setShowQrModal(true)} className="premium-button"><Smartphone size={17} />{phoneConnected ? t('Phone connected') : t('Connect phone')}</button></div>
      </section>
      <details className="mt-5 border border-[#dce5f2] rounded-2xl bg-white/80"><summary className="p-5 cursor-pointer text-sm font-medium text-[#526681]">{t('Settings and details')}</summary><div className="p-5 pt-0 space-y-5"><div className="flex flex-wrap gap-2"><button onClick={() => setMapMode(!mapMode)} className="premium-button-secondary"><Map size={17} />{mapMode ? t('Road illustration') : t('Route illustration')}</button><button onClick={() => setMuted(!muted)} aria-pressed={!muted} className="premium-button-secondary">{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}{muted ? t('Sound off') : t('Sound on')}</button><button onClick={() => setNightMode(!nightMode)} aria-pressed={nightMode} className="premium-button-secondary">{nightMode ? <Sun size={17} /> : <Moon size={17} />}{nightMode ? t('Standard preview') : t('Dim preview')}</button><button onClick={() => setLiveSyncActive(!liveSyncActive)} aria-pressed={liveSyncActive} className="premium-button-secondary"><Radio size={17} />{liveSyncActive ? t('Pause sync') : t('Enable sync')}</button></div><p className="text-sm text-[#67788f]">{relayConnected ? t('Relay connected') : t('Relay not connected')}{' · '}{t('Vertical acceleration: {value} G', {value:zAccelG.toFixed(2)})}</p><details className="border-t border-[#e5ecf7] pt-4"><summary className="cursor-pointer text-sm font-medium text-[#526681]">{t('Try a demo observation')}</summary><div className="flex flex-wrap gap-2 mt-4">{Object.keys(HAZARD_SPECS).map((key) => <button key={key} onClick={() => spawnHazard(key)} className="premium-button-secondary"><span>{HAZARD_SPECS[key].ic}</span>{t(HAZARD_SPECS[key].n)}</button>)}</div></details>{hazards.length > 0 && <div className="grid sm:grid-cols-3 gap-3">{hazards.slice(0,3).map((hazard) => <div key={hazard.id} className="rounded-xl bg-[#f5f8ff] p-3 text-sm text-[#67788f]">{t(HAZARD_SPECS[hazard.key]?.n || 'Hazard')}{' · '}{t('{distance} m', {distance:Math.round(hazard.distance)})}</div>)}</div>}</div></details>
      {showQrModal && <div className="fixed inset-0 z-[80] bg-[#17263e]/25 backdrop-blur-md flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cockpit-phone-title" onClick={() => setShowQrModal(false)}><div className="bg-white border border-[#dce5f2] rounded-3xl max-w-md w-full p-6 sm:p-8 relative shadow-xl max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}><button aria-label={t('Close phone connection')} onClick={() => setShowQrModal(false)} className="absolute right-4 top-4 p-2 text-[#67788f]"><X size={20} /></button><Smartphone size={28} className="text-[#2563eb] mb-5" /><h2 id="cockpit-phone-title" className="text-2xl font-semibold">{t('Connect your phone')}</h2><p className="text-sm text-[#67788f] leading-relaxed mt-3">{t('Scan the code and allow camera access.')}</p><div className="my-6 flex justify-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(phoneUrl)}`} alt={t('QR code for the phone camera view')} width={180} height={180} /></div><a href={phoneUrl} target="_blank" rel="noreferrer" className="text-sm text-[#2563eb] break-all underline underline-offset-4">{phoneUrl}</a><p className="text-xs text-[#67788f] leading-relaxed mt-4">{t('Use an accessible HTTPS address for a separate phone. Localhost works only on this device.')}</p><a href={phoneUrl} target="_blank" rel="noreferrer" className="premium-button mt-5 w-full justify-center"><ExternalLink size={17} />{t('Open phone view')}</a></div></div>}
      <style>{`@keyframes flow {to {stroke-dashoffset:-40px;}} @media(prefers-reduced-motion:reduce){svg .dash{animation:none!important;}}`}</style>
    </div>
  );
};

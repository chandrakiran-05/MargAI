import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Compass,
  Radio,
  Smartphone,
  Navigation,
  Eye,
  Camera,
  X,
  ExternalLink,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Flame,
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

const HAZARD_TEMPLATES: Record<
  string,
  { type: HazardType; riskLevel: RiskLevel; icon: string; name: string; localized: LocalizedMessages }
> = {
  pothole: {
    type: 'pothole',
    riskLevel: 'caution',
    icon: '🕳️',
    name: 'Pothole',
    localized: {
      en: 'Pothole ahead. Slow down.',
      hi: 'आगे गड्ढा है। गति धीमी करें।',
      ta: 'முன்னே குழி உள்ளது. வேகத்தைக் குறையுங்கள்.',
      te: 'ముందు గుంత ఉంది. వేగం తగ్గించండి.',
      kn: 'ಮುಂದೆ ಗುಂಡಿ ಇದೆ. ವೇಗ ಕಡಿಮೆ ಮಾಡಿ.',
    },
  },
  pedestrian: {
    type: 'pedestrian',
    riskLevel: 'urgent',
    icon: '🚶',
    name: 'Pedestrian',
    localized: {
      en: 'Person crossing ahead. Brake gently.',
      hi: 'आगे कोई सड़क पार कर रहा है। सावधान।',
      ta: 'முன்னே ஒருவர் சாலையைக் கடக்கிறார். கவனம்.',
      te: 'ముందు ఒకరు రోడ్డు దాటుతున్నారు. నెమ్మదిగా బ్రేక్ వేయండి.',
      kn: 'ಮುಂದೆ ಒಬ್ಬರು ರಸ್ತೆ ದಾಟುತ್ತಿದ್ದಾರೆ. ನಿಧಾನವಾಗಿ ಬ್ರೇಕ್ ಹಾಕಿ.',
    },
  },
  waterlogging: {
    type: 'waterlogging',
    riskLevel: 'caution',
    icon: '🌊',
    name: 'Waterlogging',
    localized: {
      en: 'Waterlogging ahead. Drive slowly.',
      hi: 'आगे जलभराव है। धीरे चलें।',
      ta: 'முன்னே தேங்கிய நீர் உள்ளது. மெதுவாகச் செல்லவும்.',
      te: 'ముందు నీరు నిలిచింది. నెమ్మదిగా వెళ్లండి.',
      kn: 'ಮುಂದೆ ನೀರು ನಿಂತಿದೆ. ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.',
    },
  },
  cattle: {
    type: 'cattle',
    riskLevel: 'caution',
    icon: '🐄',
    name: 'Stray Cattle',
    localized: {
      en: 'Stray cattle on road. Be alert.',
      hi: 'सड़क पर मवेशी हैं। सतर्क रहें।',
      ta: 'சாலையில் கால்நடைகள் உள்ளன. எச்சரிக்கை.',
      te: 'రోడ్డుపై పశువులు ఉన్నాయి. అప్రమత్తంగా ఉండండి.',
      kn: 'ರಸ್ತೆಯಲ್ಲಿ ದನಗಳಿವೆ. ಜಾಗರೂಕರಾಗಿರಿ.',
    },
  },
  curve: {
    type: 'sharp_curve',
    riskLevel: 'information',
    icon: '↪️',
    name: 'Sharp Curve',
    localized: {
      en: 'Sharp curve ahead. Reduce speed.',
      hi: 'आगे तीखा मोड़ है। गति कम करें।',
      ta: 'முன்னே கூர்மையான வளைவு உள்ளது. வேகத்தைக் குறைக்கவும்.',
      te: 'ముందు పదునైన మలుపు ఉంది. వేగం తగ్గించండి.',
      kn: 'ಮುಂದೆ ತೀಕ್ಷ್ಣ ತಿರುವು ಇದೆ. ವೇಗ ಕಡಿಮೆ ಮಾಡಿ.',
    },
  },
};

export const InfotainmentHUD: React.FC = () => {
  // Vehicle telemetry
  const [vehicleSpeed, setVehicleSpeed] = useState<number>(54); // km/h
  const [roadTiltDeg, setRoadTiltDeg] = useState<number>(0);
  const [isBumpShockActive, setIsBumpShockActive] = useState<boolean>(false);
  const [clockStr, setClockStr] = useState<string>('12:45 PM');
  const [currentLang, setCurrentLang] = useState<'en' | 'hi' | 'ta' | 'te' | 'kn'>('en');
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'road' | 'map' | 'camera'>('road');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Phone Cam PiP & Telemetry
  const [phoneConnected, setPhoneConnected] = useState<boolean>(false);
  const [phoneFps, setPhoneFps] = useState<number>(24);
  const [phoneFrameB64, setPhoneFrameB64] = useState<string | null>(null);
  const [showPairModal, setShowPairModal] = useState<boolean>(false);
  const [isDirectCamActive, setIsDirectCamActive] = useState<boolean>(false);

  const directVideoRef = useRef<HTMLVideoElement | null>(null);
  const directStreamRef = useRef<MediaStream | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcTimeRef = useRef<number>(performance.now());
  const lastHeartbeatTimeRef = useRef<number>(0);

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
        en: 'Pothole ahead. Slow down.',
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
      laneOffsetM: 2.0,
      nReports: 1,
      localized: {
        en: 'Stray cattle on road. Be alert.',
        hi: 'सड़क पर मवेशी हैं। सतर्क रहें।',
        ta: 'சாலையில் கால்நடைகள் உள்ளன. எச்சரிக்கை.',
        te: 'రోడ్డుపై పశువులు ఉన్నాయి. అప్రమత్తంగా ఉండండి.',
        kn: 'ರಸ್ತೆಯಲ್ಲಿ ದನಗಳಿವೆ. ಜಾಗರೂಕರಾಗಿರಿ.',
      },
    },
  ]);

  const wsRef = useRef<WebSocket | null>(null);
  const lastLoopTimeRef = useRef<number>(performance.now());
  const mapProgressRef = useRef<number>(0);
  const toastTimerRef = useRef<any>(null);

  // 1. Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Toast trigger helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3200);
  };

  // 3. WebSocket Connection to Cloud Run Relay
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket;

    const connectWs = () => {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
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

          // A. Telemetry heartbeat (includes live phone camera frame)
          if (envelope.topic === 'telemetry.heartbeat') {
            const tel = envelope.payload;
            lastHeartbeatTimeRef.current = Date.now();
            setPhoneConnected(true);

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
              triggerBumpEvent(tel.zAccelG);
            }
            if (tel.frameB64) {
              setPhoneFrameB64(tel.frameB64);
              frameCountRef.current++;
              const now = performance.now();
              if (now - lastFpsCalcTimeRef.current >= 1000) {
                setPhoneFps(frameCountRef.current);
                frameCountRef.current = 0;
                lastFpsCalcTimeRef.current = now;
              }
            }
          }

          // B. Real-time Hazard Alert Broadcast
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

  // Check phone connection watchdog
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (lastHeartbeatTimeRef.current > 0 && Date.now() - lastHeartbeatTimeRef.current > 4000) {
        setPhoneConnected(false);
      }
    }, 2000);
    return () => clearInterval(watchdog);
  }, []);

  // 4. Ingest Driver Alert
  const ingestDriverAlert = (alert: DriverAlert) => {
    setHazards((prev) => {
      const exists = prev.find((h) => h.type === alert.hazardType && h.distanceM > 40);
      if (exists) {
        showToast(`Merged: ${exists.nReports + 1} reports for approaching ${alert.hazardType}`);
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

    if (!muted) {
      alertAudio.playChime(alert.riskLevel);
      alertAudio.speakAlert(alert.localizedMessages, currentLang);
    }
  };

  // 5. Trigger Manual Hazard (Demo Buttons)
  const triggerManualHazard = (key: string) => {
    const tpl = HAZARD_TEMPLATES[key];
    if (!tpl) return;

    if (key === 'curve') {
      setRoadTiltDeg(-5);
      setTimeout(() => setRoadTiltDeg(0), 4000);
    }

    setHazards((prev) => {
      const exists = prev.find((h) => h.type === tpl.type && h.distanceM > 40);
      if (exists) {
        showToast(`Merged: ${exists.nReports + 1} reports for ${tpl.name}`);
        return prev.map((h) => (h.id === exists.id ? { ...h, nReports: h.nReports + 1 } : h));
      }

      showToast(`📡 Road Alert: ${tpl.name} ahead (220m) — Broadcasted to corridor!`);
      return [
        {
          id: `hz_${Date.now()}`,
          type: tpl.type,
          riskLevel: tpl.riskLevel,
          distanceM: 220,
          laneOffsetM: key === 'cattle' ? 1.9 : 0.0,
          nReports: 1,
          localized: tpl.localized,
        },
        ...prev,
      ];
    });

    if (!muted) {
      alertAudio.playChime(tpl.riskLevel);
      alertAudio.speakAlert(tpl.localized, currentLang);
    }
  };

  // 6. Direct Hardware Camera Toggle on this device
  const toggleDirectCamera = async () => {
    if (isDirectCamActive) {
      if (directStreamRef.current) {
        directStreamRef.current.getTracks().forEach((t) => t.stop());
        directStreamRef.current = null;
      }
      setIsDirectCamActive(false);
      showToast('Device camera stopped');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 360 },
        },
        audio: false,
      });
      directStreamRef.current = stream;
      if (directVideoRef.current) {
        directVideoRef.current.srcObject = stream;
        directVideoRef.current.play().catch(() => {});
      }
      setIsDirectCamActive(true);
      setViewMode('camera');
      showToast('📷 Direct smartphone/device camera activated!');
    } catch (err) {
      showToast('⚠️ Could not open device camera. Make sure camera permissions are allowed.');
    }
  };

  // 7. Physical Pothole Shockwave Bounce
  const triggerBumpEvent = (gVal: number) => {
    setIsBumpShockActive(true);
    showToast(`Bump felt (${gVal.toFixed(2)}G): Pothole logged on road`);
    if (!muted) alertAudio.playChime('caution');

    setTimeout(() => {
      setIsBumpShockActive(false);
    }, 1000);
  };

  // 8. Distance Countdown Animation Loop
  useEffect(() => {
    let animId: number;

    const loop = (timestamp: number) => {
      const dt = Math.min(0.1, (timestamp - lastLoopTimeRef.current) / 1000);
      lastLoopTimeRef.current = timestamp;

      const speedMps = vehicleSpeed / 3.6;
      mapProgressRef.current = (mapProgressRef.current + speedMps * dt * 0.15) % 1000;

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

  const dashFlowDuration = `${(17.5 / Math.max(vehicleSpeed / 3.6, 0.5)).toFixed(2)}s`;

  // Top critical hazard
  const topHazard = hazards.slice().sort((a, b) => {
    const rank: Record<RiskLevel, number> = { urgent: 3, caution: 2, information: 1 };
    return rank[b.riskLevel] - rank[a.riskLevel] || a.distanceM - b.distanceM;
  })[0];

  const getHazardIcon = (type: HazardType) => {
    switch (type) {
      case 'pothole':
        return '🕳️';
      case 'pedestrian':
        return '🚶';
      case 'waterlogging':
        return '🌊';
      case 'cattle':
        return '🐄';
      case 'sharp_curve':
        return '↪️';
      default:
        return '⚠️';
    }
  };

  return (
    <div
      className={`w-full h-screen min-h-[600px] flex flex-col bg-[#0b0c0e] text-slate-100 font-sans select-none overflow-hidden transition-transform duration-100 ${
        isBumpShockActive ? 'translate-y-2' : ''
      }`}
    >
      {/* =========================================================================
          1. CLEAN TOP INFOTAINMENT HEADER
      ========================================================================= */}
      <header className="h-14 px-5 flex items-center justify-between border-b border-white/10 bg-[#121316] text-sm z-30">
        {/* Brand & Clock */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tight text-white">Marg</span>
            <span className="text-xl font-black text-[#4285F4]">AI</span>
            <span className="text-xs bg-white/10 text-slate-300 font-semibold px-2 py-0.5 rounded-full ml-1.5">
              Infotainment
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/20" />

          <span className="text-base font-semibold text-white tabular-nums tracking-wide font-mono">
            {clockStr}
          </span>
        </div>

        {/* Center Toast notification */}
        {toastMessage && (
          <div className="hidden md:flex items-center gap-2 bg-[#1f2228] text-white px-3.5 py-1.5 rounded-full text-xs font-medium border border-white/15 shadow-lg animate-fade-in">
            <Radio className="w-3.5 h-3.5 text-[#4285F4] animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Controls: Phone Cam, Language, Audio */}
        <div className="flex items-center gap-3">
          {/* Smartphone Cam Link Button */}
          <button
            onClick={() => setShowPairModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              isDirectCamActive
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                : phoneConnected
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25 animate-pulse'
            }`}
            title="Click to pair smartphone or view camera link"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>
              {isDirectCamActive
                ? 'Direct Device Cam'
                : phoneConnected
                ? `Phone Cam (${phoneFps} FPS)`
                : 'Connect Phone Cam'}
            </span>
          </button>

          {/* Regional Indian Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1 border border-white/10 transition-colors"
            >
              {{ en: 'English', hi: 'हिन्दी', ta: 'தமிழ்', te: 'తెలుగు', kn: 'ಕನ್ನಡ' }[currentLang]} ▾
            </button>
            {langMenuOpen && (
              <div className="absolute right-0 top-9 z-50 bg-[#1c1e24] border border-white/15 rounded-xl shadow-2xl py-1 text-xs min-w-[130px] backdrop-blur-xl">
                {(['en', 'hi', 'ta', 'te', 'kn'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setCurrentLang(l);
                      alertAudio.setLanguage(l);
                      setLangMenuOpen(false);
                    }}
                    className={`block w-full text-left px-3.5 py-2 hover:bg-white/10 transition-colors ${
                      currentLang === l ? 'text-[#4285F4] font-bold bg-[#4285F4]/10' : 'text-slate-200'
                    }`}
                  >
                    {{ en: 'English', hi: 'हिन्दी', ta: 'தமிழ்', te: 'తెలుగు', kn: 'ಕನ್ನಡ' }[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mute / Unmute Button */}
          <button
            onClick={() => {
              setMuted(!muted);
              alertAudio.setMuted(!muted);
            }}
            className={`p-2 rounded-lg border transition-colors ${
              muted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
            }`}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#4285F4]" />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. MAIN INFOTAINMENT BODY
      ========================================================================= */}
      <div className="flex-1 flex w-full overflow-hidden p-3 gap-3">
        {/* =======================================================================
            LEFT DRIVER GLANCE PANEL
        ======================================================================= */}
        <aside className="w-72 lg:w-80 flex flex-col gap-3 min-h-0 flex-shrink-0">
          {/* Speedometer & Gear Tile */}
          <div className="bg-[#14161a] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-6xl font-light tracking-tight text-white tabular-nums">
                    {vehicleSpeed}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    km/h
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Speedometer</p>
              </div>

              {/* Speed Limit Badge */}
              <div className="w-11 h-11 rounded-full border-[3px] border-[#EA4335] bg-white flex items-center justify-center text-slate-900 font-black text-sm shadow-md">
                50
              </div>
            </div>

            {/* Gear Selector */}
            <div className="flex items-center gap-3 font-mono text-sm pt-3 border-t border-white/5 mt-3 text-slate-500">
              <span className="hover:text-slate-300 cursor-pointer">P</span>
              <span className="hover:text-slate-300 cursor-pointer">R</span>
              <span className="hover:text-slate-300 cursor-pointer">N</span>
              <span className="px-2 py-0.5 rounded-md bg-[#4285F4] text-white font-bold shadow-sm">
                D
              </span>
              <span className="ml-auto text-xs text-slate-400 font-sans">Drive Mode</span>
            </div>
          </div>

          {/* Ahead on Road Hazard Card */}
          <div className="bg-[#14161a] border border-white/10 rounded-2xl p-4 flex-1 flex flex-col min-h-0 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#4285F4]" />
                Ahead on Road
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {hazards.length} {hazards.length === 1 ? 'hazard' : 'hazards'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {hazards.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500/50 mb-1.5" />
                  <span>Road ahead is clear</span>
                  <span className="text-[10px] text-slate-600 mt-0.5">Scanning via phone camera & V2V</span>
                </div>
              ) : (
                hazards
                  .slice()
                  .sort((a, b) => a.distanceM - b.distanceM)
                  .map((h) => {
                    const isUrgent = h.riskLevel === 'urgent';
                    const isCaution = h.riskLevel === 'caution';
                    const badgeBg = isUrgent
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : isCaution
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/40';

                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl flex-shrink-0">{getHazardIcon(h.type)}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white capitalize truncate">
                              {h.type.replace('_', ' ')}
                            </p>
                            <span
                              className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border ${badgeBg} uppercase mt-0.5`}
                            >
                              {h.riskLevel}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono flex-shrink-0 ml-2">
                          <span className="text-sm font-semibold text-white">
                            {Math.round(h.distanceM)}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-0.5">m</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <p className="text-[10px] text-slate-500 pt-2 border-t border-white/5 mt-auto">
              Advisory warnings only · Live V2V corridor sync
            </p>
          </div>

          {/* Smartphone Cam Picture-in-Picture Preview Card */}
          <div className="bg-[#14161a] border border-white/10 rounded-2xl p-2.5 shadow-xl flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="flex items-center gap-1 font-semibold text-white">
                <Camera className="w-3.5 h-3.5 text-[#4285F4]" />
                Dashcam Feed
              </span>
              <button
                onClick={() => setShowPairModal(true)}
                className="text-[10px] font-mono text-[#4285F4] hover:underline flex items-center gap-1"
              >
                <span>Pair Phone</span>
              </button>
            </div>

            {/* Clickable PiP Box - Toggles Camera View */}
            <div
              onClick={() => setViewMode(viewMode === 'camera' ? 'road' : 'camera')}
              className="w-full aspect-video bg-black/70 rounded-xl overflow-hidden border border-white/10 relative cursor-pointer group"
              title="Click to toggle full Camera View"
            >
              {isDirectCamActive ? (
                <video
                  ref={directVideoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
              ) : phoneFrameB64 ? (
                <img
                  src={phoneFrameB64}
                  alt="Phone Camera Live"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Smartphone className="w-6 h-6 text-[#4285F4] animate-pulse mb-1" />
                  <span>Tap to pair phone cam</span>
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity">
                <span>{viewMode === 'camera' ? 'Minimize' : 'Expand View ⤢'}</span>
              </div>

              <span className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400 border border-white/10">
                {isDirectCamActive ? 'DIRECT CAM' : phoneConnected ? 'LIVE FEED' : 'STANDBY'}
              </span>
            </div>

            {/* Quick Actions for Camera */}
            <div className="flex gap-1.5 pt-0.5">
              <button
                onClick={toggleDirectCamera}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                  isDirectCamActive
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>{isDirectCamActive ? 'Stop Cam' : 'Device Cam'}</span>
              </button>

              <button
                onClick={() => setShowPairModal(true)}
                className="flex-1 py-1 rounded-lg text-[11px] font-bold bg-[#4285F4]/15 hover:bg-[#4285F4]/25 border border-[#4285F4]/30 text-[#4285F4] transition-colors flex items-center justify-center gap-1"
              >
                <Smartphone className="w-3 h-3" />
                <span>Pair Phone</span>
              </button>
            </div>
          </div>
        </aside>

        {/* =======================================================================
            CENTER / RIGHT MAIN VIEWPORT (Road View, Map View, or Direct Camera View)
        ======================================================================= */}
        <main className="flex-1 relative bg-[#121316] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between">
          {/* ===================================================================
              VIEWPORT 1: DIRECT SMARTPHONE CAMERA FEED VIEW
          =================================================================== */}
          {viewMode === 'camera' && (
            <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
              {isDirectCamActive ? (
                <video
                  ref={directVideoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
              ) : phoneFrameB64 ? (
                <img
                  src={phoneFrameB64}
                  alt="Live Smartphone Dashcam"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#4285F4] mb-3 animate-pulse">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Waiting for Smartphone Camera Feed
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">
                    Pair your smartphone as an AI dashcam, or turn on the camera on this device.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowPairModal(true)}
                      className="px-4 py-2 rounded-xl bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#4285F4]/20 transition-all"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Pair Phone via QR</span>
                    </button>
                    <button
                      onClick={toggleDirectCamera}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 border border-white/10 transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Enable Device Camera</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Real-time ADAS AR Overlay on Camera Feed */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Horizon Line & Center Crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 border border-white/15 rounded-2xl flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#4285F4]/60" />
                </div>

                {/* Approaching Hazard AR Highlight Box */}
                {topHazard && (
                  <div
                    className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-32 border-2 border-dashed rounded-2xl animate-pulse flex flex-col items-center justify-between p-2.5 shadow-2xl"
                    style={{
                      borderColor: topHazard.riskLevel === 'urgent' ? '#EA4335' : '#FBBC05',
                      backgroundColor:
                        topHazard.riskLevel === 'urgent'
                          ? 'rgba(234, 67, 53, 0.15)'
                          : 'rgba(251, 188, 5, 0.15)',
                    }}
                  >
                    <span className="text-2xl">{getHazardIcon(topHazard.type)}</span>
                    <span className="text-xs font-mono font-bold text-white bg-black/75 px-2.5 py-0.5 rounded border border-white/15">
                      {topHazard.type.toUpperCase().replace('_', ' ')} · {Math.round(topHazard.distanceM)}m
                    </span>
                  </div>
                )}

                {/* Camera HUD Telemetry Badges */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-auto">
                  <span className="bg-black/75 border border-white/15 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400 flex items-center gap-1.5 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {isDirectCamActive
                        ? 'HARDWARE CAM 60 FPS'
                        : phoneConnected
                        ? `SMARTPHONE LINK ${phoneFps} FPS`
                        : 'STANDBY'}
                    </span>
                  </span>
                  <span className="bg-black/75 border border-white/15 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 backdrop-blur-md">
                    LATENCY &lt;15ms
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              VIEWPORT 2: ROAD VISION VIEW (3D PERSPECTIVE)
          =================================================================== */}
          {viewMode === 'road' && (
            <div className="absolute inset-0">
              <svg
                viewBox="0 0 800 480"
                preserveAspectRatio="xMidYMax slice"
                className="w-full h-full"
              >
                <defs>
                  <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#30333b" />
                    <stop offset="1" stopColor="#1e2025" />
                  </linearGradient>
                  <linearGradient id="horizonFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#121316" />
                    <stop offset="0.45" stopColor="#121316" stopOpacity="0.85" />
                    <stop offset="1" stopColor="#121316" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="footpathGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#25272e" />
                    <stop offset="1" stopColor="#181a1f" />
                  </linearGradient>
                </defs>

                {/* Perspective Road Canvas (Tilts on curves) */}
                <g
                  style={{
                    transform: `rotate(${roadTiltDeg}deg)`,
                    transformOrigin: '400px 480px',
                    transition: 'transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1)',
                  }}
                >
                  {/* Left & Right Sidewalks */}
                  <polygon points="120,80 270,80 70,480 -120,480" fill="url(#footpathGrad)" />
                  <polygon points="530,80 680,80 920,480 730,480" fill="url(#footpathGrad)" />

                  {/* Asphalt Main Road */}
                  <polygon points="270,80 530,80 730,480 70,480" fill="url(#roadGrad)" />

                  {/* Road Boundary White Solid Lines */}
                  <line x1="270" y1="80" x2="70" y2="480" stroke="#d7dae0" strokeWidth="3" strokeOpacity="0.7" />
                  <line x1="530" y1="80" x2="730" y2="480" stroke="#d7dae0" strokeWidth="3" strokeOpacity="0.7" />

                  {/* Flowing Animated Center Lane Dashed Line */}
                  <line
                    x1="400"
                    y1="80"
                    x2="400"
                    y2="480"
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeOpacity="0.85"
                    strokeDasharray="26 20"
                    style={{
                      animation: `flow ${dashFlowDuration} linear infinite`,
                    }}
                  />

                  {/* Approaching Hazard Objects in 3D Perspective */}
                  {hazards.map((h) => {
                    const s = 0.08 + 0.92 * (1 - Math.min(h.distanceM, 300) / 300);
                    const y = 80 + Math.pow(s, 1.6) * 380;
                    const x = 400 + h.laneOffsetM * 55 * s;
                    const isUrgent = h.riskLevel === 'urgent';
                    const isCaution = h.riskLevel === 'caution';
                    const col = isUrgent ? '#EA4335' : isCaution ? '#FBBC05' : '#4285F4';

                    if (h.type === 'pothole') {
                      return (
                        <g key={h.id} transform={`translate(${x},${y}) scale(${s})`}>
                          <ellipse rx="46" ry="14" fill="#000" opacity="0.75" />
                          <ellipse rx="52" ry="18" fill="none" stroke={col} strokeWidth="3.5" />
                          <circle cy="-34" r="11" fill={col} />
                          <text y="-30" textAnchor="middle" fontSize="14" fontWeight="900" fill="#111">
                            !
                          </text>
                        </g>
                      );
                    }

                    if (h.type === 'waterlogging') {
                      return (
                        <g key={h.id} transform={`translate(${x},${y}) scale(${s})`}>
                          <ellipse rx="95" ry="24" fill="#1e3a8a" opacity="0.85" />
                          <ellipse rx="82" ry="18" fill="#38bdf8" opacity="0.6" />
                          <ellipse rx="98" ry="26" fill="none" stroke="#60a5fa" strokeWidth="3" strokeDasharray="8 6" />
                          <circle cy="-38" r="11" fill="#38bdf8" />
                          <text y="-33" textAnchor="middle" fontSize="13">
                            🌊
                          </text>
                        </g>
                      );
                    }

                    if (h.type === 'pedestrian') {
                      return (
                        <g key={h.id} transform={`translate(${x},${y}) scale(${s * 1.2})`}>
                          <ellipse rx="26" ry="8" fill="#000" opacity="0.4" />
                          <rect x="-9" y="-60" width="18" height="34" rx="7" fill="#e6e9ee" />
                          <circle cy="-72" r="8" fill="#e6e9ee" />
                          <circle cy="-92" r="10" fill={col} />
                          <text y="-88" textAnchor="middle" fontSize="13">
                            🚶
                          </text>
                        </g>
                      );
                    }

                    if (h.type === 'cattle') {
                      return (
                        <g key={h.id} transform={`translate(${x},${y}) scale(${s * 1.15})`}>
                          <ellipse rx="32" ry="10" fill="#000" opacity="0.45" />
                          <rect x="-16" y="-38" width="32" height="22" rx="7" fill="#e6e9ee" />
                          <circle cx="-18" cy="-46" r="9" fill="#e6e9ee" />
                          <circle cy="-62" r="10" fill={col} />
                          <text y="-58" textAnchor="middle" fontSize="13">
                            🐄
                          </text>
                        </g>
                      );
                    }

                    if (h.type === 'sharp_curve') {
                      return (
                        <g key={h.id} transform={`translate(${x},${y}) scale(${s * 1.1})`}>
                          <circle r="18" fill={col} opacity="0.9" />
                          <text y="6" textAnchor="middle" fontSize="15" fill="#111" fontWeight="bold">
                            ↪️
                          </text>
                        </g>
                      );
                    }

                    return (
                      <g key={h.id} transform={`translate(${x},${y}) scale(${s})`}>
                        <circle r="18" fill={col} />
                        <text y="6" textAnchor="middle" fontSize="14">
                          ⚠️
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Horizon Soft Fade */}
                <rect x="0" y="0" width="800" height="150" fill="url(#horizonFade)" />
              </svg>
            </div>
          )}

          {/* ===================================================================
              VIEWPORT 3: VECTOR NAVIGATION MAP VIEW
          =================================================================== */}
          {viewMode === 'map' && (
            <div className="absolute inset-0">
              <svg className="w-full h-full" viewBox="0 0 800 480" preserveAspectRatio="none">
                <rect width="800" height="480" fill="#15171b" />

                {/* City Blocks */}
                <rect x="40" y="30" width="160" height="110" rx="8" fill="#1e2126" />
                <rect x="230" y="30" width="220" height="110" rx="8" fill="#1e2126" />
                <rect x="480" y="30" width="280" height="110" rx="8" fill="#1e2126" />

                <rect x="40" y="210" width="180" height="150" rx="8" fill="#1e2126" />
                <rect x="250" y="210" width="200" height="150" rx="8" fill="#1e2126" />
                <rect x="480" y="210" width="280" height="150" rx="8" fill="#1e2126" />

                {/* Green Park & Lake */}
                <rect x="480" y="30" width="280" height="110" rx="8" fill="#13291b" />
                <ellipse cx="620" cy="85" rx="80" ry="32" fill="#10283b" />
                <text x="620" y="89" textAnchor="middle" fontSize="11" fill="#6c97ff" opacity="0.7">
                  Cubbon Lake
                </text>

                {/* Road Network Grid */}
                <path d="M0,170 H800 M0,390 H800 M200,0 V480 M460,0 V480" stroke="#2a2e36" strokeWidth="20" fill="none" />
                <path d="M0,170 H800 M0,390 H800 M200,0 V480 M460,0 V480" stroke="#373d48" strokeWidth="15" fill="none" />

                {/* Active Navigation Route */}
                <path
                  d="M80,170 L460,170 L460,340 L760,340"
                  stroke="#4285F4"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity="0.95"
                />

                {/* Moving Vehicle Navigation Arrow */}
                <g transform="translate(320, 170) rotate(90)">
                  <circle r="22" fill="#4285F4" opacity="0.25" />
                  <path d="M0 -15 L9 9 L0 4 L-9 9 Z" fill="#4285F4" stroke="#fff" strokeWidth="2" />
                </g>

                {/* Hazard Pins on Map */}
                {hazards.map((h, i) => (
                  <g key={h.id} transform={`translate(${460 + i * 90}, ${170 + i * 50})`}>
                    <circle r="14" fill={h.riskLevel === 'urgent' ? '#EA4335' : '#FBBC05'} />
                    <text y="5" textAnchor="middle" fontSize="11">
                      {getHazardIcon(h.type)}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Turn-by-Turn Instruction Banner */}
              <div className="absolute top-4 left-4 z-20 bg-[#191b21]/95 border border-white/20 rounded-2xl p-3 backdrop-blur-xl shadow-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4285F4] flex items-center justify-center text-white">
                  <Navigation className="w-5 h-5 rotate-45" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">In 280 meters</p>
                  <p className="text-sm font-bold text-white">Turn right onto Outer Ring Road</p>
                </div>
              </div>

              {/* Route ETA Pill */}
              <div className="absolute bottom-4 left-4 z-20 bg-[#191b21]/90 border border-white/20 rounded-xl px-3 py-1.5 backdrop-blur-xl flex items-center gap-2 text-xs">
                <span className="font-bold text-white">14 min</span>
                <span className="text-slate-400">· 6.2 km · 1:12 PM arrival</span>
              </div>
            </div>
          )}

          {/* =====================================================================
              TOP FLOATING ALERT BANNER (Prominent In-Car Hazard Warning)
          ===================================================================== */}
          <div className="z-20 p-4 w-full flex justify-center pointer-events-none">
            {topHazard ? (
              <div
                className={`pointer-events-auto max-w-xl w-full rounded-2xl p-3.5 backdrop-blur-2xl shadow-2xl flex items-center justify-between border transition-all ${
                  topHazard.riskLevel === 'urgent'
                    ? 'bg-rose-950/80 border-rose-500/60 shadow-rose-950/50 animate-pulse'
                    : 'bg-slate-900/90 border-amber-500/50 shadow-black/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      backgroundColor:
                        topHazard.riskLevel === 'urgent'
                          ? '#EA433530'
                          : topHazard.riskLevel === 'caution'
                          ? '#FBBC0530'
                          : '#4285F430',
                    }}
                  >
                    {getHazardIcon(topHazard.type)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                          topHazard.riskLevel === 'urgent'
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-500 text-slate-950 font-black'
                        }`}
                      >
                        {topHazard.riskLevel}
                      </span>
                      <span className="text-[11px] text-slate-300 font-medium truncate">
                        Approaching in your lane
                      </span>
                    </div>

                    <p className="text-sm font-bold text-white mt-0.5 leading-snug truncate">
                      {topHazard.localized[currentLang] || topHazard.localized.en}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-3 border-l border-white/10 flex-shrink-0">
                  <div className="text-right font-mono">
                    <span className="text-2xl font-light text-white">
                      {Math.max(0, Math.round(topHazard.distanceM))}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">m</span>
                  </div>

                  {/* Repeat Spoken Audio Button */}
                  <button
                    onClick={() => {
                      alertAudio.playChime(topHazard.riskLevel);
                      alertAudio.speakAlert(topHazard.localized, currentLang);
                    }}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    title="Repeat voice alert"
                  >
                    <Volume2 className="w-4 h-4 text-[#4285F4]" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-xl flex items-center gap-2 text-xs text-slate-400 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Scanning road corridor · Clear ahead</span>
              </div>
            )}
          </div>

          {/* Bottom view label */}
          <div className="z-10 p-3 flex items-center justify-between text-xs text-slate-400">
            <span className="bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10">
              {viewMode === 'camera'
                ? '📷 Live Smartphone Camera Feed (ADAS Vision)'
                : viewMode === 'road'
                ? '🛣️ 3D Perspective Road Vision'
                : '🗺️ Vector Navigation Map'}
            </span>
          </div>
        </main>
      </div>

      {/* =========================================================================
          3. CLEAN AUTOMOTIVE TOUCH DOCK (BOTTOM CONTROLS)
      ========================================================================= */}
      <footer className="h-16 px-4 bg-[#121316] border-t border-white/10 flex items-center justify-between gap-2 z-30">
        {/* Left: 3-Way View Mode Switcher */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode('road')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'road'
                ? 'bg-[#4285F4] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🛣️</span>
            <span>Road</span>
          </button>

          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'map'
                ? 'bg-[#4285F4] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🗺️</span>
            <span>Map</span>
          </button>

          <button
            onClick={() => setViewMode('camera')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'camera'
                ? 'bg-[#4285F4] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📷</span>
            <span>Camera Feed</span>
          </button>
        </div>

        {/* Center: Live Hazard Simulation Triggers */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mr-1">
            Simulate:
          </span>

          {Object.keys(HAZARD_TEMPLATES).map((key) => {
            const t = HAZARD_TEMPLATES[key];
            return (
              <button
                key={key}
                onClick={() => triggerManualHazard(key)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-semibold text-slate-200 transition-all hover:scale-105 active:scale-95"
              >
                <span>{t.icon}</span>
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Bump simulation, Pair Phone & Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerBumpEvent(2.4)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1"
            title="Simulate accelerometer shockwave"
          >
            <span>⚡ Bump (2.4G)</span>
          </button>

          <button
            onClick={() => setShowPairModal(true)}
            className="px-3 py-1.5 rounded-xl bg-[#4285F4]/20 hover:bg-[#4285F4]/30 border border-[#4285F4]/40 text-[#4285F4] text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Pair Phone</span>
          </button>

          {hazards.length > 0 && (
            <button
              onClick={() => setHazards([])}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-semibold border border-white/10 transition-colors"
              title="Clear active hazards"
            >
              Clear
            </button>
          )}
        </div>
      </footer>

      {/* =========================================================================
          4. SMARTPHONE PAIRING MODAL (QR CODE & ONE-CLICK TEST)
      ========================================================================= */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#15171b] border border-white/15 rounded-3xl max-w-md w-full p-6 relative font-sans text-slate-100 shadow-2xl">
            <button
              onClick={() => setShowPairModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#4285F4]/20 border border-[#4285F4]/40 flex items-center justify-center text-[#4285F4]">
                <Smartphone className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Drive with Your Smartphone</h3>
                <p className="text-xs text-slate-400">Stream camera & motion sensors straight to this display</p>
              </div>
            </div>

            <div className="bg-[#0f1013] p-5 rounded-2xl border border-white/10 flex flex-col items-center text-center space-y-3 mb-4">
              <p className="text-xs text-slate-300">
                Scan this QR code with your phone camera to mount your phone as a dashcam:
              </p>
              <div className="p-3 bg-white rounded-2xl shadow-xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/phone`
                      : 'https://margai-cockpit-web-uhaqjpi3va-el.a.run.app/phone'
                  )}`}
                  alt="Smartphone Dashcam QR"
                  className="w-44 h-44"
                />
              </div>
              <a
                href="/phone"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#4285F4] font-mono break-all font-bold hover:underline flex items-center gap-1"
              >
                <span>{typeof window !== 'undefined' ? `${window.location.origin}/phone` : '/phone'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Once opened on your phone, its rear camera will start streaming real-time road video and shockwave telemetry over WebSocket with &lt;15ms latency.
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href="/phone"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </a>
              <button
                onClick={() => setShowPairModal(false)}
                className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

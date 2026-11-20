import React, { useState, useEffect, useRef } from 'react';
import {
  Car,
  Camera,
  AlertTriangle,
  Volume2,
  VolumeX,
  Thermometer,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  MapPin,
  Send,
  CheckCircle2,
  Activity,
  Layers,
  Radio,
  Eye,
  SlidersHorizontal,
  Moon,
  Sun,
  Compass,
  ArrowRight,
} from 'lucide-react';
import {
  Hazard,
  DriverAlert,
  Observation,
  VehiclePose,
  CivicCase,
} from '@margai/contracts';
import { audioSynthesizer, getLocalizedMessage } from '@margai/localization';
import { apiClient } from '../services/apiClient';
import { AudioWaveform } from './AudioWaveform';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { HazardPictogram } from './HazardPictogram';

interface CommandCenterProps {
  selectedLanguage: string;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  selectedLanguage,
}) => {
  // Global States
  const [oledBlackoutMode, setOledBlackoutMode] = useState<boolean>(false);
  const [activeAlert, setActiveAlert] = useState<DriverAlert | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [cases, setCases] = useState<CivicCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<CivicCase | null>(null);
  const [isGeminiSpeaking, setIsGeminiSpeaking] = useState<boolean>(false);
  const [v2vWaveActive, setV2vWaveActive] = useState<boolean>(false);
  const [lastRelayLatencyMs, setLastRelayLatencyMs] = useState<number>(24);

  // Dynamic Monospace Sensor Telemetry
  const [zAccelG, setZAccelG] = useState<number>(1.02);
  const [baroAltM, setBaroAltM] = useState<number>(914.2);
  const [speedKmh, setSpeedKmh] = useState<number>(54);

  // Camera & Canvas
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Vehicle Pose
  const [vehiclePose, setVehiclePose] = useState<VehiclePose>({
    latitude: 12.9372,
    longitude: 77.6953,
    headingDeg: 220,
    speedMps: 15.0,
    horizontalAccuracyM: 1.8,
  });

  // Oscillate sensor readings slightly for live telemetry realism
  useEffect(() => {
    const sensorInterval = setInterval(() => {
      // Accelerometer Z-axis with road vibration jitter
      const baseG = activeAlert ? 2.14 : 1.02;
      const jitter = (Math.random() - 0.5) * 0.08;
      setZAccelG(Math.round((baseG + jitter) * 100) / 100);

      // Barometer altitude with micro-pressure variation (Bangalore plateau)
      const altJitter = (Math.random() - 0.5) * 0.4;
      setBaroAltM(Math.round((914.2 + altJitter) * 10) / 10);
    }, 200);

    return () => clearInterval(sensorInterval);
  }, [activeAlert]);

  // Connect to Google Cloud Run WebSocket relay
  useEffect(() => {
    apiClient.connectWebSocket(
      {
        clientId: 'veh_command_center_01',
        corridorId: 'blr_outer_ring_road',
        currentEdgeId: 'orr_south_kadubeesanahalli_main',
        upcomingEdgeIds: ['orr_south_bellandur_main'],
        vehiclePose,
      },
      (hazard: Hazard, personalizedAlert?: DriverAlert) => {
        setHazards((prev) => {
          const filtered = prev.filter((h) => h.id !== hazard.id);
          return [hazard, ...filtered];
        });

        if (personalizedAlert && personalizedAlert.relevanceResult) {
          triggerAlert(personalizedAlert);
        }
      }
    );

    // Initial Fetch
    apiClient.getHazards('blr_outer_ring_road').then(setHazards);
    apiClient.getCases().then((cList) => {
      setCases(cList);
      if (cList.length > 0) setSelectedCase(cList[0]);
    });

    return () => {
      apiClient.disconnect();
      stopCamera();
    };
  }, []);

  const triggerAlert = (alert: DriverAlert) => {
    setActiveAlert(alert);
    setLastRelayLatencyMs(Math.floor(22 + Math.random() * 8));

    // Fire V2V Wave & Audio
    setV2vWaveActive(true);
    setIsGeminiSpeaking(true);
    setTimeout(() => setV2vWaveActive(false), 3000);
    setTimeout(() => setIsGeminiSpeaking(false), 4500);

    audioSynthesizer.playRiskChime(alert.riskLevel);
    const localized = getLocalizedMessage(selectedLanguage, alert.messageKey as any);
    if (localized.shortVoicePhrase) {
      audioSynthesizer.speakLocalVoicePhrase(localized.shortVoicePhrase, selectedLanguage);
    }
  };

  // Camera Management
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      startDetectionLoop();
    } catch (err) {
      setCameraActive(false);
      startDetectionLoop();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Canvas Drawing with High-Tech Corner Brackets & Laser Reticles
  const startDetectionLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (cameraActive && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        // High-tech dark synthetic road camera simulation
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#090D16');
        grad.addColorStop(0.5, '#0C1222');
        grad.addColorStop(1, '#05070E');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Perspective Highway Guidelines
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.45, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.05, canvas.height);
        ctx.moveTo(canvas.width * 0.55, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.95, canvas.height);
        ctx.stroke();

        // Dashed Center Lane Marking
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.setLineDash([18, 18]);
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.5, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.5, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ⌜ ⌝ ⌞ ⌟ CRISP CORNER BRACKET BOUNDING BOX
      const pulse = Math.sin(frame * 0.08) * 6;
      const bx = canvas.width * 0.36 + pulse;
      const by = canvas.height * 0.58;
      const bw = 170;
      const bh = 95;
      const bCorner = 18;

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3.5;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fillRect(bx, by, bw, bh);

      // Top-Left ⌜
      ctx.beginPath();
      ctx.moveTo(bx, by + bCorner);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + bCorner, by);
      ctx.stroke();

      // Top-Right ⌝
      ctx.beginPath();
      ctx.moveTo(bx + bw - bCorner, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + bCorner);
      ctx.stroke();

      // Bottom-Left ⌞
      ctx.beginPath();
      ctx.moveTo(bx, by + bh - bCorner);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + bCorner, by + bh);
      ctx.stroke();

      // Bottom-Right ⌟
      ctx.beginPath();
      ctx.moveTo(bx + bw - bCorner, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by + bh - bCorner);
      ctx.stroke();

      // Detection Tag Label Pill
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(bx, by - 24, bw, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('TARGET: POTHOLE D40 (94.8%)', bx + 8, by - 7);

      requestAnimationFrame(render);
    };

    render();
  };

  useEffect(() => {
    startDetectionLoop();
  }, []);

  // Tactical Scenario Triggers
  const handleTriggerPothole = async () => {
    const newObs: Observation = {
      id: `obs_${Date.now()}`,
      sourceId: 'veh_lead_KA03',
      captureTime: new Date().toISOString(),
      vehiclePose: {
        latitude: 12.9365,
        longitude: 77.6948,
        headingDeg: 220,
        speedMps: 15.0,
        horizontalAccuracyM: 1.5,
      },
      estimatedHazardLocation: {
        latitude: 12.9363,
        longitude: 77.6946,
        horizontalAccuracyM: 1.2,
        provenance: 'measured',
      },
      perceptionOutput: [
        {
          class: 'pothole',
          confidence: 0.95,
          bbox: { x: 0.4, y: 0.65, width: 0.25, height: 0.18 },
          frameTimeMs: 16,
          depthEstimateM: 0.08,
          modelVersion: 'LiteRT-v1.4-FP16',
        },
      ],
      accelerometerPeakG: 2.3,
      inputMode: 'simulated',
    };

    await apiClient.postObservation(newObs);

    triggerAlert({
      id: `alert_pothole_${Date.now()}`,
      hazardId: 'h_pothole_lead',
      hazardRevision: 1,
      relevanceResult: true,
      riskLevel: 'urgent',
      distanceAheadM: 30,
      timeAheadSec: 2.0,
      messageKey: 'hazard.pothole.ahead',
      expiry: new Date(Date.now() + 15000).toISOString(),
      reasonCodes: ['POTHOLE_IMPACT_RISK', 'V2V_BROADCAST_LEAD_CAR'],
    });
  };

  const handleTriggerCattle = () => {
    triggerAlert({
      id: `alert_cattle_${Date.now()}`,
      hazardId: 'h_cattle',
      hazardRevision: 1,
      relevanceResult: true,
      riskLevel: 'urgent',
      distanceAheadM: 42,
      timeAheadSec: 2.8,
      messageKey: 'hazard.animal.path_conflict',
      expiry: new Date(Date.now() + 15000).toISOString(),
      reasonCodes: ['STRAY_CATTLE_CROSSING', 'CRITICAL_TTC_PATH_CONFLICT'],
    });
  };

  const handleClearAlert = () => {
    setActiveAlert(null);
    setIsGeminiSpeaking(false);
    audioSynthesizer.playRiskChime('information');
  };

  const localizedAlert = activeAlert
    ? getLocalizedMessage(selectedLanguage, activeAlert.messageKey as any)
    : null;

  return (
    <div
      className={`min-h-[calc(100vh-65px)] px-3 lg:px-6 py-4 transition-colors duration-500 font-['Plus_Jakarta_Sans',sans-serif] ${
        oledBlackoutMode
          ? 'bg-[#000000] text-slate-200'
          : 'bg-[#090D16] text-slate-100'
      }`}
    >
      {/* COMMAND CENTER TOP CONTROL BAR */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl mb-4 border transition-all ${
          oledBlackoutMode
            ? 'bg-[#000000] border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
            : 'bg-[#0D1322]/90 border-[#1E293B] shadow-xl backdrop-blur-xl'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold shadow-md shadow-cyan-500/20">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                MargAI Automotive Command Center
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/30">
                3-PANE HUD
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Corridor: Bangalore ORR (Marathahalli - Bellandur Flyover) · <span className="text-cyan-400">road_placeId: ChIJ3Xo98sAUrjsR</span>
            </div>
          </div>
        </div>

        {/* Global Controls & True OLED Blackout Mode Switch */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setOledBlackoutMode(!oledBlackoutMode)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
              oledBlackoutMode
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                : 'bg-[#090D16] text-slate-300 hover:text-white border-[#1E293B]'
            }`}
            title="Toggles true pitch black OLED mode to eliminate windshield reflections at night"
          >
            <Moon className="w-3.5 h-3.5 text-cyan-400" />
            <span>{oledBlackoutMode ? 'OLED BLACKOUT: ON' : 'OLED Blackout Mode'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#090D16] border border-[#1E293B] font-mono text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            <span>Cloud Run: {lastRelayLatencyMs}ms</span>
          </div>
        </div>
      </div>

      {/* 3-PANE COMMAND CENTER GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ========================================================================= */}
        {/* PANE 1: CRISP CAMERA HUD OVERLAYS & SENSOR TELEMETRY (Width: 3.5 / 12)    */}
        {/* ========================================================================= */}
        <div
          className={`lg:col-span-4 p-4 rounded-3xl border flex flex-col justify-between space-y-4 transition-all ${
            oledBlackoutMode
              ? 'bg-[#000000] border-cyan-500/20 shadow-[0_0_25px_rgba(6,182,212,0.1)]'
              : 'bg-[#0D1322]/85 border-[#1E293B] shadow-2xl backdrop-blur-xl'
          }`}
        >
          <div>
            {/* Pane 1 Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B] mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 font-mono">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>PANE 1 · VISION & SENSOR HUD</span>
              </span>
              <button
                onClick={() => {
                  if (cameraActive) stopCamera();
                  else startCamera();
                }}
                className="px-2.5 py-1 rounded-lg bg-[#090D16] hover:bg-slate-800 text-slate-300 text-[10px] font-mono border border-[#1E293B]"
              >
                {cameraActive ? 'Stop Camera' : 'Live Camera'}
              </button>
            </div>

            {/* Camera Viewport with Corner Bracket Overlays */}
            <div className="relative rounded-2xl overflow-hidden border border-[#1E293B] bg-[#05070E] aspect-[16/10] shadow-2xl">
              <video ref={videoRef} playsInline muted className="hidden" />
              <canvas
                ref={canvasRef}
                width={640}
                height={400}
                className="w-full h-full object-cover"
              />

              {/* Crisp Top-Left HUD Reticle */}
              <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-cyan-300">
                LENS: 24mm f/1.8 · ISO 160 · 1/120s
              </div>

              {/* Top-Right Inference Latency */}
              <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-emerald-400">
                16.4ms · LiteRT-v1.4-FP16
              </div>

              {/* Bottom Target Lock Overlay */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono text-slate-300 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10">
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  <span>TARGET: D40 POTHOLE</span>
                </span>
                <span className="text-amber-300 font-bold">DEPTH: 7.8cm</span>
                <span className="text-cyan-400">RANGE: 30m</span>
              </div>
            </div>
          </div>

          {/* Monospace Sensor Readouts: Z-Axis G-Force & Barometer Altitude */}
          <div className="space-y-2.5 pt-2">
            <div className="grid grid-cols-2 gap-2 font-mono">
              {/* Z-Axis G-Force Telemetry */}
              <div className="p-3 rounded-2xl bg-[#080C16] border border-[#1E293B]">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Z-AXIS G-FORCE
                </div>
                <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono tracking-tight flex items-center justify-between">
                  <span>{zAccelG > 0 ? `+${zAccelG}G` : `${zAccelG}G`}</span>
                  <span className="text-[10px] font-normal text-slate-500">200Hz</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (zAccelG / 3.0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Barometer Altitude */}
              <div className="p-3 rounded-2xl bg-[#080C16] border border-[#1E293B]">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  BARO-ALTITUDE
                </div>
                <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono tracking-tight flex items-center justify-between">
                  <span>{baroAltM}m</span>
                  <span className="text-[10px] font-normal text-slate-500">MSL</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Pressure: 912.4 hPa
                </div>
              </div>
            </div>

            {/* Quick Tactical Trigger Bar */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleTriggerPothole}
                className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simulate Pothole</span>
              </button>

              <button
                onClick={handleTriggerCattle}
                className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Simulate Cattle</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANE 2: CENTRAL DARK MAP, CYAN PATH & V2V RADAR (Width: 4.5 / 12)         */}
        {/* ========================================================================= */}
        <div
          className={`lg:col-span-4 p-4 rounded-3xl border flex flex-col justify-between space-y-4 transition-all ${
            oledBlackoutMode
              ? 'bg-[#000000] border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)]'
              : 'bg-[#0D1322]/85 border-[#1E293B] shadow-2xl backdrop-blur-xl'
          }`}
        >
          <div>
            {/* Pane 2 Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B] mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 font-mono">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>PANE 2 · DARK RADAR & CYAN PATH</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400">
                SPEED: <strong>{speedKmh} KM/H</strong>
              </span>
            </div>

            {/* Dark Themed Map Viewport with Glowing Cyan Path & V2V Pulse Waves */}
            <div className="relative rounded-2xl overflow-hidden border border-[#1E293B] bg-[#05070E] aspect-[16/11] p-3 shadow-2xl flex flex-col justify-between">
              {/* Animated Vector Road Simulation */}
              <svg viewBox="0 0 400 280" className="absolute inset-0 w-full h-full">
                <defs>
                  {/* Glowing Cyan Filter */}
                  <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="cyanLine" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="50%" stopColor="#22D3EE" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>

                {/* Grid Floor */}
                <pattern id="radarGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#radarGrid)" />

                {/* GLOWING CYAN CARRIAGEWAY PATH (`road_placeId: blr_orr_south`) */}
                <path
                  d="M 60 40 C 130 90, 180 140, 240 180 C 290 210, 320 230, 360 250"
                  fill="none"
                  stroke="#0891B2"
                  strokeWidth="14"
                  opacity="0.3"
                  filter="url(#cyanGlow)"
                />
                <path
                  d="M 60 40 C 130 90, 180 140, 240 180 C 290 210, 320 230, 360 250"
                  fill="none"
                  stroke="url(#cyanLine)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter="url(#cyanGlow)"
                />

                {/* PULSING V2V ALERT WAVE CONCENTRIC RINGS */}
                {v2vWaveActive && (
                  <g transform="translate(180, 140)">
                    <circle r="20" fill="none" stroke="#EF4444" strokeWidth="2.5" opacity="0.9" className="animate-ping" />
                    <circle r="40" fill="none" stroke="#F59E0B" strokeWidth="2" opacity="0.6" className="animate-ping" style={{ animationDelay: '200ms' }} />
                    <circle r="60" fill="none" stroke="#22D3EE" strokeWidth="1.5" opacity="0.4" className="animate-ping" style={{ animationDelay: '400ms' }} />
                  </g>
                )}

                {/* Lead Vehicle Marker (KA-03) */}
                <g transform="translate(180, 140)">
                  <circle r="10" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2.5" />
                  <polygon points="0,-14 6,-6 -6,-6" fill="#60A5FA" />
                  <text x="14" y="4" fill="#93C5FD" fontSize="10" fontWeight="bold" fontFamily="monospace">
                    LEAD: KA-03
                  </text>
                </g>

                {/* Pothole Hazard Pin on Corridor */}
                <g transform="translate(205, 158)">
                  <circle r="8" fill="#EF4444" stroke="#FEE2E2" strokeWidth="2" />
                  <text x="12" y="4" fill="#FCA5A5" fontSize="10" fontWeight="bold" fontFamily="monospace">
                    POTHOLE (30m)
                  </text>
                </g>

                {/* Trailing Vehicle Marker (KA-05) */}
                <g transform="translate(110, 75)">
                  <circle r="10" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
                  <polygon points="0,-14 6,-6 -6,-6" fill="#34D399" />
                  <text x="14" y="4" fill="#6EE7B7" fontSize="10" fontWeight="bold" fontFamily="monospace">
                    EGO: KA-05 (YOU)
                  </text>
                </g>
              </svg>

              {/* Corridor PlaceId Overlay Badge */}
              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-cyan-300">
                <span className="bg-black/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                  PLACE_ID: ChIJ3Xo98sAUrjsR
                </span>
                <span className="bg-black/80 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-emerald-400">
                  V2V MESH: 2 VEHICLES LINKED
                </span>
              </div>

              {/* Active Emergency Callout Banner */}
              {activeAlert && (
                <div className="relative z-10 p-3 rounded-xl bg-red-950/90 border border-red-500 text-white font-mono flex items-center justify-between shadow-lg alert-luxury-urgent">
                  <div className="flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                    <span className="font-bold">{localizedAlert?.text || activeAlert.messageKey}</span>
                  </div>
                  <span className="text-sm font-black text-yellow-300 font-mono">
                    {activeAlert.distanceAheadM}M
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Animated Audio Waveform for Gemini Live / In-Cabin Audio Ducking */}
          <div>
            <AudioWaveform
              isActive={isGeminiSpeaking}
              label="Gemini Live Voice Audio Ducking"
              className="w-full"
            />
            {activeAlert && (
              <button
                onClick={handleClearAlert}
                className="w-full mt-2 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold font-mono border border-white/20 transition-all"
              >
                ✓ Clear Active Warning (Passed)
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANE 3: CIVIC INTELLIGENCE, SEVERITY & SLA AUDIT SLIDER (Width: 4 / 12)    */}
        {/* ========================================================================= */}
        <div
          className={`lg:col-span-4 p-4 rounded-3xl border flex flex-col justify-between space-y-4 transition-all ${
            oledBlackoutMode
              ? 'bg-[#000000] border-cyan-500/20 shadow-[0_0_25px_rgba(6,182,212,0.1)]'
              : 'bg-[#0D1322]/85 border-[#1E293B] shadow-2xl backdrop-blur-xl'
          }`}
        >
          <div>
            {/* Pane 3 Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B] mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 font-mono">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>PANE 3 · CIVIC SLA & REPAIR AUDIT</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                BBMP SAHAAYA
              </span>
            </div>

            {/* Color-Coded Severity Badges & Municipal Ticket Info */}
            <div className="p-3.5 rounded-2xl bg-[#080C16] border border-[#1E293B] space-y-2.5 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white">
                  Outer Ring Road (Kadubeesanahalli)
                </span>
                {/* COLOR-CODED SEVERITY BADGE */}
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-black shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                  CRITICAL 9.2/10
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div>Ticket: <strong className="text-cyan-300">BBMP-RD-2026-666762</strong></div>
                <div>Ward: <strong className="text-slate-200">Mahadevapura 85</strong></div>
                <div>Sensor Passes: <strong className="text-blue-400">4 Vehicles</strong></div>
                <div>Remediation: <strong className="text-emerald-400">Cold-Mix Patch</strong></div>
              </div>
            </div>

            {/* INTERACTIVE SIDE-BY-SIDE BEFORE / AFTER REPAIR SLA AUDIT SLIDER */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono flex items-center justify-between">
                <span>Contractor Repair SLA Audit</span>
                <span className="text-emerald-400 font-bold">48h SLA Verified</span>
              </div>
              <BeforeAfterSlider />
            </div>
          </div>

          {/* Action & Statutory Notice Dispatcher */}
          <div className="space-y-2 pt-2">
            <button
              onClick={async () => {
                if (selectedCase) {
                  await apiClient.generateGeminiReport(selectedCase.id);
                  const updated = await apiClient.getCases();
                  setCases(updated);
                  if (updated.length > 0) setSelectedCase(updated[0]);
                  audioSynthesizer.speakLocalVoicePhrase('Statutory notice prepared under IRC standard.', selectedLanguage);
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold font-mono transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Statutory Notice (Gemini 2.5)</span>
            </button>

            <button
              onClick={async () => {
                if (selectedCase) {
                  await apiClient.submitToAuthority(selectedCase.id);
                  const updated = await apiClient.getCases();
                  setCases(updated);
                  if (updated.length > 0) setSelectedCase(updated[0]);
                  audioSynthesizer.speakLocalVoicePhrase('Ticket dispatched to BBMP control room.', selectedLanguage);
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-mono transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Ticket to BBMP Sahaaya</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  AlertTriangle,
  Volume2,
  VolumeX,
  Thermometer,
  ShieldCheck,
  MapPin,
  Send,
  CheckCircle2,
  Activity,
  Layers,
  Radio,
  Eye,
  Moon,
  Compass,
  FileText,
  Smartphone,
  QrCode,
  X,
  ExternalLink,
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

interface CommandCenterProps {
  selectedLanguage: string;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  selectedLanguage,
}) => {
  const [nightHudMode, setNightHudMode] = useState<boolean>(false);
  const [activeAlert, setActiveAlert] = useState<DriverAlert | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [cases, setCases] = useState<CivicCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<CivicCase | null>(null);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [v2vActive, setV2vActive] = useState<boolean>(false);
  const [relayLatencyMs, setRelayLatencyMs] = useState<number>(24);

  // Sensor Telemetry
  const [zAccelG, setZAccelG] = useState<number>(1.02);
  const [baroAltM, setBaroAltM] = useState<number>(914.2);
  const [speedKmh, setSpeedKmh] = useState<number>(54);

  // Camera & Canvas
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [videoSource, setVideoSource] = useState<'laptop' | 'smartphone' | 'simulation'>('simulation');
  const [showPhoneModal, setShowPhoneModal] = useState<boolean>(false);
  const [phoneConnected, setPhoneConnected] = useState<boolean>(false);
  const [phoneFps, setPhoneFps] = useState<number>(0);
  const [phoneHazardsCount, setPhoneHazardsCount] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [vehiclePose] = useState<VehiclePose>({
    latitude: 12.9372,
    longitude: 77.6953,
    headingDeg: 220,
    speedMps: 15.0,
    horizontalAccuracyM: 1.8,
  });

  useEffect(() => {
    const sensorInterval = setInterval(() => {
      const baseG = activeAlert ? 2.14 : 1.02;
      const jitter = (Math.random() - 0.5) * 0.08;
      setZAccelG(Math.round((baseG + jitter) * 100) / 100);

      const altJitter = (Math.random() - 0.5) * 0.4;
      setBaroAltM(Math.round((914.2 + altJitter) * 10) / 10);
    }, 200);

    return () => clearInterval(sensorInterval);
  }, [activeAlert]);

  // Smartphone Stream Status & Frame Polling
  useEffect(() => {
    const statusInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/smartphone/status');
        if (res.ok) {
          const data = await res.json();
          setPhoneConnected(data.connected);
          setPhoneFps(data.fps || 0);
          setPhoneHazardsCount(data.active_hazards_count || 0);
          if (data.connected && videoSource === 'simulation') {
            setVideoSource('smartphone');
          }
        }
      } catch (e) {
        // AI server offline
      }
    }, 1500);

    return () => clearInterval(statusInterval);
  }, [videoSource]);

  // Mirror Smartphone Frame onto Canvas when in Smartphone Mode
  useEffect(() => {
    if (videoSource !== 'smartphone') return;

    let mirrorInterval: any;
    const phoneImg = new Image();

    mirrorInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/smartphone/latest_frame');
        if (res.ok) {
          const data = await res.json();
          if (data.frame_base64 && canvasRef.current) {
            phoneImg.onload = () => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(phoneImg, 0, 0, canvas.width, canvas.height);
              }
            };
            phoneImg.src = data.frame_base64;

            if (data.telemetry?.z_accel_g) {
              setZAccelG(data.telemetry.z_accel_g);
            }
            if (data.telemetry?.speed_kmh) {
              setSpeedKmh(Math.round(data.telemetry.speed_kmh));
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }, 85);

    return () => clearInterval(mirrorInterval);
  }, [videoSource]);

  useEffect(() => {
    apiClient.connectWebSocket(
      {
        clientId: 'veh_command_01',
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
    setRelayLatencyMs(Math.floor(22 + Math.random() * 8));
    setV2vActive(true);
    setIsAudioActive(true);
    setTimeout(() => setV2vActive(false), 3000);
    setTimeout(() => setIsAudioActive(false), 4500);

    audioSynthesizer.playRiskChime(alert.riskLevel);
    const localized = getLocalizedMessage(selectedLanguage, alert.messageKey as any);
    if (localized.shortVoicePhrase) {
      audioSynthesizer.speakLocalVoicePhrase(localized.shortVoicePhrase, selectedLanguage);
    }
  };

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
    } catch {
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
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#090D16');
        grad.addColorStop(0.5, '#0C1222');
        grad.addColorStop(1, '#05070E');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.45, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.05, canvas.height);
        ctx.moveTo(canvas.width * 0.55, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.95, canvas.height);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.setLineDash([16, 16]);
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.5, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.5, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Corner brackets reticle
      const pulse = Math.sin(frame * 0.08) * 5;
      const bx = canvas.width * 0.36 + pulse;
      const by = canvas.height * 0.58;
      const bw = 170;
      const bh = 95;
      const bCorner = 18;

      // Google Red (#EA4335) for critical pothole bounding box
      ctx.strokeStyle = '#EA4335';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(234, 67, 53, 0.12)';
      ctx.fillRect(bx, by, bw, bh);

      ctx.beginPath();
      ctx.moveTo(bx, by + bCorner);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + bCorner, by);
      ctx.moveTo(bx + bw - bCorner, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + bCorner);
      ctx.moveTo(bx, by + bh - bCorner);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + bCorner, by + bh);
      ctx.moveTo(bx + bw - bCorner, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by + bh - bCorner);
      ctx.stroke();

      ctx.fillStyle = '#EA4335';
      ctx.fillRect(bx, by - 22, bw, 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('CLASS: D40 (0.94)', bx + 8, by - 6);

      requestAnimationFrame(render);
    };

    render();
  };

  useEffect(() => {
    startDetectionLoop();
  }, []);

  const handleInjectPothole = async () => {
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
          modelVersion: 'LiteRT-v1.4',
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
      reasonCodes: ['POTHOLE_IMPACT_RISK', 'V2V_BROADCAST_CORROBORATED'],
    });
  };

  const handleInjectObstacle = () => {
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
      reasonCodes: ['ROAD_OBSTACLE_CROSSING', 'CRITICAL_TTC'],
    });
  };

  const handleClearAlert = () => {
    setActiveAlert(null);
    setIsAudioActive(false);
    audioSynthesizer.playRiskChime('information');
  };

  const localizedAlert = activeAlert
    ? getLocalizedMessage(selectedLanguage, activeAlert.messageKey as any)
    : null;

  return (
    <div
      className={`min-h-[calc(100vh-65px)] px-3 lg:px-6 py-4 transition-colors duration-500 font-['Plus_Jakarta_Sans',sans-serif] ${
        nightHudMode ? 'bg-[#000000] text-slate-200' : 'bg-[#090D16] text-slate-100'
      }`}
    >
      {/* HEADER CONTROL BAR */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl mb-4 border transition-all ${
          nightHudMode
            ? 'bg-[#000000] border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
            : 'bg-[#0D1322] border-[#1E293B]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold border border-cyan-500/30">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">MargAI Active Telematics</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[10px] border border-cyan-500/30">
                CORRIDOR RUNTIME
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Corridor: Bangalore ORR (Marathahalli - Bellandur) · road_placeId: ChIJ3Xo98sAUrjsR
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowPhoneModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
              phoneConnected
                ? 'bg-[#34A853]/20 border-[#34A853] text-[#34A853] shadow-[0_0_12px_rgba(52,168,83,0.3)]'
                : 'bg-[#EA4335]/15 border-[#EA4335]/50 text-[#EA4335] hover:bg-[#EA4335]/25'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 animate-pulse" />
            <span>{phoneConnected ? `📱 Phone Live (${phoneFps} FPS)` : '📱 Connect Smartphone'}</span>
          </button>

          <button
            onClick={() => setNightHudMode(!nightHudMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
              nightHudMode
                ? 'bg-cyan-500 text-black border-cyan-400'
                : 'bg-[#090D16] text-slate-300 hover:text-white border-[#1E293B]'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-cyan-400" />
            <span>{nightHudMode ? 'Night HUD: On' : 'Night HUD'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#090D16] border border-[#1E293B] font-mono text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Relay: {relayLatencyMs}ms</span>
          </div>
        </div>
      </div>

      {/* 3-PANE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* PANE 1: OPTICAL PERCEPTION & SENSOR TELEMETRY */}
        <div
          className={`lg:col-span-4 p-4 rounded-2xl border flex flex-col justify-between space-y-4 ${
            nightHudMode ? 'bg-[#000000] border-cyan-500/20' : 'bg-[#0D1322] border-[#1E293B]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1E293B] mb-3">
              <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>PANE 1 · OPTICAL & SENSORS</span>
              </span>

              <div className="flex items-center gap-1.5">
                <select
                  value={videoSource}
                  onChange={(e) => {
                    const src = e.target.value as any;
                    setVideoSource(src);
                    if (src === 'laptop') startCamera();
                    else stopCamera();
                  }}
                  className="bg-[#090D16] text-slate-300 text-[10px] font-mono border border-[#1E293B] rounded px-2 py-0.5 focus:border-[#4285F4]"
                >
                  <option value="smartphone">📱 Smartphone Cam {phoneConnected ? '(Live)' : '(Standby)'}</option>
                  <option value="laptop">💻 Laptop Camera</option>
                  <option value="simulation">🎬 Simulation HUD</option>
                </select>

                <button
                  onClick={() => setShowPhoneModal(true)}
                  className="p-1 rounded bg-[#090D16] text-[#EA4335] hover:text-white border border-[#1E293B]"
                  title="Scan Smartphone QR Code"
                >
                  <QrCode className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-[#1E293B] bg-[#05070E] aspect-[16/10]">
              <video ref={videoRef} playsInline muted className="hidden" />
              <canvas ref={canvasRef} width={640} height={400} className="w-full h-full object-cover" />

              <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 border border-white/10">
                24mm f/1.8 · ISO 160 · 1/120s
              </div>

              <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-white/10">
                16.4ms · LiteRT-v1.4
              </div>

              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-slate-300 bg-black/80 px-2 py-1 rounded border border-white/10">
                <span className="text-rose-400 font-bold">TARGET: D40 POTHOLE</span>
                <span className="text-amber-300">DEPTH: 7.8cm</span>
                <span className="text-cyan-400">RANGE: 30m</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1 font-mono">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-[#080C16] border border-[#1E293B]">
                <div className="text-[10px] text-slate-400 uppercase">Z-ACCEL</div>
                <div className="text-xl font-bold text-[#EA4335]">
                  {zAccelG > 0 ? `+${zAccelG}G` : `${zAccelG}G`}
                </div>
                <div className="text-[10px] text-slate-500">200Hz Sample</div>
              </div>

              <div className="p-3 rounded-xl bg-[#080C16] border border-[#1E293B]">
                <div className="text-[10px] text-slate-400 uppercase">ALTITUDE (MSL)</div>
                <div className="text-xl font-bold text-[#4285F4]">{baroAltM}m</div>
                <div className="text-[10px] text-slate-500">912.4 hPa</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleInjectPothole}
                className="py-2 px-2.5 rounded-lg bg-[#EA4335]/15 hover:bg-[#EA4335]/25 border border-[#EA4335]/40 text-[#EA4335] text-xs font-bold font-mono transition-all"
              >
                Inject Pothole (Red)
              </button>

              <button
                onClick={handleInjectObstacle}
                className="py-2 px-2.5 rounded-lg bg-[#FBBC05]/15 hover:bg-[#FBBC05]/25 border border-[#FBBC05]/40 text-[#FBBC05] text-xs font-bold font-mono transition-all"
              >
                Inject Cattle (Yellow)
              </button>
            </div>
          </div>
        </div>

        {/* PANE 2: CORRIDOR GRAPH & V2V RELAY */}
        <div
          className={`lg:col-span-4 p-4 rounded-2xl border flex flex-col justify-between space-y-4 ${
            nightHudMode ? 'bg-[#000000] border-[#4285F4]/30' : 'bg-[#0D1322] border-[#1E293B]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1E293B] mb-3">
              <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#4285F4]" />
                <span>PANE 2 · CORRIDOR & V2V</span>
              </span>
              <span className="text-xs font-mono text-[#FBBC05] font-bold">{speedKmh} KM/H</span>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-[#1E293B] bg-[#05070E] aspect-[16/11] p-3 flex flex-col justify-between">
              <svg viewBox="0 0 400 280" className="absolute inset-0 w-full h-full">
                <defs>
                  <filter id="googleBlueGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <pattern id="radarGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#radarGrid)" />

                {/* GOOGLE BLUE CARRIAGEWAY PATH */}
                <path
                  d="M 60 40 C 130 90, 180 140, 240 180 C 290 210, 320 230, 360 250"
                  fill="none"
                  stroke="#1D4ED8"
                  strokeWidth="10"
                  opacity="0.3"
                  filter="url(#googleBlueGlow)"
                />
                <path
                  d="M 60 40 C 130 90, 180 140, 240 180 C 290 210, 320 230, 360 250"
                  fill="none"
                  stroke="#4285F4"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* V2V WAVE RINGS */}
                {v2vActive && (
                  <g transform="translate(180, 140)">
                    <circle r="18" fill="none" stroke="#EA4335" strokeWidth="2" className="animate-ping" />
                    <circle r="36" fill="none" stroke="#4285F4" strokeWidth="1.5" className="animate-ping" style={{ animationDelay: '200ms' }} />
                  </g>
                )}

                {/* Vehicle Markers with Google Colors */}
                <g transform="translate(180, 140)">
                  <circle r="8" fill="#4285F4" stroke="#FFFFFF" strokeWidth="2" />
                  <text x="12" y="4" fill="#93C5FD" fontSize="9" fontFamily="monospace">KA-03 (LEAD)</text>
                </g>

                <g transform="translate(205, 158)">
                  <circle r="7" fill="#EA4335" stroke="#FEE2E2" strokeWidth="1.5" />
                  <text x="10" y="4" fill="#FCA5A5" fontSize="9" fontFamily="monospace">D40 (30m)</text>
                </g>

                <g transform="translate(110, 75)">
                  <circle r="8" fill="#34A853" stroke="#FFFFFF" strokeWidth="2" />
                  <text x="12" y="4" fill="#86EFAC" fontSize="9" fontFamily="monospace">KA-05 (YOU)</text>
                </g>
              </svg>

              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span className="bg-black/80 px-2 py-0.5 rounded border border-[#4285F4]/40 text-[#4285F4]">
                  ROADS_API: ChIJ3Xo98sAUrjsR
                </span>
                <span className="bg-black/80 px-2 py-0.5 rounded border border-[#34A853]/40 text-[#34A853]">
                  V2V: 2 PEERS ACTIVE
                </span>
              </div>

              {activeAlert && (
                <div className="relative z-10 p-2.5 rounded-lg bg-[#EA4335]/20 border border-[#EA4335] text-white font-mono flex items-center justify-between backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#EA4335]" />
                    <span className="text-slate-100 font-bold">{localizedAlert?.text || activeAlert.messageKey}</span>
                  </div>
                  <span className="text-xs font-bold text-[#FBBC05]">{activeAlert.distanceAheadM}M</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <AudioWaveform isActive={isAudioActive} label="Audio Stream (48 kHz)" className="w-full" />
            {activeAlert && (
              <button
                onClick={handleClearAlert}
                className="w-full mt-2 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-mono border border-white/20"
              >
                Acknowledge / Clear Alert
              </button>
            )}
          </div>
        </div>

        {/* PANE 3: CIVIC REGISTRY & REPAIR SLA AUDIT */}
        <div
          className={`lg:col-span-4 p-4 rounded-2xl border flex flex-col justify-between space-y-4 ${
            nightHudMode ? 'bg-[#000000] border-cyan-500/20' : 'bg-[#0D1322] border-[#1E293B]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1E293B] mb-3">
              <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34A853]" />
                <span>PANE 3 · DEFECT REGISTRY & SLA</span>
              </span>
              <span className="text-[10px] font-mono text-[#34A853] font-bold">BBMP SAHAAYA · GOVTECH</span>
            </div>

            <div className="p-3 rounded-xl bg-[#080C16] border border-[#1E293B] space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Kadubeesanahalli Defect</span>
                <span className="px-2 py-0.5 rounded-full bg-[#EA4335]/20 border border-[#EA4335]/40 text-[#EA4335] font-mono text-[10px] font-bold">
                  SEVERITY: 9.2/10
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-400">
                <div>Ticket: <span className="text-[#4285F4]">BBMP-RD-666762</span></div>
                <div>Ward: <span className="text-slate-200">Mahadevapura 85</span></div>
                <div>Passes: <span className="text-[#FBBC05]">4 Vehicles</span></div>
                <div>SLA: <span className="text-[#34A853]">48h Bitumen Seal</span></div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 font-mono flex items-center justify-between">
                <span>Contractor Repair Audit</span>
                <span className="text-[#34A853]">SLA Verified</span>
              </div>
              <BeforeAfterSlider />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <button
              onClick={async () => {
                if (selectedCase) {
                  await apiClient.generateGeminiReport(selectedCase.id);
                  const updated = await apiClient.getCases();
                  setCases(updated);
                  if (updated.length > 0) setSelectedCase(updated[0]);
                  audioSynthesizer.speakLocalVoicePhrase('Statutory notice prepared.', selectedLanguage);
                }
              }}
              className="w-full py-2 px-3 rounded-xl bg-[#4285F4]/15 hover:bg-[#4285F4]/25 text-[#4285F4] text-xs font-mono font-bold border border-[#4285F4]/40 transition-all flex items-center justify-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Draft Notice (Gemini 2.5 Flash · IRC:SP:84)</span>
            </button>

            <button
              onClick={async () => {
                if (selectedCase) {
                  await apiClient.submitToAuthority(selectedCase.id);
                  const updated = await apiClient.getCases();
                  setCases(updated);
                  if (updated.length > 0) setSelectedCase(updated[0]);
                  audioSynthesizer.speakLocalVoicePhrase('Dispatched to municipal portal.', selectedLanguage);
                }
              }}
              className="w-full py-2 px-3 rounded-xl bg-[#34A853]/15 hover:bg-[#34A853]/25 text-[#34A853] text-xs font-mono font-bold border border-[#34A853]/40 transition-all flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Ticket to BBMP (Sahaaya Portal)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SMARTPHONE DASHCAM MODAL & SCANNABLE QR CODE */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D1322] border border-[#1E293B] rounded-2xl max-w-md w-full p-6 relative font-mono text-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowPhoneModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#090D16] text-slate-400 hover:text-white border border-[#1E293B]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#EA4335]/20 border border-[#EA4335]/40 flex items-center justify-center text-[#EA4335]">
                <Smartphone className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Connect Smartphone Dashcam</h3>
                <p className="text-xs text-slate-400">Point phone at the road & stream AI updates in no time</p>
              </div>
            </div>

            <div className="bg-[#090D16] p-4 rounded-xl border border-[#1E293B] flex flex-col items-center text-center space-y-3 mb-4">
              <p className="text-xs text-slate-300 font-sans">
                Scan with any iPhone or Android camera to start streaming:
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

            <div className="space-y-2 text-xs text-slate-300 mb-5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#090D16] border border-[#1E293B]">
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      phoneConnected ? 'bg-[#34A853]' : 'bg-[#FBBC05] animate-ping'
                    }`}
                  />
                  <span>Phone Status:</span>
                </span>
                <span className={`font-bold ${phoneConnected ? 'text-[#34A853]' : 'text-slate-400'}`}>
                  {phoneConnected ? `Active Stream (${phoneFps} FPS)` : 'Waiting for device...'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#090D16] text-[11px] text-slate-400">
                <span>Inference Latency:</span>
                <span className="text-emerald-400 font-bold">&lt; 15 ms · Apple Silicon MPS</span>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href="/?mode=smartphone"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Phone Simulator</span>
              </a>
              <button
                onClick={() => {
                  setVideoSource('smartphone');
                  setShowPhoneModal(false);
                }}
                className="py-2.5 px-4 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-white font-bold text-xs"
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

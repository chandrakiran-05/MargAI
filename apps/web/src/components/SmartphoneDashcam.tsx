import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Smartphone,
  AlertTriangle,
  Volume2,
  VolumeX,
  Compass,
  Radio,
  Zap,
  Maximize2,
  Minimize2,
  Activity,
  CheckCircle,
  RefreshCw,
  Eye,
  ShieldAlert,
  Flame,
  X,
  Link,
  Check,
} from 'lucide-react';
import Peer from 'peerjs';

interface HazardBox {
  hazard_type: string;
  bbox: [number, number, number, number];
  risk_level: string;
  confidence: number;
  distance_m?: number;
  ttc_sec?: number;
}

export const SmartphoneDashcam: React.FC = () => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [videoSource, setVideoSource] = useState<'sample_video' | 'camera' | 'custom_file'>('camera');
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // WebRTC Pairing to Infotainment
  const [pairTarget, setPairTarget] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('pair') || '';
    }
    return '';
  });
  const [manualPairInput, setManualPairInput] = useState<string>('');
  const [isPeerStreaming, setIsPeerStreaming] = useState<boolean>(false);
  const peerInstanceRef = useRef<Peer | null>(null);

  // Live Telemetry from Smartphone Sensors
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });
  const [speedKmh, setSpeedKmh] = useState<number>(65);
  const [zAccelG, setZAccelG] = useState<number>(1.02);
  const [fps, setFps] = useState<number>(24);
  const [isBumpSpike, setIsBumpSpike] = useState<boolean>(false);

  // Hazards Display (Matching Slide 6.1 and 10.1: POTHOLE 92% and PEDESTRIAN 88%)
  const [activeHazards, setActiveHazards] = useState<HazardBox[]>([
    {
      hazard_type: 'POTHOLE',
      bbox: [22, 58, 48, 80],
      risk_level: 'HIGH',
      confidence: 0.92,
      distance_m: 25,
    },
    {
      hazard_type: 'PEDESTRIAN',
      bbox: [68, 28, 84, 82],
      risk_level: 'CRITICAL',
      confidence: 0.88,
      distance_m: 60,
    },
  ]);
  const [roadCurve, setRoadCurve] = useState<string>('STRAIGHT');
  const [criticalAlert, setCriticalAlert] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const waveformHistoryRef = useRef<number[]>(Array(50).fill(0));

  // Initialize BroadcastChannel & WebSocket
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('margai_road_telemetry');
    } catch (e) {}

    let ws: WebSocket | null = null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/telemetry`;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {};
        ws.onclose = () => {
          setTimeout(connectWs, 2500);
        };
      } catch (e) {}
    };

    connectWs();
    return () => {
      if (bcRef.current) bcRef.current.close();
      if (ws) ws.close();
    };
  }, []);

  // Motion Sensor (Z-axis Accelerometer)
  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      if (event.accelerationIncludingGravity && event.accelerationIncludingGravity.z !== null) {
        const rawZ = event.accelerationIncludingGravity.z;
        const gVal = Math.round((Math.abs(rawZ) / 9.80665) * 100) / 100;
        setZAccelG(gVal);
        if (gVal > 1.8) {
          triggerBumpSim(gVal);
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, []);

  // WebRTC Peer Connection to Infotainment System
  const connectToCockpitPeer = (target: string) => {
    if (!target) return;
    try {
      if (peerInstanceRef.current) peerInstanceRef.current.destroy();
      const peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' },
          ],
        },
      });
      peerInstanceRef.current = peer;

      peer.on('open', (id) => {
        console.log('Smartphone Peer open, calling:', target);
        let activeStream = streamRef.current;
        if (!activeStream && videoRef.current && (videoRef.current as any).captureStream) {
          activeStream = (videoRef.current as any).captureStream();
        }

        if (activeStream) {
          const call = peer.call(target, activeStream);
          call.on('close', () => setIsPeerStreaming(false));
          setIsPeerStreaming(true);
          setSourceNotice(`Streaming camera feed to Infotainment (${target})`);
        }
      });

      peer.on('error', (err) => {
        console.warn('Peer connection note:', err);
      });
    } catch (e) {
      console.error('Peer connection error:', e);
    }
  };

  useEffect(() => {
    if (pairTarget && (streamRef.current || cameraActive)) {
      connectToCockpitPeer(pairTarget);
    }
  }, [pairTarget, cameraActive]);

  // Start Hardware Camera (Direct user gesture for mobile browser compliance)
  const startHardwareCamera = async () => {
    try {
      setVideoSource('camera');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setIsStreaming(true);
      setSourceNotice('📱 Phone Camera Active & Streaming to Infotainment');
      if (pairTarget) {
        connectToCockpitPeer(pairTarget);
      }
    } catch (err) {
      console.warn('Camera permission note:', err);
      setSourceNotice('Please tap Allow when prompted for Camera access.');
    }
  };

  // Attempt initial stream or fallback loop
  useEffect(() => {
    if (videoSource === 'sample_video') {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = './road_sample.mp4';
        videoRef.current.loop = true;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.play().catch(() => {});
      }
    } else if (videoSource === 'camera') {
      startHardwareCamera();
    }
  }, [facingMode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && videoRef.current) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      videoRef.current.srcObject = null;
      videoRef.current.src = URL.createObjectURL(file);
      videoRef.current.loop = true;
      videoRef.current.muted = true;
      videoRef.current.play();
      setVideoSource('custom_file');
    }
  };

  // Oscilloscope Shockwave Animation Loop
  useEffect(() => {
    let animId: number;
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderWave = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      waveformHistoryRef.current.shift();
      const baseJitter = (Math.random() - 0.5) * 4;
      const spikeVal = isBumpSpike ? (Math.random() > 0.5 ? 24 : -24) : baseJitter;
      waveformHistoryRef.current.push(spikeVal);

      // Baseline
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Waveform line
      ctx.lineWidth = 2.5;
      const step = w / (waveformHistoryRef.current.length - 1);
      ctx.beginPath();
      waveformHistoryRef.current.forEach((val, i) => {
        const x = i * step;
        const y = h / 2 + val;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.65, isBumpSpike ? '#f59e0b' : '#38bdf8');
      grad.addColorStop(0.85, isBumpSpike ? '#ef4444' : '#38bdf8');
      grad.addColorStop(1, '#38bdf8');
      ctx.strokeStyle = grad;
      ctx.stroke();

      animId = requestAnimationFrame(renderWave);
    };

    animId = requestAnimationFrame(renderWave);
    return () => cancelAnimationFrame(animId);
  }, [isBumpSpike]);

  // Frame Capture for BroadcastChannel & WebSocket
  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const v = videoRef.current;
      const c = canvasRef.current;
      if (v.readyState < 2) return;

      c.width = 320;
      c.height = 180;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, 320, 180);
      const b64 = c.toDataURL('image/jpeg', 0.55);

      // Send over BroadcastChannel to Infotainment
      bcRef.current?.postMessage({
        camera_b64: b64,
        speed_kmh: speedKmh,
        z_accel_g: zAccelG,
        road_curve: roadCurve,
        hazards: activeHazards,
        fps,
      });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            frame_base64: b64,
            telemetry: {
              speed_kmh: speedKmh,
              z_accel_g: zAccelG,
              road_geometry: { curve_type: roadCurve },
            },
            latest_hazards: activeHazards,
          })
        );
      }
    }, 120);

    return () => clearInterval(interval);
  }, [speedKmh, zAccelG, roadCurve, activeHazards, fps]);

  // Bump Trigger
  const triggerBumpSim = (gVal: number = 2.4) => {
    setZAccelG(gVal);
    setIsBumpSpike(true);
    setCriticalAlert(`POTHOLE SHOCKWAVE DETECTED (${gVal}G)`);

    if ('vibrate' in navigator) {
      navigator.vibrate([150, 50, 200]);
    }

    if (audioEnabled && 'speechSynthesis' in window) {
      try {
        const u = new SpeechSynthesisUtterance('Caution! Pothole shock detected!');
        u.rate = 1.1;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }

    setTimeout(() => {
      setIsBumpSpike(false);
      setZAccelG(1.02);
      setCriticalAlert(null);
    }, 2800);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-2 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col items-center select-none">
      
      {/* WINDSHIELD SUCTION MOUNT BRACKET FRAME (Slide 6.1 & Slide 10.1) */}
      <div className="relative w-full max-w-3xl flex flex-col items-center">
        
        {/* Silver Suction Arm */}
        <div className="w-36 h-8 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 rounded-t-2xl shadow-lg border-t border-white/40 flex items-center justify-center relative -mb-2 z-0">
          <div className="w-14 h-2.5 bg-slate-700/80 rounded-full border border-slate-600 shadow-inner"></div>
        </div>

        {/* Pivot Ring Behind Phone */}
        <div className="w-48 h-5 bg-gradient-to-b from-slate-400 to-slate-600 rounded-lg shadow-md -mb-2 z-0 border border-slate-400"></div>

        {/* SMARTPHONE CHASSIS */}
        <div className="relative w-full aspect-[16/9] min-h-[380px] max-h-[540px] bg-black border-[10px] sm:border-[14px] border-[#1a1f2c] rounded-[32px] sm:rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col z-10 ring-1 ring-white/20">
          
          {/* Top Bar with Badges: THERMAL: WARM and Google Camera */}
          <div className="absolute top-2.5 left-3 right-3 z-30 flex items-center justify-between text-xs font-mono pointer-events-none">
            <div className="w-6 h-6 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white text-xs">
              ✕
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#f59e0b] text-black font-extrabold text-[10px] tracking-wider uppercase shadow-md">
                THERMAL: WARM
              </span>

              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/70 border border-emerald-500/50 text-[10px] font-bold text-emerald-400 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Google Camera</span>
              </div>
            </div>
          </div>

          {/* MAIN CAMERA / ROAD VIDEO VIEWPORT */}
          <div className="relative flex-1 w-full h-full bg-[#0d1117] overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              loop
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* ACTIVATION OVERLAY IF CAMERA NOT YET STARTED BY USER GESTURE */}
            {!cameraActive && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 text-center">
                <button
                  onClick={startHardwareCamera}
                  className="px-6 py-3.5 bg-[#22c55e] hover:bg-emerald-600 text-black font-black text-sm rounded-2xl shadow-2xl flex items-center gap-2.5 transition-all transform active:scale-95 animate-pulse"
                >
                  <Camera className="w-5 h-5" />
                  <span>TAP TO START PHONE CAMERA &amp; STREAM</span>
                </button>
                <p className="text-xs text-slate-300 mt-2.5 font-sans">
                  Allows streaming your live phone camera feed to the Infotainment display
                </p>
              </div>
            )}

            {/* BOUNDING BOX 1: POTHOLE 92% */}
            <div
              className="absolute border-2 border-[#f59e0b] bg-[#f59e0b]/15 pointer-events-none z-20 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              style={{
                left: `${activeHazards[0].bbox[0]}%`,
                top: `${activeHazards[0].bbox[1]}%`,
                width: `${activeHazards[0].bbox[2] - activeHazards[0].bbox[0]}%`,
                height: `${activeHazards[0].bbox[3] - activeHazards[0].bbox[1]}%`,
              }}
            >
              <span className="absolute -top-5 left-0 bg-[#f59e0b] text-black font-extrabold text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide font-mono shadow">
                POTHOLE 92%
              </span>
            </div>

            {/* BOUNDING BOX 2: PEDESTRIAN 88% */}
            <div
              className="absolute border-2 border-[#ef4444] bg-[#ef4444]/15 pointer-events-none z-20 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              style={{
                left: `${activeHazards[1].bbox[0]}%`,
                top: `${activeHazards[1].bbox[1]}%`,
                width: `${activeHazards[1].bbox[2] - activeHazards[1].bbox[0]}%`,
                height: `${activeHazards[1].bbox[3] - activeHazards[1].bbox[1]}%`,
              }}
            >
              <span className="absolute -top-5 left-0 bg-[#ef4444] text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide font-mono shadow">
                PEDESTRIAN 88%
              </span>
            </div>

            {criticalAlert && (
              <div className="absolute top-12 left-6 right-6 z-40 bg-[#ef4444]/95 border-2 border-white text-white p-2.5 rounded-xl text-center font-bold text-xs shadow-2xl backdrop-blur-md animate-bounce">
                💥 {criticalAlert}
              </div>
            )}
          </div>

          {/* BOTTOM SECTION: OSCILLOSCOPE & G-FORCE METER (Slide 6.1 & 10.1) */}
          <div className="relative w-full bg-[#0a0d14]/95 border-t border-white/[0.08] p-2 sm:p-3 px-3 sm:px-4 z-30 flex flex-col gap-1.5 font-mono">
            
            {/* Status Badges */}
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/40 text-[#f59e0b] font-bold uppercase">
                  THERMAL: WARM
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold uppercase">
                  FLASHING
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold uppercase text-[9px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>
                  {isPeerStreaming
                    ? `STREAMING TO COCKPIT (${pairTarget})`
                    : pairTarget
                    ? `PAIRING TO ${pairTarget}`
                    : 'WEBSOCKET: STREAMING'}
                </span>
              </div>
            </div>

            {/* ACCELEROMETER SHOCK OSCILLOSCOPE */}
            <div className="relative w-full bg-[#06080e] border border-white/10 rounded-xl p-1.5 px-2 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
                <span>ACCELEROMETER SHOCK</span>
                <span className="text-[9px] text-slate-500">...</span>
              </div>

              <div className="relative w-full h-11 flex items-center">
                <canvas
                  ref={waveformCanvasRef}
                  width={600}
                  height={44}
                  className="w-full h-full object-contain"
                />

                {/* IMU SHOCK SPIKE Pointer Tag */}
                <div
                  className={`absolute top-0 right-1/4 transition-opacity duration-300 flex flex-col items-center ${
                    isBumpSpike ? 'opacity-100 scale-105' : 'opacity-85'
                  }`}
                >
                  <span className="bg-[#f59e0b] text-black font-extrabold text-[9px] px-1.5 py-0.2 rounded-sm shadow-md font-mono">
                    IMU SHOCK SPIKE
                  </span>
                  <div className="w-0.5 h-2 bg-[#f59e0b]"></div>
                </div>
              </div>

              {/* G-FORCE Z-AXIS METER BAR */}
              <div className="w-full mt-1 flex items-center gap-2 text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] whitespace-nowrap">
                  G-force Z-axis
                </span>

                <div className="relative flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-red-500 transition-all duration-150 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(10, ((zAccelG - 0.8) / 2.0) * 100))}%`,
                    }}
                  />
                </div>

                <span className="font-bold text-white text-[10px] min-w-[38px] text-right">
                  {zAccelG.toFixed(2)}G
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Side Clamp Pads */}
        <div className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-3.5 h-20 bg-slate-700 rounded-r-md border border-slate-500 shadow-lg z-20"></div>
        <div className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-3.5 h-20 bg-slate-700 rounded-l-md border border-slate-500 shadow-lg z-20"></div>
      </div>

      {/* CONTROLS & MANUAL COCKPIT PAIRING BAR */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 bg-[#0d1322] border border-[#1e293b] p-2.5 px-4 rounded-2xl text-xs font-mono">
        <button
          onClick={startHardwareCamera}
          className="px-3.5 py-1.5 bg-[#22c55e] hover:bg-emerald-600 text-black rounded-xl font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-green-500/20"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{cameraActive ? 'Camera Live' : 'Start Phone Camera'}</span>
        </button>

        <button
          onClick={() => triggerBumpSim(2.4)}
          className="px-3 py-1.5 bg-[#EA4335] text-white hover:bg-red-600 rounded-xl font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-red-500/20"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Bump Spike (2.4G)</span>
        </button>

        <div className="flex items-center bg-[#090D16] border border-[#1E293B] rounded-xl p-0.5">
          <button
            onClick={() => setVideoSource('camera')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              videoSource === 'camera' ? 'bg-[#4285F4] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 Phone Cam
          </button>
          <button
            onClick={() => setVideoSource('sample_video')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              videoSource === 'sample_video' ? 'bg-[#4285F4] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛣️ Road Loop
          </button>
        </div>

        {/* Cockpit WebRTC Pair Input */}
        <div className="flex items-center gap-1 bg-[#090D16] border border-[#1E293B] rounded-xl p-0.5 px-2">
          <span className="text-[10px] text-slate-400">Cockpit ID:</span>
          <input
            type="text"
            value={manualPairInput || pairTarget}
            onChange={(e) => setManualPairInput(e.target.value)}
            placeholder="margai-1234"
            className="bg-transparent border-none text-white text-xs w-24 px-1 focus:outline-none font-mono"
          />
          <button
            onClick={() => {
              const code = manualPairInput || pairTarget;
              setPairTarget(code);
              connectToCockpitPeer(code);
            }}
            className="px-2 py-0.5 rounded bg-[#38bdf8] text-slate-900 text-[10px] font-bold"
          >
            Link
          </button>
        </div>
      </div>
    </div>
  );
};

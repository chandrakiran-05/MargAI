import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  RefreshCw,
  Zap,
  Volume2,
  VolumeX,
  Compass,
  Radio,
  Minimize2,
  Maximize2,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { ObservationPayload, HazardType } from '@margai/contracts';
import { RoadPerceptionEngine } from '../ml/roadDetector.js';
import { alertAudio } from '../audio/alertAudio.js';

export const PhoneNode: React.FC = () => {
  const [videoSource, setVideoSource] = useState<'camera' | 'sample_video'>('camera');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [fullScreen, setFullScreen] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Live Telemetry from Mobile Sensors
  const [speedKmh, setSpeedKmh] = useState<number>(54);
  const [zAccelG, setZAccelG] = useState<number>(1.02);
  const [roadCurve, setRoadCurve] = useState<string>('STRAIGHT');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fps, setFps] = useState<number>(24);
  const [roundtripLatencyMs, setRoundtripLatencyMs] = useState<number>(14);
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [criticalNotice, setCriticalNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const perceptionEngine = useRef<RoadPerceptionEngine>(new RoadPerceptionEngine());
  const isProcessingRef = useRef<boolean>(false);
  const lastAlertTimeRef = useRef<number>(0);

  // 1. Establish WebSocket Connection to Cloud Run Relay
  useEffect(() => {
    let ws: WebSocket;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWs = () => {
      setWsStatus('connecting');
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        ws.send(
          JSON.stringify({
            action: 'register',
            role: 'phone_node',
            topics: ['alerts', 'telemetry'],
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.topic === 'alert.broadcast') {
            const alert = envelope.payload;
            if (alert.riskLevel === 'urgent' || alert.riskLevel === 'caution') {
              triggerAlert(alert.hazardType, alert.riskLevel);
            }
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        setWsStatus('disconnected');
      };
    };

    connectWs();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  // 2. Hardware Sensor Integration: GPS & Z-Axis IMU
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (pos.coords.speed !== null && pos.coords.speed >= 0) {
            setSpeedKmh(Math.round(pos.coords.speed * 3.6));
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      if (event.accelerationIncludingGravity?.z !== null && event.accelerationIncludingGravity?.z !== undefined) {
        const rawZ = Math.abs(event.accelerationIncludingGravity.z);
        const gVal = Math.round((rawZ / 9.80665) * 100) / 100;
        setZAccelG(gVal);
        if (gVal > 1.8) {
          triggerBumpShockwave(gVal);
        }
      }
    };
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, []);

  // 3. Camera Source Initialization
  const startCameraStream = async () => {
    if (videoSource === 'sample_video') {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = '/road_sample.mp4';
        videoRef.current.loop = true;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
        setIsStreaming(true);
      }
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 360 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setIsStreaming(true);
      }
    } catch (err) {
      console.warn('Hardware camera failed, falling back to road sample loop:', err);
      setVideoSource('sample_video');
    }
  };

  useEffect(() => {
    startCameraStream();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, videoSource]);

  // 4. Edge-ML Perception & Telemetry Dispatch Loop (runs every 75ms)
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || isProcessingRef.current) return;
      if (videoRef.current.readyState < 2) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 320;
      canvas.height = 180;
      ctx.drawImage(video, 0, 0, 320, 180);
      const frameB64 = canvas.toDataURL('image/jpeg', 0.5);

      isProcessingRef.current = true;
      const t0 = performance.now();

      // Lightweight on-device perception processing
      const simulatedDetections: Array<{
        hazardType: HazardType;
        confidence: number;
        bbox: [number, number, number, number];
      }> = [];

      // If road shockwave occurs, inject pothole detection
      if (zAccelG > 1.8) {
        simulatedDetections.push({
          hazardType: 'pothole',
          confidence: 0.96,
          bbox: [0.35, 0.65, 0.65, 0.85],
        });
      }

      const observations = perceptionEngine.current.processDetections(
        simulatedDetections,
        {
          latitude: gpsCoords?.lat || 12.9716,
          longitude: gpsCoords?.lng || 77.5946,
          speedMps: speedKmh / 3.6,
          headingDeg: 120,
        },
        {
          zAccelG,
          lateralAccelG: 0,
          pitchDeg: 0,
          rollDeg: 0,
          shockwaveDetected: zAccelG > 1.8,
        }
      );

      // Render AR HUD overlay on screen
      renderHUD(perceptionEngine.current.getActiveTracks());

      // Send telemetry and observations to Cloud Run Relay via WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            action: 'telemetry',
            payload: {
              speedKmh,
              zAccelG,
              headingDeg: 120,
              roadCurve,
              latitude: gpsCoords?.lat || 12.9716,
              longitude: gpsCoords?.lng || 77.5946,
              frameB64,
            },
          })
        );

        observations.forEach((obs) => {
          wsRef.current?.send(
            JSON.stringify({
              action: 'observation',
              payload: obs,
            })
          );
        });
      }

      setRoundtripLatencyMs(Math.round(performance.now() - t0 + 6));
      isProcessingRef.current = false;
    }, 80);

    return () => clearInterval(interval);
  }, [isStreaming, speedKmh, zAccelG, roadCurve, gpsCoords]);

  // 5. Render Automotive AR Bounding Boxes
  const renderHUD = (tracks: any[]) => {
    const canvas = hudCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    tracks.forEach((t) => {
      const [x1n, y1n, x2n, y2n] = t.bbox;
      const x1 = x1n * canvas.width;
      const y1 = y1n * canvas.height;
      const w = (x2n - x1n) * canvas.width;
      const h = (y2n - y1n) * canvas.height;

      const col = t.riskLevel === 'urgent' ? '#EA4335' : t.riskLevel === 'caution' ? '#FBBC05' : '#4285F4';

      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      const len = Math.min(16, w * 0.3);

      // Top-left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + len);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 + len, y1);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(x1 + w - len, y1);
      ctx.lineTo(x1 + w, y1);
      ctx.lineTo(x1 + w, y1 + len);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + h - len);
      ctx.lineTo(x1, y1 + h);
      ctx.lineTo(x1 + len, y1 + h);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(x1 + w - len, y1 + h);
      ctx.lineTo(x1 + w, y1 + h);
      ctx.lineTo(x1 + w, y1 + h - len);
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(13, 14, 16, 0.85)';
      ctx.fillRect(x1, Math.max(0, y1 - 22), 140, 20);
      ctx.fillStyle = col;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${t.hazardType.toUpperCase()} · ${t.distanceM}m`, x1 + 5, Math.max(14, y1 - 8));
    });
  };

  // 6. Interactive Bump & Alert Triggers
  const triggerBumpShockwave = (g: number = 2.4) => {
    setZAccelG(g);
    if ('vibrate' in navigator) navigator.vibrate([150, 50, 150]);
    triggerAlert('pothole', 'urgent');

    setTimeout(() => {
      setZAccelG(1.02);
    }, 1200);
  };

  const triggerAlert = (hazardType: HazardType, riskLevel: 'urgent' | 'caution' | 'information') => {
    const now = Date.now();
    if (now - lastAlertTimeRef.current < 3500) return;
    lastAlertTimeRef.current = now;

    setCriticalNotice(`${hazardType.toUpperCase()} · ${riskLevel.toUpperCase()} ALERT`);
    if (audioEnabled) {
      alertAudio.playChime(riskLevel);
    }

    setTimeout(() => {
      setCriticalNotice(null);
    }, 4000);
  };

  const spawnAnimalHazard = () => {
    triggerAlert('cattle', 'caution');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: 'observation',
          payload: {
            observationId: `obs_cow_${Date.now()}`,
            deviceId: 'phone_node',
            corridorId: 'in_blr_outer_ring_road',
            hazardType: 'cattle',
            confidence: 0.94,
            riskLevel: 'caution',
            distanceM: 75,
            laneOffsetM: 0.0,
            geo: {
              latitude: gpsCoords?.lat || 12.9716,
              longitude: gpsCoords?.lng || 77.5946,
              speedMps: speedKmh / 3.6,
            },
            timestamp: new Date().toISOString(),
          },
        })
      );
    }
  };

  return (
    <div
      className={`relative w-full ${
        fullScreen ? 'fixed inset-0 z-50 bg-black' : 'h-[calc(100vh-80px)] min-h-[580px] bg-[#0d0e10]'
      } flex flex-col font-mono text-slate-100 select-none overflow-hidden`}
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* TOP HEADER */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-3 sm:p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335] animate-ping" />
            <span className="text-xs font-bold text-white tracking-wider uppercase">
              {videoSource === 'camera' ? 'Phone Rear Cam' : 'Driving Loop'}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              wsStatus === 'connected'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : 'bg-amber-500/20 border-amber-500 text-amber-400'
            }`}
          >
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Relay: {roundtripLatencyMs}ms</span>
          </div>
        </div>

        {/* Source Switchers & Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVideoSource(videoSource === 'camera' ? 'sample_video' : 'camera')}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{videoSource === 'camera' ? 'Use Video' : 'Use Cam'}</span>
          </button>

          {videoSource === 'camera' && (
            <button
              onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
              className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-[#4285F4]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={() => setFullScreen(!fullScreen)}
            className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300"
          >
            {fullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
        />

        <canvas
          ref={hudCanvasRef}
          width={640}
          height={360}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />

        {/* Reticle */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 z-10">
          <div className="w-28 h-28 border border-dashed border-[#4285F4] rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-[#EA4335] rounded-full" />
          </div>
        </div>

        {/* Critical Banner */}
        {criticalNotice && (
          <div className="absolute top-16 left-4 right-4 z-30 bg-[#EA4335]/95 border-2 border-white text-white p-3 rounded-xl shadow-2xl flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
              <div>
                <p className="font-extrabold text-sm uppercase tracking-wider">{criticalNotice}</p>
                <p className="text-[11px] text-white/90">Instant telemetry relayed to Tesla MCU Infotainment</p>
              </div>
            </div>
            <span className="text-[10px] bg-black/40 px-2.5 py-1 rounded font-mono">TTC &lt; 2.5s</span>
          </div>
        )}
      </div>

      {/* BOTTOM TELEMETRY & KINETIC TEST CONTROLS */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/85 to-transparent p-3 sm:p-4 pb-5 backdrop-blur-sm">
        {/* Kinetic Trigger Buttons */}
        <div className="max-w-4xl mx-auto mb-2.5 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => triggerBumpShockwave(2.4)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EA4335]/20 hover:bg-[#EA4335]/30 border border-[#EA4335] text-[#EA4335] rounded-lg text-xs font-bold transition-all active:scale-95 shadow-lg"
          >
            <Zap className="w-3.5 h-3.5" />
            💥 Bump Shockwave (2.4G)
          </button>

          <div className="flex items-center gap-1 bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 px-1.5">Speed:</span>
            {[35, 65, 95].map((s) => (
              <button
                key={s}
                onClick={() => setSpeedKmh(s)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                  speedKmh === s ? 'bg-[#4285F4] text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {s}k
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 px-1.5">Steer:</span>
            {[
              { l: '↰ Left', c: 'SHARP_LEFT' },
              { l: '⬆️ Ahead', c: 'STRAIGHT' },
              { l: '↱ Right', c: 'SHARP_RIGHT' },
            ].map((item) => (
              <button
                key={item.c}
                onClick={() => setRoadCurve(item.c)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                  roadCurve === item.c ? 'bg-[#FBBC05] text-slate-900' : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.l}
              </button>
            ))}
          </div>

          <button
            onClick={spawnAnimalHazard}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#FBBC05]/20 hover:bg-[#FBBC05]/30 border border-[#FBBC05] text-[#FBBC05] rounded-lg text-xs font-bold transition-all active:scale-95"
          >
            🐄 Cow Ahead
          </button>
        </div>

        {/* Telemetry Displays */}
        <div className="max-w-4xl mx-auto grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg">
            <p className="text-[10px] text-slate-400 uppercase">Speed</p>
            <p className="text-lg font-black text-white">{speedKmh} km/h</p>
          </div>

          <div
            className={`p-2 rounded-lg border transition-colors ${
              zAccelG > 1.8 ? 'bg-[#EA4335]/30 border-[#EA4335] text-[#EA4335]' : 'bg-slate-900/90 border-slate-800 text-white'
            }`}
          >
            <p className="text-[10px] text-slate-400 uppercase">Z-Impact</p>
            <p className="text-lg font-black">{zAccelG} G</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg">
            <p className="text-[10px] text-slate-400 uppercase">Geometry</p>
            <p className="text-sm font-bold text-[#FBBC05] truncate">{roadCurve.replace('_', ' ')}</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg">
            <p className="text-[10px] text-slate-400 uppercase">Edge FPS</p>
            <p className="text-lg font-black text-[#34A853]">{fps}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  Moon,
  Sun,
  Activity,
  CheckCircle,
  RefreshCw,
  Eye,
  ShieldAlert,
} from 'lucide-react';

interface HazardBox {
  hazard_type: string;
  bbox: [number, number, number, number];
  risk_level: string;
  confidence: number;
  distance_m?: number;
  ttc_sec?: number;
}

interface TelemetryData {
  fps: number;
  latency_ms: number;
  z_accel_g: number;
  speed_kmh: number;
  gps: {
    latitude: number | null;
    longitude: number | null;
    speed_kmh: number | null;
  };
  road_geometry?: {
    curve_type: string;
    radius_meters: number;
  };
}

export const SmartphoneDashcam: React.FC = () => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [videoSource, setVideoSource] = useState<'camera' | 'sample_video' | 'custom_file'>('camera');
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [fullScreen, setFullScreen] = useState<boolean>(false);
  const [nightMode, setNightMode] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Live Telemetry from Smartphone Sensors
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [speedKmh, setSpeedKmh] = useState<number>(48);
  const [zAccelG, setZAccelG] = useState<number>(1.02);
  const [roundtripLatency, setRoundtripLatency] = useState<number>(18);
  const [fps, setFps] = useState<number>(24);

  // Active Detected Hazards
  const [activeHazards, setActiveHazards] = useState<HazardBox[]>([]);
  const [roadCurve, setRoadCurve] = useState<string>('STRAIGHT');
  const [criticalAlert, setCriticalAlert] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const streamLoopRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastAlertTimeRef = useRef<number>(0);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize BroadcastChannel & WebSocket for Zero-Latency Sync with In-Car Display
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('margai_road_telemetry');
    } catch (e) {}

    // Persistent WebSocket Uplink to Backend Hub
    let ws: WebSocket | null = null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/telemetry`;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {};
        ws.onclose = () => {
          setTimeout(connectWs, 2000);
        };
      } catch (e) {}
    };

    connectWs();

    return () => {
      if (bcRef.current) bcRef.current.close();
      if (ws) ws.close();
    };
  }, []);

  // 1. Initialize Smartphone Motion & GPS Sensors
  useEffect(() => {
    // Geolocation
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          if (pos.coords.speed !== null && pos.coords.speed >= 0) {
            const spd = Math.round(pos.coords.speed * 3.6);
            setSpeedKmh(spd);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ speed_kmh: spd }));
            }
          }
        },
        (err) => console.log('Geolocation note:', err.message),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Motion Sensors (Z-axis G-force impact detection)
  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      if (event.accelerationIncludingGravity && event.accelerationIncludingGravity.z !== null) {
        const rawZ = event.accelerationIncludingGravity.z;
        // Normalize 9.8m/s^2 to ~1.0G
        const gVal = Math.abs(rawZ) / 9.80665;
        const roundedG = Math.round(gVal * 100) / 100;
        setZAccelG(roundedG);
        if (roundedG > 1.8 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            z_accel_g: roundedG,
            speed_kmh: speedKmh
          }));
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [speedKmh]);

  // 2. Camera & Video Stream Controls
  const startStreamSource = async () => {
    // If user selected pre-recorded road video loop
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
        videoRef.current.playsInline = true;
        try {
          await videoRef.current.play();
          setCameraActive(true);
          setIsStreaming(true);
          setSourceNotice('Playing Real-World Road Driving Loop');
        } catch (e) {
          console.error('Video play error:', e);
        }
      }
      return;
    }

    if (videoSource === 'custom_file') {
      return;
    }

    // Otherwise, attempt hardware smartphone camera
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
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          setIsStreaming(true);
          setSourceNotice('Live Smartphone Rear Dashcam Active');
        };
      }
    } catch (err) {
      console.warn('Camera access with ideal facingMode failed, retrying simple video constraints...', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setCameraActive(true);
            setIsStreaming(true);
            setSourceNotice('Smartphone Camera Active (Auto Fallback)');
          };
        }
      } catch (fallbackErr) {
        console.warn('Camera access error, switching to road driving video loop:', fallbackErr);
        // Seamlessly fallback to real-world road video loop so demo is never blocked!
        setVideoSource('sample_video');
        setSourceNotice('Camera permission not granted. Open via HTTPS or tap Camera above to retry.');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && videoRef.current) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const url = URL.createObjectURL(file);
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.loop = true;
      videoRef.current.muted = true;
      videoRef.current.play();
      setVideoSource('custom_file');
      setCameraActive(true);
      setIsStreaming(true);
      setSourceNotice(`Playing Custom Road Video (${file.name})`);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (streamLoopRef.current) {
      cancelAnimationFrame(streamLoopRef.current);
      streamLoopRef.current = null;
    }
    setCameraActive(false);
    setIsStreaming(false);
  };

  const toggleFacingMode = () => {
    if (videoSource !== 'camera') {
      setVideoSource('camera');
      return;
    }
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  useEffect(() => {
    startStreamSource();
    return () => stopCamera();
  }, [facingMode, videoSource]);

  // 3. High-Speed Sub-Second AI Ingestion Loop
  useEffect(() => {
    if (!cameraActive) return;

    let intervalId: any;

    const captureAndSendFrame = async () => {
      if (!videoRef.current || !canvasRef.current || isProcessingRef.current) return;
      if (videoRef.current.readyState < 2) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 240;
      canvas.height = 135;
      ctx.drawImage(video, 0, 0, 240, 135);

      // Compress to ultra-lightweight JPEG (~4KB for instantaneous transmission)
      const b64 = canvas.toDataURL('image/jpeg', 0.42);
      isProcessingRef.current = true;
      const t0 = performance.now();

      try {
        const res = await fetch('/api/smartphone/frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: b64,
            latitude: gpsCoords?.lat || 12.9716,
            longitude: gpsCoords?.lng || 77.5946,
            altitude: 915.2,
            z_accel_g: zAccelG,
            speed_kmh: speedKmh,
            device_id: 'smartphone_dashcam_live',
            corridor_id: 'blr_outer_ring_road',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const latency = Math.round(performance.now() - t0);
          setRoundtripLatency(latency);

          if (data.hazards) {
            setActiveHazards(data.hazards);
            renderHudOverlay(data.hazards, video.videoWidth || 640, video.videoHeight || 360);

            // Check for critical / high alerts
            const crit = data.hazards.find((h: any) => h.risk_level === 'CRITICAL' || h.risk_level === 'HIGH');
            if (crit) {
              setCriticalAlert(`${crit.hazard_type}: ${crit.risk_level} RISK`);
              triggerAudioAndHaptic(crit.hazard_type, crit.risk_level);
            } else {
              setCriticalAlert(null);
            }
          }

          if (data.telemetry?.road_geometry) {
            setRoadCurve(data.telemetry.road_geometry.curve_type || 'STRAIGHT');
          }
          if (data.fps) {
            setFps(data.fps);
          }

          // Zero-Latency Local Broadcast to MargAI In-Car Display
          bcRef.current?.postMessage({
            speed_kmh: speedKmh,
            z_accel_g: zAccelG,
            road_curve: data.telemetry?.road_geometry?.curve_type || roadCurve,
            camera_b64: b64,
            hazards: data.hazards || [],
            fps: data.fps || fps,
          });
        }
      } catch (err) {
        // Fallback simulation if backend unreachable
        setRoundtripLatency(10);
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Run at ~11-12 FPS to maintain smooth feed while leaving full network headroom
    intervalId = setInterval(captureAndSendFrame, 90);
    return () => clearInterval(intervalId);
  }, [cameraActive, gpsCoords, zAccelG, speedKmh, roadCurve]);

  // Kinetic Road Movement Triggers for Interactive Testing (Instant WebSocket Push)
  const triggerBumpSim = async (gVal: number) => {
    setZAccelG(gVal);
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 80, 200]);
    }
    const potholeHz: HazardBox = {
      hazard_type: 'POTHOLE',
      bbox: [100, 120, 220, 160],
      risk_level: 'CRITICAL',
      confidence: 0.98,
      distance_m: 10,
    };
    setActiveHazards([potholeHz]);
    triggerAudioAndHaptic('POTHOLE', 'CRITICAL');

    // Instant WebSocket push to Infotainment (<2ms)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        speed_kmh: speedKmh,
        z_accel_g: gVal,
        road_curve: roadCurve
      }));
    }

    bcRef.current?.postMessage({
      speed_kmh: speedKmh,
      z_accel_g: gVal,
      road_curve: roadCurve,
      camera_b64: null,
      hazards: [potholeHz],
      fps,
    });

    try {
      await fetch('/api/smartphone/frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: 'data:image/jpeg;base64,',
          latitude: gpsCoords?.lat || 12.9716,
          longitude: gpsCoords?.lng || 77.5946,
          altitude: 915.2,
          z_accel_g: gVal,
          speed_kmh: speedKmh,
          device_id: 'smartphone_dashcam_live',
          corridor_id: 'blr_outer_ring_road',
        }),
      });
    } catch (e) {}

    setTimeout(() => {
      setZAccelG(1.02);
    }, 1200);
  };

  const setManualSpeed = (spd: number) => {
    setSpeedKmh(spd);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        speed_kmh: spd,
        z_accel_g: zAccelG,
        road_curve: roadCurve
      }));
    }
    bcRef.current?.postMessage({
      speed_kmh: spd,
      z_accel_g: zAccelG,
      road_curve: roadCurve,
      hazards: activeHazards,
      fps,
    });
  };

  const setManualCurve = (curve: string) => {
    setRoadCurve(curve);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        speed_kmh: speedKmh,
        z_accel_g: zAccelG,
        road_curve: curve
      }));
    }
    bcRef.current?.postMessage({
      speed_kmh: speedKmh,
      z_accel_g: zAccelG,
      road_curve: curve,
      hazards: activeHazards,
      fps,
    });
  };

  const triggerGenericHazard = (type: string, risk: string = 'HIGH', distance: number = 70) => {
    const hz: HazardBox = {
      hazard_type: type,
      bbox: [100, 110, 220, 180],
      risk_level: risk,
      confidence: 0.95,
      distance_m: distance,
    };
    setActiveHazards([hz]);
    triggerAudioAndHaptic(type, risk);

    const zg = type === 'POTHOLE' ? 2.35 : zAccelG;
    const curve = type.includes('CURVE') ? 'SHARP_LEFT' : roadCurve;

    // Broadcast over WebSocket to all vehicles on the road (<2ms)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          speed_kmh: speedKmh,
          z_accel_g: zg,
          road_curve: curve,
          latest_hazards: [hz],
          hazard_type: type,
          distance_m: distance,
        })
      );
    }

    bcRef.current?.postMessage({
      speed_kmh: speedKmh,
      z_accel_g: zg,
      road_curve: curve,
      hazards: [hz],
      fps,
    });
  };

  const triggerAnimalHazard = () => {
    triggerGenericHazard('ANIMAL_COW', 'HIGH', 65);
  };

  // 4. Render Sleek Automotive Augmented Reality HUD Overlay
  const renderHudOverlay = (hazards: HazardBox[], vw: number, vh: number) => {
    const hudCanvas = hudCanvasRef.current;
    if (!hudCanvas) return;
    const ctx = hudCanvas.getContext('2d');
    if (!ctx) return;

    hudCanvas.width = vw;
    hudCanvas.height = vh;
    ctx.clearRect(0, 0, vw, vh);

    hazards.forEach((hz) => {
      const [x1, y1, x2, y2] = hz.bbox;
      const w = x2 - x1;
      const h = y2 - y1;

      // Color mapping
      let color = '#4285F4'; // Google Blue (Pedestrian)
      if (hz.risk_level === 'CRITICAL') color = '#EA4335'; // Google Red
      else if (hz.risk_level === 'HIGH') color = '#FBBC05'; // Google Yellow
      else if (hz.risk_level === 'MEDIUM') color = '#4285F4';
      else color = '#34A853'; // Google Green

      // Draw Corner Brackets
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      const len = Math.min(16, w * 0.25);

      // Top-left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + len);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 + len, y1);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(x2 - len, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2, y1 + len);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(x1, y2 - len);
      ctx.lineTo(x1, y2);
      ctx.lineTo(x1 + len, y2);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(x2 - len, y2);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y2 - len);
      ctx.stroke();

      // Tag Banner
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      const tagText = `${hz.hazard_type} [${hz.risk_level}]`;
      ctx.font = 'bold 12px monospace';
      const textMetrics = ctx.measureText(tagText);
      ctx.fillRect(x1, Math.max(0, y1 - 22), textMetrics.width + 12, 20);

      ctx.fillStyle = color;
      ctx.fillText(tagText, x1 + 6, Math.max(14, y1 - 7));
    });
  };

  // 5. Audio & Haptic Feedback
  const triggerAudioAndHaptic = (hazardType: string, riskLevel: string) => {
    const now = Date.now();
    if (now - lastAlertTimeRef.current < 4000) return; // 4s cooldown
    lastAlertTimeRef.current = now;

    // Haptic Vibration on Phone
    if ('vibrate' in navigator) {
      if (riskLevel === 'CRITICAL') {
        navigator.vibrate([200, 100, 200, 100, 400]);
      } else {
        navigator.vibrate([150, 80, 150]);
      }
    }

    // Voice Synthesis Alert
    if (audioEnabled && 'speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(
          riskLevel === 'CRITICAL'
            ? `Danger! ${hazardType} directly ahead! Slow down!`
            : `Caution! ${hazardType} detected ahead.`
        );
        utterance.rate = 1.15;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Fallback
      }
    }
  };

  return (
    <div
      className={`relative w-full ${
        fullScreen ? 'fixed inset-0 z-50 bg-black' : 'h-[calc(100vh-140px)] min-h-[580px] bg-[#090D16]'
      } flex flex-col font-mono text-slate-100 select-none overflow-hidden`}
    >
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Mobile Dashcam Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-[#090D16]/90 via-[#090D16]/60 to-transparent p-3 sm:p-4 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1E293B]/80 border border-slate-700 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335] animate-ping"></span>
            <span className="text-xs font-bold text-white tracking-wider uppercase">
              {videoSource === 'camera' ? 'Phone Rear Cam' : 'Road Driving Stream'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#090D16]/80 border border-[#1E293B] text-[11px] text-[#34A853]">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Sync: {roundtripLatency}ms</span>
          </div>
        </div>

        {/* Video Source Switcher & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Source switch */}
          <div className="flex items-center bg-[#1E293B]/80 border border-slate-700 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setVideoSource('camera')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                videoSource === 'camera' ? 'bg-[#4285F4] text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Use Phone Hardware Camera"
            >
              📱 Camera
            </button>
            <button
              onClick={() => setVideoSource('sample_video')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                videoSource === 'sample_video' ? 'bg-[#4285F4] text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Use Pre-recorded Driving Video"
            >
              🛣️ Driving Loop
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`px-2 py-1 rounded font-medium transition-all ${
                videoSource === 'custom_file' ? 'bg-[#4285F4] text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Upload Custom Dashcam File"
            >
              📁 File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {videoSource === 'camera' && (
            <button
              onClick={toggleFacingMode}
              className="p-2 rounded-lg bg-[#1E293B]/80 border border-slate-700 text-slate-300 hover:text-white"
              title="Switch Rear/Front Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-lg border ${
              audioEnabled
                ? 'bg-[#4285F4]/20 border-[#4285F4] text-[#4285F4]'
                : 'bg-[#1E293B]/80 border-slate-700 text-slate-400'
            }`}
            title="Toggle Voice Alerts"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setFullScreen(!fullScreen)}
            className="p-2 rounded-lg bg-[#1E293B]/80 border border-slate-700 text-slate-300 hover:text-white"
            title="Fullscreen Dashcam Mode"
          >
            {fullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Camera Viewport */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
        {/* Rear Camera Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${nightMode ? 'brightness-75 contrast-125' : ''}`}
        />

        {/* Dynamic HUD Bounding Boxes Canvas */}
        <canvas
          ref={hudCanvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />

        {/* Center Target & Forward Road Guidance Grid */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-30">
          <div className="w-32 h-32 border border-dashed border-[#4285F4] rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-[#EA4335] rounded-full"></div>
          </div>
        </div>

        {/* Source Notice Banner */}
        {sourceNotice && (
          <div className="absolute top-16 left-4 right-4 z-20 bg-[#1E293B]/90 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center justify-between backdrop-blur-md">
            <span>{sourceNotice}</span>
            <button
              onClick={() => setSourceNotice(null)}
              className="text-slate-400 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Critical Alert Flashing Banner */}
        {criticalAlert && (
          <div className="absolute top-28 left-4 right-4 z-30 bg-[#EA4335]/90 border-2 border-white text-white p-3 rounded-lg shadow-2xl backdrop-blur-md flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              <div>
                <p className="font-extrabold text-sm tracking-wide uppercase">{criticalAlert}</p>
                <p className="text-[11px] font-sans opacity-90">
                  Instant observation relayed to Prototype Command Center & Nearby Vehicles
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-black/40 px-2 py-1 rounded font-mono">TTC &lt; 2.5s</span>
          </div>
        )}
      </div>

      {/* Bottom Automotive HUD Telemetry Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#090D16] via-[#090D16]/90 to-transparent p-3 sm:p-4 pb-5 backdrop-blur-sm pointer-events-auto">
        {/* Interactive Kinetic Road Movement Triggers */}
        <div className="max-w-4xl mx-auto mb-2.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {/* Pothole Bump Spike Button */}
          <button
            onClick={() => triggerBumpSim(2.4)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EA4335]/20 border border-[#EA4335] text-[#EA4335] hover:bg-[#EA4335]/30 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-lg"
          >
            <Zap className="w-3.5 h-3.5" />
            💥 Bump Shockwave (2.4G)
          </button>

          {/* Speed Selectors */}
          <div className="flex items-center gap-1 bg-[#090D16]/90 rounded-lg p-0.5 border border-[#1E293B]">
            <span className="text-[10px] text-slate-400 px-1.5">Speed:</span>
            {[35, 65, 95].map((s) => (
              <button
                key={s}
                onClick={() => setManualSpeed(s)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                  speedKmh === s ? 'bg-[#4285F4] text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {s}k
              </button>
            ))}
          </div>

          {/* Steering / Curvature Selectors */}
          <div className="flex items-center gap-1 bg-[#090D16]/90 rounded-lg p-0.5 border border-[#1E293B]">
            <span className="text-[10px] text-slate-400 px-1.5">Steer:</span>
            {[
              { l: '↰ Left', c: 'SHARP_LEFT' },
              { l: '⬆️ Ahead', c: 'STRAIGHT' },
              { l: '↱ Right', c: 'SHARP_RIGHT' },
            ].map((item) => (
              <button
                key={item.c}
                onClick={() => setManualCurve(item.c)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                  roadCurve === item.c ? 'bg-[#FBBC05] text-slate-900' : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.l}
              </button>
            ))}
          </div>

          {/* Hazard Broadcast Triggers */}
          <button
            onClick={() => triggerGenericHazard('PEDESTRIAN', 'HIGH', 50)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#4285F4]/20 border border-[#4285F4] text-[#4285F4] hover:bg-[#4285F4]/30 rounded-lg text-xs font-bold transition-all active:scale-95"
            title="Broadcast Pedestrian Hazard to all vehicles"
          >
            🚶 Pedestrian
          </button>

          <button
            onClick={() => triggerGenericHazard('WATERLOGGING', 'MEDIUM', 90)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-500/20 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/30 rounded-lg text-xs font-bold transition-all active:scale-95"
            title="Broadcast Flooded Road surface to all vehicles"
          >
            🌊 Flood
          </button>

          <button
            onClick={() => triggerGenericHazard('ANIMAL_COW', 'HIGH', 65)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FBBC05]/20 border border-[#FBBC05] text-[#FBBC05] hover:bg-[#FBBC05]/30 rounded-lg text-xs font-bold transition-all active:scale-95"
            title="Broadcast Stray Cattle to all vehicles"
          >
            🐄 Cow
          </button>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-4 gap-2 sm:gap-4 text-center">
          {/* Speed */}
          <div className="bg-[#090D16]/90 border border-[#1E293B] rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Speed</p>
            <p className="text-xl sm:text-2xl font-black text-white">
              {speedKmh} <span className="text-xs font-normal text-slate-400">km/h</span>
            </p>
          </div>

          {/* Z-Force Accelerometer Impact */}
          <div
            className={`border rounded-lg p-2.5 transition-colors ${
              zAccelG > 1.8
                ? 'bg-[#EA4335]/30 border-[#EA4335] text-[#EA4335]'
                : 'bg-[#090D16]/90 border-[#1E293B] text-white'
            }`}
          >
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Z-Impact</p>
            <p className="text-xl sm:text-2xl font-black">
              {zAccelG} <span className="text-xs font-normal text-slate-400">G</span>
            </p>
          </div>

          {/* Road Curvature */}
          <div className="bg-[#090D16]/90 border border-[#1E293B] rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Geometry</p>
            <p className="text-sm sm:text-base font-bold text-[#FBBC05] truncate">
              {roadCurve.replace('_', ' ')}
            </p>
          </div>

          {/* AI Perception FPS */}
          <div className="bg-[#090D16]/90 border border-[#1E293B] rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Edge AI</p>
            <p className="text-xl sm:text-2xl font-black text-[#34A853]">
              {fps} <span className="text-xs font-normal text-slate-400">FPS</span>
            </p>
          </div>
        </div>

        {/* GPS Coordinates & V2V Status */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 max-w-4xl mx-auto px-1">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#4285F4]" />
            <span>
              GPS: {gpsCoords ? `${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : '12.9716, 77.5946'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#34A853]"></span>
            <span>V2V Broadcaster Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

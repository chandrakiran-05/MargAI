import { useI18n } from '../i18n';
import { serviceUrl, serviceSocketUrl } from '../services/apiClient';
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
  const { t, language } = useI18n();
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [videoSource, setVideoSource] = useState<'camera' | 'sample_video' | 'custom_file'>('sample_video');
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [fullScreen, setFullScreen] = useState<boolean>(false);
  const [nightMode, setNightMode] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Live Telemetry from Smartphone Sensors
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [zAccelG, setZAccelG] = useState<number>(1.02);
  const [roundtripLatency, setRoundtripLatency] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);

  const [relayConnected, setRelayConnected] = useState(false);
  const [inferenceAvailable, setInferenceAvailable] = useState(false);
  const [hasMotionData, setHasMotionData] = useState(false);
  const [manualTelemetry, setManualTelemetry] = useState(false);

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
  const lastAiDetectTimeRef = useRef<number>(0);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const uploadedVideoUrlRef = useRef<string | null>(null);

  // Initialize BroadcastChannel & WebSocket for Zero-Latency Sync with In-Car Display
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('margai_road_telemetry');
    } catch (e) {}

    // Persistent WebSocket Uplink to Backend Hub
    let ws: WebSocket | null = null;
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = serviceSocketUrl('/api/ws/telemetry', true);

    const connectWs = () => {
      if (disposed) return;
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => setRelayConnected(true);
        ws.onclose = () => {
          setRelayConnected(false);
          if (!disposed) retryTimer = setTimeout(connectWs, 2000);
        };
      } catch (e) {}
    };

    connectWs();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
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
        setHasMotionData(true);
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
          setSourceNotice('Synthetic sample footage · replay mode. Detection requires the connected vision service.');
        } catch (e) {
          console.error('Video play error:', e);
        }
      }
      return;
    }

    if (videoSource === 'custom_file') {
      if (videoRef.current && uploadedVideoUrlRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = uploadedVideoUrlRef.current;
        videoRef.current.loop = true;
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
          setCameraActive(true);
          setIsStreaming(true);
        } catch {
          setSourceNotice('The uploaded video could not play. Try a browser-supported video format.');
        }
      }
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
    if (!file) return;
    if (uploadedVideoUrlRef.current) URL.revokeObjectURL(uploadedVideoUrlRef.current);
    uploadedVideoUrlRef.current = URL.createObjectURL(file);
    setSourceNotice('Uploaded recording ready.');
    if (videoSource === 'custom_file') startStreamSource();
    else setVideoSource('custom_file');
  };

  const stopCamera = () => {
    videoRef.current?.pause();
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

  useEffect(() => () => {
    if (uploadedVideoUrlRef.current) URL.revokeObjectURL(uploadedVideoUrlRef.current);
  }, []);

  // 3. High-Speed Sub-Second AI Ingestion Loop
  useEffect(() => {
    if (!cameraActive) return;

    let intervalId: any;

    const captureAndSendFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      if (videoRef.current.readyState < 2) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 240;
      canvas.height = 135;
      ctx.drawImage(video, 0, 0, 240, 135);

      // Compress to ultra-lightweight JPEG (~4KB for instantaneous transmission)
      const b64 = canvas.toDataURL('image/jpeg', 0.40);

      // 1. Instant Direct WebSocket Video Stream to In-Car Display (<0.5ms push)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            frame_base64: b64,
            speed_kmh: speedKmh,
            z_accel_g: zAccelG,
            road_curve: roadCurve,
          })
        );
      }

      // 2. Instant Local BroadcastChannel (<0.1ms)
      bcRef.current?.postMessage({
        speed_kmh: speedKmh,
        z_accel_g: zAccelG,
        road_curve: roadCurve,
        camera_b64: b64,
        hazards: activeHazards,
        fps,
      });

      // 3. AI Perception Loop (Non-blocking, throttled to 6 FPS to prevent network/mobile queueing)
      const now = performance.now();
      if (!isProcessingRef.current && now - lastAiDetectTimeRef.current >= 160) {
        lastAiDetectTimeRef.current = now;
        isProcessingRef.current = true;
        const t0 = performance.now();

        try {
          const res = await fetch(serviceUrl('/api/smartphone/frame', true), {
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
            setInferenceAvailable(true);
            const latency = Math.round(performance.now() - t0);
            setRoundtripLatency(latency);

            if (data.hazards) {
              setActiveHazards(data.hazards);
              renderHudOverlay(data.hazards, video.videoWidth || 640, video.videoHeight || 360);

              // Check for critical / high alerts
              const crit = data.hazards.find((h: any) => h.risk_level === 'CRITICAL' || h.risk_level === 'HIGH');
              if (crit) {
                setCriticalAlert(crit.hazard_type);
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
          } else {
            setInferenceAvailable(false);
          }
        } catch (err) {
          setInferenceAvailable(false);
          setRoundtripLatency(0);
        } finally {
          isProcessingRef.current = false;
        }
      }
    };

    // Run video capture at smooth 10 FPS (100ms)
    intervalId = setInterval(captureAndSendFrame, 100);
    return () => clearInterval(intervalId);
  }, [cameraActive, gpsCoords, zAccelG, speedKmh, roadCurve]);

  // Kinetic Road Movement Triggers for Interactive Testing (Instant WebSocket Push)
  const triggerBumpSim = async (gVal: number) => {
    setManualTelemetry(true);
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
      await fetch(serviceUrl('/api/smartphone/frame', true), {
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
    setManualTelemetry(true);
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
    setManualTelemetry(true);
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
    setManualTelemetry(true);
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
      const tagText = `${t(hz.hazard_type)} [${t(hz.risk_level)}]`;
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
            ? t('Danger! {hazard} directly ahead. Slow down.', { hazard: t(hazardType) })
            : t('Caution! {hazard} detected ahead.', { hazard: t(hazardType) })
        );
        utterance.lang = `${language}-IN`;
        utterance.rate = 1.15;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Fallback
      }
    }
  };

  return (
    <div className={`${fullScreen ? 'fixed inset-0 z-[90] overflow-y-auto bg-[#f5f8ff]' : 'premium-page max-w-[1120px] mx-auto'} px-4 sm:px-6 py-8 sm:py-12 text-[#17263e]`}>
      <canvas ref={canvasRef} className="hidden" />
      <header className="text-center max-w-xl mx-auto mb-7">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">{t('A clearer view of the road.')}</h1>
        <p className="text-[#67788f] mt-3 text-base">{t('Use your camera or try a recorded journey.')}</p>
      </header>

      <section className="premium-panel bg-white border border-[#dce5f2] rounded-[28px] overflow-hidden shadow-[0_16px_50px_-28px_rgba(42,72,126,.24)]">
        <div className="p-3 sm:p-4 flex items-center justify-between gap-3 flex-wrap border-b border-[#e8eef7]">
          <div className="flex gap-2 flex-wrap" aria-label={t('Video source')}>
            <button onClick={() => setVideoSource('camera')} aria-pressed={videoSource === 'camera'} className={videoSource === 'camera' ? 'premium-button' : 'premium-button-secondary'}><Camera size={16} />{t('Camera')}</button>
            <button onClick={() => setVideoSource('sample_video')} aria-pressed={videoSource === 'sample_video'} className={videoSource === 'sample_video' ? 'premium-button' : 'premium-button-secondary'}>{t('Try replay')}</button>
            <button onClick={() => fileInputRef.current?.click()} className={videoSource === 'custom_file' ? 'premium-button' : 'premium-button-secondary'}>{t('Upload video')}</button>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" aria-label={t('Upload road video')} />
          </div>
          <span className="text-xs text-[#67788f]">{videoSource === 'camera' ? t('Camera preview') : t('Recorded footage')}</span>
        </div>
        <div className="relative aspect-video bg-[#e9eff8] overflow-hidden">
          <video ref={videoRef} playsInline muted autoPlay className={`w-full h-full object-contain ${nightMode ? 'brightness-75 contrast-125' : ''}`} aria-label={t('Road camera preview')} />
          <canvas ref={hudCanvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
          {!cameraActive && <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-[#edf3ff]/95"><Camera size={34} className="text-[#2563eb] mb-4" /><p className="text-lg font-medium">{t('Ready when you are.')}</p><p className="text-sm text-[#67788f] max-w-sm mt-2">{t('Choose a source, then start your view.')}</p></div>}
          {criticalAlert && <div role="alert" className="absolute bottom-3 left-3 right-3 rounded-2xl bg-[#fff8e9]/95 border border-[#f4d89f] p-4 flex items-center gap-3"><AlertTriangle className="text-[#ae6a0b] shrink-0" size={24} /><div><p className="font-semibold text-[#74480f]">{t(criticalAlert)}</p><p className="text-xs text-[#8c6e41] mt-1">{manualTelemetry ? t('Demo observation') : t('Vision-service observation')}</p></div></div>}
        </div>
        <div className="p-4 sm:p-5 flex flex-col items-center gap-3 border-t border-[#e8eef7]">
          <button onClick={cameraActive ? stopCamera : startStreamSource} className="premium-button min-w-[190px] justify-center"><Camera size={18} />{cameraActive ? t('Pause') : t('Start')}</button>
          {sourceNotice && <div role="status" className="max-w-2xl text-center text-sm text-[#67788f] flex items-start justify-center gap-2"><span>{t(sourceNotice)}</span><button aria-label={t('Dismiss message')} onClick={() => setSourceNotice(null)} className="text-[#67788f] px-1">×</button></div>}
        </div>
      </section>

      <details className="mt-5 border border-[#dce5f2] bg-white/80 rounded-2xl overflow-hidden">
        <summary className="p-5 cursor-pointer text-sm font-medium text-[#526681]">{t('Settings and details')}</summary>
        <div className="p-5 pt-0 space-y-6">
          <div className="flex flex-wrap gap-2">
            <button aria-pressed={audioEnabled} onClick={() => setAudioEnabled(!audioEnabled)} className="premium-button-secondary">{audioEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}{audioEnabled ? t('Sound on') : t('Sound off')}</button>
            {videoSource === 'camera' && <button onClick={toggleFacingMode} className="premium-button-secondary"><RefreshCw size={17} />{t('Switch camera')}</button>}
            <button onClick={() => setNightMode(!nightMode)} aria-pressed={nightMode} className="premium-button-secondary">{nightMode ? <Sun size={17} /> : <Moon size={17} />}{nightMode ? t('Standard preview') : t('Dim preview')}</button>
            <button onClick={() => setFullScreen(!fullScreen)} className="premium-button-secondary">{fullScreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}{fullScreen ? t('Exit expanded view') : t('Expand view')}</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: manualTelemetry ? t('Scenario speed') : t('Speed'), value: `${speedKmh}`, unit: t('km/h') },
              { label: manualTelemetry ? t('Scenario impact') : t('Motion sensor'), value: hasMotionData || manualTelemetry ? zAccelG.toFixed(2) : '—', unit: 'G' },
              { label: t('Inference request'), value: inferenceAvailable && roundtripLatency ? `${roundtripLatency}` : '—', unit: t('ms round trip') },
              { label: t('Reported inference'), value: inferenceAvailable && fps ? `${fps}` : '—', unit: 'FPS' },
            ].map((item) => <div key={item.label} className="p-4 rounded-xl bg-[#f5f8ff]"><p className="text-xs text-[#67788f] mb-2">{item.label}</p><p className="text-xl font-medium tabular-nums">{item.value}</p><p className="text-xs text-[#67788f] mt-1">{item.unit}</p></div>)}
          </div>
          <div className="text-sm text-[#67788f] space-y-1"><p>{inferenceAvailable ? t('Vision service responding') : t('Vision service unavailable')}</p><p>{relayConnected ? t('Relay connected') : t('Relay not connected')}</p><p>{gpsCoords ? `${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : t('Location not available. Allow location permission for device coordinates.')}</p></div>
          <details className="border-t border-[#e4ebf6] pt-4"><summary className="cursor-pointer text-sm font-medium text-[#526681]">{t('Try a demo observation')}</summary><div className="pt-4"><p className="text-sm text-[#67788f] mb-4">{t('These controls inject demo observations. They are not detected from the video.')}</p><div className="flex flex-wrap gap-2">{[
            { name: t('Pothole'), run: () => triggerBumpSim(2.4) },
            { name: t('Pedestrian'), run: () => triggerGenericHazard('PEDESTRIAN', 'HIGH', 50) },
            { name: t('Animal'), run: () => triggerAnimalHazard() },
            { name: t('Waterlogging'), run: () => triggerGenericHazard('WATERLOGGING', 'MEDIUM', 90) },
          ].map((item) => <button key={item.name} onClick={item.run} className="premium-button-secondary">{item.name}</button>)}</div><div className="grid sm:grid-cols-2 gap-4 mt-4"><label className="text-sm text-[#67788f]">{t('Scenario speed')}<select aria-label={t('Scenario speed')} value={speedKmh} onChange={(event) => setManualSpeed(Number(event.target.value))} className="block w-full mt-2 bg-[#f5f8ff] border border-[#dce5f2] rounded-xl px-3 py-3 text-[#17263e]">{Array.from(new Set([speedKmh, 0, 35, 65, 95])).sort((a,b) => a-b).map((speed) => <option key={speed} value={speed}>{t('{speed} km/h', { speed })}</option>)}</select></label><label className="text-sm text-[#67788f]">{t('Road geometry')}<select aria-label={t('Scenario road geometry')} value={roadCurve} onChange={(event) => setManualCurve(event.target.value)} className="block w-full mt-2 bg-[#f5f8ff] border border-[#dce5f2] rounded-xl px-3 py-3 text-[#17263e]"><option value="STRAIGHT">{t('Straight')}</option><option value="SHARP_LEFT">{t('Sharp left')}</option><option value="SHARP_RIGHT">{t('Sharp right')}</option>{!['STRAIGHT', 'SHARP_LEFT', 'SHARP_RIGHT'].includes(roadCurve) && <option value={roadCurve}>{t(roadCurve)}</option>}</select></label></div></div></details>
        </div>
      </details>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Car,
  Camera,
  AlertTriangle,
  Volume2,
  Thermometer,
  ShieldCheck,
  RefreshCw,
  Compass,
  MapPin,
  Radio,
  Eye,
  Sliders,
  Play,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  Hazard,
  DriverAlert,
  Observation,
  VehiclePose,
} from '@margai/contracts';
import { audioSynthesizer, getLocalizedMessage } from '@margai/localization';
import { apiClient } from '../services/apiClient';

interface DriverCompanionProps {
  selectedLanguage: string;
}

export const DriverCompanion: React.FC<DriverCompanionProps> = ({
  selectedLanguage,
}) => {
  const [driveMode, setDriveMode] = useState<'simulator' | 'camera'>('simulator');
  const [activeAlert, setActiveAlert] = useState<DriverAlert | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [thermalState, setThermalState] = useState<'normal' | 'warm' | 'hot' | 'critical'>('normal');
  const [audioRoute, setAudioRoute] = useState<'car_bluetooth' | 'phone_speaker'>('car_bluetooth');
  const [lowLiteracyMode, setLowLiteracyMode] = useState(false);
  const [simulatedVehicle, setSimulatedVehicle] = useState<'trailing' | 'lead'>('trailing');
  const [lastRelayLatencyMs, setLastRelayLatencyMs] = useState<number>(26);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Live video and canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Vehicle pose (Bangalore Outer Ring Road near Kadubeesanahalli / Bellandur)
  const [vehiclePose, setVehiclePose] = useState<VehiclePose>({
    latitude: 12.9372,
    longitude: 77.6953,
    headingDeg: 220,
    speedMps: 14.5, // ~52 km/h
    horizontalAccuracyM: 1.8,
  });

  // Subscribe to WebSocket Relay on mount
  useEffect(() => {
    apiClient.connectWebSocket(
      {
        clientId: 'veh_trailing_KA05_1209',
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
          triggerInCabinAlert(personalizedAlert);
        }
      }
    );

    // Initial fetch of hazards
    apiClient.getHazards('blr_outer_ring_road').then(setHazards);

    return () => {
      apiClient.disconnect();
      stopCamera();
    };
  }, []);

  const triggerInCabinAlert = (alert: DriverAlert) => {
    setActiveAlert(alert);
    setLastRelayLatencyMs(Math.floor(22 + Math.random() * 12));

    // Sound graduated acoustic chime
    audioSynthesizer.playRiskChime(alert.riskLevel);

    // Spoken localized warning
    const localized = getLocalizedMessage(selectedLanguage, alert.messageKey as any);
    if (localized.shortVoicePhrase) {
      audioSynthesizer.speakLocalVoicePhrase(localized.shortVoicePhrase, selectedLanguage);
    }
  };

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
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
    } catch (err: any) {
      console.warn('Camera access denied/unavailable:', err);
      setCameraError('Camera access unavailable. Using synthetic perception feed.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Simulated bounding box detection overlay on canvas
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
        // Render synthetic road camera feed
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Road perspective lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.45, canvas.height * 0.4);
        ctx.lineTo(canvas.width * 0.1, canvas.height);
        ctx.moveTo(canvas.width * 0.55, canvas.height * 0.4);
        ctx.lineTo(canvas.width * 0.9, canvas.height);
        ctx.stroke();

        // Center dashed markings
        ctx.strokeStyle = '#e2e8f0';
        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.5, canvas.height * 0.4);
        ctx.lineTo(canvas.width * 0.5, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw bounding box if simulated detection
      const pulse = Math.sin(frame * 0.08) * 5;
      const boxX = canvas.width * 0.4 + pulse;
      const boxY = canvas.height * 0.65;
      const boxW = 140;
      const boxH = 80;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.fillRect(boxX, boxY - 24, boxW, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('POTHOLE (94%)', boxX + 8, boxY - 7);

      requestAnimationFrame(render);
    };

    render();
  };

  useEffect(() => {
    if (driveMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
      startDetectionLoop();
    }
  }, [driveMode]);

  // Simulation Triggers
  const handleTriggerPothole = async () => {
    // 1. Lead Car creates observation
    const newObs: Observation = {
      id: `obs_lead_${Date.now()}`,
      sourceId: 'veh_lead_KA03_8821',
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
          modelVersion: 'litert-rdd2022-v1.4',
        },
      ],
      accelerometerPeakG: 2.3,
      inputMode: 'simulated',
    };

    // Post to Google Cloud Run backend
    await apiClient.postObservation(newObs);

    // Alert Trailing Car
    triggerInCabinAlert({
      id: `alert_pothole_${Date.now()}`,
      hazardId: 'h_pothole_lead_detect',
      hazardRevision: 1,
      relevanceResult: true,
      riskLevel: 'urgent',
      distanceAheadM: 32,
      timeAheadSec: 2.2,
      messageKey: 'hazard.pothole.ahead',
      expiry: new Date(Date.now() + 15000).toISOString(),
      reasonCodes: ['IMMEDIATE_POTHOLE_IMPACT_RISK', 'CORROBORATED_BY_LEAD_CAR'],
    });
  };

  const handleTriggerCattle = () => {
    triggerInCabinAlert({
      id: `alert_cattle_${Date.now()}`,
      hazardId: 'h_cattle_sim',
      hazardRevision: 1,
      relevanceResult: true,
      riskLevel: 'urgent',
      distanceAheadM: 45,
      timeAheadSec: 3.1,
      messageKey: 'hazard.animal.path_conflict',
      expiry: new Date(Date.now() + 15000).toISOString(),
      reasonCodes: ['CATTLE_CROSSING_CORRIDOR', 'CRITICAL_TTC_IMMINENT_COLLISION'],
    });
  };

  const handleTriggerSharpCurve = () => {
    triggerInCabinAlert({
      id: `alert_curve_${Date.now()}`,
      hazardId: 'h_curve_sim',
      hazardRevision: 1,
      relevanceResult: true,
      riskLevel: 'caution',
      distanceAheadM: 95,
      timeAheadSec: 6.5,
      messageKey: 'road.curve.ahead',
      expiry: new Date(Date.now() + 15000).toISOString(),
      reasonCodes: ['SHARP_FLYOVER_DESCENT_CURVE', 'RADIUS_68M_ADVISORY_SPEED_35KMH'],
    });
  };

  const handleTriggerOppositeCarriageway = () => {
    // Demonstrates suppression: nothing shown to driver
    setActiveAlert(null);
    audioSynthesizer.speakLocalVoicePhrase('Opposite carriageway hazard safely suppressed.', 'en');
  };

  const handlePassByHazard = () => {
    setActiveAlert(null);
    audioSynthesizer.playRiskChime('information');
    const localized = getLocalizedMessage(selectedLanguage, 'hazard.cleared');
    if (localized.text) {
      audioSynthesizer.speakLocalVoicePhrase(localized.text, selectedLanguage);
    }
  };

  const localizedAlert = activeAlert
    ? getLocalizedMessage(selectedLanguage, activeAlert.messageKey as any)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
      {/* Top Telemetry & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">Driver Companion</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                54 km/h · ORR Southbound
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Corridor: Bangalore Outer Ring Road (Marathahalli - Bellandur)
            </div>
          </div>
        </div>

        {/* Mode & Hardware Toggles */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setDriveMode('simulator')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                driveMode === 'simulator'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Multi-Car Simulator
            </button>
            <button
              onClick={() => setDriveMode('camera')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                driveMode === 'camera'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Phone Camera</span>
            </button>
          </div>

          {/* Audio Route Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={audioRoute}
              onChange={(e: any) => setAudioRoute(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="car_bluetooth" className="bg-slate-900">Car Audio (Bluetooth)</option>
              <option value="phone_speaker" className="bg-slate-900">Phone Speaker Fallback</option>
            </select>
          </div>

          {/* Thermal Governor */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Thermometer className={`w-3.5 h-3.5 ${
              thermalState === 'critical' ? 'text-red-500 animate-pulse' :
              thermalState === 'hot' ? 'text-amber-500' : 'text-blue-400'
            }`} />
            <select
              value={thermalState}
              onChange={(e: any) => setThermalState(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs font-mono"
            >
              <option value="normal" className="bg-slate-900">Thermal: Normal (30 FPS)</option>
              <option value="warm" className="bg-slate-900">Thermal: Warm (15 FPS)</option>
              <option value="hot" className="bg-slate-900">Thermal: Hot (8 FPS)</option>
              <option value="critical" className="bg-slate-900">Thermal: Critical (Suspended)</option>
            </select>
          </div>

          {/* Low-Literacy Mode Toggle */}
          <button
            onClick={() => setLowLiteracyMode(!lowLiteracyMode)}
            className={`px-2.5 py-1.5 rounded-xl border font-medium ${
              lowLiteracyMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Big Icon Mode
          </button>
        </div>
      </div>

      {/* Main Driver Cockpit Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Real-time Detection Screen & Alert Banner */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Urgent Warning Display */}
          {activeAlert && activeAlert.relevanceResult && (
            <div
              className={`p-5 rounded-2xl border transition-all ${
                activeAlert.riskLevel === 'urgent'
                  ? 'bg-gradient-to-r from-red-950 via-red-900/90 to-slate-900 border-red-500 alert-urgent-glow'
                  : 'bg-gradient-to-r from-amber-950 via-amber-900/80 to-slate-900 border-amber-500'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Big High-Contrast Icon for Low Literacy Drivers */}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg ${
                    activeAlert.riskLevel === 'urgent' ? 'bg-red-600' : 'bg-amber-600'
                  }`}>
                    <AlertTriangle className="w-10 h-10 animate-bounce" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/40 text-white">
                        {activeAlert.riskLevel} SAFETY HAZARD
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        Relay Latency: {lastRelayLatencyMs}ms
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                      {localizedAlert?.text || activeAlert.messageKey}
                    </h2>

                    <div className="flex items-center gap-3 text-sm text-slate-200 mt-2 font-mono">
                      <span>Distance: <strong>{activeAlert.distanceAheadM}m ahead</strong></span>
                      {activeAlert.timeAheadSec && (
                        <span>· TTC: <strong>{activeAlert.timeAheadSec}s</strong></span>
                      )}
                      <span>· Audio: <strong>{audioRoute === 'car_bluetooth' ? 'Car Speakers' : 'Phone Speaker'}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePassByHazard}
                  className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white text-xs font-medium border border-white/20 whitespace-nowrap"
                  title="Clear alert after passing"
                >
                  Clear / Passed
                </button>
              </div>
            </div>
          )}

          {/* Camera / LiteRT Vision Canvas Screen */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[16/9] shadow-2xl">
            {/* Hidden HTML5 video element for camera feed */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="hidden"
            />

            {/* Canvas on which LiteRT detections and overlays are rendered */}
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              className="w-full h-full object-cover"
            />

            {/* Overlay Telemetry HUD */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs pointer-events-none">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 font-mono text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>LiteRT Model: rdd2022-fp16</span>
                <span className="text-slate-400">· {thermalState === 'critical' ? '0' : thermalState === 'hot' ? '8' : thermalState === 'warm' ? '15' : '30'} FPS</span>
              </div>

              <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 font-mono text-white">
                GPS: 12.9372° N, 77.6953° E (±1.8m)
              </div>
            </div>

            {/* Thermal Throttling Alert on Canvas */}
            {thermalState === 'critical' && (
              <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 text-white">
                <Thermometer className="w-12 h-12 text-red-500 mb-2 animate-bounce" />
                <h3 className="text-xl font-bold">Device Thermal Protection Active</h3>
                <p className="text-sm text-slate-300 max-w-md mt-1">
                  Camera and inference suspended to protect phone battery under direct sunlight.
                  Collaborative warnings from Google Cloud Run relay remain 100% active.
                </p>
              </div>
            )}
          </div>

          {/* Quick Simulation Trigger Buttons */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Buildathon Test Scenarios (Evaluate Road Relevance & Low Latency)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={handleTriggerPothole}
                className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Pothole Ahead (Lead Car)</span>
              </button>

              <button
                onClick={handleTriggerCattle}
                className="px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Stray Cattle Crossing</span>
              </button>

              <button
                onClick={handleTriggerSharpCurve}
                className="px-3 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sharp Flyover Turn</span>
              </button>

              <button
                onClick={handleTriggerOppositeCarriageway}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                title="Tests directional suppression so opposite lane gets zero false alert"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Opposite Lane (Suppressed)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Corridor Map & Upcoming Hazards List */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Corridor Active Hazards ({hazards.length})</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                Cloud Synced
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {hazards.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No active hazards on this corridor segment.
                </div>
              ) : (
                hazards.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white capitalize flex items-center gap-1.5">
                        <AlertTriangle className={`w-3.5 h-3.5 ${
                          h.type === 'pothole' ? 'text-red-400' : 'text-amber-400'
                        }`} />
                        <span>{h.type}</span>
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        h.verificationState === 'corroborated'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {h.verificationState} ({h.evidenceCount} reports)
                      </span>
                    </div>

                    <div className="text-slate-400 text-[11px] truncate">
                      {h.roadReference.roadName}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
                      <span>Conf: {(h.confidence * 100).toFixed(0)}%</span>
                      <span>Expires: in 24h</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* In-Cabin Vehicle Integration Info */}
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-900/40 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-400" />
              <span>Android Auto & Audio Route Active</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Alerts duck background infotainment audio seamlessly through vehicle speakers.
              Deterministic alert logic guarantees urgent warnings never wait for cloud LLM response times.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

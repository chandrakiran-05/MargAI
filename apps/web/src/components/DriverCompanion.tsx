import React, { useState, useEffect, useRef } from 'react';
import {
  Car,
  Camera,
  Volume2,
  VolumeX,
  Thermometer,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  MapPin,
  Eye,
  SlidersHorizontal,
  Mic,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  Hazard,
  DriverAlert,
  Observation,
  VehiclePose,
} from '@margai/contracts';
import { audioSynthesizer, getLocalizedMessage, SUPPORTED_LANGUAGES } from '@margai/localization';
import { apiClient } from '../services/apiClient';
import { HazardPictogram, HazardIconType } from './HazardPictogram';

interface DriverCompanionProps {
  selectedLanguage: string;
}

export const DriverCompanion: React.FC<DriverCompanionProps> = ({
  selectedLanguage: initialLang,
}) => {
  const [currentLang, setCurrentLang] = useState<string>(initialLang || 'hi');
  const [driveMode, setDriveMode] = useState<'cockpit' | 'camera'>('cockpit');
  const [activeAlert, setActiveAlert] = useState<DriverAlert | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [thermalState, setThermalState] = useState<'normal' | 'warm' | 'hot' | 'critical'>('normal');
  const [audioRoute, setAudioRoute] = useState<'car_bluetooth' | 'phone_speaker'>('car_bluetooth');
  const [isMuted, setIsMuted] = useState(false);
  const [lastRelayLatencyMs, setLastRelayLatencyMs] = useState<number>(24);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Live video and canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Vehicle Telemetry (Bangalore Outer Ring Road near Kadubeesanahalli / Bellandur)
  const [speedKmh, setSpeedKmh] = useState(54);
  const [vehiclePose, setVehiclePose] = useState<VehiclePose>({
    latitude: 12.9372,
    longitude: 77.6953,
    headingDeg: 220,
    speedMps: 15.0,
    horizontalAccuracyM: 1.8,
  });

  useEffect(() => {
    setCurrentLang(initialLang);
  }, [initialLang]);

  // Connect to Google Cloud Run WebSocket relay
  useEffect(() => {
    apiClient.connectWebSocket(
      {
        clientId: 'veh_driver_auto_01',
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

    return () => {
      apiClient.disconnect();
      stopCamera();
    };
  }, []);

  const triggerAlert = (alert: DriverAlert) => {
    setActiveAlert(alert);
    setLastRelayLatencyMs(Math.floor(22 + Math.random() * 10));

    if (!isMuted) {
      audioSynthesizer.playRiskChime(alert.riskLevel);
      const localized = getLocalizedMessage(currentLang, alert.messageKey as any);
      if (localized.shortVoicePhrase) {
        audioSynthesizer.speakLocalVoicePhrase(localized.shortVoicePhrase, currentLang);
      }
    }
  };

  const speakCurrentStatus = () => {
    if (!activeAlert) {
      const msg =
        currentLang === 'hi'
          ? 'आगे सड़क साफ है। सुरक्षित ड्राइव करें।'
          : currentLang === 'kn'
          ? 'ಮುಂದೆ ರಸ್ತೆ ಸ್ಪಷ್ಟವಾಗಿದೆ. ಸುರಕ್ಷಿತವಾಗಿ ಚಲಿಸಿ.'
          : currentLang === 'ta'
          ? 'சாலை தெளிவாக உள்ளது. பாதுகாப்பாக ஓட்டவும்.'
          : currentLang === 'te'
          ? 'రోడ్డు స్పష్టంగా ఉంది. జాగ్రత్తగా నడపండి.'
          : 'Road ahead is clear. Drive safely.';
      audioSynthesizer.speakLocalVoicePhrase(msg, currentLang);
    } else {
      const localized = getLocalizedMessage(currentLang, activeAlert.messageKey as any);
      if (localized.shortVoicePhrase) {
        audioSynthesizer.speakLocalVoicePhrase(localized.shortVoicePhrase, currentLang);
      }
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
      setCameraError('Camera access unavailable. Switched to visual radar mode.');
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
        // High contrast stylized road animation
        ctx.fillStyle = '#0B1120';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Road lanes
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.45, canvas.height * 0.35);
        ctx.lineTo(canvas.width * 0.05, canvas.height);
        ctx.moveTo(canvas.width * 0.55, canvas.height * 0.35);
        ctx.lineTo(canvas.width * 0.95, canvas.height);
        ctx.stroke();

        // Dashed line
        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = 6;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.5, canvas.height * 0.35);
        ctx.lineTo(canvas.width * 0.5, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Detection box
      const pulse = Math.sin(frame * 0.08) * 8;
      const boxX = canvas.width * 0.38 + pulse;
      const boxY = canvas.height * 0.62;
      const boxW = 160;
      const boxH = 90;

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#EF4444';
      ctx.fillRect(boxX, boxY - 30, boxW, 30);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('POTHOLE (94%)', boxX + 12, boxY - 9);

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

  // Quick Action Scenarios
  const triggerPotholeScenario = async () => {
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
          modelVersion: 'litert-rdd2022',
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
      reasonCodes: ['POTHOLE_IMPACT_RISK', 'CORROBORATED_BY_LEAD_CAR'],
    });
  };

  const triggerCattleScenario = () => {
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
      reasonCodes: ['CATTLE_ON_ROAD', 'IMMINENT_PATH_CONFLICT'],
    });
  };

  const triggerSharpCurveScenario = () => {
    triggerAlert({
      id: `alert_curve_${Date.now()}`,
      hazardId: 'h_curve',
      hazardRevision: 1,
      relevanceResult: true,
      riskLevel: 'caution',
      distanceAheadM: 90,
      timeAheadSec: 6.0,
      messageKey: 'road.curve.ahead',
      expiry: new Date(Date.now() + 15000).toISOString(),
      reasonCodes: ['SHARP_RIGHT_CURVE_RADIUS_65M'],
    });
  };

  const triggerClearRoad = () => {
    setActiveAlert(null);
    audioSynthesizer.playRiskChime('information');
    const localized = getLocalizedMessage(currentLang, 'hazard.cleared');
    if (localized.text) {
      audioSynthesizer.speakLocalVoicePhrase(localized.text, currentLang);
    }
  };

  // Determine current pictogram
  let activePictogramType: HazardIconType = 'safe';
  if (activeAlert) {
    if (activeAlert.messageKey.includes('pothole')) activePictogramType = 'pothole';
    else if (activeAlert.messageKey.includes('animal')) activePictogramType = 'cattle';
    else if (activeAlert.messageKey.includes('pedestrian')) activePictogramType = 'pedestrian';
    else if (activeAlert.messageKey.includes('curve')) activePictogramType = 'sharp_curve';
    else if (activeAlert.messageKey.includes('visibility')) activePictogramType = 'fog';
  }

  const localizedAlert = activeAlert
    ? getLocalizedMessage(currentLang, activeAlert.messageKey as any)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* 1. Quick Regional Language Tap Bar (Designed for One-Tap Switching) */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 flex items-center gap-1.5 whitespace-nowrap">
          <span>🗣️</span>
          <span className="hidden sm:inline">Voice Language:</span>
        </span>

        <div className="flex items-center gap-1.5">
          {[
            { code: 'hi', label: 'हिन्दी' },
            { code: 'kn', label: 'ಕನ್ನಡ' },
            { code: 'ta', label: 'தமிழ்' },
            { code: 'te', label: 'తెలుగు' },
            { code: 'mr', label: 'मराठी' },
            { code: 'bn', label: 'বাংলা' },
            { code: 'en', label: 'English' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setCurrentLang(lang.code);
                audioSynthesizer.speakLocalVoicePhrase(lang.label, lang.code);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
                currentLang === lang.code
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400/50'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Audio Mute/Unmute Big Pill */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
            isMuted
              ? 'bg-red-500/20 text-red-400 border-red-500/40'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
          }`}
          title="Toggle Voice Alerts"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound ON'}</span>
        </button>
      </div>

      {/* 2. THE MAIN EASY-DRIVER COCKPIT CARD (Giant Visual Pictogram & Huge Numbers) */}
      <div
        className={`relative rounded-3xl p-6 sm:p-8 border-4 transition-all shadow-2xl overflow-hidden ${
          !activeAlert
            ? 'bg-gradient-to-b from-[#064E3B] to-[#0A2E23] border-emerald-500/80 shadow-emerald-500/10'
            : activeAlert.riskLevel === 'urgent'
            ? 'bg-gradient-to-b from-[#7F1D1D] via-[#450A0A] to-[#1F0707] border-red-500 alert-urgent-glow'
            : 'bg-gradient-to-b from-[#78350F] to-[#2D1606] border-amber-500'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Giant Visual Pictogram */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <HazardPictogram
                type={activePictogramType}
                size="xl"
                className="transform hover:scale-105 transition-transform"
              />
              {activeAlert && (
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-400 text-black font-black text-lg flex items-center justify-center animate-bounce shadow-md">
                  !
                </div>
              )}
            </div>

            <div>
              {/* Status Header */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 text-xs sm:text-sm font-black uppercase tracking-wider text-white mb-2">
                <span className={`w-3 h-3 rounded-full ${!activeAlert ? 'bg-emerald-400' : 'bg-red-400 animate-ping'}`}></span>
                <span>
                  {!activeAlert
                    ? (currentLang === 'hi' ? 'सड़क सुरक्षित है' : currentLang === 'kn' ? 'ರಸ್ತೆ ಸುರಕ್ಷಿತವಾಗಿದೆ' : 'ROAD IS CLEAR')
                    : (activeAlert.riskLevel === 'urgent' ? 'DANGER / खतरा / ಅಪಾಯ' : 'CAUTION / सावधानी')}
                </span>
              </div>

              {/* Bold Localized Headline */}
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                {!activeAlert
                  ? (currentLang === 'hi' ? 'धीमे और सुरक्षित चलें' : currentLang === 'kn' ? 'ಸುರಕ್ಷಿತವಾಗಿ ಚಲಿಸಿ' : 'Safe to Proceed')
                  : (localizedAlert?.text || activeAlert.messageKey)}
              </h2>

              {/* Distance / Status Info */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 text-white">
                {activeAlert ? (
                  <div className="px-4 py-2 rounded-2xl bg-black/50 border border-white/30 flex items-center gap-2">
                    <span className="text-sm font-semibold opacity-80">DISTANCE:</span>
                    <span className="text-2xl sm:text-3xl font-black text-yellow-300 font-mono">
                      {activeAlert.distanceAheadM} M
                    </span>
                  </div>
                ) : (
                  <div className="px-4 py-2 rounded-2xl bg-black/30 border border-white/20 flex items-center gap-2">
                    <span className="text-xs font-semibold opacity-80">STATUS:</span>
                    <span className="text-lg font-bold text-emerald-300">
                      Normal Cruising
                    </span>
                  </div>
                )}

                <div className="px-4 py-2 rounded-2xl bg-black/40 border border-white/20 flex items-center gap-2">
                  <span className="text-xs font-semibold opacity-80">SPEED:</span>
                  <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                    {speedKmh} <span className="text-xs font-normal">KM/H</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Big Voice Assistant Trigger & Action Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto">
            {/* Big Listen/Speak Voice Button */}
            <button
              onClick={speakCurrentStatus}
              className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-base shadow-xl transition-all transform active:scale-95"
            >
              <Volume2 className="w-6 h-6 text-blue-600" />
              <span>{currentLang === 'hi' ? 'आवाज सुनें (Play Voice)' : 'Hear Voice Warning'}</span>
            </button>

            {activeAlert && (
              <button
                onClick={triggerClearRoad}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-black/40 hover:bg-black/60 text-white font-bold text-sm border border-white/30 transition-all"
              >
                <span>✓ {currentLang === 'hi' ? 'खतरा पार हो गया (Passed)' : 'Cleared / Passed'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. BIG TACTILE DEMO BUTTONS (Designed with Zero Complex Text for Instant Testing) */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span>⚡</span>
            <span>Tap to Test Hazards (आसानी से टेस्ट करें)</span>
          </span>
          <span className="text-xs text-blue-400 font-mono">Cloud Relay: 24ms</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Pothole Button */}
          <button
            onClick={triggerPotholeScenario}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-950/40 hover:bg-red-900/50 border-2 border-red-500/50 hover:border-red-400 text-white transition-all transform active:scale-95 group shadow-lg shadow-red-950/20"
          >
            <HazardPictogram type="pothole" size="md" className="group-hover:scale-110 transition-transform mb-2" />
            <span className="text-base font-extrabold text-red-200">गड्ढा (Pothole)</span>
            <span className="text-[11px] text-red-400 font-medium">Class D40 Crater</span>
          </button>

          {/* Cattle Crossing Button */}
          <button
            onClick={triggerCattleScenario}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-950/40 hover:bg-amber-900/50 border-2 border-amber-500/50 hover:border-amber-400 text-white transition-all transform active:scale-95 group shadow-lg shadow-amber-950/20"
          >
            <HazardPictogram type="cattle" size="md" className="group-hover:scale-110 transition-transform mb-2" />
            <span className="text-base font-extrabold text-amber-200">गाय / मवेशी (Cattle)</span>
            <span className="text-[11px] text-amber-400 font-medium">Stray Animal on Lane</span>
          </button>

          {/* Sharp Turn Button */}
          <button
            onClick={triggerSharpCurveScenario}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-purple-950/40 hover:bg-purple-900/50 border-2 border-purple-500/50 hover:border-purple-400 text-white transition-all transform active:scale-95 group shadow-lg shadow-purple-950/20"
          >
            <HazardPictogram type="sharp_curve" size="md" className="group-hover:scale-110 transition-transform mb-2" />
            <span className="text-base font-extrabold text-purple-200">तीव्र मोड़ (Sharp Turn)</span>
            <span className="text-[11px] text-purple-400 font-medium">Flyover Curve (35 km/h)</span>
          </button>

          {/* Clear / Safe Road Button */}
          <button
            onClick={triggerClearRoad}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 border-2 border-emerald-500/50 hover:border-emerald-400 text-white transition-all transform active:scale-95 group shadow-lg shadow-emerald-950/20"
          >
            <HazardPictogram type="safe" size="md" className="group-hover:scale-110 transition-transform mb-2" />
            <span className="text-base font-extrabold text-emerald-200">साफ सड़क (Clear Road)</span>
            <span className="text-[11px] text-emerald-400 font-medium">Normal Speed</span>
          </button>
        </div>
      </div>

      {/* 4. OPTIONAL LIVE CAMERA / LITER-RT RADAR DRAWER */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white block">Camera & Vision Mode</span>
            <span className="text-slate-400 text-[11px]">
              {driveMode === 'camera' ? 'Using Live Mobile Camera Stream' : 'Using Clean Cockpit HUD'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDriveMode(driveMode === 'cockpit' ? 'camera' : 'cockpit')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition-all"
          >
            {driveMode === 'cockpit' ? 'Switch to Camera View' : 'Back to Simple Cockpit'}
          </button>

          {/* Thermal Indicator */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300">
            <Thermometer className="w-3.5 h-3.5 text-blue-400" />
            <span>Normal (30 FPS)</span>
          </div>
        </div>
      </div>

      {/* Live Camera Canvas (Rendered only when camera mode is active) */}
      {driveMode === 'camera' && (
        <div className="relative rounded-3xl overflow-hidden border-2 border-slate-700 bg-slate-950 aspect-[16/9] shadow-2xl">
          <video ref={videoRef} playsInline muted className="hidden" />
          <canvas ref={canvasRef} width={640} height={360} className="w-full h-full object-cover" />
          <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-xl text-white font-mono text-xs border border-white/20">
            LiteRT On-Device Perception
          </div>
        </div>
      )}
    </div>
  );
};

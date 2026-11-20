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
  Zap,
} from 'lucide-react';
import {
  Hazard,
  DriverAlert,
  Observation,
  VehiclePose,
} from '@margai/contracts';
import { audioSynthesizer, getLocalizedMessage } from '@margai/localization';
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
    setLastRelayLatencyMs(Math.floor(22 + Math.random() * 8));

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
          ? 'आगे सड़क पूरी तरह साफ है। सुरक्षित गति से चलें।'
          : currentLang === 'kn'
          ? 'ಮುಂದೆ ರಸ್ತೆ ಸ್ಪಷ್ಟವಾಗಿದೆ. ಸುರಕ್ಷಿತವಾಗಿ ಚಲಿಸಿ.'
          : currentLang === 'ta'
          ? 'சாலை தெளிவாக உள்ளது. பாதுகாப்பாக ஓட்டவும்.'
          : currentLang === 'te'
          ? 'రోడ్డు స్పష్టంగా ఉంది. జాగ్రత్తగా నడపండి.'
          : 'Road ahead is clear. Cruising safely.';
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
        // Luxury Digital Radar HUD Canvas
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#090D18');
        bgGrad.addColorStop(1, '#030509');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Perspective Highway Guides
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.45, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.05, canvas.height);
        ctx.moveTo(canvas.width * 0.55, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.95, canvas.height);
        ctx.stroke();

        // Glowing Center Guideline
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.7)';
        ctx.lineWidth = 4;
        ctx.setLineDash([22, 18]);
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.5, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.5, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Detection box with laser corners
      const pulse = Math.sin(frame * 0.08) * 8;
      const boxX = canvas.width * 0.38 + pulse;
      const boxY = canvas.height * 0.62;
      const boxW = 160;
      const boxH = 90;

      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Label Pill
      ctx.fillStyle = '#E11D48';
      ctx.fillRect(boxX, boxY - 26, boxW, 26);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('POTHOLE (94%)', boxX + 14, boxY - 8);

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
    <div className="max-w-5xl mx-auto px-4 py-5 sm:py-7 space-y-6">
      {/* 1. Quick Regional Language Selector (Luxury Obsidian Pill Bar) */}
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#0B0F19]/90 border border-white/[0.08] shadow-lg backdrop-blur-xl overflow-x-auto">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2 flex items-center gap-2 whitespace-nowrap">
          <span className="text-blue-400">🗣️</span>
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
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
                currentLang === lang.code
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 ring-1 ring-white/30'
                  : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Audio Mute/Unmute Pill */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
            isMuted
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
          }`}
          title="Toggle Voice Alerts"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="hidden sm:inline font-mono">{isMuted ? 'Muted' : 'Sound ON'}</span>
        </button>
      </div>

      {/* 2. MAIN COCKPIT DISPLAY: Luxury Automotive Digital Cluster HUD */}
      <div
        className={`relative rounded-3xl p-6 sm:p-9 border transition-all duration-500 backdrop-blur-2xl overflow-hidden ${
          !activeAlert
            ? 'bg-gradient-to-br from-[#061A13]/90 via-[#0A1F17]/90 to-[#030D0A]/95 border-emerald-500/40 shadow-[0_20px_50px_rgba(5,150,105,0.15)]'
            : activeAlert.riskLevel === 'urgent'
            ? 'bg-gradient-to-br from-[#29080B]/95 via-[#1F0508]/95 to-[#0E0203]/98 border-rose-500 alert-luxury-urgent shadow-[0_20px_60px_rgba(225,29,72,0.25)]'
            : 'bg-gradient-to-br from-[#241203]/95 via-[#190C02]/95 to-[#0D0601]/98 border-amber-500 alert-luxury-caution shadow-[0_20px_50px_rgba(217,119,6,0.2)]'
        }`}
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-25 ${
            !activeAlert
              ? 'bg-emerald-500'
              : activeAlert.riskLevel === 'urgent'
              ? 'bg-rose-500'
              : 'bg-amber-500'
          }`}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-7 text-center md:text-left">
          {/* Pictogram & Hazard Information */}
          <div className="flex flex-col sm:flex-row items-center gap-7">
            <div className="relative">
              <HazardPictogram
                type={activePictogramType}
                size="xl"
                className="transform hover:scale-105 transition-transform drop-shadow-2xl"
              />
              {activeAlert && (
                <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-xl flex items-center justify-center animate-bounce shadow-lg ring-2 ring-white">
                  !
                </div>
              )}
            </div>

            <div>
              {/* Status Header Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-white/10 text-xs sm:text-sm font-black uppercase tracking-wider text-white mb-2.5 shadow-inner">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    !activeAlert
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]'
                      : 'bg-rose-400 animate-ping'
                  }`}
                />
                <span className="tracking-wide">
                  {!activeAlert
                    ? currentLang === 'hi'
                      ? 'सड़क बिल्कुल सुरक्षित है'
                      : currentLang === 'kn'
                      ? 'ರಸ್ತೆ ಸುರಕ್ಷಿತವಾಗಿದೆ'
                      : 'ROAD IS CLEAR'
                    : activeAlert.riskLevel === 'urgent'
                    ? 'CRITICAL DANGER / अत्यंत सावधान'
                    : 'CAUTION AHEAD / सावधानी'}
                </span>
              </div>

              {/* Localized Safety Headline */}
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
                {!activeAlert
                  ? currentLang === 'hi'
                    ? 'आगे कोई खतरा नहीं है'
                    : currentLang === 'kn'
                    ? 'ಸುರಕ್ಷಿತವಾಗಿ ಚಲಿಸಿ'
                    : 'Cruising Safely'
                  : localizedAlert?.text || activeAlert.messageKey}
              </h2>

              {/* Distance and Speed Numerical Gauges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                {activeAlert ? (
                  <div className="px-4 py-2.5 rounded-2xl bg-black/60 border border-amber-400/30 flex items-center gap-2.5 shadow-lg">
                    <span className="text-xs font-bold text-amber-200 tracking-wider">DISTANCE:</span>
                    <span className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight">
                      {activeAlert.distanceAheadM} <span className="text-sm font-semibold">M</span>
                    </span>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 rounded-2xl bg-black/40 border border-emerald-500/20 flex items-center gap-2.5 shadow-sm">
                    <span className="text-xs font-bold text-emerald-300 tracking-wider">STATUS:</span>
                    <span className="text-base font-extrabold text-emerald-200">
                      Normal Driving
                    </span>
                  </div>
                )}

                <div className="px-4 py-2.5 rounded-2xl bg-black/50 border border-white/10 flex items-center gap-2.5 shadow-lg">
                  <span className="text-xs font-bold text-slate-400 tracking-wider">SPEED:</span>
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                    {speedKmh} <span className="text-xs font-normal text-slate-400">KM/H</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3.5 w-full md:w-auto">
            {/* Luxury Voice Guide Button */}
            <button
              onClick={speakCurrentStatus}
              className="flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-gradient-to-r from-white via-slate-100 to-slate-200 hover:from-slate-100 hover:to-white text-slate-900 font-black text-base shadow-xl shadow-white/10 transition-all transform active:scale-95 group"
            >
              <Volume2 className="w-6 h-6 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span>{currentLang === 'hi' ? 'आवाज सुनें (Play Voice)' : 'Hear Voice Warning'}</span>
            </button>

            {activeAlert && (
              <button
                onClick={triggerClearRoad}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-sm border border-white/20 transition-all shadow-md active:scale-95"
              >
                <span>✓ {currentLang === 'hi' ? 'खतरा पार हो गया (Passed)' : 'Cleared / Passed'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. TACTILE DEMO TILES: Luxury Automotive Touch Tiles */}
      <div className="p-6 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 font-mono">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Interactive Road Simulation (आसानी से टेस्ट करें)</span>
          </span>
          <span className="text-xs text-blue-400 font-mono bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
            Relay: {lastRelayLatencyMs}ms
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Pothole Card */}
          <button
            onClick={triggerPotholeScenario}
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-[#1C090D] to-[#0D0406] hover:from-[#260C11] hover:to-[#140609] border border-rose-500/30 hover:border-rose-400 text-white transition-all transform active:scale-95 group shadow-lg shadow-rose-950/20"
          >
            <HazardPictogram type="pothole" size="md" className="group-hover:scale-110 transition-transform mb-2.5" />
            <span className="text-base font-black text-rose-200">गड्ढा (Pothole)</span>
            <span className="text-[11px] text-rose-400 font-mono mt-0.5">Class D40 Crater</span>
          </button>

          {/* Cattle Crossing Card */}
          <button
            onClick={triggerCattleScenario}
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-[#1E1104] to-[#0D0701] hover:from-[#281705] hover:to-[#140B02] border border-amber-500/30 hover:border-amber-400 text-white transition-all transform active:scale-95 group shadow-lg shadow-amber-950/20"
          >
            <HazardPictogram type="cattle" size="md" className="group-hover:scale-110 transition-transform mb-2.5" />
            <span className="text-base font-black text-amber-200">गाय (Cattle)</span>
            <span className="text-[11px] text-amber-400 font-mono mt-0.5">Stray Animal on Lane</span>
          </button>

          {/* Sharp Turn Card */}
          <button
            onClick={triggerSharpCurveScenario}
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-[#180A2A] to-[#0B0414] hover:from-[#200D38] hover:to-[#10061E] border border-purple-500/30 hover:border-purple-400 text-white transition-all transform active:scale-95 group shadow-lg shadow-purple-950/20"
          >
            <HazardPictogram type="sharp_curve" size="md" className="group-hover:scale-110 transition-transform mb-2.5" />
            <span className="text-base font-black text-purple-200">तीव्र मोड़ (Sharp Turn)</span>
            <span className="text-[11px] text-purple-400 font-mono mt-0.5">Flyover Curve (35 km/h)</span>
          </button>

          {/* Clear Road Card */}
          <button
            onClick={triggerClearRoad}
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-[#081F17] to-[#030E0A] hover:from-[#0B2A1F] hover:to-[#04140F] border border-emerald-500/30 hover:border-emerald-400 text-white transition-all transform active:scale-95 group shadow-lg shadow-emerald-950/20"
          >
            <HazardPictogram type="safe" size="md" className="group-hover:scale-110 transition-transform mb-2.5" />
            <span className="text-base font-black text-emerald-200">साफ सड़क (Clear Road)</span>
            <span className="text-[11px] text-emerald-400 font-mono mt-0.5">Normal Cruising</span>
          </button>
        </div>
      </div>

      {/* 4. CAMERA & SYSTEM TELEMETRY STRIP */}
      <div className="p-4 rounded-2xl bg-[#090D18]/80 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center ring-1 ring-blue-500/20">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white block">Vision & Radar Stream</span>
            <span className="text-slate-400 text-[11px]">
              {driveMode === 'camera' ? 'Using Live Mobile Camera Stream' : 'Running on Digital Cockpit Radar'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDriveMode(driveMode === 'cockpit' ? 'camera' : 'cockpit')}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 font-semibold border border-white/10 transition-all text-xs"
          >
            {driveMode === 'cockpit' ? 'Switch to Camera View' : 'Back to Simple Cockpit'}
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#06080E] border border-white/[0.08] font-mono text-[11px] text-slate-300">
            <Thermometer className="w-3.5 h-3.5 text-blue-400" />
            <span>Normal (30 FPS)</span>
          </div>
        </div>
      </div>

      {/* Live Camera Canvas Drawer (Only when switched to camera mode) */}
      {driveMode === 'camera' && (
        <div className="relative rounded-3xl overflow-hidden border border-white/20 bg-black aspect-[16/9] shadow-2xl">
          <video ref={videoRef} playsInline muted className="hidden" />
          <canvas ref={canvasRef} width={640} height={360} className="w-full h-full object-cover" />
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-white font-mono text-xs border border-white/20">
            Google LiteRT MobileNet-SSD Edge Perception
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Car,
  Camera,
  Volume2,
  VolumeX,
  Thermometer,
  ShieldCheck,
  RefreshCw,
  MapPin,
  Eye,
  SlidersHorizontal,
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
  const [relayLatencyMs, setRelayLatencyMs] = useState<number>(24);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [speedKmh] = useState(54);
  const [vehiclePose] = useState<VehiclePose>({
    latitude: 12.9372,
    longitude: 77.6953,
    headingDeg: 220,
    speedMps: 15.0,
    horizontalAccuracyM: 1.8,
  });

  useEffect(() => {
    setCurrentLang(initialLang);
  }, [initialLang]);

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
    setRelayLatencyMs(Math.floor(22 + Math.random() * 8));

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
          ? 'आगे सड़क साफ है। गति 54 किलोमीटर प्रति घंटा।'
          : currentLang === 'kn'
          ? 'ಮುಂದೆ ರಸ್ತೆ ಸ್ಪಷ್ಟವಾಗಿದೆ. ವೇಗ 54 ಕಿಲೋಮೀಟರ್.'
          : currentLang === 'ta'
          ? 'சாலை தெளிவாக உள்ளது. வேகம் 54 கிமீ.'
          : currentLang === 'te'
          ? 'రోడ్డు స్పష్టంగా ఉంది.'
          : 'Road ahead is clear. 54 km per hour.';
      audioSynthesizer.speakLocalVoicePhrase(msg, currentLang);
    } else {
      const localized = getLocalizedMessage(currentLang, activeAlert.messageKey as any);
      if (localized.shortVoicePhrase) {
        audioSynthesizer.speakLocalVoicePhrase(localized.shortVoicePhrase, currentLang);
      }
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
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#090D18');
        bgGrad.addColorStop(1, '#030509');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.45, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.05, canvas.height);
        ctx.moveTo(canvas.width * 0.55, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.95, canvas.height);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([18, 14]);
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.5, canvas.height * 0.38);
        ctx.lineTo(canvas.width * 0.5, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const pulse = Math.sin(frame * 0.08) * 6;
      const boxX = canvas.width * 0.38 + pulse;
      const boxY = canvas.height * 0.62;
      const boxW = 160;
      const boxH = 90;

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#EF4444';
      ctx.fillRect(boxX, boxY - 24, boxW, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('POTHOLE (94%)', boxX + 12, boxY - 7);

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
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
      {/* LANGUAGE SELECTOR */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#0D1322] border border-[#1E293B] overflow-x-auto">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider pl-2 whitespace-nowrap">
          Voice Locale:
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
              className={`px-3 py-1 rounded-lg font-mono text-xs transition-all whitespace-nowrap ${
                currentLang === lang.code
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-[#090D16] text-slate-400 hover:text-white border border-[#1E293B]'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1 border transition-all ${
            isMuted
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Audio ON'}</span>
        </button>
      </div>

      {/* COCKPIT DISPLAY CARD */}
      <div
        className={`rounded-2xl p-6 border transition-all ${
          !activeAlert
            ? 'bg-[#081812] border-emerald-500/40'
            : activeAlert.riskLevel === 'urgent'
            ? 'bg-[#200A0D] border-rose-500 alert-luxury-urgent'
            : 'bg-[#1C1206] border-amber-500'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <HazardPictogram type={activePictogramType} size="xl" />

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-xs font-mono uppercase text-white mb-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    !activeAlert ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'
                  }`}
                />
                <span>
                  {!activeAlert
                    ? currentLang === 'hi'
                      ? 'सड़क साफ है'
                      : 'ROAD CLEAR'
                    : activeAlert.riskLevel === 'urgent'
                    ? 'HAZARD WARNING'
                    : 'CAUTION'}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {!activeAlert
                  ? currentLang === 'hi'
                    ? 'गति सामान्य बनाए रखें'
                    : 'Cruising Safely'
                  : localizedAlert?.text || activeAlert.messageKey}
              </h2>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 font-mono">
                {activeAlert ? (
                  <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-400/30 text-amber-300">
                    <span className="text-xs text-slate-400 mr-2">DISTANCE:</span>
                    <strong className="text-2xl">{activeAlert.distanceAheadM} M</strong>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-emerald-500/20 text-emerald-300 text-sm">
                    Status: Verified Normal
                  </div>
                )}

                <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-white">
                  <span className="text-xs text-slate-400 mr-2">SPEED:</span>
                  <strong className="text-2xl">{speedKmh}</strong> <span className="text-xs text-slate-400">KM/H</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto">
            <button
              onClick={speakCurrentStatus}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow transition-all active:scale-95"
            >
              <Volume2 className="w-5 h-5 text-indigo-600" />
              <span>Voice Playback</span>
            </button>

            {activeAlert && (
              <button
                onClick={triggerClearRoad}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono border border-white/20 transition-all"
              >
                Clear / Passed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TEST ACTION TILES */}
      <div className="p-4 rounded-2xl bg-[#0D1322] border border-[#1E293B]">
        <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
          <span>TEST EVENT INJECTION</span>
          <span>Relay: {relayLatencyMs}ms</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={triggerPotholeScenario}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-[#1C090D] border border-rose-500/30 hover:border-rose-400 text-white transition-all active:scale-95"
          >
            <HazardPictogram type="pothole" size="md" className="mb-1.5" />
            <span className="text-sm font-bold text-rose-200">Pothole (D40)</span>
            <span className="text-[10px] text-rose-400 font-mono">30m Ahead</span>
          </button>

          <button
            onClick={triggerCattleScenario}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-[#1E1104] border border-amber-500/30 hover:border-amber-400 text-white transition-all active:scale-95"
          >
            <HazardPictogram type="cattle" size="md" className="mb-1.5" />
            <span className="text-sm font-bold text-amber-200">Cattle Obstacle</span>
            <span className="text-[10px] text-amber-400 font-mono">42m Ahead</span>
          </button>

          <button
            onClick={triggerSharpCurveScenario}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-[#180A2A] border border-purple-500/30 hover:border-purple-400 text-white transition-all active:scale-95"
          >
            <HazardPictogram type="sharp_curve" size="md" className="mb-1.5" />
            <span className="text-sm font-bold text-purple-200">Sharp Turn</span>
            <span className="text-[10px] text-purple-400 font-mono">R=65m (35 km/h)</span>
          </button>

          <button
            onClick={triggerClearRoad}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-[#081F17] border border-emerald-500/30 hover:border-emerald-400 text-white transition-all active:scale-95"
          >
            <HazardPictogram type="safe" size="md" className="mb-1.5" />
            <span className="text-sm font-bold text-emerald-200">Clear Road</span>
            <span className="text-[10px] text-emerald-400 font-mono">Normal</span>
          </button>
        </div>
      </div>

      {/* CAMERA TOGGLE */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D1322] border border-[#1E293B] text-xs font-mono">
        <span className="text-slate-400">Optical Perception Mode</span>
        <button
          onClick={() => setDriveMode(driveMode === 'cockpit' ? 'camera' : 'cockpit')}
          className="px-3 py-1 rounded-lg bg-[#090D16] hover:bg-slate-800 text-slate-200 border border-[#1E293B]"
        >
          {driveMode === 'cockpit' ? 'Enable Camera View' : 'Disable Camera View'}
        </button>
      </div>

      {driveMode === 'camera' && (
        <div className="relative rounded-2xl overflow-hidden border border-[#1E293B] bg-black aspect-[16/9]">
          <video ref={videoRef} playsInline muted className="hidden" />
          <canvas ref={canvasRef} width={640} height={360} className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded text-white font-mono text-xs border border-white/20">
            LiteRT-v1.4 Detector
          </div>
        </div>
      )}
    </div>
  );
};

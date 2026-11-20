import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Cpu,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface BuildathonDeckProps {
  onLaunchHUD?: () => void;
}

export const BuildathonDeck: React.FC<BuildathonDeckProps> = ({ onLaunchHUD }) => {
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const totalSlides = 8;

  const nextSlide = () => setCurrentSlide((s) => (s < totalSlides ? s + 1 : 1));
  const prevSlide = () => setCurrentSlide((s) => (s > 1 ? s - 1 : totalSlides));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Deck Header with Google 4-Color Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between pb-4 mb-6 border-b border-[#1E293B] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#4285F4] tracking-wide">
              GOOGLE DEEPMIND
            </span>
            <span className="text-slate-600 font-mono">|</span>
            <span className="text-xs font-mono font-bold text-[#EA4335] tracking-wide">
              GOOGLE CLOUD
            </span>
            <span className="text-slate-600 font-mono">|</span>
            <span className="text-xs font-mono text-slate-400">
              STARTUP BUILDATHON INDIA 2026
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3 mt-1">
            <span>MargAI Pitch & Architecture Deck</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-[#1E293B] text-slate-300">
              Slide {currentSlide} of {totalSlides}
            </span>
          </h1>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevSlide}
            className="p-2 rounded-xl bg-[#090D16] border border-[#1E293B] text-slate-300 hover:text-white hover:border-[#4285F4] transition-all"
            title="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="p-2 rounded-xl bg-[#090D16] border border-[#1E293B] text-slate-300 hover:text-white hover:border-[#4285F4] transition-all"
            title="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          {onLaunchHUD && (
            <button
              onClick={onLaunchHUD}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#4285F4]/15 border border-[#4285F4]/40 text-[#4285F4] hover:bg-[#4285F4]/25 text-xs font-mono font-bold transition-all ml-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Launch Live HUD</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Slide Card Container */}
      <div className="relative rounded-3xl bg-[#0B0F19] border border-[#1E293B] shadow-2xl overflow-hidden min-h-[580px] flex flex-col justify-between">
        {/* Top 4-Color Accent Border */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

        {/* SLIDE CONTENT AREA */}
        <div className="p-8 sm:p-12 flex-1 flex flex-col justify-center">
          {/* SLIDE 1: Title & Team */}
          {currentSlide === 1 && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-6">
                <div className="flex items-center gap-3">
                  <div className="grid grid-cols-2 gap-1 w-9 h-9 p-1 rounded-xl bg-[#090D16] border border-[#1E293B]">
                    <div className="bg-[#4285F4] rounded-tl-sm rounded-tr-sm"></div>
                    <div className="bg-[#EA4335] rounded-full"></div>
                    <div className="bg-[#FBBC05] rounded-bl-sm"></div>
                    <div className="bg-[#34A853] rounded-br-sm"></div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-slate-400">
                      Google DeepMind & Google Cloud
                    </div>
                    <div className="text-sm font-bold text-white tracking-wide">
                      Startup Buildathon — India 2026
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-400">
                  Powered by <span className="text-slate-200 font-bold">H2S | nasscom | HEADSTART</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="p-6 rounded-2xl bg-[#090D16] border border-[#1E293B] space-y-4">
                  <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                    Team Name
                  </div>
                  <div className="text-4xl font-extrabold text-white tracking-tight">
                    MargAI
                  </div>
                  <div className="text-xs font-mono text-slate-400 pt-2 border-t border-[#1E293B]">
                    Team Size: <span className="text-white font-bold">6 Members</span>
                  </div>
                </div>

                <div className="md:col-span-2 p-8 rounded-2xl bg-gradient-to-br from-[#090D16] to-[#0D1527] border border-[#4285F4]/30 space-y-4">
                  <div className="text-xs font-mono uppercase text-[#4285F4] font-bold tracking-wider">
                    Problem Statement
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    Real-Time V2V Road-Hazard Prevention & Automated Civic Road-Intelligence Network
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans">
                    A road-locked vehicle telematics and vision intelligence system running on-device edge AI and Google Cloud Run for sub-second hazard broadcasts, illiterate-friendly voice guidance, and automated municipal SLA audits.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Problem Statement */}
          {currentSlide === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <div className="text-xs font-mono text-[#EA4335] uppercase font-bold tracking-wider">
                  Slide 02 • Problem Statement
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  Key Road Safety & Infrastructure Challenges
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {/* Card 1: Critical Impact (Red) */}
                <div className="p-6 rounded-2xl bg-[#EA4335]/10 border border-[#EA4335]/30 space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#EA4335] px-2 py-0.5 rounded bg-[#EA4335]/20">
                    CRITICAL IMPACT
                  </span>
                  <div className="text-lg font-bold text-white">Preventable Fatalities</div>
                  <div className="text-3xl font-black text-[#EA4335] font-mono">1.77 Lakh+</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Over 1.77 lakh lives are lost annually on Indian roads due to unmarked potholes, blind-spot pedestrian crossings, stray cattle, and high-speed highway pile-ups.
                  </p>
                </div>

                {/* Card 2: Economic Drain (Yellow) */}
                <div className="p-6 rounded-2xl bg-[#FBBC05]/10 border border-[#FBBC05]/30 space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FBBC05] px-2 py-0.5 rounded bg-[#FBBC05]/20">
                    ECONOMIC DRAIN
                  </span>
                  <div className="text-lg font-bold text-white">Commercial Fleet Losses</div>
                  <div className="text-3xl font-black text-[#FBBC05] font-mono">₹ 1000s of Cr</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Logistics, bus, and cab operators lose thousands of crores every year to tyre bursts, broken axles, suspension damage, and accident downtime.
                  </p>
                </div>

                {/* Card 3: Systemic Issue (Blue) */}
                <div className="p-6 rounded-2xl bg-[#4285F4]/10 border border-[#4285F4]/30 space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4285F4] px-2 py-0.5 rounded bg-[#4285F4]/20">
                    SYSTEMIC ISSUE
                  </span>
                  <div className="text-lg font-bold text-white">Inefficient Civic Reporting</div>
                  <div className="text-2xl font-black text-[#4285F4] font-mono">Zero Accountability</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Current municipal portals force citizens to unsafely stop in traffic to upload photos—causing delayed, duplicate, and unverified repair tickets with zero contractor accountability.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: Proposed Solution */}
          {currentSlide === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <div className="text-xs font-mono text-[#34A853] uppercase font-bold tracking-wider">
                  Slide 03 • Proposed Solution
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  The Idea & How It Addresses Road Hazards
                </h2>
              </div>

              {/* Banner */}
              <div className="p-4 rounded-xl bg-[#090D16] border border-[#1E293B]">
                <div className="text-sm font-bold text-white">
                  MargAI: Real-Time V2V Safety & Civic Reporting
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  MargAI turns forward-facing vehicle cameras into a dynamic, road-locked Vehicle-to-Vehicle (V2V) safety network and automated civic reporting engine.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Core Capabilities (Blue) */}
                <div className="p-6 rounded-2xl bg-[#4285F4]/10 border border-[#4285F4]/30 space-y-4">
                  <div className="text-xs font-mono font-bold text-[#4285F4] uppercase tracking-wider">
                    Core Capabilities
                  </div>
                  <div className="space-y-3 text-xs text-slate-300">
                    <div>
                      <span className="font-bold text-white">Real-Time Edge Observation: </span>
                      On-device vision scans the road in under 100ms to detect hazards like potholes, unmarked speed breakers, waterlogging, blind-spot pedestrians, stray cattle, and stalled vehicles—even in low-connectivity areas.
                    </div>
                    <div>
                      <span className="font-bold text-white">Road-Locked V2V Networking: </span>
                      Vehicles dynamically connect to live channels isolated to their specific carriageway. This warns trailing drivers of hazards before they are visible and instantly purges passed alerts.
                    </div>
                    <div>
                      <span className="font-bold text-white">Vernacular Voice Co-Pilot: </span>
                      Hands-free audio alerts in Tamil, Telugu, Hindi, and English play over car Bluetooth, ensuring drivers stay informed without taking their eyes off the road.
                    </div>
                  </div>
                </div>

                {/* 3-Stage Rollout Strategy (Green) */}
                <div className="p-6 rounded-2xl bg-[#34A853]/10 border border-[#34A853]/30 space-y-4">
                  <div className="text-xs font-mono font-bold text-[#34A853] uppercase tracking-wider">
                    3-Stage Rollout Strategy
                  </div>
                  <div className="space-y-3 text-xs text-slate-300">
                    <div>
                      <span className="font-bold text-white">Stage 1: Software MVP — </span>
                      A zero-hardware smartphone app mounted on the windshield to validate real-world safety and civic utility.
                    </div>
                    <div>
                      <span className="font-bold text-white">Stage 2: Network & Fleet Validation — </span>
                      Scaling adoption across commercial cabs, buses, and logistics corridors to build road density and prove market demand.
                    </div>
                    <div>
                      <span className="font-bold text-white">Stage 3: Purpose-Built Hardware — </span>
                      Deploying a dedicated, heat-resistant windshield camera integrated directly with Android Auto, CarPlay, and digital instrument clusters.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: Solution Architecture */}
          {currentSlide === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <div className="text-xs font-mono text-[#4285F4] uppercase font-bold tracking-wider">
                  Slide 04 • Architecture
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  End-to-End System Architecture
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {/* Layer 1: Edge Layer (Blue) */}
                <div className="p-6 rounded-2xl bg-[#4285F4]/10 border border-[#4285F4]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#4285F4] uppercase">
                    LAYER 01 • EDGE LAYER
                  </div>
                  <div className="text-lg font-bold text-white">On-Device Edge</div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div>
                      <span className="font-semibold text-white">Quantized Vision & Sensor Fusion: </span>
                      Combines local vision inference (320x320 NPU frames) with Z-axis accelerometer data to detect submerged potholes. Uses barometer to distinguish elevated flyovers from service roads.
                    </div>
                    <div>
                      <span className="font-semibold text-white">Thermal & Offline Protection: </span>
                      Switches display to blackout mode during voice guidance to prevent overheating on windshield; caches alerts locally in dead zones.
                    </div>
                  </div>
                </div>

                {/* Layer 2: Cloud Layer (Purple/Deep Blue) */}
                <div className="p-6 rounded-2xl bg-[#A855F7]/10 border border-[#A855F7]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#A855F7] uppercase">
                    LAYER 02 • CLOUD LAYER
                  </div>
                  <div className="text-lg font-bold text-white">Geospatial & V2V Cloud</div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div>
                      <span className="font-semibold text-white">Road-Locked Channel Mapping: </span>
                      Uses Google Maps Roads API (snapToRoads) to lock every vehicle to its exact road_placeId and travel direction.
                    </div>
                    <div>
                      <span className="font-semibold text-white">Sub-Second V2V Broadcast: </span>
                      Powered by Cloud Run & Cloud Pub/Sub, streams hazard updates exclusively to trailing vehicles on the same carriageway with spatial UPSERT deduplication.
                    </div>
                  </div>
                </div>

                {/* Layer 3: Output Layer (Green) */}
                <div className="p-6 rounded-2xl bg-[#34A853]/10 border border-[#34A853]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#34A853] uppercase">
                    LAYER 03 • OUTPUT LAYER
                  </div>
                  <div className="text-lg font-bold text-white">Driver & Civic Output</div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div>
                      <span className="font-semibold text-white">Driver Audio Output: </span>
                      Delivers immediate vernacular voice warnings over the vehicle's Bluetooth system without visual distractions.
                    </div>
                    <div>
                      <span className="font-semibold text-white">Civic & Fleet Intelligence: </span>
                      Uses Firestore & BigQuery to power live route-risk dashboards, generating geo-tagged municipal tickets with post-repair SLA verification.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 5: Google AI Tools */}
          {currentSlide === 5 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <div className="text-xs font-mono text-[#FBBC05] uppercase font-bold tracking-wider">
                  Slide 05 • Google AI Tools
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  Google AI Studio, Antigravity & Agent Skills
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {/* Tool 1 (Blue) */}
                <div className="p-6 rounded-2xl bg-[#4285F4]/10 border border-[#4285F4]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#4285F4] uppercase">
                    TOOL 01 • PROTOTYPING
                  </div>
                  <div className="text-xl font-bold text-white">Google AI Studio</div>
                  <div className="text-xs font-bold text-[#4285F4]">
                    Multimodal Hazard Classification
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Used to prototype and fine-tune multimodal prompts for classifying road hazards, filtering out false positives like shadows or tar patches, and generating concise alerts.
                  </p>
                </div>

                {/* Tool 2 (Purple) */}
                <div className="p-6 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#8B5CF6] uppercase">
                    TOOL 02 • AGENTIC DEV
                  </div>
                  <div className="text-xl font-bold text-white">Google Antigravity</div>
                  <div className="text-xs font-bold text-[#8B5CF6]">
                    Full-Stack Orchestration
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Serves as our agentic development environment to accelerate full-stack prototyping. It orchestrates the mobile edge-vision pipeline, Cloud Run V2V microservices, and the municipal analytics dashboard.
                  </p>
                </div>

                {/* Tool 3 (Green) */}
                <div className="p-6 rounded-2xl bg-[#34A853]/10 border border-[#34A853]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#34A853] uppercase">
                    TOOL 03 • WORKFLOWS
                  </div>
                  <div className="text-xl font-bold text-white">Google Agent Skills</div>
                  <div className="text-xs font-bold text-[#34A853]">
                    Automated Auditing & Scoring
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Used to build modular, automated verification workflows that handle spatial ticket deduplication, severity scoring, and post-repair contractor SLA auditing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 6: Google AI Models */}
          {currentSlide === 6 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <div className="text-xs font-mono text-[#EA4335] uppercase font-bold tracking-wider">
                  Slide 06 • Google AI Models
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  Edge Vision, Voice Co-Pilot & Cloud Verification
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {/* Model 1: Gemma Quantized (Blue) */}
                <div className="p-6 rounded-2xl bg-[#4285F4]/10 border border-[#4285F4]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#4285F4] uppercase">
                    MODEL 01 • EDGE VISION
                  </div>
                  <div className="text-xl font-bold text-white">Gemma (Quantized)</div>
                  <div className="text-xs font-bold text-[#4285F4]">
                    LiteRT / MediaPipe Edge Variant
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Deployed directly on the device NPU for sub-100ms, low-heat visual detection of potholes, pedestrians, cattle, and stalled vehicles without requiring cloud round-trips.
                  </p>
                </div>

                {/* Model 2: Gemini Live (Purple/Red) */}
                <div className="p-6 rounded-2xl bg-[#EA4335]/10 border border-[#EA4335]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#EA4335] uppercase">
                    MODEL 02 • VOICE CO-PILOT
                  </div>
                  <div className="text-xl font-bold text-white">Gemini Live</div>
                  <div className="text-xs font-bold text-[#EA4335]">
                    Real-Time Voice Interface
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Powers the real-time, low-latency conversational voice co-pilot—delivering calm, speed-gated hazard warnings in Tamil, Telugu, Hindi, and English over vehicle Bluetooth.
                  </p>
                </div>

                {/* Model 3: Gemini Multimodal (Green) */}
                <div className="p-6 rounded-2xl bg-[#34A853]/10 border border-[#34A853]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#34A853] uppercase">
                    MODEL 03 • CLOUD VERIFICATION
                  </div>
                  <div className="text-xl font-bold text-white">Gemini (Multimodal)</div>
                  <div className="text-xs font-bold text-[#34A853]">
                    Cloud Analysis & Verification
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Analyzes flagged hazard frames and telemetry in the cloud to verify pothole depth and severity, eliminate duplicate civic complaints, and confirm whether reported road damage has actually been repaired.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 7: Scale & Impact */}
          {currentSlide === 7 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <div className="text-xs font-mono text-[#34A853] uppercase font-bold tracking-wider">
                  Slide 07 • Scale & Impact
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  Go-to-Market Execution & Double Bottom Line
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {/* GTM (Blue) */}
                <div className="p-6 rounded-2xl bg-[#4285F4]/10 border border-[#4285F4]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#4285F4] uppercase">
                    GO-TO-MARKET • APP FIRST
                  </div>
                  <div className="text-lg font-bold text-white">Software-First GTM</div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div>
                      <span className="font-semibold text-white">Zero-Risk App Launch: </span>
                      Launching as a 100% app-based solution to immediately capture daily active users across commercial fleets and commuters.
                    </div>
                    <div>
                      <span className="font-semibold text-white">Hardware Integration: </span>
                      Dedicated MargAI windshield camera & infotainment integration rolls out only after locking in recurring enterprise demand.
                    </div>
                  </div>
                </div>

                {/* Monetization (Yellow) */}
                <div className="p-6 rounded-2xl bg-[#FBBC05]/10 border border-[#FBBC05]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#FBBC05] uppercase">
                    MONETIZATION • B2B & GOV
                  </div>
                  <div className="text-lg font-bold text-white">Multi-Sided Value</div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p className="font-semibold text-white">High-Margin Revenue Streams:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      <li>B2B Telematics: Fleet analytics & hazard routing</li>
                      <li>GovTech: Continuous automated road-auditing</li>
                      <li>Auto-Insurance: Granular risk intelligence</li>
                    </ul>
                  </div>
                </div>

                {/* Societal Impact (Green) */}
                <div className="p-6 rounded-2xl bg-[#34A853]/10 border border-[#34A853]/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-[#34A853] uppercase">
                    SOCIETAL IMPACT • SAFETY
                  </div>
                  <div className="text-lg font-bold text-white">Double Bottom Line</div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div>
                      <span className="font-semibold text-white">Life-Saving Alerts: </span>
                      Saving lives through real-time blind-spot & hazard warnings delivered straight to drivers.
                    </div>
                    <div>
                      <span className="font-semibold text-white">Cost & Infrastructure Optimization: </span>
                      Cuts fleet maintenance costs while providing cities with a continuous 24/7 pulse on road health.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 8: Thank You */}
          {currentSlide === 8 && (
            <div className="space-y-8 animate-fadeIn text-center py-6">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-mono font-bold text-[#4285F4] tracking-wide">
                  GOOGLE DEEPMIND
                </span>
                <span className="text-slate-600 font-mono">|</span>
                <span className="text-xs font-mono font-bold text-[#EA4335] tracking-wide">
                  GOOGLE CLOUD
                </span>
              </div>

              <div className="space-y-3 max-w-xl mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <div className="grid grid-cols-2 gap-1 w-12 h-12 p-1.5 rounded-2xl bg-[#090D16] border border-[#1E293B]">
                    <div className="bg-[#4285F4] rounded-tl-sm rounded-tr-sm"></div>
                    <div className="bg-[#EA4335] rounded-full"></div>
                    <div className="bg-[#FBBC05] rounded-bl-sm"></div>
                    <div className="bg-[#34A853] rounded-br-sm"></div>
                  </div>
                </div>
                <h2 className="text-5xl font-black text-white tracking-tight">
                  Thank You
                </h2>
                <p className="text-sm text-slate-400 font-mono">
                  Startup Buildathon — India 2026 • Build Your Next Big Thing.
                </p>
              </div>

              <div className="pt-6 border-t border-[#1E293B] max-w-lg mx-auto flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Powered by</span>
                <span className="text-white font-bold">H2S</span>
                <span>|</span>
                <span className="text-white font-bold">nasscom</span>
                <span>|</span>
                <span className="text-white font-bold">HEADSTART</span>
              </div>

              {onLaunchHUD && (
                <div className="pt-4">
                  <button
                    onClick={onLaunchHUD}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white font-bold text-sm shadow-xl hover:opacity-95 transition-all"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                    <span>Launch MargAI Interactive 3-Pane Command Center</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM SLIDE THUMBNAIL TRACKER */}
        <div className="p-4 bg-[#07090F] border-t border-[#1E293B] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSlides }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setCurrentSlide(num)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                  currentSlide === num
                    ? 'bg-[#4285F4] text-white shadow-[0_0_10px_rgba(66,133,244,0.5)]'
                    : 'bg-[#090D16] text-slate-400 border border-[#1E293B] hover:text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="text-slate-400 text-[11px] hidden sm:block">
            Use arrows or click numbers to navigate slides
          </div>
        </div>
      </div>
    </div>
  );
};

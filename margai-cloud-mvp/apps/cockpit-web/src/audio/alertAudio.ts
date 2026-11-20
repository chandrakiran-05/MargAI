import { RiskLevel, LocalizedMessages } from '@margai/contracts';

/**
 * MargAI Automotive Graduated Alert Synthesizer
 * Produces graduated ISO 2575 / UNECE automotive auditory warning chimes
 * and speech synthesis localized for Indian languages.
 */

export class AlertAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentLanguage: 'en' | 'hi' | 'ta' | 'te' | 'kn' = 'en';

  constructor() {
    // Lazy AudioContext initialization on user interaction
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public setLanguage(lang: 'en' | 'hi' | 'ta' | 'te' | 'kn') {
    this.currentLanguage = lang;
  }

  public getLanguage(): 'en' | 'hi' | 'ta' | 'te' | 'kn' {
    return this.currentLanguage;
  }

  /**
   * Play graduated automotive warning chimes matching UNECE safety recommendations:
   * - Information: single subtle tone
   * - Caution: two-stage rising chime (660Hz -> 880Hz)
   * - Urgent: rapid triple warning pulse (980Hz)
   */
  public playChime(level: RiskLevel) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      if (level === 'urgent') {
        // Triple urgent square-wave warning pulses
        [0, 0.12, 0.24].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(980, t + delay);
          gain.gain.setValueAtTime(0.08, t + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + delay);
          osc.stop(t + delay + 0.09);
        });
      } else if (level === 'caution') {
        // Dual harmonic attention chime (660Hz -> 880Hz)
        const notes = [
          { freq: 660, start: 0, dur: 0.15 },
          { freq: 880, start: 0.12, dur: 0.2 },
        ];
        notes.forEach((n) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.freq, t + n.start);
          gain.gain.setValueAtTime(0.12, t + n.start);
          gain.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + n.start);
          osc.stop(t + n.start + n.dur);
        });
      } else {
        // Information: single soft bell chime (550Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(550, t);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.19);
      }
    } catch (e) {
      console.warn('Audio chime playback note:', e);
    }
  }

  /**
   * Speak localized hazard alert using Web Speech API with regional Indian language tags
   */
  public speakAlert(localizedMessages: LocalizedMessages, lang?: 'en' | 'hi' | 'ta' | 'te' | 'kn') {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const targetLang = lang || this.currentLanguage;
    const textToSpeak = localizedMessages[targetLang] || localizedMessages.en;
    if (!textToSpeak) return;

    const langCodeMap: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      kn: 'kn-IN',
    };

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = langCodeMap[targetLang] || 'en-IN';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 250);
    } catch (e) {
      console.warn('Speech synthesis note:', e);
    }
  }
}

export const alertAudio = new AlertAudioEngine();

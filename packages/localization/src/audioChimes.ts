import { RiskLevel } from '@margai/contracts';

/**
 * Web Audio API Acoustic Chime Synthesizer
 * Generates calibrated advisory and urgent safety tones directly in the browser/car audio
 * without depending on external MP3 downloads or cloud speech latency.
 */

export class MargAIAudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Plays a graduated acoustic warning tone based on risk level
   */
  public playRiskChime(level: RiskLevel): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (level === 'information') {
      // 880Hz (A5) gentle informational bell
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (level === 'caution') {
      // Two-tone rising pulse (660Hz -> 880Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.setValueAtTime(0.35, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (level === 'urgent') {
      // Urgent dual-frequency alert burst (980Hz + 1240Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';

      osc1.frequency.setValueAtTime(980, now);
      osc2.frequency.setValueAtTime(1240, now);

      // Fast double pulse for urgent warning
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.setValueAtTime(0.05, now + 0.12);
      gain.gain.setValueAtTime(0.5, now + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    }
  }

  /**
   * Speaks a localized short voice phrase using local on-device SpeechSynthesis
   */
  public speakLocalVoicePhrase(phrase: string, langCode: string = 'en'): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!phrase || phrase.trim() === '') return;

    window.speechSynthesis.cancel(); // Cancel any lingering utterance
    const utterance = new SpeechSynthesisUtterance(phrase);

    // Map regional language codes to standard BCP 47 locales
    const localeMap: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      kn: 'kn-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
      bn: 'bn-IN',
    };

    utterance.lang = localeMap[langCode] || 'en-IN';
    utterance.rate = 1.15; // Slightly faster for driving alerts
    utterance.pitch = 1.05;

    window.speechSynthesis.speak(utterance);
  }
}

export const audioSynthesizer = new MargAIAudioSynthesizer();

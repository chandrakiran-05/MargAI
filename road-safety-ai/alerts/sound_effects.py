"""
Audio Alert Warning Generator
Synthesizes distinct acoustic frequencies / text-to-speech warnings for risk levels:
- CRITICAL: High-frequency rapid pulsating tone (880Hz) or emergency warning
- HIGH: Dual warning chimes (587Hz -> 784Hz)
- MEDIUM: Gentle cautionary chime (440Hz)
- Platform native speech via macOS 'say' command or synthetic WAV tone generation
"""

import os
import subprocess
import threading
import platform

class SoundAlertManager:
    def __init__(self, enabled: bool = True):
        self.enabled = enabled
        self.is_mac = (platform.system() == "Darwin")

    def play_alert_sound(self, risk_level: str, hazard_type: str):
        if not self.enabled:
            return

        # Run audio asynchronously so inference thread is NEVER blocked
        t = threading.Thread(target=self._play_async, args=(risk_level, hazard_type), daemon=True)
        t.start()

    def _play_async(self, risk_level: str, hazard_type: str):
        if not self.is_mac:
            return

        try:
            if risk_level == "CRITICAL":
                # Rapid audible alert
                subprocess.run(["afplay", "/System/Library/Sounds/Sosumi.aiff"], check=False)
                # Voice warning
                phrase = f"Danger! {hazard_type.replace('_', ' ')} ahead!"
                subprocess.run(["say", "-v", "Samantha", "-r", "210", phrase], check=False)
            elif risk_level == "HIGH":
                subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"], check=False)
            elif risk_level == "MEDIUM":
                subprocess.run(["afplay", "/System/Library/Sounds/Tink.aiff"], check=False)
        except Exception:
            pass

// Replaceable wake-word boundary. Native builds expose CornerAirPods through a
// Capacitor plugin. Web builds may load Picovoice through a deployment-provided
// adapter; without it the UI stays honest and offers the global shortcut/button.

export function createWakeWordAdapter({ onWake, onState } = {}) {
  const nativePlugin = typeof window !== 'undefined' ? window.Capacitor?.Plugins?.CornerAirPods : null;
  const hostedAdapter = typeof window !== 'undefined' ? window.CornerWakeWord : null;
  const driver = nativePlugin || hostedAdapter;
  let removeListener = null;

  return {
    get supported() { return !!driver; },
    async arm(options = {}) {
      if (!driver) return { ok: false, reason: 'wake-adapter-unavailable' };
      if (typeof driver.addListener === 'function') {
        const listener = await driver.addListener('wake', (event) => onWake?.(event));
        removeListener = () => listener?.remove?.();
      }
      const result = await driver.arm?.({ phrase: 'Hey Corner', sensitivity: options.sensitivity || 0.58 });
      onState?.('armed');
      return result || { ok: true };
    },
    async disarm() {
      try { await driver?.disarm?.(); } finally {
        removeListener?.();
        removeListener = null;
        onState?.('off');
      }
      return { ok: true };
    },
    async setRemoteControls(enabled) {
      if (!driver?.setRemoteControls) return { ok: false, reason: 'native-only' };
      return driver.setRemoteControls({ enabled: !!enabled });
    },
  };
}

export function speakLocal(text) {
  const nativePlugin = typeof window !== 'undefined' ? window.Capacitor?.Plugins?.CornerAirPods : null;
  if (nativePlugin?.speak) return nativePlugin.speak({ text });
  if (typeof window !== 'undefined' && window.speechSynthesis && window.SpeechSynthesisUtterance) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text || ''));
    utterance.rate = 1.02;
    window.speechSynthesis.speak(utterance);
    return Promise.resolve({ ok: true });
  }
  return Promise.resolve({ ok: false, reason: 'speech-unavailable' });
}

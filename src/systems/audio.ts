const files: Record<string, string> = {
  select: 'audio/ui-select.ogg', launch: 'audio/mission-launch.ogg',
  scan: 'audio/science-scan.ogg', complete: 'audio/mission-complete.ogg',
  warning: 'audio/resource-warning.ogg',
};

let audioContext: AudioContext | undefined;
const loaded = new Map<string, HTMLAudioElement>();
const suppliedAudio = new Set(Object.keys(import.meta.glob('/public/audio/*.ogg')).map((path) => path.replace('/public/', '')));
let ambientTimer: number | undefined;
let ambientGain: GainNode | undefined;
let ambientScene = 'home';
const ambientVoices = new Set<OscillatorNode>();
let engineOscillator: OscillatorNode | undefined;
let engineGain: GainNode | undefined;
function soundSettings() {
  try {
    const saved = JSON.parse(window.localStorage.getItem('orbital-command-commander-settings-v1') ?? '{}') as { effects?: unknown; volume?: unknown };
    return { enabled: saved.effects !== false, volume: typeof saved.volume === 'number' && Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 0.8 };
  } catch { return { enabled: true, volume: 0.8 }; }
}

/** Plays supplied user audio when present, with a tiny Web Audio cue as a fallback. */
export function playSound(name: keyof typeof files) {
  const settings = soundSettings();
  if (!settings.enabled || settings.volume === 0) return;
  if (!suppliedAudio.has(files[name])) { playTone(name); return; }
  try {
    let player = loaded.get(name);
    if (!player) {
      player = new Audio(`${import.meta.env.BASE_URL}${files[name]}`);
      loaded.set(name, player);
    }
    player.volume = 0.3 * settings.volume;
    player.currentTime = 0;
    void player.play().catch(() => playTone(name));
  } catch { playTone(name); }
}

function playTone(name: keyof typeof files) {
  try {
    const settings = soundSettings();
    if (!settings.enabled || settings.volume === 0) return;
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequencies: Record<string, number> = { select: 620, launch: 190, scan: 820, complete: 980, warning: 260 };
    oscillator.frequency.value = frequencies[name];
    oscillator.type = name === 'warning' ? 'sawtooth' : 'sine';
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.055 * settings.volume), audioContext.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + (name === 'complete' ? 0.24 : 0.11));
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(); oscillator.stop(audioContext.currentTime + 0.25);
  } catch { /* Audio is an enhancement; it must never interrupt gameplay. */ }
}

/** Original synthesized ambient tones, started only by a player gesture. */
export async function startAmbience(scene: string, volume: number): Promise<boolean> {
  try {
    stopAmbience();
    audioContext ??= new AudioContext();
    await audioContext.resume();
    ambientScene = scene;
    ambientGain = audioContext.createGain();
    ambientGain.gain.value = Math.max(0, Math.min(1, volume)) * 0.018;
    ambientGain.connect(audioContext.destination);
    const playPad = () => {
      if (!audioContext || !ambientGain) return;
      const frequencies = ambientScene === 'exploration' ? [110, 164.81, 220] : ambientScene === 'transit' ? [98, 146.83, 196] : [130.81, 196, 261.63];
      for (const frequency of frequencies) {
        const oscillator = audioContext.createOscillator();
        const envelope = audioContext.createGain();
        const now = audioContext.currentTime;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        envelope.gain.setValueAtTime(0.0001, now);
        envelope.gain.exponentialRampToValueAtTime(0.6, now + 1.2);
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);
        oscillator.connect(envelope).connect(ambientGain);
        ambientVoices.add(oscillator);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); ambientVoices.delete(oscillator); };
        oscillator.start(now); oscillator.stop(now + 6);
      }
    };
    playPad(); ambientTimer = window.setInterval(playPad, 5200);
    return true;
  } catch { stopAmbience(); return false; }
}
export function setAmbienceScene(scene: string) { ambientScene = scene; }
export function setAmbienceVolume(volume: number) { if (ambientGain) ambientGain.gain.value = Math.max(0, Math.min(1, volume)) * 0.018; }
export function stopAmbience() {
  window.clearInterval(ambientTimer); ambientTimer = undefined;
  ambientVoices.forEach((voice) => { try { voice.stop(); } catch { /* Already stopped. */ } });
  ambientVoices.clear(); ambientGain?.disconnect(); ambientGain = undefined;
}

/** Motor de cabina/rover sintetizado, sin simular propagación de sonido en el vacío. */
export function startEngine() {
  const settings = soundSettings();
  if (engineOscillator || !settings.enabled || settings.volume === 0) return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
    const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
    oscillator.type = 'sawtooth'; oscillator.frequency.value = 55;
    gain.gain.value = settings.volume * 0.012;
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    engineOscillator = oscillator; engineGain = gain; oscillator.start();
  } catch { engineOscillator = undefined; engineGain = undefined; }
}
export function setEngineVolume(volume: number) { if (engineGain) engineGain.gain.value = Math.max(0, Math.min(1, volume)) * 0.012; }
export function stopEngine() {
  try { engineOscillator?.stop(); } catch { /* Already stopped. */ }
  engineOscillator = undefined; engineGain = undefined;
}

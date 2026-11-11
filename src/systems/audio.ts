const files: Record<string, string> = {
  select: '/audio/ui-select.ogg', launch: '/audio/mission-launch.ogg',
  scan: '/audio/science-scan.ogg', complete: '/audio/mission-complete.ogg',
  warning: '/audio/resource-warning.ogg',
};

let audioContext: AudioContext | undefined;
const loaded = new Map<string, HTMLAudioElement>();

/** Plays supplied user audio when present, with a tiny Web Audio cue as a fallback. */
export function playSound(name: keyof typeof files) {
  try {
    let player = loaded.get(name);
    if (!player) {
      player = new Audio(files[name]);
      player.volume = 0.24;
      loaded.set(name, player);
    }
    player.currentTime = 0;
    void player.play().catch(() => playTone(name));
  } catch { playTone(name); }
}

function playTone(name: keyof typeof files) {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequencies: Record<string, number> = { select: 620, launch: 190, scan: 820, complete: 980, warning: 260 };
    oscillator.frequency.value = frequencies[name];
    oscillator.type = name === 'warning' ? 'sawtooth' : 'sine';
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, audioContext.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + (name === 'complete' ? 0.24 : 0.11));
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + 0.25);
  } catch { /* Audio is an enhancement; it must never interrupt gameplay. */ }
}

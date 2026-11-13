import { useEffect, useRef, useState } from 'react';
import { introduction, missionTransmission, operationsGuide, selectSpanishVoice, type Transmission } from '../data/commander';
import { readStorage, writeStorage } from '../systems/storage';
import type { Mission } from '../data/missions';
import { playSound, setAmbienceScene, setAmbienceVolume, setEngineVolume, startAmbience, stopAmbience, stopEngine } from '../systems/audio';
import './commander.css';

type Props = { mission: Mission; screen: 'home' | 'mission' | 'engineering' | 'transit' | 'exploration' | 'reports' };
type Settings = { voice: boolean; subtitles: boolean; effects: boolean; volume: number; voiceURI: string; rate: number };
const settingsKey = 'orbital-command-commander-settings-v1';
const guideKey = 'orbital-command-operations-guide-v1';

function loadSettings(): Settings {
  try {
    const saved: unknown = JSON.parse(readStorage(settingsKey) ?? '{}');
    if (!saved || typeof saved !== 'object') throw new Error('invalid settings');
    const value = saved as Partial<Settings>;
    return {
      voiceURI: typeof value.voiceURI === 'string' ? value.voiceURI.slice(0, 300) : '',
      rate: typeof value.rate === 'number' && Number.isFinite(value.rate) ? Math.max(0.8, Math.min(1.15, value.rate)) : 1,
      voice: typeof value.voice === 'boolean' ? value.voice : true,
      subtitles: typeof value.subtitles === 'boolean' ? value.subtitles : true,
      effects: typeof value.effects === 'boolean' ? value.effects : true,
      volume: typeof value.volume === 'number' && Number.isFinite(value.volume) ? Math.max(0, Math.min(1, value.volume)) : 0.8,
    };
  } catch { return { voice: true, subtitles: true, effects: true, volume: 0.8, voiceURI: '', rate: 1 }; }
}

export default function Commander({ mission, screen }: Props) {
  const [settings, setSettings] = useState(loadSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceError, setVoiceError] = useState('');
  const [guideStep, setGuideStep] = useState(() => readStorage(guideKey) === 'done' ? -1 : 0);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Transmission>(introduction);
  const [history, setHistory] = useState<Transmission[]>([introduction]);
  const [speaking, setSpeaking] = useState(false);
  const [captionVisible, setCaptionVisible] = useState(false);
  const [ambient, setAmbient] = useState(false);
  const [ambientUnavailable, setAmbientUnavailable] = useState(false);
  const [wordStart, setWordStart] = useState<number | null>(null);
  const playbackId = useRef(0);
  const audioActivated = useRef(false);
  const previousScreen = useRef(screen);
  const captionTimer = useRef(0);
  const panelRef = useRef<HTMLElement>(null);
  const guideActive = guideStep >= 0;
  const available = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  useEffect(() => {
    if (!available) return;
    const refresh = () => setVoices(window.speechSynthesis.getVoices().filter((voice) => /^es(?:-|_|$)/i.test(voice.lang)));
    refresh();
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
  }, [available]);

  useEffect(() => { writeStorage(settingsKey, JSON.stringify(settings)); }, [settings]);
  useEffect(() => () => {
    playbackId.current += 1;
    if (available) window.speechSynthesis.cancel();
    window.clearTimeout(captionTimer.current);
    stopAmbience();
  }, [available]);
  useEffect(() => { setAmbienceScene(screen); }, [screen]);
  useEffect(() => { setAmbienceVolume(settings.volume); setEngineVolume(settings.volume); if (!settings.effects) { stopAmbience(); stopEngine(); setAmbient(false); } }, [settings.volume, settings.effects]);
  useEffect(() => {
    if (!guideActive || !panelRef.current) return;
    const panel = panelRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), summary')];
    focusable()[0]?.focus();
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keepFocus);
    return () => { document.removeEventListener('keydown', keepFocus); previousFocus?.focus(); };
  }, [guideActive]);

  function stop() {
    playbackId.current += 1;
    if (available) window.speechSynthesis.cancel();
    setSpeaking(false);
    setWordStart(null);
  }

  function play(transmission: Transmission, options = settings) {
    stop();
    setVoiceError('');
    setCurrent(transmission);
    if (!available || !options.voice) return;
    audioActivated.current = true;
    playSound('select');
    const id = playbackId.current;
    const utterance = new SpeechSynthesisUtterance(transmission.text);
    const availableVoices = window.speechSynthesis.getVoices();
    const voice = availableVoices.find((item) => item.voiceURI === options.voiceURI && /^es(?:-|_|$)/i.test(item.lang)) ?? selectSpanishVoice(availableVoices);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? 'es-DO';
    utterance.rate = options.rate;
    utterance.volume = options.volume;
    utterance.onstart = () => { if (id === playbackId.current) setSpeaking(true); };
    utterance.onboundary = (event) => { if (id === playbackId.current && Number.isInteger(event.charIndex)) setWordStart(event.charIndex); };
    utterance.onend = () => { if (id === playbackId.current) { setSpeaking(false); setWordStart(null); } };
    utterance.onerror = () => { if (id === playbackId.current) { setSpeaking(false); setWordStart(null); setVoiceError('No se pudo reproducir esta voz. Prueba otra voz disponible.'); } };
    window.speechSynthesis.speak(utterance);
  }

  function record(transmission: Transmission, speak = false) {
    setCurrent(transmission);
    setHistory((previous) => [...previous, transmission].slice(-40));
    if (speak) play(transmission);
  }
  function showCaption() {
    setCaptionVisible(true);
    window.clearTimeout(captionTimer.current);
    captionTimer.current = window.setTimeout(() => setCaptionVisible(false), 8000);
  }

  useEffect(() => {
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    if (screen === 'home' || screen === 'reports') return;
    const transmission = screen === 'engineering'
      ? { id: 'engineering', title: 'PREPARACIÓN DE SISTEMAS', text: 'Cada instrumento añade masa, consume energía y produce datos. Revisa el lanzador, el presupuesto y el enlace antes de confirmar tu configuración.' }
      : screen === 'transit'
        ? { id: 'transit', title: 'TRAYECTORIA SIMULADA', text: `La tripulación prepara el viaje hacia ${mission.destination}. Las ventanas y duraciones son aproximaciones educativas. Vigila los recursos y confirma la maniobra cuando el centro de control la solicite.` }
        : missionTransmission(mission.name, mission.destination, screen === 'mission' ? 'briefing' : 'exploration');
    setCurrent(transmission);
    setHistory((previous) => [...previous, transmission].slice(-40));
    showCaption();
    // Speech is activated only after the player requests it, as browsers require.
    if (audioActivated.current && settings.voice) play(transmission);
  // A transmission belongs to a navigation event, not to settings changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    const onTransmission = (event: Event) => {
      const detail = (event as CustomEvent<Transmission>).detail;
      if (!detail || typeof detail.id !== 'string' || typeof detail.title !== 'string' || typeof detail.text !== 'string') return;
      setCurrent(detail);
      setHistory((previous) => [...previous, detail].slice(-40));
      showCaption();
      if (audioActivated.current && settings.voice) play(detail);
    };
    window.addEventListener('orbital-commander-transmission', onTransmission);
    return () => window.removeEventListener('orbital-commander-transmission', onTransmission);
  // Resubscribe when playback preferences change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, available]);

  function finishGuide() {
    stop();
    writeStorage(guideKey, 'done');
    setGuideStep(-1);
  }

  const guide = guideStep >= 0 ? operationsGuide[guideStep] : null;
  const shown = guide ?? current;
  const highlightedEnd = wordStart === null ? null : shown.text.slice(wordStart).search(/\s/);
  const end = wordStart === null ? null : highlightedEnd === -1 ? shown.text.length : wordStart + (highlightedEnd ?? 0);

  return <>
    <button className="commander-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="commander-panel">◉ <span>COMANDANTE</span></button>
    {(open || guide) && <aside ref={panelRef} id="commander-panel" className={`commander-panel ${guide ? 'commander-panel-guide' : ''}`} role={guide ? 'dialog' : undefined} aria-modal={guide ? true : undefined} aria-label="Comunicaciones del comandante">
      <div className="commander-header"><div><span>CONTROL TERRESTRE · 2042</span><strong>COMANDANTE</strong></div>{!guide && <button onClick={() => { stop(); setOpen(false); }} aria-label="Cerrar comunicaciones">×</button>}</div>
      {guide && <div className="commander-progress">GUÍA DE OPERACIONES · {guideStep + 1} / {operationsGuide.length}</div>}
      <h2>{shown.title}</h2>
      {settings.subtitles && <p className="commander-subtitle">{wordStart !== null && end !== null ? <>{shown.text.slice(0, wordStart)}<mark>{shown.text.slice(wordStart, end)}</mark>{shown.text.slice(end)}</> : shown.text}</p>}
      {!settings.subtitles && <p className="commander-muted">Subtítulos desactivados.</p>}
      <div className="commander-playback"><button onClick={() => play(shown)} disabled={!available || !settings.voice}>{speaking ? '↻ REPETIR' : '▶ ESCUCHAR'}</button>{speaking && <button onClick={stop}>■ DETENER</button>}</div>
      {!available && <p className="commander-muted">La síntesis de voz no está disponible en este navegador.</p>}
      {voiceError && <p role="status" className="commander-muted">{voiceError}</p>}
      <div className="voice-personality"><label>Voz del comandante<select aria-label="Voz del comandante" value={settings.voiceURI} onChange={(event) => { stop(); setSettings((old) => ({ ...old, voiceURI: event.target.value })); }}><option value="">Selección automática en español</option>{voices.map((voice) => <option key={voice.voiceURI || voice.name} value={voice.voiceURI}>{voice.name} · {voice.lang}{voice.localService ? ' · local' : ' · servicio del navegador'}</option>)}</select></label><label>Ritmo · {settings.rate.toFixed(2)}×<input aria-label="Ritmo de narración" type="range" min="0.8" max="1.15" step="0.05" value={settings.rate} onChange={(event) => { stop(); setSettings((old) => ({ ...old, rate: Number(event.target.value) })); }} /></label><small>{voices.length ? 'Escucha y elige la voz que te resulte más natural. Las voces remotas pueden necesitar conexión.' : 'El sistema aún no ofrece voces españolas. La reproducción depende de las voces del navegador.'}</small></div>
      <div className="commander-settings">
        <label><input type="checkbox" checked={settings.voice} onChange={(event) => { const voice = event.target.checked; if (!voice) stop(); setSettings((old) => ({ ...old, voice })); }} /> Voz</label>
        <label><input type="checkbox" checked={settings.subtitles} onChange={(event) => setSettings((old) => ({ ...old, subtitles: event.target.checked }))} /> Subtítulos</label>
        <label><input type="checkbox" checked={settings.effects} onChange={(event) => setSettings((old) => ({ ...old, effects: event.target.checked }))} /> Efectos</label>
        <label>Volumen <input aria-label="Volumen de la voz" type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(event) => setSettings((old) => ({ ...old, volume: Number(event.target.value) }))} /></label>
      </div>
      <div className="commander-playback"><button disabled={!settings.effects} onClick={async () => { if (ambient) { stopAmbience(); setAmbient(false); } else { const started = await startAmbience(screen, settings.volume); setAmbient(started); setAmbientUnavailable(!started); } }}>{ambient ? '■ DETENER AMBIENTE' : '♫ MÚSICA AMBIENTAL'}</button></div>
      {ambientUnavailable && <p className="commander-muted">El audio ambiental no está disponible en este navegador.</p>}
      {guide ? <div className="commander-guide-actions"><button onClick={finishGuide}>OMITIR GUÍA</button><button onClick={() => { stop(); if (guideStep === operationsGuide.length - 1) finishGuide(); else { const next = operationsGuide[guideStep + 1]; setGuideStep(guideStep + 1); record(next, audioActivated.current && settings.voice); } }}>{guideStep === operationsGuide.length - 1 ? 'COMENZAR MISIÓN' : 'SIGUIENTE →'}</button></div> : <details className="commander-history"><summary>REGISTRO DE TRANSMISIONES · {history.length}</summary><ol>{history.map((item, index) => <li key={`${item.id}-${index}`}><button onClick={() => play(item)}>{item.title} <span>↻</span></button></li>)}</ol><button onClick={() => { stop(); setGuideStep(0); }}>REVISAR GUÍA DE OPERACIONES</button></details>}
    </aside>}
    {guide && <div className="commander-scrim" aria-hidden="true" />}
    {!guide && !open && settings.subtitles && (speaking || captionVisible) && <div className="commander-caption" role="status"><strong>CONTROL TERRESTRE · {current.title}</strong><span>{current.text}</span></div>}
  </>;
}

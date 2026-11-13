import { useEffect, useRef, useState } from 'react';
/** Fullscreen keeps the actual interactive view and its controls mounted. */
export default function FullscreenControl({ label }: { label: string }) {
  const button = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const sync = () => setExpanded(document.fullscreenElement === button.current?.closest('[data-visualization]'));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  async function toggle() {
    const target = button.current?.closest<HTMLElement>('[data-visualization]');
    if (!target) return;
    setError('');
    try {
      if (document.fullscreenElement === target) await document.exitFullscreen();
      else if (target.requestFullscreen) await target.requestFullscreen();
      else setError('Este navegador no admite pantalla completa. Usa el zoom del navegador para ampliar la vista.');
    } catch { setError('El navegador no permitió ampliar esta vista. Inténtalo de nuevo.'); }
  }
  return <div className="fullscreen-control"><button ref={button} type="button" onClick={() => void toggle()} aria-label={`${expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}: ${label}`} aria-pressed={expanded}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={expanded ? 'M9 3v6H3m12-6v6h6M3 15h6v6m12-6h-6v6' : 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6'} /></svg> {expanded ? 'Salir · Esc' : 'Pantalla completa'}</button>{error && <span className="fullscreen-error" role="status">{error}</span>}</div>;
}

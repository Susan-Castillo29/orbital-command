import { useState } from 'react';
import { qualityKey, type RenderQuality } from '../systems/renderQuality';
import { readStorage, writeStorage } from '../systems/storage';
export default function RenderSettings() {
  const [quality, setQuality] = useState<RenderQuality>(() => { const saved = readStorage(qualityKey); return saved === 'economy' || saved === 'high' ? saved : 'balanced'; });
  return <label className="render-settings"><span>Gráficos</span><select aria-label="Calidad gráfica" value={quality} onChange={(event) => { const next = event.target.value as RenderQuality; setQuality(next); writeStorage(qualityKey, next); window.dispatchEvent(new Event('orbital-render-quality')); }}><option value="economy">Ahorro</option><option value="balanced">Equilibrado</option><option value="high">Detalle</option></select></label>;
}

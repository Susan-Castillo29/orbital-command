import { useState } from 'react';
import { qualityKey, type RenderQuality } from '../systems/renderQuality';
import { readStorage, writeStorage } from '../systems/storage';
export default function RenderSettings({ language }: { language: 'en' | 'es' }) {
  const t = (es: string, en: string) => language === 'es' ? es : en;
  const [quality, setQuality] = useState<RenderQuality>(() => { const saved = readStorage(qualityKey); return saved === 'economy' || saved === 'high' ? saved : 'balanced'; });
  return <label className="render-settings"><span>{t("Gráficos", "Graphics")}</span><select aria-label={t("Calidad gráfica", "Graphics quality")} value={quality} onChange={(event) => { const next = event.target.value as RenderQuality; setQuality(next); writeStorage(qualityKey, next); window.dispatchEvent(new Event('orbital-render-quality')); }}><option value="economy">{t("Ahorro", "Economy")}</option><option value="balanced">{t("Equilibrado", "Balanced")}</option><option value="high">{t("Detalle", "Detail")}</option></select></label>;
}

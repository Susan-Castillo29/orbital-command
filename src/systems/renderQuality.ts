import type { WebGLRenderer } from 'three';
import { readStorage } from './storage.ts';
export type RenderQuality = 'economy' | 'balanced' | 'high';
export const qualityKey = 'orbital-command-render-quality';
export function pixelRatioFor(width: number, height: number, dpr: number, quality: RenderQuality): number {
  const budget = quality === 'economy' ? 800000 : quality === 'high' ? 3200000 : 1600000;
  const cap = quality === 'economy' ? 1 : quality === 'high' ? 2 : 1.5;
  return Math.min(Math.max(0.5, dpr || 1), cap, Math.sqrt(budget / Math.max(1, width * height)));
}
export function attachRenderQuality(renderer: WebGLRenderer, host: HTMLElement): () => void {
  const update = () => {
    const saved = readStorage(qualityKey);
    const quality = saved === 'economy' || saved === 'high' ? saved : 'balanced';
    renderer.setPixelRatio(pixelRatioFor(host.clientWidth, host.clientHeight, window.devicePixelRatio, quality));
  };
  update();
  const observer = new ResizeObserver(update); observer.observe(host);
  window.addEventListener('orbital-render-quality', update);
  return () => { observer.disconnect(); window.removeEventListener('orbital-render-quality', update); };
}

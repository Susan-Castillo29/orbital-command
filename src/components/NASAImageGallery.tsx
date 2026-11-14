import { useMemo, useState } from 'react';

type GalleryImage = { id: string; title: string; date: string; src: string; source: string };
function permittedImage(value: unknown, host: string): string | null {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === host && !url.port && !url.username && !url.password ? url.href : null; } catch { return null; }
}
function object(value: unknown): Record<string, unknown> | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function text(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback; }
export function galleryImages(dataset: string, data: unknown): GalleryImage[] {
  if (dataset === 'images' || dataset === 'images_rover') {
    const collection = object(object(data)?.collection);
    const items = Array.isArray(collection?.items) ? collection.items : [];
    return items.flatMap((item, index) => {
      const entry = object(item); const info = object(Array.isArray(entry?.data) ? entry.data[0] : null);
      const links = Array.isArray(entry?.links) ? entry.links.map(object).filter(Boolean) as Record<string, unknown>[] : [];
      const preview = links.find(link => link.rel === 'preview') ?? links.find(link => link.render === 'image');
      const src = permittedImage(preview?.href, 'images-assets.nasa.gov');
      if (!src) return [];
      const original = permittedImage(links.find(link => link.rel === 'canonical')?.href, 'images-assets.nasa.gov') ?? src;
      return [{id:text(info?.nasa_id, String(index)),title:text(info?.title,'Imagen de NASA'),date:text(info?.date_created).slice(0,10),src,source:original}];
    });
  }
  if (dataset === 'epic' && Array.isArray(data)) return data.flatMap((item, index) => {
    const entry = object(item); const date = text(entry?.date).slice(0,10); const image = text(entry?.image);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^epic_1b_\d{14}$/.test(image)) return [];
    const src = `https://epic.gsfc.nasa.gov/archive/natural/${date.replaceAll('-', '/')}/jpg/${image}.jpg`;
    return [{id:text(entry?.identifier,String(index)),title:'La Tierra desde DSCOVR · EPIC',date,src,source:src}];
  });
  if (dataset === 'apod') {
    const items = Array.isArray(data) ? data : [data];
    return items.flatMap((item,index) => {
      const entry=object(item);if(entry?.media_type !== 'image') return [];
      const src=permittedImage(entry.hdurl,'assets.science.nasa.gov');
      const source=permittedImage(entry.permalink,'science.nasa.gov');
      if(!src || !source) return [];
      return [{id:text(entry.date,String(index)),title:text(entry.title,'Imagen astronómica'),date:text(entry.date),src,source}];
    });
  }
  return [];
}
export default function NASAImageGallery({ dataset, data }: { dataset: string; data: unknown }) {
  const images=useMemo(()=>galleryImages(dataset,data),[dataset,data]);
  const [limit,setLimit]=useState(12);const [failed,setFailed]=useState<string[]>([]);
  if (!images.length) return null;
  const visible=images.slice(0,limit);
  return <section className="nasa-gallery" aria-label="Galería de imágenes científicas"><div className="nasa-gallery-heading"><div><h3>Galería de imágenes</h3><p>Mostrando {visible.length} de {images.length} imágenes incluidas en esta respuesta de NASA.</p></div></div><div className="nasa-gallery-grid">{visible.map((image,index)=><article className="nasa-image-card" key={`${image.id}-${index}`}><a href={image.source} target="_blank" rel="noreferrer" aria-label={`Abrir imagen original: ${image.title}`}>{failed.includes(image.id) ? <span className="nasa-image-unavailable">Imagen no disponible. Abrir fuente original ↗</span> : <img src={image.src} alt={image.title} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(previous=>[...previous,image.id])} />}</a><div><strong>{image.title}</strong>{image.date && <time>{image.date}</time>}<a href={image.source} target="_blank" rel="noreferrer">Ver original en NASA ↗</a></div></article>)}</div>{visible.length<images.length && <button className="systems-secondary" onClick={()=>setLimit(value=>value+12)}>MOSTRAR MÁS IMÁGENES</button>}</section>;
}

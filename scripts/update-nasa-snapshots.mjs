import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { nasaDatasetIds, nasaHandler } from '../server/nasa-proxy.mjs';
try { process.loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!process.env.NASA_API_KEY) throw Error('Configura NASA_API_KEY en el servidor o en .env.local.');
const key = Buffer.from(process.env.NASA_API_KEY);
const directory = new URL('../public/nasa-data/', import.meta.url);
await mkdir(directory, { recursive: true });
const server = createServer((req,res)=>void nasaHandler(req,res));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const requested = process.argv.slice(2);
if (requested.some(id => !nasaDatasetIds.includes(id))) throw Error('Identificador de fuente no permitido.');
const selected = requested.length ? requested : nasaDatasetIds;
let errors = 0;
try {
  for (const dataset of selected) {
    const response = await fetch(`${origin}/api/nasa?dataset=${encodeURIComponent(dataset)}`);
    if (!response.ok) {
      errors++;
      const payload = await response.json().catch(() => ({}));
      const match = typeof payload.error === 'string' ? payload.error.match(/^El servicio científico respondió (\d{3})\./) : null;
      const reason = match ? `NASA ${match[1]}` : `error del servicio ${response.status}`;
      console.log(`${dataset}: no disponible (${reason}); se conserva cualquier archivo anterior`);
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.includes(key)) throw Error('Se detectó la clave en una respuesta; actualización cancelada.');
    await writeFile(new URL(`${dataset}.json`,directory),bytes);
    console.log(`${dataset}: actualizado`);
  }
  const image = selected.includes('apod') ? await fetch(`${origin}/api/nasa/apod-image`) : null;
  if (image?.ok) {
    const bytes = Buffer.from(await image.arrayBuffer());
    if (bytes.includes(key)) throw Error('Se detectó la clave en una imagen; actualización cancelada.');
    const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[image.headers.get('content-type')];
    if (!ext) throw Error('El formato de imagen no está permitido.');
    const name = `apod-image.${ext}`;
    await writeFile(new URL(name,directory),bytes);
    const apodPath = new URL('apod.json',directory);
    const apod = JSON.parse(await readFile(apodPath, 'utf8'));
    apod.snapshotImage = name;
    await writeFile(apodPath, JSON.stringify(apod));
    console.log('Imagen APOD: actualizada');
  } else if (image) { errors++; console.log('Imagen APOD: no disponible; se conserva cualquier archivo anterior'); }
} finally { await new Promise(resolve=>server.close(resolve)); }
console.log(`Actualización concluida; ${errors} fuentes no disponibles.`);

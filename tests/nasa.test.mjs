import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseApod, parseNearEarthObjects, isValidApodDate, apodPageFor } from '../src/systems/nasa.ts';

const apod = { date: '2026-11-13', title: 'Nebulosa', explanation: 'Texto', media_type: 'image', url: 'https://apod.nasa.gov/apod/image/a.jpg', hdurl: 'https://apod.nasa.gov/apod/image/b.jpg', copyright: 'Autor\nUno' };

test('APOD acepta imágenes de apod.nasa.gov y normaliza el copyright', () => {
  const parsed = parseApod(apod);
  assert.equal(parsed.imageUrl, apod.url);
  assert.equal(parsed.copyright, 'Autor Uno');
  assert.equal(parsed.pageUrl, 'https://apod.nasa.gov/apod/ap261113.html');
});

test('APOD descarta imágenes de otros orígenes y esquemas inseguros', () => {
  assert.equal(parseApod({ ...apod, url: 'https://evil.example/a.jpg', hdurl: 'javascript:alert(1)' }).imageUrl, null);
  assert.equal(parseApod({ ...apod, url: 'http://apod.nasa.gov/a.jpg' }).imageUrl, null);
});

test('APOD de vídeo no devuelve imagen y enlaza solo a hosts permitidos', () => {
  const video = parseApod({ ...apod, media_type: 'video', url: 'https://www.youtube.com/embed/x' });
  assert.equal(video.imageUrl, null);
  assert.equal(video.pageUrl, 'https://www.youtube.com/embed/x');
  assert.equal(parseApod({ ...apod, media_type: 'video', url: 'https://evil.example/v' }).pageUrl, apodPageFor('2026-11-13'));
});

test('APOD rechaza respuestas incompletas o con fecha inválida', () => {
  assert.equal(parseApod(null), null);
  assert.equal(parseApod({ ...apod, title: '' }), null);
  assert.equal(parseApod({ ...apod, date: '2026-02-30' }), null);
  assert.equal(isValidApodDate('1995-06-15'), false);
  assert.equal(isValidApodDate('1995-06-16'), true);
});

const neo = (id, lunar, extra = {}) => ({ id, name: `(2026 ${id})`, nasa_jpl_url: 'https://ssd.jpl.nasa.gov/x', is_potentially_hazardous_asteroid: false, estimated_diameter: { meters: { estimated_diameter_min: 10, estimated_diameter_max: 30 } }, close_approach_data: [{ relative_velocity: { kilometers_per_second: '12.5' }, miss_distance: { lunar: String(lunar), kilometers: String(lunar * 384400) } }], ...extra });

test('NeoWs ordena por cercanía, promedia el tamaño y omite datos corruptos', () => {
  const list = parseNearEarthObjects({ near_earth_objects: { '2026-11-14': [neo('A', 9), neo('B', 2), { id: 'C' }], '2026-11-15': [neo('D', 5, { nasa_jpl_url: 'http://evil.example' })] } });
  assert.deepEqual(list.map((item) => item.id), ['B', 'D', 'A']);
  assert.equal(list[0].diameterMeters, 20);
  assert.equal(list[0].name, '2026 B');
  assert.equal(list[1].jplUrl, null);
  assert.equal(list[0].approachDate, '2026-11-14');
  assert.deepEqual(parseNearEarthObjects('x'), []);
});

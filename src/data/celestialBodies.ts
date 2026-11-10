export type CelestialBody = {
  id: string;
  name: string;
  radius: number;
  position: [number, number, number];
  color: string;
  accent: string;
  fact: string;
  landing: boolean;
};

// Escala visual educativa: posiciones y tamaños no representan distancias reales.
export const celestialBodies: CelestialBody[] = [
  { id: 'mercury', name: 'Mercurio', radius: 0.48, position: [7, 0, 0], color: '#8a8177', accent: '#c4b8aa', fact: 'Planeta rocoso con grandes variaciones de temperatura.', landing: true },
  { id: 'venus', name: 'Venus', radius: 0.78, position: [10, 0, 0], color: '#b57c42', accent: '#f0ca88', fact: 'Su densa atmósfera produce un intenso efecto invernadero.', landing: false },
  { id: 'earth', name: 'Tierra', radius: 0.9, position: [14, 0, 0], color: '#246da2', accent: '#7bd5ff', fact: 'Un planeta oceánico con una atmósfera rica en nitrógeno y oxígeno.', landing: true },
  { id: 'moon', name: 'Luna', radius: 0.42, position: [16.1, 0, 0], color: '#858b96', accent: '#e0e5ee', fact: 'Su superficie conserva cráteres y registros de la historia temprana del sistema solar.', landing: true },
  { id: 'mars', name: 'Marte', radius: 0.72, position: [20, 0, 0], color: '#a94d38', accent: '#f09a72', fact: 'Antiguos deltas y minerales hidratados apuntan a un pasado con agua líquida.', landing: true },
  { id: 'asteroid', name: 'Cinturón de asteroides', radius: 0.52, position: [24, 0, 0], color: '#85765e', accent: '#d2bd94', fact: 'Fragmentos rocosos y metálicos que conservan materiales primitivos.', landing: false },
  { id: 'jupiter', name: 'Júpiter', radius: 1.45, position: [29, 0, 0], color: '#a87d5c', accent: '#efd0a6', fact: 'El gigante gaseoso posee bandas atmosféricas y un potente campo magnético.', landing: false },
  { id: 'europa', name: 'Europa', radius: 0.43, position: [32, 0, 0], color: '#a78d72', accent: '#f0e2c7', fact: 'Una corteza de hielo podría ocultar un océano global bajo su superficie.', landing: true },
  { id: 'saturn', name: 'Saturno', radius: 1.25, position: [37, 0, 0], color: '#b59a6b', accent: '#eed8a6', fact: 'Sus anillos están formados principalmente por hielo y fragmentos rocosos.', landing: false },
  { id: 'titan', name: 'Titán', radius: 0.52, position: [40, 0, 0], color: '#b7793c', accent: '#edbd73', fact: 'Una luna con lagos y lluvia de hidrocarburos bajo una atmósfera densa.', landing: true },
  { id: 'uranus', name: 'Urano', radius: 1.02, position: [45, 0, 0], color: '#6fabb2', accent: '#b3eff2', fact: 'Un gigante helado que rota con una inclinación extrema.', landing: false },
  { id: 'neptune', name: 'Neptuno', radius: 1, position: [52, 0, 0], color: '#3562b8', accent: '#8eb8ff', fact: 'Vientos supersónicos recorren su fría atmósfera azul.', landing: false },
];

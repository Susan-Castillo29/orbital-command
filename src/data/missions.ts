export type Mission = {
  id: string;
  targetBodyId: string;
  name: string;
  destination: string;
  category: string;
  color: string;
  bodyColor: number;
  radius: number;
  orbit: number;
  budget: number;
  duration: string;
  difficulty: 'BAJA' | 'MEDIA' | 'ALTA';
  objective: string;
  description: string;
  reward: number;
};

export const missions: Mission[] = [
  {
    id: 'moon', targetBodyId: 'moon', name: 'LUNAR FRONTIER', destination: 'Luna', category: 'Exploración lunar',
    color: '#91d9ff', bodyColor: 0x9299a7, radius: 0.62, orbit: 6.1, budget: 420, duration: '12 días',
    difficulty: 'BAJA', objective: 'Investigar la composición del suelo lunar y localizar regiones de interés científico.',
    description: 'Selecciona un sitio seguro, despliega un rover, estudia formaciones rocosas y transmite las muestras al centro de control.', reward: 180,
  },
  {
    id: 'mars', targetBodyId: 'mars', name: 'RED PLANET', destination: 'Marte', category: 'Exploración planetaria',
    color: '#ff8b67', bodyColor: 0xc9684d, radius: 0.82, orbit: 10, budget: 680, duration: '210 días',
    difficulty: 'ALTA', objective: 'Analizar la geología de un antiguo delta.',
    description: 'Una misión robótica de larga duración. El retraso de señal y el consumo energético serán desafíos clave.', reward: 420,
  },
  {
    id: 'earth', targetBodyId: 'earth', name: 'EARTH GUARDIAN', destination: 'Tierra', category: 'Observación terrestre',
    color: '#63c6ff', bodyColor: 0x277cb7, radius: 0.93, orbit: 4.4, budget: 300, duration: '90 días',
    difficulty: 'BAJA', objective: 'Medir cambios en nubes y cobertura vegetal.',
    description: 'Un satélite de órbita baja para estudiar el clima y la superficie de nuestro planeta.', reward: 150,
  },
  {
    id: 'asteroid', targetBodyId: 'asteroid', name: 'ASTEROID SEEKER', destination: 'Asteroide Psyche', category: 'Ciencia de asteroides',
    color: '#d6c6a2', bodyColor: 0x9a8b72, radius: 0.48, orbit: 13.2, budget: 760, duration: '3 años',
    difficulty: 'ALTA', objective: 'Estudiar la composición de un cuerpo metálico.',
    description: 'Una travesía interplanetaria para investigar los bloques de construcción del sistema solar.', reward: 500,
  },
  {
    id: 'europa', targetBodyId: 'europa', name: 'EUROPA DEEP', destination: 'Europa', category: 'Exploración orbital',
    color: '#e5d7bd', bodyColor: 0xb9a78f, radius: 0.43, orbit: 32, budget: 900, duration: '5 años',
    difficulty: 'ALTA', objective: 'Investigar fracturas y características de la superficie helada de Europa.',
    description: 'Una sonda resistente a la radiación estudiará la luna desde una trayectoria orbital. No se permite aterrizar en regiones no verificadas.', reward: 650,
  },
  {
    id: 'saturn', targetBodyId: 'saturn', name: 'SATURN OBSERVER', destination: 'Saturno', category: 'Observación orbital',
    color: '#eed8a6', bodyColor: 0xb59a6b, radius: 1.25, orbit: 37, budget: 820, duration: '3 años',
    difficulty: 'ALTA', objective: 'Fotografiar los anillos y estudiar las lunas de Saturno.',
    description: 'Una misión de observación remota para comparar regiones de los anillos y seguir las lunas sin intentar aterrizar en el gigante gaseoso.', reward: 560,
  },
  {
    id: 'jupiter', targetBodyId: 'jupiter', name: 'JUPITER STORM', destination: 'Júpiter', category: 'Observación atmosférica',
    color: '#f0bd83', bodyColor: 0xc79a6f, radius: 1.45, orbit: 29, budget: 880, duration: '4 años',
    difficulty: 'ALTA', objective: 'Observar la Gran Mancha Roja y registrar cambios en las tormentas.',
    description: 'La investigación se realiza desde órbita con instrumentos atmosféricos; Júpiter no tiene una superficie sólida accesible.', reward: 620,
  },
  {
    id: 'sun', targetBodyId: 'sun', name: 'Solar Watch', destination: 'Sol', category: 'Heliofísica',
    color: '#ffd36e', bodyColor: 0xffc15c, radius: 0.54, orbit: 3.2, budget: 520, duration: '60 días',
    difficulty: 'MEDIA', objective: 'Observar actividad y eyecciones solares.',
    description: 'Una sonda de observación solar que debe gestionar con cuidado el calor y la comunicación.', reward: 320,
  },
  {
    id: 'mercury', targetBodyId: 'mercury', name: 'THE EDGE OF FIRE', destination: 'Mercurio', category: 'Geología orbital',
    color: '#d5bd9c', bodyColor: 0x8a8177, radius: 0.4, orbit: 7, budget: 700, duration: 'Varios años',
    difficulty: 'ALTA', objective: 'Comparar regiones iluminadas y oscuras y estudiar el relieve lleno de cráteres.',
    description: 'Una misión robótica de observación orbital. La proximidad al Sol exige protección térmica y una trayectoria cuidadosa.', reward: 380,
  },
  {
    id: 'venus', targetBodyId: 'venus', name: 'THE HIDDEN WORLD', destination: 'Venus', category: 'Ciencia atmosférica',
    color: '#f0ca88', bodyColor: 0xb57c42, radius: 0.72, orbit: 10, budget: 720, duration: 'Varios meses',
    difficulty: 'ALTA', objective: 'Estudiar la atmósfera y las nubes de Venus para compararlas con la Tierra.',
    description: 'La exploración se realiza con instrumentos remotos; las condiciones de superficie no permiten una caminata humana.', reward: 410,
  },
  {
    id: 'titan', targetBodyId: 'titan', name: 'ANOTHER WORLD', destination: 'Titán', category: 'Luna de Saturno',
    color: '#edbd73', bodyColor: 0xb7793c, radius: 0.43, orbit: 41, budget: 960, duration: 'Varios años',
    difficulty: 'ALTA', objective: 'Investigar la atmósfera y regiones con lagos de hidrocarburos de Titán.',
    description: 'Una investigación robótica desde el sistema de Saturno. Las observaciones se muestran como datos simulados.', reward: 680,
  },
  {
    id: 'uranus', targetBodyId: 'uranus', name: 'THE DISTANT FRONTIER · URANO', destination: 'Urano', category: 'Gigantes helados',
    color: '#b3eff2', bodyColor: 0x6fabb2, radius: 1.15, orbit: 48, budget: 1000, duration: 'Muchos años',
    difficulty: 'ALTA', objective: 'Observar la atmósfera y el entorno magnético de Urano.',
    description: 'Una sonda de larga duración examina un gigante helado sin intentar aterrizar en él.', reward: 720,
  },
  {
    id: 'neptune', targetBodyId: 'neptune', name: 'THE DISTANT FRONTIER · NEPTUNO', destination: 'Neptuno', category: 'Gigantes helados',
    color: '#8eb8ff', bodyColor: 0x3562b8, radius: 1.12, orbit: 57, budget: 1100, duration: 'Muchos años',
    difficulty: 'ALTA', objective: 'Investigar la atmósfera y el entorno de Neptuno.',
    description: 'Una misión robótica de gran distancia observa tormentas y lunas con recursos limitados.', reward: 760,
  },
];

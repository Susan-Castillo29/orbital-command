export type Mission = {
  id: string;
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
    id: 'moon', name: 'LUNAR FRONTIER', destination: 'Luna', category: 'Exploración lunar',
    color: '#91d9ff', bodyColor: 0x9299a7, radius: 0.62, orbit: 6.1, budget: 420, duration: '12 días',
    difficulty: 'BAJA', objective: 'Investigar la composición del suelo lunar y localizar regiones de interés científico.',
    description: 'Selecciona un sitio seguro, despliega un rover, estudia formaciones rocosas y transmite las muestras al centro de control.', reward: 180,
  },
  {
    id: 'mars', name: 'Red Frontier', destination: 'Marte', category: 'Exploración planetaria',
    color: '#ff8b67', bodyColor: 0xc9684d, radius: 0.82, orbit: 10, budget: 680, duration: '210 días',
    difficulty: 'ALTA', objective: 'Analizar la geología de un antiguo delta.',
    description: 'Una misión robótica de larga duración. El retraso de señal y el consumo energético serán desafíos clave.', reward: 420,
  },
  {
    id: 'earth', name: 'Blue Sentinel', destination: 'Tierra', category: 'Observación terrestre',
    color: '#63c6ff', bodyColor: 0x277cb7, radius: 0.93, orbit: 4.4, budget: 300, duration: '90 días',
    difficulty: 'BAJA', objective: 'Medir cambios en nubes y cobertura vegetal.',
    description: 'Un satélite de órbita baja para estudiar el clima y la superficie de nuestro planeta.', reward: 150,
  },
  {
    id: 'asteroid', name: 'Psyche Pathfinder', destination: 'Asteroides', category: 'Ciencia de asteroides',
    color: '#d6c6a2', bodyColor: 0x9a8b72, radius: 0.48, orbit: 13.2, budget: 760, duration: '3 años',
    difficulty: 'ALTA', objective: 'Estudiar la composición de un cuerpo metálico.',
    description: 'Una travesía interplanetaria para investigar los bloques de construcción del sistema solar.', reward: 500,
  },
  {
    id: 'jupiter', name: 'Europa Clipper', destination: 'Júpiter', category: 'Exploración planetaria',
    color: '#f0bd83', bodyColor: 0xc79a6f, radius: 1.45, orbit: 16.7, budget: 900, duration: '5 años',
    difficulty: 'ALTA', objective: 'Caracterizar la capa de hielo de Europa.',
    description: 'Un orbitador resistente a la radiación buscará indicios de habitabilidad en una luna oceánica.', reward: 650,
  },
  {
    id: 'sun', name: 'Solar Watch', destination: 'Sol', category: 'Heliofísica',
    color: '#ffd36e', bodyColor: 0xffc15c, radius: 0.54, orbit: 3.2, budget: 520, duration: '60 días',
    difficulty: 'MEDIA', objective: 'Observar actividad y eyecciones solares.',
    description: 'Una sonda de observación solar que debe gestionar con cuidado el calor y la comunicación.', reward: 320,
  },
];

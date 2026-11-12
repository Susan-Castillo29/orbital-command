export const ships = [
  { id: 'pioneer', name: 'Pioneer', className: 'Exploradora', description: 'Equilibrada para ciencia y navegación.' },
  { id: 'swift', name: 'Swift', className: 'Interceptor', description: 'Ligera y ágil, con alas compactas.' },
  { id: 'atlas', name: 'Atlas', className: 'Carguera', description: 'Casco robusto para misiones largas.' },
] as const;
export type ShipId = (typeof ships)[number]['id'];

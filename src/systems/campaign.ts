export const chapterOrder = ['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'europa', 'saturn', 'titan', 'uranus', 'neptune', 'sun'] as const;
export const chapterNames: Record<string, string> = {
  earth: 'HOME · EL PLANETA QUE NOS DIO VIDA', moon: 'ECHOES OF ORIGIN', mercury: 'THE EDGE OF FIRE',
  venus: 'THE HIDDEN WORLD', mars: 'THE RED FRONTIER', jupiter: 'GIANT OF THE SYSTEM',
  europa: 'OCEAN OF SECRETS', saturn: 'THE RINGED GIANT', titan: 'ANOTHER WORLD',
  uranus: 'THE DISTANT FRONTIER · URANO', neptune: 'THE DISTANT FRONTIER · NEPTUNO', sun: 'HEART OF THE SYSTEM',
};
export function chapterUnlocked(id: string, completed: string[]): boolean {
  if (completed.includes(id)) return true;
  if (id === 'asteroid') return completed.includes('moon');
  const index = chapterOrder.findIndex((chapter) => chapter === id);
  return index >= 0 && (index === 0 || completed.includes(chapterOrder[index - 1]));
}

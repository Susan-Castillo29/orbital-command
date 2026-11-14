/** The model permits surface recharge; non-surface orbital missions have no such facility. */
export function explorationFailureReason(resources: { integrity: number; energy: number }, mode: 'flight' | 'orbit' | 'surface', supportsSurface: boolean, completed: boolean): 'integrity' | 'energy' | null {
  if (completed) return null;
  if (resources.integrity <= 0) return 'integrity';
  if (mode === 'orbit' && !supportsSurface && resources.energy < 2) return 'energy';
  return null;
}

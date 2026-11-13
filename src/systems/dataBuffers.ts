export type DataKind = 'observations' | 'sensors' | 'telemetry';
export type DataBuffers = Record<DataKind, number>;
export const emptyDataBuffers = (): DataBuffers => ({ observations: 0, sensors: 0, telemetry: 0 });
export const totalBuffered = (buffers: DataBuffers) => buffers.observations + buffers.sensors + buffers.telemetry;
export function addBufferedData(buffers: DataBuffers, kind: DataKind, percentage: number): DataBuffers {
  if (!Number.isFinite(percentage) || percentage <= 0) return buffers;
  return { ...buffers, [kind]: buffers[kind] + Math.min(percentage, Math.max(0, 100 - totalBuffered(buffers))) };
}
export function transmitBufferedData(buffers: DataBuffers, kind: DataKind, percentageCapacity: number): DataBuffers {
  if (!Number.isFinite(percentageCapacity) || percentageCapacity <= 0) return buffers;
  return { ...buffers, [kind]: Math.max(0, buffers[kind] - percentageCapacity) };
}

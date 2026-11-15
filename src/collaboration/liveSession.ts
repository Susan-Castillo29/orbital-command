import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { cloudClient } from './client';
import { parseDesignSnapshot } from '../systems/designSnapshot';
import type { MissionDesign } from '../systems/engineering';
import type { ShipId } from '../data/ships';
import type { TransitState } from '../systems/transit';

export type LiveActivity = 'idle' | 'walk' | 'run' | 'interact' | 'aboard';
export type LivePose = { x: number; y: number; z: number; yaw: number; activity: LiveActivity; mode: 'system' | 'flight' | 'orbit' | 'surface' };
export type LiveWorldState = { missionId: string; screen: 'home' | 'mission' | 'engineering' | 'transit' | 'exploration'; updatedAt: number; routeUpdatedAt: number; shipId?: ShipId; design?: MissionDesign | null; arrival?: TransitState | null; transitState?: TransitState | null; transitStarted?: boolean; transitRate?: number };
export type LivePlayer = { userId: string; displayName: string; role: string; isHost: boolean; pose: LivePose; worldState: LiveWorldState | null };
export type LiveMessage = { id: string; userId: string; displayName: string; role: string; text: string; sentAt: number };
export type LiveSnapshot = { connected: boolean; teamId: string | null; selfId: string | null; hostId: string | null; players: LivePlayer[]; worldState: LiveWorldState | null; messages: LiveMessage[]; error: string };

const initialPose: LivePose = { x: 0, y: 0, z: 0, yaw: 0, activity: 'idle', mode: 'system' };
const empty: LiveSnapshot = { connected: false, teamId: null, selfId: null, hostId: null, players: [], worldState: null, messages: [], error: '' };
let snapshot = empty;
let channel: RealtimeChannel | null = null;
let connectionGeneration = 0;
let identity: Omit<LivePlayer, 'pose' | 'worldState'> | null = null;
let pose: LivePose = initialPose;
let worldState: LiveWorldState | null = null;
let lastPoseSent = 0;
let lastChatSent = 0;
const listeners = new Set<() => void>();
const missionIds = new Set(['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'europa', 'saturn', 'titan', 'uranus', 'neptune', 'sun', 'asteroid']);
const screens = new Set(['home', 'mission', 'engineering', 'transit', 'exploration']);

function publish(next: LiveSnapshot) { snapshot = next; listeners.forEach((listener) => listener()); }
export function getLiveSnapshot() { return snapshot; }
export function subscribeLiveSnapshot(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useLiveSession<T = LiveSnapshot>(select: (value: LiveSnapshot) => T = ((value) => value as unknown as T), equal: (left: T, right: T) => boolean = Object.is) {
  const selectRef = useRef(select); selectRef.current = select;
  const equalRef = useRef(equal); equalRef.current = equal;
  const [value, setValue] = useState(() => select(snapshot));
  useEffect(() => {
    const update = () => setValue((previous) => {
      const next = selectRef.current(snapshot);
      return equalRef.current(previous, next) ? previous : next;
    });
    const unsubscribe = subscribeLiveSnapshot(update);
    update();
    return unsubscribe;
  }, []);
  return value;
}

function validPose(value: unknown): value is LivePose {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LivePose>;
  return ['x', 'y', 'z', 'yaw'].every((key) => Number.isFinite(item[key as keyof LivePose]))
    && Math.abs(item.x!) <= 500 && Math.abs(item.y!) <= 500 && Math.abs(item.z!) <= 500
    && ['idle', 'walk', 'run', 'interact', 'aboard'].includes(String(item.activity))
    && ['system', 'flight', 'orbit', 'surface'].includes(String(item.mode));
}

function validWorld(value: unknown): value is LiveWorldState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<LiveWorldState>;
  if (typeof state.missionId !== 'string' || !missionIds.has(state.missionId)) return false;
  const validTransit = (candidate: unknown): candidate is TransitState | null => {
    if (candidate === null) return true;
    if (!candidate || typeof candidate !== 'object') return false;
    const transit = candidate as Partial<TransitState>;
    return ['elapsedDays', 'durationDays', 'distanceKm', 'fuel', 'energy', 'integrity', 'data'].every((key) => Number.isFinite(transit[key as keyof TransitState]))
      && Number(transit.elapsedDays) >= 0 && Number(transit.durationDays) > 0 && Number(transit.elapsedDays) <= Number(transit.durationDays)
      && ['fuel', 'energy', 'integrity', 'data'].every((key) => Number(transit[key as keyof TransitState]) >= 0 && Number(transit[key as keyof TransitState]) <= 100)
      && ['pending', 'required', 'resolved'].includes(String(transit.decision))
      && [null, 'fuel', 'energy'].includes(transit.choice ?? null);
  };
  const validDesign = state.design === undefined || state.design === null || parseDesignSnapshot(JSON.stringify({ version: 1, missionId: state.missionId, design: state.design }), state.missionId) !== null;
  return typeof state.screen === 'string' && screens.has(state.screen)
    && Number.isFinite(state.updatedAt) && Number.isFinite(state.routeUpdatedAt)
    && (state.shipId === undefined || ['pioneer', 'swift', 'atlas'].includes(state.shipId))
    && validDesign && (state.arrival === undefined || validTransit(state.arrival))
    && (state.transitState === undefined || validTransit(state.transitState))
    && (state.transitStarted === undefined || typeof state.transitStarted === 'boolean')
    && (state.transitRate === undefined || [0, 1, 10, 100, 1000].includes(state.transitRate));
}

function membersFromPresence() {
  if (!channel) return { players: [] as LivePlayer[], hostState: null as LiveWorldState | null };
  const state = channel.presenceState<Record<string, unknown>>();
  const players: LivePlayer[] = [];
  for (const values of Object.values(state)) {
    const meta = values[values.length - 1] as Record<string, unknown> | undefined;
    if (!meta || typeof meta.userId !== 'string' || typeof meta.displayName !== 'string' || typeof meta.role !== 'string' || typeof meta.isHost !== 'boolean' || !validPose(meta.pose)) continue;
    players.push({ userId: meta.userId, displayName: meta.displayName.slice(0, 48), role: meta.role, isHost: meta.isHost, pose: meta.pose, worldState: validWorld(meta.worldState) ? meta.worldState : null });
  }
  const hostState = players.find((player) => player.isHost)?.worldState ?? null;
  return { players: players.slice(0, 4), hostState };
}

async function trackPresence() {
  if (!channel || !identity) return;
  const result = await channel.track({ ...identity, pose, worldState });
  if (result !== 'ok' && snapshot.connected) publish({ ...snapshot, error: 'Realtime presence could not be updated.' });
}

export async function connectLiveTeam(input: { teamId: string; userId: string; displayName: string; role: string; hostId: string }) {
  const generation = ++connectionGeneration;
  const previous = channel;
  channel = null;
  identity = null;
  if (previous && cloudClient) await cloudClient.removeChannel(previous);
  if (generation !== connectionGeneration) return;
  if (!cloudClient) return;
  identity = { userId: input.userId, displayName: input.displayName.trim().slice(0, 48) || 'Explorer', role: input.role, isHost: input.hostId === input.userId };
  pose = initialPose;
  worldState = null;
  lastPoseSent = 0;
  const next = cloudClient.channel(`orbital-team:${input.teamId}`, { config: { private: true, presence: { key: input.userId } } });
  channel = next;
  publish({ ...empty, teamId: input.teamId, selfId: input.userId, hostId: input.hostId });
  next.on('presence', { event: 'sync' }, () => {
    const latest = membersFromPresence();
    if (latest.hostState && (!worldState || latest.hostState.updatedAt >= worldState.updatedAt)) worldState = latest.hostState;
    publish({ ...snapshot, players: latest.players, worldState });
  });
  next.on('broadcast', { event: 'world-state' }, ({ payload }) => {
    const candidate = (payload as { state?: unknown } | null)?.state;
    if (!validWorld(candidate)) return;
    const from = (payload as { senderId?: unknown } | null)?.senderId;
    if (from !== input.hostId) return;
    worldState = candidate;
    publish({ ...snapshot, worldState });
    void trackPresence();
  });
  next.on('broadcast', { event: 'team-chat' }, ({ payload }) => {
    const item = payload as Partial<LiveMessage> | null;
    if (!item || typeof item.id !== 'string' || typeof item.userId !== 'string' || typeof item.displayName !== 'string' || typeof item.role !== 'string' || typeof item.text !== 'string' || typeof item.sentAt !== 'number') return;
    if (item.text.length > 240 || Date.now() - item.sentAt > 5 * 60_000 || item.sentAt - Date.now() > 30_000) return;
    if (snapshot.messages.some((message) => message.id === item.id)) return;
    publish({ ...snapshot, messages: [...snapshot.messages, item as LiveMessage].slice(-40) });
  });
  next.subscribe((status, error) => {
    if (channel !== next || generation !== connectionGeneration) return;
    if (status === 'SUBSCRIBED') {
      publish({ ...snapshot, connected: true, error: '' });
      void trackPresence();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      publish({ ...snapshot, connected: false, error: error?.message ?? `Realtime ${status.toLowerCase()}.` });
    }
  });
}

export async function disconnectLiveTeam() {
  connectionGeneration += 1;
  const previous = channel;
  channel = null;
  identity = null;
  worldState = null;
  if (previous && cloudClient) await cloudClient.removeChannel(previous);
  publish(empty);
}

export function setLivePose(next: LivePose) {
  if (!validPose(next)) return;
  pose = next;
  const now = Date.now();
  if (now - lastPoseSent < 80) return;
  lastPoseSent = now;
  void trackPresence();
}

export function publishLiveWorldState(missionId: string, screen: LiveWorldState['screen'], options: { shipId?: ShipId; design?: MissionDesign | null; arrival?: TransitState | null } = {}) {
  if (!channel || !identity?.isHost || !missionIds.has(missionId)) return;
  const now = Date.now();
  worldState = { missionId, screen, updatedAt: now, routeUpdatedAt: now, shipId: options.shipId, design: ['transit', 'exploration'].includes(screen) ? options.design ?? null : null, arrival: options.arrival ?? null, transitState: null, transitStarted: false, transitRate: 0 };
  publish({ ...snapshot, worldState });
  void trackPresence();
  void channel.send({ type: 'broadcast', event: 'world-state', payload: { senderId: identity.userId, state: worldState } });
}

export function publishLiveTransit(state: TransitState, started: boolean, rate: number) {
  if (!channel || !identity?.isHost || !worldState || worldState.screen !== 'transit' || ![0, 1, 10, 100, 1000].includes(rate)) return;
  worldState = { ...worldState, updatedAt: Date.now(), transitState: state, transitStarted: started, transitRate: rate };
  publish({ ...snapshot, worldState });
  void channel.send({ type: 'broadcast', event: 'world-state', payload: { senderId: identity.userId, state: worldState } });
}

export function sendLiveMessage(text: string) {
  const clean = text.trim().replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').slice(0, 240);
  if (!channel || !identity || !snapshot.connected || !clean || Date.now() - lastChatSent < 500) return false;
  lastChatSent = Date.now();
  const message: LiveMessage = { id: crypto.randomUUID(), userId: identity.userId, displayName: identity.displayName, role: identity.role, text: clean, sentAt: Date.now() };
  publish({ ...snapshot, messages: [...snapshot.messages, message].slice(-40) });
  void channel.send({ type: 'broadcast', event: 'team-chat', payload: message });
  return true;
}


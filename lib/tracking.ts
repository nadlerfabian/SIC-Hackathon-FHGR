// App-owned contract, not an official Wisehockey Tier 3 schema.
export type TrackingEntity = { id: string; team: 'attack' | 'defence' | null; kind: 'skater' | 'goalie' | 'puck'; number: number; label: string };
export type Position = { entityId: string; x: number; y: number; z: number };
export type TrackingFrame = { timestamp: number; positions: Position[] };
export type TrackingClip = {
  version: 1; source: 'synthetic'; sampleHz: number; goalTimestamp: number;
  entities: TrackingEntity[]; frames: TrackingFrame[];
  moments: { timestamp: number; label: string }[];
};
export const MAX_TRACKING_GAP_MS = 250;

// Replace this adapter when the real signal schema is available. Milliseconds,
// metres, rink-centred x/y and stable entity IDs are the renderer's contract.
export function parseTracking(value: unknown): TrackingClip {
  const clip = value as TrackingClip;
  if (!clip || clip.version !== 1 || clip.source !== 'synthetic' || !Number.isFinite(clip.goalTimestamp) || !Number.isFinite(clip.sampleHz) || clip.sampleHz <= 0 || !Array.isArray(clip.entities) || !Array.isArray(clip.frames) || clip.frames.length < 2 || !Array.isArray(clip.moments)) throw new Error('Unsupported tracking format');
  const ids = new Set<string>();
  for (const e of clip.entities) {
    if (!e || typeof e.id !== 'string' || ids.has(e.id) || !['skater','goalie','puck'].includes(e.kind) || !['attack','defence',null].includes(e.team) || !Number.isInteger(e.number) || typeof e.label !== 'string') throw new Error('Invalid tracking entity');
    ids.add(e.id);
  }
  if (clip.entities.filter(e => e.kind === 'puck').length !== 1) throw new Error('Expected one puck');
  for (let i = 0; i < clip.frames.length; i++) {
    const f = clip.frames[i];
    if (!f || !Number.isFinite(f.timestamp) || (i > 0 && f.timestamp <= clip.frames[i-1].timestamp) || !Array.isArray(f.positions)) throw new Error('Unordered tracking samples');
    const seen = new Set<string>();
    for (const p of f.positions) {
      if (!p || !ids.has(p.entityId) || seen.has(p.entityId) || ![p.x,p.y,p.z].every(Number.isFinite) || Math.abs(p.x) > 30 || Math.abs(p.y) > 15 || p.z < 0) throw new Error('Invalid tracking position');
      seen.add(p.entityId);
    }
  }
  const start = clip.frames[0].timestamp, end = clip.frames.at(-1)!.timestamp;
  if (clip.goalTimestamp < start || clip.goalTimestamp > end || clip.moments.some(m => !m || !Number.isFinite(m.timestamp) || m.timestamp < start || m.timestamp > end || typeof m.label !== 'string')) throw new Error('Tracking event outside clip');
  return clip;
}

export function trackingAt(clip: TrackingClip, timestamp: number): Position[] | null {
  const frames = clip.frames;
  if (!Number.isFinite(timestamp) || timestamp < frames[0].timestamp || timestamp > frames.at(-1)!.timestamp) return null;
  let lo = 0, hi = frames.length - 1;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (frames[mid].timestamp <= timestamp) lo = mid; else hi = mid - 1; }
  const a = frames[lo];
  if (a.timestamp === timestamp) return a.positions;
  const b = frames[lo + 1];
  if (!b || b.timestamp - a.timestamp > MAX_TRACKING_GAP_MS) return null;
  const ratio = (timestamp - a.timestamp) / (b.timestamp - a.timestamp);
  const next = new Map(b.positions.map(p => [p.entityId, p]));
  return a.positions.flatMap(p => {
    const q = next.get(p.entityId);
    return q ? [{ entityId:p.entityId, x:p.x+(q.x-p.x)*ratio, y:p.y+(q.y-p.y)*ratio, z:p.z+(q.z-p.z)*ratio }] : [];
  });
}


export function alignTracking(clip: TrackingClip, goalTimestamp: number): TrackingClip {
  if (!Number.isFinite(goalTimestamp)) throw new Error('Invalid event timestamp');
  const offset = goalTimestamp - clip.goalTimestamp;
  return { ...clip, goalTimestamp, frames:clip.frames.map(f => ({...f,timestamp:f.timestamp+offset})), moments:clip.moments.map(m => ({...m,timestamp:m.timestamp+offset})) };
}

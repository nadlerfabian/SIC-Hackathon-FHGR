import { useId } from 'react';
export type RinkMarker = { id: string; x: number; y: number; number: number; color: string; name?: string; highlighted?: boolean };
// Original SVG rink. Coordinates use meters with (0,0) at center ice.
// Markers can be driven by event snapshots in a later feature.
export default function HockeyRink({ markers = [], className = '', children, onSelect, selectedId }: { markers?: RinkMarker[]; className?: string; children?: React.ReactNode; onSelect?: (id: string) => void; selectedId?: string }) {
  const id = useId();
  return <svg className={className} viewBox="0 0 640 340" role={onSelect ? 'group' : 'img'} aria-label="Bird’s-eye view of a hockey rink">
    <defs><linearGradient id={id} x2="1" y2="1"><stop stopColor="#f7fffe"/><stop offset="1" stopColor="#b7dedb"/></linearGradient></defs>
    <rect x="20" y="20" width="600" height="300" rx="85" fill={'url(#' + id + ')'} stroke="#fff" strokeWidth="5"/>
    <g fill="none" strokeWidth="2" opacity=".65">
      <path d="M320 21V319" stroke="#cb646a" strokeDasharray="7 4"/>
      <path d="M220 21V319M420 21V319" stroke="#568cba" strokeWidth="5"/>
      <path d="M80 50V290M560 50V290" stroke="#c3636b"/>
      <circle cx="320" cy="170" r="44" stroke="#568cba"/>
      {[125,515].flatMap(x => [95,245].map(y => <circle key={x + '-' + y} cx={x} cy={y} r="40" stroke="#c3636b"/>))}
      <path d="M80 147a25 25 0 0 1 0 46M560 147a25 25 0 0 0 0 46" fill="#8cc5dd" stroke="#c3636b"/>
      <path d="M80 155H66V185H80M560 155H574V185H560" stroke="#c3636b"/>
    </g>
    <g fill="#c3636b">{[125,515].flatMap(x => [95,245].map(y => <circle key={x + '-' + y} cx={x} cy={y} r="3"/>))}</g>
    <circle cx="320" cy="170" r="5" fill="#568cba"/>
    {children}
    {markers.map(p => <g key={p.id} transform={'translate(' + (320 + p.x * 10) + ' ' + (170 - p.y * 10) + ')'} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} aria-label={onSelect ? 'Inspect ' + (p.name || 'player') + ', number ' + p.number : undefined} onClick={() => onSelect?.(p.id)} onKeyDown={event => {if (onSelect && ['Enter',' '].includes(event.key)) {event.preventDefault(); onSelect(p.id);}}} style={onSelect ? {cursor:'pointer'} : undefined}>{(p.highlighted || p.id === selectedId) && <circle r="18" fill="none" stroke={p.id === selectedId ? '#071d39' : '#d44651'} strokeWidth="3"/>}<circle r="21" fill="transparent"/><circle r="12" fill={p.color} stroke="white" strokeWidth="2"/><text textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#102b31" pointerEvents="none">{p.number}</text></g>)}
  </svg>;
}

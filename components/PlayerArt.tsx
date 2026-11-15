'use client';
import { useId, useState } from 'react';
import type { Player, Team } from '@/lib/game';
export function Jersey({ team, number, className = '' }: { team: Team; number?: number; className?: string }) {
  const id = useId(); const davos = team === 'davos';
  return <svg viewBox="0 0 160 170" className={'jersey ' + className} aria-hidden="true">
    <defs><linearGradient id={id} x2=".9" y2="1"><stop stopColor={davos ? '#1656a1' : '#f0f5ff'}/><stop offset="1" stopColor={davos ? '#062650' : '#a8c5eb'}/></linearGradient></defs>
    <path d="M52 15 30 25 7 62 33 79 44 61 39 152Q80 169 121 152L116 61 127 79 153 62 130 25 108 15Q80 29 52 15Z" fill={'url(#' + id + ')'} stroke={davos ? '#bb8e25' : '#789bbd'} strokeWidth="2"/>
    <path d="M52 15Q80 62 108 15L96 13Q80 28 64 13Z" fill={davos ? '#ffdf00' : '#173858'}/>
    <path d="M40 125H120V137H40ZM17 45 40 60 34 70 11 55ZM143 45 120 60 126 70 149 55Z" fill={davos ? '#ffdf00' : '#ba3c4b'}/>
    <path d="M41 140H119V145H41Z" fill={davos ? '#ffdf00' : '#173858'}/>
    <text x="80" y={davos ? 49 : 65} textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="2" fill={davos ? '#ffdf00' : '#173858'}>{davos ? 'HC DAVOS' : 'COLLEGIATE'}</text>
    {davos && <image href="/brand/hc-davos.svg" x={number ? 65 : 54} y={number ? 55 : 60} width={number ? 30 : 52} height={number ? 30 : 52}/>}
    {(number !== undefined || !davos) && <text x="80" y={davos ? 119 : 110} textAnchor="middle" fontSize={davos ? 31 : 43} fontWeight="900" fill={davos ? '#ffdf00' : '#173858'}>{number ?? 'US'}</text>}
    <path d="M46 60 44 120M114 60 116 120" fill="none" stroke="#163c57" opacity=".12"/>
  </svg>;
}
export function PlayerArt({ player, large = false }: { player: Player; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={'player-art ' + player.team + (large ? ' large' : '')}>
    {player.photo && !failed ? <img src={player.photo} alt={player.name} onError={() => setFailed(true)} /> : <Jersey team={player.team} number={player.jersey}/>}
    {large && player.photo && !failed && <span className="portrait-jersey"><Jersey team={player.team} number={player.jersey}/></span>}
  </div>;
}

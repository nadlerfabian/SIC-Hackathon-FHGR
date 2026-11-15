import Link from 'next/link';
export type Section = 'home' | 'picks' | 'stats' | 'progress';
export function NavIcon({ name }: { name: Section }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name === 'home' ? <><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></> : name === 'picks' ? <><path d="M8 3h8v5c0 6-8 6-8 0Z M8 5H4v3c0 3 4 3 4 3m8-6h4v3c0 3-4 3-4 3M12 13v7m-4 0h8"/></> : name === 'stats' ? <><path d="M4 20V10m8 10V4m8 16v-7M2 20h20"/><path d="m3 6 5-3 7 5 6-6"/></> : <><path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/></>}</svg>;
}
export default function SiteNav({ section, mobile = false }: { section: Section; mobile?: boolean }) {
  return <nav className={mobile ? 'mobile-nav' : 'desktop-nav'} aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>{([['home', '/', 'Home'], ['picks', '/picks', 'Picks'], ['stats', '/stats', 'Match centre'], ['progress', '/progress', 'My progress']] as const).map(([id, href, label]) => <Link key={id} href={href} className={section === id ? 'current' : ''} aria-current={section === id ? 'page' : undefined}><NavIcon name={id}/><span>{label}</span></Link>)}</nav>;
}

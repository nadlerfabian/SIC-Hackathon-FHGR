'use client';
import { useEffect, useRef, useState } from 'react';
import { ROUNDS, STAGES, TEAMS, emptyGame, restoreGame, roundStatus, formatValue, visibleStats, type MatchView, type Player, type Round, type RoundId, type SavedGame, type Team, type Values } from '@/lib/game';
import { Jersey, PlayerArt } from './PlayerArt';
import HockeyRink from './HockeyRink';
import Link from 'next/link';
import SiteNav, { NavIcon, type Section } from './SiteNav';
import MatchCentre from './MatchCentre';
import MyProgress from './MyProgress';
import ResponsiveDisclosure from './ResponsiveDisclosure';

const STORAGE = 'spengler-picks-2025-final-v1';
function Arrow({ back = false }: { back?: boolean }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={back ? { transform: 'rotate(180deg)' } : undefined}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function Check() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function tally(round: Round, game: SavedGame, view: MatchView) {
  return game.submitted[round.id] ? round.questions.reduce((sum, q) => sum + (view.results[q.id]?.find(r => r.playerId === game.picks[q.id])?.points || 0), 0) : 0;
}
function playerStats(player: Player, view: MatchView, period: string): Values | null {
  return visibleStats(view, player.id, period);
}
function Modal({ children, title, close, wide = false }: { children: React.ReactNode; title: string; close: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); const before = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = before; dialog?.close(); }; }, []);
  return <dialog ref={ref} className={'modal ' + (wide ? 'wide' : '')} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} aria-label={title}>
    <div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="Close dialog">×</button></div>{children}
  </dialog>;
}
export default function PicksApp({ initialView, section = 'home' }: { initialView: MatchView; section?: Section }) {
  const [game, setGame] = useState<SavedGame>(emptyGame);
  const [view, setView] = useState(initialView);
  const [ready, setReady] = useState(false); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); const [storageError, setStorageError] = useState(false);
  const [active, setActive] = useState<RoundId | null>(null); const [index, setIndex] = useState(0);
  const [review, setReview] = useState(false); const [picker, setPicker] = useState(false);
  const [team, setTeam] = useState<'all' | Team>('all'); const [search, setSearch] = useState('');
  const [statsPeriod, setStatsPeriod] = useState('all'); const [help, setHelp] = useState(false);
  const [demo, setDemo] = useState(false); const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<'advance' | 'reset' | null>(null);
  const round = ROUNDS.find(r => r.id === active); const q = round?.questions[index];
  const selected = view.players.find(p => p.id === (q && game.picks[q.id]));
  const status = round ? roundStatus(round, game.stage) : null;
  const total = ROUNDS.reduce((sum, r) => sum + tally(r, game, view), 0);
  useEffect(() => {
    try { setGame(restoreGame(localStorage.getItem(STORAGE), initialView.players.map(p => p.id))); } catch { setStorageError(true); }
    setReady(true);
  }, [initialView]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE, JSON.stringify(game)); } catch { setStorageError(true); }
  }, [game, ready]);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController(); setLoading(true); setError('');
    fetch('/api/match?stage=' + game.stage, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Unable to load match data.');
      setView(await response.json());
    }).catch(error => { if (error.name !== 'AbortError') setError('Match data could not be loaded. Check the local server and try again.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [game.stage, ready]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);
  function openRound(r: Round) { setActive(r.id); setIndex(0); setReview(Boolean(game.submitted[r.id]) || roundStatus(r, game.stage) !== 'open'); setStatsPeriod('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function choose(player: Player) {
    if (!q || !round || roundStatus(round, game.stage) !== 'open') return;
    setGame(old => ({ ...old, picks: { ...old.picks, [q.id]: player.id }, submitted: { ...old.submitted, [round.id]: false } })); setPicker(false);
  }
  function submit() {
    if (!round || status !== 'open' || !round.questions.every(q => game.picks[q.id])) return;
    setGame(old => ({ ...old, submitted: { ...old.submitted, [round.id]: true } }));
    setActive(null); setNotice(round.short + ' picks saved. You can edit them until puck drop.');
  }
  function advance() {
    const incomplete = ROUNDS.filter(r => roundStatus(r, game.stage) === 'open' && !game.submitted[r.id]);
    if (incomplete.length) { setConfirmation('advance'); return; }
    advanceStage();
  }
  function advanceStage() {
    setConfirmation(null);
    setGame(old => ({ ...old, stage: Math.min(6, old.stage + 1) })); setActive(null); setNotice('Demo advanced: ' + STAGES[Math.min(6, game.stage + 1)]);
  }
  function reset() {
    setConfirmation('reset');
  }
  function resetGame() {
    setConfirmation(null); setGame(emptyGame()); setActive(null); setView(initialView); setNotice('Fresh ice. Your demo has been reset.');
  }
  const openRounds = ROUNDS.filter(r => roundStatus(r, game.stage) === 'open');
  const nextRound = openRounds.find(r => !game.submitted[r.id]) || openRounds[0];
  const selectedCount = round?.questions.filter(q => game.picks[q.id]).length || 0;
  const filtered = view.players.filter(p => (team === 'all' || p.team === team) && (p.name + ' ' + p.jersey + ' ' + p.position).toLowerCase().includes(search.toLowerCase()));
  return <div className={'app-shell section-' + (active ? 'picks' : section) + (section === 'home' && !active ? ' home-page' : '')}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="topbar">
      <Link href="/" className="brand davos-brand" aria-label="Spengler Picks home"><img className="club-crest" src="/brand/hc-davos.svg" alt="HC Davos" width="48" height="48"/><span className="brand-divider"/><span className="cup-brand"><img src="/brand/spengler-cup.svg" alt="Spengler Cup Davos" width="135" height="50"/><span>FAN CHALLENGE <b>PICKS</b></span></span></Link>
      <SiteNav section={active ? 'picks' : section}/>
      <div className="topbar-actions"><button className="help-button" onClick={() => setHelp(true)}>How to play <span>?</span></button><span className="points-pill"><span className="points-star">✦</span> {total}<small>PTS</small></span></div>
    </header>
    <main id="main-content">
      {storageError && <p className="error-banner">Device storage is unavailable. Picks will last only while this page stays open.</p>}
      {error && <p className="error-banner" role="alert">{error} <button onClick={() => window.location.reload()}>Retry</button></p>}
      {section === 'stats' ? <MatchCentre view={view}/> : section === 'progress' ? <MyProgress game={game} view={view}/> : !active ? <>
        {section === 'home' ? <section className="hero">
          <svg className="alpine-backdrop" viewBox="0 0 1200 450" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 340 110 175 180 260 330 50 420 190 525 110 660 290 790 70 905 220 1000 130 1200 350V450H0Z" fill="#193b62"/><path d="m180 260 150-210 90 140-70-45-25 15-25-36ZM660 290 790 70l115 150-95-75-20 23-25-38Z" fill="#497092"/><path d="M0 390 220 300 360 350 540 245 750 380 960 275 1200 380V450H0Z" fill="#092441"/></svg>
          <div className="hero-copy"><div className="eyebrow"><span className="tiny-line"/> SPENGLER CUP DAVOS · FAN CHALLENGE</div><h1>More than<br/>a <em>game.</em></h1><p>From the heart of Davos. To your game.<br/>Back your players. Feel every period.</p>
            {nextRound ? <button className="button lime" disabled={!ready || loading || !!error} onClick={() => openRound(nextRound)}>{game.submitted[nextRound.id] ? 'Review your picks' : 'Make your picks'}<Arrow/></button> : <Link className="button lime" href="/picks">{game.stage === 6 ? 'See your results' : 'View your predictions'}<Arrow/></Link>}
          </div>
          <div className="hero-match"><span className="davos-script">Davos lebt Eishockey.</span><div className="match-card">
            <div className="match-card-top"><span className="label">THE FINAL · 31 DEC 2025</span><span className={'match-state ' + (game.stage % 2 ? 'live' : '')}><i/>{STAGES[game.stage]}</span></div>
            <div className="match-teams"><div><Jersey team="davos"/><h2>HC Davos</h2><span>DAV</span></div><div className="versus">{view.availablePeriods ? <><strong>{view.scores[0]}<span>:</span>{view.scores[1]}</strong><small>{game.stage === 6 ? 'FINAL SCORE' : 'COMPLETED PERIODS'}</small></> : <><strong>VS</strong><small>DAVOS, SWITZERLAND</small></>}</div><div><Jersey team="us"/><h2>U.S. Collegiate<br/>Selects</h2><span>USCS</span></div></div>
            <div className="match-card-bottom"><span><span className="small-dot"/> Historical match replay</span><span>40 skaters · 2 teams</span></div>
            <HockeyRink className="hero-rink"/>
          </div></div>
          <div className="heritage-band"><span><i/> DAVOS, SCHWEIZ</span><span>26—31 DEZEMBER</span><span>TRADITION SEIT <b>1923</b></span></div>
        </section> : <div className="page-intro"><span className="eyebrow muted">TRUST YOUR HOCKEY INSTINCT</span><h1>Your <em>picks.</em></h1><p>Four rounds. Four chances to read the game.</p></div>}
        {section === 'home' && <div className="home-destinations">{([['picks','/picks','Make your call','14 picks. Every period matters.'],['stats','/stats','Inside the match','Player stats and the story of each goal.'],['progress','/progress','Your next milestone','Follow your score. Unlock your badges.']] as const).map(([id,href,title,copy]) => <Link href={href} key={id}><span className="destination-icon"><NavIcon name={id}/></span><div><h3>{title}</h3><p>{copy}</p></div><span>↗</span></Link>)}</div>}
        <section className="rounds-section" aria-label="Prediction rounds">
          <div className="section-heading"><div><span className="eyebrow muted">FOUR ROUNDS. YOUR CALL.</span><h2>Make every period count.</h2></div><span className="subtle">14 picks · up to 950 points</span></div>
          <div className="round-grid">{ROUNDS.map((r, i) => {
            const s = roundStatus(r, game.stage); const count = r.questions.filter(q => game.picks[q.id]).length; const submitted = game.submitted[r.id];
            return <button key={r.id} className={'round-card ' + s + (i === 0 ? ' featured' : '')} onClick={() => openRound(r)} disabled={!ready || loading || !!error}>
              <div className="round-card-top"><span className="round-number">{String(i + 1).padStart(2, '0')}</span><span className={'status-tag ' + s}>{s === 'open' ? submitted ? 'Picks saved' : 'Open for picks' : s === 'complete' ? 'Results ready' : s === 'locked' ? 'Locked' : 'Coming up'}</span></div>
              <h3>{r.short}</h3><p>{r.scope ? 'Only this period counts.' : 'Back your instincts for the whole game.'}</p>
              <div className="round-meta"><span>{r.questions.length} questions</span><span>{r.questions.length * r.points} pts available</span></div>
              <div className="round-card-bottom"><span>{s === 'complete' ? tally(r, game, view) + ' points earned' : s === 'open' ? submitted ? 'Review your picks' : count ? count + '/' + r.questions.length + ' selected · Continue' : 'Start this round' : s === 'locked' ? 'View your picks' : 'Preview questions'}</span>{submitted && s === 'open' ? <Check/> : <Arrow/>}</div>
            </button>;
          })}</div>
        </section>
        <section className="how-strip"><div className="how-title"><span>↗</span><h3>A feel for the game.<br/>A score to prove it.</h3></div><div><b>01</b><p><strong>Pick your players</strong><span>Either team. One skater per question.</span></p></div><div><b>02</b><p><strong>Follow the match</strong><span>Fresh stats after every period.</span></p></div><div><b>03</b><p><strong>See how you did</strong><span>Points for first, second, and third.</span></p></div></section>
      </> : round && <section className="play-section">
        <button className="back-link" onClick={() => setActive(null)}><Arrow back/> All rounds</button>
        <label className="compact-select round-switcher">Switch round<select aria-label="Switch prediction round" value={round.id} onChange={e=>openRound(ROUNDS.find(r=>r.id===e.target.value)!)}>{ROUNDS.map(r=><option key={r.id} value={r.id}>{r.short} · {roundStatus(r,game.stage)==='complete'?'Results ready':roundStatus(r,game.stage)==='open'?'Open':'Locked'}</option>)}</select></label>
        <div className="play-header"><div><span className="eyebrow muted">{round.scope ? 'PREDICT PERIOD ' + round.scope : 'PREDICT THE WHOLE MATCH'}</span><h1>{round.title}<span className="lime-text">.</span></h1></div><span className={'status-tag ' + status}>{status === 'open' ? game.submitted[round.id] ? 'Picks saved · editable' : 'Open for picks' : status === 'complete' ? 'Results ready' : status === 'locked' ? 'Picks locked' : 'Not open yet'}</span></div>
        {status === 'upcoming' && <p className="info-note">This round opens after period {round.scope - 1}. You can preview the questions now.</p>}
        {status === 'locked' && <p className="info-note">Your picks are locked. Results arrive {round.scope ? 'at the end of this period' : 'after the final whistle'}.</p>}
        {review ? <>
          <div className="review-heading"><h2>{status === 'complete' ? 'The results are in.' : 'Your predictions'}</h2><span>{status === 'complete' ? tally(round, game, view) + ' / ' + round.questions.length * round.points + ' pts' : selectedCount + ' / ' + round.questions.length + ' selected'}</span></div>
          {status === 'complete' && !game.submitted[round.id] && <p className="info-note">You didn’t submit this round before it locked. You can explore the results; this round earns no points.</p>}
          <div className="review-list">{round.questions.map((question, qi) => {
            const p = view.players.find(p => p.id === game.picks[question.id]); const result = view.results[question.id]?.find(r => r.playerId === p?.id); const leaders = view.results[question.id]?.filter(r => r.rank && r.rank <= 3) || [];
            return <ResponsiveDisclosure key={question.id} className="review-disclosure" title={question.title} meta={status === 'complete' ? '+' + (game.submitted[round.id] ? result?.points || 0 : 0) + ' pts' : p?.name || 'No player selected'}><article className="review-card"><div className="review-question"><span className="question-number">{String(qi + 1).padStart(2, '0')}</span><h3>{question.title}</h3>{status === 'open' && <button className="text-button" onClick={() => { setIndex(qi); setReview(false); }}>Edit</button>}</div>
              <div className="review-pick">{p ? <><PlayerArt player={p}/><div><span className="label">YOUR PICK</span><strong>{p.name}</strong><span>{TEAMS[p.team].short} · #{p.jersey} · {p.position}</span></div></> : <span className="subtle">No player selected</span>}{status === 'complete' && <div className="earned"><strong>+{game.submitted[round.id] ? result?.points || 0 : 0}</strong><span>{result ? result.rank ? 'Rank ' + result.rank + ' · ' + formatValue(question.metric, result.value) : 'No recorded contribution' : 'No pick'}</span></div>}</div>
              {status === 'complete' && <details className="leader-details"><summary>See the leading players</summary><ol>{leaders.map(entry => { const player = view.players.find(p => p.id === entry.playerId)!; return <li key={entry.playerId}><span className="leader-rank">{entry.rank}</span><span>{player.name}<small>{TEAMS[player.team].short} · #{player.jersey}</small></span><strong>{formatValue(question.metric, entry.value)}</strong></li>; })}</ol>{question.metric === 'passSpeed' && <p>Pass-speed units are not verified. Rankings use the source values.</p>}</details>}
            {status === 'open' && <button className="text-button mobile-review-edit" onClick={() => {setIndex(qi);setReview(false);}}>Change player</button>}</article></ResponsiveDisclosure>;
          })}</div>
          {status === 'open' && <div className="review-actions"><p>Editable until {round.scope ? 'period ' + round.scope + ' begins' : 'the game begins'}. Same player across questions? Absolutely.</p><button className="button lime" disabled={selectedCount !== round.questions.length || loading} onClick={submit}>{game.submitted[round.id] ? 'Save & return' : 'Submit ' + round.questions.length + ' picks'}<Check/></button>{selectedCount !== round.questions.length && <span className="subtle">Select a player for every question to submit.</span>}</div>}
        </> : q && <div className="question-layout"><div className="question-main">
          <div className="question-progress"><span>QUESTION {index + 1} OF {round.questions.length}</span><div>{round.questions.map((question, qi) => <button key={question.id} aria-label={'Go to question ' + (qi + 1)} aria-current={qi === index ? 'step' : undefined} className={(qi === index ? 'current ' : '') + (game.picks[question.id] ? 'answered' : '')} onClick={() => setIndex(qi)}/>)}</div></div>
          <article className="question-card"><div className="question-card-top"><span className="metric-tag">{q.tag}</span><span className="question-points">✦ {round.points} pts for 1st</span></div><h2>{q.title}</h2><p>{q.description}</p><div className="scope-label">{round.scope ? 'PERIOD ' + round.scope + ' ONLY' : 'FULL MATCH · ALL THREE PERIODS'}</div>
            <button className={'selection-area ' + (selected ? 'has-player' : '')} disabled={status !== 'open' || loading || !!error} onClick={() => { setSearch(''); setPicker(true); }} aria-label={selected ? 'Change selected player ' + selected.name : 'Choose a player'}>
              {selected ? <><PlayerArt player={selected} large/><div className="selection-copy"><span className="label">YOUR PICK</span><h3>{selected.firstName}<br/><strong>{selected.lastName}</strong></h3><span>{TEAMS[selected.team].short} · #{selected.jersey} · {selected.position}</span><span className="change-player">Change player <Arrow/></span></div><span className="selected-check"><Check/></span></> : <><div className="empty-jerseys"><Jersey team="davos" number={19}/><span>+</span><Jersey team="us" number={13}/></div><strong>Who’s your pick?</strong><span>Choose from 40 skaters across both teams.</span><span className="choose-link">Choose a player <Arrow/></span></>}
            </button>
          </article>
          <div className="question-nav"><button className="button ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}><Arrow back/> Back</button><button className="button lime" onClick={() => index === round.questions.length - 1 ? setReview(true) : setIndex(index + 1)}>{index === round.questions.length - 1 ? 'Review picks' : selected ? 'Next question' : 'Skip for now'}<Arrow/></button></div>
        </div><aside className="question-aside"><div className="aside-card"><span className="eyebrow muted">A LITTLE HELP</span><h3>Trust your read.</h3><p>You don’t need to know every player. Explore both teams and start with a position.</p><div className="position-tip"><b>F</b><p><strong>Forwards</strong><span>Usually focus on creating chances and scoring goals.</span></p></div><div className="position-tip"><b>D</b><p><strong>Defense</strong><span>Often play longer minutes and help stop opponent attacks.</span></p></div><p className="aside-note">Any skater can surprise you. These are roles, not guarantees.</p></div><div className="scoring-card"><h3>Close counts, too.</h3><div>{[1, .6, .3].map((factor, i) => <span key={factor}><small>{['1ST', '2ND', '3RD'][i]}</small><strong>{round.points * factor}</strong><small>POINTS</small></span>)}</div><p>Ties share points. Zero contributions earn zero.</p></div></aside></div>}
      </section>}
      <section className="demo-panel"><button className="demo-toggle" aria-expanded={demo} onClick={() => setDemo(!demo)}><span><span className="demo-badge">DEMO</span> Match controls</span><span>{STAGES[game.stage]} <span className="demo-chevron">{demo ? '−' : '+'}</span></span></button>{demo && <div className="demo-content"><p>Replay the 2025 final. Advance through each period to lock picks, reveal results, and open the next round. This is recorded data, not a live feed.</p><div className="stage-track">{STAGES.map((s, i) => <span title={s} key={s} className={i <= game.stage ? 'passed' : ''}/>)}</div><div className="demo-buttons"><button className="text-button" onClick={reset}>Reset demo</button><button className="button small lime" disabled={game.stage === 6 || loading || !ready || !!error} onClick={advance}>{game.stage === 6 ? 'Match complete' : ['Start period 1', 'End period 1', 'Start period 2', 'End period 2', 'Start period 3', 'End match'][game.stage]}<Arrow/></button></div></div>}</section>
    </main>
    <footer><span>SPENGLER PICKS<span className="lime-text">.</span></span><p>FHGR Team 2 · Data-hack prototype</p><button className="text-button" onClick={() => setHelp(true)}>Rules & data</button></footer>
    <SiteNav section={active ? 'picks' : section} mobile/>
    {notice && <div className="toast" role="status"><Check/>{notice}</div>}
    {confirmation && <Modal title={confirmation === 'reset' ? 'Start fresh?' : 'Leave picks unsubmitted?'} close={() => setConfirmation(null)}><div className="rules-content"><p>{confirmation === 'reset' ? 'This resets the match and clears your picks and points on this device.' : 'Some open rounds have not been submitted. Advancing locks those rounds and they will earn no points.'}</p><div className="confirmation-actions"><button className="button cancel" onClick={() => setConfirmation(null)}>Keep playing</button><button className="button lime" onClick={confirmation === 'reset' ? resetGame : advanceStage}>{confirmation === 'reset' ? 'Reset picks & match' : 'Advance anyway'}<Arrow/></button></div></div></Modal>}
    {picker && round && q && <Modal title="Choose your player" wide close={() => setPicker(false)}><div className="picker-intro"><span className="label">{round.short} · {q.tag}</span><p>{q.title}</p></div><div className="picker-tools"><label className="search-field"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.8"/><path d="m15 15 5 5" stroke="currentColor" strokeWidth="1.8"/></svg><input autoFocus placeholder="Search name, number, or position" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search players"/></label><div className="team-filters">{(['all', 'davos', 'us'] as const).map(t => <button key={t} aria-pressed={team === t} className={team === t ? 'active' : ''} onClick={() => setTeam(t)}>{t === 'all' ? 'Both teams' : t === 'davos' ? 'HC Davos' : 'U.S. Selects'}</button>)}</div>{view.availablePeriods > 0 ? <label className="stats-selector">Showing completed stats <select value={statsPeriod} onChange={e => setStatsPeriod(e.target.value)}><option value="all">All completed periods</option>{Array.from({ length: view.availablePeriods }, (_, i) => <option key={i} value={i + 1}>Period {i + 1}</option>)}</select></label> : <p className="picker-note">A clean slate. Player stats arrive after period 1.</p>}</div><div className="player-list"><div className="list-label"><span>{filtered.length} SKATERS</span><span>GOALKEEPERS EXCLUDED</span></div>{filtered.length ? filtered.map(player => {
      const stats = playerStats(player, view, statsPeriod); const chosen = game.picks[q.id] === player.id;
      return <button className={'player-row ' + (chosen ? 'chosen' : '')} key={player.id} onClick={() => choose(player)} aria-label={'Select ' + player.name + ', ' + TEAMS[player.team].name + ', number ' + player.jersey} aria-pressed={chosen}><PlayerArt player={player}/><div className="player-row-info"><strong>{player.name}</strong><span><i className={'team-dot ' + player.team}/>{TEAMS[player.team].short} · #{player.jersey} · {player.position}</span>{stats && <div className="player-mini-stats"><span>{stats.goals} G</span><span>{stats.assists} A</span><span>{formatValue('iceTime', stats.iceTime)} TOI</span><span>{formatValue(q.metric, stats[q.metric])} <small>{q.tag}</small></span></div>}</div><span className="select-circle">{chosen ? <Check/> : '+'}</span></button>;
    }) : <div className="empty-list"><strong>No skaters found.</strong><p>Try another name, jersey number, or team.</p><button className="text-button" onClick={() => { setSearch(''); setTeam('all'); }}>Clear filters</button></div>}</div></Modal>}
    {help && <Modal title="The game plan" close={() => setHelp(false)}><div className="rules-content"><p>Pick one skater for each question. Choose from either team and use the same player more than once.</p><h3>Four rounds</h3><p>Five picks cover the whole match. Three fresh picks before each period cover only that period. Submit all picks in a round before it starts; you can edit and resubmit until then.</p><table><thead><tr><th>Finish</th><th>Match</th><th>Period</th></tr></thead><tbody>{[['1st',100,50],['2nd',60,30],['3rd',30,15]].map(row => <tr key={row[0]}>{row.map((v, i) => <td key={i}>{v}</td>)}</tr>)}</tbody></table><p>Ties share ranks and points: 1st, 1st, 3rd. A zero contribution earns zero points. Players with no valid measurement earn none.</p><h3>Stats without spoilers</h3><p>Before puck drop, see names, teams, and positions. After each period, explore only completed-period stats. Results reveal when the relevant round ends.</p><h3>About this prototype</h3><p>Recorded Wisehockey data from the 31 December 2025 final. Picks and demo progress stay on this device. There is no online leaderboard or live feed.</p><p>Pass-speed units have not been verified; those results display source units. Team jerseys are original illustrations. Portraits are shown where available.</p><p className="source-links">Positions: <a href="https://hockeycanada.ca/en-ca/team-canada/men/national/2025-26/spengler-cup/stats/team-rosters/152" target="_blank" rel="noreferrer">HC Davos roster ↗</a> · <a href="https://www.hockeycanada.ca/team-canada/men/national/2025-26/spengler-cup/stats/team-rosters/1262?teamid=1262" target="_blank" rel="noreferrer">U.S. Selects roster ↗</a></p></div></Modal>}
  </div>;
}

# Spengler Cup Data-hack Sport Innovation Challenge 2026

Team Members: Silvan Joos, Fabian Nadler, Jann Rudolph, Lars Cools
2026 @ FHGR

## Spengler Picks prototype

Mobile-first Next.js 16 / React 19 / TypeScript prototype using the supplied
31 December 2025 HC Davos vs. U.S. Collegiate Selects match files.

### Run locally

The match dataset is not included in this repository. Place your authorized
copy of the 31 December 2025 Wisehockey match events CSV and the All, P1, P2,
and P3 match statistics CSVs in a local `data/` folder before starting the app
or running the match data tests. Keep the original filenames.

Use Node.js 24 and pnpm. From this repository:

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000. The server binds only to this computer by default.

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

### Try the complete flow

1. Submit the five pre-match picks and the three period-1 picks.
2. Expand **Demo / Match controls** at the bottom of the page.
3. Start period 1 to lock both rounds. End it to reveal period-1 results.
4. Make period-2 picks using period-1 statistics. Repeat for period 3.
5. End the match to reveal match results and the total score.

The demo advances forward only. Reset clears this prototype's picks and progress
on the current device after confirmation. Drafts are saved, but only fully
submitted rounds score. Editing a pick requires resubmitting that round.

### Rules

- One skater per question; either team; duplicates across questions are allowed.
- Five match questions award 100 / 60 / 30 points for 1st / 2nd / 3rd.
- Three questions per period award 50 / 30 / 15 points.
- Competition ranking handles ties: 1st, 1st, 3rd. Zero contributions earn zero.
- Match picks and period-1 picks lock together. Later rounds open at intermission.
- Only completed-period statistics appear in the player picker.
- No authentication, shared leaderboard, live integration, or betting.

### Data and limitations

`lib/match-data.ts` reads the full 114-column event CSV and the four 97-column
statistics CSVs directly. Original data files are never modified. Event-derived
goals and assists are reconciled against full-game totals on load.

The period statistics exports repeat full-game G, A, P, and PIM values. Period
goals and assists therefore come from timestamped events instead. Small differences
between summed period TOI/distance and full-game totals appear consistent with
rounding. Full-game rankings use the dedicated full-game export.

Fastest-pass questions rank each skater's fastest **successful** pass. PassSpeed
units have not been verified, so the UI explicitly uses source units. No conversion
is guessed. Missing measurements do not earn points.

The local API returns stats and results for the requested demo stage. The stage is
user-controlled for demonstration; it is not an anti-cheating system. A production
competition needs authoritative server time, protected submissions, and scoring.

Match data is confidential challenge material. Keep the prototype and its data
within the registered team; deployment is not configured. Raw files stay outside
`public/` and are not served as downloads.

### Player identity and artwork

Positions are curated in `lib/roster.json` from the public 2025 Hockey Canada rosters:

- [HC Davos](https://hockeycanada.ca/en-ca/team-canada/men/national/2025-26/spengler-cup/stats/team-rosters/152)
- [U.S. Collegiate Selects](https://www.hockeycanada.ca/team-canada/men/national/2025-26/spengler-cup/stats/team-rosters/1262?teamid=1262)

Match team/jersey keys are kept intact, including differences from tournament roster
numbers and source spellings. Goalkeepers are excluded by the 40-skater source list.

Seven optional portraits come from public tournament / University of Michigan /
Penn State profiles. Restore them with `pnpm assets:fetch` (network required).
Portrait files are ignored in Git and have a jersey fallback if unavailable.
`photoSource` records their provenance. Images are reference assets for this local
prototype, not a grant of redistribution rights.

Jerseys and the reusable SVG `HockeyRink` are original React artwork; no code was
copied from the GPL Python library. The rink accepts coordinates in meters centered
on center ice. The goal centre now uses recorded scoring-shot snapshots; it does
not simulate continuous player tracking.

### Structure

- `app/`: page, layout, styles, and stage-filtered local data route.
- `components/`: prediction UI, player artwork, and reusable rink.
- `lib/game.ts`: questions, stages, ranking, formatting, and saved-state validation.
- `lib/match-data.ts`: source ingestion and period-safe data projection.
- `tests/`: scoring, CSV parsing, recovery, source reconciliation, and data visibility.

Display fonts use Google Fonts with system fallbacks. The interface remains usable
without external fonts or portraits.

### Website navigation and match centre

- `/`: navy/yellow alpine home, current match score, and shortcuts.
- `/picks`: the existing four prediction rounds and results.
- `/stats`: searchable skater stats, team and completed-period filters, metric
  sorting, player detail panels, and a goal centre with bird's-eye snapshots.
- `/progress`: device-local score, submitted-round history, and four earned badges.

Desktop uses a header navigation; mobile has a fixed bottom navigation. Browser
back/forward and direct links work. Picks and the replay stage persist between pages.
Use **Match controls** on any page to advance the recorded match.

Goal records are joined to scoring Shot events with the same player and period
within three seconds, choosing the nearest match. The rink shows positions from that
shot event, with a shot-location ring. Missing player positions or shot measurements
are labelled. There are no video clips or live tracking in the supplied files.
Only goals from completed periods reach the client. The final stats view uses the
full-game totals export to avoid rounding differences when summing period exports.

Badges are calculated from submitted rounds and resolved picks: first submission,
three scoring predictions, all four rounds submitted, and 100 points. They reset with
the demo. No shared leaderboard or leagues are simulated.

### Final goal actions

Goal Centre shows at most five final Pass/Shot/Goal records, within 12 seconds of
the goal, cutting off earlier actions at any gap exceeding four seconds. No full
faceoff replay or interpolated movement is shown. Action buttons and previous/next
controls select static snapshots; autoplay holds each action for three seconds,
independent of match timing. Arrows and labels persist for the entire action.

Only the primary actor gets a red ring. Participating-player lists do not imply
possession. Player identity uses entity IDs; player velocity converts m/s to km/h.
Missing action positions remain missing. A goal may explicitly reuse the immediately
preceding scoring shot's positions for that same scorer, with a visible label.
Missing shot endpoints are not invented. Pass speed uses source units until verified.
Playback pauses when its tab is hidden; all data remains gated by completed period.

### Davos visual identity

`app/davos.css` applies the club blue/yellow design, arena photography, winter
page headers, dark prediction cards and mobile branding. Public club/tournament
marks and optimized photographs live in `public/brand/`; provenance is recorded
in [SOURCES.md](public/brand/SOURCES.md). These are atmosphere images rather than
photographs of the dataset's match. Jersey artwork remains a stylized illustration.
This design update adds no features and changes no scoring or match-data behavior.

On phones, Home has a single primary picks action and a compact match card.
Duplicate destination cards, the round grid and the explainer are hidden there;
all four rounds remain available on `/picks`, with stats and progress available in
the bottom navigation. Desktop retains its full home layout.

Mobile Picks shows all four round cards with point summaries; results have a round
switcher and expandable question details. The home results link opens `/picks`.
Match Centre uses view/period/goal selectors, expandable filters and an initial
eight-player list with a show-all control. Progress keeps its score visible and
collapses badges and round history. Desktop retains expanded detail sections.

# Spengler Picks

A mobile-friendly hockey prediction and match review app for the 2026 Sport Innovation Challenge. It replays the recorded 31 December 2025 game between HC Davos and the U.S. Collegiate Selects.

FHGR team: Silvan Joos, Fabian Nadler, Lars Cools, Jann Rudolph.

## Run locally

You’ll need **Git**, **Node.js 24** (which includes npm), and access to the team’s Wisehockey CSV exports. The exports are not included in this repository.

### 1. Clone the repository

In PowerShell or a terminal:

```sh
git clone https://github.com/nadlerfabian/SIC-Hackathon-FHGR.git
cd SIC-Hackathon-FHGR
```

Already cloned it? Open a terminal in the folder that contains `package.json`.

### 2. Add the match data

Create a folder named `data` **next to `package.json`**, at the root of the project. Copy these five CSVs from the team’s match exports directly into it, keeping their original filenames:

```text
SIC-Hackathon-FHGR/
├── package.json
└── data/
    ├── U.S. Collegiate Selects_HC Davos_Wisehockey_Match_Events_31_12_2025.csv
    ├── U.S. Collegiate Selects_HC Davos_Wisehockey_Match_Statistics_31_12_2025 All.csv
    ├── U.S. Collegiate Selects_HC Davos_Wisehockey_Match_Statistics_31_12_2025 P1.csv
    ├── U.S. Collegiate Selects_HC Davos_Wisehockey_Match_Statistics_31_12_2025 P2.csv
    └── U.S. Collegiate Selects_HC Davos_Wisehockey_Match_Statistics_31_12_2025 P3.csv
```

Use the **full-match events CSV** plus the **four statistics CSVs**. The sample Excel workbooks and split period event files are not used by the app. Ask the hackathon team for access if you don’t have the exports.

The dataset is confidential challenge material. `data/` is ignored by Git. Keep it local and outside `public/`.

### 3. Install and start

**Windows PowerShell** (works without a global pnpm installation):

```powershell
npx.cmd pnpm install --frozen-lockfile
npx.cmd pnpm dev
```

**macOS/Linux:** run the same commands with `npx` instead of `npx.cmd`. If you already have `pnpm` on your PATH, use `pnpm install --frozen-lockfile` and `pnpm dev` on any platform.

Open [http://127.0.0.1:3000](http://127.0.0.1:3000), or the address printed in your terminal. Leave the terminal open while using the app; press **Ctrl+C** to stop it.

If you see `ENOENT` or `Missing match source`, check that the five CSVs are directly inside `data/`, and that you started the server from the folder containing `package.json`. If `npx.cmd` is missing on Windows, check that Node.js is installed and reopen PowerShell.

## Try the demo

1. Open **Picks** and submit your pre-match and Period 1 predictions.
2. Expand **Demo / Match controls** at the bottom of the page. Start Period 1 to lock your picks, then end it to reveal results and open the next round.
3. Open **Match Centre** to browse player stats or select **Goal Centre** to step through the last recorded actions before a goal. The period buttons filter both views.
4. Finish the remaining periods and open **My Progress** to see your points and badges.

Match picks are worth up to 100 points each; period picks are worth up to 50. Second and third place also earn points. Picks and demo progress are stored in your browser. This is a replay of a recorded match; it has no live feed, accounts, or shared leaderboard.

## Development notes

- `pnpm test` runs the tests. The match-data tests need the same five local CSVs.
- `pnpm typecheck` checks TypeScript. `pnpm build` and `pnpm start` build and serve the production version locally.
- `pnpm assets:fetch` optionally downloads player portraits. Jersey artwork is shown when portraits are unavailable. See [brand asset sources](public/brand/SOURCES.md) for the club and tournament imagery.
- `lib/match-data.ts` loads the CSVs. Period goals and assists are calculated from events because the period exports repeat match totals for those fields. Fastest-pass picks use successful passes.
- Goal Centre shows up to five recorded actions before a goal. It uses event snapshots without filling gaps with simulated movement.

## Synthetic Tier 3 tracking demo

In Match Centre > Goal Centre, choose **Smooth demo** for a 13-second fictional
scoring sequence. Use Play, the timeline slider, speed selector, or moment buttons.
**Recorded actions** retains the real event snapshots. Complete a period with
Demo / Match controls first to reveal its goals.

The fixture contains 20 samples per second for ten skaters, two goalies and a puck.
It uses generic demo identities. The same invented choreography is aligned to each
selected goal's real UNIX timestamp; it does not reconstruct that goal or its strength.
Scoring statistics below the replay are from the recorded match, not the demo.

- `public/demo/tier3-synthetic.json`: entirely fabricated, safe-to-share fixture;
  it contains no local match exports.
- `node scripts/generate-synthetic-tracking.mjs`: regenerate the fixture deterministically.
- `lib/tracking.ts`: provisional app contract and adapter, timestamp alignment and
  interpolation. Coordinates are metres, centred on the rink; timestamps are UNIX
  milliseconds. The renderer leaves gaps over 250 ms empty instead of inventing motion.
- Real Tier 3 will need an adapter for its IDs, timestamps, axes and units. Keep
  real captures in ignored local `data/`; never put confidential data in `public/`.

## Team calls

Each round now contains one team question within the existing 5 / 3 / 3 / 3
questions. Choose Davos, U.S. Selects, or a tie directly on the card. Pre-match
and Period 1 ask about shots; Period 2 asks about total expected goals; Period 3
asks about passing success. Correct team/tie calls earn the round's full question
points; incorrect or unavailable results earn zero. Player picks retain top-three
scoring. The total maximum stays at 950 points.

Later periods show the previous period's matching team metric as context. Results
show two values, a short explanation, and optional calculation details. Shots and
shooter xG are summed; pass success uses pooled completed / attempted passes,
not averaged player percentages. Ties use displayed precision (integer shots,
two-decimal xG, one-decimal percentages). All strengths are included.

The new question set saves under browser storage version 2. Version 1 saves stay
untouched; the first visit to the new version starts a fresh demo so previous
submitted rounds are not silently rescored against different questions.

## Result card walkthrough

The first visit to a completed round opens one result card at a time. Each card
shows the chosen player/team, the outcome and points, a comparison, and a short
explanation. Details and leading players stay collapsed until requested. Use
Next/Back, left/right arrow keys, or horizontal touch swipes; vertical scrolling
and buttons continue to work on phones. View all results skips to the existing
summary, and the final card leads to a round score screen.

Later visits to a viewed round open its summary directly. Replay result cards
starts the walkthrough again. Seen-round flags use a separate browser storage key;
picks and scoring are unchanged. Reset demo clears the flags as well. Unsubmitted
rounds show draft/missing selections honestly and earn no points. Missing speed
measurements are shown as not recorded, not as zero-speed performances.
## Render Free deployment

See [docs/RENDER-FREE.md](docs/RENDER-FREE.md) for setup and secret-file instructions
for an authorised demo. Code deploys automatically from the linked GitHub branch.
Match CSVs stay outside Git and `public/`: `pnpm run render:pack-data` creates a
private, ignored Secret File. `pnpm run render:start` restores and validates it at
every start. Do not commit the generated `.render-secrets/match-data.b64` file.

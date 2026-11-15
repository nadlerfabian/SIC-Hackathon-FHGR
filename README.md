# Spengler Picks

A mobile-friendly hockey prediction and match review app for the 2026 Sport Innovation Challenge. It replays the recorded 31 December 2025 game between HC Davos and the U.S. Collegiate Selects.

FHGR team: Silvan Joos, Fabian Nadler, Jann Rudolph, Lars Cools.

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

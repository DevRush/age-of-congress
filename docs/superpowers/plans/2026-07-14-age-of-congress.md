# The Age of Congress — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-page static site at ageofcongress.com showing the live-ticking average age of Congress, chamber splits, oldest/youngest rankings with portraits, a distribution histogram vs the US adult population, and a 1789→today historical chart — rebuilt daily from canonical open data.

**Architecture:** A TypeScript pipeline (`scripts/pipeline/`) fetches the `unitedstates/congress-legislators` dataset + official portraits, verifies ranked members' birth dates against Wikidata, computes stats/history/context lines, and emits committed JSON + images. A fully static Next.js app renders them; all clocks tick client-side as pure math from baked-in birth dates. A GitHub Action re-runs the pipeline daily and pushes; Vercel auto-deploys.

**Tech Stack:** Next.js 15 (App Router, `output: 'export'`), React 19, Tailwind CSS v4, TypeScript strict, vitest, tsx, sharp. No chart libraries — hand-rolled SVG. No runtime data fetching, no API keys.

## Global Constraints

- Repo: `~/Projects/AgeOfCongress`. Node ≥ 20. Run all commands from repo root.
- Static export only: `output: 'export'`, `images: { unoptimized: true }`. No server code, no runtime fetch, no API keys, no env vars.
- Age convention (everywhere): `MS_PER_YEAR = 365.2425 × 86_400_000`; birth dates anchored at 00:00 EST via `dobToMs` (UTC midnight + 5 h). Displayed ages TRUNCATE decimals, never round.
- Averages cover **voting members only**: all senators + representatives whose state is one of the 50 states (`STATES_50`). Delegates/Resident Commissioner (DC, PR, GU, VI, AS, MP) are excluded. Seats constants: Senate 100, House 435.
- Clock decimals: hero 8 (dim last 3), chamber clocks 7 (dim last 2), member rows 7 (dim last 2). Rationale: average age advances exactly 1 yr/yr; the Nth decimal ticks every 365.2425×86400/10^N seconds.
- Copy is deadpan: no alarmist adjectives, numbers carry the argument. Site name **“The Age of Congress”**; hero kicker **“How old is Congress?”**; section titles exactly: “The Ten Oldest Senators”, “The Ten Oldest Representatives”, “…and the ten youngest”, “The Shape of Congress”, “The Long View”, “Methodology”.
- Palette (only these): `--paper:#faf9f4; --ink:#1c1a16; --ink-soft:#57534a; --rule:#e2ded4; --dem:#2f6bb3; --rep:#bf3b30; --ind:#857f73`. Party colors are the only saturated hues. Font: Newsreader (Google) + serif fallbacks.
- Imports: `@/*` alias only inside `src/`; scripts use relative paths (`../../src/lib/age`).
- Generated artifacts are committed: `src/data/*.json`, `public/images/members/*`. `.cache/` is gitignored.
- Every pipeline module has vitest unit tests; `npm test` must be green before every commit. Pipeline exits non-zero (build fails) on: Wikidata mismatch, missing ranked portrait, any validation-gate failure.
- Reduced motion (`prefers-reduced-motion`): clocks freeze with an “as of” note; context strip does not auto-rotate.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Tasks 20's outward-facing steps (public GitHub repo, Vercel deploy, domain purchase) require explicit user confirmation — HARD CHECKPOINTS, never auto-run.

## Verified facts (research appendix — trust these, they were live-tested 2026-07-14)

- Roster: `https://unitedstates.github.io/congress-legislators/legislators-current.json` (1.4 MB, CC0, updated within days of events). Historical: `.../legislators-historical.json` (13 MB, 12,231 members, birthday coverage 81.6% pre-1850, ≥99% after 1850). `theunitedstates.io` domain is DEAD — never use it.
- Schema: `id.bioguide`, `name.official_full` (missing on 2 newest members → fall back to `first + ' ' + last`), `bio.birthday` (“YYYY-MM-DD”, present on all 536 current members), `terms[]` with `type` (`sen`/`rep`), `state`, `party` (`Democrat|Republican|Independent`), `district` (rep only; 0 = at-large), `class` (sen only), `caucus` (Independents), `start`/`end` ISO dates. Current chamber/party = last element of `terms`.
- As of 2026-07-14: 536 members; Senate 99 (1 vacancy — Sen. Graham died 2026-07-11), House 437 incl. 6 non-voting → 431 voting. Mean ages: overall voting 60.12, Senate 65.63, House voting 58.85. Mean birth date of voting members: **1966-06-01**. Oldest: Grassley (S, 1933-09-17), Hal Rogers (H, 1937-12-31). Youngest: Ossoff (S, 1987-02-16), Frost (H, 1997-01-17).
- Portraits: primary `https://unitedstates.github.io/images/congress/450x550/{BIOGUIDE}.jpg` (uniform 450×550, public domain); fallback `https://bioguide.congress.gov/photo/{BIOGUIDE}.jpg` — **GET only, HEAD returns 403**; sizes vary 180×225–1000×1250; 404s return HTML bodies so always check status + content-type. Credit line: U.S. Senate Historical Office / Collection of the U.S. House of Representatives.
- Wikidata: bioguide = property P1157, birth date = P569. One batched VALUES query on `https://query.wikidata.org/sparql` (`format=json`, custom User-Agent required) verifies all ~40 IDs in <1 s. `timePrecision`: 11 = day, 10 = month, 9 = year (year-precision still serializes as full ISO date — compare only to precision!). Drop DeprecatedRank; prefer PreferredRank.
- Census: `https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/national/asrh/nc-est2025-agesex-res.csv` (NC-EST2025, single-year ages 0–100, SEX=0 rows, use POPESTIMATE2025). Expected: mean age of adults 18+ ≈ 49.0, median ≈ 47.6.
- Historical validation targets: CRS R48535 — 119th at convening: House mean 57.9, Senate 63.9. FiveThirtyEight dataset — 66th (1919) overall 51.7; 97th (1981) overall 49.5 (modern low); 118th overall 58.6, Senate 63.9. NBC: 119th overall 58.9, third-oldest since 1789. Published claims: 118th Senate = oldest Senate ever (median); never claim “oldest Congress ever” — print what our computation shows.
- Milestone dates (verified): ballpoint pen first US sale 1945-10-29; transistor 1947-12-16; polio vaccine announcement 1955-04-12; Sputnik 1957-10-04; NASA created 1958-07-29; MLK “I Have a Dream” 1963-08-28; Medicare signed 1965-07-30; Apollo 11 1969-07-20; ARPANET first message 1969-10-29; Berlin Wall fell 1989-11-09; Web public 1991-08-06; Google incorporated 1998-09-04; Facebook 2004-02-04; iPhone announced 2007-01-09.

---

### Task 1: Scaffold app & tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: working `npm run dev|build|test|pipeline` commands; `@/*` → `src/*` alias; Tailwind v4 + CSS tokens; Newsreader font.

- [ ] **Step 1: Write config files**

`package.json`:
```json
{
  "name": "age-of-congress",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "pipeline": "tsx scripts/pipeline/build-data.ts",
    "census": "tsx scripts/pipeline/parse-census.ts"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "sharp": "^0.34.0",
    "tailwindcss": "^4.1.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "out"]
}
```

`next.config.ts`:
```ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
}
export default config
```

`postcss.config.mjs`:
```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

`vitest.config.ts`:
```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'], environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

`.gitignore`:
```
node_modules/
.next/
out/
.cache/
*.tsbuildinfo
next-env.d.ts
.DS_Store
```

`src/app/globals.css`:
```css
@import "tailwindcss";

:root {
  --paper: #faf9f4;
  --ink: #1c1a16;
  --ink-soft: #57534a;
  --rule: #e2ded4;
  --dem: #2f6bb3;
  --rep: #bf3b30;
  --ind: #857f73;
}

body { background: var(--paper); color: var(--ink); }
.rule { border-top: 1px solid var(--rule); }
.smallcaps { font-variant-caps: all-small-caps; letter-spacing: 0.08em; }
.tnum { font-variant-numeric: tabular-nums; }
.digit { display: inline-block; width: 0.58em; text-align: center; }
```

`src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Newsreader } from 'next/font/google'
import './globals.css'

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'The Age of Congress',
  description: 'How old is Congress? The live average age of the United States Congress.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={newsreader.className}>
      <body>{children}</body>
    </html>
  )
}
```

`src/app/page.tsx` (placeholder until Task 11):
```tsx
export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-20">
      <h1 className="text-4xl">The Age of Congress</h1>
    </main>
  )
}
```

- [ ] **Step 2: Install and verify build**

Run: `npm install && npm run build`
Expected: build succeeds, `out/index.html` exists.

- [ ] **Step 3: Verify vitest runs**

Run: `npx vitest run`
Expected: “No test files found” exit 0 or passWithNoTests hint — add `passWithNoTests: true` to the `test` block in `vitest.config.ts` so `npm test` is green pre-Task-2.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js static app with Tailwind, vitest, pipeline tooling"
```

---

### Task 2: Age math library

**Files:**
- Create: `src/lib/age.ts`, `src/lib/age.test.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`

**Interfaces:**
- Produces: `MS_PER_YEAR: number`, `EST_OFFSET_MS: number`, `dobToMs(iso: string): number`, `ageYears(dobMs: number, nowMs: number): number`, `meanDobMs(list: number[]): number`, `medianDobMs(list: number[]): number`, `agePartsAt(dobMs: number, nowMs: number, decimals: number): { int: string; frac: string }`, `ordinal(n: number): string`, `monthDayYear(ms: number): string` (e.g. “June 1, 1966”, UTC-EST aware).

- [ ] **Step 1: Write failing tests** (`src/lib/age.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { MS_PER_YEAR, agePartsAt, ageYears, dobToMs, meanDobMs, medianDobMs } from './age'

const NOW = Date.UTC(2026, 6, 14, 12) // 2026-07-14 12:00 UTC

describe('age math', () => {
  it('computes Grassley ≈ 92.82 on 2026-07-14', () => {
    expect(ageYears(dobToMs('1933-09-17'), NOW)).toBeCloseTo(92.82, 1)
  })
  it('anchors DOB at 00:00 EST (UTC-5)', () => {
    expect(dobToMs('1970-01-01')).toBe(5 * 3_600_000)
  })
  it('mean of ages equals age of mean DOB', () => {
    const dobs = [dobToMs('1933-09-17'), dobToMs('1987-02-16'), dobToMs('1966-06-01')]
    const meanOfAges = dobs.map((d) => ageYears(d, NOW)).reduce((a, b) => a + b) / 3
    expect(ageYears(meanDobMs(dobs), NOW)).toBeCloseTo(meanOfAges, 9)
  })
  it('medianDobMs picks middle / averages middle two', () => {
    expect(medianDobMs([3, 1, 2])).toBe(2)
    expect(medianDobMs([4, 1, 3, 2])).toBe(3) // round((2+3)/2)=3
  })
  it('agePartsAt truncates and zero-pads', () => {
    const dob = 0
    const now = 60.000000019 * MS_PER_YEAR
    expect(agePartsAt(dob, now, 8)).toEqual({ int: '60', frac: '00000001' })
  })
  it('agePartsAt never rounds up across the integer boundary', () => {
    const now = 60.999999999 * MS_PER_YEAR
    expect(agePartsAt(0, now, 8).int).toBe('60')
    expect(agePartsAt(0, now, 8).frac).toBe('99999999')
  })
})
```

(`src/lib/format.test.ts`)
```ts
import { expect, it } from 'vitest'
import { monthDayYear, ordinal } from './format'
import { dobToMs } from './age'

it('ordinal', () => {
  expect(ordinal(119)).toBe('119th')
  expect(ordinal(101)).toBe('101st')
  expect(ordinal(112)).toBe('112th')
  expect(ordinal(103)).toBe('103rd')
  expect(ordinal(102)).toBe('102nd')
})
it('monthDayYear renders the EST-anchored calendar date', () => {
  expect(monthDayYear(dobToMs('1966-06-01'))).toBe('June 1, 1966')
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/lib/age.ts`:
```ts
export const MS_PER_YEAR = 365.2425 * 86_400_000
export const EST_OFFSET_MS = 5 * 3_600_000

export function dobToMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) + EST_OFFSET_MS
}

export function ageYears(dobMs: number, nowMs: number): number {
  return (nowMs - dobMs) / MS_PER_YEAR
}

export function meanDobMs(list: number[]): number {
  if (!list.length) throw new Error('meanDobMs: empty list')
  return Math.round(list.reduce((a, b) => a + b, 0) / list.length)
}

export function medianDobMs(list: number[]): number {
  if (!list.length) throw new Error('medianDobMs: empty list')
  const s = [...list].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

export function agePartsAt(dobMs: number, nowMs: number, decimals: number): { int: string; frac: string } {
  const pow = 10 ** decimals
  const scaled = Math.floor(ageYears(dobMs, nowMs) * pow)
  return { int: String(Math.floor(scaled / pow)), frac: String(scaled % pow).padStart(decimals, '0') }
}
```

`src/lib/format.ts`:
```ts
import { EST_OFFSET_MS } from './age'

export function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  const suffix = ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${suffix}`
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function monthDayYear(ms: number): string {
  const d = new Date(ms - EST_OFFSET_MS) // back to the calendar date as written
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib && git commit -m "feat: age math and formatting primitives"
```

---

### Task 3: Shared types + roster parsing

**Files:**
- Create: `src/lib/types.ts`, `scripts/pipeline/parse-members.ts`, `scripts/pipeline/parse-members.test.ts`, `scripts/pipeline/__fixtures__/members-fixture.json`

**Interfaces:**
- Consumes: `dobToMs` from Task 2.
- Produces: types `Chamber`, `Party`, `Member`, `MemberCard`, `ChamberStats`, `HistoricalPoint`, `ContextLine`; `STATES_50: Set<string>`; `parseMembers(raw: any[]): { members: Member[]; excludedNoBirthday: string[] }`; the fixture file (reused by Task 4).

- [ ] **Step 1: Write types**

`src/lib/types.ts`:
```ts
export type Chamber = 'senate' | 'house'
export type Party = 'D' | 'R' | 'I'

export interface Member {
  bioguide: string
  name: string
  party: Party
  caucus?: Party
  chamber: Chamber
  state: string
  district?: number
  birthday: string // YYYY-MM-DD
  dobMs: number
  firstElectedYear: number
  termsServed: number
  isVoting: boolean
}

export interface MemberCard extends Member {
  rank: number
  photo: string
}

export interface ChamberStats {
  meanDobMs: number
  medianDobMs: number
  count: number
  seats: number
}

export interface HistoricalPoint {
  congress: number
  year: number
  convening: string
  senateMean: number | null
  houseMean: number | null
  overallMean: number | null
  senateN: number
  houseN: number
  missingBirthday: number
  birthdayCoverage: number
}

export interface ContextLine {
  text: string
  footnote: string
}
```

- [ ] **Step 2: Write fixture** (`scripts/pipeline/__fixtures__/members-fixture.json`)

```json
[
  { "id": { "bioguide": "S000001" }, "name": { "first": "Alice", "last": "Senior", "official_full": "Alice B. Senior" }, "bio": { "birthday": "1933-09-17", "gender": "F" }, "terms": [ { "type": "rep", "start": "1975-01-14", "end": "1981-01-03", "state": "IA", "district": 3, "party": "Republican" }, { "type": "sen", "start": "1981-01-03", "end": "2029-01-03", "state": "IA", "class": 3, "party": "Republican" } ] },
  { "id": { "bioguide": "R000002" }, "name": { "first": "Bob", "last": "Young", "official_full": "Bob Young" }, "bio": { "birthday": "1997-01-17", "gender": "M" }, "terms": [ { "type": "rep", "start": "2023-01-03", "end": "2025-01-03", "state": "FL", "district": 10, "party": "Democrat" }, { "type": "rep", "start": "2025-01-03", "end": "2027-01-03", "state": "FL", "district": 10, "party": "Democrat" } ] },
  { "id": { "bioguide": "D000003" }, "name": { "first": "Carol", "last": "Delegate", "official_full": "Carol Delegate" }, "bio": { "birthday": "1937-06-13", "gender": "F" }, "terms": [ { "type": "rep", "start": "2025-01-03", "end": "2027-01-03", "state": "DC", "district": 0, "party": "Democrat" } ] },
  { "id": { "bioguide": "I000004" }, "name": { "first": "Dan", "last": "Indy", "official_full": "Daniel Indy" }, "bio": { "birthday": "1944-03-31", "gender": "M" }, "terms": [ { "type": "sen", "start": "2013-01-03", "end": "2031-01-03", "state": "ME", "class": 1, "party": "Independent", "caucus": "Democrat" } ] },
  { "id": { "bioguide": "N000005" }, "name": { "first": "Eve", "last": "Newest" }, "bio": { "birthday": "1980-05-02", "gender": "F" }, "terms": [ { "type": "rep", "start": "2026-04-20", "end": "2027-01-03", "state": "NJ", "district": 8, "party": "Democrat" } ] },
  { "id": { "bioguide": "A000006" }, "name": { "first": "Frank", "last": "AtLarge", "official_full": "Frank AtLarge" }, "bio": { "birthday": "1960-11-01", "gender": "M" }, "terms": [ { "type": "rep", "start": "2019-01-03", "end": "2027-01-03", "state": "VT", "district": 0, "party": "Republican" } ] }
]
```

- [ ] **Step 3: Write failing tests** (`scripts/pipeline/parse-members.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import raw from './__fixtures__/members-fixture.json'
import { parseMembers, STATES_50 } from './parse-members'

describe('parseMembers', () => {
  const { members, excludedNoBirthday } = parseMembers(raw as any[])
  const by = (id: string) => members.find((m) => m.bioguide === id)!

  it('parses all six, excludes none (all have birthdays)', () => {
    expect(members).toHaveLength(6)
    expect(excludedNoBirthday).toEqual([])
  })
  it('derives chamber/party/state from the LAST term', () => {
    const alice = by('S000001')
    expect(alice.chamber).toBe('senate')
    expect(alice.party).toBe('R')
    expect(alice.state).toBe('IA')
    expect(alice.district).toBeUndefined()
  })
  it('first elected year = earliest term start; termsServed = term count', () => {
    expect(by('S000001').firstElectedYear).toBe(1975)
    expect(by('S000001').termsServed).toBe(2)
  })
  it('DC delegate is not voting; VT at-large (district 0) is voting', () => {
    expect(by('D000003').isVoting).toBe(false)
    expect(by('A000006').isVoting).toBe(true)
  })
  it('independent keeps caucus', () => {
    expect(by('I000004').party).toBe('I')
    expect(by('I000004').caucus).toBe('D')
  })
  it('falls back to first+last when official_full missing', () => {
    expect(by('N000005').name).toBe('Eve Newest')
  })
  it('excludes and reports members without birthday', () => {
    const mutated = structuredClone(raw) as any[]
    delete mutated[1].bio.birthday
    const r = parseMembers(mutated)
    expect(r.members).toHaveLength(5)
    expect(r.excludedNoBirthday).toEqual(['R000002'])
  })
  it('STATES_50 has exactly 50 entries and no territories', () => {
    expect(STATES_50.size).toBe(50)
    for (const t of ['DC', 'PR', 'GU', 'VI', 'AS', 'MP']) expect(STATES_50.has(t)).toBe(false)
  })
})
```

- [ ] **Step 4: Run to verify failure** — `npx vitest run scripts/pipeline/parse-members.test.ts` → FAIL.

- [ ] **Step 5: Implement** (`scripts/pipeline/parse-members.ts`)

```ts
import { dobToMs } from '../../src/lib/age'
import type { Member, Party } from '../../src/lib/types'

export const STATES_50 = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'])

const PARTY: Record<string, Party> = { Democrat: 'D', Republican: 'R', Independent: 'I' }

export function parseMembers(raw: any[]): { members: Member[]; excludedNoBirthday: string[] } {
  const members: Member[] = []
  const excludedNoBirthday: string[] = []
  for (const p of raw) {
    if (!p.bio?.birthday) {
      excludedNoBirthday.push(p.id.bioguide)
      continue
    }
    const t = p.terms[p.terms.length - 1]
    members.push({
      bioguide: p.id.bioguide,
      name: p.name.official_full ?? `${p.name.first} ${p.name.last}`,
      party: PARTY[t.party] ?? 'I',
      caucus: t.caucus ? PARTY[t.caucus] : undefined,
      chamber: t.type === 'sen' ? 'senate' : 'house',
      state: t.state,
      district: t.type === 'rep' ? t.district : undefined,
      birthday: p.bio.birthday,
      dobMs: dobToMs(p.bio.birthday),
      firstElectedYear: Math.min(...p.terms.map((x: any) => Number(x.start.slice(0, 4)))),
      termsServed: p.terms.length,
      isVoting: t.type === 'sen' || STATES_50.has(t.state),
    })
  }
  return { members, excludedNoBirthday }
}
```

- [ ] **Step 6: Run to verify pass** — `npx vitest run scripts/pipeline/parse-members.test.ts` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts scripts/pipeline && git commit -m "feat: shared types and roster parsing with voting-member rules"
```

---

### Task 4: Stats & rankings

**Files:**
- Create: `scripts/pipeline/stats.ts`, `scripts/pipeline/stats.test.ts`

**Interfaces:**
- Consumes: fixture + `parseMembers` (Task 3), `meanDobMs`/`medianDobMs` (Task 2).
- Produces: `SEATS = { senate: 100, house: 435 }`, `chamberStats(members: Member[], chamber: Chamber): ChamberStats`, `overallStats(members: Member[]): ChamberStats` (seats 535), `rankOldest(members, chamber, n = 10): Member[]`, `rankYoungest(members, chamber, n = 10): Member[]`, `withRanks(list: Member[]): (Member & { rank: number })[]` (same-dob shares rank).

- [ ] **Step 1: Write failing tests** (`scripts/pipeline/stats.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import raw from './__fixtures__/members-fixture.json'
import { parseMembers } from './parse-members'
import { chamberStats, overallStats, rankOldest, rankYoungest, withRanks } from './stats'
import { dobToMs } from '../../src/lib/age'

const { members } = parseMembers(raw as any[])

describe('stats', () => {
  it('chamber stats use voting members only', () => {
    const senate = chamberStats(members, 'senate')
    expect(senate.count).toBe(2) // Alice + Dan
    expect(senate.seats).toBe(100)
    const house = chamberStats(members, 'house')
    expect(house.count).toBe(3) // Bob, Eve, Frank — Carol (DC) excluded
    expect(house.seats).toBe(435)
  })
  it('overall = senate + voting house, seats 535', () => {
    const o = overallStats(members)
    expect(o.count).toBe(5)
    expect(o.seats).toBe(535)
  })
  it('rankOldest sorts ascending dob; rankYoungest descending', () => {
    expect(rankOldest(members, 'house', 3).map((m) => m.bioguide)).toEqual(['A000006', 'N000005', 'R000002'])
    expect(rankYoungest(members, 'house', 3).map((m) => m.bioguide)).toEqual(['R000002', 'N000005', 'A000006'])
  })
  it('withRanks shares rank on identical birthdays', () => {
    const twins = [
      { ...members[0], bioguide: 'X1', dobMs: dobToMs('1950-01-01') },
      { ...members[0], bioguide: 'X2', dobMs: dobToMs('1950-01-01') },
      { ...members[0], bioguide: 'X3', dobMs: dobToMs('1960-01-01') },
    ]
    expect(withRanks(twins).map((m) => m.rank)).toEqual([1, 1, 3])
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run scripts/pipeline/stats.test.ts` → FAIL.

- [ ] **Step 3: Implement** (`scripts/pipeline/stats.ts`)

```ts
import { meanDobMs, medianDobMs } from '../../src/lib/age'
import type { Chamber, ChamberStats, Member } from '../../src/lib/types'

export const SEATS = { senate: 100, house: 435 } as const

function statsOf(voting: Member[], seats: number): ChamberStats {
  const dobs = voting.map((m) => m.dobMs)
  return { meanDobMs: meanDobMs(dobs), medianDobMs: medianDobMs(dobs), count: voting.length, seats }
}

export function chamberStats(members: Member[], chamber: Chamber): ChamberStats {
  return statsOf(members.filter((m) => m.chamber === chamber && m.isVoting), SEATS[chamber])
}

export function overallStats(members: Member[]): ChamberStats {
  return statsOf(members.filter((m) => m.isVoting), SEATS.senate + SEATS.house)
}

function votingOf(members: Member[], chamber: Chamber): Member[] {
  return members.filter((m) => m.chamber === chamber && m.isVoting)
}

export function rankOldest(members: Member[], chamber: Chamber, n = 10): Member[] {
  return votingOf(members, chamber)
    .sort((a, b) => a.dobMs - b.dobMs || a.bioguide.localeCompare(b.bioguide))
    .slice(0, n)
}

export function rankYoungest(members: Member[], chamber: Chamber, n = 10): Member[] {
  return votingOf(members, chamber)
    .sort((a, b) => b.dobMs - a.dobMs || a.bioguide.localeCompare(b.bioguide))
    .slice(0, n)
}

export function withRanks<T extends Member>(list: T[]): (T & { rank: number })[] {
  return list.map((m, i) => {
    let first = i
    while (first > 0 && list[first - 1].dobMs === m.dobMs) first--
    return { ...m, rank: first + 1 }
  })
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run scripts/pipeline/stats.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/pipeline/stats.ts scripts/pipeline/stats.test.ts && git commit -m "feat: chamber stats and oldest/youngest rankings"
```

---

### Task 5: Census population data

**Files:**
- Create: `scripts/pipeline/parse-census.ts`, `scripts/pipeline/parse-census.test.ts`
- Generate + commit: `src/data/population.json`

**Interfaces:**
- Produces: `parseCensusCsv(csv: string): { age: number; pop: number }[]` (SEX=0 rows, ages 0–100, POPESTIMATE2025 column), `summarizePopulation(rows): Population` where `Population = { asOf: string; source: string; url: string; adultMeanAge18: number; adultMedianAge18: number; bins: { label: string; min: number; max: number | null; count: number }[] }` (5-year bins from 25–29 through 90–94, then `95+`); committed `src/data/population.json` consumed by Tasks 13/16.

- [ ] **Step 1: Write failing tests** (`scripts/pipeline/parse-census.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { parseCensusCsv, summarizePopulation } from './parse-census'

const CSV = [
  'SEX,AGE,ESTIMATESBASE2020,POPESTIMATE2020,POPESTIMATE2021,POPESTIMATE2022,POPESTIMATE2023,POPESTIMATE2024,POPESTIMATE2025',
  '0,30,0,0,0,0,0,0,2000',
  '0,50,0,0,0,0,0,0,2000',
  '0,17,0,0,0,0,0,0,5000',
  '0,999,0,0,0,0,0,0,999999',
  '1,30,0,0,0,0,0,0,777',
].join('\n')

describe('census parsing', () => {
  const rows = parseCensusCsv(CSV)
  it('keeps only SEX=0 single ages 0–100', () => {
    expect(rows).toEqual([
      { age: 30, pop: 2000 },
      { age: 50, pop: 2000 },
      { age: 17, pop: 5000 },
    ])
  })
  it('computes 18+ mean/median with age midpoints', () => {
    const p = summarizePopulation(rows)
    expect(p.adultMeanAge18).toBeCloseTo(40.5, 5) // (30.5+50.5)/2
    expect(p.adultMedianAge18).toBeCloseTo(40.5, 0)
  })
  it('bins 25+ into 5-year bins with a 95+ tail', () => {
    const p = summarizePopulation(rows)
    expect(p.bins.find((b) => b.label === '30–34')!.count).toBe(2000)
    expect(p.bins[0].label).toBe('25–29')
    expect(p.bins[p.bins.length - 1].label).toBe('95+')
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run scripts/pipeline/parse-census.test.ts` → FAIL.

- [ ] **Step 3: Implement** (`scripts/pipeline/parse-census.ts`)

```ts
import { writeFile, mkdir } from 'node:fs/promises'

export const CENSUS_URL = 'https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/national/asrh/nc-est2025-agesex-res.csv'

export interface PopulationBin { label: string; min: number; max: number | null; count: number }
export interface Population {
  asOf: string; source: string; url: string
  adultMeanAge18: number; adultMedianAge18: number
  bins: PopulationBin[]
}

export function parseCensusCsv(csv: string): { age: number; pop: number }[] {
  const lines = csv.trim().split('\n')
  const header = lines[0].split(',')
  const iSex = header.indexOf('SEX')
  const iAge = header.indexOf('AGE')
  const iPop = header.indexOf('POPESTIMATE2025')
  const out: { age: number; pop: number }[] = []
  for (const line of lines.slice(1)) {
    const cols = line.split(',')
    const sex = Number(cols[iSex]); const age = Number(cols[iAge])
    if (sex !== 0 || age > 100) continue
    out.push({ age, pop: Number(cols[iPop]) })
  }
  return out
}

export function summarizePopulation(rows: { age: number; pop: number }[]): Population {
  const adults = rows.filter((r) => r.age >= 18)
  const midpoint = (age: number) => (age >= 100 ? 102 : age + 0.5)
  const total = adults.reduce((a, r) => a + r.pop, 0)
  const mean = adults.reduce((a, r) => a + midpoint(r.age) * r.pop, 0) / total
  let cum = 0; let median = 0
  for (const r of [...adults].sort((a, b) => a.age - b.age)) {
    cum += r.pop
    if (cum >= total / 2) { median = midpoint(r.age); break }
  }
  const bins: PopulationBin[] = []
  for (let min = 25; min <= 90; min += 5) {
    const count = rows.filter((r) => r.age >= min && r.age < min + 5).reduce((a, r) => a + r.pop, 0)
    bins.push({ label: `${min}–${min + 4}`, min, max: min + 4, count })
  }
  bins.push({ label: '95+', min: 95, max: null, count: rows.filter((r) => r.age >= 95).reduce((a, r) => a + r.pop, 0) })
  return {
    asOf: '2025-07-01',
    source: 'U.S. Census Bureau, Vintage 2025 National Population Estimates (NC-EST2025)',
    url: CENSUS_URL,
    adultMeanAge18: Math.round(mean * 10) / 10,
    adultMedianAge18: Math.round(median * 10) / 10,
    bins,
  }
}

async function main() {
  const csv = await (await fetch(CENSUS_URL)).text()
  const pop = summarizePopulation(parseCensusCsv(csv))
  if (pop.adultMeanAge18 < 48 || pop.adultMeanAge18 > 50) throw new Error(`implausible adult mean age ${pop.adultMeanAge18}`)
  await mkdir('src/data', { recursive: true })
  await writeFile('src/data/population.json', JSON.stringify(pop, null, 2))
  console.log(`population.json written — adult mean ${pop.adultMeanAge18}, median ${pop.adultMedianAge18}`)
}

if (process.argv[1]?.endsWith('parse-census.ts')) main()
```

- [ ] **Step 4: Run tests then generate real data**

Run: `npx vitest run scripts/pipeline/parse-census.test.ts` → PASS.
Run: `npm run census`
Expected: `population.json written — adult mean 49.0, median 47.6` (±0.3 acceptable). Inspect `src/data/population.json`: bins 25–29 … 95+, counts in the tens of millions.

- [ ] **Step 5: Commit**

```bash
git add scripts/pipeline/parse-census.* src/data/population.json && git commit -m "feat: census adult age distribution baked from NC-EST2025"
```

---

### Task 6: Wikidata cross-verification

**Files:**
- Create: `scripts/pipeline/http.ts`, `scripts/pipeline/wikidata.ts`, `scripts/pipeline/wikidata.test.ts`

**Interfaces:**
- Produces: `USER_AGENT` (in `http.ts`), `buildSparql(bioguides: string[]): string`, `extractDobs(resp: any): Map<string, WdDob[]>` with `WdDob = { date: string; precision: number; rank: string }`, `verifyBirthdays(members: Pick<Member, 'bioguide' | 'name' | 'birthday'>[], dobs: Map<string, WdDob[]>): string[]` (empty = all verified), `fetchWikidataDobs(bioguides: string[]): Promise<Map<string, WdDob[]>>`.

- [ ] **Step 1: Write** `scripts/pipeline/http.ts`

```ts
export const USER_AGENT = 'AgeOfCongress/1.0 (https://ageofcongress.com; annas.rahman@gmail.com)'

export interface Fetched { status: number; contentType: string | null; body: Buffer }
export type Fetcher = (url: string) => Promise<Fetched>

export async function httpGet(url: string): Promise<Fetched> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  return { status: res.status, contentType: res.headers.get('content-type'), body: Buffer.from(await res.arrayBuffer()) }
}
```

- [ ] **Step 2: Write failing tests** (`scripts/pipeline/wikidata.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { buildSparql, extractDobs, verifyBirthdays } from './wikidata'

const binding = (id: string, date: string, precision: number, rank = 'NormalRank') => ({
  bioguide: { value: id },
  dob: { value: `${date}T00:00:00Z` },
  precision: { value: String(precision) },
  rank: { value: `http://wikiba.se/ontology#${rank}` },
})
const resp = (bindings: any[]) => ({ results: { bindings } })

describe('wikidata verification', () => {
  it('builds a single VALUES query containing every id', () => {
    const q = buildSparql(['G000386', 'P000197'])
    expect(q).toContain('"G000386" "P000197"')
    expect(q).toContain('wdt:P1157')
    expect(q).toContain('psv:P569')
  })
  it('drops deprecated, prefers preferred, dedupes', () => {
    const m = extractDobs(resp([
      binding('A1', '1950-01-01', 11, 'DeprecatedRank'),
      binding('A1', '1951-02-02', 11, 'PreferredRank'),
      binding('A1', '1952-03-03', 11, 'NormalRank'),
      binding('A1', '1951-02-02', 11, 'PreferredRank'),
    ]))
    expect(m.get('A1')).toEqual([{ date: '1951-02-02', precision: 11, rank: 'PreferredRank' }])
  })
  it('verifies day precision exactly, year precision by year', () => {
    const dobs = extractDobs(resp([binding('A1', '1950-06-15', 11), binding('A2', '1960-01-01', 9)]))
    const errs = verifyBirthdays(
      [
        { bioguide: 'A1', name: 'A One', birthday: '1950-06-15' },
        { bioguide: 'A2', name: 'A Two', birthday: '1960-09-30' },
      ],
      dobs,
    )
    expect(errs).toEqual([])
  })
  it('reports mismatches, missing entries, and ambiguity', () => {
    const dobs = extractDobs(resp([
      binding('A1', '1950-06-16', 11),
      binding('A3', '1970-01-01', 11),
      binding('A3', '1971-01-01', 11),
    ]))
    const errs = verifyBirthdays(
      [
        { bioguide: 'A1', name: 'A One', birthday: '1950-06-15' },
        { bioguide: 'A2', name: 'A Two', birthday: '1960-09-30' },
        { bioguide: 'A3', name: 'A Three', birthday: '1970-01-01' },
      ],
      dobs,
    )
    expect(errs).toHaveLength(3)
    expect(errs[0]).toContain('1950-06-16')
    expect(errs[1]).toContain('not found')
    expect(errs[2]).toContain('multiple')
  })
})
```

- [ ] **Step 3: Run to verify failure** — `npx vitest run scripts/pipeline/wikidata.test.ts` → FAIL.

- [ ] **Step 4: Implement** (`scripts/pipeline/wikidata.ts`)

```ts
import { USER_AGENT } from './http'

export const WDQS = 'https://query.wikidata.org/sparql'

export interface WdDob { date: string; precision: number; rank: string }

export function buildSparql(bioguides: string[]): string {
  return `SELECT ?bioguide ?dob ?precision ?rank WHERE {
  VALUES ?bioguide { ${bioguides.map((b) => JSON.stringify(b)).join(' ')} }
  ?person wdt:P1157 ?bioguide .
  ?person p:P569 ?st .
  ?st psv:P569 ?v .
  ?v wikibase:timeValue ?dob ; wikibase:timePrecision ?precision .
  ?st wikibase:rank ?rank .
}`
}

export function extractDobs(resp: any): Map<string, WdDob[]> {
  const map = new Map<string, WdDob[]>()
  for (const b of resp.results.bindings) {
    const rank = String(b.rank.value).split('#').pop() ?? ''
    if (rank === 'DeprecatedRank') continue
    const id = b.bioguide.value
    const rows = map.get(id) ?? []
    rows.push({ date: b.dob.value.slice(0, 10), precision: Number(b.precision.value), rank })
    map.set(id, rows)
  }
  for (const [id, rows] of map) {
    const preferred = rows.filter((r) => r.rank === 'PreferredRank')
    const use = preferred.length ? preferred : rows
    const seen = new Set<string>()
    map.set(id, use.filter((r) => {
      const k = `${r.date}|${r.precision}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    }))
  }
  return map
}

export function verifyBirthdays(
  members: { bioguide: string; name: string; birthday: string }[],
  dobs: Map<string, WdDob[]>,
): string[] {
  const errs: string[] = []
  for (const m of members) {
    const rows = dobs.get(m.bioguide)
    if (!rows?.length) { errs.push(`${m.bioguide} ${m.name}: not found in Wikidata`); continue }
    if (rows.length > 1) { errs.push(`${m.bioguide} ${m.name}: multiple Wikidata birth dates (${rows.map((r) => r.date).join(', ')}) — resolve manually`); continue }
    const w = rows[0]
    const len = w.precision >= 11 ? 10 : w.precision === 10 ? 7 : 4
    if (w.date.slice(0, len) !== m.birthday.slice(0, len)) {
      errs.push(`${m.bioguide} ${m.name}: roster ${m.birthday} vs Wikidata ${w.date} (precision ${w.precision})`)
    }
  }
  return errs
}

export async function fetchWikidataDobs(bioguides: string[]): Promise<Map<string, WdDob[]>> {
  const url = `${WDQS}?format=json&query=${encodeURIComponent(buildSparql(bioguides))}`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' } })
  if (!res.ok) throw new Error(`Wikidata query failed: HTTP ${res.status}`)
  return extractDobs(await res.json())
}
```

- [ ] **Step 5: Run to verify pass** — `npx vitest run scripts/pipeline/wikidata.test.ts` → PASS.

- [ ] **Step 6: Live smoke test**

Run: `npx tsx -e "import('./scripts/pipeline/wikidata.ts').then(async (w) => console.log(await w.fetchWikidataDobs(['G000386','O000172'])))"`
Expected: Map with G000386 → 1933-09-17 (precision 11), O000172 → 1989-10-13.

- [ ] **Step 7: Commit**

```bash
git add scripts/pipeline/http.ts scripts/pipeline/wikidata.* && git commit -m "feat: batched Wikidata birth-date cross-verification"
```

---

### Task 7: Portrait fetching

**Files:**
- Create: `scripts/pipeline/photos.ts`, `scripts/pipeline/photos.test.ts`, `scripts/pipeline/photo-overrides.json`

**Interfaces:**
- Consumes: `Fetched`, `Fetcher`, `httpGet` from Task 6's `http.ts`.
- Produces: `PRIMARY(id): string`, `FALLBACK(id): string`, `resolvePhoto(id: string, overrides: Record<string, string>, get: Fetcher): Promise<Buffer>`. Orchestrator (Task 10) pipes the Buffer through sharp to `public/images/members/{id}-320.webp` and `-160.webp`.

- [ ] **Step 1: Write failing tests** (`scripts/pipeline/photos.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import type { Fetched } from './http'
import { FALLBACK, PRIMARY, resolvePhoto } from './photos'

const jpeg = (tag: string): Fetched => ({ status: 200, contentType: 'image/jpeg', body: Buffer.from(tag) })
const miss: Fetched = { status: 404, contentType: 'text/html', body: Buffer.from('<html>not found</html>') }
const fake = (routes: Record<string, Fetched>) => async (url: string) => routes[url] ?? miss

describe('resolvePhoto', () => {
  it('uses primary when available', async () => {
    const buf = await resolvePhoto('X000001', {}, fake({ [PRIMARY('X000001')]: jpeg('primary') }))
    expect(buf.toString()).toBe('primary')
  })
  it('falls back to bioguide on primary 404', async () => {
    const buf = await resolvePhoto('X000001', {}, fake({ [FALLBACK('X000001')]: jpeg('bioguide') }))
    expect(buf.toString()).toBe('bioguide')
  })
  it('rejects 200 responses that are not images (404-as-HTML trap)', async () => {
    const htmlOk: Fetched = { status: 200, contentType: 'text/html', body: Buffer.from('<html>') }
    await expect(
      resolvePhoto('X000001', {}, fake({ [PRIMARY('X000001')]: htmlOk, [FALLBACK('X000001')]: htmlOk })),
    ).rejects.toThrow(/No portrait/)
  })
  it('uses override as last resort', async () => {
    const buf = await resolvePhoto('X000001', { X000001: 'https://example.gov/x.jpg' }, fake({ 'https://example.gov/x.jpg': jpeg('override') }))
    expect(buf.toString()).toBe('override')
  })
  it('throws with actionable message when all sources miss', async () => {
    await expect(resolvePhoto('X000001', {}, fake({}))).rejects.toThrow(/photo-overrides\.json/)
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run scripts/pipeline/photos.test.ts` → FAIL.

- [ ] **Step 3: Implement** (`scripts/pipeline/photos.ts`)

```ts
import type { Fetched, Fetcher } from './http'

export const PRIMARY = (id: string) => `https://unitedstates.github.io/images/congress/450x550/${id}.jpg`
export const FALLBACK = (id: string) => `https://bioguide.congress.gov/photo/${id.toUpperCase()}.jpg`

const isImage = (r: Fetched) => r.status === 200 && (r.contentType ?? '').startsWith('image/')

export async function resolvePhoto(id: string, overrides: Record<string, string>, get: Fetcher): Promise<Buffer> {
  const candidates = [PRIMARY(id), FALLBACK(id), overrides[id]].filter(Boolean) as string[]
  for (const url of candidates) {
    const r = await get(url)
    if (isImage(r)) return r.body
  }
  throw new Error(`No portrait found for ${id} — add an entry to scripts/pipeline/photo-overrides.json`)
}
```

`scripts/pipeline/photo-overrides.json`:
```json
{}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run scripts/pipeline/photos.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/pipeline/photos.* scripts/pipeline/photo-overrides.json && git commit -m "feat: portrait fetching with verified fallback chain"
```

---

### Task 8: Historical averages (1789 → today)

**Files:**
- Create: `scripts/pipeline/historical.ts`, `scripts/pipeline/historical.test.ts`, `scripts/pipeline/__fixtures__/historical-fixture.json`

**Interfaces:**
- Consumes: `STATES_50` (Task 3), `ageYears`/`dobToMs` (Task 2).
- Produces: `conveningDate(n: number): string`, `congressNumber(isoDate: string): number`, `flattenTerms(people: any[]): TermRec[]` with `TermRec = { pid: string; start: string; end: string; type: 'sen' | 'rep'; state: string; dobMs: number | null }`, `computeHistorical(terms: TermRec[], todayIso: string): HistoricalPoint[]`.

- [ ] **Step 1: Write fixture** (`scripts/pipeline/__fixtures__/historical-fixture.json`)

```json
[
  { "id": { "bioguide": "H000001" }, "name": { "first": "Old", "last": "Rep" }, "bio": { "birthday": "1750-01-01" }, "terms": [ { "type": "rep", "start": "1789-03-04", "end": "1791-03-03", "state": "VA", "party": "Pro-Administration" } ] },
  { "id": { "bioguide": "H000002" }, "name": { "first": "No", "last": "Birthday" }, "bio": {}, "terms": [ { "type": "rep", "start": "1789-03-04", "end": "1791-03-03", "state": "PA" } ] },
  { "id": { "bioguide": "H000003" }, "name": { "first": "First", "last": "Senator" }, "bio": { "birthday": "1739-06-15" }, "terms": [ { "type": "sen", "start": "1789-03-04", "end": "1795-03-03", "state": "NY" } ] }
]
```

- [ ] **Step 2: Write failing tests** (`scripts/pipeline/historical.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import raw from './__fixtures__/historical-fixture.json'
import { computeHistorical, congressNumber, conveningDate, flattenTerms } from './historical'

describe('convening dates', () => {
  it('March 4 through the 73rd, January 3 from the 74th', () => {
    expect(conveningDate(1)).toBe('1789-03-04')
    expect(conveningDate(73)).toBe('1933-03-04')
    expect(conveningDate(74)).toBe('1935-01-03')
    expect(conveningDate(119)).toBe('2025-01-03')
  })
  it('congressNumber', () => {
    expect(congressNumber('2026-07-14')).toBe(119)
    expect(congressNumber('1933-02-01')).toBe(72)
    expect(congressNumber('1935-01-03')).toBe(74)
    expect(congressNumber('1789-03-04')).toBe(1)
  })
})

describe('computeHistorical', () => {
  const points = computeHistorical(flattenTerms(raw as any[]), '1795-01-01')
  const at = (n: number) => points.find((p) => p.congress === n)!

  it('covers congresses 1..current', () => {
    expect(points.map((p) => p.congress)).toEqual([1, 2, 3])
  })
  it('1st Congress: one rep aged ~39.2, one senator ~49.7, one missing birthday', () => {
    expect(at(1).houseN).toBe(1)
    expect(at(1).senateN).toBe(1)
    expect(at(1).missingBirthday).toBe(1)
    expect(at(1).houseMean!).toBeCloseTo(39.2, 1)
    expect(at(1).senateMean!).toBeCloseTo(49.7, 1)
    expect(at(1).birthdayCoverage).toBeCloseTo(2 / 3, 5)
  })
  it('2nd Congress: rep terms ended 1791-03-03, senator continues', () => {
    expect(at(2).houseN).toBe(0)
    expect(at(2).houseMean).toBeNull()
    expect(at(2).senateN).toBe(1)
  })
  it('counts each person once per congress even with duplicate terms', () => {
    const dup = flattenTerms(raw as any[])
    dup.push({ ...dup.find((t) => t.pid === 'H000003')! })
    expect(computeHistorical(dup, '1795-01-01').find((p) => p.congress === 1)!.senateN).toBe(1)
  })
})
```

- [ ] **Step 3: Run to verify failure** — `npx vitest run scripts/pipeline/historical.test.ts` → FAIL.

- [ ] **Step 4: Implement** (`scripts/pipeline/historical.ts`)

```ts
import { ageYears, dobToMs } from '../../src/lib/age'
import type { HistoricalPoint } from '../../src/lib/types'
import { STATES_50 } from './parse-members'

export interface TermRec { pid: string; start: string; end: string; type: 'sen' | 'rep'; state: string; dobMs: number | null }

export function conveningDate(n: number): string {
  const year = 1789 + 2 * (n - 1)
  return n <= 73 ? `${year}-03-04` : `${year}-01-03`
}

export function congressNumber(isoDate: string): number {
  let n = Math.max(1, Math.floor((Number(isoDate.slice(0, 4)) - 1789) / 2) + 1)
  while (conveningDate(n + 1) <= isoDate) n++
  while (n > 1 && conveningDate(n) > isoDate) n--
  return n
}

export function flattenTerms(people: any[]): TermRec[] {
  const out: TermRec[] = []
  for (const p of people) {
    const dobMs = p.bio?.birthday ? dobToMs(p.bio.birthday) : null
    for (const t of p.terms) {
      out.push({ pid: p.id.bioguide, start: t.start, end: t.end, type: t.type, state: t.state, dobMs })
    }
  }
  return out
}

export function computeHistorical(terms: TermRec[], todayIso: string): HistoricalPoint[] {
  const points: HistoricalPoint[] = []
  const maxCongress = congressNumber(todayIso)
  for (let n = 1; n <= maxCongress; n++) {
    const conv = conveningDate(n)
    const convMs = dobToMs(conv)
    const seen = new Set<string>()
    let sSum = 0, sN = 0, hSum = 0, hN = 0, missing = 0
    for (const t of terms) {
      if (!(t.start <= conv && conv < t.end)) continue
      if (t.type === 'rep' && !STATES_50.has(t.state)) continue
      if (seen.has(t.pid)) continue
      seen.add(t.pid)
      if (t.dobMs == null) { missing++; continue }
      const age = ageYears(t.dobMs, convMs)
      if (t.type === 'sen') { sSum += age; sN++ } else { hSum += age; hN++ }
    }
    const serving = sN + hN + missing
    points.push({
      congress: n,
      year: Number(conv.slice(0, 4)),
      convening: conv,
      senateMean: sN ? sSum / sN : null,
      houseMean: hN ? hSum / hN : null,
      overallMean: sN + hN ? (sSum + hSum) / (sN + hN) : null,
      senateN: sN,
      houseN: hN,
      missingBirthday: missing,
      birthdayCoverage: serving ? (sN + hN) / serving : 0,
    })
  }
  return points
}
```

Note: historical territorial delegates use non-state codes (e.g. DK, OL), so the `STATES_50` filter excludes them the same way it excludes today's delegates. Members serving before statehood of a current state (e.g. HI territory) are a known, tiny imprecision — documented in Methodology, absorbed by the ±1.5 validation tolerances.

- [ ] **Step 5: Run to verify pass** — `npx vitest run scripts/pipeline/historical.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/pipeline/historical.* scripts/pipeline/__fixtures__/historical-fixture.json && git commit -m "feat: per-Congress average ages since 1789"
```

---

### Task 9: Context lines

**Files:**
- Create: `scripts/pipeline/milestones.ts`, `scripts/pipeline/context-lines.ts`, `scripts/pipeline/context-lines.test.ts`

**Interfaces:**
- Consumes: `dobToMs`, `ageYears`, `MS_PER_YEAR` (Task 2), `monthDayYear` (Task 2), `ContextLine` (Task 3).
- Produces: `MILESTONES: Milestone[]` with `Milestone = { id: string; noun: string; clause: string; date: string; source: string }`; `generateContextLines(meanDobMs: number, voterCount: number): ContextLine[]` — every returned line is true by construction; false candidates are dropped.

- [ ] **Step 1: Write** `scripts/pipeline/milestones.ts` (verified dates — do not alter)

```ts
export interface Milestone { id: string; noun: string; clause: string; date: string; source: string }

export const MILESTONES: Milestone[] = [
  { id: 'ballpoint', noun: 'the first ballpoint pen sold in America', clause: 'the first ballpoint pen went on sale in America', date: '1945-10-29', source: 'TIME; Reynolds Rocket at Gimbels, New York' },
  { id: 'transistor', noun: 'the invention of the transistor', clause: 'the transistor was invented at Bell Labs', date: '1947-12-16', source: 'Computer History Museum' },
  { id: 'polio', noun: 'the polio vaccine announcement', clause: 'the Salk polio vaccine was declared safe and effective', date: '1955-04-12', source: 'University of Michigan School of Public Health' },
  { id: 'sputnik', noun: 'the launch of Sputnik', clause: 'Sputnik reached orbit', date: '1957-10-04', source: 'U.S. State Department, Office of the Historian' },
  { id: 'nasa', noun: 'the founding of NASA', clause: 'NASA was created', date: '1958-07-29', source: 'NASA History Office' },
  { id: 'mlk', noun: 'the March on Washington', clause: 'Dr. King delivered “I Have a Dream”', date: '1963-08-28', source: 'National Archives' },
  { id: 'medicare', noun: 'the creation of Medicare', clause: 'Medicare was signed into law', date: '1965-07-30', source: 'U.S. Senate Historical Office' },
  { id: 'moon', noun: 'the Moon landing', clause: 'Apollo 11 landed on the Moon', date: '1969-07-20', source: 'NASA' },
  { id: 'arpanet', noun: 'the first Internet message', clause: 'the first ARPANET message was sent', date: '1969-10-29', source: 'UCLA Kleinrock Internet History Center' },
  { id: 'wall', noun: 'the fall of the Berlin Wall', clause: 'the Berlin Wall fell', date: '1989-11-09', source: 'U.S. State Department, Office of the Historian' },
  { id: 'web', noun: 'the public debut of the World Wide Web', clause: 'the World Wide Web was announced to the public', date: '1991-08-06', source: 'CERN' },
  { id: 'google', noun: 'the founding of Google', clause: 'Google was incorporated', date: '1998-09-04', source: 'EDN; California incorporation records' },
  { id: 'facebook', noun: 'the launch of Facebook', clause: 'Facebook launched', date: '2004-02-04', source: 'History of Facebook (Wikipedia)' },
  { id: 'iphone', noun: 'the iPhone', clause: 'the iPhone was announced', date: '2007-01-09', source: 'Apple Newsroom' },
]
```

- [ ] **Step 2: Write failing tests** (`scripts/pipeline/context-lines.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { dobToMs } from '../../src/lib/age'
import { generateContextLines } from './context-lines'

describe('context lines', () => {
  const lines1966 = generateContextLines(dobToMs('1966-06-01'), 530)

  it('emits the ballpoint-vs-iPhone line for a 1966 mean', () => {
    expect(lines1966.map((l) => l.text)).toContain(
      'The average member of Congress was born closer to the first ballpoint pen sold in America than the iPhone.',
    )
  })
  it('emits the Apollo 11 age line', () => {
    expect(lines1966.map((l) => l.text)).toContain(
      'The average member of Congress was 3 years old when Apollo 11 landed on the Moon.',
    )
  })
  it('every footnote cites the mean birth date and sources', () => {
    for (const l of lines1966) {
      expect(l.footnote).toContain('June 1, 1966')
      expect(l.footnote).toContain('530')
    }
  })
  it('drops lines whose truth condition fails for a younger Congress', () => {
    const lines1990 = generateContextLines(dobToMs('1990-01-01'), 530)
    const texts = lines1990.map((l) => l.text)
    expect(texts.join(' ')).not.toContain('Apollo 11')
    expect(texts.join(' ')).not.toContain('Sputnik than')
  })
  it('produces at least 6 lines for the real 1966 mean', () => {
    expect(lines1966.length).toBeGreaterThanOrEqual(6)
  })
})
```

- [ ] **Step 3: Run to verify failure** — `npx vitest run scripts/pipeline/context-lines.test.ts` → FAIL.

- [ ] **Step 4: Implement** (`scripts/pipeline/context-lines.ts`)

```ts
import { ageYears, dobToMs } from '../../src/lib/age'
import { monthDayYear } from '../../src/lib/format'
import type { ContextLine } from '../../src/lib/types'
import { MILESTONES, type Milestone } from './milestones'

const byId = new Map(MILESTONES.map((m) => [m.id, m]))
const ms = (id: string): Milestone => {
  const m = byId.get(id)
  if (!m) throw new Error(`unknown milestone ${id}`)
  return m
}

const CLOSER_PAIRS: [string, string][] = [
  ['ballpoint', 'iphone'],
  ['sputnik', 'iphone'],
  ['transistor', 'facebook'],
  ['nasa', 'google'],
  ['polio', 'wall'],
]

const AGE_AT = ['moon', 'arpanet', 'wall', 'web', 'google', 'facebook', 'iphone']

export function generateContextLines(meanDobMsVal: number, voterCount: number): ContextLine[] {
  const lines: ContextLine[] = []
  const meanPhrase = monthDayYear(meanDobMsVal)
  const base = `Based on the mean birth date of the ${voterCount} voting members of Congress: ${meanPhrase}.`
  const fmt = (m: Milestone) => `${m.noun[0].toUpperCase()}${m.noun.slice(1)}: ${monthDayYear(dobToMs(m.date))} (${m.source}).`

  for (const [aId, bId] of CLOSER_PAIRS) {
    const a = ms(aId); const b = ms(bId)
    const da = Math.abs(meanDobMsVal - dobToMs(a.date))
    const db = Math.abs(dobToMs(b.date) - meanDobMsVal)
    if (da < db) {
      lines.push({
        text: `The average member of Congress was born closer to ${a.noun} than ${b.noun}.`,
        footnote: `${base} ${fmt(a)} ${fmt(b)}`,
      })
    }
  }

  for (const id of AGE_AT) {
    const m = ms(id)
    const yrs = Math.floor(ageYears(meanDobMsVal, dobToMs(m.date)))
    if (yrs >= 1) {
      lines.push({
        text: `The average member of Congress was ${yrs} years old when ${m.clause}.`,
        footnote: `${base} ${fmt(m)}`,
      })
    }
  }

  return lines
}
```

- [ ] **Step 5: Run to verify pass** — `npx vitest run scripts/pipeline/context-lines.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/pipeline/milestones.ts scripts/pipeline/context-lines.* && git commit -m "feat: computed, self-verifying context lines"
```

---

### Task 10: Pipeline orchestrator + first real data run

**Files:**
- Create: `scripts/pipeline/build-data.ts`
- Generate + commit: `src/data/congress.json`, `src/data/historical.json`, `src/data/context-lines.json`, `public/images/members/*.webp`

**Interfaces:**
- Consumes: everything from Tasks 2–9.
- Produces: the three JSON data files. `congress.json` shape:
  `{ generatedAt: string(ISO), congress: number, overall: ChamberStats, senate: ChamberStats, house: ChamberStats, notes: { senateVacancies: number, houseVacancies: number, houseDelegatesExcluded: number, excludedNoBirthday: string[] }, oldest: { senate: MemberCard[], house: MemberCard[] }, youngest: { senate: MemberCard[], house: MemberCard[] }, histogram: { birthYear: number, party: Party, chamber: Chamber }[] }`
  `historical.json` = `HistoricalPoint[]`; `context-lines.json` = `ContextLine[]`. Photos at `/images/members/{bioguide}-320.webp` and `-160.webp`.

- [ ] **Step 1: Implement** (`scripts/pipeline/build-data.ts`)

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { ageYears } from '../../src/lib/age'
import type { Member } from '../../src/lib/types'
import { generateContextLines } from './context-lines'
import { computeHistorical, congressNumber, flattenTerms } from './historical'
import { httpGet } from './http'
import overrides from './photo-overrides.json'
import { parseMembers } from './parse-members'
import { resolvePhoto } from './photos'
import { chamberStats, overallStats, rankOldest, rankYoungest, withRanks } from './stats'
import { fetchWikidataDobs, verifyBirthdays } from './wikidata'

const CURRENT_URL = 'https://unitedstates.github.io/congress-legislators/legislators-current.json'
const HISTORICAL_URL = 'https://unitedstates.github.io/congress-legislators/legislators-historical.json'

function gate(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`GATE FAILED: ${msg}`)
}
const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol

async function main() {
  const nowMs = Date.now()
  const nowIso = new Date(nowMs).toISOString()
  const today = nowIso.slice(0, 10)

  console.log('Fetching rosters…')
  const currentRaw = (await (await fetch(CURRENT_URL)).json()) as any[]
  const historicalRaw = (await (await fetch(HISTORICAL_URL)).json()) as any[]

  const { members, excludedNoBirthday } = parseMembers(currentRaw)
  const senate = chamberStats(members, 'senate')
  const house = chamberStats(members, 'house')
  const overall = overallStats(members)

  gate(senate.count >= 95 && senate.count <= 100, `senate count ${senate.count}`)
  gate(house.count >= 420 && house.count <= 435, `house voting count ${house.count}`)
  const meanAge = ageYears(overall.meanDobMs, nowMs)
  gate(meanAge > 50 && meanAge < 70, `implausible overall mean age ${meanAge.toFixed(2)}`)
  gate(excludedNoBirthday.length <= 5, `too many missing birthdays: ${excludedNoBirthday.join(', ')}`)

  const oldest = { senate: withRanks(rankOldest(members, 'senate')), house: withRanks(rankOldest(members, 'house')) }
  const youngest = { senate: withRanks(rankYoungest(members, 'senate')), house: withRanks(rankYoungest(members, 'house')) }
  const ranked = [...new Map(
    [...oldest.senate, ...oldest.house, ...youngest.senate, ...youngest.house].map((m) => [m.bioguide, m]),
  ).values()]

  console.log(`Cross-verifying ${ranked.length} birth dates against Wikidata…`)
  const errs = verifyBirthdays(ranked, await fetchWikidataDobs(ranked.map((m) => m.bioguide)))
  gate(errs.length === 0, `birth-date verification failed:\n  ${errs.join('\n  ')}`)

  console.log('Fetching portraits…')
  await mkdir('public/images/members', { recursive: true })
  for (const m of ranked) {
    const buf = await resolvePhoto(m.bioguide, overrides as Record<string, string>, httpGet)
    await sharp(buf).resize(320, 391, { fit: 'cover' }).webp({ quality: 82 }).toFile(`public/images/members/${m.bioguide}-320.webp`)
    await sharp(buf).resize(160, 196, { fit: 'cover' }).webp({ quality: 82 }).toFile(`public/images/members/${m.bioguide}-160.webp`)
  }

  console.log('Computing 1789→today averages…')
  const historical = computeHistorical(flattenTerms([...historicalRaw, ...currentRaw]), today)
  const at = (n: number) => historical.find((p) => p.congress === n)!
  gate(close(at(119).senateMean!, 63.9, 1.5), `119th senate ${at(119).senateMean?.toFixed(2)} vs CRS 63.9`)
  gate(close(at(119).houseMean!, 57.9, 1.5), `119th house ${at(119).houseMean?.toFixed(2)} vs CRS 57.9`)
  gate(close(at(66).overallMean!, 51.7, 1.5), `66th overall ${at(66).overallMean?.toFixed(2)} vs 538 51.7`)
  gate(close(at(97).overallMean!, 49.5, 1.5), `97th overall ${at(97).overallMean?.toFixed(2)} vs 538 49.5`)
  gate(historical.filter((p) => p.congress >= 31).every((p) => p.birthdayCoverage >= 0.9), 'post-1849 birthday coverage below 90%')

  const contextLines = generateContextLines(overall.meanDobMs, overall.count)
  gate(contextLines.length >= 4, `only ${contextLines.length} context lines generated`)

  const toCard = (m: Member & { rank: number }) => ({ ...m, photo: `/images/members/${m.bioguide}-320.webp` })
  const siteData = {
    generatedAt: nowIso,
    congress: congressNumber(today),
    overall,
    senate,
    house,
    notes: {
      senateVacancies: 100 - senate.count,
      houseVacancies: 435 - house.count,
      houseDelegatesExcluded: members.filter((m) => m.chamber === 'house' && !m.isVoting).length,
      excludedNoBirthday,
    },
    oldest: { senate: oldest.senate.map(toCard), house: oldest.house.map(toCard) },
    youngest: { senate: youngest.senate.map(toCard), house: youngest.house.map(toCard) },
    histogram: members.filter((m) => m.isVoting).map((m) => ({ birthYear: Number(m.birthday.slice(0, 4)), party: m.party, chamber: m.chamber })),
  }

  await mkdir('src/data', { recursive: true })
  await writeFile('src/data/congress.json', JSON.stringify(siteData, null, 2))
  await writeFile('src/data/historical.json', JSON.stringify(historical, null, 2))
  await writeFile('src/data/context-lines.json', JSON.stringify(contextLines, null, 2))
  console.log(`OK — ${overall.count} voting members, mean age ${meanAge.toFixed(2)}, ${ranked.length} portraits, ${contextLines.length} context lines, ${historical.length} congresses`)
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Full test suite green** — `npm test` → all files PASS.

- [ ] **Step 3: Run the pipeline for real**

Run: `npm run pipeline`
Expected (as of July 2026 — numbers drift slightly with date and membership):
- `OK — ~530 voting members, mean age ~60.1, ~40 portraits, 10+ context lines, 119 congresses`
- All gates pass. If the Wikidata gate fails, inspect the diff — a genuine upstream discrepancy must be resolved (fix `photo-overrides.json` is NOT the fix for DOBs; investigate which source is right, report to the user).
- `src/data/congress.json` exists; spot-check: `oldest.senate[0].bioguide === 'G000386'` (Grassley), `youngest.house[0].bioguide === 'F000477'` or current youngest (Frost).
- `public/images/members/` contains 2 webp files per ranked member.

- [ ] **Step 4: Commit generated data**

```bash
git add scripts/pipeline/build-data.ts src/data public/images/members && git commit -m "feat: pipeline orchestrator; first verified data snapshot"
```

---

### Task 11: Design foundation & page shell

**Files:**
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`
- Create: `src/components/Section.tsx`, `.claude/launch.json`

**Interfaces:**
- Consumes: `src/data/congress.json` (Task 10).
- Produces: page shell rendering placeholder sections in final order; `Section({ title, children, footnote? })` wrapper (hairline rule + small-caps title); dev server preview config.

**Note:** Load the `frontend-design` skill before working on Tasks 11–18. The design language: broadsheet restraint, warm paper, hairline rules, Newsreader serif, generous whitespace, party colors only.

- [ ] **Step 1: Create `.claude/launch.json`**

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "age-of-congress", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 3000 }
  ]
}
```

- [ ] **Step 2: Implement Section wrapper** (`src/components/Section.tsx`)

```tsx
export function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rule mt-14 pt-6">
      <h2 className="smallcaps text-sm text-[var(--ink-soft)]">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  )
}
```

- [ ] **Step 3: Wire the shell** (`src/app/page.tsx`)

```tsx
import { Section } from '@/components/Section'

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24">
      {/* Hero (Task 13) */}
      {/* ContextStrip (Task 13) */}
      <Section title="The Two Chambers">{/* ChamberSplit (Task 14) */}</Section>
      <Section title="The Rankings">{/* Rankings (Task 15) */}</Section>
      <Section title="The Shape of Congress">{/* Histogram (Task 16) */}</Section>
      <Section title="The Long View">{/* HistoryChart (Task 17) */}</Section>
      <Section title="Methodology">{/* Methodology (Task 18) */}</Section>
    </main>
  )
}
```

- [ ] **Step 4: Verify in browser** — start the `age-of-congress` preview, confirm paper background, Newsreader renders, section rules visible, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/app src/components .claude/launch.json && git commit -m "feat: page shell with broadsheet section styling"
```

---

### Task 12: Clock component

**Files:**
- Create: `src/components/useNow.ts`, `src/components/Clock.tsx`

**Interfaces:**
- Consumes: `agePartsAt` (Task 2).
- Produces: `useNow(enabled?: boolean): number` — one shared rAF loop for every clock on the page; `<Clock dobMs decimals dim baselineMs className />` — renders `int.fracfrac…` with the last `dim` digits at 40% opacity, per-digit fixed width (`.digit` class), truncated never rounded, `suppressHydrationWarning`, reduced-motion freeze with an sr-only “as of” note.

- [ ] **Step 1: Implement `useNow`** (`src/components/useNow.ts`)

```tsx
'use client'
import { useSyncExternalStore } from 'react'

let now = Date.now()
const subs = new Set<() => void>()
let raf = 0

function loop() {
  now = Date.now()
  for (const cb of subs) cb()
  raf = requestAnimationFrame(loop)
}

function subscribe(cb: () => void) {
  subs.add(cb)
  if (subs.size === 1) raf = requestAnimationFrame(loop)
  return () => {
    subs.delete(cb)
    if (subs.size === 0) cancelAnimationFrame(raf)
  }
}

const noop = () => () => {}

export function useNow(enabled = true): number {
  return useSyncExternalStore(enabled ? subscribe : noop, () => now, () => 0)
}
```

- [ ] **Step 2: Implement `Clock`** (`src/components/Clock.tsx`)

```tsx
'use client'
import { useEffect, useState } from 'react'
import { agePartsAt } from '@/lib/age'
import { useNow } from './useNow'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

function Digits({ s, dimmed = false }: { s: string; dimmed?: boolean }) {
  return (
    <>
      {[...s].map((c, i) => (
        <span key={i} className="digit" style={dimmed ? { opacity: 0.4 } : undefined}>{c}</span>
      ))}
    </>
  )
}

export function Clock({ dobMs, decimals, dim = 2, baselineMs, className }: {
  dobMs: number
  decimals: number
  dim?: number
  baselineMs: number
  className?: string
}) {
  const reduced = usePrefersReducedMotion()
  const live = useNow(!reduced)
  const [frozen] = useState(() => Date.now())
  const now = reduced ? frozen : live || baselineMs
  const { int, frac } = agePartsAt(dobMs, now, decimals)
  return (
    <span className={`tnum ${className ?? ''}`} suppressHydrationWarning>
      {int}
      <span>.</span>
      <Digits s={frac.slice(0, decimals - dim)} />
      <Digits s={frac.slice(decimals - dim)} dimmed />
      {reduced && <span className="sr-only"> (static — motion reduced)</span>}
    </span>
  )
}
```

- [ ] **Step 3: Temporary smoke render** — drop `<Clock dobMs={Date.UTC(1966, 5, 1)} decimals={8} dim={3} baselineMs={Date.now()} className="text-6xl" />` into `page.tsx`, verify in browser: last digits tick fast, no horizontal jitter, no hydration warnings in console. Remove after verifying.

- [ ] **Step 4: Commit**

```bash
git add src/components/Clock.tsx src/components/useNow.ts && git commit -m "feat: shared-ticker Clock with dimmed fast digits and reduced-motion freeze"
```

---

### Task 13: Hero + context strip

**Files:**
- Create: `src/components/Hero.tsx`, `src/components/ContextStrip.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `congress.json`, `population.json`, `context-lines.json`, `Clock`, `ordinal`, `ageYears`.
- Produces: `<Hero />` (server), `<ContextStrip lines={ContextLine[]} />` (client).

- [ ] **Step 1: Implement Hero** (`src/components/Hero.tsx`)

```tsx
import data from '@/data/congress.json'
import population from '@/data/population.json'
import { ageYears } from '@/lib/age'
import { ordinal } from '@/lib/format'
import { Clock } from './Clock'

export function Hero() {
  const baselineMs = Date.parse(data.generatedAt)
  const meanAge = ageYears(data.overall.meanDobMs, baselineMs)
  const delta = Math.round(meanAge - population.adultMeanAge18)
  return (
    <header className="pt-24 pb-10 text-center">
      <p className="smallcaps text-lg text-[var(--ink-soft)]">How old is Congress?</p>
      <div className="mt-4 text-[clamp(3.5rem,13vw,9rem)] font-medium leading-none">
        <Clock dobMs={data.overall.meanDobMs} decimals={8} dim={3} baselineMs={baselineMs} />
      </div>
      <p className="mt-3 text-xl italic text-[var(--ink-soft)]">years old, on average</p>
      <p className="mx-auto mt-6 max-w-xl text-base text-[var(--ink-soft)]">
        The average voting member of the {ordinal(data.congress)} Congress is about {delta} years older than
        the average American adult.<sup>†</sup>
      </p>
    </header>
  )
}
```

- [ ] **Step 2: Implement ContextStrip** (`src/components/ContextStrip.tsx`)

```tsx
'use client'
import { useEffect, useState } from 'react'
import type { ContextLine } from '@/lib/types'

export function ContextStrip({ lines }: { lines: ContextLine[] }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches || paused) return
    const t = setInterval(() => setI((v) => (v + 1) % lines.length), 8000)
    return () => clearInterval(t)
  }, [paused, lines.length])
  const line = lines[i]
  return (
    <div
      className="rule mx-auto max-w-2xl cursor-pointer py-6 text-center"
      onClick={() => setI((v) => (v + 1) % lines.length)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="button"
      aria-label="Show another fact"
      title={line.footnote}
    >
      <p className="text-lg italic">
        {line.text}
        <sup className="not-italic text-[var(--ink-soft)]">‡</sup>
      </p>
      <p className="smallcaps mt-2 text-xs text-[var(--ink-soft)]">
        {i + 1} of {lines.length} — click for another
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Wire into page** — in `page.tsx`: `import contextLines from '@/data/context-lines.json'`, render `<Hero />` then `<ContextStrip lines={contextLines} />` above the sections.

- [ ] **Step 4: Verify in browser** — hero number ticks with dimmed tail; strip rotates every 8 s, click advances, hover pauses; footnote appears as tooltip.

- [ ] **Step 5: Commit**

```bash
git add src/components/Hero.tsx src/components/ContextStrip.tsx src/app/page.tsx && git commit -m "feat: hero clock and rotating computed context strip"
```

---

### Task 14: Chamber split

**Files:**
- Create: `src/components/ChamberSplit.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `congress.json`, `Clock`, `ageYears`.
- Produces: `<ChamberSplit />` (server) — two columns, each: chamber name, 7-decimal clock, median age (1 decimal, static), “based on N sitting members” count line, oldest-member thumbnail + name.

- [ ] **Step 1: Implement** (`src/components/ChamberSplit.tsx`)

```tsx
import data from '@/data/congress.json'
import { ageYears } from '@/lib/age'
import { Clock } from './Clock'

function Chamber({ label, stats, oldest, countLine }: {
  label: string
  stats: { meanDobMs: number; medianDobMs: number }
  oldest: { name: string; photo: string; birthday: string }
  countLine: string
}) {
  const baselineMs = Date.parse(data.generatedAt)
  const median = ageYears(stats.medianDobMs, baselineMs).toFixed(1)
  return (
    <div className="text-center">
      <h3 className="smallcaps text-base text-[var(--ink-soft)]">{label}</h3>
      <div className="mt-2 text-[clamp(2rem,6vw,3.5rem)] font-medium leading-none">
        <Clock dobMs={stats.meanDobMs} decimals={7} dim={2} baselineMs={baselineMs} />
      </div>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">median {median} · {countLine}</p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <img src={oldest.photo.replace('-320', '-160')} alt={oldest.name} width={40} height={49} className="rounded-sm" />
        <p className="text-sm">
          Oldest: <span className="font-medium">{oldest.name}</span>, b. {oldest.birthday.slice(0, 4)}
        </p>
      </div>
    </div>
  )
}

export function ChamberSplit() {
  return (
    <div className="grid gap-12 sm:grid-cols-2">
      <Chamber
        label="The Senate"
        stats={data.senate}
        oldest={data.oldest.senate[0]}
        countLine={`based on ${data.senate.count} sitting senators`}
      />
      <Chamber
        label="The House"
        stats={data.house}
        oldest={data.oldest.house[0]}
        countLine={`based on ${data.house.count} voting representatives`}
      />
    </div>
  )
}
```

- [ ] **Step 2: Wire into page** (inside the “The Two Chambers” Section) and verify in browser: both clocks tick, counts read “99 sitting senators” / “431 voting representatives” (current values), thumbnails load.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChamberSplit.tsx src/app/page.tsx && git commit -m "feat: senate/house split with live chamber clocks"
```

---

### Task 15: Rankings

**Files:**
- Create: `src/components/Rankings.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `congress.json` (`oldest`, `youngest` MemberCard arrays), `Clock`, `ordinal`.
- Produces: `<Rankings />` — two columns (Senators / Representatives). Each: “The Ten Oldest …” list (photo 56×68, rank, name, party–state colored chip, 7-decimal clock, “first elected YYYY · N terms”), then “…and the ten youngest” compact strip (photo 28×34, same fields, smaller).

- [ ] **Step 1: Implement** (`src/components/Rankings.tsx`)

```tsx
import data from '@/data/congress.json'
import { Clock } from './Clock'

type Card = (typeof data.oldest.senate)[number]

const PARTY_VAR: Record<string, string> = { D: 'var(--dem)', R: 'var(--rep)', I: 'var(--ind)' }

function partyState(m: Card): string {
  const district = m.district !== undefined && m.district !== null
    ? `-${m.district === 0 ? 'AL' : m.district}` : ''
  return `${m.party}–${m.state}${district}`
}

function Row({ m, compact = false }: { m: Card; compact?: boolean }) {
  const baselineMs = Date.parse(data.generatedAt)
  const img = compact ? m.photo.replace('-320', '-160') : m.photo
  return (
    <li className="flex items-center gap-3 py-2" style={{ borderTop: '1px solid var(--rule)' }}>
      <span className="w-5 text-right text-sm text-[var(--ink-soft)]">{m.rank}</span>
      <img src={img} alt={m.name} width={compact ? 28 : 56} height={compact ? 34 : 68} className="rounded-sm" />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${compact ? 'text-sm' : ''}`}>{m.name}</p>
        <p className="text-xs text-[var(--ink-soft)]">
          <span style={{ color: PARTY_VAR[m.party] }} className="font-semibold">{partyState(m)}</span>
          {' · '}first elected {m.firstElectedYear} · {m.termsServed} {m.termsServed === 1 ? 'term' : 'terms'}
        </p>
      </div>
      <span className={`${compact ? 'text-sm' : 'text-lg'} font-medium`}>
        <Clock dobMs={m.dobMs} decimals={7} dim={2} baselineMs={baselineMs} />
      </span>
    </li>
  )
}

function ChamberColumn({ title, oldest, youngest }: { title: string; oldest: Card[]; youngest: Card[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xl font-semibold">{title}</h3>
      <ol>{oldest.map((m) => <Row key={m.bioguide} m={m} />)}</ol>
      <h4 className="smallcaps mt-8 mb-2 text-sm text-[var(--ink-soft)]">…and the ten youngest</h4>
      <ol>{youngest.map((m) => <Row key={m.bioguide} m={m} compact />)}</ol>
    </div>
  )
}

export function Rankings() {
  return (
    <div className="grid gap-12 md:grid-cols-2">
      <ChamberColumn title="The Ten Oldest Senators" oldest={data.oldest.senate} youngest={data.youngest.senate} />
      <ChamberColumn title="The Ten Oldest Representatives" oldest={data.oldest.house} youngest={data.youngest.house} />
    </div>
  )
}
```

- [ ] **Step 2: Wire into page and verify in browser** — 40 rows render with photos; every age ticks; Grassley tops the Senate list; party chips colored; mobile (375 px) stacks to one column without truncated clocks.

- [ ] **Step 3: Commit**

```bash
git add src/components/Rankings.tsx src/app/page.tsx && git commit -m "feat: oldest/youngest ranked lists with live per-member clocks"
```

---

### Task 16: Histogram — “The Shape of Congress”

**Files:**
- Create: `src/lib/histogram.ts`, `src/lib/histogram.test.ts`, `src/components/Histogram.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `congress.json.histogram`, `population.json`.
- Produces: `binByAge(entries: { birthYear: number; party: Party; chamber: Chamber }[], atYear: number): HistoBin[]` with `HistoBin = { label: string; min: number; counts: { D: number; R: number; I: number } }` (bins 25–29 … 90–94); `silhouetteCounts(bins: PopulationBin-like[], memberTotal: number, minAge: number): number[]` (population counts rescaled so their sum equals `memberTotal`, bins below `minAge` zeroed); `dotPositions(count: number, perRow: number): { col: number; row: number }[]`; `<Histogram />` client component with All/Senate/House toggle and gray population silhouette.

- [ ] **Step 1: Write failing tests** (`src/lib/histogram.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { binByAge, dotPositions, silhouetteCounts } from './histogram'

describe('histogram helpers', () => {
  it('bins members by age at the given year', () => {
    const bins = binByAge(
      [
        { birthYear: 1997, party: 'D', chamber: 'house' },   // 29 → 25–29
        { birthYear: 1966, party: 'R', chamber: 'house' },   // 60 → 60–64
        { birthYear: 1933, party: 'R', chamber: 'senate' },  // 93 → 90–94
      ],
      2026,
    )
    expect(bins.find((b) => b.label === '25–29')!.counts.D).toBe(1)
    expect(bins.find((b) => b.label === '60–64')!.counts.R).toBe(1)
    expect(bins.find((b) => b.label === '90–94')!.counts.R).toBe(1)
    expect(bins).toHaveLength(14)
  })
  it('scales population counts to the member total and respects minAge', () => {
    const pop = [
      { min: 25, count: 100 },
      { min: 30, count: 300 },
    ]
    expect(silhouetteCounts(pop, 40, 25)).toEqual([10, 30])
    expect(silhouetteCounts(pop, 30, 30)).toEqual([0, 30])
  })
  it('lays out dots left-to-right, bottom-up', () => {
    expect(dotPositions(5, 2)).toEqual([
      { col: 0, row: 0 }, { col: 1, row: 0 },
      { col: 0, row: 1 }, { col: 1, row: 1 },
      { col: 0, row: 2 },
    ])
  })
})
```

- [ ] **Step 2: Run to verify failure**, then implement (`src/lib/histogram.ts`)

```ts
import type { Chamber, Party } from './types'

export interface HistoBin { label: string; min: number; counts: Record<Party, number> }

export function binByAge(
  entries: { birthYear: number; party: Party; chamber: Chamber }[],
  atYear: number,
): HistoBin[] {
  const bins: HistoBin[] = []
  for (let min = 25; min <= 90; min += 5) {
    bins.push({ label: `${min}–${min + 4}`, min, counts: { D: 0, R: 0, I: 0 } })
  }
  for (const e of entries) {
    const age = atYear - e.birthYear
    const bin = bins.find((b) => age >= b.min && age < b.min + 5)
    if (bin) bin.counts[e.party]++
  }
  return bins
}

export function silhouetteCounts(
  pop: { min: number; count: number }[],
  memberTotal: number,
  minAge: number,
): number[] {
  const eligible = pop.map((b) => (b.min >= minAge ? b.count : 0))
  const total = eligible.reduce((a, b) => a + b, 0)
  return eligible.map((c) => (total ? (c / total) * memberTotal : 0))
}

export function dotPositions(count: number, perRow: number): { col: number; row: number }[] {
  return Array.from({ length: count }, (_, i) => ({ col: i % perRow, row: Math.floor(i / perRow) }))
}
```

Run: `npx vitest run src/lib/histogram.test.ts` → PASS.

- [ ] **Step 3: Implement component** (`src/components/Histogram.tsx`)

```tsx
'use client'
import { useState } from 'react'
import data from '@/data/congress.json'
import population from '@/data/population.json'
import { binByAge, dotPositions, silhouetteCounts } from '@/lib/histogram'
import type { Chamber, Party } from '@/lib/types'

const PARTY_VAR: Record<Party, string> = { D: 'var(--dem)', R: 'var(--rep)', I: 'var(--ind)' }
const VIEWS = [
  { key: 'all', label: 'All of Congress', minAge: 25 },
  { key: 'senate', label: 'Senate', minAge: 30 },
  { key: 'house', label: 'House', minAge: 25 },
] as const

const PER_ROW = 6
const DOT = 7      // px between dot centers
const R = 2.6      // dot radius
const BIN_W = 50   // px per bin column
const H = 260      // plot height
const PAD = 24

export function Histogram() {
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('all')
  const cfg = VIEWS.find((v) => v.key === view)!
  const atYear = new Date(data.generatedAt).getUTCFullYear()
  const entries = (data.histogram as { birthYear: number; party: Party; chamber: Chamber }[])
    .filter((e) => view === 'all' || e.chamber === view)
  const bins = binByAge(entries, atYear)
  const silhouette = silhouetteCounts(population.bins.filter((b) => b.min <= 90), entries.length, cfg.minAge)
  const width = bins.length * BIN_W + PAD * 2

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className="smallcaps rounded-full border px-3 py-1 text-sm"
            style={{
              borderColor: 'var(--rule)',
              background: view === v.key ? 'var(--ink)' : 'transparent',
              color: view === v.key ? 'var(--paper)' : 'var(--ink)',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${H + 40}`} className="min-w-[640px]" role="img"
          aria-label={`Age distribution of ${cfg.label} members versus the US adult population`}>
          {/* population silhouette (steps) */}
          <path
            d={silhouette
              .map((c, i) => {
                const rows = c / PER_ROW
                const x = PAD + i * BIN_W
                const y = H - rows * DOT
                return `${i === 0 ? 'M' : 'L'} ${x} ${y} L ${x + BIN_W} ${y}`
              })
              .join(' ') + ` L ${PAD + silhouette.length * BIN_W} ${H} L ${PAD} ${H} Z`}
            fill="var(--rule)"
            opacity="0.55"
          />
          {/* member dots */}
          {bins.map((bin, bi) => {
            const dots: { party: Party }[] = [
              ...Array.from({ length: bin.counts.D }, () => ({ party: 'D' as Party })),
              ...Array.from({ length: bin.counts.I }, () => ({ party: 'I' as Party })),
              ...Array.from({ length: bin.counts.R }, () => ({ party: 'R' as Party })),
            ]
            return dotPositions(dots.length, PER_ROW).map((p, di) => (
              <circle
                key={`${bi}-${di}`}
                cx={PAD + bi * BIN_W + 6 + p.col * DOT}
                cy={H - 4 - p.row * DOT}
                r={R}
                fill={PARTY_VAR[dots[di].party]}
              />
            ))
          })}
          {/* x labels */}
          {bins.map((bin, bi) => (
            <text key={bin.label} x={PAD + bi * BIN_W + (PER_ROW * DOT) / 2} y={H + 18}
              textAnchor="middle" fontSize="10" fill="var(--ink-soft)">{bin.label}</text>
          ))}
          <text x={PAD} y={H + 34} fontSize="10" fill="var(--ink-soft)">
            Age. Gray silhouette: US adults {cfg.minAge}+ (Census {population.asOf.slice(0, 4)}), scaled to {entries.length} members.
          </text>
        </svg>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire into page and verify in browser** — dots cluster in the 55–79 range, the silhouette’s mass sits visibly younger, toggle re-renders, under-40 bins nearly empty. Confirm horizontal scroll on mobile rather than page overflow.

- [ ] **Step 5: Commit**

```bash
git add src/lib/histogram.* src/components/Histogram.tsx src/app/page.tsx && git commit -m "feat: member-dot age histogram with US adult population silhouette"
```

---

### Task 17: “The Long View” historical chart

**Files:**
- Create: `src/lib/chart.ts`, `src/lib/chart.test.ts`, `src/components/HistoryChart.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `historical.json` (`HistoricalPoint[]`), `congress.json` (for the live “today” marker), `ageYears`.
- Produces: `scaleLinear(d0, d1, r0, r1): (v: number) => number`, `linePath(pts: { x: number; y: number }[]): string`; `<HistoryChart />` (server component, static SVG).

- [ ] **Step 1: Write failing tests** (`src/lib/chart.test.ts`)

```ts
import { expect, it } from 'vitest'
import { linePath, scaleLinear } from './chart'

it('scaleLinear maps domain to range', () => {
  const s = scaleLinear(0, 10, 0, 100)
  expect(s(0)).toBe(0)
  expect(s(5)).toBe(50)
  expect(s(10)).toBe(100)
})
it('linePath builds M/L path', () => {
  expect(linePath([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('M 1 2 L 3 4')
  expect(linePath([])).toBe('')
})
```

- [ ] **Step 2: Run to verify failure, then implement** (`src/lib/chart.ts`)

```ts
export function scaleLinear(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  return (v) => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0)
}

export function linePath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}`).join(' ')
}
```

Run: `npx vitest run src/lib/chart.test.ts` → PASS.

- [ ] **Step 3: Implement component** (`src/components/HistoryChart.tsx`)

```tsx
import congress from '@/data/congress.json'
import historical from '@/data/historical.json'
import { ageYears } from '@/lib/age'
import { linePath, scaleLinear } from '@/lib/chart'
import type { HistoricalPoint } from '@/lib/types'

const W = 760, H = 380, M = { top: 24, right: 96, bottom: 40, left: 40 }

export function HistoryChart() {
  const points = historical as HistoricalPoint[]
  const x = scaleLinear(1789, 2027, M.left, W - M.right)
  const y = scaleLinear(40, 70, H - M.bottom, M.top)
  const solid = (p: HistoricalPoint) => p.birthdayCoverage >= 0.9

  const seg = (chamber: 'senateMean' | 'houseMean', wantSolid: boolean) =>
    linePath(points
      .filter((p) => p[chamber] !== null && solid(p) === wantSolid || (wantSolid === false && p[chamber] !== null && !solid(p)))
      .filter((p) => p[chamber] !== null && (solid(p) === wantSolid))
      .map((p) => ({ x: x(p.year), y: y(p[chamber]!) })))

  const last = points[points.length - 1]
  const baselineMs = Date.parse(congress.generatedAt)
  const todaySenate = ageYears(congress.senate.meanDobMs, baselineMs)
  const todayHouse = ageYears(congress.house.meanDobMs, baselineMs)
  const modernLow = points.filter((p) => p.year >= 1900).reduce((a, b) => ((a.overallMean ?? 99) < (b.overallMean ?? 99) ? a : b))

  return (
    <figure>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px]" role="img"
          aria-label="Average age of each Congress at its first convening, 1789 to today">
          {[40, 45, 50, 55, 60, 65, 70].map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth="1" />
              <text x={M.left - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--ink-soft)">{v}</text>
            </g>
          ))}
          {[1800, 1850, 1900, 1950, 2000].map((v) => (
            <text key={v} x={x(v)} y={H - M.bottom + 16} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">{v}</text>
          ))}
          {/* pre-1850 low-coverage segments drawn lighter */}
          <path d={seg('senateMean', false)} fill="none" stroke="var(--ink)" strokeWidth="1.4" opacity="0.3" strokeDasharray="3 3" />
          <path d={seg('houseMean', false)} fill="none" stroke="var(--ink-soft)" strokeWidth="1.4" opacity="0.3" strokeDasharray="3 3" />
          <path d={seg('senateMean', true)} fill="none" stroke="var(--ink)" strokeWidth="1.8" />
          <path d={seg('houseMean', true)} fill="none" stroke="var(--ink-soft)" strokeWidth="1.8" />
          {/* annotations */}
          <circle cx={x(modernLow.year)} cy={y(modernLow.overallMean!)} r="3" fill="var(--ink)" />
          <text x={x(modernLow.year)} y={y(modernLow.overallMean!) + 16} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">
            {modernLow.year}: modern low
          </text>
          <text x={x(last.year) + 8} y={y(last.senateMean!)} fontSize="11" fill="var(--ink)">
            Senate {last.senateMean!.toFixed(1)}
          </text>
          <text x={x(last.year) + 8} y={y(last.houseMean!)} fontSize="11" fill="var(--ink-soft)">
            House {last.houseMean!.toFixed(1)}
          </text>
          {/* today's live means */}
          <circle cx={x(2026.5)} cy={y(todaySenate)} r="2.5" fill="var(--ink)" />
          <circle cx={x(2026.5)} cy={y(todayHouse)} r="2.5" fill="var(--ink-soft)" />
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-[var(--ink-soft)]">
        Average age of members serving on each Congress’s first day. Dashed segments: birth dates unknown for
        &gt;10% of members (mostly before 1850). Dots at right: today’s sitting members.
      </figcaption>
    </figure>
  )
}
```

Note: simplify the double-filter in `seg` during implementation — its intent is “one path through solid-coverage points, one through low-coverage points.” Splitting into two helper calls with a single clean filter each is the correct reading.

- [ ] **Step 4: Wire into page and verify in browser** — lines climb from ~50 (1919) to ~64/58 (today), dashed early era visible, annotations legible, no overflow on mobile (horizontal scroll inside the figure).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chart.* src/components/HistoryChart.tsx src/app/page.tsx && git commit -m "feat: 1789-to-today average age chart with coverage-aware rendering"
```

---

### Task 18: Methodology, metadata & OG image

**Files:**
- Create: `src/components/Methodology.tsx`, `src/app/opengraph-image.tsx`, `src/app/icon.svg`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `congress.json`, `population.json`, `MILESTONES` cannot be imported into `src/` from `scripts/` — instead render milestone citations from `context-lines.json` footnotes.
- Produces: Methodology section (the citability layer), data-stamped `<title>`/description, build-time OG image with the current average.

- [ ] **Step 1: Implement Methodology** (`src/components/Methodology.tsx`)

```tsx
import data from '@/data/congress.json'
import population from '@/data/population.json'

export function Methodology() {
  const n = data.notes
  return (
    <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-[var(--ink-soft)]">
      <p>
        Ages are computed from each member’s date of birth, anchored at midnight Eastern Standard Time, using a
        mean Gregorian year of 365.2425 days. The clocks on this page advance in real time; nothing is estimated
        between updates. Averages cover voting members only: senators, and representatives of the fifty states.
        The {n.houseDelegatesExcluded} non-voting delegates and the Resident Commissioner of Puerto Rico are
        excluded. Vacant seats reduce the divisor rather than being imputed — figures are currently based
        on {data.senate.count} sitting senators (of 100 seats) and {data.house.count} voting representatives
        (of 435 seats).
      </p>
      <p>
        Membership, birth dates, party, and term histories come from the{' '}
        <a className="underline" href="https://github.com/unitedstates/congress-legislators">@unitedstates
        congress-legislators dataset</a> (CC0), which is maintained within days of congressional changes; this
        site rebuilds from it daily. The birth date of every member shown by name is additionally cross-checked
        against Wikidata at build time; the site does not publish if the two sources disagree.
      </p>
      <p>
        Historical averages are computed from the same project’s records of the roughly 12,500 people who have
        served since 1789: for each Congress, the mean age of members serving on its constitutional first day
        (March 4 through the 73rd Congress, January 3 thereafter). Birth dates are unknown for about 18% of
        members who served before 1850 — those members are excluded and affected years are drawn lighter. From
        1850 onward, coverage exceeds 99%. Values were validated against Congressional Research Service figures
        for recent Congresses and FiveThirtyEight’s member-level dataset (66th–118th Congresses).
      </p>
      <p>
        <sup>†</sup> Population comparison uses the {population.source} (as of {population.asOf}); “average
        American adult” is the mean age of residents 18 and older ({population.adultMeanAge18} years).
        <sup> ‡</sup> Context-line milestone dates and sources appear on each line (hover or tap).
      </p>
      <p>
        Portraits are official congressional photographs (public domain), courtesy of the U.S. Senate Historical
        Office and the Collection of the U.S. House of Representatives, via the{' '}
        <a className="underline" href="https://github.com/unitedstates/images">@unitedstates images project</a>.
      </p>
      <p className="smallcaps">
        Built by <a className="underline" href="https://annasrahman.com">Annas Rahman</a> · updated daily ·
        generated {data.generatedAt.slice(0, 10)}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Data-stamp metadata** — replace the `metadata` export in `src/app/layout.tsx`:

```tsx
import data from '@/data/congress.json'
import { ageYears } from '@/lib/age'

const avg = ageYears(data.overall.meanDobMs, Date.parse(data.generatedAt)).toFixed(1)

export const metadata: Metadata = {
  metadataBase: new URL('https://ageofcongress.com'),
  title: 'The Age of Congress',
  description: `How old is Congress? ${avg} years on average, and counting. Live averages for the Senate and House, the oldest and youngest members, and the view back to 1789.`,
}
```

- [ ] **Step 3: OG image** (`src/app/opengraph-image.tsx`)

```tsx
import { ImageResponse } from 'next/og'
import data from '@/data/congress.json'
import { agePartsAt } from '@/lib/age'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  const { int, frac } = agePartsAt(data.overall.meanDobMs, Date.parse(data.generatedAt), 4)
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#faf9f4', color: '#1c1a16' }}>
        <div style={{ fontSize: 36, letterSpacing: 6, textTransform: 'uppercase', color: '#57534a' }}>How old is Congress?</div>
        <div style={{ fontSize: 220, fontWeight: 500, display: 'flex' }}>{int}.{frac}</div>
        <div style={{ fontSize: 32, fontStyle: 'italic', color: '#57534a' }}>years old, on average — ageofcongress.com</div>
      </div>
    ),
    size,
  )
}
```

- [ ] **Step 4: Favicon** (`src/app/icon.svg`) — a paper square with an ink clock hand:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#1c1a16"/>
  <circle cx="16" cy="16" r="10" fill="none" stroke="#faf9f4" stroke-width="2"/>
  <line x1="16" y1="16" x2="16" y2="9" stroke="#faf9f4" stroke-width="2" stroke-linecap="round"/>
  <line x1="16" y1="16" x2="21" y2="19" stroke="#faf9f4" stroke-width="2" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 5: Wire Methodology into page; build and verify**

Run: `npm run build`
Expected: static export succeeds; `out/opengraph-image.png` exists; page title carries the average.

- [ ] **Step 6: Commit**

```bash
git add src/components/Methodology.tsx src/app && git commit -m "feat: methodology, stamped metadata, OG image, favicon"
```

---

### Task 19: Full browser verification & polish pass

**Files:**
- Modify: any component/style files needing fixes (no new features).

**Interfaces:** none — this is a verification gate.

**Load the `frontend-design` skill for the polish portion.**

- [ ] **Step 1:** `npm test` → green; `npm run build` → clean.
- [ ] **Step 2:** Start the `age-of-congress` preview. Check console for errors/hydration warnings (must be zero) and network tab for 404s (must be zero).
- [ ] **Step 3:** Desktop (1280): screenshot; verify hero digits tick without layout jitter (watch 5 s), chamber clocks and all 40 row clocks tick, context strip rotates/clicks, histogram toggle works, chart annotations legible.
- [ ] **Step 4:** Mobile (375): screenshot; single column, no horizontal page scroll (figures scroll internally), clocks fit.
- [ ] **Step 5:** Reduced motion: in the preview console run `matchMedia` emulation is unavailable — instead verify by running the dev server and toggling macOS “Reduce motion”, or temporarily hardcode `usePrefersReducedMotion` to `true` and confirm frozen clocks + no auto-rotate, then revert.
- [ ] **Step 6:** Typographic/design polish with fresh eyes: spacing rhythm between sections, rule weights, clock optical alignment (decimal point spacing), party-color contrast on paper (must pass AA for small text — check `#2f6bb3`/`#bf3b30` on `#faf9f4`).
- [ ] **Step 7:** Fix anything found; re-verify; screenshot final desktop + mobile for the user.
- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "polish: verification pass fixes"
```

---

### Task 20: Ship — GitHub, Vercel, daily refresh, domain

**Files:**
- Create: `README.md`, `.github/workflows/daily-data.yml`

⚠️ **HARD CHECKPOINTS: Steps 3, 4, and 6 are outward-facing. Each requires explicit user confirmation in chat before running. Do not proceed past them autonomously.**

- [ ] **Step 1: README** (`README.md`)

```markdown
# The Age of Congress

The live average age of the United States Congress — ageofcongress.com.

A static Next.js site. All clocks are client-side math from baked-in birth dates; a daily
GitHub Action re-runs the data pipeline (roster → verification → portraits → history) and
commits the result, which triggers a redeploy.

- Data: [@unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators) (CC0)
- Portraits: official congressional photos via [@unitedstates/images](https://github.com/unitedstates/images) (public domain)
- Birth dates of all listed members are cross-checked against Wikidata at build time; mismatches fail the build
- Population baseline: U.S. Census Bureau NC-EST2025

`npm run pipeline` refreshes data · `npm run dev` serves · `npm test` runs the suite.

Built by [Annas Rahman](https://annasrahman.com).
```

- [ ] **Step 2: Workflow** (`.github/workflows/daily-data.yml`)

```yaml
name: daily-data
on:
  schedule:
    - cron: '0 10 * * *'   # 10:00 UTC ≈ 6 am ET, daily
  workflow_dispatch: {}
permissions:
  contents: write
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run pipeline
      - name: Commit if changed
        run: |
          git config user.name "age-of-congress-bot"
          git config user.email "actions@github.com"
          git add src/data public/images/members
          git diff --cached --quiet || { git commit -m "data: daily refresh $(date -u +%F)"; git push; }
```

Commit both: `git add README.md .github && git commit -m "chore: README and daily data-refresh workflow"`

- [ ] **Step 3 (CHECKPOINT — ask user): Create public GitHub repo** under their account (GitHub user: DevRush) and push `main`. Suggested: `gh repo create age-of-congress --public --source . --push`.
- [ ] **Step 4 (CHECKPOINT — ask user): Deploy to Vercel** — link the repo as a new Vercel project (framework preset: Next.js; no env vars). Verify the production URL renders and clocks tick.
- [ ] **Step 5: Verify the GitHub Action** — trigger `workflow_dispatch` once; confirm it runs green and pushes nothing (no data change) or a clean data commit.
- [ ] **Step 6 (CHECKPOINT — ask user): Domain** — hand the user the checkout link for `ageofcongress.com` (~$11.25/yr via Vercel domains; they must purchase it themselves). After purchase, attach the domain to the Vercel project and verify HTTPS + OG preview (e.g. via an OG checker).
- [ ] **Step 7:** Final live verification: production URL on desktop + mobile, screenshot for the user, confirm daily cron is scheduled.

---

## Self-review notes (completed)

- **Spec coverage:** hero clock (T13), 8-decimal math (T2/T12), context lines (T9/T13), chamber split w/ vacancies footnote (T14), oldest+youngest rankings w/ photo/party/state/first-elected/terms/live clocks (T15), histogram w/ population overlay (T16), 1789 chart w/ coverage handling (T17), methodology/citability (T18), reduced motion (T12/T13/T19), OG image (T18), verification-fails-build (T6/T10), portrait fallback chain (T7), daily rebuild (T20), domain-as-user-checkout (T20), ties share rank (T4), delegates excluded (T3), missing birthdays reported (T3/T10).
- **Known simplification to watch:** `seg()` in Task 17 Step 3 contains a redundant double-filter — implementer should simplify per the inline note.
- **Type consistency:** `ChamberStats { meanDobMs, medianDobMs, count, seats }` used in T4/T10/T13/T14; `MemberCard = Member & { rank, photo }` produced in T10 `toCard`, consumed in T14/T15; `HistoricalPoint` produced T8, consumed T17. Names verified consistent.

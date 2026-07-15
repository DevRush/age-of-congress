# The Age of Congress — Design Spec

**Date:** 2026-07-14
**Status:** Approved by Annas (verbal design approval in brainstorming session)
**Site:** `ageofcongress.com` (domain available at $11.25/yr via Vercel; purchase deferred to launch, requires Annas's checkout)
**Working title:** The Age of Congress. Hero kicker poses the question "How old is Congress?"

## 1. Concept

A one-page, NYT-graphics-desk-caliber website that displays the live-ticking average age
of the United States Congress, in the tradition of the National Debt Clock. Tone is
**deadpan data journalism**: restrained newspaper design, neutral copy, absurdly precise
numbers. The ticking number does the alarming; the copy never editorializes.

The high bar: something the New York Times visual desk could have published, credible
enough for press to cite.

### Explicitly rejected directions
- Doomsday-clock advocacy framing (dark/urgent design, thesis-stating copy)
- Dry satire framing (congress.wtf energy)
- Name "How Old Is Congress?" as the site title — `howoldiscongress.com` is occupied by a
  stale Senate-only age table (last updated March 2023). We keep the question as the hero
  kicker only.

## 2. Page structure (top to bottom)

### 2.1 Hero
- Small-caps kicker: *How old is Congress?*
- The answer, enormous: e.g. **72.49301287** — with "years, on average" set quietly beneath.
- **8 decimal places.** Rationale: average age advances at exactly 1 year/year, so decimal
  speeds are fixed: 6th decimal ticks every ~32 s (too slow), 8th ~3×/s, 9th ~30×/s.
  Eight decimals gives an actively-moving final digit; trailing fast digits are rendered
  slightly smaller/dimmer so they read as instrument precision, not noise.
- One deadpan dek line, computed where possible, e.g. "The average member of the 119th
  Congress is N years older than the average American adult."

### 2.2 Context strip
- A rotating, computed factoid line with footnote marker, e.g. (illustrative) "The
  average member of Congress was born in early 1958 — closer to the debut of the
  ballpoint pen than the iPhone." Actual mean birth date comes from the data.
- Generated at build time from the live mean birth date compared against a curated,
  independently verified milestone timeline (moon landing, transistor, iPhone launch,
  founding of NASA, etc.). Because lines are derived from data, they remain true as
  membership changes; any line whose truth condition fails is dropped automatically.
- Rotates roughly every 8 seconds and on click/tap.

### 2.3 Chamber split
- Two columns: **Senate** and **House**.
- Each shows: its own ticking average (7 decimals — at 4 the last digit would move only
  every ~53 minutes), sitting-member count, median age, and the chamber's oldest member
  (thumbnail + name).
- Footnotes handle vacancies and delegate exclusions (see §5).

### 2.4 Rankings
- "The Ten Oldest Senators" and "The Ten Oldest Representatives", news-list treatment.
- Each row: portrait photo, name, party + state/district (D blue / R red / I gray),
  **individually ticking age** (e.g. 91.4302818), first-elected year, terms served in
  small type.
- Beneath each list, a compact mirrored strip: "…and the ten youngest" — smaller rows,
  same fields. The visual contrast between the two is the argument.

### 2.5 The shape of Congress (distribution)
- Histogram: every sitting member as one dot, stacked by birth decade (or 5-year bins if
  visually better), colored by party, with a Senate/House toggle.
- Gray silhouette overlay: the US adult population age distribution (Census data), so the
  empty under-40 range and the 65–80 mass are immediately legible.

### 2.6 The long view (historical chart)
- Line chart, 1789 → today: average age of each Congress **at its first convening**,
  computed by us from the historical legislators dataset (~12,500 members).
- Senate and House as two lines; annotated notable peaks/troughs.
- This module tests the "oldest in history" claim with our own computation. Whatever the
  data says, we print it.

### 2.7 Methodology footer
- Age computation convention, data source + link, update cadence, exclusions (delegates,
  vacancies, missing birth dates), historical coverage percentages, photo licensing note
  (official portraits, public domain), site author credit.
- This section is what makes the site citable by journalists.

## 3. Design language

- Newspaper restraint: warm off-white ground, near-black ink, hairline rules between
  sections like a broadsheet. Generous whitespace.
- One serif display family (Newsreader or Source Serif 4 — free, NYT-adjacent).
  **Tabular figures for every clock** so ticking digits don't jitter horizontally.
- Party colors (D blue / R red / I gray) are the only saturated hues on the page.
- Motion discipline: only digits move. `prefers-reduced-motion` renders static numbers
  with an "as of" timestamp.
- Fully responsive; mobile stacks to a single column. Rankings rows compress gracefully.
- Dynamically generated OG/social image stamped with the current average age at build
  time, so link shares look alive.

## 4. Clock mechanics

- Ages are pure client-side math from baked-in birth dates:
  `age_years = (now − dob) / (365.2425 × 86 400 000 ms)`.
- Recomputed every animation frame (throttled to digit-change granularity); nothing is
  fetched at runtime, so displayed ages can never drift or go stale between rebuilds.
- Convention (documented in methodology): birth dates anchored at 00:00 US Eastern;
  Gregorian mean year (365.2425 days).
- Averages are computed client-side as mean of member ages, so the hero number, chamber
  numbers, and individual clocks are always mutually consistent.

## 5. Data pipeline & edge cases

### Sources
- **Membership, DOB, party, state, terms:** `unitedstates/congress-legislators`
  (`legislators-current`, `legislators-historical`) — the canonical open dataset news
  orgs build on.
- **Portraits:** `unitedstates/images` repo, keyed by bioguide ID (official congressional
  portraits, public domain). Downloaded and self-hosted, optimized to ~2 sizes.
- **US population age distribution:** Census Bureau published tables (static, refreshed
  manually if ever).

### Build-time pipeline
1. Fetch current legislators; derive per-member: name, DOB, party, chamber,
   state/district, first-elected year, terms served, bioguide ID.
2. Fetch/refresh portraits for members appearing in ranked lists (top/bottom 10 per
   chamber) plus chamber-oldest thumbnails.
3. **Cross-verification stage:** the ~40 ranked members' birth dates are automatically
   checked against a second independent source (Congress.gov member pages or Wikidata,
   joined on bioguide ID); any mismatch **fails the build** rather than publishing a
   wrong number on a face of the site.
4. Compute historical per-Congress averages once from `legislators-historical`, with
   birth-date coverage stats per Congress; exclude missing-DOB members and report
   coverage % in methodology.
5. Emit a single versioned JSON blob consumed by the static site.

### Edge cases (decided)
- **Vacant seats:** averages over sitting members only; footnote shows live count
  ("based on 99 sitting senators").
- **Non-voting delegates** (DC, territories, resident commissioner): excluded from House
  averages; noted in methodology.
- **Missing/disputed birth dates:** member excluded from averages, flagged in
  methodology (currently rare-to-none among sitting members).
- **Ranking ties:** older-first by exact birth date; same-day ties share a rank.

## 6. Stack & operations

- **Framework:** Next.js (App Router), fully static output; Tailwind CSS.
- **Repo:** `~/Projects/AgeOfCongress`; deployed on Vercel (same setup as Annas's other
  projects).
- **Refresh:** daily scheduled rebuild (GitHub Action cron → Vercel deploy hook) re-runs
  the pipeline, so deaths/resignations/swearings-in appear within 24 h, hands-off.
- **Domain:** `ageofcongress.com` attached at launch. Purchase (~$11.25/yr) is Annas's
  explicit checkout step — never auto-purchased.
- **Performance:** lazy-loaded images (~40 portraits total), no runtime data fetching,
  Lighthouse-clean target.

## 7. Testing & verification

- Pipeline unit tests: age math (leap years, DST boundaries, the 00:00 ET convention),
  ranking/tie logic, delegate/vacancy exclusion, context-line truth conditions.
- Build fails on: verification mismatches (§5.3), missing portraits for ranked members,
  empty/malformed upstream data.
- Visual verification in browser (all breakpoints + reduced-motion) before any deploy.
- Historical chart spot-checked against published third-party figures (e.g. recent
  Congresses' reported average ages) before the "oldest in history" claim is worded.

## 8. Out of scope for v1

- Per-member detail pages; search; state filtering.
- Email/social bots (e.g. daily age tweet) — natural follow-on, not v1.
- Comparisons to other countries' legislatures — strong v2 candidate.
- Any paid data source or API key dependency.

# Two Research-Driven Additions — Design Spec

**Date:** 2026-07-16
**Status:** Proposed — awaiting Annas's approval
**Context:** The site currently *documents* that Congress is old. It does not explain **why**,
and it does not acknowledge the strongest counter-evidence to its own implied narrative. These
two additions fix both. Together they are what would move the site from "a clock" to
"a piece of journalism."

---

## A. "They Got Old Together" — extend The Long View (NOT a new section)

### The finding
The Congress-vs-country age gap **has not widened**. It was ≈ **+19.0 in 1981** and ≈ **+17.9
in 2024**, oscillating in a narrow band with no trend. The House aged **8.0 years**; the country
aged **9.1**. Congress got older — but so did America, at the same rate.

Related, and equally uncomfortable: the 119th Congress is the **third-oldest**, not the oldest
(only the 2017 and 2021 sessions were older), and it is currently trending slightly *younger* —
Gen X just outnumbered Boomers in the House for the first time.

### Why this belongs on the site
It cuts against our own implied narrative. Publishing it is the single highest-leverage thing we
can do for credibility: a site that surfaces the trend bending against its own thesis is one
journalists cite; a site that hides it is one they debunk. Our Long View chart *already draws*
the 2017/2021 peak — we are currently letting the reader not notice it. Say it out loud.

It also sharpens the real argument rather than weakening it. The claim stops being the lazy
"Congress is getting older and older" (which is contestable) and becomes the sharper **"Congress
has been ~18 years older than the country for half a century, and nothing has moved it"** —
which is both true and worse.

### Design decision: extend, don't append
This should **not** be a tenth section. It is a second line on the chart we already have.
- Add a second series to `HistoryChart`: the **median age of the US population** over the same
  span, drawn in a subordinate weight (the House/Senate lines stay primary).
- **Shade the gap** between the House line and the US line. The visual point is that the shaded
  band keeps roughly constant width while both lines climb.
- Annotate the band once, deadpan: *"The gap in 1981: 19.0 years. In 2024: 17.9."*
- The existing dashed low-coverage treatment and the 1981 modern-low annotation stay.

### Open data question — MUST be resolved before build
The +19.0/+17.9 figures are computed against the **all-ages** US median (which includes
children). The rest of this site deliberately uses the **adult** baseline (~47.5) precisely
because the all-ages framing is dishonest — we already reject "Congress is 60 vs America's 39"
on that ground. Using all-ages here would contradict our own methodology.

Required before implementation:
1. Source a **historical US median age series**. Census publishes decennial + intercensal
   median age; confirm the exact free, keyless URL and vintage coverage (target: 1940→2025,
   the era where our birthday coverage is ≥99%).
2. Determine whether an **adult (18+) median** series is derivable historically. If it is, use
   it — consistent with the rest of the site.
3. If only all-ages is available historically, then **either** (a) plot all-ages and state
   plainly in the caption that this series uses the all-ages median for data-availability
   reasons and that its *level* is therefore not comparable to the site's headline adult
   baseline — only its *trend* is; **or** (b) compute an adult series ourselves from historical
   Census age-distribution tables. Prefer (b) if the data supports it.
4. Whatever is chosen, the gap figures quoted in the annotation must be **recomputed from the
   series we actually plot**, not carried over from the research memo.

### Acceptance
- The chart shows both series with the gap shaded; the band's near-constant width is legible.
- The annotation's gap numbers are computed at build from the plotted series.
- The caption states which median is used and why.
- Methodology gains a row: source, vintage, and the all-ages/adult decision with its rationale.
- The "third-oldest, not oldest" and "currently trending younger" facts appear as a short dek
  under the chart, computed from our own historical data where possible.

---

## B. "Why It Stays Old" — new section

### The finding
Three peer-reviewed results converge on a thesis that inverts the obvious explanation.

1. **It is not that incumbents won't leave.** Turnover has *risen* since 2010 and Congress got
   older anyway. The median age of a **newly elected** House member: **≈39 in 1979 → ≈50.2 in
   2025**. The new members are older. (*The Age Divide* appendix; corroborate against our own
   data — see below.)
2. **It is not that voters want old politicians.** A meta-analysis of 16 conjoint experiments
   across 7 democracies finds voters *mildly prefer younger* candidates. (Eshima & Smith,
   *Journal of Politics* 84(3):1856–1861, 2022.)
3. **It is the nomination pipeline.** Parties nominate few young candidates and place the ones
   they do nominate in unwinnable districts. Of 1,661 candidates in 2020 US House races, primary
   candidates averaged 51.5 and primary *winners* 54. Party gatekeepers, not voter bias, are the
   binding constraint. (Stockemer, Thompson & Sundström, *Electoral Studies*; Stockemer &
   Sundström, *Government and Opposition*, 2023.)
4. **And the money is older than the politicians.** The **median dollar** in federal elections
   comes from a **66-year-old** — older than the median voter, the median candidate, *or* the
   median elected official. Donors give disproportionately to candidates their own age.
   (Bonica & Grumbach, "Old money," *Journal of Public Economics*, 2025.)

### The chart: median age of newly elected House members, by Congress
This is the section's centerpiece and — importantly — **we can compute it ourselves** from data
already in the repo (`legislators-historical` + `legislators-current`, both with full `terms[]`).
That makes it ours, citable, and self-refreshing via the daily cron.

Definition (must be stated in Methodology):
- For each Congress *n*, take members whose **first House term** begins at that Congress.
- "First House term" = the earliest `terms[]` entry with `type: "rep"`. Members who left and
  returned count at their genuine first entry, not their return. Rep→Senator transitions do not
  create a new "new member."
- Age measured **at that Congress's convening date** — consistent with the existing Long View
  convention (do not mix bases; this is the same basis-mismatch trap flagged elsewhere).
- Exclude non-voting delegates (consistent with the rest of the site).
- Report median (the published comparison figures are medians).

**Validation gate:** our computed series must land near the published anchors — **≈39 for 1979**
and **≈50.2 for 2025**. If it does not, STOP and investigate rather than adjusting the gate.
A material mismatch means our "first term" definition differs from theirs, and we need to know
that before publishing.

The chart makes the argument visually: the line climbs even though turnover did not fall. The
people arriving are older than the people who used to arrive.

### The stat that should be big
> **The median dollar in federal elections comes from a 66-year-old.**

Set as a display figure, not buried in prose. It is the most surprising, most explanatory
sentence in the entire research corpus, and it reframes the whole page: the electorate is not
choosing this — the donor base is.

### Copy discipline
- Deadpan; no adjectives doing argumentative work. The findings are strong enough unadorned.
- Every claim carries an inline citation (author, journal, year) — this section is the one most
  likely to be challenged, so it must be the most heavily sourced.
- Explicitly state what is **not** established: no peer-reviewed study isolates a causal
  effect of legislator age on legislative effectiveness. Position (committee chair) dominates.
  We should say so — it is the honest boundary of the argument and pre-empts the obvious
  overreach.
- Do **not** cite the "cognitive decline and political leadership" symposium essay as evidence
  of decline; it is a perspective piece, not an empirical study.

### Placement
After **The Long View** (which now carries finding A), before **Shared Birthdays**.
The page reads: *how old* → *where* → *the shape* → *the history, and the honest caveat* →
**why it stays this way** → *the human beat* → *the closing generational gap*.

### Acceptance
- New-member median series computed from our own data, validated against the ≈39/≈50.2 anchors.
- Four findings, each with an inline citation.
- The 66-year-old-dollar stat set as a display figure.
- The "no causal age→effectiveness finding" boundary stated.
- Methodology gains: the first-House-term definition, the age basis, and full citations.
- Mobile: chart scrolls in its own container; page body never scrolls sideways at 390px.

---

## Sequencing
1. Resolve A's historical-median data question (research task — blocking).
2. Build B's new-member series in the pipeline (self-contained; validate against anchors).
3. Extend `HistoryChart` for A.
4. Build the "Why It Stays Old" section for B.

A is blocked on a data decision; B is not. **Build B first.**

## Explicitly out of scope
- Committee-chair ages (the "seniority machine") — a good future section, not these two.
- The OECD comparison — blocked on the basis-mismatch problem (our 60.1 is a *current* average;
  international figures are measured *at election*; naive comparison inflates the gap ~1.5 yrs)
  and on NonCommercial licensing of both WARP and IPU Parline.
- Age vs missed votes — genuinely novel and free to compute, but a separate project.

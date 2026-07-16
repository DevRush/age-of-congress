# The Gap Finding — resolved, and it inverts

**Date:** 2026-07-16
**Status:** Computed from primary sources. Supersedes the "gap didn't widen" claim in
`2026-07-16-research-sections-design.md` §A.

## The question
A research memo reported that the Congress-vs-country age gap **has not widened** (+19.0 in
1981 → +17.9 in 2024) and proposed publishing it as an honesty note against our own narrative.
Those figures use the **all-ages** US median, which counts children. Our site deliberately uses
an **adult** baseline. So: does the finding survive an adult baseline?

## Answer: no. It inverts.

Computed from Census intercensal data (`E8081RQI.TXT`, quarterly 1980–81 national estimates by
single year of age, downloaded from
`https://www2.census.gov/programs-surveys/popest/datasets/1980-1990/national/asrh/e8081rqi.zip`)
and our own `src/data/historical.json` (mean age at each Congress's convening).

**US median age, Jan 1981 → 2024/25:**

| Baseline | 1981 | 2024/25 | Country aged |
|---|---|---|---|
| All-ages | 30.17 | ~39.1 | **+8.93** |
| Adult 18+ | 39.95 | 47.5 | **+7.55** |
| Adult 25+ | 46.39 | 51.7 | **+5.31** |

(The 2024/25 adult-18+ value of 47.5 triple-converges: NC-EST2025, ACS 2024 1-year, and ACS
2024 5-year independently agree — the same figure the site already publishes.)

**Congress (overall mean at convening): 49.52 (97th, 1981) → 58.58 (119th, 2025) = +9.06.**

**The gap:**

| Baseline | 1981 | 2025 | Change |
|---|---|---|---|
| All-ages | +19.35 | +19.48 | **+0.13 — flat** |
| **Adult 18+** | +9.57 | +11.08 | **+1.51 — widened** |
| **Adult 25+** | +3.13 | +6.88 | **+3.75 — more than doubled** |

House-only shows the same pattern (all-ages −0.30 ≈ flat; adult 18+ +1.08; adult 25+ +3.32).

## Why it inverts
The all-ages median rose **+8.93**, but most of that is the **child share shrinking** (falling
fertility), not adults getting older. The adult population aged only **+7.55**. Congress aged
**+9.06** — *faster than the adults it represents*. The all-ages denominator absorbs the
fertility decline and thereby manufactures a flat gap.

## Consequences

1. **Do NOT publish "the gap didn't widen."** It is true only against a baseline we have
   publicly rejected as dishonest. Printing it would contradict our own methodology and would be
   the single most attackable claim on the site.
2. **Publish the inverse, correctly computed — it is stronger AND honest:**
   > Since 1981 the adult population of the United States aged 7.6 years. Congress aged 9.1.
   > Measured against the people it represents — rather than against a national median that
   > counts children — **the gap has not held steady. It has widened.** Against the population
   > actually eligible to serve in the House, it has more than doubled.
3. **This also pre-empts the top predicted critique** ("Congress didn't get older, America did").
   The answer is now on the page, computed: America's *adults* did not age as fast as Congress
   did; the "America aged too" claim relies on counting children who can neither vote nor serve.
4. **The Long View chart should plot the adult-18+ series**, not all-ages, with the gap shaded —
   and the caption must state which median and why. The all-ages series may be shown as a
   secondary/greyed line *specifically to make this point*, but must never be the basis of the
   headline gap.

## Basis caveats to disclose
- Congress figures are **mean** age at convening; the population figures are **medians**. Mixing
  mean-vs-median is a real basis wrinkle — before publishing, recompute the Congress side as a
  **median at convening** so both sides are medians. The direction of the finding is very
  unlikely to change (mean≈median for Congress: 60.13 vs 60.23 today), but the numbers must be
  internally consistent.
- 1981 population figure is Jan 1981 (matching the 97th's convening); 2025 is NC-EST2025's
  July 1 2025 vintage — footnote the ~6-month offset.
- Data: US Census Bureau intercensal estimates (public domain).

## Files
`/private/tmp/.../scratchpad/research-medage/E8081RQI.TXT` (raw), parsed inline.

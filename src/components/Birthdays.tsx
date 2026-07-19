import birthdays from '@/data/birthdays.json'
import {
  AGE_RAMP,
  ageFill,
  buildCalendar,
  byBirthYear,
  describeChambers,
  describeParties,
  encodeMembers,
  excess,
  formatList,
  formatMd,
  numberWord,
} from '@/lib/birthdays'
import type { BirthdayDay, BirthdayExpected, BirthdayStats } from '@/lib/birthdays'
import { BirthdayReadout } from './BirthdayReadout'

/**
 * "Shared Birthdays" — the one section of this page that is not an indictment.
 *
 * Every figure below is read from the data file at build time; the daily cron
 * moves all of them, so nothing here is written down twice. That includes the
 * busiest day's party split, which an early draft carried as prose and got
 * wrong — it is derived now, and a test holds it to the file.
 *
 * All 366 dates are server-rendered. The only client code is the readout island,
 * which delegates from this grid by id (see BirthdayReadout).
 */

const GRID_ID = 'birthday-calendar'

const days = birthdays.days as BirthdayDay[]
const stats = birthdays.stats as BirthdayStats
const expected = birthdays.expected as BirthdayExpected

// The heat scale (the shared age-intensity amber, starting at one member — zero
// is drawn as absence, not shade) lives in @/lib/birthdays as `ageFill`, beside
// the calendar math and under the same tests. An earlier draft kept a private
// copy here while the lib still carried the rejected violet ramp; one source of
// truth means the swatch legend, the cells, and the tests can never disagree.

/** Column headers every fifth day; 31 numbered columns would be noise. */
const showColumnLabel = (day: number) => day === 1 || day % 5 === 0

const pct = (n: number) => `${Math.round(n * 100)}%`

function Comparison({
  label,
  actual,
  expectedValue,
}: {
  label: string
  actual: number
  expectedValue: number
}) {
  const e = excess(actual, expectedValue)
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-4 py-2 sm:gap-x-8">
      <span className="meta text-[0.8125rem] text-[var(--ink-soft)]">{label}</span>
      <span className="serif tnum text-right text-[1.25rem] font-semibold text-[var(--ink)]">
        {actual}
      </span>
      <span className="serif tnum w-[3ch] text-right text-[1.25rem] text-[var(--ink-faint)]">
        {Math.round(expectedValue)}
      </span>
      <span className="meta tnum w-[4ch] text-right text-[0.8125rem] text-[var(--ink-soft)]">
        +{pct(e.pct)}
      </span>
    </div>
  )
}

export function Birthdays() {
  const rows = buildCalendar(days)

  const peak = days.find((d) => d.md === stats.maxDay.md)
  const peakPeople = peak ? byBirthYear(peak.members) : []
  const peakYears = peakPeople.map((m) => m.birthYear)
  const peakSpan = peakYears.length ? Math.max(...peakYears) - Math.min(...peakYears) : 0

  const sharingShare = pct(stats.membersSharing / stats.totalMembers)

  return (
    <figure className="my-0">
      {/* ── The lede: the paradox, stated flat ──────────────────────────────── */}
      <p className="serif max-w-prose text-[1.25rem] leading-relaxed text-[var(--ink-soft)]">
        There are{' '}
        <strong className="tnum font-semibold text-[var(--ink)]">{stats.totalMembers}</strong>{' '}
        voting members and 366 days to go around.{' '}
        <strong className="tnum font-semibold text-[var(--ink)]">{stats.membersSharing}</strong> of
        them &mdash; {sharingShare} &mdash; share a birthday with at least one colleague. And{' '}
        <strong className="tnum font-semibold text-[var(--ink)]">{stats.emptyDays}</strong> days of
        the year, nearly a third of the calendar, belong to nobody at all.
      </p>

      {/* ── The scale ───────────────────────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap items-start gap-x-9 gap-y-4">
        <div>
          <span className="smallcaps block text-[0.625rem] tracking-[0.14em] text-[var(--ink-faint)]">
            Nobody
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span className="bday-cell bday-swatch bday-empty" aria-hidden />
            <span className="meta tnum text-[0.6875rem] text-[var(--ink-faint)]">
              {stats.emptyDays} days
            </span>
          </div>
        </div>

        <div>
          <span className="smallcaps block text-[0.625rem] tracking-[0.14em] text-[var(--ink-faint)]">
            Members born that day
          </span>
          <div className="mt-2 flex items-center gap-[3px]">
            {AGE_RAMP.map((fill, i) => (
              <span key={fill} className="flex flex-col items-center gap-1">
                <span className="bday-swatch" style={{ background: fill }} aria-hidden />
                <span className="meta tnum text-[0.5625rem] text-[var(--ink-faint)]">{i + 1}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── The calendar ─────────────────────────────────────────────────────
          The scroller is the mobile containment: at 390px the grid keeps its own
          width and pans inside this box rather than widening the page. */}
      <div className="-mx-5 mt-6 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div
          id={GRID_ID}
          className="min-w-[600px] max-w-[740px]"
          role="group"
          aria-label={`Calendar of all 366 possible birthdays, each day shaded by how many members of Congress were born on it. ${stats.emptyDays} days have none; the most crowded is ${formatMd(stats.maxDay.md)}, with ${stats.maxDay.count}.`}
        >
          {/* Day-of-month headers */}
          <div className="grid grid-cols-[2.1rem_repeat(31,1fr)] gap-[2px]">
            <span />
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <span
                key={day}
                aria-hidden
                className="meta tnum text-center text-[0.5625rem] leading-4 text-[var(--ink-faint)]"
              >
                {showColumnLabel(day) ? day : ''}
              </span>
            ))}
          </div>

          {rows.map((row) => (
            <div
              key={row.month}
              className="mt-[2px] grid grid-cols-[2.1rem_repeat(31,1fr)] gap-[2px]"
            >
              <span
                aria-hidden
                className="smallcaps self-center text-[0.5625rem] tracking-[0.1em] text-[var(--ink-faint)]"
              >
                {row.name.slice(0, 3)}
              </span>

              {row.cells.map((cell, i) => {
                // A slot that is not a date at all — February 30, April 31. It is
                // drawn as nothing, which is a different nothing from an empty
                // date: that one is a real day that simply has no one in it.
                if (cell === null) return <span key={i} aria-hidden />

                const fill = ageFill(cell.count)
                const label = formatMd(cell.md)
                const isPeak = cell.md === stats.maxDay.md
                return (
                  <span
                    key={i}
                    role="img"
                    tabIndex={cell.md === '01-01' ? 0 : -1}
                    className={`bday-cell${fill === null ? ' bday-empty' : ''}${isPeak ? ' bday-peak' : ''}`}
                    style={fill === null ? undefined : { background: fill }}
                    data-md={cell.md}
                    data-month={cell.month}
                    data-day={cell.day}
                    data-count={cell.count}
                    data-label={label}
                    data-members={encodeMembers(byBirthYear(cell.members))}
                    aria-label={
                      cell.count === 0
                        ? `${label}, nobody`
                        : `${label}, ${numberWord(cell.count)} ${cell.count === 1 ? 'member' : 'members'}: ${formatList(cell.members.map((m) => m.name))}`
                    }
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <BirthdayReadout
        gridId={GRID_ID}
        membersSharing={stats.membersSharing}
        totalMembers={stats.totalMembers}
        emptyDays={stats.emptyDays}
      />

      {/* ── The busiest day, named ───────────────────────────────────────────── */}
      {peak && peakPeople.length > 0 ? (
        <figcaption className="serif mt-7 max-w-prose text-[1.0625rem] leading-relaxed text-[var(--ink-soft)]">
          The ringed day is{' '}
          <strong className="font-semibold text-[var(--ink)]">{formatMd(peak.md)}</strong>, which{' '}
          {numberWord(peakPeople.length)} members share:{' '}
          {formatList(
            peakPeople.map((m) => m.name),
          )}
          . {describeParties(peakPeople).charAt(0).toUpperCase() + describeParties(peakPeople).slice(1)};{' '}
          {describeChambers(peakPeople)}. Their birth years span {peakSpan} years, from{' '}
          {peakPeople[0].name.split(' ').slice(-1)[0]} in {peakPeople[0].birthYear} to{' '}
          {peakPeople[peakPeople.length - 1].name.split(' ').slice(-1)[0]} in{' '}
          {peakPeople[peakPeople.length - 1].birthYear}.
        </figcaption>
      ) : null}

      {/* ── The second finding: both numbers beat chance ─────────────────────── */}
      {/* Capped rather than full-bleed: at the page's full width the 1fr label
          column strands each figure a screen away from the row it belongs to. */}
      <div className="mt-9 max-w-md rounded-[3px] border border-[var(--surface-line)] bg-[var(--surface)] px-5 py-4">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-4 border-b border-[var(--surface-line)] pb-1.5 sm:gap-x-8">
          <span />
          <span className="smallcaps text-right text-[0.5625rem] tracking-[0.12em] text-[var(--ink-soft)]">
            Actual
          </span>
          <span className="smallcaps w-[3ch] text-right text-[0.5625rem] tracking-[0.12em] text-[var(--ink-faint)]">
            Chance
          </span>
          <span className="w-[4ch]" />
        </div>
        <Comparison
          label="Pairs sharing a birthday"
          actual={stats.sharingPairs}
          expectedValue={expected.expectedSharingPairs}
        />
        <div className="border-t border-[var(--surface-line)]" />
        <Comparison
          label="Days with nobody"
          actual={stats.emptyDays}
          expectedValue={expected.expectedEmptyDays}
        />
      </div>

      <p className="serif mt-6 max-w-prose text-[1.0625rem] leading-relaxed text-[var(--ink-soft)]">
        Both numbers run ahead of chance, and that is the more interesting finding.
        Scatter {stats.totalMembers} birthdays at random and you would expect about{' '}
        {Math.round(expected.expectedSharingPairs)} sharing pairs and about{' '}
        {Math.round(expected.expectedEmptyDays)} empty days. Congress has more of{' '}
        <em>both</em> &mdash; more crowding and more emptiness at the same time, which sounds
        like a contradiction and is not. It is what clustering looks like. Births are not
        spread evenly across the year: they run heavy in late summer and thin around the
        holidays, and a calendar with popular days on it necessarily has unpopular ones too.
        Crowd the peaks and you empty the troughs.
      </p>

      <p className="serif mt-4 max-w-prose text-[1.0625rem] leading-relaxed text-[var(--ink-soft)]">
        {stats.totalMembers} people is far too small a sample to prove any of that. This is a
        pattern consistent with the seasonality demographers have measured in U.S. births for
        decades &mdash; not evidence of it, and not a fact about Congress. It is one of the
        few things on this page that is not.
      </p>
    </figure>
  )
}

import { ImageResponse } from 'next/og'
import data from '@/data/congress.json'
import { agePartsAt } from '@/lib/age'
import { ordinal } from '@/lib/format'

// The shareable front page. Built once at export time and stamped with the
// average age as of the last data run, carried to four decimals with the final
// pair dimmed — the same "still running" gesture the live hero makes. Palette,
// masthead rule, and edition folio are lifted straight from the site so a link
// preview reads as a torn-out clipping of the page itself.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// Bake the PNG at export time; the figure is stamped from the last data run.
export const dynamic = 'force-static'

const PAPER = '#faf9f4'
const INK = '#1c1a16'
const SOFT = '#57534a'
const FAINT = '#b3ad9f'
const RULE = '#e2ded4'

export default function OpengraphImage() {
  const { int, frac } = agePartsAt(data.overall.meanDobMs, Date.parse(data.generatedAt), 4)
  const fracLead = frac.slice(0, 2)
  const fracTail = frac.slice(2)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: PAPER,
          color: INK,
          padding: 44,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: `1px solid ${RULE}`,
            padding: '46px 56px',
          }}
        >
          {/* Masthead */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              paddingBottom: 14,
              borderBottom: `1px solid ${INK}`,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: 11,
              textTransform: 'uppercase',
              color: INK,
            }}
          >
            The Age of Congress
          </div>

          {/* The figure */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                fontSize: 33,
                letterSpacing: 8,
                textTransform: 'uppercase',
                color: SOFT,
              }}
            >
              How old is Congress?
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                marginTop: 6,
                fontSize: 210,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: -3,
              }}
            >
              <span>{int}</span>
              <span>.</span>
              <span>{fracLead}</span>
              <span style={{ color: FAINT }}>{fracTail}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 33, fontStyle: 'italic', color: SOFT }}>
              years old, on average
            </div>
          </div>

          {/* Folio */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                letterSpacing: 5,
                textTransform: 'uppercase',
                color: SOFT,
              }}
            >
              {`${ordinal(data.congress)} United States Congress · ${data.overall.count} voting members`}
            </div>
            <div style={{ marginTop: 12, fontSize: 22, letterSpacing: 2, color: INK }}>
              ageofcongress.com
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}

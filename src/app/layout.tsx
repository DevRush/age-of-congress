import type { Metadata } from 'next'
import { Newsreader } from 'next/font/google'
import data from '@/data/congress.json'
import { ageYears } from '@/lib/age'
import './globals.css'

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700'],
})

// Stamped at build time from the same data the page reads, so the search and
// share preview always carry the current average rather than a frozen figure.
const avg = ageYears(data.overall.meanDobMs, Date.parse(data.generatedAt)).toFixed(1)

export const metadata: Metadata = {
  metadataBase: new URL('https://ageofcongress.com'),
  title: 'The Age of Congress',
  description: `How old is Congress? ${avg} years on average, and counting. Live averages for the Senate and House, the oldest and youngest members, and the view back to 1789.`,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={newsreader.className}>
      <body>{children}</body>
    </html>
  )
}

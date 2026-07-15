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

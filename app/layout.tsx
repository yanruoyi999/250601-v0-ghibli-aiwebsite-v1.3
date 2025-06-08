import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <script defer data-domain="ghibliart.top" src="https://plausible.io/js/script.js"></script>
      <body>{children}</body>
    </html>
  )
}

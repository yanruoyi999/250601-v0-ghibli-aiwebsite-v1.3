import type { Metadata } from 'next'
import './globals.css'
import Script from 'next/script'

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
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
      <body>
        <Script
          strategy="beforeInteractive"
          src="https://plausible.io/js/script.js"
          data-domain="ghibliart.top"
          async
        />
        {children}
      </body>
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
      <Script
        strategy="beforeInteractive"
        src="https://plausible.io/js/script.js"
        data-domain="ghibliart.top"
      />
      <body>{children}</body>
>>>>>>> Stashed changes
    </html>
  )
}

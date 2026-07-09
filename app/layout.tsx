import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://wobleibtmeinzug.de'),
  title: 'Wo bleibt mein Zug? — KI-Bahnauskunft',
  description:
    'Inoffizielle KI-Bahnauskunft in 100+ Sprachen. Frag nach Abfahrten, Verspätungen, Verbindungen und Bahnhofs-Ausstattung. Über Nacht gebaut, Open Source.',
  applicationName: 'Wo bleibt mein Zug?',
  openGraph: {
    title: 'Wo bleibt mein Zug?',
    description:
      'KI-Bahnauskunft in 100+ Sprachen — Open Source, mit europäischem Modell. Über Nacht gebaut.',
    type: 'website',
    locale: 'de_DE',
    url: 'https://wobleibtmeinzug.de',
    siteName: 'Wo bleibt mein Zug?',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wo bleibt mein Zug?',
    description: 'KI-Bahnauskunft in 100+ Sprachen — inoffiziell, Open Source, über Nacht gebaut.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#e2001a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}

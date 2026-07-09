import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wo bleibt mein Zug? — KI-Bahnauskunft',
  description:
    'Inoffizielle KI-Bahnauskunft in 100+ Sprachen. Frag nach Abfahrten, Verspätungen, Verbindungen und Bahnhofs-Ausstattung. Ein Open-Source-Wochenendprojekt.',
  applicationName: 'Wo bleibt mein Zug?',
  openGraph: {
    title: 'Wo bleibt mein Zug?',
    description:
      'KI-Bahnauskunft in 100+ Sprachen — Open Source, mit europäischem Modell. Ein Wochenendprojekt.',
    type: 'website',
    locale: 'de_DE',
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

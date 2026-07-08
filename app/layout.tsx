import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wo bleibt mein Zug? — KI-Bahnauskunft',
  description:
    'Inoffizielle KI-Bahnauskunft in natürlicher Sprache. Frag nach Abfahrten, Verspätungen und Verbindungen. Ein Open-Source-Wochenendprojekt.',
  applicationName: 'Wo bleibt mein Zug?',
  openGraph: {
    title: 'Wo bleibt mein Zug?',
    description:
      'KI-Bahnauskunft in natürlicher Sprache — Open Source, mit europäischem Modell. Ein Wochenendprojekt.',
    type: 'website',
    locale: 'de_DE',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0a0f0d',
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

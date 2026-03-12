import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { AttributionCapture } from '@/components/attribution-capture';
import { ABTestCapture } from '@/components/ab-test-capture';

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://austriaimperial.com"),
  title: {
    default: 'Austria Imperial — Green Gold',
    template: '%s | Austria Imperial',
  },
  description:
    'Premium Steirisches Kürbiskernöl g.g.A. — authentische österreichische Spezialitäten direkt vom Erzeuger.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Austria Imperial — Green Gold',
    description:
      'Premium Steirisches Kürbiskernöl g.g.A. — authentische österreichische Spezialitäten direkt vom Erzeuger.',
    locale: 'de_AT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Austria Imperial — Green Gold',
    description:
      'Premium Steirisches Kürbiskernöl g.g.A. — authentische österreichische Spezialitäten direkt vom Erzeuger.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark">
      <body className={`${playfair.variable} ${inter.variable} antialiased grain`}>
        <Suspense fallback={null}>
          <AttributionCapture />
          <ABTestCapture />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

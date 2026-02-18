import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { ShopShell } from '@/components/layout/shop-shell';

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
  title: {
    default: 'Austria Imperial — Green Gold',
    template: '%s | Austria Imperial',
  },
  description:
    'Premium Steirisches Kürbiskernöl g.g.A. und Steirischer Kren — authentische österreichische Spezialitäten direkt vom Erzeuger.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Austria Imperial — Green Gold',
    description:
      'Premium Steirisches Kürbiskernöl g.g.A. und Steirischer Kren — authentische österreichische Spezialitäten direkt vom Erzeuger.',
    images: [{ url: '/images/logo.png', width: 512, height: 512, alt: 'Austria Imperial Green Gold' }],
    locale: 'de_AT',
    type: 'website',
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
        <ShopShell>{children}</ShopShell>
      </body>
    </html>
  );
}

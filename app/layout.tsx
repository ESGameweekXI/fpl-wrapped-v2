import type { Metadata } from 'next';
import { Sora, Roboto } from 'next/font/google';
import './globals.css';
import '@/styles/wrapped.css';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FPL Wrapped',
  description: 'A fun look back on your FPL season',
  icons: {
    icon: '/gameweek-logo.png',
    apple: '/gameweek-logo.png',
  },
  openGraph: {
    title: 'FPL Wrapped',
    description: 'A fun look back on your FPL season',
    url: 'https://season.fpl-wrapped.com',
    siteName: 'FPL Wrapped',
    images: [
      {
        url: 'https://season.fpl-wrapped.com/gameweek-logo.png',
        width: 512,
        height: 512,
        alt: 'Gameweek XI',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'FPL Wrapped',
    description: 'A fun look back on your FPL season',
    images: ['https://season.fpl-wrapped.com/gameweek-logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${roboto.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

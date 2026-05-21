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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'FPL Wrapped — Your Season in Review',
  description: 'A fun look back on your FPL season',
  icons: { icon: '/gameweek-logo.png' },
  openGraph: {
    title: 'FPL Wrapped',
    description: 'A fun look back on your FPL season',
    images: [{ url: '/gameweek-logo.png' }],
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

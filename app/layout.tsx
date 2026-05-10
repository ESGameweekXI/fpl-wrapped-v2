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
  title: 'FPL Wrapped — Your Season in Review',
  description:
    'A Spotify Wrapped-style experience for FPL managers. See your season stats, best moments, and FPL personality.',
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

import { Roboto, Roboto_Mono } from 'next/font/google';
import { Suspense } from 'react';
import NavigationHistory from '@/components/NavigationHistory';
import "./globals.css";
import './home.css';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-roboto',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

export const metadata = {
  title: "PSC AI: Rate Your Agents' Performance",
  icons: {
    icon: '/rma-logo.png',
    apple: '/rma-logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${roboto.variable} ${robotoMono.variable}`}>
      <body style={{ fontFamily: 'var(--font-sans)' }}>
        <Suspense fallback={null}>
          <NavigationHistory />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

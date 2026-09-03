import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';

import { ServiceWorkerRegistrar } from '@/components/ServiceWorker';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-core',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tracked — Scan & Track',
  description: 'Photograph a meal, get an AI nutrition estimate, log it against your daily goals.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Tracked',
  appleWebApp: {
    capable: true,
    title: 'Tracked',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

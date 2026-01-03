import type { Metadata, Viewport } from 'next';
import { Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { Toaster } from '@/components/ui/sonner';

// FFF AcidGrotesk local font
const acidGrotesk = localFont({
  src: [
    { path: '../../public/fonts/FFF-AcidGrotesk-UltraLight.otf', weight: '100', style: 'normal' },
    { path: '../../public/fonts/FFF-AcidGrotesk-UltraLightItalic.otf', weight: '100', style: 'italic' },
    { path: '../../public/fonts/FFF-AcidGrotesk-ExtraLight.otf', weight: '200', style: 'normal' },
    { path: '../../public/fonts/FFF-AcidGrotesk-ExtraLightItalic.otf', weight: '200', style: 'italic' },
    { path: '../../public/fonts/FFF-AcidGrotesk-Light.otf', weight: '300', style: 'normal' },
    { path: '../../public/fonts/FFF-AcidGrotesk-LightItalic.otf', weight: '300', style: 'italic' },
    { path: '../../public/fonts/FFF-AcidGrotesk-Regular.otf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/FFF-AcidGrotesk-RegularItalic.otf', weight: '400', style: 'italic' },
    { path: '../../public/fonts/FFF-AcidGrotesk-Book.otf', weight: '450', style: 'normal' },
    { path: '../../public/fonts/FFF-AcidGrotesk-BookItalic.otf', weight: '450', style: 'italic' },
    { path: '../../public/fonts/FFF-AcidGrotesk-Medium.otf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/FFF-AcidGrotesk-MediumItalic.otf', weight: '500', style: 'italic' },
    { path: '../../public/fonts/FFF-AcidGrotesk-Bold.otf', weight: '700', style: 'normal' },
    { path: '../../public/fonts/FFF-AcidGrotesk-BoldItalic.otf', weight: '700', style: 'italic' },
    { path: '../../public/fonts/FFF-AcidGrotesk-ExtraBold.otf', weight: '800', style: 'normal' },
    { path: '../../public/fonts/FFF-AcidGrotesk-ExtraBoldItalic.otf', weight: '800', style: 'italic' },
    { path: '../../public/fonts/FFF-AcidGrotesk-Black.otf', weight: '900', style: 'normal' },
    { path: '../../public/fonts/FFF-AcidGrotesk-BlackItalic.otf', weight: '900', style: 'italic' },
  ],
  variable: '--font-acid-grotesk',
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Frinder - Find Your Match',
  description: 'Connect with people who share your interests. Swipe, match, and meet new people!',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Frinder'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ed8c00'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${acidGrotesk.variable} ${geistMono.variable} font-sans antialiased`}>
        <AuthProvider>
          <SettingsProvider>
            {children}
            <Toaster position='top-center' />
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

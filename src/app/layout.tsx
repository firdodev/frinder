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
    { path: '../../public/fonts/FFF-AcidGrotesk-BlackItalic.otf', weight: '900', style: 'italic' }
  ],
  variable: '--font-acid-grotesk',
  display: 'swap'
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

// Comprehensive SEO Metadata - Facebook/Instagram level
export const metadata: Metadata = {
  // Basic metadata
  title: {
    default: 'Frinder - Find Friends & Meaningful Connections',
    template: '%s | Frinder'
  },
  description:
    'Frinder is the #1 social app for finding friends and meaningful connections. Swipe, match, chat, and meet new people who share your interests. Join millions discovering friendships today!',
  keywords: [
    'dating app',
    'find friends',
    'social networking',
    'meet people',
    'dating',
    'friendship app',
    'match making',
    'swipe app',
    'social app',
    'connect with people',
    'frinder',
    'new friends',
    'relationship app',
    'chat app',
    'meet singles',
    'online dating',
    'friendship',
    'meaningful connections'
  ],
  authors: [{ name: 'Frinder', url: 'https://frinder.co' }],
  creator: 'Frinder',
  publisher: 'Frinder',

  // Canonical URL
  metadataBase: new URL('https://frinder.co'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US'
    }
  },

  // Open Graph (Facebook, LinkedIn, WhatsApp, etc.)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://frinder.co',
    siteName: 'Frinder',
    title: 'Frinder - Find Friends & Meaningful Connections',
    description:
      'Join millions on Frinder! The #1 app for finding friends and meaningful connections. Swipe, match, and chat with people who share your interests.',
    images: [
      {
        url: 'https://frinder.co/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Frinder - Find Friends & Meaningful Connections',
        type: 'image/png'
      }
    ]
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    site: '@frinder',
    creator: '@frinder',
    title: 'Frinder - Find Friends & Meaningful Connections',
    description:
      'Join millions on Frinder! The #1 app for finding friends and meaningful connections. Swipe, match, and chat with people who share your interests.',
    images: ['https://frinder.co/og-image.png']
  },

  // App Links
  appLinks: {
    ios: {
      url: 'https://frinder.co',
      app_store_id: 'frinder-app',
      app_name: 'Frinder'
    },
    android: {
      package: 'co.frinder.app',
      app_name: 'Frinder'
    },
    web: {
      url: 'https://frinder.co',
      should_fallback: true
    }
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },

  // Icons - Favicon and Apple Touch Icons
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    shortcut: '/favicon.ico'
  },

  // Manifest
  manifest: '/manifest.json',

  // Apple Web App
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Frinder',
    startupImage: ['/frinder-logo.png']
  },

  // Verification (add your actual verification codes)
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code'
    // yahoo: 'your-yahoo-verification-code',
  },

  // Category
  category: 'social networking',

  // Other
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'msapplication-TileColor': '#ed8c00',
    'msapplication-TileImage': '/frinder-logo.png',
    'msapplication-config': '/browserconfig.xml',
    'format-detection': 'telephone=no'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ed8c00' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' }
  ],
  colorScheme: 'light dark'
};

// JSON-LD Structured Data for rich snippets
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': 'https://frinder.co/#app',
      name: 'Frinder',
      url: 'https://frinder.co',
      description:
        'Frinder is the #1 social app for finding friends and meaningful connections. Swipe, match, chat, and meet new people who share your interests.',
      applicationCategory: 'SocialNetworkingApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '125000',
        bestRating: '5',
        worstRating: '1'
      },
      author: {
        '@type': 'Organization',
        name: 'Frinder'
      }
    },
    {
      '@type': 'Organization',
      '@id': 'https://frinder.co/#organization',
      name: 'Frinder',
      url: 'https://frinder.co',
      logo: {
        '@type': 'ImageObject',
        url: 'https://frinder.co/frinder-logo.png',
        width: 512,
        height: 512
      },
      sameAs: [
        'https://twitter.com/frinder',
        'https://facebook.com/frinder',
        'https://instagram.com/frinder',
        'https://linkedin.com/company/frinder',
        'https://tiktok.com/@frinder'
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@frinder.co',
        availableLanguage: ['English']
      }
    },
    {
      '@type': 'WebSite',
      '@id': 'https://frinder.co/#website',
      url: 'https://frinder.co',
      name: 'Frinder',
      description: 'Find Friends & Meaningful Connections',
      publisher: {
        '@id': 'https://frinder.co/#organization'
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://frinder.co/search?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      }
    },
    {
      '@type': 'MobileApplication',
      '@id': 'https://frinder.co/#mobile-app',
      name: 'Frinder',
      operatingSystem: 'iOS, Android',
      applicationCategory: 'SocialNetworkingApplication',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '125000'
      }
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://frinder.co/#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Frinder?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Frinder is a social networking app that helps you find friends and meaningful connections. Swipe through profiles, match with people who share your interests, and start conversations.'
          }
        },
        {
          '@type': 'Question',
          name: 'Is Frinder free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! Frinder is free to download and use. We also offer optional premium features like Frinder Pro for enhanced experiences.'
          }
        },
        {
          '@type': 'Question',
          name: 'How does Frinder work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Create your profile, set your preferences, and start swiping! When you and another person both like each other, it's a match. Then you can chat and plan to meet up."
          }
        }
      ]
    }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' dir='ltr'>
      <head>
        {/* Preconnect to important origins */}
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
        <link rel='preconnect' href='https://firebasestorage.googleapis.com' />

        {/* DNS Prefetch */}
        <link rel='dns-prefetch' href='https://www.google-analytics.com' />
        <link rel='dns-prefetch' href='https://www.googletagmanager.com' />

        {/* JSON-LD Structured Data */}
        <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
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

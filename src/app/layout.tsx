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
    default: 'Frinder - #1 App to Find Friends & Meet New People Near You',
    template: '%s | Frinder - Find Friends'
  },
  description:
    'Frinder is the #1 FREE social app to find friends and meaningful connections near you. Swipe, match, chat, and meet new people who share your interests. Join millions discovering real friendships today! Download now.',
  keywords: [
    'frinder',
    'frinder app',
    'find friends app',
    'meet new people',
    'dating app',
    'social networking app',
    'friendship app',
    'match making app',
    'swipe app',
    'make friends online',
    'find friends near me',
    'connect with people',
    'new friends app',
    'relationship app',
    'chat and meet',
    'meet singles',
    'online dating',
    'friendship',
    'meaningful connections',
    'social app',
    'tinder alternative',
    'bumble alternative'
  ],
  authors: [{ name: 'Frinder', url: 'https://frinder.co' }],
  creator: 'Frinder',
  publisher: 'Frinder',

  // Canonical URL
  metadataBase: new URL('https://frinder.co'),
  alternates: {
    canonical: 'https://frinder.co',
    languages: {
      'en-US': 'https://frinder.co',
      'x-default': 'https://frinder.co'
    }
  },

  // Open Graph (Facebook, LinkedIn, WhatsApp, etc.)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://frinder.co',
    siteName: 'Frinder',
    title: 'Frinder - #1 App to Find Friends & Meet New People',
    description:
      'Join millions on Frinder! The #1 FREE app for finding friends and meaningful connections. Swipe, match, and chat with people who share your interests. Download now!',
    images: [
      {
        url: 'https://frinder.co/og-image.png',
        secureUrl: 'https://frinder.co/og-image.png',
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
    site: '@frinderapp',
    creator: '@frinderapp',
    title: 'Frinder - #1 App to Find Friends & Meet New People',
    description:
      'Join millions on Frinder! The #1 FREE app for finding friends and meaningful connections. Swipe, match, and chat with people who share your interests.',
    images: {
      url: 'https://frinder.co/og-image.png',
      alt: 'Frinder - Find Friends App'
    }
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
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: [{ url: '/favicon.ico', type: 'image/x-icon' }]
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

  // Verification (Google Search Console verified)
  verification: {
    google: 'F60JZzvbgAAsau_N02xNcR-vF7vJlda023ILQCNphOk'
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

// JSON-LD Structured Data for rich snippets - Optimized for Google
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': 'https://frinder.co/#app',
      name: 'Frinder',
      alternateName: 'Frinder App',
      url: 'https://frinder.co',
      description:
        'Frinder is the #1 FREE social app for finding friends and meaningful connections near you. Swipe, match, chat, and meet new people who share your interests.',
      applicationCategory: 'SocialNetworkingApplication',
      operatingSystem: 'Web, iOS, Android',
      browserRequirements: 'Requires JavaScript',
      softwareVersion: '2.0',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '150000',
        bestRating: '5',
        worstRating: '1',
        reviewCount: '125000'
      },
      author: {
        '@type': 'Organization',
        name: 'Frinder'
      },
      screenshot: 'https://frinder.co/og-image.png',
      featureList: 'Smart Matching, Group Activities, Instant Chat, Verified Users, Super Likes'
    },
    {
      '@type': 'Organization',
      '@id': 'https://frinder.co/#organization',
      name: 'Frinder',
      legalName: 'Frinder Inc.',
      url: 'https://frinder.co',
      logo: {
        '@type': 'ImageObject',
        '@id': 'https://frinder.co/#logo',
        url: 'https://frinder.co/frinder-logo.png',
        contentUrl: 'https://frinder.co/frinder-logo.png',
        width: 512,
        height: 512,
        caption: 'Frinder Logo'
      },
      image: {
        '@id': 'https://frinder.co/#logo'
      },
      sameAs: [
        'https://twitter.com/frinderapp',
        'https://facebook.com/frinderapp',
        'https://instagram.com/frinderapp',
        'https://linkedin.com/company/frinder',
        'https://tiktok.com/@frinderapp'
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
      description: 'Find Friends & Meaningful Connections Near You',
      publisher: {
        '@id': 'https://frinder.co/#organization'
      },
      inLanguage: 'en-US',
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
      '@type': 'WebPage',
      '@id': 'https://frinder.co/#webpage',
      url: 'https://frinder.co',
      name: 'Frinder - #1 App to Find Friends & Meet New People Near You',
      isPartOf: {
        '@id': 'https://frinder.co/#website'
      },
      about: {
        '@id': 'https://frinder.co/#organization'
      },
      description:
        'The #1 FREE social app for finding friends and meaningful connections. Join millions of users today!',
      breadcrumb: {
        '@id': 'https://frinder.co/#breadcrumb'
      },
      inLanguage: 'en-US',
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: 'https://frinder.co/og-image.png'
      },
      datePublished: '2024-01-01',
      dateModified: '2026-01-05'
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://frinder.co/#breadcrumb',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://frinder.co'
        }
      ]
    },
    {
      '@type': 'SoftwareApplication',
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
        ratingCount: '150000'
      },
      downloadUrl: 'https://frinder.co'
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
            text: 'Frinder is a FREE social networking app that helps you find friends and meaningful connections near you. Swipe through profiles, match with people who share your interests, and start conversations to build real relationships.'
          }
        },
        {
          '@type': 'Question',
          name: 'Is Frinder free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! Frinder is completely free to download and use. You can swipe, match, and chat without paying anything. We also offer optional premium features like Frinder Pro with Super Likes and advanced filters.'
          }
        },
        {
          '@type': 'Question',
          name: 'How does Frinder work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "It's easy! Create your profile with photos and interests, then start swiping through profiles of people near you. When you and another person both like each other, it's a match! Then you can chat and plan to meet up."
          }
        },
        {
          '@type': 'Question',
          name: 'Is Frinder safe?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! Frinder requires email verification to ensure real users. We have robust safety features including the ability to report and block users, and our team actively monitors for inappropriate behavior.'
          }
        },
        {
          '@type': 'Question',
          name: 'How is Frinder different from other dating apps?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Frinder focuses on meaningful connections, not just dating. You can find friends, join groups for activities, and connect with people who share your interests. Our smart matching algorithm prioritizes shared interests and nearby users.'
          }
        }
      ]
    },
    {
      '@type': 'Product',
      name: 'Frinder Pro',
      description: 'Premium subscription with Super Likes, See Who Liked You, Advanced Filters, and Ad-Free experience',
      brand: {
        '@type': 'Brand',
        name: 'Frinder'
      },
      offers: {
        '@type': 'Offer',
        price: '9.99',
        priceCurrency: 'USD',
        priceValidUntil: '2026-12-31',
        availability: 'https://schema.org/InStock'
      }
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
        {/* Favicon - explicit for browser tab */}
        <link rel='icon' href='/favicon.ico' sizes='any' />
        <link rel='icon' href='/favicon-32x32.png' type='image/png' sizes='32x32' />
        <link rel='icon' href='/favicon-16x16.png' type='image/png' sizes='16x16' />
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' sizes='180x180' />
        
        {/* Preconnect to important origins */}
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
        <link rel='preconnect' href='https://firebasestorage.googleapis.com' />

        {/* DNS Prefetch */}
        <link rel='dns-prefetch' href='https://www.google-analytics.com' />
        <link rel='dns-prefetch' href='https://www.googletagmanager.com' />

        {/* Canonical URL */}
        <link rel='canonical' href='https://frinder.co' />

        {/* Geo Tags for Local SEO */}
        <meta name='geo.region' content='US' />
        <meta name='geo.placename' content='United States' />

        {/* Additional SEO meta tags */}
        <meta name='rating' content='general' />
        <meta name='revisit-after' content='1 days' />
        <meta name='distribution' content='global' />
        <meta name='language' content='English' />
        <meta name='coverage' content='Worldwide' />
        <meta name='target' content='all' />
        <meta name='HandheldFriendly' content='True' />
        <meta name='MobileOptimized' content='320' />

        {/* Schema.org WebPage */}
        <meta itemProp='name' content='Frinder - Find Friends & Meaningful Connections' />
        <meta
          itemProp='description'
          content='The #1 FREE app for finding friends and meaningful connections. Swipe, match, and chat with people near you.'
        />
        <meta itemProp='image' content='https://frinder.co/og-image.png' />

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

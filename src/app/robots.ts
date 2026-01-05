import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/checkout/']
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/']
      }
    ],
    sitemap: 'https://frinder.co/sitemap.xml',
    host: 'https://frinder.co'
  };
}

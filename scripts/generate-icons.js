const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'frinder-logo.png');

async function generateIcons() {
  console.log('Generating icons from frinder-logo.png...\n');

  // Check if logo exists
  if (!fs.existsSync(logoPath)) {
    console.error('Error: frinder-logo.png not found in public folder');
    process.exit(1);
  }

  const logo = sharp(logoPath);
  const metadata = await logo.metadata();
  console.log(`Source image: ${metadata.width}x${metadata.height}`);

  // Generate favicon sizes
  const faviconSizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 }
  ];

  for (const { name, size } of faviconSizes) {
    await sharp(logoPath)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, name));
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  // Generate favicon.ico (32x32 PNG as ICO isn't directly supported, but browsers accept PNG)
  await sharp(logoPath)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✓ Generated favicon.ico (32x32)');

  // Generate OG image (1200x630) - logo centered on orange gradient background
  const ogWidth = 1200;
  const ogHeight = 630;
  const logoSize = 300;

  // Create orange gradient background with centered logo
  const ogBackground = Buffer.from(`
    <svg width="${ogWidth}" height="${ogHeight}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ed8c00;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f5a623;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${ogWidth}" height="${ogHeight}" fill="url(#grad)"/>
      <text x="${ogWidth / 2}" y="${ogHeight - 80}" 
            font-family="Arial, sans-serif" 
            font-size="48" 
            font-weight="bold" 
            fill="white" 
            text-anchor="middle">
        Find Friends &amp; Meaningful Connections
      </text>
    </svg>
  `);

  // Resize logo for OG image
  const resizedLogo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Composite logo onto background
  await sharp(ogBackground)
    .composite([
      {
        input: resizedLogo,
        left: Math.floor((ogWidth - logoSize) / 2),
        top: Math.floor((ogHeight - logoSize) / 2) - 40
      }
    ])
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log(`✓ Generated og-image.png (${ogWidth}x${ogHeight})`);

  console.log('\n✅ All icons generated successfully!');
  console.log('\nMake sure to deploy these files to your server.');
}

generateIcons().catch(console.error);

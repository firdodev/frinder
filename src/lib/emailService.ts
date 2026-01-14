import nodemailer from 'nodemailer';
import { google } from 'googleapis';

// OAuth2 client setup for Gmail - much more trusted by Google than app passwords
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground' // Redirect URL
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

// Create transporter with OAuth2 - this prevents account restrictions
async function createTransporter() {
  try {
    const accessToken = await oauth2Client.getAccessToken();

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token || undefined
      },
      // Pool connections for faster sending
      pool: true,
      maxConnections: 5, // Increased from 3
      maxMessages: 200, // Increased from 100
      // Faster rate limiting
      rateDelta: 500, // Reduced from 1000ms
      rateLimit: 5 // Increased from 3
    });
  } catch (error) {
    console.error('OAuth2 transporter creation failed, falling back to basic auth:', error);
    // Fallback to basic auth if OAuth2 fails (but with better settings)
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      pool: true,
      maxConnections: 2,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 2,
      tls: {
        rejectUnauthorized: false
      }
    });
  }
}

// Singleton transporter instance
let transporterInstance: nodemailer.Transporter | null = null;

export async function getTransporter(): Promise<nodemailer.Transporter> {
  if (!transporterInstance) {
    transporterInstance = await createTransporter();
  }
  return transporterInstance;
}

// Reset transporter (useful if credentials change)
export function resetTransporter() {
  if (transporterInstance) {
    transporterInstance.close();
    transporterInstance = null;
  }
}

// Delay helper for rate limiting
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Send a single email with proper headers
export async function sendEmail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = await getTransporter();

    await transporter.sendMail({
      from: `"${options.fromName || 'Frinder'}" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      // Add proper headers to look legitimate
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'Frinder App',
        'List-Unsubscribe': '<https://frinder.co/unsubscribe>'
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error?.message || 'Failed to send email' };
  }
}

// Send bulk emails in parallel with rate limiting
export async function sendBulkEmails(
  emails: Array<{
    to: string;
    subject: string;
    html?: string;
    text?: string;
    fromName?: string;
  }>,
  options?: {
    batchSize?: number; // emails per batch (default: 20)
    delayBetweenBatches?: number; // ms between batches (default: 2000ms)
    parallelInBatch?: number; // how many to send in parallel within a batch (default: 5)
  }
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const { batchSize = 20, delayBetweenBatches = 2000, parallelInBatch = 5 } = options || {};

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    // Process batch in parallel chunks
    for (let j = 0; j < batch.length; j += parallelInBatch) {
      const chunk = batch.slice(j, j + parallelInBatch);

      // Send chunk in parallel
      const results = await Promise.all(chunk.map(email => sendEmail(email)));

      // Count results
      results.forEach((result, idx) => {
        if (result.success) {
          sent++;
        } else {
          failed++;
          if (result.error) errors.push(`${chunk[idx].to}: ${result.error}`);
        }
      });

      // Small delay between parallel chunks within a batch
      if (j + parallelInBatch < batch.length) {
        await delay(300);
      }
    }

    // Log progress
    console.log(`Email batch ${Math.floor(i / batchSize) + 1} complete: ${sent} sent, ${failed} failed`);

    // Delay between batches (but not after the last batch)
    if (i + batchSize < emails.length) {
      await delay(delayBetweenBatches);
    }
  }

  return { sent, failed, errors };
}

// Fast single email - use for transactional emails (verification, notifications)
export async function sendFastEmail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
}): Promise<{ success: boolean; error?: string }> {
  // No delays, just send immediately
  return sendEmail(options);
}

// Verify transporter connection
export async function verifyConnection(): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email connection verification failed:', error);
    return false;
  }
}

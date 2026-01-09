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
      // Pool connections to avoid opening too many
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      // Rate limiting built into the transport
      rateDelta: 1000, // 1 second between messages
      rateLimit: 3 // Max 3 messages per rateDelta
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
      maxConnections: 1,
      maxMessages: 50,
      rateDelta: 2000,
      rateLimit: 1,
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

// Send bulk emails with proper rate limiting to avoid Google restrictions
export async function sendBulkEmails(
  emails: Array<{
    to: string;
    subject: string;
    html?: string;
    text?: string;
    fromName?: string;
  }>,
  options?: {
    delayBetweenEmails?: number; // ms between each email (default: 1500ms)
    batchSize?: number; // emails per batch (default: 10)
    delayBetweenBatches?: number; // ms between batches (default: 5000ms)
  }
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const { delayBetweenEmails = 1500, batchSize = 10, delayBetweenBatches = 5000 } = options || {};

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    // Process each email in the batch with delays
    for (const email of batch) {
      const result = await sendEmail(email);

      if (result.success) {
        sent++;
      } else {
        failed++;
        if (result.error) errors.push(`${email.to}: ${result.error}`);
      }

      // Delay between emails to avoid rate limiting
      if (batch.indexOf(email) < batch.length - 1) {
        await delay(delayBetweenEmails);
      }
    }

    // Longer delay between batches
    if (i + batchSize < emails.length) {
      console.log(`Batch complete (${sent} sent, ${failed} failed). Waiting before next batch...`);
      await delay(delayBetweenBatches);
    }
  }

  return { sent, failed, errors };
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



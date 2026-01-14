// Brevo API for sending emails
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface BrevoEmailPayload {
  sender: { name: string; email: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent?: string;
  textContent?: string;
}

// Delay helper for rate limiting
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Send a single email via Brevo API
export async function sendEmail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is not configured');
    }

    const payload: BrevoEmailPayload = {
      sender: {
        name: options.fromName || 'Frinder',
        email: process.env.BREVO_SENDER_EMAIL || 'noreply@frinder.co'
      },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text
    };

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Brevo API error: ${response.status}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error?.message || 'Failed to send email' };
  }
}

// Send bulk emails with parallel processing
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
    delayBetweenBatches?: number; // ms between batches (default: 1000ms)
    parallelInBatch?: number; // how many to send in parallel within a batch (default: 10)
  }
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const { batchSize = 20, delayBetweenBatches = 1000, parallelInBatch = 10 } = options || {};

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
        await delay(100);
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

// Verify API connection
export async function verifyConnection(): Promise<boolean> {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error('BREVO_API_KEY is not configured');
      return false;
    }

    // Check account info to verify API key works
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'api-key': apiKey
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Brevo connection verification failed:', error);
    return false;
  }
}

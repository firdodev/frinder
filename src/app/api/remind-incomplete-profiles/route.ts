import { NextRequest, NextResponse } from 'next/server';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendBulkEmails } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    // Get all users
    const usersSnap = await getDocs(collection(db, 'users'));
    const emails: string[] = [];
    usersSnap.forEach(doc => {
      const data = doc.data();
      // Only users with 0 or 1 photo
      if (data.email && Array.isArray(data.photos) && data.photos.length <= 1) {
        emails.push(data.email);
      } else if (data.email && (!Array.isArray(data.photos) || data.photos.length === 0)) {
        emails.push(data.email);
      }
    });
    if (emails.length === 0) {
      return NextResponse.json({ error: 'No incomplete profiles found.' }, { status: 404 });
    }

    const subject = 'Complete your Frinder profile for better matches!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ed8c00; margin: 0;">Frinder</h1>
          <p style="color: #666; margin-top: 5px;">Find your match</p>
        </div>
        <div style="background-color: #fff7ed; border-radius: 12px; padding: 30px;">
          <h2 style="color: #1a1a1a; margin-bottom: 10px;">Boost your Frinder experience!</h2>
          <p style="color: #666; margin-bottom: 10px;">Hi there,</p>
          <p style="color: #666; margin-bottom: 20px;">
            We noticed your profile could use a few more photos. The ideal number is <b>5 photos</b> to get more matches and better results!
          </p>
          <p style="color: #666; margin-bottom: 20px;">
            Try to swipe more and explore new connections. Update your profile now for the best experience!
          </p>
          <div style="text-align: center;">
            <a href="https://frinder.co" style="display: inline-block; background-color: #ed8c00; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
              Open Frinder
            </a>
          </div>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
          This is an automated reminder from Frinder.
        </p>
      </div>
    `;

    // Prepare emails for bulk send
    const emailsToSend = emails.map(email => ({
      to: email,
      subject,
      html,
    }));

    // Send with rate limiting to avoid Google restrictions
    const result = await sendBulkEmails(emailsToSend, {
      delayBetweenEmails: 2000,
      batchSize: 5,
      delayBetweenBatches: 10000,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Remind incomplete profiles error:', error);
    let errorMsg = '';
    if (typeof error === 'string') errorMsg = error;
    else if (error instanceof Error) errorMsg = error.message + (error.stack ? ('\n' + error.stack) : '');
    else errorMsg = JSON.stringify(error);
    return NextResponse.json({ error: errorMsg || 'Failed to send reminder email.' }, { status: 500 });
  }
}

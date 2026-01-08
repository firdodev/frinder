import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendBulkEmails } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const { subject, message } = await req.json();
    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
    }

    // Fetch all users with a valid email
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const emails: string[] = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email && data.isEmailVerified !== false) {
        emails.push(data.email);
      }
    });

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No users with valid emails found.' }, { status: 404 });
    }

    // Prepare emails for bulk send
    const emailsToSend = emails.map(email => ({
      to: email,
      subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ed8c00; margin: 0;">Frinder</h1>
            <p style="color: #666; margin-top: 5px;">Find your match</p>
          </div>
          <div style="background-color: #fff7ed; border-radius: 12px; padding: 30px;">
            <p style="color: #1a1a1a; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            You're receiving this because you're a member of Frinder.<br/>
            <a href="https://frinder.co" style="color: #ed8c00;">Visit Frinder</a>
          </p>
        </div>
      `,
    }));

    // Send with rate limiting to avoid Google restrictions
    const result = await sendBulkEmails(emailsToSend, {
      delayBetweenEmails: 2000, // 2 seconds between emails
      batchSize: 5, // 5 emails per batch
      delayBetweenBatches: 10000, // 10 seconds between batches
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to send email.' }, { status: 500 });
  }
}

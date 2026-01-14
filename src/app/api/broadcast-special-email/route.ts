import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendBulkEmails } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const { type } = await req.json();
    let subject = '';
    let html = '';
    
    if (type === 'thank') {
      subject = 'Thank you for using Frinder!';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ed8c00; margin: 0;">Frinder</h1>
            <p style="color: #666; margin-top: 5px;">Find your match</p>
          </div>
          <div style="background-color: #fff7ed; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #1a1a1a; margin-bottom: 10px;">Thank You! 💛</h2>
            <p style="color: #666; margin-bottom: 20px;">
              We appreciate you being part of Frinder. Your support means the world to us!
            </p>
            <p style="color: #666; margin-bottom: 20px;">
              If you enjoy the app, please share it with your friends!
            </p>
            <a href="https://frinder.co" style="display: inline-block; background-color: #ed8c00; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
              Open Frinder
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            You're receiving this because you're a member of Frinder.
          </p>
        </div>
      `;
    } else if (type === 'bug') {
      subject = 'Have you found any bugs?';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ed8c00; margin: 0;">Frinder</h1>
            <p style="color: #666; margin-top: 5px;">Find your match</p>
          </div>
          <div style="background-color: #fff7ed; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #1a1a1a; margin-bottom: 10px;">Help Us Improve! 🛠️</h2>
            <p style="color: #666; margin-bottom: 20px;">
              We want to make Frinder better for you!
            </p>
            <p style="color: #666; margin-bottom: 20px;">
              If you have found any bugs or issues, please reply to this email and let us know.
            </p>
            <a href="https://frinder.co" style="display: inline-block; background-color: #ed8c00; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
              Open Frinder
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            You're receiving this because you're a member of Frinder.
          </p>
        </div>
      `;
    } else {
      return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
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
      html,
    }));

    // Send with rate limiting to avoid Google restrictions
    const result = await sendBulkEmails(emailsToSend, {
      batchSize: 20, // emails per batch
      delayBetweenBatches: 2000, // 2 seconds between batches
      parallelInBatch: 5, // send 5 emails in parallel within each batch
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to send emails.' }, { status: 500 });
  }
}

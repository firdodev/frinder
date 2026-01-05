import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

type NotificationType = 'like' | 'superlike' | 'match';

interface NotificationEmailData {
  toEmail: string;
  toName: string;
  fromName: string;
  fromPhoto?: string;
  type: NotificationType;
}

function getEmailContent(data: NotificationEmailData): { subject: string; html: string } {
  const { toName, fromName, fromPhoto, type } = data;
  
  const baseStyles = `
    font-family: Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
  `;
  
  const headerStyles = `
    text-align: center;
    margin-bottom: 30px;
  `;
  
  const contentBoxStyles = `
    background-color: #fff7ed;
    border-radius: 12px;
    padding: 30px;
    text-align: center;
  `;
  
  const avatarStyles = `
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin: 0 auto 20px;
    object-fit: cover;
    border: 4px solid #ed8c00;
  `;
  
  const buttonStyles = `
    display: inline-block;
    background-color: #ed8c00;
    color: white;
    text-decoration: none;
    padding: 14px 32px;
    border-radius: 8px;
    font-weight: bold;
    margin-top: 20px;
  `;
  
  const footerStyles = `
    color: #999;
    font-size: 12px;
    text-align: center;
    margin-top: 30px;
  `;
  
  switch (type) {
    case 'like':
      return {
        subject: `💛 ${fromName} liked you on Frinder!`,
        html: `
          <div style="${baseStyles}">
            <div style="${headerStyles}">
              <h1 style="color: #ed8c00; margin: 0;">Frinder</h1>
              <p style="color: #666; margin-top: 5px;">Find your match</p>
            </div>
            <div style="${contentBoxStyles}">
              ${fromPhoto ? `<img src="${fromPhoto}" alt="${fromName}" style="${avatarStyles}" />` : ''}
              <h2 style="color: #1a1a1a; margin-bottom: 10px;">Someone likes you! 💛</h2>
              <p style="color: #666; margin-bottom: 10px;">Hi ${toName},</p>
              <p style="color: #666; margin-bottom: 20px;">
                <strong style="color: #ed8c00;">${fromName}</strong> just liked your profile on Frinder!
              </p>
              <p style="color: #666;">
                Like them back to start chatting and see where it goes! ✨
              </p>
              <a href="https://frinder.al" style="${buttonStyles}">
                Open Frinder
              </a>
            </div>
            <p style="${footerStyles}">
              You're receiving this because you have email notifications enabled on Frinder.<br/>
              To unsubscribe, update your notification settings in the app.
            </p>
          </div>
        `
      };
      
    case 'superlike':
      return {
        subject: `⭐ ${fromName} super liked you on Frinder!`,
        html: `
          <div style="${baseStyles}">
            <div style="${headerStyles}">
              <h1 style="color: #ed8c00; margin: 0;">Frinder</h1>
              <p style="color: #666; margin-top: 5px;">Find your match</p>
            </div>
            <div style="${contentBoxStyles}">
              ${fromPhoto ? `<img src="${fromPhoto}" alt="${fromName}" style="${avatarStyles}" />` : ''}
              <h2 style="color: #1a1a1a; margin-bottom: 10px;">You got a Super Like! ⭐</h2>
              <p style="color: #666; margin-bottom: 10px;">Hi ${toName},</p>
              <p style="color: #666; margin-bottom: 20px;">
                <strong style="color: #ed8c00;">${fromName}</strong> thinks you're special and sent you a Super Like!
              </p>
              <p style="color: #666;">
                Super Likes are rare and precious - someone really wants to connect with you! 💫
              </p>
              <a href="https://frinder.al" style="${buttonStyles}">
                Open Frinder
              </a>
            </div>
            <p style="${footerStyles}">
              You're receiving this because you have email notifications enabled on Frinder.<br/>
              To unsubscribe, update your notification settings in the app.
            </p>
          </div>
        `
      };
      
    case 'match':
      return {
        subject: `🎉 It's a Match! You and ${fromName} on Frinder`,
        html: `
          <div style="${baseStyles}">
            <div style="${headerStyles}">
              <h1 style="color: #ed8c00; margin: 0;">Frinder</h1>
              <p style="color: #666; margin-top: 5px;">Find your match</p>
            </div>
            <div style="${contentBoxStyles}">
              ${fromPhoto ? `<img src="${fromPhoto}" alt="${fromName}" style="${avatarStyles}" />` : ''}
              <h2 style="color: #1a1a1a; margin-bottom: 10px;">It's a Match! 🎉</h2>
              <p style="color: #666; margin-bottom: 10px;">Hi ${toName},</p>
              <p style="color: #666; margin-bottom: 20px;">
                You and <strong style="color: #ed8c00;">${fromName}</strong> liked each other!
              </p>
              <p style="color: #666;">
                Start a conversation and get to know each other. Who knows where this could lead? 💕
              </p>
              <a href="https://frinder.al" style="${buttonStyles}">
                Send a Message
              </a>
            </div>
            <p style="${footerStyles}">
              You're receiving this because you have email notifications enabled on Frinder.<br/>
              To unsubscribe, update your notification settings in the app.
            </p>
          </div>
        `
      };
      
    default:
      return {
        subject: 'Frinder Notification',
        html: '<p>You have a new notification on Frinder!</p>'
      };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: NotificationEmailData = await request.json();
    const { toEmail, toName, fromName, fromPhoto, type } = body;

    if (!toEmail || !toName || !fromName || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: toEmail, toName, fromName, type' },
        { status: 400 }
      );
    }

    const validTypes: NotificationType[] = ['like', 'superlike', 'match'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type. Must be: like, superlike, or match' },
        { status: 400 }
      );
    }

    const { subject, html } = getEmailContent({ toEmail, toName, fromName, fromPhoto, type });

    await transporter.sendMail({
      from: `"Frinder" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html
    });

    return NextResponse.json({ success: true, message: 'Notification email sent' });
  } catch (error) {
    console.error('Error sending notification email:', error);
    return NextResponse.json(
      { error: 'Failed to send notification email' },
      { status: 500 }
    );
  }
}

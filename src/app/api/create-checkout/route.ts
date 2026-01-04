import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { planId, firebaseUid } = await request.json();

    if (!planId || !firebaseUid) {
      return NextResponse.json({ error: 'planId and firebaseUid are required' }, { status: 400 });
    }

    const response = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company_id: process.env.WHOP_COMPANY_ID,
        plan_id: planId,
        metadata: { firebase_uid: firebaseUid }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Whop API error:', error);
      return NextResponse.json({ error: 'Failed to create checkout configuration' }, { status: response.status });
    }

    const checkoutConfig = await response.json();
    return NextResponse.json(checkoutConfig);
  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}

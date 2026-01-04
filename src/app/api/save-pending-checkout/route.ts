import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// This endpoint saves a mapping between Whop user ID and Firebase UID
// so the webhook can link the membership to the correct user
export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, whopUserId } = await request.json();

    if (!firebaseUid || !whopUserId) {
      return NextResponse.json({ error: 'firebaseUid and whopUserId are required' }, { status: 400 });
    }

    // Save to pendingCheckouts collection keyed by whopUserId
    const pendingRef = doc(db, 'pendingCheckouts', whopUserId);
    await setDoc(pendingRef, {
      firebaseUid,
      whopUserId,
      createdAt: Timestamp.now()
    });

    // Also update the user's subscription with their whopUserId for future lookups
    const subRef = doc(db, 'userSubscriptions', firebaseUid);
    await setDoc(
      subRef,
      {
        whopUserId
      },
      { merge: true }
    );

    console.log(`Saved pending checkout: whopUserId=${whopUserId} -> firebaseUid=${firebaseUid}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving pending checkout:', error);
    return NextResponse.json({ error: 'Failed to save pending checkout' }, { status: 500 });
  }
}

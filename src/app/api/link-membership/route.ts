import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// This endpoint links a membership to a Firebase user
// It can be called after checkout completes to ensure the link is made
export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, membershipId, planId } = await request.json();

    if (!firebaseUid || !membershipId) {
      return NextResponse.json({ error: 'firebaseUid and membershipId are required' }, { status: 400 });
    }

    const isPro = planId === 'plan_TJw6Ei5VYZy7V' || planId === 'plan_hvPYAJ9TWzW8x';

    // Update the user's subscription with the membership ID (using merge to create if doesn't exist)
    const subRef = doc(db, 'userSubscriptions', firebaseUid);

    const updateData: Record<string, any> = {
      membershipId: membershipId
    };

    if (isPro) {
      updateData.isPremium = true;
      updateData.premiumExpiresAt = null;
      updateData.unlimitedSuperLikes = true;
      updateData.canSeeWhoLikedYou = true;
      updateData.unlimitedRewinds = true;
      updateData.priorityInDiscovery = true;
      updateData.advancedFilters = true;
      updateData.isAdFree = true;
      updateData.cancelAtPeriodEnd = false;
    }

    await setDoc(subRef, updateData, { merge: true });

    // Clean up unlinked membership if it exists
    try {
      const unlinkedRef = doc(db, 'unlinkedMemberships', membershipId);
      const unlinkedSnap = await getDoc(unlinkedRef);
      if (unlinkedSnap.exists()) {
        await deleteDoc(unlinkedRef);
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    console.log(`Linked membership ${membershipId} to user ${firebaseUid}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error linking membership:', error);
    return NextResponse.json({ error: 'Failed to link membership' }, { status: 500 });
  }
}

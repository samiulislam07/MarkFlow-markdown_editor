import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const client = await clerkClient();
    
    // Create a sign-in token for the guest user
    const { token } = await client.signInTokens.createSignInToken({
      userId: 'user_30ovLK1zaC03pMOFhdvEJR28Rfd', 
      //user ID for guest user
      expiresInSeconds: 86400 // 1 day
    });

    return NextResponse.json({ token });
  } catch (err) {
    console.error('Error creating guest token:', err);
    return NextResponse.json(
      { error: 'Could not create guest token' },
      { status: 500 }
    );
  }
}
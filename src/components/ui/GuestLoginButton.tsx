'use client'

import { useSignIn } from '@clerk/nextjs';
import { useState } from 'react';

export default function GuestLoginButton() {
  const { signIn, setActive } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);

  const handleGuestLogin = async () => {
    try {
      setIsLoading(true);
      
      // Get the guest token from your API
      const response = await fetch('/api/guest-login');
      const { token } = await response.json();

      if (!token) {
        throw new Error('No token received');
      }

      // Use the token to sign in
      const signInAttempt = await signIn?.create({
        strategy: 'ticket',
        ticket: token,
      });

      if (signInAttempt?.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        // User is now signed in as guest
      }
    } catch (error) {
      console.error('Guest login failed:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGuestLogin}
      disabled={isLoading}
      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
    >
      {isLoading ? 'Signing in...' : 'Continue as Guest'}
    </button>
  );
}
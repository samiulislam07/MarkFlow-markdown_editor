'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface InvitationData {
  invitation: {
    email: string;
    role: string;
    invitedAt: string;
    expiresAt: string;
    invitedBy: {
      name: string;
      email: string;
      avatar?: string;
    };
  };
  workspace: {
    _id: string;
    name: string;
    description?: string;
    owner: {
      name: string;
      email: string;
      avatar?: string;
    };
  };
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const token = params.token as string;

  useEffect(() => {
    if (token) {
      fetchInvitationDetails();
    }
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      const response = await fetch(`/api/invitations/accept?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setInvitationData(data);
      } else {
        setError(data.error || 'Failed to load invitation details');
      }
    } catch (err) {
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!isSignedIn) {
      // Always redirect to sign-up for non-authenticated users
      // Clerk will handle whether it's a sign-in or sign-up flow
      router.push(`/sign-up?redirect_url=${encodeURIComponent(window.location.href)}`);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        // Redirect to workspace after 2 seconds
        setTimeout(() => {
          router.push(`/workspace/${data.workspace._id}`);
        }, 2000);
      } else {
        setError(data.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'editor':
        return 'Can create, edit, and delete documents';
      case 'commenter':
        return 'Can view documents and add comments';
      case 'viewer':
        return 'Can only view documents';
      default:
        return '';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'editor':
        return 'bg-green-100 text-green-800';
      case 'commenter':
        return 'bg-yellow-100 text-yellow-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-10 bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            href="/dashboard"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="text-green-500 text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitation Accepted!</h1>
          <p className="text-gray-600 mb-6">{success}</p>
          <p className="text-sm text-gray-500">Redirecting to workspace...</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Workspace Invitation
            </h1>
            <p className="text-gray-600">
              You've been invited to collaborate
            </p>
          </div>

          {invitationData && (
            <>
              {/* Workspace Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h2 className="font-semibold text-lg text-gray-900 mb-2">
                  {invitationData.workspace.name}
                </h2>
                {invitationData.workspace.description && (
                  <p className="text-gray-600 text-sm mb-3">
                    {invitationData.workspace.description}
                  </p>
                )}
                <div className="flex items-center text-sm text-gray-500">
                  <span>Owned by {invitationData.workspace.owner.name}</span>
                </div>
              </div>

              {/* Invitation Details */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Invitation Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Invited by:</span>
                    <span className="text-gray-900">{invitationData.invitation.invitedBy.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Role:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(invitationData.invitation.role)}`}>
                      {invitationData.invitation.role}
                    </span>
                  </div>
                  <div className="text-gray-600 text-xs mt-2">
                    {getRoleDescription(invitationData.invitation.role)}
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-gray-500">Expires:</span>
                    <span className="text-gray-900">
                      {new Date(invitationData.invitation.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email Verification */}
              {isSignedIn && user?.emailAddresses[0]?.emailAddress?.toLowerCase() !== invitationData.invitation.email.toLowerCase() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <div className="text-yellow-400 text-xl mr-3">⚠️</div>
                    <div>
                      <p className="text-yellow-800 font-medium">Email Mismatch</p>
                      <p className="text-yellow-700 text-sm">
                        This invitation is for {invitationData.invitation.email}, but you're signed in as {user?.emailAddresses[0]?.emailAddress}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {!isSignedIn ? (
                  <button
                    onClick={handleAcceptInvitation}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    Create Account & Accept Invitation
                  </button>
                ) : (
                  <button
                    onClick={handleAcceptInvitation}
                    disabled={accepting || (user?.emailAddresses[0]?.emailAddress?.toLowerCase() !== invitationData.invitation.email.toLowerCase())}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {accepting ? 'Accepting...' : 'Accept Invitation'}
                  </button>
                )}
                
                <Link
                  href="/dashboard"
                  className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium text-center block"
                >
                  Cancel
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 
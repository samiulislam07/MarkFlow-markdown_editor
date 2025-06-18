'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const { user, isSignedIn } = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isSignedIn || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden p-8">
          <div className="flex flex-col md:flex-row items-start gap-8">
            {user.imageUrl && (
              <div className="w-32 h-32 relative rounded-full overflow-hidden">
                <img
                  src={user.imageUrl}
                  alt={`${user.firstName}'s profile`}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Welcome, <span className="text-indigo-600">{user.firstName}</span>!
              </h1>

              <div className="space-y-4 mt-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h2 className="text-sm font-medium text-gray-500 mb-1">Email</h2>
                  <p className="text-lg font-semibold text-gray-800">
                    {user.emailAddresses[0]?.emailAddress}
                  </p>
                </div>

                {/* Optional: If you still want to load DB ID, you must fetch it via API separately */}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg transition-colors duration-200">
                View Profile
              </button>
              <button className="bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-200 py-3 px-4 rounded-lg transition-colors duration-200">
                Settings
              </button>
              <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-3 px-4 rounded-lg transition-colors duration-200">
                Notifications
              </button>
              <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-3 px-4 rounded-lg transition-colors duration-200">
                Help Center
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

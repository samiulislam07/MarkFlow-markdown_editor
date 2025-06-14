import { auth, currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb/connect'
import User from '@/lib/mongodb/models/User'

export default async function Dashboard() {
  const { userId } = await auth()
  const clerkUser = await currentUser()
  
  // Get additional user data from your database
  await connectToDatabase()
  const dbUser = await User.findOne({ clerkId: userId })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden p-8">
          <div className="flex flex-col md:flex-row items-start gap-8">
            {clerkUser?.imageUrl && (
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-100 shadow-sm">
                <img 
                  src={clerkUser.imageUrl} 
                  alt={`${clerkUser.firstName}'s profile`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Welcome, <span className="text-indigo-600">{clerkUser?.firstName}</span>!
              </h1>
              
              <div className="space-y-4 mt-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h2 className="text-sm font-medium text-gray-500 mb-1">Email</h2>
                  <p className="text-lg font-semibold text-gray-800">
                    {clerkUser?.emailAddresses[0]?.emailAddress}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h2 className="text-sm font-medium text-gray-500 mb-1">Database ID</h2>
                  <p className="text-lg font-mono text-indigo-600 break-all">
                    {dbUser?._id?.toString()}
                  </p>
                </div>
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
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My App</h1>
        <div>
          <SignedOut>
            <div className="space-x-4">
              <Link 
                href="/sign-in" 
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Sign In
              </Link>
              <Link 
                href="/sign-up" 
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Sign Up
              </Link>
            </div>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard" 
                className="text-blue-600 hover:text-blue-800"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to My App
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A modern authentication solution with Next.js and Clerk
          </p>
          
          <SignedOut>
            <div className="space-x-4">
              <Link 
                href="/sign-up" 
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700 inline-block"
              >
                Get Started
              </Link>
              <Link 
                href="/sign-in" 
                className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg text-lg hover:bg-blue-50 inline-block"
              >
                Sign In
              </Link>
            </div>
          </SignedOut>
          
          <SignedIn>
            <Link 
              href="/dashboard" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700 inline-block"
            >
              Go to Dashboard
            </Link>
          </SignedIn>
        </div>
      </main>
    </div>
  )
}
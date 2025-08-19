import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <SignUp 
        redirectUrl="/dashboard"
        afterSignUpUrl="/dashboard"
      />
    </div>
  )
}


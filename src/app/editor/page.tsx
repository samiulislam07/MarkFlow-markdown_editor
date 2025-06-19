import MergedMarkdownEditor from '@/app/components/MergedMarkdownEditor'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import ChatLauncher from '@/app/components/ChatLauncher'

export default async function EditorPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <>
      <MergedMarkdownEditor />
      <ChatLauncher />
    </>
  )
}
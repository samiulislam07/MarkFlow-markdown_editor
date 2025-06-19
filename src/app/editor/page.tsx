import MergedMarkdownEditor from '@/app/components/MergedMarkdownEditor'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import ChatLauncher from '@/app/components/ChatLauncher'

interface EditorPageProps {
  searchParams: Promise<{
    workspace?: string
  }>
}

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

<<<<<<< HEAD
  return (
    <>
      <MergedMarkdownEditor />
      <ChatLauncher />
    </>
  )
=======
  const { workspace } = await searchParams

  return <EnhancedMarkdownEditor workspaceId={workspace} />
>>>>>>> 4a3ae4c5684ee2f3b2a4c4edb2f646edc0902d66
}
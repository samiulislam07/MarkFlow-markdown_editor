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

  const { workspace } = await searchParams

  return (
    <>
      <MergedMarkdownEditor workspaceId={workspace} />
      <ChatLauncher />
    </>
  )
}
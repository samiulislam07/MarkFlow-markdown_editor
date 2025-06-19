// import MarkdownEditor from "../components/MarkdownEditor";
import EnhancedMarkdownEditor from '@/app/components/EnhancedMarkdownEditor'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

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

  return <EnhancedMarkdownEditor workspaceId={workspace} />
}
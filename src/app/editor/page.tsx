// import MarkdownEditor from "../components/MarkdownEditor";
import EnhancedMarkdownEditor from '@/app/components/EnhancedMarkdownEditor'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function EditorPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return <EnhancedMarkdownEditor />
}
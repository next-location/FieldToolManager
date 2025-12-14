import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ProjectListClient } from '@/components/projects/ProjectListClient'

async function ProjectList() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(name)
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link
          href="/projects/new"
          className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
        >
          新規工事登録
        </Link>
      </div>

      <ProjectListClient projects={projects || []} />
    </>
  )
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // 管理者のみアクセス可能
  if (!['admin', 'super_admin', 'manager'].includes(userData?.role || '')) {
    redirect('/')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">工事管理</h1>
        <p className="text-gray-600">
          工事の基本情報と進捗を管理します
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <ProjectList />
      </Suspense>
    </div>
  )
}

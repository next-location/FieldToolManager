import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LocationForm } from './LocationForm'
import { createWarehouseLocation } from '../actions'

export default async function NewWarehouseLocationPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者権限チェック
  if (!['admin', 'super_admin'].includes(userData.role)) {
    redirect('/')
  }

  // 倉庫階層テンプレートを取得
  const { data: templates } = await supabase
    .from('warehouse_location_templates')
    .select('*')
    .eq('organization_id', userData?.organization_id)
    .eq('is_active', true)
    .order('level')

  // 倉庫階層が未設定の場合、設定画面に誘導
  if (!templates || templates.length === 0) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="mt-4 text-lg font-medium text-gray-900">
              倉庫階層が未設定です
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              まず運用設定から倉庫の階層設定を行ってください
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <a
                href="/warehouse-locations"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                ← 戻る
              </a>
              <a
                href="/settings/organization#warehouse-hierarchy"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                階層設定
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <LocationForm templates={templates} action={createWarehouseLocation} />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const [formData, setFormData] = useState({
    project_code: '',
    project_name: '',
    client_id: '',
    start_date: '',
    end_date: '',
    contract_amount: '',
    budget_amount: '',
    status: 'planning' as 'planning' | 'in_progress' | 'completed' | 'cancelled',
    project_manager_id: ''
  })

  useEffect(() => {
    fetchClients()
    fetchUsers()
    generateProjectCode()
  }, [])

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, client_code')
      .eq('is_active', true)
      .eq('client_type', 'customer')
      .or('client_type.eq.both')
      .order('name')

    if (data) setClients(data)
  }

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name, role')
      .in('role', ['manager', 'leader', 'admin'])
      .eq('is_active', true)
      .order('name')

    if (data) setUsers(data)
  }

  const generateProjectCode = async () => {
    const year = new Date().getFullYear()
    const { data, error } = await supabase
      .from('projects')
      .select('project_code')
      .like('project_code', `PRJ-${year}-%`)
      .order('project_code', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].project_code.split('-')[2])
      setFormData(prev => ({
        ...prev,
        project_code: `PRJ-${year}-${String(lastNumber + 1).padStart(4, '0')}`
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        project_code: `PRJ-${year}-0001`
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user?.id)
        .single()

      const projectData = {
        ...formData,
        organization_id: userData?.organization_id,
        contract_amount: formData.contract_amount ? parseFloat(formData.contract_amount) : null,
        budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        project_manager_id: formData.project_manager_id || null
      }

      const { error } = await supabase
        .from('projects')
        .insert(projectData)

      if (error) throw error

      router.push('/projects')
    } catch (error) {
      console.error('Error creating project:', error)
      alert('工事の登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">工事新規登録</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">基本情報</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工事番号
                </label>
                <input
                  type="text"
                  value={formData.project_code}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="planning">計画中</option>
                  <option value="in_progress">進行中</option>
                  <option value="completed">完了</option>
                  <option value="cancelled">キャンセル</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工事名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.project_name}
                onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                placeholder="〇〇ビル新築工事"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                発注者（取引先）
              </label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">選択してください</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.client_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工事責任者
              </label>
              <select
                value={formData.project_manager_id}
                onChange={(e) => setFormData({...formData, project_manager_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">選択してください</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role === 'admin' ? '管理者' : user.role === 'manager' ? 'マネージャー' : 'リーダー'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">工期・金額</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工事開始日
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工事完了予定日
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  min={formData.start_date}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  契約金額
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">¥</span>
                  <input
                    type="number"
                    value={formData.contract_amount}
                    onChange={(e) => setFormData({...formData, contract_amount: e.target.value})}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0"
                    step="1"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  予算金額
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">¥</span>
                  <input
                    type="number"
                    value={formData.budget_amount}
                    onChange={(e) => setFormData({...formData, budget_amount: e.target.value})}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0"
                    step="1"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push('/projects')}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? '登録中...' : '登録'}
          </button>
        </div>
      </form>
    </div>
  )
}
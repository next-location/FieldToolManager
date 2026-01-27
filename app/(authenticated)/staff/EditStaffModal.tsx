'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'staff' | 'leader' | 'manager' | 'admin' | 'super_admin'
  department: string | null
  employee_id: string | null
  phone: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  work_pattern_id: string | null
  is_shift_work: boolean
}

interface EditStaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  staff: User
  departments: string[]
}

export function EditStaffModal({ isOpen, onClose, onSuccess, staff, departments }: EditStaffModalProps) {
  const [name, setName] = useState(staff.name)
  const [email, setEmail] = useState(staff.email)
  const [role, setRole] = useState<'staff' | 'leader' | 'manager' | 'admin'>(staff.role as 'staff' | 'leader' | 'manager' | 'admin')
  const [department, setDepartment] = useState(staff.department || '')
  const [employeeId, setEmployeeId] = useState(staff.employee_id || '')
  const [phone, setPhone] = useState(staff.phone || '')
  const [workPatternId, setWorkPatternId] = useState(staff.work_pattern_id || '')
  const [isShiftWork, setIsShiftWork] = useState(staff.is_shift_work || false)
  const [workPatterns, setWorkPatterns] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 勤務パターン一覧を取得
  useEffect(() => {
    const fetchWorkPatterns = async () => {
      try {
        const response = await fetch('/api/attendance/work-patterns')
        if (response.ok) {
          const data = await response.json()
          setWorkPatterns(data.patterns || [])
        }
      } catch (err) {
        console.error('Failed to fetch work patterns:', err)
      }
    }
    if (isOpen) {
      fetchWorkPatterns()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          department: department || null,
          employee_id: employeeId || null,
          phone: phone || null,
          work_pattern_id: isShiftWork ? null : (workPatternId || null),
          is_shift_work: isShiftWork,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'スタッフの更新に失敗しました')
      }
    } catch (err) {
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const hasChanges =
    name !== staff.name ||
    email !== staff.email ||
    role !== staff.role ||
    department !== (staff.department || '') ||
    employeeId !== (staff.employee_id || '') ||
    phone !== (staff.phone || '') ||
    workPatternId !== (staff.work_pattern_id || '') ||
    isShiftWork !== staff.is_shift_work

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 pt-20 sm:pt-24">
      <div className="bg-white rounded-lg max-w-md w-full p-6 my-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          スタッフ情報を編集: {staff.name}
        </h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">部署</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              list="departments-edit"
              maxLength={50}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <datalist id="departments-edit">
              {departments.map((dept) => (
                <option key={dept} value={dept} />
              ))}
            </datalist>
            {department !== (staff.department || '') && (
              <p className="mt-1 text-xs text-yellow-600">⚠️ 部署変更は履歴に記録されます</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">社員番号</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              権限 <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'staff' | 'leader' | 'manager' | 'admin')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="staff">一般スタッフ</option>
              <option value="leader">リーダー</option>
              <option value="manager">マネージャー</option>
              <option value="admin">管理者</option>
            </select>
            {role !== staff.role && (
              <p className="mt-1 text-xs text-yellow-600">⚠️ 権限変更は履歴に記録されます</p>
            )}
            {staff.role === 'admin' && role !== 'admin' && (
              <p className="mt-1 text-xs text-red-600">⚠️ 最低1人のadminが必要です</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">勤務形態</label>
            <div className="space-y-3">
              <label className="flex items-start">
                <input
                  type="radio"
                  checked={!isShiftWork}
                  onChange={() => setIsShiftWork(false)}
                  className="mt-1 mr-2"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">固定勤務パターン</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    遅刻・早退・残業を自動判定します
                  </p>
                </div>
              </label>
              <label className="flex items-start">
                <input
                  type="radio"
                  checked={isShiftWork}
                  onChange={() => setIsShiftWork(true)}
                  className="mt-1 mr-2"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">シフト制</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    打刻ベースで記録、残業は手動入力
                  </p>
                </div>
              </label>
            </div>
          </div>

          {!isShiftWork && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">勤務パターン</label>
              <select
                value={workPatternId}
                onChange={(e) => setWorkPatternId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">未設定</option>
                {workPatterns.map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                勤務パターンを設定すると、打刻忘れアラートの時刻が自動設定されます
              </p>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">
              アカウント状態: {staff.is_active ? '✅ 有効' : '❌ 無効'}
            </p>
            <p className="text-sm text-gray-600">
              最終ログイン:{' '}
              {staff.last_login_at
                ? new Date(staff.last_login_at).toLocaleString('ja-JP')
                : '未ログイン'}
            </p>
            <p className="text-sm text-gray-600">
              登録日時: {new Date(staff.created_at).toLocaleString('ja-JP')}
            </p>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !hasChanges}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

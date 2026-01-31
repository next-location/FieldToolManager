'use client'

import { useState, useEffect } from 'react'

interface AddStaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  departments: string[]
}

export function AddStaffModal({ isOpen, onClose, onSuccess, departments }: AddStaffModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'staff' | 'leader' | 'manager'>('staff')
  const [department, setDepartment] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [phone, setPhone] = useState('')
  const [workPatternId, setWorkPatternId] = useState('')
  const [isShiftWork, setIsShiftWork] = useState(false)
  const [workPatterns, setWorkPatterns] = useState<Array<{ id: string; name: string; is_default: boolean }>>([])
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

          // デフォルトパターンがあれば自動選択
          const defaultPattern = (data.patterns || []).find((p: any) => p.is_default)
          if (defaultPattern) {
            setWorkPatternId(defaultPattern.id)
          }
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

  const generateRandomPassword = () => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
    let newPassword = ''

    // 必ず英字・数字・記号を含める
    newPassword += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    newPassword += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    newPassword += '0123456789'[Math.floor(Math.random() * 10)]
    newPassword += '!@#$%'[Math.floor(Math.random() * 5)]

    // 残りをランダム生成
    for (let i = 4; i < length; i++) {
      newPassword += charset[Math.floor(Math.random() * charset.length)]
    }

    // シャッフル
    setPassword(
      newPassword
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('')
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role: role === 'staff' ? 'user' : role, // UI上の'staff'をDB上の'user'にマッピング
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
        // フォームリセット
        setName('')
        setEmail('')
        setPassword('')
        setRole('staff')
        setDepartment('')
        setEmployeeId('')
        setPhone('')
        setWorkPatternId('')
        setIsShiftWork(false)
      } else {
        setError(data.error || 'スタッフの追加に失敗しました')
      }
    } catch (err) {
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-40 flex items-center justify-center p-4">
      <div className="relative transform rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-lg max-h-[90vh] mt-16 flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">新規スタッフを追加</h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form id="add-staff-form" onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              初期パスワード <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={100}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={generateRandomPassword}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 text-sm"
              >
                🔄 ランダム生成
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">8文字以上、大文字・小文字・数字必須</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">部署</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              list="departments"
              placeholder="例: 工事部、営業部"
              maxLength={50}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <datalist id="departments">
              {departments.map((dept) => (
                <option key={dept} value={dept} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">社員番号</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="例: EMP-001"
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
              placeholder="例: 090-1234-5678"
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
              onChange={(e) => setRole(e.target.value as 'staff' | 'leader' | 'manager')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="staff">一般スタッフ</option>
              <option value="leader">リーダー</option>
              <option value="manager">マネージャー</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              管理者権限は組織に1人のみ設定可能です
            </p>
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <p>ℹ️ staff: 一般スタッフ（基本操作のみ）</p>
              <p>ℹ️ leader: リーダー（チーム管理権限）</p>
              <p>ℹ️ manager: マネージャー（スタッフ管理権限）</p>
              <p>ℹ️ admin: 管理者（全権限）</p>
            </div>
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
                    {pattern.name} {pattern.is_default ? '(デフォルト)' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                勤務パターンを設定すると、打刻忘れアラートの時刻が自動設定されます
              </p>
            </div>
          )}

            </form>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-200">
          <button
            type="submit"
            form="add-staff-form"
            disabled={loading}
            className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:ml-3 sm:w-auto disabled:opacity-50"
          >
            {loading ? '追加中...' : '追加する'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

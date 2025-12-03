'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SettingsFormProps {
  userId: string
  currentName: string
  currentEmail: string
  currentDepartment?: string
}

export function SettingsForm({ userId, currentName, currentEmail, currentDepartment }: SettingsFormProps) {
  const [name, setName] = useState(currentName)
  const [department, setDepartment] = useState(currentDepartment || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          department: department.trim() || null
        })
        .eq('id', userId)

      if (error) {
        throw error
      }

      setMessage({ type: 'success', text: '設定を保存しました' })
      router.refresh()

      // 3秒後にメッセージを消す
      setTimeout(() => {
        setMessage(null)
      }, 3000)
    } catch (err: any) {
      console.error('Error updating settings:', err)
      setMessage({ type: 'error', text: err.message || '保存に失敗しました' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          氏名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="山田 太郎"
        />
        <p className="mt-1 text-sm text-gray-500">移動履歴などに表示される名前です</p>
      </div>

      <div>
        <label htmlFor="department" className="block text-sm font-medium text-gray-700">
          所属部署
        </label>
        <input
          type="text"
          id="department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="例: 工事部、営業部"
        />
        <p className="mt-1 text-sm text-gray-500">所属している部署名を入力してください</p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          メールアドレス
        </label>
        <input
          type="email"
          id="email"
          value={currentEmail}
          disabled
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500 cursor-not-allowed"
        />
        <p className="mt-1 text-sm text-gray-500">
          メールアドレスの変更は管理者にお問い合わせください
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.push('/profile')}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting || name.trim() === ''}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}

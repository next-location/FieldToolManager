'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SettingsFormProps {
  userId: string
  currentName: string
  currentEmail: string
  currentDepartment?: string
  currentSealData?: string
}

export function SettingsForm({ userId, currentName, currentEmail, currentDepartment, currentSealData }: SettingsFormProps) {
  const [name, setName] = useState(currentName)
  const [department, setDepartment] = useState(currentDepartment || '')
  const [surname, setSurname] = useState('')
  const [sealData, setSealData] = useState(currentSealData || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSealGenerating, setIsSealGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [sealMessage, setSealMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
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

  const handleGenerateSeal = async () => {
    if (!surname.trim()) {
      setSealMessage({ type: 'error', text: '苗字を入力してください' })
      return
    }

    if (surname.length > 4) {
      setSealMessage({ type: 'error', text: '苗字は4文字以内で入力してください' })
      return
    }

    setIsSealGenerating(true)
    setSealMessage(null)

    try {
      const response = await fetch('/api/users/personal-seal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surname: surname.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '印鑑生成に失敗しました')
      }

      const data = await response.json()
      setSealData(data.seal_data)
      setSealMessage({ type: 'success', text: '印鑑を生成しました' })
      router.refresh()

      setTimeout(() => {
        setSealMessage(null)
      }, 3000)
    } catch (err: any) {
      console.error('Error generating seal:', err)
      setSealMessage({ type: 'error', text: err.message || '印鑑生成に失敗しました' })
    } finally {
      setIsSealGenerating(false)
    }
  }

  const handleDeleteSeal = async () => {
    if (!confirm('印鑑を削除してもよろしいですか？')) {
      return
    }

    setIsSealGenerating(true)
    setSealMessage(null)

    try {
      const response = await fetch('/api/users/personal-seal', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '印鑑削除に失敗しました')
      }

      setSealData('')
      setSealMessage({ type: 'success', text: '印鑑を削除しました' })
      router.refresh()

      setTimeout(() => {
        setSealMessage(null)
      }, 3000)
    } catch (err: any) {
      console.error('Error deleting seal:', err)
      setSealMessage({ type: 'error', text: err.message || '印鑑削除に失敗しました' })
    } finally {
      setIsSealGenerating(false)
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
          maxLength={50}
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
          maxLength={50}
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

      {/* 印鑑生成セクション */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">個人印鑑設定</h3>
        <p className="text-sm text-gray-600 mb-4">
          作業報告書などで使用する個人印鑑を生成できます。苗字を入力してシャチハタ風の印鑑を自動生成します。
        </p>

        {sealMessage && (
          <div
            className={`p-4 rounded-md mb-4 ${
              sealMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {sealMessage.text}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-1">
                苗字（1〜4文字）
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  id="surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  maxLength={4}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 山田"
                />
                <button
                  type="button"
                  onClick={handleGenerateSeal}
                  disabled={isSealGenerating || !surname.trim()}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSealGenerating ? '生成中...' : '印鑑を生成'}
                </button>
              </div>
            </div>

            {sealData && (
              <div className="flex flex-col items-center space-y-2">
                <div className="text-sm font-medium text-gray-700">現在の印鑑</div>
                <img
                  src={sealData}
                  alt="個人印鑑"
                  className="w-24 h-24 border border-gray-300 rounded"
                />
                <button
                  type="button"
                  onClick={handleDeleteSeal}
                  disabled={isSealGenerating}
                  className="text-xs text-red-600 hover:text-red-800 disabled:text-gray-400"
                >
                  印鑑を削除
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            ※ 生成した印鑑は作業報告書のPDFで担当印・承認印として使用されます
          </p>
        </div>
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

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RequestDemoForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFreeEmailWarning, setShowFreeEmailWarning] = useState(false)

  const [formData, setFormData] = useState({
    companyName: '',
    personName: '',
    email: '',
    phone: '',
    department: '',
    employeeCount: '',
    toolCount: '',
    timeline: '',
    message: ''
  })

  const freeEmailDomains = ['gmail.com', 'yahoo.co.jp', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com']

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // メールアドレスのフリーメールチェック
    if (name === 'email') {
      const domain = value.split('@')[1]
      setShowFreeEmailWarning(freeEmailDomains.includes(domain))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/demo/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '申込に失敗しました')
      }

      // 成功時は完了ページへリダイレクト
      router.push('/request-demo/success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '申込に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">資料請求フォーム</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 会社名 */}
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
            会社名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            required
            value={formData.companyName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="株式会社サンプル"
          />
        </div>

        {/* ご担当者名 */}
        <div>
          <label htmlFor="personName" className="block text-sm font-medium text-gray-700 mb-1">
            ご担当者名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="personName"
            name="personName"
            required
            value={formData.personName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="山田 太郎"
          />
        </div>

        {/* メールアドレス */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="yamada@example.com"
          />
          {showFreeEmailWarning && (
            <p className="mt-1 text-sm text-yellow-600">
              ⚠️ フリーメールアドレスが入力されています。企業ドメインのメールアドレスを推奨します。
            </p>
          )}
        </div>

        {/* 電話番号 */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            電話番号 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="03-1234-5678"
          />
        </div>

        {/* 部署名 */}
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
            部署名
          </label>
          <input
            type="text"
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="営業部"
          />
        </div>

        {/* 従業員数 */}
        <div>
          <label htmlFor="employeeCount" className="block text-sm font-medium text-gray-700 mb-1">
            従業員数
          </label>
          <select
            id="employeeCount"
            name="employeeCount"
            value={formData.employeeCount}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">選択してください</option>
            <option value="~10名">〜10名</option>
            <option value="11-30名">11-30名</option>
            <option value="31-50名">31-50名</option>
            <option value="51-100名">51-100名</option>
            <option value="101名〜">101名〜</option>
          </select>
        </div>

        {/* 管理予定の資材数 */}
        <div>
          <label htmlFor="toolCount" className="block text-sm font-medium text-gray-700 mb-1">
            管理予定の資材数
          </label>
          <select
            id="toolCount"
            name="toolCount"
            value={formData.toolCount}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">選択してください</option>
            <option value="~100">〜100</option>
            <option value="~200">〜200</option>
            <option value="~300">〜300</option>
            <option value="~500">〜500</option>
            <option value="~1000">〜1000</option>
            <option value="1001~">1001〜</option>
          </select>
        </div>

        {/* 導入予定時期 */}
        <div>
          <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-1">
            導入予定時期
          </label>
          <select
            id="timeline"
            name="timeline"
            value={formData.timeline}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">選択してください</option>
            <option value="1ヶ月以内">1ヶ月以内</option>
            <option value="3ヶ月以内">3ヶ月以内</option>
            <option value="6ヶ月以内">6ヶ月以内</option>
            <option value="未定">未定</option>
          </select>
        </div>

        {/* ご要望・ご質問 */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            ご要望・ご質問
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            value={formData.message}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="ご質問やご要望があればご記入ください"
          />
        </div>

        {/* プライバシーポリシー */}
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              required
              className="mt-1"
            />
            <span className="text-sm text-gray-700">
              <a href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline">プライバシーポリシー</a>に同意します
            </span>
          </label>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-full hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '送信中...' : '資料請求してデモを開始'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          送信後、ご登録のメールアドレスに資料とデモ環境のアクセス情報をお送りします。
        </p>
      </form>
    </div>
  )
}

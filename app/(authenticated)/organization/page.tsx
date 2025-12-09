'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SealFontStyle } from '@/lib/company-seal/generate-seal'
import { ContractManagement } from '@/components/ContractManagement'

interface OrganizationData {
  id: string
  name: string
  postal_code: string | null
  address: string | null
  phone: string | null
  fax: string | null
  company_seal_url: string | null
}

export default function OrganizationPage() {
  const router = useRouter()
  const [organization, setOrganization] = useState<OrganizationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({
    postal_code: '',
    address: '',
    phone: '',
    fax: '',
  })
  const [userRole, setUserRole] = useState<string>('')

  // 角印関連の状態
  const [selectedFontStyle, setSelectedFontStyle] = useState<SealFontStyle>('gothic')
  const [sealPreview, setSealPreview] = useState<string | null>(null)
  const [isGeneratingSeal, setIsGeneratingSeal] = useState(false)
  const [isSavingSeal, setIsSavingSeal] = useState(false)

  useEffect(() => {
    fetchOrganization()
    fetchUserRole()
  }, [])

  const fetchUserRole = async () => {
    try {
      const res = await fetch('/api/users/me')
      if (res.ok) {
        const data = await res.json()
        console.log('User role:', data.role) // デバッグログ
        setUserRole(data.role)
        // adminとsuper_adminの両方を許可
        if (data.role !== 'admin' && data.role !== 'super_admin') {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  const fetchOrganization = async () => {
    try {
      const res = await fetch('/api/organization')
      if (res.ok) {
        const data = await res.json()
        setOrganization(data)
        setFormData({
          postal_code: data.postal_code || '',
          address: data.address || '',
          phone: data.phone || '',
          fax: data.fax || '',
        })
        // 保存された角印データがあれば表示
        if (data.company_seal_url) {
          setSealPreview(data.company_seal_url)
        }
      } else {
        setMessage({ type: 'error', text: '組織情報の取得に失敗しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      setMessage({ type: 'error', text: '管理者権限が必要です' })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      // 角印データも含めて送信
      const dataToSubmit = {
        ...formData,
        company_seal_url: sealPreview // 角印データを含める
      }

      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      })

      if (res.ok) {
        const data = await res.json()
        setOrganization(data)
        setMessage({ type: 'success', text: '組織情報を更新しました' })
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || '更新に失敗しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setIsSaving(false)
    }
  }

  // 角印生成
  const generateSeal = async () => {
    if (!organization?.name) return

    setIsGeneratingSeal(true)
    try {
      const res = await fetch('/api/company-seal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: organization.name,
          fontStyle: selectedFontStyle
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSealPreview(data.dataUrl)
      } else {
        setMessage({ type: 'error', text: '角印の生成に失敗しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '角印生成エラーが発生しました' })
    } finally {
      setIsGeneratingSeal(false)
    }
  }

  // 書体選択時の処理
  const handleFontStyleChange = (style: SealFontStyle) => {
    setSelectedFontStyle(style)
    setSealPreview(null) // プレビューをリセット
  }

  // 角印ダウンロード
  const downloadSeal = () => {
    if (!sealPreview || !organization) return

    const link = document.createElement('a')
    link.download = `角印_${organization.name}_${selectedFontStyle}.png`
    link.href = sealPreview
    link.click()
  }

  // 角印を保存
  const saveSeal = async () => {
    if (!sealPreview) return

    setIsSavingSeal(true)
    setMessage(null)

    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_seal_url: sealPreview }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: '角印を保存しました' })
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || '角印の保存に失敗しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '角印の保存中にエラーが発生しました' })
    } finally {
      setIsSavingSeal(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">このページは管理者のみアクセス可能です。</p>
          <p className="text-xs text-gray-600 mt-2">（現在のロール: {userRole}）</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* ヘッダー */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          ← ダッシュボードに戻る
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">組織情報設定</h1>
        <p className="mt-1 text-sm text-gray-600">
          組織の基本情報を編集できます（管理者のみ）
        </p>
      </div>

      {/* メッセージ表示 */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 契約管理セクション（super_adminのみ表示） */}
      {userRole === 'super_admin' && organization && (
        <div className="mb-6">
          <ContractManagement
            organizationId={organization.id}
            isSuperAdmin={true}
          />
        </div>
      )}

      {/* フォーム */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 社名（編集不可） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              社名
            </label>
            <div className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
              {organization?.name}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              ※社名の変更はシステム管理者にお問い合わせください
            </p>
          </div>

          {/* 郵便番号 */}
          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
              郵便番号
            </label>
            <input
              type="text"
              id="postal_code"
              name="postal_code"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 100-0001"
            />
          </div>

          {/* 住所 */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              住所
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 東京都千代田区千代田1-1"
            />
          </div>

          {/* 電話番号 */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              電話番号
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 03-1234-5678"
            />
          </div>

          {/* FAX番号 */}
          <div>
            <label htmlFor="fax" className="block text-sm font-medium text-gray-700 mb-1">
              FAX番号
            </label>
            <input
              type="tel"
              id="fax"
              name="fax"
              value={formData.fax}
              onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 03-1234-5679"
            />
          </div>

          {/* 角印 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角印生成
            </label>
            <div className="space-y-4">
              {/* 書体選択 */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'gothic', label: 'ゴシック体', description: 'モダンで読みやすい' },
                  { value: 'mincho', label: '明朝体', description: '伝統的で格式高い' },
                  { value: 'classical', label: '古印体', description: '趣のある筆文字風' },
                ].map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => handleFontStyleChange(style.value as SealFontStyle)}
                    className={`relative p-3 rounded-lg border-2 transition-all ${
                      selectedFontStyle === style.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{style.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{style.description}</div>
                  </button>
                ))}
              </div>

              {/* プレビューエリア */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                  <div className="p-6 border-2 border-gray-200 rounded-lg bg-gray-50">
                    {sealPreview ? (
                      <div className="flex flex-col items-center space-y-4">
                        <img
                          src={sealPreview}
                          alt="角印プレビュー"
                          className="w-48 h-48 object-contain bg-white rounded-lg shadow-md"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={saveSeal}
                            disabled={isSavingSeal}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isSavingSeal ? '保存中...' : '角印を保存'}
                          </button>
                          <button
                            type="button"
                            onClick={downloadSeal}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            ダウンロード
                          </button>
                          <button
                            type="button"
                            onClick={generateSeal}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                          >
                            再生成
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">
                          角印のプレビューがここに表示されます
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 生成ボタン */}
                {!sealPreview && (
                  <div>
                    <button
                      type="button"
                      onClick={generateSeal}
                      disabled={isGeneratingSeal || !organization?.name}
                      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGeneratingSeal ? '生成中...' : '角印を生成'}
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500">
                ※ 生成された角印はPNG形式でダウンロードできます。PDFの角印欄に自動的に適用されます。
              </p>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
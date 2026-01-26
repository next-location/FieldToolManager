'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SealFontStyle } from '@/lib/company-seal/generate-seal'
import { ContractManagement } from '@/components/ContractManagement'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { AttendanceSettings } from '@/components/AttendanceSettings'

interface OrganizationData {
  id: string
  name: string
  postal_code: string | null
  address: string | null
  phone: string | null
  fax: string | null
  company_seal_url: string | null
  invoice_registration_number: string | null
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
    invoice_registration_number: '',
  })
  const [userRole, setUserRole] = useState<string>('')

  // 角印関連の状態
  const [sealPreview, setSealPreview] = useState<string | null>(null)
  const [isGeneratingSeal, setIsGeneratingSeal] = useState(false)
  const [isSavingSeal, setIsSavingSeal] = useState(false)
  const [isCustomSeal, setIsCustomSeal] = useState(false) // カスタム角印かどうか

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
          invoice_registration_number: data.invoice_registration_number || '',
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
    if (!organization?.name) {
      setMessage({ type: 'error', text: '組織名が設定されていません' })
      return
    }

    setIsGeneratingSeal(true)
    setMessage(null)
    console.log('[角印生成] リクエスト開始:', { name: organization.name, fontStyle: 'gothic' })

    try {
      const res = await fetch('/api/company-seal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: organization.name,
          fontStyle: 'gothic'
        })
      })

      console.log('[角印生成] レスポンスステータス:', res.status)

      if (res.ok) {
        const data = await res.json()
        console.log('[角印生成] 成功 - dataUrl length:', data.dataUrl?.length)
        setSealPreview(data.dataUrl)
        setIsCustomSeal(false) // 生成された角印はカスタムではない
        setMessage({ type: 'success', text: '角印を生成しました' })
      } else {
        const errorData = await res.json()
        console.error('[角印生成] エラー:', errorData)
        setMessage({
          type: 'error',
          text: `角印の生成に失敗しました: ${errorData.error || '不明なエラー'}`
        })
      }
    } catch (error) {
      console.error('[角印生成] 例外:', error)
      setMessage({
        type: 'error',
        text: `角印生成エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      })
    } finally {
      setIsGeneratingSeal(false)
    }
  }

  // 角印ダウンロード
  const downloadSeal = () => {
    if (!sealPreview || !organization) return

    const link = document.createElement('a')
    const filename = isCustomSeal
      ? `角印_${organization.name}_カスタム.png`
      : `角印_${organization.name}.png`
    link.download = filename
    link.href = sealPreview
    link.click()
  }

  // PNGファイルアップロード
  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイル形式チェック
    if (file.type !== 'image/png') {
      setMessage({ type: 'error', text: 'PNGファイルのみアップロード可能です' })
      return
    }

    // ファイルサイズチェック (2MB制限)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      setMessage({ type: 'error', text: 'ファイルサイズは2MB以下にしてください' })
      return
    }

    // ファイルを読み込んでプレビュー表示
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setSealPreview(dataUrl)
      setIsCustomSeal(true)
      setMessage({ type: 'success', text: 'カスタム角印をアップロードしました' })
    }
    reader.onerror = () => {
      setMessage({ type: 'error', text: 'ファイルの読み込みに失敗しました' })
    }
    reader.readAsDataURL(file)
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
    return <LoadingSpinner />
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
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">組織情報設定</h1>
        <p className="mt-2 text-sm text-gray-600">
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

          {/* インボイス番号 */}
          <div>
            <label htmlFor="invoice_registration_number" className="block text-sm font-medium text-gray-700 mb-1">
              インボイス番号（適格請求書発行事業者登録番号）
            </label>
            <input
              type="text"
              id="invoice_registration_number"
              name="invoice_registration_number"
              value={formData.invoice_registration_number}
              onChange={(e) => setFormData({ ...formData, invoice_registration_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: T1234567890123"
              maxLength={14}
            />
            <p className="mt-1 text-xs text-gray-500">
              ※ 適格請求書発行事業者の登録番号（Tから始まる13桁の番号）を入力してください。登録済みの場合、見積書・請求書・領収書にインボイス番号が記載されます。
            </p>
          </div>

          {/* 角印 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角印設定
            </label>
            <div className="space-y-6">
              {/* 自動生成セクション */}
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">角印を自動生成</h3>
                <p className="text-sm text-gray-600 mb-4">
                  会社名から自動的に角印を生成します
                </p>
                <button
                  type="button"
                  onClick={generateSeal}
                  disabled={isGeneratingSeal || !organization?.name || isCustomSeal}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGeneratingSeal ? '生成中...' : isCustomSeal ? 'カスタム角印使用中' : '角印を生成'}
                </button>
              </div>

              {/* カスタムPNGアップロードセクション */}
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">カスタム角印をアップロード</h3>
                <p className="text-xs text-gray-600 mb-3">
                  独自の角印PNGファイルを使用できます。自動生成した角印は無効になります。
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                  <p className="text-xs text-yellow-800 font-medium mb-1">⚠️ 注意事項</p>
                  <ul className="text-xs text-yellow-700 space-y-1 ml-4 list-disc">
                    <li><strong>ファイル形式:</strong> PNGファイルのみ対応</li>
                    <li><strong>ファイルサイズ:</strong> 2MB以下</li>
                    <li><strong>背景透過:</strong> 背景が透過されていないと、書類に表示した際に白い背景が表示されます</li>
                  </ul>
                </div>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleSealUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    cursor-pointer"
                />
              </div>

              {/* プレビューエリア */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                  <div className="p-6 border-2 border-gray-200 rounded-lg bg-gray-50">
                    {sealPreview ? (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                          <img
                            src={sealPreview}
                            alt="角印プレビュー"
                            className="w-48 h-48 object-contain bg-white rounded-lg shadow-md"
                          />
                          {isCustomSeal && (
                            <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                              カスタム
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
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
                          {!isCustomSeal && (
                            <button
                              type="button"
                              onClick={generateSeal}
                              disabled={isGeneratingSeal}
                              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isGeneratingSeal ? '生成中...' : '再生成'}
                            </button>
                          )}
                          {isCustomSeal && (
                            <button
                              type="button"
                              onClick={() => {
                                setSealPreview(null)
                                setIsCustomSeal(false)
                              }}
                              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                              削除
                            </button>
                          )}
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
              </div>

              <p className="text-xs text-gray-500">
                ※ 保存した角印は見積書・請求書・領収書などのPDF書類に自動的に表示されます。
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

      {/* 出退勤アラート設定 */}
      {organization && <AttendanceSettings organizationId={organization.id} />}
      </div>
    </div>
  )
}
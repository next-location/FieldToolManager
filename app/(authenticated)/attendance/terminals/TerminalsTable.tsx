'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RegisterTerminalModal } from './RegisterTerminalModal'
import { Plus } from 'lucide-react'

interface Site {
  id: string
  name: string
}

interface Terminal {
  id: string
  device_name: string
  device_type: 'office' | 'site'
  site_id: string | null
  site?: { id: string; name: string } | null
  access_token: string
  is_active: boolean
  last_accessed_at: string | null
  created_at: string
}

interface TerminalsTableProps {
  sitesList: Site[]
  userRole: string
}

export function TerminalsTable({ sitesList, userRole }: TerminalsTableProps) {
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [loading, setLoading] = useState(true)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const router = useRouter()

  // スクロール検知
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // データ取得
  useEffect(() => {
    fetchTerminals()
  }, [])

  const fetchTerminals = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/attendance/terminals')
      if (response.ok) {
        const data = await response.json()
        setTerminals(data.terminals)
      }
    } catch (error) {
      console.error('Failed to fetch terminals:', error)
    } finally {
      setLoading(false)
    }
  }

  // 端末削除
  const handleDelete = async (terminalId: string, deviceName: string) => {
    if (!confirm(`端末「${deviceName}」を削除しますか？`)) return

    try {
      const response = await fetch(`/api/attendance/terminals/${terminalId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '削除に失敗しました')
      }

      setMessage({ type: 'success', text: '端末を削除しました' })
      fetchTerminals()
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  // 有効/無効切り替え
  const handleToggleActive = async (terminalId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/attendance/terminals/${terminalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '更新に失敗しました')
      }

      setMessage({ type: 'success', text: `端末を${!currentStatus ? '有効' : '無効'}にしました` })
      fetchTerminals()
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  // QR表示URLをコピー
  const handleCopyUrl = (accessToken: string) => {
    const url = `${window.location.origin}/attendance/terminal/${accessToken}`
    navigator.clipboard.writeText(url)
    setMessage({ type: 'success', text: 'URLをコピーしました' })
  }

  // 日時フォーマット
  const formatDateTime = (datetime: string | null) => {
    if (!datetime) return '---'
    return new Date(datetime).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (datetime: string) => {
    return new Date(datetime).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  if (loading && terminals.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* メッセージ */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ヘッダー（PC のみ表示）*/}
      <div className="hidden sm:flex items-center justify-between mb-4">
        <div className="text-sm text-gray-700">
          全 {terminals.length} 台の端末
        </div>
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          端末登録
        </button>
      </div>

      {/* モバイル用件数表示 */}
      <div className="sm:hidden mb-4 text-sm text-gray-700">
        全 {terminals.length} 台の端末
      </div>

      {/* テーブル（PC のみ表示）*/}
      <div className="hidden sm:block overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                端末名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                タイプ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                現場
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最終アクセス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登録日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {terminals.map((terminal) => (
              <tr key={terminal.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {terminal.device_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {terminal.device_type === 'office' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      会社
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      現場
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {terminal.site?.name || '---'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateTime(terminal.last_accessed_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(terminal.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {terminal.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      有効
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      無効
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyUrl(terminal.access_token)}
                      className="text-blue-600 hover:text-blue-900"
                      title="QR表示URLをコピー"
                    >
                      URL
                    </button>
                    <button
                      onClick={() => handleToggleActive(terminal.id, terminal.is_active)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      {terminal.is_active ? '無効化' : '有効化'}
                    </button>
                    <button
                      onClick={() => handleDelete(terminal.id, terminal.device_name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* カード表示（モバイルのみ）*/}
      <div className="sm:hidden space-y-4">
        {terminals.map((terminal) => (
          <div key={terminal.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-gray-900">{terminal.device_name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  {terminal.device_type === 'office' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      会社
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      現場
                    </span>
                  )}
                  {terminal.is_active ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      有効
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      無効
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">現場:</span>
                <span className="text-gray-900">{terminal.site?.name || '---'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">最終アクセス:</span>
                <span className="text-gray-900">{formatDateTime(terminal.last_accessed_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">登録日:</span>
                <span className="text-gray-900">{formatDate(terminal.created_at)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => handleCopyUrl(terminal.access_token)}
                className="text-sm text-blue-600 hover:text-blue-900 font-medium"
              >
                URLコピー
              </button>
              <button
                onClick={() => handleToggleActive(terminal.id, terminal.is_active)}
                className="text-sm text-yellow-600 hover:text-yellow-900 font-medium"
              >
                {terminal.is_active ? '無効化' : '有効化'}
              </button>
              <button
                onClick={() => handleDelete(terminal.id, terminal.device_name)}
                className="text-sm text-red-600 hover:text-red-900 font-medium ml-auto"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {terminals.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">端末が登録されていません</p>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 sm:hidden"
          >
            最初の端末を登録
          </button>
        </div>
      )}

      {/* モバイル用FABボタン */}
      <button
        onClick={() => setIsRegisterModalOpen(true)}
        className={`sm:hidden fixed right-4 bottom-4 z-40 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all duration-200 flex items-center justify-center ${
          isScrolled ? 'w-10 h-10' : 'w-14 h-14'
        }`}
        aria-label="端末登録"
      >
        <Plus className={isScrolled ? 'w-5 h-5' : 'w-6 h-6'} />
      </button>

      {/* 登録モーダル */}
      <RegisterTerminalModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          fetchTerminals()
          router.refresh()
          setMessage({ type: 'success', text: '端末を登録しました' })
        }}
        sitesList={sitesList}
      />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { AuditLog } from '@/types/audit-log'
import AuditLogFiltersModal from '@/components/admin/AuditLogFiltersModal'
import AuditLogMobileMenu from '@/components/admin/AuditLogMobileMenu'

interface AuditLogListProps {
  initialAuditLogs: (AuditLog & {
    users?: {
      name: string | null
      email: string | null
    } | null
  })[]
  currentPage: number
  totalPages: number
  totalCount: number
  uniqueActions: string[]
  uniqueEntities: string[]
  uniqueUsers: { id: string; name: string }[]
}

export function AuditLogList({
  initialAuditLogs,
  currentPage,
  totalPages,
  totalCount,
  uniqueActions,
  uniqueEntities,
  uniqueUsers,
}: AuditLogListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // サーバーから受け取った絞り込み済みデータをそのまま使用（useStateは不要）
  const [actionFilter, setActionFilter] = useState<string>(searchParams.get('action') || 'all')
  const [entityFilter, setEntityFilter] = useState<string>(searchParams.get('entity') || 'all')
  const [userFilter, setUserFilter] = useState<string>(searchParams.get('user_id') || 'all')
  const [startDate, setStartDate] = useState(searchParams.get('start_date') || '')
  const [endDate, setEndDate] = useState(searchParams.get('end_date') || '')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  // サーバーサイドフィルタリング用の関数
  const applyFilters = () => {
    const params = new URLSearchParams()
    if (actionFilter !== 'all') params.set('action', actionFilter)
    if (entityFilter !== 'all') params.set('entity', entityFilter)
    if (userFilter !== 'all') params.set('user_id', userFilter)
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    params.set('page', '1') // フィルター変更時は1ページ目に戻る

    router.push(`/admin/audit-logs?${params.toString()}`)
  }

  // サーバーサイドで絞り込み済みのデータをそのまま使用
  const filteredLogs = initialAuditLogs

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: '作成',
      insert: '登録',
      update: '更新',
      delete: '削除',
      view: '閲覧',
      login: 'ログイン',
      logout: 'ログアウト',
      password_change: 'パスワード変更',
      password_reset: 'パスワードリセット',
      export: 'エクスポート',
      approve: '承認',
      reject: '差戻し',
      submit: '提出',
      send: '送信',
      receive: '受領',
      pay: '支払',
      move: '移動',
      checkout: '持出',
      checkin: '返却',
      transfer: '移動',
      adjust: '在庫調整',
      add: '追加',
      remove: '削除',
    }
    return labels[action.toLowerCase()] || action
  }

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase()
    switch (lowerAction) {
      case 'create':
      case 'insert':
      case 'add':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
      case 'remove':
        return 'bg-red-100 text-red-800'
      case 'view':
        return 'bg-gray-100 text-gray-800'
      case 'login':
      case 'logout':
        return 'bg-purple-100 text-purple-800'
      case 'export':
        return 'bg-yellow-100 text-yellow-800'
      case 'approve':
      case 'submit':
        return 'bg-green-100 text-green-800'
      case 'reject':
        return 'bg-red-100 text-red-800'
      case 'send':
      case 'receive':
      case 'pay':
        return 'bg-blue-100 text-blue-800'
      case 'move':
      case 'checkout':
      case 'checkin':
      case 'transfer':
        return 'bg-orange-100 text-orange-800'
      case 'adjust':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      tools: '道具',
      tool_items: '道具個体',
      tool_movements: '道具移動',
      users: 'ユーザー',
      organizations: '組織',
      sites: '現場',
      clients: '取引先',
      equipment: '重機',
      consumables: '消耗品',
      movements: '移動履歴',
      warehouse_locations: '倉庫位置',
      tool_sets: '道具セット',
      auth: '認証',
      projects: 'プロジェクト',
      purchase_orders: '発注書',
      invoices: '請求書',
      estimates: '見積書',
      work_reports: '作業報告',
      settings: '設定',
    }
    return labels[entityType] || entityType
  }

  const handleExportCSV = () => {
    const headers = ['日時', '操作', 'エンティティ', 'ユーザー', 'IPアドレス']
    const rows = filteredLogs.map((log) => [
      new Date(log.created_at).toLocaleString('ja-JP'),
      getActionLabel(log.action),
      getEntityLabel(log.entity_type),
      log.users?.name || log.users?.email || '不明',
      log.ip_address || '',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows].map((row) => row.join(',')).join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleApplyFilters = () => {
    applyFilters()
  }

  const handleResetFilters = () => {
    setActionFilter('all')
    setEntityFilter('all')
    setUserFilter('all')
    setStartDate('')
    setEndDate('')
    router.push('/admin/audit-logs')
  }

  // フィルター数をカウント
  const filterCount = [
    actionFilter !== 'all' ? 1 : 0,
    entityFilter !== 'all' ? 1 : 0,
    userFilter !== 'all' ? 1 : 0,
    startDate ? 1 : 0,
    endDate ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  // ページ遷移関数
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams()
    if (actionFilter !== 'all') params.set('action', actionFilter)
    if (entityFilter !== 'all') params.set('entity', entityFilter)
    if (userFilter !== 'all') params.set('user_id', userFilter)
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    params.set('page', newPage.toString())

    router.push(`/admin/audit-logs?${params.toString()}`)
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">監査ログ</h1>
          <div className="hidden sm:flex">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSVエクスポート
            </button>
          </div>
          <div className="sm:hidden">
            <AuditLogMobileMenu onExport={handleExportCSV} />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          システム内の操作履歴を確認できます（管理者専用）
        </p>
      </div>

      {/* フィルタ - Mobile */}
      <div className="sm:hidden mb-6">
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="relative w-full p-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <SlidersHorizontal className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">フィルター</span>
          {filterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {/* フィルタ - PC */}
      <div className="hidden sm:block bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">フィルター</h2>
          {filterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              クリア
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 開始日 */}
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              開始日
            </label>
            <input
              type="date"
              id="start_date"
              value={startDate}
              onChange={(e) => {
                const newValue = e.target.value
                setStartDate(newValue)
                // 即座にサーバーサイドフィルタリングを実行
                const params = new URLSearchParams()
                if (actionFilter !== 'all') params.set('action', actionFilter)
                if (entityFilter !== 'all') params.set('entity', entityFilter)
                if (userFilter !== 'all') params.set('user_id', userFilter)
                if (newValue && newValue.trim() !== '') params.set('start_date', newValue)
                if (endDate && endDate.trim() !== '') params.set('end_date', endDate)
                params.set('page', '1')
                router.push(`/admin/audit-logs?${params.toString()}`)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* 終了日 */}
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              終了日
            </label>
            <input
              type="date"
              id="end_date"
              value={endDate}
              onChange={(e) => {
                const newValue = e.target.value
                setEndDate(newValue)
                // 即座にサーバーサイドフィルタリングを実行
                const params = new URLSearchParams()
                if (actionFilter !== 'all') params.set('action', actionFilter)
                if (entityFilter !== 'all') params.set('entity', entityFilter)
                if (userFilter !== 'all') params.set('user_id', userFilter)
                if (startDate && startDate.trim() !== '') params.set('start_date', startDate)
                if (newValue && newValue.trim() !== '') params.set('end_date', newValue)
                params.set('page', '1')
                router.push(`/admin/audit-logs?${params.toString()}`)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* アクションフィルター */}
          <div>
            <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">
              操作
            </label>
            <select
              id="action"
              value={actionFilter}
              onChange={(e) => {
                const newValue = e.target.value
                setActionFilter(newValue)
                // 即座にサーバーサイドフィルタリングを実行
                const params = new URLSearchParams()
                if (newValue !== 'all') params.set('action', newValue)
                if (entityFilter !== 'all') params.set('entity', entityFilter)
                if (userFilter !== 'all') params.set('user_id', userFilter)
                if (startDate) params.set('start_date', startDate)
                if (endDate) params.set('end_date', endDate)
                params.set('page', '1')
                router.push(`/admin/audit-logs?${params.toString()}`)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">すべて</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {getActionLabel(action)}
                </option>
              ))}
            </select>
          </div>

          {/* エンティティフィルター */}
          <div>
            <label htmlFor="entity" className="block text-sm font-medium text-gray-700 mb-1">
              エンティティ
            </label>
            <select
              id="entity"
              value={entityFilter}
              onChange={(e) => {
                const newValue = e.target.value
                setEntityFilter(newValue)
                // 即座にサーバーサイドフィルタリングを実行
                const params = new URLSearchParams()
                if (actionFilter !== 'all') params.set('action', actionFilter)
                if (newValue !== 'all') params.set('entity', newValue)
                if (userFilter !== 'all') params.set('user_id', userFilter)
                if (startDate) params.set('start_date', startDate)
                if (endDate) params.set('end_date', endDate)
                params.set('page', '1')
                router.push(`/admin/audit-logs?${params.toString()}`)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">すべて</option>
              {uniqueEntities.map((entity) => (
                <option key={entity} value={entity}>
                  {getEntityLabel(entity)}
                </option>
              ))}
            </select>
          </div>

          {/* スタッフフィルター */}
          <div>
            <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
              スタッフ
            </label>
            <select
              id="user"
              value={userFilter}
              onChange={(e) => {
                const newValue = e.target.value
                setUserFilter(newValue)
                // 即座にサーバーサイドフィルタリングを実行
                const params = new URLSearchParams()
                if (actionFilter !== 'all') params.set('action', actionFilter)
                if (entityFilter !== 'all') params.set('entity', entityFilter)
                if (newValue !== 'all') params.set('user_id', newValue)
                if (startDate) params.set('start_date', startDate)
                if (endDate) params.set('end_date', endDate)
                params.set('page', '1')
                router.push(`/admin/audit-logs?${params.toString()}`)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">すべて</option>
              {uniqueUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 結果件数表示とページ情報 */}
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="text-sm text-gray-600">
          全 {totalCount} 件中 {filteredLogs.length} 件を表示
        </div>
        {totalPages > 1 && (
          <div className="text-sm text-gray-600">
            ページ {currentPage} / {totalPages}
          </div>
        )}
      </div>

      {/* 監査ログリスト */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">監査ログはありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    エンティティ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IPアドレス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    詳細
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}
                        >
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getEntityLabel(log.entity_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.users?.name || log.users?.email || '不明'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {expandedLog === log.id ? '閉じる' : '表示'}
                        </button>
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="text-sm">
                            <div className="mb-2">
                              <span className="font-semibold">Entity ID:</span> {log.entity_id || '-'}
                            </div>
                            <div className="mb-2">
                              <span className="font-semibold">User Agent:</span>{' '}
                              {log.user_agent || '-'}
                            </div>
                            {log.old_values && (
                              <div className="mb-2">
                                <span className="font-semibold">変更前:</span>
                                <pre className="mt-1 p-2 bg-white border border-gray-200 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.old_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <span className="font-semibold">変更後:</span>
                                <pre className="mt-1 p-2 bg-white border border-gray-200 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.new_values, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ページネーションコントロール */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前へ
          </button>

          {/* ページ番号ボタン */}
          <div className="hidden sm:flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // 最初、最後、現在ページ前後2ページを表示
                return (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 2 && page <= currentPage + 2)
                )
              })
              .map((page, index, arr) => {
                // ... で省略表示
                const showEllipsisBefore = index > 0 && page - arr[index - 1] > 1
                return (
                  <div key={page} className="flex items-center gap-1">
                    {showEllipsisBefore && (
                      <span className="px-2 text-gray-500">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                )
              })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}

      {/* モバイル用フィルターモーダル */}
      <AuditLogFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        actionFilter={actionFilter}
        entityFilter={entityFilter}
        userFilter={userFilter}
        startDate={startDate}
        endDate={endDate}
        onActionChange={setActionFilter}
        onEntityChange={setEntityFilter}
        onUserChange={setUserFilter}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        uniqueActions={uniqueActions}
        uniqueEntities={uniqueEntities}
        uniqueUsers={uniqueUsers}
        getActionLabel={getActionLabel}
        getEntityLabel={getEntityLabel}
      />
    </div>
  )
}

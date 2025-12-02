'use client'

import { useState } from 'react'
import { AuditLog } from '@/types/audit-log'

interface AuditLogListProps {
  initialAuditLogs: (AuditLog & {
    users?: {
      full_name: string | null
      email: string | null
    } | null
  })[]
}

export function AuditLogList({ initialAuditLogs }: AuditLogListProps) {
  const [auditLogs] = useState(initialAuditLogs)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  // フィルタリングされた監査ログ
  const filteredLogs = auditLogs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false
    if (entityFilter !== 'all' && log.entity_type !== entityFilter) return false
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        log.entity_type.toLowerCase().includes(searchLower) ||
        log.entity_id?.toLowerCase().includes(searchLower) ||
        log.users?.full_name?.toLowerCase().includes(searchLower) ||
        log.users?.email?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  // ユニークなアクション一覧
  const uniqueActions = Array.from(new Set(auditLogs.map((log) => log.action)))
  // ユニークなエンティティ一覧
  const uniqueEntities = Array.from(new Set(auditLogs.map((log) => log.entity_type)))

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: '作成',
      update: '更新',
      delete: '削除',
      view: '閲覧',
      login: 'ログイン',
      logout: 'ログアウト',
      export: 'エクスポート',
    }
    return labels[action] || action
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      case 'view':
        return 'bg-gray-100 text-gray-800'
      case 'login':
      case 'logout':
        return 'bg-purple-100 text-purple-800'
      case 'export':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      tools: '道具',
      tool_items: '道具個体',
      users: 'ユーザー',
      organizations: '組織',
      sites: '現場',
      movements: '移動履歴',
      warehouse_locations: '倉庫位置',
      tool_sets: '道具セット',
    }
    return labels[entityType] || entityType
  }

  const handleExportCSV = () => {
    const headers = ['日時', '操作', 'エンティティ', 'ユーザー', 'IPアドレス']
    const rows = filteredLogs.map((log) => [
      new Date(log.created_at).toLocaleString('ja-JP'),
      getActionLabel(log.action),
      getEntityLabel(log.entity_type),
      log.users?.full_name || log.users?.email || '不明',
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

  return (
    <div>
      {/* フィルター・検索・エクスポート */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">検索</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ユーザー名、エンティティなど"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* アクションフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">エンティティ</label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              {uniqueEntities.map((entity) => (
                <option key={entity} value={entity}>
                  {getEntityLabel(entity)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">{filteredLogs.length}件の記録</p>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            CSVエクスポート
          </button>
        </div>
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
                        {log.users?.full_name || log.users?.email || '不明'}
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
    </div>
  )
}

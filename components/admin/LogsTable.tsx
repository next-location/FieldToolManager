'use client';

import { useState, useEffect } from 'react';

interface SuperAdmin {
  id: string;
  name: string;
  email: string;
}

interface Log {
  id: string;
  super_admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  performed_at: string;
  admin: SuperAdmin;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// アクション名の日本語変換
const ACTION_LABELS: Record<string, string> = {
  login: 'ログイン',
  logout: 'ログアウト',
  create_contract_draft: '契約作成（下書き）',
  activate_contract: '契約有効化',
  suspend_contract: '契約停止',
  cancel_contract: '契約キャンセル',
  update_contract: '契約更新',
  view_organization_data: '組織データ閲覧',
  create_organization: '組織作成',
  update_organization: '組織更新',
  create_package: 'パッケージ作成',
  update_package: 'パッケージ更新',
  delete_package: 'パッケージ削除',
};

// ターゲットタイプの日本語変換
const TARGET_TYPE_LABELS: Record<string, string> = {
  contract: '契約',
  organization: '組織',
  package: 'パッケージ',
  user: 'ユーザー',
};

export default function LogsTable() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  // フィルター
  const [filters, setFilters] = useState({
    action: '',
    target_type: '',
    start_date: '',
    end_date: '',
  });

  // ログ取得
  const fetchLogs = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      });

      const response = await fetch(`/api/admin/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  // 詳細モーダル表示
  const showDetails = (log: Log) => {
    setSelectedLog(log);
  };

  // 詳細モーダルを閉じる
  const closeDetails = () => {
    setSelectedLog(null);
  };

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-900 mb-3">フィルター</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              アクション
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">全て</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              対象タイプ
            </label>
            <select
              value={filters.target_type}
              onChange={(e) => setFilters({ ...filters, target_type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">全て</option>
              {Object.entries(TARGET_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              開始日時
            </label>
            <input
              type="datetime-local"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              終了日時
            </label>
            <input
              type="datetime-local"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* ログテーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日時
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  管理者
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  対象
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IPアドレス
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  詳細
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    読み込み中...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    ログがありません
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.performed_at).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="text-gray-900">{log.admin.name}</div>
                      <div className="text-xs text-gray-500">{log.admin.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {log.target_type ? (
                        <div>
                          <div className="font-medium">
                            {TARGET_TYPE_LABELS[log.target_type] || log.target_type}
                          </div>
                          {log.target_id && (
                            <div className="text-xs text-gray-500 font-mono">
                              {log.target_id.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => showDetails(log)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        詳細
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              全 {pagination.total} 件中 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 件を表示
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">ログ詳細</h2>
              <button
                onClick={closeDetails}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日時</label>
                <div className="text-sm text-gray-900">
                  {new Date(selectedLog.performed_at).toLocaleString('ja-JP')}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">管理者</label>
                <div className="text-sm text-gray-900">
                  {selectedLog.admin.name} ({selectedLog.admin.email})
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">アクション</label>
                <div className="text-sm text-gray-900">
                  {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                </div>
              </div>

              {selectedLog.target_type && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">対象</label>
                  <div className="text-sm text-gray-900">
                    {TARGET_TYPE_LABELS[selectedLog.target_type] || selectedLog.target_type}
                    {selectedLog.target_id && (
                      <span className="ml-2 font-mono text-xs text-gray-500">
                        ({selectedLog.target_id})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedLog.ip_address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IPアドレス</label>
                  <div className="text-sm text-gray-900 font-mono">{selectedLog.ip_address}</div>
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                  <div className="text-xs text-gray-600 break-all">{selectedLog.user_agent}</div>
                </div>
              )}

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">詳細情報</label>
                  <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4">
              <button
                onClick={closeDetails}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

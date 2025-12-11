'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CsvImportModal from './CsvImportModal';

interface Tool {
  id: string;
  name: string;
  model_number: string | null;
  manufacturer: string | null;
  management_type: string;
  unit: string;
  purchase_price: number | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tool_categories: {
    id: string;
    name: string;
  } | null;
}

export default function CommonToolsList() {
  const router = useRouter();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [managementTypeFilter, setManagementTypeFilter] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTool, setDeletingTool] = useState<Tool | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // 道具一覧取得
  const fetchTools = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (managementTypeFilter) params.append('management_type', managementTypeFilter);

      const response = await fetch(`/api/admin/tools/common?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTools(data.tools || []);
      } else {
        console.error('Failed to fetch tools');
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [search, managementTypeFilter]);

  // 削除処理
  const handleDelete = async () => {
    if (!deletingTool) return;

    try {
      const response = await fetch(`/api/admin/tools/common/${deletingTool.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('共通道具を削除しました');
        setShowDeleteModal(false);
        setDeletingTool(null);
        fetchTools();
      } else {
        const error = await response.json();
        alert(`削除に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting tool:', error);
      alert('削除中にエラーが発生しました');
    }
  };

  const managementTypeLabels: Record<string, string> = {
    individual: '個別管理',
    consumable: '消耗品',
  };

  return (
    <div>
      {/* ヘッダーアクション */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 検索 */}
          <input
            type="text"
            placeholder="道具名、型番、メーカーで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
          />

          {/* 管理タイプフィルタ */}
          <select
            value={managementTypeFilter}
            onChange={(e) => setManagementTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての管理タイプ</option>
            <option value="individual">個別管理</option>
            <option value="consumable">消耗品</option>
          </select>
        </div>

        {/* 操作ボタン */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            CSV一括インポート
          </button>
          <Link
            href="/admin/tools/common/new"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規登録
          </Link>
        </div>
      </div>

      {/* 道具一覧 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-3">読み込み中...</p>
        </div>
      ) : tools.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-500 mb-4">
            {search || managementTypeFilter ? '条件に一致する共通道具が見つかりませんでした' : 'まだ共通道具が登録されていません'}
          </p>
          <Link
            href="/admin/tools/common/new"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            最初の共通道具を登録
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-5">
                <div className="flex items-center gap-6">
                  {/* 道具情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{tool.name}</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        tool.management_type === 'individual'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {managementTypeLabels[tool.management_type]}
                      </span>
                      {tool.tool_categories && (
                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {tool.tool_categories.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {tool.model_number && (
                        <span>型番: {tool.model_number}</span>
                      )}
                      {tool.manufacturer && (
                        <span>メーカー: {tool.manufacturer}</span>
                      )}
                      {tool.purchase_price && (
                        <span>標準価格: ¥{tool.purchase_price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* 操作ボタン */}
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/tools/common/${tool.id}/edit`}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                      編集
                    </Link>
                    <button
                      onClick={() => {
                        setDeletingTool(tool);
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteModal && deletingTool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">共通道具を削除しますか？</h3>
            <p className="text-gray-600 mb-2">
              「{deletingTool.name}」を削除してもよろしいですか？
            </p>
            <p className="text-sm text-red-600 mb-6">
              ⚠️ この道具を参照している組織がある場合、影響が出る可能性があります。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingTool(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV一括インポートモーダル */}
      <CsvImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false);
          fetchTools();
        }}
      />
    </div>
  );
}

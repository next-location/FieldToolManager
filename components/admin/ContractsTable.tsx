'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ContractsFilter, { FilterState } from './ContractsFilter';
import { includesKana } from '@/lib/utils/kana';

interface Contract {
  id: string;
  organizations: {
    id: string;
    name: string;
    subdomain: string;
  } | null;
  plan: string;
  status: string;
  start_date: string;
  monthly_fee: number;
  has_asset_package: boolean;
  has_dx_efficiency_package: boolean;
}

interface ContractsTableProps {
  initialContracts: Contract[];
}

export default function ContractsTable({ initialContracts }: ContractsTableProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchWord: '',
    status: 'all',
    plan: 'all',
    assetPackage: 'all',
    dxPackage: 'all',
    sortBy: 'newest',
  });

  // フィルタリングとソート処理
  const filteredAndSortedContracts = useMemo(() => {
    let result = [...initialContracts];

    // ワード検索（ひらがな・カタカナ相互変換対応）
    if (filters.searchWord) {
      result = result.filter((contract) => {
        const orgName = contract.organizations?.name || '';
        const subdomain = contract.organizations?.subdomain || '';
        return includesKana(orgName, filters.searchWord) || includesKana(subdomain, filters.searchWord);
      });
    }

    // ステータスフィルター
    if (filters.status !== 'all') {
      result = result.filter((contract) => contract.status === filters.status);
    }

    // プランフィルター
    if (filters.plan !== 'all') {
      result = result.filter((contract) => contract.plan === filters.plan);
    }

    // 資産管理パックフィルター
    if (filters.assetPackage !== 'all') {
      const hasPackage = filters.assetPackage === 'yes';
      result = result.filter((contract) => contract.has_asset_package === hasPackage);
    }

    // DX効率化パックフィルター
    if (filters.dxPackage !== 'all') {
      const hasPackage = filters.dxPackage === 'yes';
      result = result.filter((contract) => contract.has_dx_efficiency_package === hasPackage);
    }

    // ソート
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        case 'oldest':
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case 'price_high':
          return b.monthly_fee - a.monthly_fee;
        case 'price_low':
          return a.monthly_fee - b.monthly_fee;
        default:
          return 0;
      }
    });

    return result;
  }, [initialContracts, filters]);

  const statusColors: Record<string, string> = {
    draft: 'bg-orange-100 text-orange-800',
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    draft: '契約準備中',
    active: '有効',
    pending: '保留中',
    suspended: '停止中',
    cancelled: 'キャンセル',
  };

  const planLabels: Record<string, string> = {
    start: 'スタート',
    standard: 'スタンダード',
    business: 'ビジネス',
    pro: 'プロ',
    enterprise: 'エンタープライズ',
    basic: 'ベーシック', // 旧データ用
    premium: 'プレミアム', // 旧データ用
  };

  return (
    <div>
      {/* フィルター */}
      <ContractsFilter onFilterChange={setFilters} currentSort={filters.sortBy} />

      {/* 件数表示とソート */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          全{initialContracts.length}件中 {filteredAndSortedContracts.length}件を表示
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">並び替え:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1E6FFF] focus:border-transparent"
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="price_high">金額の高い順</option>
            <option value="price_low">金額の安い順</option>
          </select>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  組織名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  基本プラン
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  機能パック
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  契約日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  月額料金
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedContracts.length > 0 ? (
                filteredAndSortedContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {contract.organizations?.name || '不明'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {contract.organizations?.subdomain || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {planLabels[contract.plan] || contract.plan}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {contract.has_asset_package && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            資産管理
                          </span>
                        )}
                        {contract.has_dx_efficiency_package && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            DX効率化
                          </span>
                        )}
                        {!contract.has_asset_package && !contract.has_dx_efficiency_package && (
                          <span className="text-xs text-gray-400">なし</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statusColors[contract.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {statusLabels[contract.status] || contract.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(contract.start_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{contract.monthly_fee?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/contracts/${contract.id}`}
                        className="text-[#1E6FFF] hover:text-[#0D4FCC]"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    {filters.searchWord ||
                    filters.status !== 'all' ||
                    filters.plan !== 'all' ||
                    filters.assetPackage !== 'all' ||
                    filters.dxPackage !== 'all'
                      ? '条件に一致する契約が見つかりませんでした'
                      : '契約データがありません'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

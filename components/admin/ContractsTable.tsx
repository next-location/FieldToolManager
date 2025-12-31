'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ContractsFilter, { FilterState } from './ContractsFilter';
import { includesKana } from '@/lib/utils/kana';

interface Contract {
  id: string;
  contract_number?: string;
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
    basic: 'スタート', // 旧データをスタートとして表示
    premium: 'スタンダード', // 旧データをスタンダードとして表示
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

      {/* 横長カード形式の契約一覧 */}
      {filteredAndSortedContracts.length > 0 ? (
        <div className="space-y-2">
          {filteredAndSortedContracts.map((contract) => (
            <Link
              key={contract.id}
              href={`/admin/contracts/${contract.id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-[#1E6FFF] transition-all duration-200 cursor-pointer"
            >
              <div className="px-5 py-3">
                <div className="flex items-center gap-6">
                  {/* 組織名 */}
                  <div className="flex-1 min-w-0 max-w-[280px]">
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {contract.organizations?.name || '不明'}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono truncate">
                      {contract.contract_number || contract.id.slice(0, 13)}
                    </p>
                  </div>

                  {/* ステータス */}
                  <div className="flex items-center min-w-[100px]">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                        statusColors[contract.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {statusLabels[contract.status] || contract.status}
                    </span>
                  </div>

                  {/* プラン */}
                  <div className="min-w-[140px]">
                    <p className="text-xs text-gray-500 mb-0.5">プラン</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {planLabels[contract.plan] || contract.plan}
                    </p>
                  </div>

                  {/* 機能パック */}
                  <div className="flex items-center gap-1.5 min-w-[180px]">
                    {contract.has_asset_package && contract.has_dx_efficiency_package ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        🎯 フル機能統合パック
                      </span>
                    ) : contract.has_asset_package ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        📦 現場資産パック
                      </span>
                    ) : contract.has_dx_efficiency_package ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        ⚡ 現場DX業務効率化パック
                      </span>
                    ) : (
                      <span className="text-xs text-red-600 font-semibold">⚠️ 未設定</span>
                    )}
                  </div>

                  {/* 契約開始日 */}
                  <div className="min-w-[110px] text-sm text-gray-700">
                    {new Date(contract.start_date).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })}
                  </div>

                  {/* 月額料金 */}
                  <div className="min-w-[140px] text-right">
                    <p className="text-base font-bold text-[#1E6FFF]">
                      ¥{contract.monthly_fee?.toLocaleString() || 0} <span className="text-xs text-gray-500 font-normal">/ 月 (税込)</span>
                    </p>
                  </div>

                  {/* 矢印アイコン */}
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            {filters.searchWord ||
            filters.status !== 'all' ||
            filters.plan !== 'all' ||
            filters.assetPackage !== 'all' ||
            filters.dxPackage !== 'all'
              ? '条件に一致する契約が見つかりませんでした'
              : '契約データがありません'}
          </p>
        </div>
      )}
    </div>
  );
}

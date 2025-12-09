'use client';

import { useState } from 'react';

interface ContractsFilterProps {
  onFilterChange: (filters: FilterState) => void;
  currentSort: string;
}

export interface FilterState {
  searchWord: string;
  status: string;
  plan: string;
  assetPackage: string;
  dxPackage: string;
  sortBy: string;
}

export default function ContractsFilter({ onFilterChange, currentSort }: ContractsFilterProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchWord: '',
    status: 'all',
    plan: 'all',
    assetPackage: 'all',
    dxPackage: 'all',
    sortBy: currentSort,
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">絞り込み検索</h3>

      {/* 第1行: ワード検索とステータス */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* ワード検索 (2列分のスペースを使用) */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            キーワード検索
          </label>
          <input
            type="text"
            placeholder="組織名、サブドメインで検索..."
            value={filters.searchWord}
            onChange={(e) => handleFilterChange('searchWord', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF] focus:border-transparent"
          />
        </div>

        {/* ステータス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ステータス
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF] focus:border-transparent"
          >
            <option value="all">すべて</option>
            <option value="draft">契約準備中</option>
            <option value="active">有効</option>
            <option value="pending">保留中</option>
            <option value="suspended">停止中</option>
            <option value="cancelled">キャンセル</option>
          </select>
        </div>
      </div>

      {/* 第2行: その他のフィルター */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 基本プラン */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            基本プラン
          </label>
          <select
            value={filters.plan}
            onChange={(e) => handleFilterChange('plan', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF] focus:border-transparent"
          >
            <option value="all">すべて</option>
            <option value="basic">ベーシック</option>
            <option value="premium">プレミアム</option>
            <option value="enterprise">エンタープライズ</option>
          </select>
        </div>

        {/* 資産管理パック */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            資産管理パック
          </label>
          <select
            value={filters.assetPackage}
            onChange={(e) => handleFilterChange('assetPackage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF] focus:border-transparent"
          >
            <option value="all">すべて</option>
            <option value="yes">あり</option>
            <option value="no">なし</option>
          </select>
        </div>

        {/* DX効率化パック */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            DX効率化パック
          </label>
          <select
            value={filters.dxPackage}
            onChange={(e) => handleFilterChange('dxPackage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF] focus:border-transparent"
          >
            <option value="all">すべて</option>
            <option value="yes">あり</option>
            <option value="no">なし</option>
          </select>
        </div>
      </div>
    </div>
  );
}

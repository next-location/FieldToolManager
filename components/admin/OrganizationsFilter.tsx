'use client';

export interface FilterState {
  searchWord: string;
  status: string;
  hasContract: string;
  sortBy: string;
}

interface OrganizationsFilterProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

export default function OrganizationsFilter({
  filters,
  onFilterChange,
  totalCount,
  filteredCount,
}: OrganizationsFilterProps) {
  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-4">
      {/* 第1行: キーワード検索とステータス */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* キーワード検索 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            キーワード検索
          </label>
          <input
            type="text"
            placeholder="組織名・サブドメインで検索"
            value={filters.searchWord}
            onChange={(e) => handleChange('searchWord', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* ステータス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ステータス
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全て</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
          </select>
        </div>
      </div>

      {/* 第2行: 契約有無、ソート */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 契約有無 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            契約状況
          </label>
          <select
            value={filters.hasContract}
            onChange={(e) => handleChange('hasContract', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全て</option>
            <option value="yes">契約中</option>
            <option value="no">契約なし</option>
          </select>
        </div>

        {/* ソート */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            並び替え
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleChange('sortBy', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="name_asc">組織名 (昇順)</option>
            <option value="name_desc">組織名 (降順)</option>
            <option value="users_desc">ユーザー数 (多い順)</option>
            <option value="users_asc">ユーザー数 (少ない順)</option>
          </select>
        </div>
      </div>

      {/* 検索結果表示 */}
      <div className="mt-4 text-sm text-gray-600">
        全{totalCount}件中 <span className="font-semibold text-gray-900">{filteredCount}件</span>を表示
      </div>
    </div>
  );
}

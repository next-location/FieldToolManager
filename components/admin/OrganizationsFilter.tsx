'use client';

export interface FilterState {
  searchWord: string;
  status: string;
  hasContract: string;
  salesStatus: string;
  sortBy: string;
}

interface OrganizationsFilterProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export default function OrganizationsFilter({
  filters,
  onFilterChange,
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

      {/* 第2行: 契約有無と営業ステータス */}
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

        {/* 営業ステータス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            営業ステータス
          </label>
          <select
            value={filters.salesStatus}
            onChange={(e) => handleChange('salesStatus', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全て</option>
            <option value="not_contacted">未接触</option>
            <option value="appointment">アポ取得</option>
            <option value="prospect">見込み客</option>
            <option value="proposal">提案中</option>
            <option value="negotiation">商談中</option>
            <option value="contracting">契約手続き中</option>
            <option value="contracted">契約中</option>
            <option value="cancelled">契約解除</option>
            <option value="do_not_contact">連絡不要</option>
          </select>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';

export interface SalesFilterState {
  searchWord: string;
  status: string;
  assignedTo: string;
  sortBy: string;
}

interface SalesLeadsFilterProps {
  filters: SalesFilterState;
  onFilterChange: (filters: SalesFilterState) => void;
  leads: Array<{ assigned_to: string | null }>;
}

export default function SalesLeadsFilter({
  filters,
  onFilterChange,
  leads,
}: SalesLeadsFilterProps) {
  const handleChange = (key: keyof SalesFilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  // ユニークな担当者リストを取得
  const assignedToList = useMemo(() => {
    const uniqueAssignees = Array.from(
      new Set(leads.map((l) => l.assigned_to).filter((a) => a !== null))
    );
    return uniqueAssignees.sort();
  }, [leads]);

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
            placeholder="会社名・担当者名で検索"
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
            <option value="appointment">アポイント</option>
            <option value="prospect">見込み客</option>
            <option value="proposal">提案中</option>
            <option value="negotiation">商談中</option>
            <option value="contracting">契約中</option>
            <option value="contracted">契約済み</option>
            <option value="do_not_contact">アポ禁止</option>
          </select>
        </div>
      </div>

      {/* 第2行: 担当者 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 担当者 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            担当者
          </label>
          <select
            value={filters.assignedTo}
            onChange={(e) => handleChange('assignedTo', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全て</option>
            {assignedToList.map((assignee) => (
              <option key={assignee} value={assignee!}>
                {assignee}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { includesKana } from '@/lib/utils/kana';
import { salesStatusLabels, salesStatusColors } from '@/lib/constants/sales-status';

interface Organization {
  id: string;
  name: string;
  subdomain: string | null;
  sales_status: string;
  priority: string;
  expected_contract_amount: number | null;
  next_appointment_date: string | null;
  last_contact_date: string | null;
  lead_source: string | null;
  phone: string | null;
  address: string | null;
}

interface SalesLeadsListProps {
  organizations: Organization[];
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
};

export default function SalesLeadsList({ organizations }: SalesLeadsListProps) {
  const [searchWord, setSearchWord] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredOrganizations = useMemo(() => {
    let result = [...organizations];

    // 検索フィルター（かな対応）
    if (searchWord) {
      result = result.filter(
        (org) =>
          includesKana(org.name, searchWord) ||
          includesKana(org.subdomain || '', searchWord) ||
          org.phone?.includes(searchWord) ||
          includesKana(org.address || '', searchWord)
      );
    }

    // ステータスフィルター
    if (statusFilter !== 'all') {
      result = result.filter((org) => org.sales_status === statusFilter);
    }

    // 優先度フィルター
    if (priorityFilter !== 'all') {
      result = result.filter((org) => org.priority === priorityFilter);
    }

    return result;
  }, [organizations, searchWord, statusFilter, priorityFilter]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const formatted = date.toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (diffDays === 0) return `今日 ${formatted}`;
    if (diffDays === 1) return `明日 ${formatted}`;
    if (diffDays > 0 && diffDays <= 7) return `${diffDays}日後 ${formatted}`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}日前 ${formatted}`;

    return formatted;
  };

  return (
    <div>
      {/* フィルター */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">キーワード検索</label>
            <input
              type="text"
              placeholder="会社名、電話番号、住所で検索"
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* ステータスフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">営業ステータス</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              <option value="lost">失注</option>
              <option value="do_not_contact">連絡不要</option>
            </select>
          </div>

          {/* 優先度フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">優先度</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">全て</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {filteredOrganizations.length}件の案件
            {(searchWord || statusFilter !== 'all' || priorityFilter !== 'all') && (
              <span className="ml-2">
                （全{organizations.length}件中）
              </span>
            )}
          </p>
          {(searchWord || statusFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchWord('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              フィルタをクリア
            </button>
          )}
        </div>
      </div>

      {/* 案件一覧（カード形式） */}
      {filteredOrganizations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center text-gray-500">
          該当する案件がありません
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrganizations.map((org) => (
            <Link
              key={org.id}
              href={`/admin/sales/${org.id}`}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-gray-900">{org.name}</h3>
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${salesStatusColors[org.sales_status]}`}>
                      {salesStatusLabels[org.sales_status]}
                    </span>
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityColors[org.priority]}`}>
                      優先度: {priorityLabels[org.priority]}
                    </span>
                  </div>
                  {org.subdomain && (
                    <p className="text-sm text-gray-500 font-mono mb-2">{org.subdomain}</p>
                  )}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">見込み金額</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {org.expected_contract_amount ? `¥${org.expected_contract_amount.toLocaleString()}` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">次回アポイント</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(org.next_appointment_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">最終接触日</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(org.last_contact_date)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="ml-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

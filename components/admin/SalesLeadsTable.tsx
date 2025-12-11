'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import SalesLeadsFilter, { SalesFilterState } from './SalesLeadsFilter';
import { includesKana } from '@/lib/utils/kana';

interface SalesLead {
  id: string;
  company_name: string;
  company_name_kana: string | null;
  status: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  next_appointment_date: string | null;
  last_contact_date: string | null;
  estimated_plan: string | null;
  assigned_to: string | null;
  created_at: string;
  activity_count: number;
}

interface SalesLeadsTableProps {
  initialLeads: SalesLead[];
}

export default function SalesLeadsTable({ initialLeads }: SalesLeadsTableProps) {
  const [filters, setFilters] = useState<SalesFilterState>({
    searchWord: '',
    status: 'all',
    assignedTo: 'all',
    sortBy: 'newest',
  });

  // ステータス別カウント
  const statusCounts = useMemo(() => {
    return {
      appointment: initialLeads.filter(l => l.status === 'appointment').length,
      prospect: initialLeads.filter(l => l.status === 'prospect').length,
      proposal: initialLeads.filter(l => l.status === 'proposal').length,
      negotiation: initialLeads.filter(l => l.status === 'negotiation').length,
      contracting: initialLeads.filter(l => l.status === 'contracting').length,
      contracted: initialLeads.filter(l => l.status === 'contracted').length,
      do_not_contact: initialLeads.filter(l => l.status === 'do_not_contact').length,
    };
  }, [initialLeads]);

  // フィルタリングとソート処理
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...initialLeads];

    // ワード検索（ひらがな・カタカナ相互変換対応）
    if (filters.searchWord) {
      result = result.filter((lead) => {
        const name = lead.company_name || '';
        const kana = lead.company_name_kana || '';
        const contact = lead.contact_person || '';
        return (
          includesKana(name, filters.searchWord) ||
          includesKana(kana, filters.searchWord) ||
          includesKana(contact, filters.searchWord)
        );
      });
    }

    // ステータスフィルター
    if (filters.status !== 'all') {
      result = result.filter((lead) => lead.status === filters.status);
    }

    // 担当者フィルター
    if (filters.assignedTo !== 'all') {
      result = result.filter((lead) => lead.assigned_to === filters.assignedTo);
    }

    // ソート処理
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'next_appointment':
          if (!a.next_appointment_date && !b.next_appointment_date) return 0;
          if (!a.next_appointment_date) return 1;
          if (!b.next_appointment_date) return -1;
          return new Date(a.next_appointment_date).getTime() - new Date(b.next_appointment_date).getTime();
        case 'last_contact':
          if (!a.last_contact_date && !b.last_contact_date) return 0;
          if (!a.last_contact_date) return 1;
          if (!b.last_contact_date) return -1;
          return new Date(b.last_contact_date).getTime() - new Date(a.last_contact_date).getTime();
        case 'company_name_asc':
          return a.company_name.localeCompare(b.company_name, 'ja');
        case 'company_name_desc':
          return b.company_name.localeCompare(a.company_name, 'ja');
        default:
          return 0;
      }
    });

    return result;
  }, [initialLeads, filters]);

  // ステータスバッジの色とラベル
  const statusConfig = {
    appointment: { color: 'bg-purple-100 text-purple-800', label: 'アポイント' },
    prospect: { color: 'bg-blue-100 text-blue-800', label: '見込み客' },
    proposal: { color: 'bg-yellow-100 text-yellow-800', label: '提案中' },
    negotiation: { color: 'bg-orange-100 text-orange-800', label: '商談中' },
    contracting: { color: 'bg-cyan-100 text-cyan-800', label: '契約中' },
    contracted: { color: 'bg-green-100 text-green-800', label: '契約済み' },
    do_not_contact: { color: 'bg-red-100 text-red-800', label: 'アポ禁止' },
  };

  return (
    <div>
      {/* ステータス別サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white rounded-lg border-2 border-purple-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setFilters({ ...filters, status: filters.status === 'appointment' ? 'all' : 'appointment' })}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">📞 アポイント</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{statusCounts.appointment}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-blue-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setFilters({ ...filters, status: filters.status === 'prospect' ? 'all' : 'prospect' })}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">👤 見込み客</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{statusCounts.prospect}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-yellow-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setFilters({ ...filters, status: filters.status === 'proposal' ? 'all' : 'proposal' })}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">📋 提案中</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{statusCounts.proposal}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-orange-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setFilters({ ...filters, status: filters.status === 'negotiation' ? 'all' : 'negotiation' })}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">💼 商談中</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{statusCounts.negotiation}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-cyan-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setFilters({ ...filters, status: filters.status === 'contracting' ? 'all' : 'contracting' })}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">📝 契約中</p>
              <p className="text-2xl font-bold text-cyan-600 mt-1">{statusCounts.contracting}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-green-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setFilters({ ...filters, status: filters.status === 'contracted' ? 'all' : 'contracted' })}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">✅ 契約済み</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{statusCounts.contracted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-red-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setFilters({ ...filters, status: filters.status === 'do_not_contact' ? 'all' : 'do_not_contact' })}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">🚫 アポ禁止</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{statusCounts.do_not_contact}</p>
            </div>
          </div>
        </div>
      </div>

      {/* フィルターコンポーネント */}
      <SalesLeadsFilter
        filters={filters}
        onFilterChange={setFilters}
        leads={initialLeads}
      />

      {/* 表示件数と並び替え */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          全{initialLeads.length}件中 {filteredAndSortedLeads.length}件を表示
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">並び替え:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="next_appointment">次回アポ日近い順</option>
            <option value="last_contact">最終接触日新しい順</option>
            <option value="company_name_asc">会社名 (昇順)</option>
            <option value="company_name_desc">会社名 (降順)</option>
          </select>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  会社名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  連絡先
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  次回アポ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最終接触
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  活動回数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  担当者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    営業リードが見つかりませんでした
                  </td>
                </tr>
              ) : (
                filteredAndSortedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{lead.company_name}</div>
                        {lead.company_name_kana && (
                          <div className="text-xs text-gray-500">{lead.company_name_kana}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[lead.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {statusConfig[lead.status as keyof typeof statusConfig]?.label || lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {lead.contact_person && (
                          <div className="text-sm text-gray-900">{lead.contact_person}</div>
                        )}
                        {lead.contact_phone && (
                          <div className="text-xs text-gray-500">TEL: {lead.contact_phone}</div>
                        )}
                        {lead.contact_email && (
                          <div className="text-xs text-gray-500">{lead.contact_email}</div>
                        )}
                        {!lead.contact_person && !lead.contact_phone && !lead.contact_email && (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.next_appointment_date
                        ? new Date(lead.next_appointment_date).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.last_contact_date
                        ? new Date(lead.last_contact_date).toLocaleDateString('ja-JP')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {lead.activity_count}回
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.assigned_to || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/sales/${lead.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

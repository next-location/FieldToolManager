'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import OrganizationsFilter, { FilterState } from './OrganizationsFilter';
import { includesKana } from '@/lib/utils/kana';

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  is_active: boolean;
  created_at: string;
  phone: string | null;
  address: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  user_count: number;
  has_active_contract: boolean;
  sales_status: string;
  next_appointment_date: string | null;
}

interface OrganizationsTableProps {
  initialOrganizations: Organization[];
}

export default function OrganizationsTable({ initialOrganizations }: OrganizationsTableProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchWord: '',
    status: 'all',
    hasContract: 'all',
    salesStatus: 'all',
    sortBy: 'newest',
  });

  // フィルタリングとソート処理
  const filteredAndSortedOrganizations = useMemo(() => {
    let result = [...initialOrganizations];

    // ワード検索（ひらがな・カタカナ相互変換対応）
    if (filters.searchWord) {
      result = result.filter((org) => {
        const name = org.name || '';
        const subdomain = org.subdomain || '';
        return includesKana(name, filters.searchWord) || includesKana(subdomain, filters.searchWord);
      });
    }

    // ステータスフィルター
    if (filters.status !== 'all') {
      result = result.filter((org) => {
        if (filters.status === 'active') return org.is_active;
        if (filters.status === 'inactive') return !org.is_active;
        return true;
      });
    }

    // 契約有無フィルター
    if (filters.hasContract !== 'all') {
      result = result.filter((org) => {
        if (filters.hasContract === 'yes') return org.has_active_contract;
        if (filters.hasContract === 'no') return !org.has_active_contract;
        return true;
      });
    }

    // 営業ステータスフィルター
    if (filters.salesStatus !== 'all') {
      result = result.filter((org) => org.sales_status === filters.salesStatus);
    }

    // ソート処理
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name_asc':
          return a.name.localeCompare(b.name, 'ja');
        case 'name_desc':
          return b.name.localeCompare(a.name, 'ja');
        case 'users_desc':
          return b.user_count - a.user_count;
        case 'users_asc':
          return a.user_count - b.user_count;
        default:
          return 0;
      }
    });

    return result;
  }, [initialOrganizations, filters]);

  // ステータスバッジの色
  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      {/* フィルターコンポーネント */}
      <OrganizationsFilter
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* 表示件数と並び替え */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          全{initialOrganizations.length}件中 {filteredAndSortedOrganizations.length}件を表示
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
            <option value="name_asc">組織名 (昇順)</option>
            <option value="name_desc">組織名 (降順)</option>
            <option value="users_desc">ユーザー数 (多い順)</option>
            <option value="users_asc">ユーザー数 (少ない順)</option>
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
                  組織名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  サブドメイン
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  連絡先
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ユーザー数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  契約状況
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登録日
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    組織が見つかりませんでした
                  </td>
                </tr>
              ) : (
                filteredAndSortedOrganizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/organizations/${org.id}`} className="block">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{org.name}</div>
                          {org.address && (
                            <div className="text-xs text-gray-500">{org.address}</div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/organizations/${org.id}`} className="block">
                        <div className="text-sm text-gray-900 font-mono">{org.subdomain || '-'}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/organizations/${org.id}`} className="block">
                        <div>
                          {org.billing_contact_name && (
                            <div className="text-sm text-gray-900">{org.billing_contact_name}</div>
                          )}
                          {org.phone && (
                            <div className="text-xs text-gray-500">TEL: {org.phone}</div>
                          )}
                          {org.billing_contact_email && (
                            <div className="text-xs text-gray-500">{org.billing_contact_email}</div>
                          )}
                          {!org.billing_contact_name && !org.phone && !org.billing_contact_email && (
                            <div className="text-sm text-gray-400">-</div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/organizations/${org.id}`} className="block">
                        <div className="text-sm text-gray-900">{org.user_count}名</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/organizations/${org.id}`} className="block">
                        {org.has_active_contract ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            契約中
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            契約なし
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/organizations/${org.id}`} className="block">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(org.is_active)}`}>
                          {org.is_active ? '有効' : '無効'}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link href={`/admin/organizations/${org.id}`} className="block">
                        {new Date(org.created_at).toLocaleDateString('ja-JP')}
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

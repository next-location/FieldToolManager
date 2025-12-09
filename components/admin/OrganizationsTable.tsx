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
}

interface OrganizationsTableProps {
  initialOrganizations: Organization[];
}

export default function OrganizationsTable({ initialOrganizations }: OrganizationsTableProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchWord: '',
    status: 'all',
    hasContract: 'all',
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
        totalCount={initialOrganizations.length}
        filteredCount={filteredAndSortedOrganizations.length}
      />

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    組織が見つかりませんでした
                  </td>
                </tr>
              ) : (
                filteredAndSortedOrganizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{org.name}</div>
                        {org.address && (
                          <div className="text-xs text-gray-500">{org.address}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{org.subdomain || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{org.user_count}名</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.has_active_contract ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          契約中
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          契約なし
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(org.is_active)}`}>
                        {org.is_active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(org.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/organizations/${org.id}`}
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

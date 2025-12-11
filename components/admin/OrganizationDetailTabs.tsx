'use client';

import { useState } from 'react';

interface Organization {
  id: string;
  name: string;
  subdomain: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  phone: string | null;
  fax: string | null;
  postal_code: string | null;
  address: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  billing_contact_phone: string | null;
  billing_address: string | null;
}

interface ActiveContract {
  id: string;
  contract_number: string;
  contract_type: string;
  start_date: string;
  total_monthly_fee: number;
}

interface AuditLog {
  id: string;
  action: string;
  old_values: any;
  new_values: any;
  created_at: string;
  super_admin_id: string | null;
  super_admin_name: string | null;
  user_id: string | null;
}

interface OrganizationDetailTabsProps {
  organization: Organization;
  userCount: number;
  activeContract: ActiveContract | null;
  auditLogs: AuditLog[];
}

type TabType = 'basic';

export default function OrganizationDetailTabs({
  organization,
  userCount,
  activeContract,
  auditLogs,
}: OrganizationDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getFieldLabel = (fieldName: string): string => {
    const labels: Record<string, string> = {
      name: '組織名',
      subdomain: 'サブドメイン',
      phone: '電話番号',
      fax: 'FAX',
      postal_code: '郵便番号',
      address: '住所',
      billing_contact_name: '請求担当者名',
      billing_contact_email: '請求担当者メール',
      billing_contact_phone: '請求担当者電話',
      billing_address: '請求先住所',
      is_active: 'ステータス',
      sales_status: '営業ステータス',
      priority: '優先度',
      expected_contract_amount: '見込み契約金額',
      lead_source: 'リードソース',
      sales_notes: '営業メモ',
    };
    return labels[fieldName] || fieldName;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '有効' : '無効';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  return (
    <div>
      {/* タブコンテンツ */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {/* 基本情報カード */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{organization.name}</h2>
                  <p className="text-sm text-gray-500">
                    サブドメイン: <span className="font-mono font-semibold">{organization.subdomain || '-'}</span>
                  </p>
                </div>
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                    organization.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {organization.is_active ? '有効' : '無効'}
                </span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 基本情報 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">基本情報</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex">
                    <dt className="text-gray-600 w-32">組織名:</dt>
                    <dd className="text-gray-900 font-medium">{organization.name}</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-gray-600 w-32">サブドメイン:</dt>
                    <dd className="text-gray-900 font-mono">{organization.subdomain || '-'}</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-gray-600 w-32">ユーザー数:</dt>
                    <dd className="text-gray-900">{userCount || 0}名</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-gray-600 w-32">登録日:</dt>
                    <dd className="text-gray-900">{formatDate(organization.created_at)}</dd>
                  </div>
                </dl>
              </div>

              {/* 連絡先情報 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">連絡先情報</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex">
                    <dt className="text-gray-600 w-32">電話番号:</dt>
                    <dd className="text-gray-900">{organization.phone || '-'}</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-gray-600 w-32">FAX:</dt>
                    <dd className="text-gray-900">{organization.fax || '-'}</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-gray-600 w-32">郵便番号:</dt>
                    <dd className="text-gray-900">{organization.postal_code || '-'}</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-gray-600 w-32">住所:</dt>
                    <dd className="text-gray-900">{organization.address || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* 請求情報カード */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">請求情報</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex">
                <dt className="text-gray-600 w-32">担当者名:</dt>
                <dd className="text-gray-900">{organization.billing_contact_name || '-'}</dd>
              </div>
              <div className="flex">
                <dt className="text-gray-600 w-32">メール:</dt>
                <dd className="text-gray-900">{organization.billing_contact_email || '-'}</dd>
              </div>
              <div className="flex">
                <dt className="text-gray-600 w-32">電話番号:</dt>
                <dd className="text-gray-900">{organization.billing_contact_phone || '-'}</dd>
              </div>
              <div className="flex md:col-span-2">
                <dt className="text-gray-600 w-32">請求先住所:</dt>
                <dd className="text-gray-900">{organization.billing_address || '-'}</dd>
              </div>
            </dl>
          </div>

          {/* 契約情報カード */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">契約情報</h3>
            {activeContract ? (
              <div>
                <div className="mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    契約中
                  </span>
                </div>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex">
                    <dt className="text-gray-600 w-32">契約番号:</dt>
                    <dd className="text-gray-900 font-mono">{activeContract.contract_number}</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-gray-600 w-32">契約タイプ:</dt>
                    <dd className="text-gray-900">
                      {activeContract.contract_type === 'monthly' ? '月契約' : '年契約'}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="text-gray-600 w-32">契約開始日:</dt>
                    <dd className="text-gray-900">{formatDate(activeContract.start_date)}</dd>
                  </div>
                  <div className="flex">
                    <dt className="text-gray-600 w-32">月額料金:</dt>
                    <dd className="text-gray-900 font-semibold text-blue-600">
                      ¥{activeContract.total_monthly_fee.toLocaleString()}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <a
                    href={`/admin/contracts/${activeContract.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    契約詳細を見る →
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 mb-3">
                  契約なし
                </span>
                <p className="text-gray-500 text-sm">現在有効な契約はありません</p>
              </div>
            )}
          </div>

          {/* メタ情報カード */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">メタ情報</h3>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 mb-1">組織ID:</dt>
                <dd className="text-gray-700 font-mono text-xs break-all">{organization.id}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">作成日時:</dt>
                <dd className="text-gray-700">{formatDate(organization.created_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">更新日時:</dt>
                <dd className="text-gray-700">{formatDate(organization.updated_at)}</dd>
              </div>
            </dl>
          </div>

          {/* 変更履歴カード */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">変更履歴</h3>
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-6">変更履歴がありません</p>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          log.action === 'INSERT' ? 'bg-green-100 text-green-800' :
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {log.action === 'INSERT' ? '作成' : log.action === 'UPDATE' ? '更新' : '削除'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDateTime(log.created_at)}</span>
                    </div>

                    {/* 操作者情報 */}
                    <div className="text-sm text-gray-600 mb-3">
                      操作者: <span className="font-semibold">{log.super_admin_name || 'システム'}</span>
                      {log.super_admin_id && (
                        <span className="text-xs text-gray-400 ml-2">ID: {log.super_admin_id}</span>
                      )}
                    </div>

                    {/* 変更内容 */}
                    {log.action === 'UPDATE' && log.old_values && log.new_values && (
                      <div className="space-y-2">
                        {Object.keys(log.new_values).map((key) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-gray-700">{getFieldLabel(key)}:</span>
                            <div className="ml-4 mt-1">
                              <div className="flex items-center gap-2">
                                <span className="text-red-600 line-through">{formatValue(log.old_values[key])}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-600 font-semibold">{formatValue(log.new_values[key])}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {log.action === 'INSERT' && log.new_values && (
                      <div className="space-y-2">
                        {Object.keys(log.new_values).map((key) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-gray-700">{getFieldLabel(key)}:</span>
                            <span className="ml-2 text-green-600">{formatValue(log.new_values[key])}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {log.action === 'DELETE' && log.old_values && (
                      <div className="space-y-2">
                        {Object.keys(log.old_values).map((key) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-gray-700">{getFieldLabel(key)}:</span>
                            <span className="ml-2 text-red-600 line-through">{formatValue(log.old_values[key])}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

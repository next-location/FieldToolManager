'use client';

import { useState } from 'react';

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  billing_contact_phone: string | null;
  billing_address: string | null;
}

interface Contract {
  id: string;
  contract_number: string;
  organization_id: string;
  organizations: Organization | null;
  contract_type: string;
  plan: string;
  has_asset_package: boolean;
  has_dx_efficiency_package: boolean;
  user_limit: number;
  base_monthly_fee: number;
  package_monthly_fee: number;
  total_monthly_fee: number;
  monthly_fee: number;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  trial_end_date: string | null;
  billing_cycle: string;
  status: string;
  initial_setup_fee: number;
  initial_data_registration_fee: number;
  initial_onsite_fee: number;
  initial_training_fee: number;
  initial_other_fee: number;
  initial_discount: number;
  total_initial_fee: number;
  initial_fee_paid: boolean;
  initial_fee_paid_at: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  billing_contact_phone: string | null;
  billing_address: string | null;
  admin_name: string | null;
  admin_email: string | null;
  admin_password: string | null;
  admin_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  due_date: string;
  status: string;
  sent_date: string | null;
  paid_date: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
}

interface ContractPackage {
  package_id: string;
  packages: {
    id: string;
    name: string;
    package_key: string;
    monthly_fee: number;
  }[];
}

interface ContractDetailViewProps {
  contract: Contract;
  invoices: Invoice[];
  contractPackages: ContractPackage[];
}

export default function ContractDetailView({ contract, invoices, contractPackages }: ContractDetailViewProps) {
  // プラン名の日本語変換
  const planLabels: Record<string, string> = {
    start: 'スタート',
    standard: 'スタンダード',
    business: 'ビジネス',
    pro: 'プロ',
    enterprise: 'エンタープライズ',
    basic: 'ベーシック',
    premium: 'プレミアム',
  };

  // ステータスの日本語変換
  const statusLabels: Record<string, string> = {
    draft: '下書き',
    active: '有効',
    pending: '保留中',
    suspended: '停止中',
    cancelled: 'キャンセル',
    expired: '期限切れ',
  };

  // ステータスの色
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    expired: 'bg-gray-100 text-gray-600',
  };

  // 契約タイプの日本語変換
  const contractTypeLabels: Record<string, string> = {
    monthly: '月契約',
    annual: '年契約',
  };

  // 請求書ステータスの日本語変換
  const invoiceStatusLabels: Record<string, string> = {
    draft: '下書き',
    sent: '送付済み',
    paid: '支払済み',
    overdue: '期限超過',
    cancelled: 'キャンセル',
  };

  // 請求書ステータスの色
  const invoiceStatusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  // 日付フォーマット
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* 基本情報カード */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {contract.organizations?.name || '組織名不明'}
              </h2>
              <p className="text-sm text-gray-500">
                契約番号: <span className="font-mono font-semibold">{contract.contract_number}</span>
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${statusColors[contract.status] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[contract.status] || contract.status}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 組織情報 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">組織情報</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex">
                <dt className="text-gray-600 w-32">組織名:</dt>
                <dd className="text-gray-900 font-medium">{contract.organizations?.name || '-'}</dd>
              </div>
              <div className="flex">
                <dt className="text-gray-600 w-32">サブドメイン:</dt>
                <dd className="text-gray-900 font-mono">{contract.organizations?.subdomain || '-'}</dd>
              </div>
            </dl>
          </div>

          {/* 契約情報 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">契約情報</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex">
                <dt className="text-gray-600 w-32">契約タイプ:</dt>
                <dd className="text-gray-900 font-medium">{contractTypeLabels[contract.contract_type] || contract.contract_type}</dd>
              </div>
              <div className="flex">
                <dt className="text-gray-600 w-32">契約開始日:</dt>
                <dd className="text-gray-900">{formatDate(contract.start_date)}</dd>
              </div>
              <div className="flex">
                <dt className="text-gray-600 w-32">契約終了日:</dt>
                <dd className="text-gray-900">{formatDate(contract.end_date)}</dd>
              </div>
              <div className="flex">
                <dt className="text-gray-600 w-32">トライアル終了:</dt>
                <dd className="text-gray-900">{formatDate(contract.trial_end_date)}</dd>
              </div>
              <div className="flex">
                <dt className="text-gray-600 w-32">自動更新:</dt>
                <dd className="text-gray-900">{contract.auto_renew ? '有効' : '無効'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* プラン・機能情報カード */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">プラン・機能設定</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center">
                <dt className="text-gray-600 w-32">基本プラン:</dt>
                <dd>
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {planLabels[contract.plan] || contract.plan}
                  </span>
                </dd>
              </div>
              <div className="flex items-center">
                <dt className="text-gray-600 w-32">ユーザー上限:</dt>
                <dd className="text-gray-900 font-semibold">{contract.user_limit}名</dd>
              </div>
            </dl>
          </div>
          <div>
            <dt className="text-gray-600 text-sm mb-2">機能パック:</dt>
            <dd className="space-y-2">
              {contractPackages && contractPackages.length > 0 ? (
                contractPackages.map((cp) => (
                  <span
                    key={cp.package_id}
                    className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold mr-2 mb-2"
                  >
                    {cp.packages[0]?.name || 'パッケージ情報なし'}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm">なし</span>
              )}
            </dd>
          </div>
        </div>
      </div>

      {/* 料金情報カード */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">料金情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 月額料金 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">月額料金</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">基本料金:</dt>
                <dd className="text-gray-900 font-medium">¥{contract.base_monthly_fee.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">パック料金:</dt>
                <dd className="text-gray-900 font-medium">¥{contract.package_monthly_fee.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <dt className="text-gray-900 font-bold">合計月額:</dt>
                <dd className="text-blue-600 font-bold text-lg">¥{contract.total_monthly_fee.toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          {/* 初期費用 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">初期費用</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">初期設定費:</dt>
                <dd className="text-gray-900 font-medium">¥{contract.initial_setup_fee.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">データ登録費:</dt>
                <dd className="text-gray-900 font-medium">¥{contract.initial_data_registration_fee.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">オンサイト作業費:</dt>
                <dd className="text-gray-900 font-medium">¥{contract.initial_onsite_fee.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">研修費:</dt>
                <dd className="text-gray-900 font-medium">¥{contract.initial_training_fee.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">その他費用:</dt>
                <dd className="text-gray-900 font-medium">¥{contract.initial_other_fee.toLocaleString()}</dd>
              </div>
              {contract.initial_discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-red-600">お値引き:</dt>
                  <dd className="text-red-600 font-medium">-¥{contract.initial_discount.toLocaleString()}</dd>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <dt className="text-gray-900 font-bold">初期費用合計:</dt>
                <dd className="text-orange-600 font-bold text-lg">¥{contract.total_initial_fee.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <dt className="text-gray-700 font-semibold">支払状況:</dt>
                <dd>
                  {contract.initial_fee_paid ? (
                    <span className="text-green-600 font-semibold">
                      支払済み ({formatDate(contract.initial_fee_paid_at)})
                    </span>
                  ) : (
                    <span className="text-red-600 font-semibold">未払い</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* 管理者ログイン情報カード */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900">管理者ログイン情報</h3>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            ⚠️ この情報は取引先組織の管理者アカウントです。厳重に管理してください。
          </p>
        </div>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex">
            <dt className="text-gray-600 w-32">管理者名:</dt>
            <dd className="text-gray-900 font-medium">{contract.admin_name || '-'}</dd>
          </div>
          <div className="flex">
            <dt className="text-gray-600 w-32">メールアドレス:</dt>
            <dd className="text-gray-900 font-mono">{contract.admin_email || '-'}</dd>
          </div>
          <div className="flex">
            <dt className="text-gray-600 w-32">パスワード:</dt>
            <dd className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
              {contract.admin_password || '-'}
            </dd>
          </div>
          <div className="flex">
            <dt className="text-gray-600 w-32">電話番号:</dt>
            <dd className="text-gray-900">{contract.admin_phone || '-'}</dd>
          </div>
          <div className="flex md:col-span-2">
            <dt className="text-gray-600 w-32">ログインURL:</dt>
            <dd className="text-blue-600 font-mono">
              https://{contract.organizations?.subdomain || '[subdomain]'}.field-tool-manager.com
            </dd>
          </div>
        </dl>
      </div>

      {/* 請求情報カード */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">請求情報</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex">
            <dt className="text-gray-600 w-32">担当者名:</dt>
            <dd className="text-gray-900">{contract.billing_contact_name || contract.organizations?.billing_contact_name || '-'}</dd>
          </div>
          <div className="flex">
            <dt className="text-gray-600 w-32">メール:</dt>
            <dd className="text-gray-900">{contract.billing_contact_email || contract.organizations?.billing_contact_email || '-'}</dd>
          </div>
          <div className="flex">
            <dt className="text-gray-600 w-32">電話番号:</dt>
            <dd className="text-gray-900">{contract.billing_contact_phone || contract.organizations?.billing_contact_phone || '-'}</dd>
          </div>
          <div className="flex md:col-span-2">
            <dt className="text-gray-600 w-32">請求先住所:</dt>
            <dd className="text-gray-900">{contract.billing_address || contract.organizations?.billing_address || '-'}</dd>
          </div>
        </dl>
      </div>

      {/* 備考カード */}
      {contract.notes && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">備考</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.notes}</p>
        </div>
      )}

      {/* 支払い履歴カード */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">支払い履歴</h3>
          <span className="text-sm text-gray-500">
            {invoices.length}件の請求書
          </span>
        </div>

        {invoices.length > 0 ? (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {invoice.invoice_number}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          invoiceStatusColors[invoice.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {invoiceStatusLabels[invoice.status] || invoice.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      請求期間: {formatDate(invoice.billing_period_start)} 〜 {formatDate(invoice.billing_period_end)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      ¥{(invoice.total_amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      (税込)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">支払期限</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(invoice.due_date)}
                    </p>
                  </div>
                  {invoice.paid_date && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">支払日</p>
                      <p className="text-sm font-medium text-green-600">
                        {formatDate(invoice.paid_date)}
                      </p>
                    </div>
                  )}
                  {invoice.sent_date && !invoice.paid_date && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">送付日</p>
                      <p className="text-sm font-medium text-blue-600">
                        {formatDate(invoice.sent_date)}
                      </p>
                    </div>
                  )}
                </div>

                {/* 内訳表示 */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500 mb-0.5">小計</p>
                      <p className="font-medium text-gray-900">
                        ¥{(invoice.amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-0.5">消費税</p>
                      <p className="font-medium text-gray-900">
                        ¥{(invoice.tax_amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-0.5">合計</p>
                      <p className="font-medium text-gray-900">
                        ¥{(invoice.total_amount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 備考がある場合 */}
                {invoice.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">備考</p>
                    <p className="text-xs text-gray-700">{invoice.notes}</p>
                  </div>
                )}

                {/* PDF URLがある場合 */}
                {invoice.pdf_url && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <a
                      href={invoice.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDFをダウンロード
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">請求書はまだありません</p>
          </div>
        )}
      </div>

      {/* メタ情報カード */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">メタ情報</h3>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 mb-1">契約ID:</dt>
            <dd className="text-gray-700 font-mono text-xs break-all">{contract.id}</dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-1">作成日時:</dt>
            <dd className="text-gray-700">{formatDate(contract.created_at)}</dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-1">更新日時:</dt>
            <dd className="text-gray-700">{formatDate(contract.updated_at)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

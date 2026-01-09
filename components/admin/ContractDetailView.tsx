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
  billing_day: number;
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

interface Estimate {
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
  notes: string | null;
  created_at: string;
}

interface PaymentRecord {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  invoices: {
    invoice_number: string;
    billing_period_start: string;
    billing_period_end: string;
  } | null;
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

interface InitialInvoice {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
}

interface ContractDetailViewProps {
  contract: Contract;
  invoices: Invoice[];
  estimates: Estimate[];
  paymentRecords: PaymentRecord[];
  contractPackages: ContractPackage[];
  initialInvoice: InitialInvoice | null;
  latestEstimate?: InitialInvoice | null;
}

export default function ContractDetailView({ contract, invoices, estimates, paymentRecords, contractPackages, initialInvoice, latestEstimate }: ContractDetailViewProps) {
  // プラン名の日本語変換
  const planLabels: Record<string, string> = {
    start: 'スタート',
    standard: 'スタンダード',
    business: 'ビジネス',
    pro: 'プロ',
    enterprise: 'エンタープライズ',
    basic: 'スタート', // 旧データをスタートとして表示
    premium: 'スタンダード', // 旧データをスタンダードとして表示
  };

  // ステータスの日本語変換
  const statusLabels: Record<string, string> = {
    draft: '契約準備中',
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
            <div className="text-right space-y-2">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${statusColors[contract.status] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[contract.status] || contract.status}
              </span>
              {contract.status === 'draft' && (
                <div className="text-sm">
                  {initialInvoice ? (
                    initialInvoice.status === 'paid' ? (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        初回入金確認済
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        初回入金待ち（{initialInvoice.invoice_number}）
                      </span>
                    )
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                      初回請求書未発行
                    </span>
                  )}
                </div>
              )}
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
                <dt className="text-gray-600 w-32">請求サイクル:</dt>
                <dd className="text-gray-900 font-medium">
                  {contract.billing_cycle === 'monthly' ? '毎月' : '毎年'}
                  {contract.billing_cycle === 'monthly' && (
                    <span className="ml-1">
                      {contract.billing_day === 99 ? '月末' : `${contract.billing_day}日`}
                    </span>
                  )}
                </dd>
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
              {contract.has_asset_package && contract.has_dx_efficiency_package ? (
                <span className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-semibold">
                  🎯 フル機能統合パック
                </span>
              ) : contract.has_asset_package ? (
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                  📦 現場資産パック
                </span>
              ) : contract.has_dx_efficiency_package ? (
                <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                  ⚡ 現場DX業務効率化パック
                </span>
              ) : (
                <span className="text-red-600 text-sm font-semibold">⚠️ 未設定</span>
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
              https://{contract.organizations?.subdomain || '[subdomain]'}.zairoku.com
            </dd>
          </div>
        </dl>
      </div>

      {/* 請求情報カード */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">請求情報</h3>

        {/* 警告表示: 契約のメールアドレスと組織情報が異なる場合 */}
        {contract.billing_contact_email &&
         contract.organizations?.billing_contact_email &&
         contract.billing_contact_email !== contract.organizations.billing_contact_email && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800 font-semibold mb-1">
              ⚠️ この契約の請求先メールアドレスは、現在の組織情報と異なります
            </p>
            <p className="text-xs text-yellow-700">
              契約時: <span className="font-mono">{contract.billing_contact_email}</span><br/>
              現在の組織情報: <span className="font-mono">{contract.organizations.billing_contact_email}</span>
            </p>
          </div>
        )}

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

      {/* 見積もり履歴カード */}
      {estimates.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">見積もり情報</h3>
            <span className="text-sm text-gray-500">
              {estimates.length}件の見積もり
            </span>
          </div>

          <div className="space-y-3">
            {estimates.map((estimate) => (
              <div
                key={estimate.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {estimate.invoice_number}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          estimate.status === 'estimate'
                            ? 'bg-blue-100 text-blue-800'
                            : estimate.status === 'estimate_sent'
                            ? 'bg-green-100 text-green-800'
                            : estimate.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : estimate.status === 'converted'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {estimate.status === 'estimate'
                          ? '未送信'
                          : estimate.status === 'estimate_sent'
                          ? '送信済み'
                          : estimate.status === 'rejected'
                          ? '却下'
                          : estimate.status === 'converted'
                          ? '請求書に変換済み'
                          : estimate.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      作成日: {formatDate(estimate.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      ¥{(estimate.total_amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      (税込)
                    </p>
                  </div>
                </div>

                {estimate.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-600">{estimate.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {latestEstimate && latestEstimate.status === 'estimate' && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 「見積書をダウンロード」ボタンで内容を確認し、問題なければ「見積もりを送信」してください。
              </p>
            </div>
          )}
          {latestEstimate && latestEstimate.status === 'estimate_sent' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                ✅ 見積もりを顧客に送信しました。承認されたら「請求書に変換」してください。
              </p>
            </div>
          )}
          {latestEstimate && latestEstimate.status === 'rejected' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                ❌ 見積もりが却下されました。新しい見積もりを作成してください。
              </p>
            </div>
          )}
        </div>
      )}

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
            {paymentRecords.length}件の支払い
          </span>
        </div>

        {paymentRecords.length > 0 ? (
          <div className="space-y-3">
            {paymentRecords.map((payment) => (
              <div
                key={payment.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {payment.invoices?.invoice_number || '-'}
                      </span>
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        支払済み
                      </span>
                    </div>
                    {payment.invoices && (
                      <p className="text-xs text-gray-500">
                        請求期間: {formatDate(payment.invoices.billing_period_start)} 〜 {formatDate(payment.invoices.billing_period_end)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      ¥{(payment.amount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">支払日</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(payment.payment_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">支払方法</p>
                    <p className="text-sm font-medium text-gray-900">
                      {payment.payment_method === 'bank_transfer' ? '銀行振込' :
                       payment.payment_method === 'credit_card' ? 'クレジットカード' :
                       payment.payment_method === 'cash' ? '現金' : payment.payment_method}
                    </p>
                  </div>
                </div>

                {payment.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-600">{payment.notes}</p>
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
            <p className="text-sm">支払い履歴はまだありません</p>
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

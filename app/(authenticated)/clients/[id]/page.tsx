import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Client, ClientType, PaymentMethod, BankAccountType } from '@/types/clients'
import { requireAuth } from '@/lib/auth/page-auth'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()


  if (userRole !== 'admin') {
    redirect('/clients')
  }

  // 取引先詳細取得
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  if (error || !client) {
    redirect('/clients')
  }

  // 関連現場取得
  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('client_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const typedClient = client as Client

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Link href="/clients" className="text-blue-600 hover:text-blue-800 text-sm">
              ← 取引先一覧に戻る
            </Link>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{typedClient.name}</h1>
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-sm text-gray-500">{typedClient.code}</span>
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getClientTypeBadgeColor(typedClient.client_type)}`}
                >
                  {getClientTypeLabel(typedClient.client_type)}
                </span>
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    typedClient.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {typedClient.is_active ? '有効' : '無効'}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link
                href={`/clients/${id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                編集
              </Link>
            </div>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メイン情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報 */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <InfoItem label="正式名称" value={typedClient.name} />
                  <InfoItem label="略称" value={typedClient.short_name} />
                  <InfoItem label="フリガナ" value={typedClient.name_kana} />
                  <InfoItem label="業種" value={typedClient.industry} />
                </dl>
              </div>
            </div>

            {/* 連絡先情報 */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">連絡先</h2>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <InfoItem label="郵便番号" value={typedClient.postal_code} />
                  <InfoItem label="住所" value={typedClient.address} span2 />
                  <InfoItem label="電話番号" value={typedClient.phone} />
                  <InfoItem label="FAX番号" value={typedClient.fax} />
                  <InfoItem label="メールアドレス" value={typedClient.email} />
                  <InfoItem label="ウェブサイト" value={typedClient.website} />
                </dl>
              </div>
            </div>

            {/* 担当者情報 */}
            {typedClient.contact_person && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">担当者</h2>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <InfoItem label="担当者名" value={typedClient.contact_person} />
                    <InfoItem label="部署" value={typedClient.contact_department} />
                    <InfoItem label="電話番号" value={typedClient.contact_phone} />
                    <InfoItem label="メールアドレス" value={typedClient.contact_email} />
                  </dl>
                </div>
              </div>
            )}

            {/* メモ */}
            {(typedClient.notes || typedClient.internal_notes) && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">メモ</h2>
                  <dl className="space-y-4">
                    {typedClient.notes && <InfoItem label="備考" value={typedClient.notes} />}
                    {typedClient.internal_notes && (
                      <InfoItem label="社内用メモ 🔒" value={typedClient.internal_notes} />
                    )}
                  </dl>
                </div>
              </div>
            )}

            {/* 関連現場 */}
            {sites && sites.length > 0 && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    関連現場 ({sites.length}件)
                  </h2>
                  <ul className="divide-y divide-gray-200">
                    {sites.slice(0, 5).map((site) => (
                      <li key={site.id} className="py-3">
                        <Link
                          href={`/sites/${site.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          🏗️ {site.name}
                        </Link>
                        {site.address && (
                          <p className="text-sm text-gray-500 mt-1">📍 {site.address}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                  {sites.length > 5 && (
                    <div className="mt-4">
                      <Link
                        href={`/sites?client_id=${id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        すべての現場を見る →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 取引条件 */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">取引条件</h2>
                <dl className="space-y-4">
                  <InfoItem label="支払条件" value={typedClient.payment_terms} />
                  <InfoItem
                    label="支払方法"
                    value={
                      typedClient.payment_method &&
                      getPaymentMethodLabel(typedClient.payment_method)
                    }
                  />
                  <InfoItem
                    label="支払期日"
                    value={typedClient.payment_due_days ? `${typedClient.payment_due_days}日` : undefined}
                  />
                  <InfoItem
                    label="与信限度額"
                    value={
                      typedClient.credit_limit ? `¥${typedClient.credit_limit.toLocaleString()}` : undefined
                    }
                  />
                  <InfoItem
                    label="現在残高"
                    value={`¥${typedClient.current_balance.toLocaleString()}`}
                  />
                </dl>
              </div>
            </div>

            {/* 銀行情報 */}
            {typedClient.bank_name && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">銀行情報</h2>
                  <dl className="space-y-4">
                    <InfoItem label="銀行名" value={typedClient.bank_name} />
                    <InfoItem label="支店名" value={typedClient.bank_branch} />
                    <InfoItem
                      label="口座種別"
                      value={
                        typedClient.bank_account_type &&
                        getBankAccountTypeLabel(typedClient.bank_account_type)
                      }
                    />
                    <InfoItem label="口座番号" value={typedClient.bank_account_number} />
                    <InfoItem label="口座名義" value={typedClient.bank_account_holder} />
                  </dl>
                </div>
              </div>
            )}

            {/* 税務情報 */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">税務情報</h2>
                <dl className="space-y-4">
                  <InfoItem label="法人番号" value={typedClient.tax_id} />
                  <InfoItem label="インボイス登録番号" value={typedClient.tax_registration_number} />
                  <InfoItem
                    label="課税事業者"
                    value={typedClient.is_tax_exempt ? 'いいえ' : 'はい'}
                  />
                </dl>
              </div>
            </div>

            {/* 取引実績 */}
            {typedClient.total_transaction_count > 0 && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">取引実績</h2>
                  <dl className="space-y-4">
                    <InfoItem
                      label="初回取引日"
                      value={
                        typedClient.first_transaction_date &&
                        new Date(typedClient.first_transaction_date).toLocaleDateString('ja-JP')
                      }
                    />
                    <InfoItem
                      label="最終取引日"
                      value={
                        typedClient.last_transaction_date &&
                        new Date(typedClient.last_transaction_date).toLocaleDateString('ja-JP')
                      }
                    />
                    <InfoItem
                      label="取引回数"
                      value={`${typedClient.total_transaction_count}回`}
                    />
                    <InfoItem
                      label="累計取引額"
                      value={`¥${typedClient.total_transaction_amount.toLocaleString()}`}
                    />
                    {typedClient.rating && (
                      <InfoItem label="評価" value={'⭐'.repeat(typedClient.rating)} />
                    )}
                  </dl>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 情報表示コンポーネント
function InfoItem({
  label,
  value,
  span2,
}: {
  label: string
  value?: string | null
  span2?: boolean
}) {
  if (!value) return null

  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{value}</dd>
    </div>
  )
}

// ヘルパー関数
function getClientTypeLabel(type: ClientType) {
  const labels: Record<ClientType, string> = {
    customer: '顧客',
    supplier: '仕入先',
    partner: '協力会社',
    both: '顧客兼仕入先',
  }
  return labels[type]
}

function getClientTypeBadgeColor(type: ClientType) {
  const colors: Record<ClientType, string> = {
    customer: 'bg-blue-100 text-blue-800',
    supplier: 'bg-green-100 text-green-800',
    partner: 'bg-purple-100 text-purple-800',
    both: 'bg-orange-100 text-orange-800',
  }
  return colors[type]
}

function getPaymentMethodLabel(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    bank_transfer: '銀行振込',
    cash: '現金',
    check: '小切手',
    credit: '掛売り',
    other: 'その他',
  }
  return labels[method]
}

function getBankAccountTypeLabel(type: BankAccountType) {
  const labels: Record<BankAccountType, string> = {
    savings: '普通預金',
    current: '当座預金',
    other: 'その他',
  }
  return labels[type]
}

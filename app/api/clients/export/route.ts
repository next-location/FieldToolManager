import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    console.log('[API /api/clients/export] Starting CSV export')
    const supabase = await createClient()
    console.log('[API /api/clients/export] Supabase client created')

    // ユーザー認証
    const {
      data: { user },
    } = await supabase.auth.getUser()
    console.log('[API /api/clients/export] User:', user?.id)

    if (!user) {
      console.log('[API /api/clients/export] No user found')
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    console.log('[API /api/clients/export] User data:', userData, 'Error:', userError)

    if (userError || !userData) {
      console.error('[API /api/clients/export] Failed to get user data:', userError)
      return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
    }

    // 管理者権限チェック
    if (userData.role !== 'admin') {
      console.log('[API /api/clients/export] User is not admin:', userData.role)
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    const client_type = searchParams.get('client_type')
    const is_active = searchParams.get('is_active')
    console.log('[API /api/clients/export] Filters:', { client_type, is_active })

    // クエリ構築
    let query = supabase
      .from('clients')
      .select('*')
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)
      .order('client_code')

    // フィルター適用
    if (client_type && client_type !== 'all') {
      query = query.eq('client_type', client_type)
    }

    if (is_active === 'true') {
      query = query.eq('is_active', true)
    } else if (is_active === 'false') {
      query = query.eq('is_active', false)
    }

    console.log('[API /api/clients/export] Executing query')
    const { data: clients, error } = await query

    if (error) {
      console.error('[API /api/clients/export] Query error:', error)
      return NextResponse.json({ error: '取引先データの取得に失敗しました' }, { status: 500 })
    }

    console.log('[API /api/clients/export] Retrieved', clients?.length, 'clients')

    // CSV生成
    const headers = [
      '取引先コード',
      '取引先名',
      'フリガナ',
      '略称',
      '取引先分類',
      '業種',
      '郵便番号',
      '住所',
      '電話番号',
      'FAX番号',
      'メールアドレス',
      'ウェブサイト',
      '担当者名',
      '担当者部署',
      '担当者電話',
      '担当者メール',
      '支払条件',
      '支払方法',
      '支払期日（日数）',
      '与信限度額',
      '銀行名',
      '支店名',
      '口座種別',
      '口座番号',
      '口座名義',
      '法人番号',
      'インボイス登録番号',
      '免税事業者',
      '評価',
      '備考',
      '社内用メモ',
      '有効フラグ',
      '登録日',
    ]

    console.log('[API /api/clients/export] Generating CSV rows')
    const rows = clients.map((client) => [
      client.client_code,
      client.name,
      client.name_kana || '',
      client.short_name || '',
      getClientTypeLabel(client.client_type),
      client.industry || '',
      client.postal_code || '',
      client.address || '',
      client.phone || '',
      client.fax || '',
      client.email || '',
      client.website || '',
      client.contact_person || '',
      client.contact_department || '',
      client.contact_phone || '',
      client.contact_email || '',
      client.payment_terms || '',
      getPaymentMethodLabel(client.payment_method),
      client.payment_due_days || '',
      client.credit_limit || '',
      client.bank_name || '',
      client.bank_branch || '',
      getBankAccountTypeLabel(client.bank_account_type),
      client.bank_account_number || '',
      client.bank_account_holder || '',
      client.tax_id || '',
      client.tax_registration_number || '',
      client.is_tax_exempt ? 'はい' : 'いいえ',
      client.rating ? '★'.repeat(client.rating) : '',
      client.notes || '',
      client.internal_notes || '',
      client.is_active ? '有効' : '無効',
      new Date(client.created_at).toLocaleDateString('ja-JP'),
    ])

    console.log('[API /api/clients/export] Generating CSV content')
    // CSV文字列生成
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    console.log('[API /api/clients/export] CSV content generated, length:', csvContent.length)
    // BOM付きUTF-8でエンコード
    const bom = '\uFEFF'
    const csvBlob = bom + csvContent

    console.log('[API /api/clients/export] Returning CSV response')
    // レスポンス生成
    return new NextResponse(csvBlob, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clients_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting clients:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'CSVエクスポートに失敗しました' },
      { status: 500 }
    )
  }
}

function getClientTypeLabel(type: string | null): string {
  const labels: Record<string, string> = {
    customer: '顧客',
    supplier: '仕入先',
    partner: '協力会社',
    both: '顧客兼仕入先',
  }
  return type ? labels[type] || type : ''
}

function getPaymentMethodLabel(method: string | null): string {
  const labels: Record<string, string> = {
    bank_transfer: '銀行振込',
    cash: '現金',
    check: '小切手',
    credit: '掛売り',
    other: 'その他',
  }
  return method ? labels[method] || method : ''
}

function getBankAccountTypeLabel(type: string | null): string {
  const labels: Record<string, string> = {
    savings: '普通預金',
    current: '当座預金',
    other: 'その他',
  }
  return type ? labels[type] || type : ''
}

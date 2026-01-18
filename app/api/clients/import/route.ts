import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken } from '@/lib/auth/impersonation'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // ユーザー認証
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // なりすましログインチェック
    const cookieStore = await cookies()
    const impersonationToken = cookieStore.get('impersonation_session')?.value
    const impersonationSession = impersonationToken
      ? await verifySessionToken(impersonationToken)
      : null

    if (!impersonationSession) {
      return NextResponse.json(
        { error: 'この機能はスーパー管理者のなりすましログイン時のみ利用できます' },
        { status: 403 }
      )
    }

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
    }

    // 管理者権限チェック
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // CSVデータ取得
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    // CSVファイルを読み込み
    const text = await file.text()
    const lines = text.split('\n').filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSVファイルが空です' }, { status: 400 })
    }

    // ヘッダー行をスキップ
    const dataLines = lines.slice(1)

    const results = {
      success: 0,
      errors: [] as Array<{ row: number; error: string; data: string }>,
    }

    // 各行を処理
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim()
      if (!line) continue

      try {
        // CSV行をパース（簡易的な実装）
        const values = parseCSVLine(line)

        if (values.length < 5) {
          results.errors.push({
            row: i + 2, // ヘッダー行を考慮
            error: '必須フィールドが不足しています',
            data: line.substring(0, 100),
          })
          continue
        }

        // データマッピング
        const clientData = {
          organization_id: userData?.organization_id,
          name: values[0] || '',
          name_kana: values[1] || null,
          short_name: values[2] || null,
          client_type: parseClientType(values[3]),
          industry: values[4] || null,
          postal_code: values[5] || null,
          address: values[6] || null,
          phone: values[7] || null,
          fax: values[8] || null,
          email: values[9] || null,
          website: values[10] || null,
          contact_person: values[11] || null,
          contact_department: values[12] || null,
          contact_phone: values[13] || null,
          contact_email: values[14] || null,
          payment_terms: values[15] || null,
          payment_method: parsePaymentMethod(values[16]) || null,
          payment_due_days: values[17] ? parseInt(values[17]) : 30,
          credit_limit: values[18] ? parseInt(values[18]) : null,
          bank_name: values[19] || null,
          bank_branch: values[20] || null,
          bank_account_type: parseBankAccountType(values[21]) || null,
          bank_account_number: values[22] || null,
          bank_account_holder: values[23] || null,
          tax_id: values[24] || null,
          tax_registration_number: values[25] || null,
          is_tax_exempt: values[26] === 'はい' || values[26] === 'true',
          rating: values[27] ? Math.min(5, Math.max(1, parseInt(values[27]))) : null,
          notes: values[28] || null,
          internal_notes: values[29] || null,
          is_active: values[30] !== '無効' && values[30] !== 'false',
        }

        // バリデーション
        if (!clientData.name || !clientData.client_type) {
          results.errors.push({
            row: i + 2,
            error: '取引先名と取引先分類は必須です',
            data: line.substring(0, 100),
          })
          continue
        }

        // 取引先コード生成
        const { data: code, error: codeError } = await supabase.rpc('generate_client_code', {
          org_id: userData?.organization_id,
        })

        if (codeError) {
          results.errors.push({
            row: i + 2,
            error: `取引先コードの生成に失敗しました: ${codeError.message}`,
            data: line.substring(0, 100),
          })
          continue
        }

        // 取引先作成
        const { error: insertError } = await supabase.from('clients').insert({
          ...clientData,
          code,
        })

        if (insertError) {
          results.errors.push({
            row: i + 2,
            error: `登録に失敗しました: ${insertError.message}`,
            data: line.substring(0, 100),
          })
          continue
        }

        results.success++
      } catch (error) {
        results.errors.push({
          row: i + 2,
          error: error instanceof Error ? error.message : '不明なエラー',
          data: line.substring(0, 100),
        })
      }
    }

    return NextResponse.json({
      message: `${results.success}件の取引先を登録しました`,
      results,
    })
  } catch (error) {
    console.error('Error importing clients:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'CSVインポートに失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * CSV行をパース（簡易的な実装）
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされた引用符
        current += '"'
        i++
      } else {
        // 引用符の開始/終了
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // カンマ区切り
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

/**
 * 取引先分類をパース
 */
function parseClientType(value: string): 'customer' | 'supplier' | 'partner' | 'both' {
  const typeMap: Record<string, 'customer' | 'supplier' | 'partner' | 'both'> = {
    顧客: 'customer',
    customer: 'customer',
    仕入先: 'supplier',
    supplier: 'supplier',
    協力会社: 'partner',
    partner: 'partner',
    顧客兼仕入先: 'both',
    both: 'both',
  }
  return typeMap[value] || 'customer'
}

/**
 * 支払方法をパース
 */
function parsePaymentMethod(
  value: string
): 'bank_transfer' | 'cash' | 'check' | 'credit' | 'other' | null {
  if (!value) return null
  const methodMap: Record<string, 'bank_transfer' | 'cash' | 'check' | 'credit' | 'other'> = {
    銀行振込: 'bank_transfer',
    bank_transfer: 'bank_transfer',
    現金: 'cash',
    cash: 'cash',
    小切手: 'check',
    check: 'check',
    掛売り: 'credit',
    credit: 'credit',
    その他: 'other',
    other: 'other',
  }
  return methodMap[value] || null
}

/**
 * 銀行口座種別をパース
 */
function parseBankAccountType(value: string): 'savings' | 'current' | 'other' | null {
  if (!value) return null
  const typeMap: Record<string, 'savings' | 'current' | 'other'> = {
    普通預金: 'savings',
    savings: 'savings',
    当座預金: 'current',
    current: 'current',
    その他: 'other',
    other: 'other',
  }
  return typeMap[value] || null
}

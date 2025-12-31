import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

// ひらがなに変換
function toHiragana(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

// カタカナに変換
function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    const chr = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(chr);
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 請求書一覧取得
export async function GET(request: NextRequest) {
  console.log('========================================');
  console.log('[Invoices API] ★★★ GET request started ★★★');
  console.log('========================================');
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      console.log('[Invoices API] No session found');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    console.log('[Invoices API] Session OK:', session.name);

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dueDateStart = searchParams.get('due_date_start');
    const dueDateEnd = searchParams.get('due_date_end');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log('[Invoices API] Params:', { organizationId, status, search, dueDateStart, dueDateEnd, page, limit });

    let query = supabase
      .from('invoices')
      .select(`
        *,
        organizations (
          id,
          name,
          subdomain
        ),
        contracts (
          id,
          contract_number
        )
      `, { count: 'exact' })
      .order('invoice_date', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (dueDateStart) {
      query = query.gte('due_date', dueDateStart);
    }

    if (dueDateEnd) {
      query = query.lte('due_date', dueDateEnd);
    }

    query = query.range(offset, offset + limit - 1);

    console.log('[Invoices API] Executing query...');
    let { data, error, count } = await query;

    console.log('[Invoices API] Query result:', {
      dataCount: data?.length,
      totalCount: count,
      hasError: !!error
    });

    if (error) {
      console.error('[Invoices API] Query error details:', JSON.stringify(error, null, 2));
    }

    // クライアント側で検索フィルタリング（ひらがな・カタカナ対応）
    if (search && data) {
      const searchLower = search.toLowerCase();
      const searchHiragana = toHiragana(search);
      const searchKatakana = toKatakana(search);

      data = data.filter((invoice) => {
        const invoiceNumber = invoice.invoice_number.toLowerCase();
        const orgName = invoice.organizations?.name || '';
        const orgNameLower = orgName.toLowerCase();
        const orgNameHiragana = toHiragana(orgName);
        const orgNameKatakana = toKatakana(orgName);

        return (
          invoiceNumber.includes(searchLower) ||
          orgNameLower.includes(searchLower) ||
          orgNameHiragana.includes(searchHiragana) ||
          orgNameKatakana.includes(searchKatakana) ||
          orgName.includes(search)
        );
      });

      count = data.length;
    }

    if (error) {
      console.error('[Invoices API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Invoices API] Returning response with', data?.length, 'invoices');

    return NextResponse.json({
      invoices: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error: any) {
    console.error('[Invoices API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 請求書作成
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 営業権限チェック
    const { data: adminData } = await supabase
      .from('super_admins')
      .select('role')
      .eq('id', session.id)
      .single();

    if (adminData?.role === 'sales') {
      return NextResponse.json(
        { error: '営業権限では請求書を作成できません' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 請求書番号の自動生成（年月-連番）
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // その月の最新の請求書番号を取得
    const { data: latestInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${yearMonth}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single();

    let sequenceNumber = 1;
    if (latestInvoice) {
      const parts = latestInvoice.invoice_number.split('-');
      sequenceNumber = parseInt(parts[1] || '0') + 1;
    }

    const invoiceNumber = `${yearMonth}-${String(sequenceNumber).padStart(4, '0')}`;

    // 初回請求書かどうかを判定（契約に紐づく請求書が存在しない場合は初回）
    let isInitialInvoice = false;
    if (body.contract_id) {
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('contract_id', body.contract_id)
        .limit(1);

      isInitialInvoice = !existingInvoices || existingInvoices.length === 0;
    }

    // 請求書データを作成
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: body.organization_id,
        contract_id: body.contract_id,
        invoice_number: invoiceNumber,
        invoice_date: body.invoice_date,
        due_date: body.due_date,
        billing_period_start: body.billing_period_start,
        billing_period_end: body.billing_period_end,
        amount: body.amount,
        tax_amount: body.tax_amount || body.amount * 0.1,
        total_amount: body.total_amount || (body.amount + (body.tax_amount || body.amount * 0.1)),
        status: body.status || 'draft',
        notes: body.notes,
        is_initial_invoice: isInitialInvoice, // 初回請求書フラグを自動設定
      })
      .select(`
        *,
        organizations (
          id,
          name,
          subdomain
        ),
        contracts (
          id,
          contract_number
        )
      `)
      .single();

    if (error) {
      console.error('[Invoices API] Create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('[Invoices API] Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

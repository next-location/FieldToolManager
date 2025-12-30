import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 本番環境のデータベーススキーマを調査するAPI
 *
 * 調査対象テーブル:
 * - organizations
 * - contracts
 * - users
 * - packages
 */
export async function GET(request: NextRequest) {
  const results: any = {};

  try {
    // organizationsテーブルのカラム情報を取得
    const { data: orgSample, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();

    if (orgError) {
      results.organizations_error = orgError.message;
    } else {
      results.organizations_columns = orgSample ? Object.keys(orgSample) : [];
    }

    // contractsテーブルのカラム情報を取得
    const { data: contractSample, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .limit(1)
      .single();

    if (contractError) {
      results.contracts_error = contractError.message;
    } else {
      results.contracts_columns = contractSample ? Object.keys(contractSample) : [];
    }

    // usersテーブルのカラム情報を取得
    const { data: userSample, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (userError) {
      results.users_error = userError.message;
    } else {
      results.users_columns = userSample ? Object.keys(userSample) : [];
    }

    // packagesテーブルのカラム情報を取得
    const { data: packageSample, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .limit(1)
      .single();

    if (packageError) {
      results.packages_error = packageError.message;
    } else {
      results.packages_columns = packageSample ? Object.keys(packageSample) : [];
    }

    // 実際のサンプルレコードも取得（値の型を確認するため）
    results.sample_data = {
      organizations: orgSample,
      contracts: contractSample,
      users: userSample,
      packages: packageSample,
    };

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      error: '本番スキーマ調査中にエラーが発生しました',
      message: error.message,
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/analytics/revenue - 売上分析データ取得
export async function GET(request: NextRequest) {
  try {
    // Super Admin認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;

    // アクティブな契約を取得
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        id,
        organization_id,
        plan,
        base_monthly_fee,
        package_monthly_fee,
        total_monthly_fee,
        start_date,
        end_date,
        status,
        created_at,
        organization:organizations(id, name, subdomain)
      `)
      .eq('status', 'active');

    if (contractsError) {
      console.error('Error fetching contracts:', contractsError);
      return NextResponse.json({ error: contractsError.message }, { status: 500 });
    }

    // パッケージ情報を取得
    const { data: packages, error: packagesError } = await supabase
      .from('packages')
      .select('id, name, monthly_fee, package_key');

    if (packagesError) {
      console.error('Error fetching packages:', packagesError);
      return NextResponse.json({ error: packagesError.message }, { status: 500 });
    }

    // 契約とパッケージの紐付けを取得
    const { data: contractPackages, error: contractPackagesError } = await supabase
      .from('contract_packages')
      .select('contract_id, package_id');

    if (contractPackagesError) {
      console.error('Error fetching contract packages:', contractPackagesError);
    }

    // 月別売上を計算
    const monthlyRevenue = calculateMonthlyRevenue(contracts || [], year, month);

    // パッケージ別売上を計算
    const packageRevenue = calculatePackageRevenue(
      contracts || [],
      packages || [],
      contractPackages || []
    );

    // プラン別売上を計算
    const planRevenue = calculatePlanRevenue(contracts || []);

    // MRR（月次経常収益）とARR（年次経常収益）
    const totalMRR = (contracts || []).reduce((sum, c) => sum + (c.total_monthly_fee || 0), 0);
    const totalARR = totalMRR * 12;

    // 前年同月比（仮実装 - 実際には前年データが必要）
    const previousYear = year - 1;
    const { data: previousContracts } = await supabase
      .from('contracts')
      .select('total_monthly_fee')
      .eq('status', 'active')
      .gte('start_date', `${previousYear}-01-01`)
      .lte('start_date', `${previousYear}-12-31`);

    const previousYearMRR = (previousContracts || []).reduce(
      (sum, c) => sum + (c.total_monthly_fee || 0),
      0
    );

    const yoyGrowth = previousYearMRR > 0
      ? ((totalMRR - previousYearMRR) / previousYearMRR) * 100
      : 0;

    return NextResponse.json({
      summary: {
        totalContracts: contracts?.length || 0,
        totalMRR,
        totalARR,
        yoyGrowth,
        averageContractValue: contracts?.length ? totalMRR / contracts.length : 0,
      },
      monthlyRevenue,
      packageRevenue,
      planRevenue,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/analytics/revenue:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 月別売上を計算
function calculateMonthlyRevenue(contracts: any[], targetYear: number, targetMonth: number | null) {
  const monthlyData: Record<string, { revenue: number; contracts: number }> = {};

  // 12ヶ月分を初期化
  for (let m = 1; m <= 12; m++) {
    const key = `${targetYear}-${String(m).padStart(2, '0')}`;
    monthlyData[key] = { revenue: 0, contracts: 0 };
  }

  contracts.forEach((contract) => {
    const startDate = new Date(contract.start_date);
    const endDate = contract.end_date ? new Date(contract.end_date) : null;

    for (let m = 1; m <= 12; m++) {
      const monthDate = new Date(targetYear, m - 1, 1);

      // 契約期間内かチェック
      if (monthDate >= startDate && (!endDate || monthDate <= endDate)) {
        const key = `${targetYear}-${String(m).padStart(2, '0')}`;
        monthlyData[key].revenue += contract.total_monthly_fee || 0;
        monthlyData[key].contracts += 1;
      }
    }
  });

  return Object.entries(monthlyData).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    contracts: data.contracts,
  }));
}

// パッケージ別売上を計算
function calculatePackageRevenue(
  contracts: any[],
  packages: any[],
  contractPackages: any[]
) {
  const packageRevenueMap: Record<string, { name: string; revenue: number; contracts: number }> = {};

  // 基本プラン収益
  packageRevenueMap['base_plan'] = {
    name: '基本プラン',
    revenue: contracts.reduce((sum, c) => sum + (c.base_monthly_fee || 0), 0),
    contracts: contracts.length,
  };

  // パッケージ別収益
  packages.forEach((pkg) => {
    const contractsWithPackage = contractPackages.filter((cp) => cp.package_id === pkg.id);
    const revenue = contractsWithPackage.length * pkg.monthly_fee;

    packageRevenueMap[pkg.id] = {
      name: pkg.name,
      revenue,
      contracts: contractsWithPackage.length,
    };
  });

  return Object.entries(packageRevenueMap).map(([id, data]) => ({
    id,
    name: data.name,
    revenue: data.revenue,
    contracts: data.contracts,
    percentage: 0, // 後で計算
  }));
}

// プラン別売上を計算
function calculatePlanRevenue(contracts: any[]) {
  const planRevenueMap: Record<string, { revenue: number; contracts: number }> = {
    start: { revenue: 0, contracts: 0 },
    standard: { revenue: 0, contracts: 0 },
    business: { revenue: 0, contracts: 0 },
    pro: { revenue: 0, contracts: 0 },
  };

  contracts.forEach((contract) => {
    const plan = contract.plan || 'start';
    if (planRevenueMap[plan]) {
      planRevenueMap[plan].revenue += contract.total_monthly_fee || 0;
      planRevenueMap[plan].contracts += 1;
    }
  });

  return Object.entries(planRevenueMap).map(([plan, data]) => ({
    plan,
    revenue: data.revenue,
    contracts: data.contracts,
  }));
}

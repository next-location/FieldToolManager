# パッケージ制御システム実装計画書

## 1. 概要

Field Tool Managerのパッケージ制御システムは、組織が契約している機能パックに応じて、
利用可能な機能を動的に制御するシステムです。

### 1.1 現在の状況

- **設計済み**: パッケージ別の機能制約、分析機能の対応策
- **未実装**: パッケージ制御の基盤システム、スーパーアドミン機能
- **テスト待ち**: パッケージごとの表示制御

### 1.2 パッケージ構成

| パッケージ名 | 月額料金 | 主な機能 |
|------------|---------|---------|
| **現場資産パック** | ¥18,000 | 道具管理、消耗品管理、重機管理、QRコード、棚卸し |
| **現場DX業務効率化パック** | ¥22,000 | 出退勤、作業報告書、見積・請求書、売上管理 |
| **フル機能統合パック** | ¥32,000 | 全機能利用可能（割引適用） |

## 2. データベース設計

### 2.1 必要なテーブル

```sql
-- 契約管理テーブル
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  contract_number TEXT NOT NULL UNIQUE,

  -- 契約内容
  plan_type TEXT NOT NULL CHECK (plan_type IN ('start', 'standard', 'business', 'pro', 'enterprise')),
  user_limit INTEGER NOT NULL,

  -- パッケージ選択
  has_asset_package BOOLEAN DEFAULT false,        -- 現場資産パック
  has_dx_efficiency_package BOOLEAN DEFAULT false, -- 現場DX業務効率化パック

  -- 契約期間
  contract_start_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),

  -- 料金
  base_monthly_fee DECIMAL(10, 2) NOT NULL,
  package_monthly_fee DECIMAL(10, 2) NOT NULL,
  total_monthly_fee DECIMAL(10, 2) NOT NULL,

  -- ステータス
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'suspended', 'cancelled', 'expired')),
  trial_end_date DATE,

  -- メタデータ
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- 機能フラグテーブル（詳細制御用）
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_until DATE, -- 期間限定機能用
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, feature_key)
);

-- 契約履歴テーブル
CREATE TABLE contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  action TEXT NOT NULL CHECK (action IN ('created', 'upgraded', 'downgraded', 'renewed', 'suspended', 'cancelled')),

  -- 変更前後の内容
  previous_state JSONB,
  new_state JSONB,

  -- 変更理由
  reason TEXT,

  -- メタデータ
  performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  performed_by UUID REFERENCES users(id)
);

-- スーパーアドミン管理テーブル
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,

  -- 権限レベル
  permission_level TEXT NOT NULL CHECK (permission_level IN ('viewer', 'operator', 'admin')),

  -- アクセス制御
  allowed_actions TEXT[] DEFAULT ARRAY[]::TEXT[],
  ip_whitelist TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- セキュリティ
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,

  -- ステータス
  is_active BOOLEAN DEFAULT true,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- スーパーアドミン操作ログ
CREATE TABLE super_admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES super_admins(id),
  action TEXT NOT NULL,
  target_type TEXT, -- 'organization', 'contract', 'user', etc.
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 ビュー定義

```sql
-- 組織の有効な機能一覧を返すビュー
CREATE VIEW organization_features AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  c.plan_type,
  c.user_limit,
  c.has_asset_package,
  c.has_dx_efficiency_package,
  c.status as contract_status,

  -- 利用可能な機能を計算
  CASE
    WHEN c.has_asset_package AND c.has_dx_efficiency_package THEN 'full'
    WHEN c.has_asset_package THEN 'asset'
    WHEN c.has_dx_efficiency_package THEN 'dx'
    ELSE 'none'
  END as package_type,

  -- 個別機能フラグ
  ARRAY(
    SELECT feature_key
    FROM feature_flags f
    WHERE f.organization_id = o.id
    AND f.is_enabled = true
    AND (f.enabled_until IS NULL OR f.enabled_until >= CURRENT_DATE)
  ) as enabled_features

FROM organizations o
LEFT JOIN contracts c ON o.id = c.organization_id AND c.status = 'active'
WHERE o.deleted_at IS NULL;
```

## 3. API実装

### 3.1 パッケージ確認API

```typescript
// app/api/organization/features/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  // 現在のユーザーの組織IDを取得
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  // 組織の契約情報を取得
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .eq('status', 'active')
    .single();

  // 機能フラグを取得
  const { data: featureFlags } = await supabase
    .from('feature_flags')
    .select('feature_key')
    .eq('organization_id', userData.organization_id)
    .eq('is_enabled', true);

  return NextResponse.json({
    organization_id: userData.organization_id,
    contract: {
      plan_type: contract?.plan_type || 'trial',
      user_limit: contract?.user_limit || 10,
      packages: {
        asset_management: contract?.has_asset_package || false,
        dx_efficiency: contract?.has_dx_efficiency_package || false,
      },
      status: contract?.status || 'trial',
    },
    features: featureFlags?.map(f => f.feature_key) || [],
  });
}
```

### 3.2 スーパーアドミンAPI

```typescript
// app/api/super-admin/contracts/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // スーパーアドミン認証チェック
  const isAuthorized = await checkSuperAdminAuth(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    organization_id,
    plan_type,
    user_limit,
    has_asset_package,
    has_dx_efficiency_package,
    contract_start_date,
    contract_end_date,
  } = body;

  // 料金計算
  const baseFee = calculateBaseFee(plan_type, user_limit);
  const packageFee = calculatePackageFee(has_asset_package, has_dx_efficiency_package);

  // 契約作成
  const { data: contract, error } = await supabase
    .from('contracts')
    .insert({
      organization_id,
      contract_number: generateContractNumber(),
      plan_type,
      user_limit,
      has_asset_package,
      has_dx_efficiency_package,
      contract_start_date,
      contract_end_date,
      billing_cycle: 'monthly',
      base_monthly_fee: baseFee,
      package_monthly_fee: packageFee,
      total_monthly_fee: baseFee + packageFee,
      status: 'active',
    })
    .select()
    .single();

  // 操作ログ記録
  await logSuperAdminAction({
    action: 'contract_created',
    target_type: 'contract',
    target_id: contract.id,
    details: body,
  });

  return NextResponse.json(contract);
}
```

## 4. フロントエンド実装

### 4.1 機能制御Hook

```typescript
// hooks/useFeatures.ts
import { useEffect, useState } from 'react';

interface Features {
  packages: {
    asset_management: boolean;
    dx_efficiency: boolean;
  };
  features: string[];
  isLoading: boolean;
}

export function useFeatures(): Features {
  const [features, setFeatures] = useState<Features>({
    packages: {
      asset_management: false,
      dx_efficiency: false,
    },
    features: [],
    isLoading: true,
  });

  useEffect(() => {
    fetch('/api/organization/features')
      .then(res => res.json())
      .then(data => {
        setFeatures({
          packages: data.contract.packages,
          features: data.features,
          isLoading: false,
        });
      });
  }, []);

  return features;
}

// 使用例
export function hasFeature(features: Features, featureKey: string): boolean {
  // パッケージレベルのチェック
  if (featureKey.startsWith('asset.')) {
    return features.packages.asset_management;
  }
  if (featureKey.startsWith('dx.')) {
    return features.packages.dx_efficiency;
  }

  // 個別機能フラグのチェック
  return features.features.includes(featureKey);
}
```

### 4.2 条件付きレンダリングコンポーネント

```typescript
// components/FeatureGate.tsx
'use client';

import { useFeatures, hasFeature } from '@/hooks/useFeatures';
import { ReactNode } from 'react';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const features = useFeatures();

  if (features.isLoading) {
    return <div>Loading...</div>;
  }

  if (hasFeature(features, feature)) {
    return <>{children}</>;
  }

  return fallback ? (
    <>{fallback}</>
  ) : (
    <div className="p-4 bg-gray-100 rounded-lg">
      <p className="text-gray-600">この機能はご契約のプランに含まれていません。</p>
      <button className="mt-2 text-blue-600 hover:underline">
        プランをアップグレード
      </button>
    </div>
  );
}

// 使用例
<FeatureGate feature="asset.tool_management">
  <ToolManagementComponent />
</FeatureGate>

<FeatureGate
  feature="dx.work_reports"
  fallback={<UpgradePrompt feature="作業報告書" />}
>
  <WorkReportsComponent />
</FeatureGate>
```

### 4.3 スーパーアドミン画面

```typescript
// app/super-admin/contracts/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function SuperAdminContracts() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);

  const handleContractUpdate = async (orgId: string, updates: any) => {
    const response = await fetch('/api/super-admin/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: orgId,
        ...updates,
      }),
    });

    if (response.ok) {
      alert('契約情報を更新しました');
      // リストを再読み込み
      loadOrganizations();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">契約管理</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 組織一覧 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">組織一覧</h2>
          <div className="space-y-2">
            {organizations.map(org => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className="w-full text-left p-3 hover:bg-gray-50 rounded"
              >
                <div className="font-medium">{org.name}</div>
                <div className="text-sm text-gray-600">
                  {org.contract?.plan_type || 'トライアル'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 契約詳細・編集 */}
        {selectedOrg && (
          <ContractEditor
            organization={selectedOrg}
            onUpdate={handleContractUpdate}
          />
        )}
      </div>
    </div>
  );
}
```

## 5. テスト戦略

### 5.1 開発環境でのテスト

#### A. モックデータによるテスト

```typescript
// __tests__/mocks/features.ts
export const mockFeatures = {
  assetOnly: {
    packages: {
      asset_management: true,
      dx_efficiency: false,
    },
    features: [],
  },
  dxOnly: {
    packages: {
      asset_management: false,
      dx_efficiency: true,
    },
    features: [],
  },
  full: {
    packages: {
      asset_management: true,
      dx_efficiency: true,
    },
    features: ['premium_analytics', 'ai_predictions'],
  },
};
```

#### B. 環境変数による切り替え

```env
# .env.development
NEXT_PUBLIC_MOCK_PACKAGE_TYPE=asset # asset | dx | full | none
```

```typescript
// hooks/useFeatures.ts (開発用)
export function useFeatures(): Features {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_MOCK_PACKAGE_TYPE) {
    const mockType = process.env.NEXT_PUBLIC_MOCK_PACKAGE_TYPE;
    return mockFeatures[mockType];
  }

  // 本番用のコード
}
```

### 5.2 テストシナリオ

| シナリオ | テスト内容 | 確認項目 |
|---------|----------|---------|
| **現場資産パックのみ** | 道具管理画面の表示 | ✅ 道具一覧表示<br>❌ 作業報告書メニュー非表示 |
| **現場DXパックのみ** | 作業報告書の表示 | ✅ 作業報告書表示<br>❌ 道具管理メニュー非表示 |
| **フル機能パック** | 全機能の表示 | ✅ 全メニュー表示<br>✅ 統合分析表示 |
| **契約なし（トライアル）** | 制限付き表示 | ⚠️ 基本機能のみ<br>⚠️ アップグレード促進表示 |

## 6. 実装フェーズ

### Phase 1: 基盤構築（1週間）✅ 完了
- [x] データベーステーブル作成
- [x] 契約管理テーブル（contracts）拡張
- [x] 機能フラグテーブル（feature_flags）
- [x] スーパーアドミンテーブル（super_admins）
- [x] 契約履歴テーブル（contract_history）
- [x] organization_featuresビュー作成
- [x] 基本API実装
- [x] パッケージ確認API（/api/organization/features）
- [x] 機能制御Hook作成（useFeatures）
- [x] 開発環境用モック機能実装

### Phase 2: スーパーアドミン機能（1週間）⏸️ 保留
- [ ] スーパーアドミン認証システム
- [ ] 契約管理画面
- [ ] 組織一覧表示
- [ ] 契約作成・編集
- [ ] パッケージ切り替え
- [ ] 操作ログ記録

**注**: Phase 2は後回しにして、まず動作可能な形を優先

### Phase 3: フロントエンド統合（1週間）✅ 完了
- [x] FeatureGateコンポーネント実装
- [x] PackageGateコンポーネント実装
- [x] アップグレード促進UI実装
- [x] DevPackageControlコンポーネント実装（開発環境用）
- [x] AppLayoutへの統合
- [ ] 既存画面への適用（次のステップ）
  - [ ] Sidebarメニュー表示制御
  - [ ] 道具管理画面
  - [ ] 作業報告書画面
  - [ ] 分析画面

### Phase 4: テスト実装（3日）
- [ ] ユニットテスト
- [ ] 統合テスト
- [ ] E2Eテスト（Playwright）
- [ ] パッケージ切り替えテスト

### Phase 5: 本番環境準備（2日）
- [ ] マイグレーションスクリプト
- [ ] 初期データ投入
- [ ] ドキュメント整備
- [ ] 運用手順書作成

## 7. 暫定的なテスト方法（Phase 1-2実装前）

### 7.1 URLパラメータによる切り替え

```typescript
// 開発時のみ有効
// http://localhost:3000/analytics?mock_package=asset

export function useFeatures(): Features {
  const searchParams = useSearchParams();
  const mockPackage = searchParams.get('mock_package');

  if (process.env.NODE_ENV === 'development' && mockPackage) {
    return getMockFeatures(mockPackage);
  }

  // 本番コード
}
```

### 7.2 LocalStorageによる切り替え

```typescript
// 開発コンソールで実行
localStorage.setItem('mock_package_type', 'asset');
localStorage.setItem('mock_package_type', 'dx');
localStorage.setItem('mock_package_type', 'full');
```

### 7.3 テスト用ボタンの配置

```typescript
// components/DevTools.tsx（開発環境のみ表示）
{process.env.NODE_ENV === 'development' && (
  <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded">
    <select onChange={(e) => setMockPackage(e.target.value)}>
      <option value="">パッケージ選択</option>
      <option value="asset">現場資産のみ</option>
      <option value="dx">現場DXのみ</option>
      <option value="full">フル機能</option>
    </select>
  </div>
)}
```

## 8. セキュリティ考慮事項

### 8.1 アクセス制御

- スーパーアドミンは専用の認証システムを使用
- 二要素認証（2FA）の実装
- IPアドレス制限
- 操作ログの完全記録

### 8.2 データ保護

- 契約情報の暗号化
- RLSによる組織間のデータ分離
- 定期的な権限監査

## 9. 運用・保守

### 9.1 契約管理フロー

1. **新規契約**
   - 営業チームが契約情報を収集
   - スーパーアドミンがシステムに登録
   - 組織管理者に通知

2. **契約変更**
   - アップグレード/ダウングレード申請
   - スーパーアドミンが承認・反映
   - 変更履歴を記録

3. **契約終了**
   - 30日前に通知
   - データエクスポート期間の提供
   - アカウント無効化

### 9.2 監視項目

- 各パッケージの利用率
- 機能別のアクセス頻度
- エラー発生率
- パフォーマンス指標

## 10. 今後の拡張計画

### 10.1 セルフサービス化

- 組織管理者による契約変更申請
- オンライン決済との連携
- 自動プロビジョニング

### 10.2 細かい機能制御

- 機能単位での課金
- 使用量ベースの課金
- カスタムパッケージの作成

### 10.3 分析強化

- パッケージ別の利用統計
- アップセル機会の自動検出
- 解約予測と防止施策

---

## 付録A: 機能キーマッピング

| 機能 | キー | 所属パッケージ |
|-----|-----|--------------|
| 道具管理 | asset.tool_management | 現場資産パック |
| 消耗品管理 | asset.consumables | 現場資産パック |
| 重機管理 | asset.equipment | 現場資産パック |
| QRコード | asset.qr_code | 現場資産パック |
| 棚卸し | asset.inventory | 現場資産パック |
| 出退勤管理 | dx.attendance | 現場DX業務効率化パック |
| 作業報告書 | dx.work_reports | 現場DX業務効率化パック |
| 見積書 | dx.estimates | 現場DX業務効率化パック |
| 請求書 | dx.invoices | 現場DX業務効率化パック |
| 売上管理 | dx.revenue | 現場DX業務効率化パック |
| 統合分析 | analytics.integrated | フル機能パック限定 |
| AI予測 | ai.predictions | オプション機能 |

## 付録B: エラーメッセージ定義

```typescript
export const FEATURE_ERROR_MESSAGES = {
  PACKAGE_NOT_CONTRACTED: {
    asset: '現場資産パックの契約が必要です',
    dx: '現場DX業務効率化パックの契約が必要です',
    full: 'フル機能統合パックの契約が必要です',
  },
  TRIAL_EXPIRED: 'トライアル期間が終了しました',
  CONTRACT_SUSPENDED: '契約が一時停止されています',
  USER_LIMIT_EXCEEDED: 'ユーザー数が上限に達しています',
  FEATURE_NOT_AVAILABLE: 'この機能は現在利用できません',
};
```

---

*このドキュメントはパッケージ制御システムの実装計画を定義しています。*
*実装の進捗に応じて随時更新してください。*
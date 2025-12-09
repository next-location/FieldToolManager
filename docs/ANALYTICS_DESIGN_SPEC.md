# 分析機能設計仕様書

## 1. 概要

Field Tool Managerの分析機能は、企業が契約しているパッケージに応じて利用可能な機能を動的に変更します。
データが部分的にしか利用できない場合でも、有用な分析結果を提供できるよう設計されています。

## 2. パッケージ別機能制約マトリクス

### 2.1 利用可能データ

| データ種別 | 現場資産パック | 現場DX業務効率化パック | フル機能統合パック |
|-----------|--------------|---------------------|-----------------|
| 道具・重機・消耗品データ | ✅ | ❌ | ✅ |
| 在庫・移動履歴 | ✅ | ❌ | ✅ |
| メンテナンス履歴 | ✅ | ❌ | ✅ |
| 出退勤データ | ❌ | ✅ | ✅ |
| 作業報告書 | ❌ | ✅ | ✅ |
| 見積・請求書データ | ❌ | ✅ | ✅ |
| 支払・入金データ | ❌ | ✅ | ✅ |
| 工事マスタ | ❌ | ✅ | ✅ |

### 2.2 分析機能の利用可否

| 分析機能 | 現場資産パック | 現場DX業務効率化パック | フル機能統合パック | 備考 |
|---------|--------------|---------------------|-----------------|------|
| **在庫分析** | ✅ フル機能 | ❌ 利用不可 | ✅ フル機能 | |
| **道具稼働率分析** | ✅ フル機能 | ❌ 利用不可 | ✅ フル機能 | |
| **メンテナンス予測** | ✅ フル機能 | ❌ 利用不可 | ✅ フル機能 | |
| **工事原価分析** | ⚠️ 手動入力 | ⚠️ 部分的 | ✅ フル機能 | 注1 |
| **収支分析** | ❌ 利用不可 | ✅ フル機能 | ✅ フル機能 | |
| **人件費分析** | ❌ 利用不可 | ✅ フル機能 | ✅ フル機能 | |
| **資金繰り予測** | ❌ 利用不可 | ✅ フル機能 | ✅ フル機能 | |
| **総合ダッシュボード** | ⚠️ 限定的 | ⚠️ 限定的 | ✅ フル機能 | 注2 |

**注1**: 工事原価分析における制約
- 現場資産パック：道具・重機コストは自動計算、人件費・材料費は手動入力
- 現場DX業務効率化パック：人件費・材料費は自動計算、道具・重機コストは手動入力
- フル機能統合パック：全コスト自動計算

**注2**: 総合ダッシュボードは契約パッケージに応じて表示内容が変わる

## 3. データ欠損時の対応策

### 3.1 手動入力フォーム

#### 工事原価手動入力（現場資産パックのみ契約時）

```typescript
interface ManualCostInput {
  project_id: string;
  labor_cost: number;      // 人件費（手動入力）
  material_cost: number;   // 材料費（手動入力）
  outsourcing_cost: number; // 外注費（手動入力）
  // 道具・重機コストは自動計算
}
```

#### 道具コスト手動入力（現場DX業務効率化パックのみ契約時）

```typescript
interface ManualToolCostInput {
  project_id: string;
  tool_rental_cost: number;     // 道具レンタル費（手動入力）
  equipment_rental_cost: number; // 重機レンタル費（手動入力）
  consumables_cost: number;      // 消耗品費（手動入力）
  // 人件費・材料費は自動計算
}
```

### 3.2 推定値の活用

データが不足している場合、以下の方法で推定値を提供：

1. **業界平均値の利用**
   - 国土交通省の建設工事費デフレーターを参照
   - 一般的な工事原価構成比（材料費30%、労務費40%、機械費10%、経費20%）

2. **過去データからの推定**
   - 類似工事の実績値から推定
   - 季節変動パターンの適用

3. **ユーザー設定のデフォルト値**
   - 組織ごとに標準単価を設定可能
   - 頻繁に使用する値をテンプレート化

## 4. 実装設計

### 4.1 データベース設計

```sql
-- 手動入力コストテーブル
CREATE TABLE manual_cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('labor', 'material', 'tool', 'equipment', 'outsourcing', 'other')),
  amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 分析設定テーブル（組織ごとのデフォルト値）
CREATE TABLE analytics_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  setting_type TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, setting_type, setting_key)
);

-- 分析結果キャッシュテーブル
CREATE TABLE analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  analysis_type TEXT NOT NULL,
  target_date DATE NOT NULL,
  result_data JSONB NOT NULL,
  data_sources JSONB NOT NULL, -- 使用したデータソース
  has_manual_entries BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,
  INDEX idx_analytics_cache_lookup (organization_id, analysis_type, target_date)
);
```

### 4.2 API設計

#### 分析データ取得API

```typescript
// app/api/analytics/project-cost/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');

  // ユーザーの契約パッケージを確認
  const packages = await getContractedPackages(organization_id);

  let costData = {
    labor_cost: 0,
    material_cost: 0,
    tool_cost: 0,
    equipment_cost: 0,
    outsourcing_cost: 0,
    total_cost: 0,
    data_completeness: 'full' as 'full' | 'partial' | 'estimated'
  };

  // パッケージに応じてデータを収集
  if (packages.includes('asset_management')) {
    // 道具・重機コストを自動計算
    const toolCosts = await calculateToolCosts(projectId);
    costData.tool_cost = toolCosts.tool_cost;
    costData.equipment_cost = toolCosts.equipment_cost;
  }

  if (packages.includes('dx_efficiency')) {
    // 人件費・材料費を自動計算
    const laborCosts = await calculateLaborCosts(projectId);
    const materialCosts = await calculateMaterialCosts(projectId);
    costData.labor_cost = laborCosts.total;
    costData.material_cost = materialCosts.total;
  }

  // 手動入力データを取得
  const manualEntries = await getManualCostEntries(projectId);

  // データ完全性を判定
  if (!packages.includes('asset_management') || !packages.includes('dx_efficiency')) {
    costData.data_completeness = 'partial';
  }

  return NextResponse.json(costData);
}
```

### 4.3 UI/UX設計

#### パッケージ別ダッシュボード表示

```typescript
// components/analytics/Dashboard.tsx
'use client';

import { useContractedPackages } from '@/hooks/useContractedPackages';

export default function AnalyticsDashboard() {
  const { packages, loading } = useContractedPackages();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 現場資産パック契約時のみ表示 */}
      {packages.includes('asset_management') && (
        <>
          <InventoryAnalyticsCard />
          <ToolUtilizationCard />
          <MaintenancePredictionCard />
        </>
      )}

      {/* 現場DX業務効率化パック契約時のみ表示 */}
      {packages.includes('dx_efficiency') && (
        <>
          <RevenueAnalyticsCard />
          <CashFlowForecastCard />
          <LaborCostAnalyticsCard />
        </>
      )}

      {/* 両方契約時のみ表示される統合分析 */}
      {packages.includes('asset_management') && packages.includes('dx_efficiency') && (
        <>
          <IntegratedPLCard />
          <ROIAnalysisCard />
          <ComprehensiveCostCard />
        </>
      )}

      {/* データ不足時の手動入力促進カード */}
      {!packages.includes('asset_management') && packages.includes('dx_efficiency') && (
        <ManualToolCostInputCard />
      )}

      {packages.includes('asset_management') && !packages.includes('dx_efficiency') && (
        <ManualLaborCostInputCard />
      )}
    </div>
  );
}
```

#### 手動入力モーダル

```typescript
// components/analytics/ManualCostInputModal.tsx
export default function ManualCostInputModal({ projectId, costType }) {
  const [formData, setFormData] = useState({
    amount: 0,
    notes: ''
  });

  const handleSubmit = async () => {
    await fetch('/api/analytics/manual-costs', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        entry_type: costType,
        amount: formData.amount,
        notes: formData.notes
      })
    });
  };

  return (
    <Modal>
      <h2>手動コスト入力</h2>
      <div className="bg-yellow-50 p-4 rounded-md mb-4">
        <p className="text-sm text-yellow-800">
          <InfoIcon className="inline mr-2" />
          {costType === 'labor' && '現場DX業務効率化パックを契約すると、出退勤データから自動計算されます'}
          {costType === 'tool' && '現場資産パックを契約すると、道具使用履歴から自動計算されます'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <label>
          金額
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
          />
        </label>

        <label>
          備考
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="見積書番号、計算根拠など"
          />
        </label>

        <button type="submit">保存</button>
      </form>
    </Modal>
  );
}
```

### 4.4 データ統合ロジック

```typescript
// lib/analytics/cost-calculator.ts

export async function calculateProjectCost(
  projectId: string,
  organizationId: string
): Promise<ProjectCost> {
  const packages = await getContractedPackages(organizationId);

  const cost: ProjectCost = {
    labor: { amount: 0, source: 'none', confidence: 0 },
    material: { amount: 0, source: 'none', confidence: 0 },
    tool: { amount: 0, source: 'none', confidence: 0 },
    equipment: { amount: 0, source: 'none', confidence: 0 },
    outsourcing: { amount: 0, source: 'none', confidence: 0 }
  };

  // 1. 自動計算可能なコストを取得
  if (packages.includes('dx_efficiency')) {
    // 出退勤データから人件費計算
    const attendance = await getAttendanceData(projectId);
    if (attendance.length > 0) {
      cost.labor.amount = calculateLaborFromAttendance(attendance);
      cost.labor.source = 'automatic';
      cost.labor.confidence = 95;
    }

    // 請求書データから材料費計算
    const invoices = await getProjectInvoices(projectId);
    cost.material.amount = sumMaterialCosts(invoices);
    cost.material.source = 'automatic';
    cost.material.confidence = 100;
  }

  if (packages.includes('asset_management')) {
    // 道具使用履歴からコスト計算
    const toolUsage = await getToolUsageHistory(projectId);
    cost.tool.amount = calculateToolDepreciation(toolUsage);
    cost.tool.source = 'automatic';
    cost.tool.confidence = 90;

    // 重機使用履歴からコスト計算
    const equipmentUsage = await getEquipmentUsageHistory(projectId);
    cost.equipment.amount = calculateEquipmentCost(equipmentUsage);
    cost.equipment.source = 'automatic';
    cost.equipment.confidence = 90;
  }

  // 2. 手動入力データを取得
  const manualEntries = await getManualCostEntries(projectId);
  for (const entry of manualEntries) {
    if (!cost[entry.entry_type].source || cost[entry.entry_type].source === 'none') {
      cost[entry.entry_type].amount = entry.amount;
      cost[entry.entry_type].source = 'manual';
      cost[entry.entry_type].confidence = 80;
    }
  }

  // 3. 推定値で補完（データがない場合）
  const projectInfo = await getProjectInfo(projectId);
  const industryAverage = await getIndustryAverageRatio(projectInfo.type);

  for (const costType of Object.keys(cost)) {
    if (cost[costType].source === 'none') {
      // 他のコストから推定
      const totalKnownCost = Object.values(cost)
        .filter(c => c.source !== 'none')
        .reduce((sum, c) => sum + c.amount, 0);

      if (totalKnownCost > 0) {
        cost[costType].amount = totalKnownCost * industryAverage[costType];
        cost[costType].source = 'estimated';
        cost[costType].confidence = 60;
      }
    }
  }

  return cost;
}
```

## 5. 表示制御とメッセージング

### 5.1 データ不足時のメッセージ

```typescript
const DataSourceIndicator = ({ source, confidence }) => {
  const messages = {
    automatic: { icon: '✅', text: '自動計算', color: 'green' },
    manual: { icon: '✏️', text: '手動入力', color: 'yellow' },
    estimated: { icon: '📊', text: '推定値', color: 'orange' },
    none: { icon: '❌', text: 'データなし', color: 'red' }
  };

  const info = messages[source];

  return (
    <div className={`flex items-center text-${info.color}-600`}>
      <span>{info.icon}</span>
      <span className="ml-1 text-sm">{info.text}</span>
      {confidence && (
        <span className="ml-2 text-xs">
          (信頼度: {confidence}%)
        </span>
      )}
    </div>
  );
};
```

### 5.2 アップセルメッセージ

```typescript
const PackageUpgradePrompt = ({ missingPackage }) => {
  const benefits = {
    asset_management: [
      '道具・重機コストの自動計算',
      '在庫最適化による20%のコスト削減',
      'メンテナンス予測でダウンタイム削減'
    ],
    dx_efficiency: [
      '人件費の自動計算',
      '請求書からの原価自動集計',
      'キャッシュフロー予測'
    ]
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-bold text-blue-900 mb-2">
        より正確な分析のために
      </h3>
      <p className="text-sm text-blue-800 mb-3">
        {missingPackage === 'asset_management' ? '現場資産パック' : '現場DX業務効率化パック'}
        を追加すると、以下の機能が利用可能になります：
      </p>
      <ul className="list-disc list-inside text-sm text-blue-700">
        {benefits[missingPackage].map((benefit, idx) => (
          <li key={idx}>{benefit}</li>
        ))}
      </ul>
      <button className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        パッケージ追加の相談
      </button>
    </div>
  );
};
```

## 6. レポート出力時の対応

### 6.1 PDF/CSVエクスポート時の注記

```typescript
const generateAnalyticsReport = async (projectId: string, format: 'pdf' | 'csv') => {
  const costData = await calculateProjectCost(projectId);

  // データソースの内訳を集計
  const dataSources = {
    automatic: 0,
    manual: 0,
    estimated: 0,
    none: 0
  };

  Object.values(costData).forEach(item => {
    dataSources[item.source]++;
  });

  // レポートに注記を追加
  const notes = [];

  if (dataSources.manual > 0) {
    notes.push('※ 一部のデータは手動入力値を使用しています');
  }

  if (dataSources.estimated > 0) {
    notes.push('※ 一部のデータは業界平均値からの推定値を使用しています');
  }

  if (format === 'pdf') {
    // PDFに注記欄を追加
    doc.setFontSize(8);
    doc.text(notes.join('\n'), 10, 280);
  } else {
    // CSVにメタデータシートを追加
    const metadata = [
      ['データ品質情報'],
      ['自動計算項目数', dataSources.automatic],
      ['手動入力項目数', dataSources.manual],
      ['推定値項目数', dataSources.estimated],
      [''],
      ...notes.map(note => [note])
    ];
  }
};
```

## 7. 実装優先順位

### Phase 1: 基本実装（1週間）
1. パッケージ判定ロジック
2. 手動入力フォーム
3. データ統合基本ロジック

### Phase 2: UI実装（1週間）
1. パッケージ別ダッシュボード
2. データソースインジケーター
3. アップセルメッセージ

### Phase 3: 高度な機能（2週間）
1. 推定値計算ロジック
2. データ品質スコアリング
3. レポート出力対応

### Phase 4: 最適化（1週間）
1. キャッシュ実装
2. パフォーマンス最適化
3. エラーハンドリング強化

## 8. テスト計画

### 8.1 ユニットテスト

```typescript
describe('ProjectCostCalculator', () => {
  it('現場資産パックのみの場合、人件費は手動入力を使用', async () => {
    const packages = ['asset_management'];
    const manualEntry = { entry_type: 'labor', amount: 500000 };

    const result = await calculateProjectCost(projectId, orgId);

    expect(result.labor.source).toBe('manual');
    expect(result.labor.amount).toBe(500000);
  });

  it('フル機能パックの場合、全て自動計算', async () => {
    const packages = ['asset_management', 'dx_efficiency'];

    const result = await calculateProjectCost(projectId, orgId);

    expect(result.labor.source).toBe('automatic');
    expect(result.tool.source).toBe('automatic');
  });
});
```

### 8.2 統合テスト

各パッケージの組み合わせパターンをテスト：
- 現場資産パックのみ
- 現場DX業務効率化パックのみ
- フル機能統合パック
- パッケージなし（デモモード）

## 9. 監視とアラート

```typescript
// 分析精度のモニタリング
const monitorAnalyticsAccuracy = async () => {
  const metrics = await db.query(`
    SELECT
      organization_id,
      COUNT(CASE WHEN data_sources->>'primary' = 'automatic' THEN 1 END) as automatic_count,
      COUNT(CASE WHEN data_sources->>'primary' = 'manual' THEN 1 END) as manual_count,
      COUNT(CASE WHEN data_sources->>'primary' = 'estimated' THEN 1 END) as estimated_count
    FROM analytics_cache
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY organization_id
  `);

  // 手動入力が多い組織にアップセルの提案
  for (const org of metrics) {
    if (org.manual_count > org.automatic_count) {
      await sendUpgradeRecommendation(org.organization_id);
    }
  }
};
```

## 10. まとめ

この設計により、以下を実現します：

1. **柔軟性**: 契約パッケージに関わらず、利用可能な範囲で最大限の価値を提供
2. **透明性**: データソースと信頼度を明確に表示
3. **成長性**: データ不足を可視化し、アップセルの機会を創出
4. **実用性**: 手動入力と推定値により、部分的なデータでも分析可能

パッケージ間の依存関係による制約を、ユーザー体験を損なうことなく解決し、
段階的な機能拡張を促進する設計となっています。

---

*このドキュメントは分析機能の実装設計を定義しています。*
*実装時は、実際のユーザーフィードバックに基づいて調整を行ってください。*
# AI機能 追加開発仕様書

> **対象**: 基本システム開発完了後の追加機能
> **目的**: 工具管理業務の効率化・盗難防止・ユーザビリティ向上
> **作成日**: 2025-11-29

---

## 📋 採用機能一覧

### 優先度 高（必須）
1. **自然言語検索** - ユーザビリティ劇的向上
2. **異常検知・盗難防止**（GPSなし） - セキュリティ強化

### 優先度 中（推奨）
3. **AI画像認識による工具登録** - 初期データ入力補助
4. **予知保全（校正アラート重視）** - 現場停止を防ぐ

### 優先度 低（オプション）
5. **音声操作** - 補助機能として

---

## 1. 自然言語検索

### 概要
「B現場のドリル」「先月田中さんが借りた工具」などの自然な日本語で工具を検索できる機能。

### 技術スタック
```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "@langchain/openai": "^0.0.10",
    "langchain": "^0.0.200"
  }
}
```

### 実装方法

#### アプローチ1: OpenAI Function Calling（推奨）
```typescript
// app/api/ai/search/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const { query, organizationId } = await request.json();

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `あなたは工具管理システムのアシスタントです。
ユーザーの質問を解析し、適切な検索パラメータを生成してください。
現在の日付: ${new Date().toISOString().split('T')[0]}`
      },
      {
        role: "user",
        content: query
      }
    ],
    functions: [
      {
        name: "search_tools",
        description: "工具を検索する",
        parameters: {
          type: "object",
          properties: {
            location_id: {
              type: "string",
              description: "場所ID（例: A現場、本社倉庫）"
            },
            category: {
              type: "string",
              description: "工具カテゴリ（例: ドリル、サンダー）"
            },
            status: {
              type: "string",
              enum: ["available", "in_use", "under_maintenance", "broken"],
              description: "工具のステータス"
            },
            borrowed_by: {
              type: "string",
              description: "借りた人の名前"
            },
            date_from: {
              type: "string",
              description: "検索開始日（YYYY-MM-DD）"
            },
            date_to: {
              type: "string",
              description: "検索終了日（YYYY-MM-DD）"
            },
            overdue: {
              type: "boolean",
              description: "返却期限超過のみ"
            }
          }
        }
      }
    ],
    function_call: "auto"
  });

  const functionCall = response.choices[0].message.function_call;

  if (functionCall && functionCall.name === "search_tools") {
    const searchParams = JSON.parse(functionCall.arguments);

    // Supabaseで検索実行
    let query = supabase
      .from('tools')
      .select(`
        *,
        current_location:locations(name),
        current_holder:users(name),
        category:categories(name)
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (searchParams.location_id) {
      query = query.eq('current_location_id', searchParams.location_id);
    }
    if (searchParams.category) {
      query = query.ilike('category.name', `%${searchParams.category}%`);
    }
    if (searchParams.status) {
      query = query.eq('status', searchParams.status);
    }
    if (searchParams.borrowed_by) {
      query = query.ilike('current_holder.name', `%${searchParams.borrowed_by}%`);
    }
    if (searchParams.overdue) {
      query = query.lt('expected_return_date', new Date().toISOString());
    }

    const { data: tools, error } = await query;

    return Response.json({
      query: query,
      searchParams,
      results: tools,
      count: tools?.length || 0
    });
  }

  return Response.json({ error: 'No function call generated' }, { status: 400 });
}
```

#### フロントエンド実装
```typescript
// components/NaturalLanguageSearch.tsx
'use client';

import { useState } from 'react';

export default function NaturalLanguageSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);

    const response = await fetch('/api/ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    setResults(data.results);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例: B現場にあるドリルを見せて"
          className="flex-1 px-4 py-2 border rounded-lg"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          {loading ? '検索中...' : '検索'}
        </button>
      </div>

      {/* 検索例を表示 */}
      <div className="text-sm text-gray-600">
        <p>検索例:</p>
        <ul className="list-disc list-inside">
          <li>「A現場にあるドリルを全部見せて」</li>
          <li>「田中さんが借りてる工具」</li>
          <li>「返却期限過ぎてる工具」</li>
          <li>「先月使ったサンダー」</li>
        </ul>
      </div>

      {/* 検索結果 */}
      <div className="space-y-2">
        {results.map((tool) => (
          <div key={tool.id} className="p-4 border rounded-lg">
            <h3 className="font-bold">{tool.name}</h3>
            <p>{tool.tool_code}</p>
            <p className="text-sm text-gray-600">
              場所: {tool.current_location?.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### コスト見積もり
- GPT-4 Turbo: $0.01 / 1K tokens（入力）、$0.03 / 1K tokens（出力）
- 1検索あたり約500トークン = **約1円/検索**
- 月間1,000検索 = **月額約1,000円**

### 精度: 85-95%

---

## 2. 異常検知・盗難防止（GPSなし）

### 概要
工具にGPSを付けずに、行動パターン分析で盗難・紛失を防ぐ。

### 検知ルール

#### ルールベース（AI不要、確実）
```typescript
// lib/anomaly-detection.ts

interface AnomalyRule {
  id: string;
  name: string;
  condition: (event: CheckoutEvent) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'alert' | 'block' | 'require_approval';
  message: string;
}

const anomalyRules: AnomalyRule[] = [
  // 1. 時間異常
  {
    id: 'after_hours_checkout',
    name: '営業時間外の貸出',
    condition: (event) => {
      const hour = new Date(event.timestamp).getHours();
      const day = new Date(event.timestamp).getDay();
      // 平日18時以降、または土日
      return hour >= 18 || hour < 8 || day === 0 || day === 6;
    },
    severity: 'medium',
    action: 'alert',
    message: '営業時間外に工具が貸し出されました'
  },

  // 2. 高額工具
  {
    id: 'high_value_tool',
    name: '高額工具の貸出',
    condition: (event) => {
      return event.tool.purchase_price >= 100000; // 10万円以上
    },
    severity: 'high',
    action: 'require_approval',
    message: '高額工具の貸出には管理者承認が必要です'
  },

  // 3. 長期未返却
  {
    id: 'overdue_30days',
    name: '30日以上未返却',
    condition: (event) => {
      const daysSince = Math.floor(
        (Date.now() - new Date(event.checkout_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSince >= 30 && event.status === 'in_use';
    },
    severity: 'high',
    action: 'alert',
    message: '30日以上返却されていない工具があります'
  },

  // 4. 複数未返却
  {
    id: 'multiple_unreturned',
    name: '複数工具未返却',
    condition: async (event) => {
      const { data: unreturned } = await supabase
        .from('checkouts')
        .select('id')
        .eq('user_id', event.user_id)
        .eq('status', 'in_use');

      return unreturned.length >= 5;
    },
    severity: 'medium',
    action: 'alert',
    message: '同じユーザーが5つ以上の工具を未返却です'
  },

  // 5. 退職予定者
  {
    id: 'departing_employee',
    name: '退職予定者の貸出',
    condition: async (event) => {
      const { data: user } = await supabase
        .from('users')
        .select('departure_date')
        .eq('id', event.user_id)
        .single();

      if (!user?.departure_date) return false;

      const daysUntilDeparture = Math.floor(
        (new Date(user.departure_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return daysUntilDeparture <= 30 && daysUntilDeparture >= 0;
    },
    severity: 'critical',
    action: 'block',
    message: '退職予定者への貸出は禁止されています'
  },

  // 6. 位置異常（スマホGPS）
  {
    id: 'unusual_location',
    name: '異常な場所でのスキャン',
    condition: (event) => {
      // 会社・登録済み現場から100km以上離れた場所
      const allowedLocations = event.organization.locations;
      const scanLocation = event.scan_gps_location;

      const isNearAllowedLocation = allowedLocations.some(loc => {
        const distance = calculateDistance(
          scanLocation.lat,
          scanLocation.lng,
          loc.lat,
          loc.lng
        );
        return distance <= 100; // 100km以内
      });

      return !isNearAllowedLocation;
    },
    severity: 'high',
    action: 'alert',
    message: '登録済み拠点から100km以上離れた場所でスキャンされました'
  },

  // 7. 新規ユーザーの高額貸出
  {
    id: 'new_user_high_value',
    name: '新規ユーザーの高額工具貸出',
    condition: async (event) => {
      const { data: user } = await supabase
        .from('users')
        .select('created_at')
        .eq('id', event.user_id)
        .single();

      const daysSinceRegistration = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      return daysSinceRegistration <= 7 && event.tool.purchase_price >= 50000;
    },
    severity: 'medium',
    action: 'require_approval',
    message: '新規ユーザーによる高額工具貸出には承認が必要です'
  }
];

// 異常検知実行
export async function detectAnomalies(event: CheckoutEvent) {
  const detectedAnomalies = [];

  for (const rule of anomalyRules) {
    const isAnomaly = await rule.condition(event);

    if (isAnomaly) {
      detectedAnomalies.push(rule);

      // アクション実行
      switch (rule.action) {
        case 'block':
          throw new Error(rule.message);

        case 'require_approval':
          await createApprovalRequest(event, rule);
          break;

        case 'alert':
          await sendAlert(event, rule);
          break;

        case 'log':
          await logAnomaly(event, rule);
          break;
      }
    }
  }

  return detectedAnomalies;
}
```

#### AI機械学習による異常検知（高度）
```typescript
// 使用パターンから「普段と違う行動」を検出
// 例: 通常ドリルしか借りない人が突然高額工具を借りる

import { OpenAI } from 'openai';

export async function detectBehaviorAnomaly(event: CheckoutEvent) {
  // ユーザーの過去6ヶ月の貸出履歴を取得
  const { data: history } = await supabase
    .from('checkouts')
    .select('*')
    .eq('user_id', event.user_id)
    .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  const prompt = `
以下のユーザーの工具貸出履歴を分析し、今回の貸出が異常かどうか判定してください。

## 過去の貸出履歴（直近6ヶ月）
${JSON.stringify(history, null, 2)}

## 今回の貸出
${JSON.stringify(event, null, 2)}

## 判定基準
- 通常と異なる時間帯
- 通常と異なる工具カテゴリ
- 通常と異なる金額
- 通常と異なる貸出頻度

異常スコアを0-100で返してください（70以上で警告）。
JSON形式で回答: { "score": 数値, "reason": "理由" }
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0].message.content);

  if (result.score >= 70) {
    await sendAlert({
      type: 'BEHAVIOR_ANOMALY',
      severity: 'medium',
      message: `異常な貸出パターンを検出: ${result.reason}`,
      event
    });
  }

  return result;
}
```

### データベース拡張
```sql
-- 異常検知ログテーブル
CREATE TABLE anomaly_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  checkout_id UUID REFERENCES checkouts(id),
  rule_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- GPS記録（スマホの位置情報）
CREATE TABLE scan_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkout_id UUID REFERENCES checkouts(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy DECIMAL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 承認リクエスト
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  checkout_id UUID REFERENCES checkouts(id),
  requested_by UUID REFERENCES users(id),
  rule_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### コスト見積もり
- ルールベース: **無料**（自前ロジック）
- AI異常検知: 月額5,000円程度（オプション）

### 精度: 80-90%（ルールベース）

---

## 3. AI画像認識による工具登録

### 概要
工具の写真を撮るだけで、メーカー・型番・カテゴリを推測し入力補助する。

### 実装方法
```typescript
// app/api/ai/analyze-tool-image/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const { imageBase64 } = await request.json();

  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `この工具の情報を日本語で教えてください。以下のJSON形式で回答してください。

{
  "suggestions": [
    {
      "manufacturer": "メーカー名",
      "model_number": "型番",
      "category": "カテゴリ（ドリル、サンダー等）",
      "name": "製品名",
      "confidence": 0-100の数値
    }
  ],
  "notes": "追加情報や注意点"
}

複数の候補がある場合は、確信度が高い順に3つまで提示してください。`
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ],
    max_tokens: 500,
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0].message.content);

  return Response.json(result);
}
```

#### フロントエンド実装
```typescript
// components/ToolImageAnalyzer.tsx
'use client';

import { useState } from 'react';

export default function ToolImageAnalyzer({ onSuggestionSelect }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);

    // 画像をBase64に変換
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result?.toString().split(',')[1];

      const response = await fetch('/api/ai/analyze-tool-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });

      const data = await response.json();
      setSuggestions(data.suggestions);
      setAnalyzing(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">工具の写真をアップロード</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageCapture}
          className="mt-1 block w-full"
        />
      </label>

      {analyzing && (
        <div className="text-center py-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">画像を解析中...</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">候補（確信度順）</h3>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionSelect(suggestion)}
              className="w-full p-4 border rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{suggestion.name}</p>
                  <p className="text-sm text-gray-600">
                    {suggestion.manufacturer} - {suggestion.model_number}
                  </p>
                  <p className="text-sm text-gray-500">
                    カテゴリ: {suggestion.category}
                  </p>
                </div>
                <span className="text-sm font-medium text-blue-600">
                  {suggestion.confidence}%
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 精度と制約
- ✅ **高精度（90%以上）**: マキタ、日立、ボッシュなど有名メーカー
- ⚠️ **中精度（70-80%）**: 汎用品、使い古された工具
- ❌ **低精度（50%以下）**: ノーブランド、泥だらけ

### 推奨運用
- 完全自動登録ではなく「候補提示 → ユーザー選択」方式
- 手入力も可能（AIはあくまで補助）

### コスト見積もり
- GPT-4 Vision: $0.01 / image（低解像度）
- 月間100枚登録 = **月額100円**

---

## 4. 予知保全（校正アラート重視）

### 概要
計測器具の校正期限、定期メンテナンス時期を自動通知。

### 実装方法

#### レベル1: ルールベースアラート（確実・推奨）
```typescript
// lib/maintenance-alerts.ts

export async function checkMaintenanceAlerts(organizationId: string) {
  const today = new Date();
  const alerts = [];

  // 1. 校正期限チェック（100%正確）
  const { data: calibrationDue } = await supabase
    .from('tools')
    .select('*')
    .eq('organization_id', organizationId)
    .not('custom_fields->calibration_due_date', 'is', null)
    .lte('custom_fields->calibration_due_date', addDays(today, 30).toISOString())
    .is('deleted_at', null);

  calibrationDue?.forEach(tool => {
    alerts.push({
      type: 'CALIBRATION_DUE',
      severity: 'high',
      tool,
      message: `${tool.name}の校正期限が近づいています（${tool.custom_fields.calibration_due_date}）`,
      dueDate: tool.custom_fields.calibration_due_date
    });
  });

  // 2. 定期メンテナンスチェック
  const { data: maintenanceDue } = await supabase
    .from('tools')
    .select('*')
    .eq('organization_id', organizationId)
    .not('custom_fields->next_maintenance_date', 'is', null)
    .lte('custom_fields->next_maintenance_date', addDays(today, 14).toISOString())
    .is('deleted_at', null);

  maintenanceDue?.forEach(tool => {
    alerts.push({
      type: 'MAINTENANCE_DUE',
      severity: 'medium',
      tool,
      message: `${tool.name}の定期メンテナンス時期です`,
      dueDate: tool.custom_fields.next_maintenance_date
    });
  });

  // 3. 使用回数ベースの推奨メンテナンス
  const { data: highUsageTools } = await supabase
    .from('tools')
    .select(`
      *,
      checkouts:checkouts(count)
    `)
    .eq('organization_id', organizationId)
    .gte('checkouts.count', 50) // 50回以上使用
    .is('deleted_at', null);

  highUsageTools?.forEach(tool => {
    alerts.push({
      type: 'USAGE_BASED_MAINTENANCE',
      severity: 'low',
      tool,
      message: `${tool.name}は${tool.checkouts.count}回使用されています。メンテナンスを推奨します。`,
      usageCount: tool.checkouts.count
    });
  });

  return alerts;
}
```

#### レベル2: AI予測（オプション）
```typescript
// 過去の故障データから予測
export async function predictToolFailure(toolId: string) {
  // 同型の工具の故障履歴を取得
  const { data: tool } = await supabase
    .from('tools')
    .select('*, maintenance_logs(*)')
    .eq('id', toolId)
    .single();

  const { data: similarTools } = await supabase
    .from('tools')
    .select('*, maintenance_logs(*)')
    .eq('model_number', tool.model_number)
    .neq('id', toolId);

  const prompt = `
以下のデータから、この工具がいつ頃メンテナンスが必要になるか予測してください。

## 対象工具
- 型番: ${tool.model_number}
- 購入日: ${tool.purchase_date}
- 使用回数: ${tool.checkout_count}回
- 前回メンテナンス: ${tool.last_maintenance_date}

## 同型の工具の故障履歴
${JSON.stringify(similarTools, null, 2)}

予測結果をJSON形式で返してください:
{
  "predicted_maintenance_date": "YYYY-MM-DD",
  "confidence": 0-100,
  "reason": "予測理由"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### データベース拡張
```sql
-- メンテナンス履歴
CREATE TABLE maintenance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES tools(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  maintenance_type TEXT NOT NULL, -- 'calibration', 'repair', 'routine'
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMP NOT NULL,
  next_maintenance_date DATE,
  cost DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- メンテナンスアラート設定
CREATE TABLE maintenance_alert_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  alert_type TEXT NOT NULL,
  days_before INTEGER NOT NULL,
  notify_users UUID[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 精度
- 校正期限アラート: **100%正確**
- 使用回数ベース: **80%正確**
- AI予測: **50-70%正確**（データ蓄積後）

---

## 5. 音声操作

### 概要
手袋をしたままでも「工具を借りる」「工具を返す」などの操作を音声で実行。

### 実装方法
```typescript
// app/api/ai/voice-command/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;

  // 音声をテキストに変換（Whisper API）
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    language: "ja"
  });

  const spokenText = transcription.text;

  // インテント解析
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `あなたは工具管理システムの音声アシスタントです。
ユーザーの発話から意図を解析し、適切なアクションを返してください。`
      },
      {
        role: "user",
        content: spokenText
      }
    ],
    functions: [
      {
        name: "checkout_tool",
        description: "工具を借りる",
        parameters: {
          type: "object",
          properties: {
            tool_code: { type: "string", description: "工具コード（例: A-0123）" }
          }
        }
      },
      {
        name: "return_tool",
        description: "工具を返す",
        parameters: {
          type: "object",
          properties: {
            tool_code: { type: "string" }
          }
        }
      },
      {
        name: "search_tool",
        description: "工具を探す",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" }
          }
        }
      }
    ],
    function_call: "auto"
  });

  const functionCall = response.choices[0].message.function_call;

  return Response.json({
    transcription: spokenText,
    intent: functionCall?.name,
    parameters: JSON.parse(functionCall?.arguments || '{}')
  });
}
```

#### フロントエンド実装
```typescript
// components/VoiceCommand.tsx
'use client';

import { useState, useRef } from 'react';

export default function VoiceCommand() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      // サーバーに送信
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/ai/voice-command', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setTranscription(data.transcription);

      // インテントに応じてアクション実行
      if (data.intent === 'checkout_tool') {
        // 貸出処理
      } else if (data.intent === 'return_tool') {
        // 返却処理
      }
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="space-y-4">
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        className={`w-full py-8 rounded-lg font-bold text-white ${
          isRecording ? 'bg-red-600' : 'bg-blue-600'
        }`}
      >
        {isRecording ? '録音中... 離すと送信' : '長押しして話す'}
      </button>

      {transcription && (
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">認識結果:</p>
          <p className="font-medium">{transcription}</p>
        </div>
      )}

      <div className="text-sm text-gray-600">
        <p>音声コマンド例:</p>
        <ul className="list-disc list-inside">
          <li>「工具A-0123を借ります」</li>
          <li>「工具A-0123を返します」</li>
          <li>「ドリルを探して」</li>
        </ul>
      </div>
    </div>
  );
}
```

### 精度と制約
- 静かな環境: **90-95%**
- 騒音のある現場: **60-70%**
- 屋外・強風: **使用困難**

### 推奨運用
- メイン操作方法ではなく「補助機能」として
- QRスキャン・手入力も並行して提供

### コスト見積もり
- Whisper API: $0.006 / 分
- 月間500回使用（各10秒） = **月額50円**

---

## 技術スタック まとめ

```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "@langchain/openai": "^0.0.10",
    "langchain": "^0.0.200"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

### 環境変数
```bash
# .env.local
OPENAI_API_KEY=sk-...
```

---

## コスト見積もり まとめ

| 機能 | 月額コスト（目安） | 備考 |
|------|----------------|------|
| 自然言語検索 | 1,000円 | 月間1,000検索想定 |
| 異常検知（ルールベース） | 0円 | 自前ロジック |
| 異常検知（AI） | 5,000円 | オプション |
| AI画像認識 | 100円 | 月間100枚想定 |
| 予知保全（ルールベース） | 0円 | 自前ロジック |
| 予知保全（AI） | 3,000円 | オプション |
| 音声操作 | 50円 | 月間500回想定 |
| **合計（ルールベース）** | **1,150円** | 最小構成 |
| **合計（AI含む）** | **9,150円** | フル機能 |

---

## 開発優先順位

### フェーズ1（基本システム完成後すぐ）
1. **異常検知（ルールベース）** - コスト0円、高い価値
2. **自然言語検索** - 月額1,000円、ユーザビリティ劇的向上

### フェーズ2（運用開始3ヶ月後）
3. **予知保全（校正アラート）** - コスト0円、業務効率化
4. **AI画像認識** - 月額100円、登録作業軽減

### フェーズ3（データ蓄積後）
5. **音声操作** - 月額50円、現場での利便性向上

---

## 次のステップ

1. 基本システム開発完了
2. フェーズ1のAI機能を実装（異常検知・自然言語検索）
3. ユーザーフィードバック収集
4. フェーズ2以降の機能を段階的に追加

---

**作成日**: 2025-11-29
**更新日**: -

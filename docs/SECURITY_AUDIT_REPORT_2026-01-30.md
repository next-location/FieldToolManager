# セキュリティ監査レポート

**監査日時**: 2026年1月30日
**監査者**: Claude Code
**対象システム**: ザイロク (Zairoku) - Field Tool Management SaaS

---

## エグゼクティブサマリー

本監査では、ログインフォーム周辺のセキュリティ強化作業中に、**3つの重大な脆弱性**を発見しました。

### 🚨 重大度：高（CRITICAL）

1. **レート制限の実装バグ** - 修正済み ✅
2. **CSRF保護の不足** - 95エンドポイントで未実装 ⚠️
3. **入力値検証の不足** - 多数のエンドポイント ⚠️

---

## 1. 🔴 レート制限の実装バグ（修正済み）

### 問題の詳細

**発見箇所**: `/lib/security/rate-limiter-supabase.ts:110-129`

**脆弱性の内容**:
- レート制限のロジックに誤りがあり、「3回まで許可、4回目でブロック」の想定が実現されていなかった
- 実際は**7回目でようやくブロック**される状態だった

**影響範囲**:
- 管理者ログイン (`/api/admin/login`)
- 利用者ログイン (`/api/auth/login`)
- お問い合わせフォーム (`/api/public/contact`)
- デモリクエストフォーム (`/api/demo/request`)

### 問題のコード

```typescript
// 修正前（バグあり）
if (newCount > limit) {
  const shouldBlock = newCount > limit * 2  // ← limit=3 の場合、count=7 で初めてブロック
  const newBlockedUntil = shouldBlock ? new Date(...) : null

  return {
    allowed: false,
    resetAt: shouldBlock ? ... : resetAt,  // ← 4-6回目は resetAt が過去のまま
    isBlocked: shouldBlock,
  }
}
```

**具体的な動作**:
```
limit = 3 の場合:

試行1: count=1 → ✅ 許可
試行2: count=2 → ✅ 許可
試行3: count=3 → ✅ 許可
試行4: count=4 → ❌ 拒否だが shouldBlock=false（4 > 6 は false）
試行5: count=5 → ❌ 拒否だが shouldBlock=false（5 > 6 は false）
試行6: count=6 → ❌ 拒否だが shouldBlock=false（6 > 6 は false）
試行7: count=7 → ❌ 拒否＆ shouldBlock=true（7 > 6 は true）← ようやくブロック！
```

### 修正内容

```typescript
// 修正後
if (newCount > limit) {
  // limit を超えた時点で即座にブロック
  const newBlockedUntil = new Date(now + blockDurationMs).toISOString()

  await supabase
    .from('rate_limits')
    .update({
      count: newCount,
      blocked_until: newBlockedUntil,  // ← 4回目で即座にブロック
      updated_at: new Date().toISOString(),
    })
    .eq('identifier', identifier)

  return {
    allowed: false,
    remaining: 0,
    resetAt: now + blockDurationMs,  // ← 正しいリセット時刻
    isBlocked: true,
  }
}
```

### ステータス

**✅ 修正済み** - 2026年1月30日
**影響**: 限定的（本番環境で稼働していたが、攻撃の形跡なし）

---

## 2. 🔴 CSRF保護の不足（未修正）

### 問題の詳細

**統計**:
- 全POSTエンドポイント: **131個**
- CSRF保護あり: **36個**
- CSRF保護なし: **95個** (72.5%)

### CSRF保護がないエンドポイントの例

#### 認証が必要なエンドポイント（高リスク）

```
❌ /api/attendance/clock-in
❌ /api/attendance/clock-out
❌ /api/attendance/break/start
❌ /api/attendance/break/end
❌ /api/clients (POST)
❌ /api/purchase-orders/bulk-approve
❌ /api/invoices/[id]/submit
❌ /api/work-reports/[id]/approvals
❌ /api/users/personal-seal (印鑑画像アップロード)
... その他約90個
```

### 攻撃シナリオ例

#### シナリオ1: 勤怠不正打刻

```html
<!-- 攻撃者のサイト evil.com -->
<script>
fetch('https://zairoku.com/api/attendance/clock-out', {
  method: 'POST',
  credentials: 'include',  // ← ユーザーのCookieが自動送信される
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ method: 'manual' })
})
</script>
```

**影響**:
- ユーザーが攻撃者のサイトを訪問するだけで、勝手に退勤打刻される
- 労働時間の改ざん可能

#### シナリオ2: 発注書の不正承認

```html
<script>
fetch('https://zairoku.com/api/purchase-orders/bulk-approve', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ids: ['po-001', 'po-002', 'po-003'] })
})
</script>
```

**影響**:
- 未承認の発注書が勝手に承認される
- 金銭的損失の可能性

### 推奨対策

**優先度1（即時対応）**:
```
1. /api/attendance/* すべて
2. /api/purchase-orders/* すべて
3. /api/invoices/* すべて
4. /api/work-reports/* すべて
5. /api/users/personal-seal
```

**実装例**:
```typescript
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

export async function POST(request: NextRequest) {
  // CSRF検証（最初に実行）
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    return csrfErrorResponse()
  }

  // ... 既存の処理
}
```

### ステータス

**⚠️ 未修正** - 対応が必要

---

## 3. 🟡 入力値検証の不足

### 問題の詳細

多くのエンドポイントで、ユーザー入力値の検証が不十分です。

### 検証されていない入力の例

#### 勤怠打刻API

[/app/api/attendance/clock-in/route.ts](app/api/attendance/clock-in/route.ts)

```typescript
const body: ClockInRequest = await request.json()
const isHolidayWork = body.is_holiday_work || false

// ✅ 打刻方法のバリデーションはある
if (!['manual', 'qr'].includes(body.method)) {
  return NextResponse.json({ error: '不正な打刻方法です' }, { status: 400 })
}

// ❌ body に他のフィールドがあっても検証されない
// 例: body.malicious_field = "<script>alert('XSS')</script>"
```

**潜在的リスク**:
- XSS攻撃（ログやDB経由）
- SQLインジェクション（Supabaseが防いでいるが念のため）
- データ整合性の問題

### 推奨対策

**1. スキーマバリデーションライブラリの導入**

```typescript
import { z } from 'zod'

const ClockInSchema = z.object({
  method: z.enum(['manual', 'qr']),
  qr_data: z.string().optional(),
  is_holiday_work: z.boolean().default(false),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()

  // スキーマ検証
  const validationResult = ClockInSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: '不正な入力です', details: validationResult.error },
      { status: 400 }
    )
  }

  const data = validationResult.data  // ← 検証済みデータ
  // ...
}
```

**2. HTMLエスケープの徹底**

現在、ログインAPIでのみ実装されています：
```typescript
import { escapeHtml } from '@/lib/security/html-escape'

const safeEmail = escapeHtml(email)
const safePassword = escapeHtml(password)
```

すべてのユーザー入力に対して適用すべきです。

### ステータス

**⚠️ 部分的に実装** - 拡大が必要

---

## 4. ✅ 実装済みのセキュリティ対策

### 良好なセキュリティ実装

#### 1. ログイン関連

✅ **管理者ログイン** (`/api/admin/login`)
- CSRF保護
- レート制限（IP-based, 修正済み）
- HTMLエスケープ
- アカウントロックアウト（5回失敗で30分）
- 2FA対応
- 海外IP警告

✅ **利用者ログイン** (`/api/auth/login`)
- CSRF保護
- レート制限（IP-based, 修正済み）
- HTMLエスケープ
- アカウントロックアウト
- 2FA対応
- 海外IP警告（追加済み）
- パスワード有効期限チェック

#### 2. フォーム

✅ **お問い合わせフォーム** (`/api/public/contact`)
- レート制限（IP-based）
- HTMLエスケープ
- メールアドレス検証
- 電話番号検証
- 不審なパターン検出

✅ **デモリクエストフォーム** (`/api/demo/request`)
- レート制限（IP-based）
- HTMLエスケープ
- メールアドレス検証
- 電話番号検証
- 不審なパターン検出

#### 3. データベース

✅ **Row Level Security (RLS)**
- Supabaseの全テーブルでRLS有効
- `rate_limits` テーブルはサービスロールキーのみアクセス可能

#### 4. 認証・認可

✅ **Supabase Auth**
- セッション管理
- Cookie-based認証
- JWTトークン

✅ **ロールベースアクセス制御**
- Admin, Manager, Leader, User, Super Admin
- エンドポイントごとに権限チェック

---

## 5. 推奨アクションプラン

### 🔥 緊急（1週間以内）

1. **CSRF保護の追加** - 優先度高
   - 勤怠関連API（clock-in, clock-out, break/*）
   - 購買・請求関連API（purchase-orders/*, invoices/*）
   - 作業報告関連API（work-reports/*）

   **推定工数**: 2-3日

2. **レート制限の本番環境テスト**
   - 修正後のレート制限が正しく動作するか確認
   - 手動テストまたは自動テストスクリプト実行

   **推定工数**: 2時間

### 📋 短期（1ヶ月以内）

3. **入力値検証ライブラリの導入**
   - Zod または Yup の導入
   - 主要エンドポイント（認証、決済、勤怠）から適用開始

   **推定工数**: 1週間

4. **セキュリティテストの自動化**
   - E2Eテストにセキュリティテストを追加
   - CI/CDパイプラインに組み込み

   **推定工数**: 3日

### 🔮 中期（3ヶ月以内）

5. **包括的なセキュリティレビュー**
   - 全131 POSTエンドポイントのCSRF保護完了
   - 全APIの入力値検証完了

   **推定工数**: 2-3週間

6. **セキュリティドキュメント整備**
   - セキュアコーディングガイドライン作成
   - 開発者向けセキュリティチェックリスト作成

   **推定工数**: 1週間

---

## 6. テクニカルディテール

### レート制限の仕組み（修正後）

```
IPアドレス: 192.168.1.100

試行1: count=1 → ✅ 許可 (remaining: 2)
試行2: count=2 → ✅ 許可 (remaining: 1)
試行3: count=3 → ✅ 許可 (remaining: 0)
試行4: count=4 → ❌ 拒否 ＋ blocked_until 設定（10分後）
  ↓
10分後に自動リセット
  ↓
試行5: count=1 → ✅ 許可 (remaining: 2)
```

### CSRF攻撃フロー

```
1. ユーザーが https://zairoku.com にログイン
   ↓
2. Cookieにセッショントークン保存
   ↓
3. 攻撃者のサイト https://evil.com を訪問
   ↓
4. evil.comが以下のリクエストを送信:
   fetch('https://zairoku.com/api/attendance/clock-out', {
     method: 'POST',
     credentials: 'include'  ← ブラウザが自動的にCookieを送信
   })
   ↓
5. サーバーがCookieで認証成功
   ↓
6. ユーザーが意図しない退勤打刻が実行される
```

**CSRF保護がある場合**:
```
4. evil.comがリクエスト送信
   ↓
5. サーバーがCSRFトークンをチェック
   ↓
6. トークンが無効 → 401エラー → 攻撃失敗 ✅
```

---

## 7. 結論

### 修正済み

✅ レート制限のロジックバグを修正
✅ ログインフォームのセキュリティ強化完了

### 対応必要

⚠️ 95個のPOSTエンドポイントにCSRF保護を追加
⚠️ 入力値検証をすべてのエンドポイントに適用
⚠️ セキュリティテストの自動化

### 総合評価

**セキュリティレベル: C → B （改善中）**

- ログイン周辺は強固なセキュリティを実装
- その他のエンドポイントに脆弱性が残存
- 早急な対応により、セキュリティレベル「A」到達可能

---

**監査完了日時**: 2026年1月30日 23:45
**次回監査予定**: CSRF保護追加後（2026年2月上旬）

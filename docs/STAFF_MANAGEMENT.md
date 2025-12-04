# スタッフ管理機能 設計書

> **作成日**: 2025-12-04
> **最終更新**: 2025-12-04
> **関連ドキュメント**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md), [SPECIFICATION_SAAS_FINAL.md](./SPECIFICATION_SAAS_FINAL.md)

## 目次
1. [概要](#1-概要)
2. [プラン別スタッフ数上限](#2-プラン別スタッフ数上限)
3. [権限設計](#3-権限設計)
4. [データベース設計](#4-データベース設計)
5. [画面設計とユーザビリティ](#5-画面設計とユーザビリティ)
6. [機能詳細](#6-機能詳細)
7. [出退勤管理への対応](#7-出退勤管理への対応)
8. [追加提案機能](#8-追加提案機能)
9. [実装の優先順位](#9-実装の優先順位)

---

## 1. 概要

### 1.1 背景と目的

**背景**:
- 現在、スタッフ登録はセットアップウィザードでのみ可能
- 運用開始後にスタッフを追加・管理する機能が存在しない
- プラン別の人数制限が未実装
- スタッフの変更履歴（部署移動・権限変更）が記録されていない

**目的**:
- 管理者がスタッフのライフサイクル全体を管理できるようにする
- プラン別の人数上限を設け、適切な課金体系を実現
- 監査ログとして全ての変更履歴を記録
- 将来的な出退勤管理（タイムカード）機能との連携を考慮

### 1.2 スタッフ管理の範囲

**対象ユーザー**:
- 組織内のすべてのスタッフ（staff, leader, admin）
- super_admin（システム管理者）は対象外（データベース直接操作）

**管理対象データ**:
- 基本情報（名前、メール、部署）
- 権限（role）
- アカウント状態（有効/無効）
- ログイン状態（最終ログイン日時）
- 変更履歴（部署移動、権限変更、パスワードリセット等）

**既存機能との関連**:
- 道具移動履歴（`tool_movements.performed_by`）
- 消耗品移動履歴（`consumable_movements.performed_by`）
- 重機移動履歴（`equipment_movements.performed_by`）
- これらはすべて`users.id`に紐づいているため、論理削除されたスタッフの履歴も保持

---

## 2. プラン別スタッフ数上限

### 2.1 上限設定

```typescript
プラン別上限:
- basic: 10人まで（小規模事業者）
- standard: 30人まで（中規模事業者）
- premium: 100人まで（大規模事業者）
- enterprise: 要相談（契約時に個別設定、例: 500人）
```

### 2.2 設定理由

**規模感の根拠**:
- 建設業の現場作業員を含めた組織規模に対応
- 小規模（10人）: 社長 + 事務員 + 現場スタッフ5-8人
- 中規模（30人）: 複数現場を同時進行する企業
- 大規模（100人）: 地域に複数拠点を持つ企業
- エンタープライズ: ゼネコンや全国展開企業

**段階的成長の促進**:
- 小さく始めて成長に合わせてスケール可能
- プランアップグレードのタイミングが明確

### 2.3 上限到達時の挙動

**UI表示**:
```
⚠️ スタッフ数が上限に達しています (10/10人)
プランをアップグレードすると、さらにスタッフを追加できます。

[プランをアップグレード]
```

**制限内容**:
- 「+ スタッフを追加」ボタンが無効化
- CSV一括登録で上限を超える場合、超過分は登録されない
- 既存スタッフの編集・無効化は引き続き可能

---

## 3. 権限設計

### 3.1 ロール別の権限

#### admin（管理者）
**できること**:
- ✅ スタッフの追加・編集・削除
- ✅ 権限の変更（admin以外の権限を付与可能）
- ✅ 部署の変更
- ✅ アカウントの有効化/無効化
- ✅ パスワードの強制リセット
- ✅ スタッフの変更履歴閲覧
- ✅ CSV一括登録

**できないこと**:
- ❌ 自分自身のadmin権限を削除（最低1人のadminが必要）
- ❌ super_adminの作成・編集

#### leader（リーダー）
**できること**:
- ✅ 自分の所属部署のスタッフ一覧の閲覧
- ✅ スタッフの連絡先確認

**できないこと**:
- ❌ スタッフの追加・編集・削除
- ❌ 権限の変更
- ❌ 他部署のスタッフ情報の編集

#### staff（一般スタッフ）
**できること**:
- ✅ 組織内のスタッフ一覧の閲覧（連絡先確認用）

**できないこと**:
- ❌ スタッフの追加・編集・削除
- ❌ 権限の変更
- ❌ 他人の詳細情報の編集

### 3.2 super_adminの扱い

**特別な位置づけ**:
- システム全体を管理する特権ユーザー
- 通常のスタッフ管理UIは使用しない
- データベースに直接アクセスして操作
- 組織をまたいでデータを閲覧可能

**セキュリティ上の理由**:
- super_adminは通常の組織管理者（admin）とは明確に分離
- 誤操作によるシステム全体への影響を防ぐ

---

## 4. データベース設計

### 4.1 usersテーブルの拡張

**追加カラム**:

```sql
-- 既存のusersテーブルに追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT; -- 部署名
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id TEXT; -- 社員番号
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT; -- 電話番号
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true; -- アカウント状態
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP; -- 招待日時
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP; -- 最終ログイン日時
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT; -- パスワードリセットトークン
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP; -- トークン有効期限
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP; -- 一時アクセス用（将来拡張）

-- インデックス追加
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_department ON users(department) WHERE department IS NOT NULL;
CREATE INDEX idx_users_employee_id ON users(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

COMMENT ON COLUMN users.department IS '所属部署（例: 工事部、営業部）';
COMMENT ON COLUMN users.employee_id IS '社員番号（組織内で一意）';
COMMENT ON COLUMN users.phone IS '電話番号（連絡先）';
COMMENT ON COLUMN users.is_active IS 'アカウント有効状態。falseの場合ログイン不可';
COMMENT ON COLUMN users.invited_at IS 'スタッフ招待日時';
COMMENT ON COLUMN users.last_login_at IS '最終ログイン日時（アクティビティ追跡用）';
COMMENT ON COLUMN users.password_reset_token IS 'パスワードリセット用のワンタイムトークン';
COMMENT ON COLUMN users.password_reset_expires_at IS 'パスワードリセットトークンの有効期限';
COMMENT ON COLUMN users.access_expires_at IS '一時アクセス期限（将来の短期スタッフ機能用）';
```

**完全なusersテーブル定義**:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'leader', 'admin', 'super_admin')),
  department TEXT, -- 追加
  is_active BOOLEAN DEFAULT true, -- 追加
  invited_at TIMESTAMP, -- 追加
  last_login_at TIMESTAMP, -- 追加
  password_reset_token TEXT, -- 追加
  password_reset_expires_at TIMESTAMP, -- 追加
  access_expires_at TIMESTAMP, -- 追加（将来拡張用）
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 既存インデックス
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- 新規インデックス
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_department ON users(department) WHERE department IS NOT NULL;
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- RLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### 4.2 user_history テーブル（新規作成）

**目的**:
- スタッフのすべての変更を監査ログとして記録
- 部署移動履歴、権限変更履歴を追跡
- コンプライアンス対応（誰が・いつ・何を変更したか）

**テーブル定義**:

```sql
CREATE TABLE user_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES users(id), -- 変更実行者
  change_type TEXT NOT NULL CHECK (change_type IN (
    'created', 'updated', 'deleted', 'activated', 'deactivated',
    'role_changed', 'department_changed', 'password_reset'
  )),
  old_values JSONB, -- 変更前の値
  new_values JSONB, -- 変更後の値
  notes TEXT, -- メモ
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_history_organization ON user_history(organization_id);
CREATE INDEX idx_user_history_user ON user_history(user_id);
CREATE INDEX idx_user_history_changed_by ON user_history(changed_by);
CREATE INDEX idx_user_history_created_at ON user_history(created_at DESC);
CREATE INDEX idx_user_history_change_type ON user_history(change_type);

-- RLS有効化
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE user_history IS 'スタッフの変更履歴（監査ログ）';
COMMENT ON COLUMN user_history.user_id IS '変更対象のユーザーID';
COMMENT ON COLUMN user_history.changed_by IS '変更を実行したユーザーID';
COMMENT ON COLUMN user_history.change_type IS '変更種別（作成/更新/削除/権限変更など）';
COMMENT ON COLUMN user_history.old_values IS '変更前の値（JSON形式）';
COMMENT ON COLUMN user_history.new_values IS '変更後の値（JSON形式）';
```

**old_values / new_values の例**:

```json
// 部署変更の場合
{
  "old_values": {"department": "工事部"},
  "new_values": {"department": "営業部"}
}

// 権限変更の場合
{
  "old_values": {"role": "staff"},
  "new_values": {"role": "leader"}
}

// アカウント作成の場合
{
  "old_values": null,
  "new_values": {
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "staff",
    "department": "工事部"
  }
}
```

### 4.3 organizationsテーブルの拡張

**プラン別上限の管理**:

```sql
-- 既存カラムを活用（すでに存在）
-- max_users INTEGER DEFAULT 20

-- プラン変更時にmax_usersを更新
UPDATE organizations
SET max_users = 10
WHERE plan = 'basic';

UPDATE organizations
SET max_users = 30
WHERE plan = 'standard';

UPDATE organizations
SET max_users = 100
WHERE plan = 'premium';

-- enterpriseは個別設定（契約時に手動設定）
```

**将来的な拡張（出退勤管理）**:

```sql
-- オプション機能フラグ（将来追加）
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS enable_attendance_tracking BOOLEAN DEFAULT false;

COMMENT ON COLUMN organizations.enable_attendance_tracking IS '出退勤管理機能の有効化フラグ';
```

### 4.4 既存データとの関連性

**履歴データの保持方針**:

```
users テーブル（論理削除）
├── deleted_at IS NOT NULL → 削除済みスタッフ
├── is_active = false → 無効化されたスタッフ
│
└── 過去の履歴データは保持
    ├── tool_movements.performed_by → users.id
    ├── consumable_movements.performed_by → users.id
    ├── equipment_movements.performed_by → users.id
    └── user_history.changed_by → users.id
```

**表示例**:

```typescript
// 削除済みスタッフの履歴表示
"実行者: 山田太郎 (削除済み)"

// 無効化されたスタッフの履歴表示
"実行者: 佐藤花子 (無効)"
```

---

## 5. 画面設計とユーザビリティ

### 5.1 スタッフ管理一覧ページ（`/staff`）

#### URLとアクセス権限

```
URL: /staff
権限: admin（全機能）、leader（閲覧のみ）、staff（閲覧のみ）
```

#### レイアウト構成

```
┌─────────────────────────────────────────────────────────────┐
│ スタッフ管理                    [+ スタッフを追加] [📥 CSV一括登録] │
│ 組織内のスタッフを管理します                                  │
├─────────────────────────────────────────────────────────────┤
│ 📊 利用状況: 8/10人 (Basic プラン)                           │
│ ⚠️ あと2人で上限です。プランアップグレードを検討してください      │
│ [プランをアップグレード]                                      │
├─────────────────────────────────────────────────────────────┤
│ 🔍 検索: [        ] 部署: [全て▼] 権限: [全て▼] 状態: [全て▼]  │
├─────────────────────────────────────────────────────────────┤
│ 名前 ↑↓    メール           部署   権限    状態   最終ログイン    操作        │
├─────────────────────────────────────────────────────────────┤
│ 👤 山田太郎  yamada@example.com  工事部  admin  ✅有効         │
│   2024-12-04 15:30  [編集] [履歴] [無効化]                    │
├─────────────────────────────────────────────────────────────┤
│ 👤 佐藤花子  sato@example.com  営業部  leader  ✅有効          │
│   2024-12-03 09:15  [編集] [履歴] [無効化]                    │
├─────────────────────────────────────────────────────────────┤
│ 👤 鈴木一郎  suzuki@example.com  工事部  staff  ❌無効         │
│   2024-11-20 18:45  [編集] [履歴] [有効化]                    │
├─────────────────────────────────────────────────────────────┤
│ 👤 田中次郎  tanaka@example.com  工事部  staff  ✅有効         │
│   未ログイン  [編集] [履歴] [無効化]                           │
└─────────────────────────────────────────────────────────────┘
```

#### 機能詳細

**1. 利用状況バー**:
```typescript
// 表示ロジック
const activeStaffCount = staffList.filter(s => !s.deleted_at && s.is_active).length
const maxUsers = organization.max_users
const usagePercent = (activeStaffCount / maxUsers) * 100

// 色分け
if (usagePercent >= 100) {
  // 赤色 + 追加ボタン無効化
  className = "bg-red-100 border-red-400 text-red-800"
  addButtonDisabled = true
} else if (usagePercent >= 80) {
  // 黄色 + 警告表示
  className = "bg-yellow-100 border-yellow-400 text-yellow-800"
} else {
  // 青色
  className = "bg-blue-100 border-blue-400 text-blue-800"
}
```

**2. フィルタリング**:
- **検索**: 名前・メールアドレスでリアルタイム検索
- **部署**: 組織内の全部署を動的に取得してドロップダウン表示
- **権限**: admin / leader / staff / 全て
- **状態**: 有効 / 無効 / 全て

**3. ソート**:
- 各カラムヘッダーをクリックで昇順/降順切り替え
- デフォルト: 作成日時降順（新しいスタッフが上）

**4. 操作ボタン**:
- **編集**: スタッフ編集モーダルを開く
- **履歴**: 変更履歴モーダルを開く
- **有効化/無効化**: `is_active`を切り替え（確認ダイアログあり）

#### レスポンシブ対応

**スマホ表示**:
```
┌─────────────────────────┐
│ スタッフ管理             │
│ [+] [📥]                │
├─────────────────────────┤
│ 📊 8/10人 (Basic)       │
├─────────────────────────┤
│ 🔍 [      ] [フィルタ▼] │
├─────────────────────────┤
│ 👤 山田太郎              │
│ yamada@example.com      │
│ 工事部 | admin | ✅有効  │
│ 最終: 2024-12-04 15:30  │
│ [編集] [履歴] [無効化]   │
├─────────────────────────┤
│ 👤 佐藤花子              │
│ ...                     │
└─────────────────────────┘
```

### 5.2 スタッフ追加モーダル

```
┌───────────────────────────────────────────┐
│ 新規スタッフを追加                         │
├───────────────────────────────────────────┤
│ 名前 *           [                      ] │
│                                           │
│ メールアドレス *  [                      ] │
│                                           │
│ 初期パスワード *  [                      ] │
│                  [🔄 ランダム生成]         │
│                  ℹ️ 8文字以上、英数字含む   │
│                                           │
│ 部署             [工事部 ▼]              │
│                  または [新規作成]         │
│                                           │
│ 権限 *           [staff ▼]               │
│                  ℹ️ staff: 一般スタッフ    │
│                  ℹ️ leader: リーダー       │
│                  ℹ️ admin: 管理者         │
│                                           │
│ [✉️ 招待メールを送信する] ✅               │
│                                           │
│           [キャンセル]  [追加する]         │
└───────────────────────────────────────────┘
```

#### バリデーション

```typescript
// クライアント側バリデーション
const validateStaffForm = (data: StaffFormData) => {
  const errors = []

  // 名前
  if (!data.name || data.name.trim().length === 0) {
    errors.push("名前は必須です")
  }

  // メールアドレス
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email)) {
    errors.push("有効なメールアドレスを入力してください")
  }

  // メール重複チェック（API呼び出し）
  const existingUser = await checkEmailExists(data.email)
  if (existingUser) {
    errors.push("このメールアドレスは既に使用されています")
  }

  // パスワード
  if (data.password.length < 8) {
    errors.push("パスワードは8文字以上である必要があります")
  }
  if (!/[a-zA-Z]/.test(data.password) || !/[0-9]/.test(data.password)) {
    errors.push("パスワードは英字と数字を含む必要があります")
  }

  // プラン上限チェック
  const currentCount = await getActiveStaffCount()
  const maxUsers = organization.max_users
  if (currentCount >= maxUsers) {
    errors.push(`プランの上限（${maxUsers}人）に達しています。プランをアップグレードしてください。`)
  }

  return errors
}
```

#### ランダムパスワード生成

```typescript
const generateRandomPassword = (): string => {
  const length = 12
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%"
  let password = ""

  // 必ず英字・数字・記号を含める
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]
  password += "0123456789"[Math.floor(Math.random() * 10)]
  password += "!@#$%"[Math.floor(Math.random() * 5)]

  // 残りをランダム生成
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }

  // シャッフル
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
```

### 5.3 スタッフ編集モーダル

```
┌───────────────────────────────────────────┐
│ スタッフ情報を編集: 山田太郎               │
├───────────────────────────────────────────┤
│ 名前 *           [山田太郎              ]  │
│                                           │
│ メールアドレス *  [yamada@example.com    ]  │
│                                           │
│ 部署             [工事部 ▼]  → [営業部 ▼] │
│                  ⚠️ 部署変更は履歴に記録されます │
│                                           │
│ 権限 *           [admin ▼]                │
│                  ⚠️ 権限変更は履歴に記録されます │
│                  ⚠️ 最低1人のadminが必要です   │
│                                           │
│ アカウント状態:   ✅ 有効                  │
│ 最終ログイン:     2024-12-04 15:30        │
│ 登録日時:        2024-01-15 10:00        │
│                                           │
│ [🔑 パスワードリセットリンクを送信]        │
│                                           │
│           [キャンセル]  [保存する]         │
└───────────────────────────────────────────┘
```

#### 変更検知と履歴記録

```typescript
const handleStaffUpdate = async (userId: string, newData: StaffUpdateData, oldData: StaffData) => {
  const changes = []

  // 部署変更を検知
  if (newData.department !== oldData.department) {
    changes.push({
      change_type: 'department_changed',
      old_values: { department: oldData.department },
      new_values: { department: newData.department }
    })
  }

  // 権限変更を検知
  if (newData.role !== oldData.role) {
    changes.push({
      change_type: 'role_changed',
      old_values: { role: oldData.role },
      new_values: { role: newData.role }
    })
  }

  // users テーブルを更新
  await supabase.from('users').update(newData).eq('id', userId)

  // user_history に記録
  for (const change of changes) {
    await supabase.from('user_history').insert({
      organization_id: currentUser.organization_id,
      user_id: userId,
      changed_by: currentUser.id,
      ...change
    })
  }
}
```

#### admin権限削除の防止

```typescript
// 最低1人のadminが必要
const canRemoveAdminRole = async (userId: string): Promise<boolean> => {
  const { data: adminCount } = await supabase
    .from('users')
    .select('id', { count: 'exact' })
    .eq('organization_id', currentUser.organization_id)
    .eq('role', 'admin')
    .is('deleted_at', null)
    .eq('is_active', true)

  // 2人以上のadminがいれば削除可能
  return (adminCount?.length || 0) > 1
}
```

### 5.4 スタッフ変更履歴モーダル

```
┌───────────────────────────────────────────┐
│ 変更履歴: 山田太郎                         │
├───────────────────────────────────────────┤
│ 📅 2024-12-04 14:00                       │
│ 👤 変更者: 管理者 (admin@example.com)     │
│ 📝 種別: 部署変更                          │
│    工事部 → 営業部                         │
│                                           │
│ 📅 2024-11-20 09:30                       │
│ 👤 変更者: 管理者 (admin@example.com)     │
│ 📝 種別: 権限変更                          │
│    staff → leader                         │
│                                           │
│ 📅 2024-11-15 16:45                       │
│ 👤 変更者: 山田太郎 (本人)                 │
│ 📝 種別: パスワードリセット                 │
│                                           │
│ 📅 2024-01-15 10:00                       │
│ 👤 変更者: システム                        │
│ 📝 種別: アカウント作成                    │
│                                           │
│                      [閉じる]              │
└───────────────────────────────────────────┘
```

#### データ取得と表示

```typescript
const fetchUserHistory = async (userId: string) => {
  const { data: history } = await supabase
    .from('user_history')
    .select(`
      *,
      changed_by_user:users!user_history_changed_by_fkey(name, email)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return history
}

// 変更種別の日本語表示
const changeTypeLabels = {
  created: 'アカウント作成',
  updated: '情報更新',
  deleted: 'アカウント削除',
  activated: 'アカウント有効化',
  deactivated: 'アカウント無効化',
  role_changed: '権限変更',
  department_changed: '部署変更',
  password_reset: 'パスワードリセット'
}
```

### 5.5 CSV一括登録機能

```
┌───────────────────────────────────────────┐
│ スタッフ一括登録                           │
├───────────────────────────────────────────┤
│ CSVファイルをアップロードして、複数のスタッフを │
│ 一度に登録できます。                       │
│                                           │
│ 📥 [CSVテンプレートをダウンロード]          │
│                                           │
│ CSVファイル形式:                           │
│ name,email,password,department,role       │
│ 山田太郎,yamada@...,Pass1234,工事部,staff  │
│                                           │
│ [ファイルを選択] staff_import.csv          │
│                                           │
│ プレビュー (5件):                          │
│ ✅ 山田太郎 (yamada@...) - 工事部 - staff  │
│ ✅ 佐藤花子 (sato@...) - 営業部 - leader   │
│ ❌ 鈴木一郎 (suzuki@...) - エラー: メール重複 │
│ ✅ 田中次郎 (tanaka@...) - 工事部 - staff  │
│ ⚠️ 高橋三郎 (takahashi@...) - 警告: プラン上限│
│                                           │
│ 登録可能: 3件 / エラー: 1件 / 警告: 1件     │
│                                           │
│           [キャンセル]  [登録する]         │
└───────────────────────────────────────────┘
```

#### CSVテンプレート

```csv
name,email,password,department,role
山田太郎,yamada@example.com,TempPass123,工事部,staff
佐藤花子,sato@example.com,TempPass456,営業部,leader
```

#### CSV解析とバリデーション

```typescript
const parseAndValidateCSV = async (file: File) => {
  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',')

  const results = []
  const currentCount = await getActiveStaffCount()
  let validCount = 0

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const row = {
      name: values[0]?.trim(),
      email: values[1]?.trim(),
      password: values[2]?.trim(),
      department: values[3]?.trim(),
      role: values[4]?.trim()
    }

    const errors = []

    // バリデーション
    if (!row.name) errors.push("名前が空です")
    if (!row.email || !emailRegex.test(row.email)) errors.push("メールアドレスが無効です")

    // メール重複チェック
    const exists = await checkEmailExists(row.email)
    if (exists) errors.push("メールアドレスが重複しています")

    // プラン上限チェック
    if (currentCount + validCount + 1 > organization.max_users) {
      errors.push("プラン上限を超えます")
    }

    results.push({
      row,
      valid: errors.length === 0,
      errors
    })

    if (errors.length === 0) validCount++
  }

  return { results, validCount }
}
```

---

## 6. 機能詳細

### 6.1 基本機能

#### 1. スタッフ一覧表示

**機能**:
- 組織内の全スタッフを一覧表示
- 検索・フィルタリング・ソート機能
- ページネーション（50件/ページ）

**実装**:
```typescript
// API: /api/staff/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const department = searchParams.get('department')
  const role = searchParams.get('role')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 50
  const offset = (page - 1) * limit

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .eq('organization_id', currentUser.organization_id)

  // フィルタリング
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (department && department !== 'all') {
    query = query.eq('department', department)
  }
  if (role && role !== 'all') {
    query = query.eq('role', role)
  }
  if (status === 'active') {
    query = query.is('deleted_at', null).eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  // ページネーション
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  return NextResponse.json({ data, count, page, limit })
}
```

#### 2. スタッフ追加（単体）

**機能**:
- フォームから1人ずつスタッフを追加
- プラン上限チェック
- 招待メール送信（オプション）

**実装**:
```typescript
// API: /api/staff/route.ts
export async function POST(request: Request) {
  const body = await request.json()
  const { name, email, password, department, role, sendInvite } = body

  // プラン上限チェック
  const { data: org } = await supabase
    .from('organizations')
    .select('max_users')
    .eq('id', currentUser.organization_id)
    .single()

  const { count: currentCount } = await supabase
    .from('users')
    .select('id', { count: 'exact' })
    .eq('organization_id', currentUser.organization_id)
    .is('deleted_at', null)
    .eq('is_active', true)

  if (currentCount >= org.max_users) {
    return NextResponse.json(
      { error: 'プランの上限に達しています' },
      { status: 400 }
    )
  }

  // Supabase Authでユーザー作成
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) throw authError

  // usersテーブルに登録
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      id: authUser.user.id,
      organization_id: currentUser.organization_id,
      name,
      email,
      role,
      department,
      is_active: true,
      invited_at: new Date().toISOString()
    })
    .select()
    .single()

  // 履歴記録
  await supabase.from('user_history').insert({
    organization_id: currentUser.organization_id,
    user_id: newUser.id,
    changed_by: currentUser.id,
    change_type: 'created',
    old_values: null,
    new_values: { name, email, role, department }
  })

  // 招待メール送信
  if (sendInvite) {
    await sendInvitationEmail(email, password, currentUser.organization_id)
  }

  return NextResponse.json({ data: newUser })
}
```

#### 3. スタッフ編集

**機能**:
- 基本情報の編集（名前、メール、部署、権限）
- 変更履歴の自動記録
- admin権限削除の防止

**実装**:
```typescript
// API: /api/staff/[id]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const userId = params.id

  // 既存データ取得
  const { data: oldData } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  // admin権限削除チェック
  if (oldData.role === 'admin' && body.role !== 'admin') {
    const canRemove = await canRemoveAdminRole(userId)
    if (!canRemove) {
      return NextResponse.json(
        { error: '最低1人のadminが必要です' },
        { status: 400 }
      )
    }
  }

  // 更新
  const { data: newData, error } = await supabase
    .from('users')
    .update({
      name: body.name,
      email: body.email,
      department: body.department,
      role: body.role,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error

  // 変更履歴記録
  const changes = []
  if (oldData.department !== body.department) {
    changes.push({
      change_type: 'department_changed',
      old_values: { department: oldData.department },
      new_values: { department: body.department }
    })
  }
  if (oldData.role !== body.role) {
    changes.push({
      change_type: 'role_changed',
      old_values: { role: oldData.role },
      new_values: { role: body.role }
    })
  }

  for (const change of changes) {
    await supabase.from('user_history').insert({
      organization_id: currentUser.organization_id,
      user_id: userId,
      changed_by: currentUser.id,
      ...change
    })
  }

  return NextResponse.json({ data: newData })
}
```

#### 4. アカウント有効化/無効化

**機能**:
- `is_active`フラグの切り替え
- 無効化されたスタッフはログイン不可
- 履歴記録

**実装**:
```typescript
// API: /api/staff/[id]/toggle-active/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = params.id

  // 現在の状態取得
  const { data: user } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', userId)
    .single()

  const newStatus = !user.is_active

  // 更新
  await supabase
    .from('users')
    .update({ is_active: newStatus })
    .eq('id', userId)

  // 履歴記録
  await supabase.from('user_history').insert({
    organization_id: currentUser.organization_id,
    user_id: userId,
    changed_by: currentUser.id,
    change_type: newStatus ? 'activated' : 'deactivated',
    old_values: { is_active: user.is_active },
    new_values: { is_active: newStatus }
  })

  return NextResponse.json({ success: true, is_active: newStatus })
}
```

#### 5. 論理削除

**機能**:
- `deleted_at`に日時を設定
- 過去の履歴データは保持
- 削除確認ダイアログ

**実装**:
```typescript
// API: /api/staff/[id]/route.ts
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = params.id

  // admin削除チェック
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (user.role === 'admin') {
    const canDelete = await canRemoveAdminRole(userId)
    if (!canDelete) {
      return NextResponse.json(
        { error: '最低1人のadminが必要です' },
        { status: 400 }
      )
    }
  }

  // 論理削除
  await supabase
    .from('users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', userId)

  // 履歴記録
  await supabase.from('user_history').insert({
    organization_id: currentUser.organization_id,
    user_id: userId,
    changed_by: currentUser.id,
    change_type: 'deleted',
    old_values: null,
    new_values: null
  })

  return NextResponse.json({ success: true })
}
```

### 6.2 管理機能

#### 6. パスワードリセット

**機能**:
- 管理者がスタッフのパスワードをリセット
- トークン付きリンクをメール送信
- トークンの有効期限（24時間）

**実装**:
```typescript
// API: /api/staff/[id]/password-reset/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = params.id

  // ランダムトークン生成
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後

  // トークン保存
  await supabase
    .from('users')
    .update({
      password_reset_token: token,
      password_reset_expires_at: expiresAt.toISOString()
    })
    .eq('id', userId)

  // メール送信
  const { data: user } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .single()

  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
  await sendPasswordResetEmail(user.email, user.name, resetLink)

  // 履歴記録
  await supabase.from('user_history').insert({
    organization_id: currentUser.organization_id,
    user_id: userId,
    changed_by: currentUser.id,
    change_type: 'password_reset',
    old_values: null,
    new_values: null
  })

  return NextResponse.json({ success: true })
}
```

#### 7. CSV一括登録

**機能**:
- CSVファイルから複数スタッフを一括登録
- プレビュー表示
- バリデーション
- プラン上限チェック

**実装**:
```typescript
// API: /api/staff/bulk-import/route.ts
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  // CSV解析
  const text = await file.text()
  const rows = parseCSV(text)

  // バリデーション
  const validationResults = await validateStaffRows(rows)

  // 登録可能な行のみ処理
  const validRows = validationResults.filter(r => r.valid).map(r => r.row)

  // トランザクション的に処理
  const results = []
  for (const row of validRows) {
    try {
      // Supabase Authでユーザー作成
      const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
        email: row.email,
        password: row.password,
        email_confirm: true
      })

      // usersテーブルに登録
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          organization_id: currentUser.organization_id,
          name: row.name,
          email: row.email,
          role: row.role,
          department: row.department,
          is_active: true,
          invited_at: new Date().toISOString()
        })
        .select()
        .single()

      // 履歴記録
      await supabase.from('user_history').insert({
        organization_id: currentUser.organization_id,
        user_id: newUser.id,
        changed_by: currentUser.id,
        change_type: 'created',
        old_values: null,
        new_values: { name: row.name, email: row.email, role: row.role, department: row.department }
      })

      results.push({ success: true, email: row.email })
    } catch (error) {
      results.push({ success: false, email: row.email, error: error.message })
    }
  }

  return NextResponse.json({ results })
}
```

#### 8. プラン上限アラート

**機能**:
- 利用状況の可視化
- 上限80%で警告表示
- 上限100%で追加ボタン無効化
- プランアップグレード誘導

**実装**:
```typescript
// Component: StaffUsageAlert.tsx
export function StaffUsageAlert() {
  const { data: usage } = useSWR('/api/staff/usage', fetcher)

  if (!usage) return null

  const percent = (usage.current / usage.max) * 100

  if (percent >= 100) {
    return (
      <div className="bg-red-100 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-800 font-medium">
              ⚠️ スタッフ数が上限に達しています ({usage.current}/{usage.max}人)
            </p>
            <p className="text-red-700 text-sm mt-1">
              新しいスタッフを追加するには、プランをアップグレードしてください。
            </p>
          </div>
          <Link
            href="/settings/billing"
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            プランをアップグレード
          </Link>
        </div>
      </div>
    )
  }

  if (percent >= 80) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-yellow-800">
          ⚠️ あと{usage.max - usage.current}人で上限です。プランアップグレードを検討してください。
        </p>
      </div>
    )
  }

  return (
    <div className="bg-blue-100 border-l-4 border-blue-400 p-4 mb-6">
      <p className="text-blue-800">
        📊 利用状況: {usage.current}/{usage.max}人 ({usage.plan}プラン)
      </p>
    </div>
  )
}
```

### 6.3 検索・フィルタリング

#### 9. 高度な検索機能

**機能**:
- リアルタイム検索（名前・メール）
- 部署フィルタ（動的取得）
- 権限フィルタ
- 状態フィルタ（有効/無効）

**実装**:
```typescript
// Component: StaffFilters.tsx
export function StaffFilters() {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('all')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')

  // 部署一覧を取得（動的）
  const { data: departments } = useSWR('/api/departments', fetcher)

  // デバウンス検索
  const debouncedSearch = useDebounce(search, 300)

  // URLパラメータ更新
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (department !== 'all') params.set('department', department)
    if (role !== 'all') params.set('role', role)
    if (status !== 'all') params.set('status', status)

    router.push(`/staff?${params.toString()}`)
  }, [debouncedSearch, department, role, status])

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="🔍 名前・メールで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        />

        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">全ての部署</option>
          {departments?.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">全ての権限</option>
          <option value="admin">管理者</option>
          <option value="leader">リーダー</option>
          <option value="staff">一般スタッフ</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">全ての状態</option>
          <option value="active">有効</option>
          <option value="inactive">無効</option>
        </select>
      </div>
    </div>
  )
}
```

---

## 7. 出退勤管理への対応

### 7.1 将来的な拡張性

**設計方針**:
- スタッフ管理は出退勤管理の基盤となる
- `user_id`を主キーとして、すべての機能で統一
- 出退勤機能は**オプション機能**として追加課金

### 7.2 データベース設計（将来実装）

```sql
-- 将来的に追加するテーブル（現時点では未実装）
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clock_in_at TIMESTAMP NOT NULL,
  clock_out_at TIMESTAMP,
  location_type TEXT CHECK (location_type IN ('site', 'warehouse', 'office', 'remote')),
  site_id UUID REFERENCES sites(id),
  warehouse_location_id UUID REFERENCES warehouse_locations(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attendance_organization ON attendance_records(organization_id);
CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_attendance_clock_in ON attendance_records(clock_in_at DESC);
CREATE INDEX idx_attendance_site ON attendance_records(site_id) WHERE site_id IS NOT NULL;

-- RLS有効化
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE attendance_records IS '出退勤記録（タイムカード）';
COMMENT ON COLUMN attendance_records.clock_in_at IS '出勤時刻';
COMMENT ON COLUMN attendance_records.clock_out_at IS '退勤時刻（NULL=まだ退勤していない）';
COMMENT ON COLUMN attendance_records.location_type IS '勤務場所タイプ';
COMMENT ON COLUMN attendance_records.site_id IS '現場ID（現場勤務の場合）';
```

### 7.3 組織設定への追加

**organizationsテーブルに機能フラグ追加**:

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS enable_attendance_tracking BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS attendance_addon_enabled_at TIMESTAMP;

COMMENT ON COLUMN organizations.enable_attendance_tracking IS '出退勤管理機能の有効化フラグ';
COMMENT ON COLUMN organizations.attendance_addon_enabled_at IS '出退勤管理アドオン有効化日時';
```

### 7.4 設定画面での表示イメージ

```
┌───────────────────────────────────────────┐
│ オプション機能                             │
├───────────────────────────────────────────┤
│ ⏰ 出退勤管理（タイムカード）               │
│ [  ] 出退勤管理を有効にする                 │
│ ℹ️ スタッフの勤怠を記録・管理できます       │
│ 💰 月額: +5,000円/組織                     │
│                                           │
│ 主な機能:                                  │
│ • スマホでワンタップ出退勤打刻              │
│ • 現場別・日別の勤務時間集計                │
│ • 残業時間の自動計算                       │
│ • 月次勤怠レポート（CSVエクスポート）       │
│                                           │
│ [機能を追加する]                           │
└───────────────────────────────────────────┘
```

### 7.5 usersテーブルとの連携

**既存のスタッフ情報を活用**:
```typescript
// 出退勤記録作成時
const clockIn = async (userId: string, siteId?: string) => {
  // usersテーブルからスタッフ情報を取得
  const { data: user } = await supabase
    .from('users')
    .select('id, name, department')
    .eq('id', userId)
    .single()

  // 出勤記録作成
  await supabase.from('attendance_records').insert({
    organization_id: user.organization_id,
    user_id: user.id,
    clock_in_at: new Date().toISOString(),
    location_type: siteId ? 'site' : 'warehouse',
    site_id: siteId
  })
}
```

---

## 8. 追加提案機能

### 8.1 スタッフ活動サマリー

**目的**: スタッフの活動状況を可視化し、管理者が適切な人員配置を判断できるようにする

**表示内容**:
```
┌───────────────────────────────────────────┐
│ 山田太郎の活動サマリー（直近30日）          │
├───────────────────────────────────────────┤
│ 📦 道具移動: 45件                          │
│ 🏗️ 現場アクセス: 8箇所                     │
│ 📋 消耗品発注: 12件                        │
│ ⚠️ 低在庫アラート対応: 3件                 │
│ 🔧 メンテナンス登録: 2件                   │
│                                           │
│ 最もアクティブな時間帯: 9:00-10:00         │
│ よく使う現場: 新宿プロジェクト(15回)        │
│                                           │
│ [詳細レポートを見る]                       │
└───────────────────────────────────────────┘
```

**実装例**:
```typescript
// API: /api/staff/[id]/activity-summary/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = params.id
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // 道具移動件数
  const { count: toolMovements } = await supabase
    .from('tool_movements')
    .select('id', { count: 'exact' })
    .eq('performed_by', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // 現場アクセス数
  const { data: sites } = await supabase
    .from('tool_movements')
    .select('to_site_id')
    .eq('performed_by', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .not('to_site_id', 'is', null)

  const uniqueSites = new Set(sites?.map(s => s.to_site_id)).size

  // 消耗品発注件数
  const { count: consumableOrders } = await supabase
    .from('consumable_orders')
    .select('id', { count: 'exact' })
    .eq('created_by', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  return NextResponse.json({
    toolMovements,
    uniqueSites,
    consumableOrders
  })
}
```

### 8.2 部署別ダッシュボード

**目的**: 部署単位での活動状況を把握し、リソース配分を最適化

**表示内容**:
```
┌───────────────────────────────────────────┐
│ 部署別サマリー                             │
├───────────────────────────────────────────┤
│ 工事部 (5人)                              │
│  ├ 今月の移動件数: 120件                   │
│  ├ アクティブ率: 95% (週1回以上ログイン)   │
│  └ 担当現場: 3箇所                         │
│                                           │
│ 営業部 (3人)                              │
│  ├ 今月の移動件数: 20件                    │
│  ├ アクティブ率: 67%                       │
│  └ 担当現場: 1箇所                         │
│                                           │
│ [部署別レポートをダウンロード]             │
└───────────────────────────────────────────┘
```

### 8.3 ロール別権限マトリックス表示

**目的**: 管理者が権限の違いを一目で理解できるようにする

**表示内容**:
```
┌───────────────────────────────────────────┐
│ 権限マトリックス                           │
├───────────────────────────────────────────┤
│ 機能                  admin  leader  staff│
├───────────────────────────────────────────┤
│ スタッフ管理           ✅     ❌      ❌   │
│ 道具マスタ編集         ✅     ✅      ❌   │
│ 道具移動登録           ✅     ✅      ✅   │
│ 発注処理              ✅     ✅      ❌   │
│ 契約・請求閲覧         ✅     ❌      ❌   │
│ 組織設定変更           ✅     ❌      ❌   │
│ レポートダウンロード    ✅     ✅      ❌   │
└───────────────────────────────────────────┘
```

**実装**:
```typescript
// Component: RolePermissionMatrix.tsx
const permissions = [
  { feature: 'スタッフ管理', admin: true, leader: false, staff: false },
  { feature: '道具マスタ編集', admin: true, leader: true, staff: false },
  { feature: '道具移動登録', admin: true, leader: true, staff: true },
  { feature: '発注処理', admin: true, leader: true, staff: false },
  { feature: '契約・請求閲覧', admin: true, leader: false, staff: false },
  { feature: '組織設定変更', admin: true, leader: false, staff: false },
  { feature: 'レポートダウンロード', admin: true, leader: true, staff: false }
]

export function RolePermissionMatrix() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4">権限マトリックス</h3>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">機能</th>
            <th className="text-center py-2">admin</th>
            <th className="text-center py-2">leader</th>
            <th className="text-center py-2">staff</th>
          </tr>
        </thead>
        <tbody>
          {permissions.map((perm) => (
            <tr key={perm.feature} className="border-b">
              <td className="py-2">{perm.feature}</td>
              <td className="text-center">{perm.admin ? '✅' : '❌'}</td>
              <td className="text-center">{perm.leader ? '✅' : '❌'}</td>
              <td className="text-center">{perm.staff ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### 8.4 スタッフ招待リンク機能

**目的**: パスワードを管理者が設定せず、スタッフ自身に初回ログイン時に設定させる

**フロー**:
```
1. 管理者がメールアドレスのみで招待
2. システムが招待リンク付きメールを自動送信
3. スタッフがリンクをクリック
4. 初回ログイン時に自分でパスワード設定
5. アカウント有効化完了
```

**実装例**:
```typescript
// API: /api/staff/invite/route.ts
export async function POST(request: Request) {
  const { email, name, role, department } = await request.json()

  // 招待トークン生成
  const inviteToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日間有効

  // 仮ユーザー作成（パスワードなし）
  const { data: user } = await supabase
    .from('users')
    .insert({
      organization_id: currentUser.organization_id,
      email,
      name,
      role,
      department,
      is_active: false, // 初回ログインまで無効
      invited_at: new Date().toISOString(),
      password_reset_token: inviteToken,
      password_reset_expires_at: expiresAt.toISOString()
    })
    .select()
    .single()

  // 招待メール送信
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${inviteToken}`
  await sendInviteEmail(email, name, inviteLink)

  return NextResponse.json({ success: true })
}

// 招待受諾ページ: /accept-invite
export default function AcceptInvitePage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      alert('パスワードが一致しません')
      return
    }

    // Supabase Authユーザー作成
    const { data: authUser } = await supabase.auth.signUp({
      email: invite.email,
      password
    })

    // usersテーブル更新
    await supabase
      .from('users')
      .update({
        id: authUser.user.id,
        is_active: true,
        password_reset_token: null,
        password_reset_expires_at: null
      })
      .eq('email', invite.email)

    router.push('/login')
  }

  return (
    <div>
      <h1>アカウント設定</h1>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
      <button onClick={handleSubmit}>登録完了</button>
    </div>
  )
}
```

### 8.5 一時アクセス権限

**目的**: 短期のアルバイトや外部協力者に期限付きアクセスを付与

**データベース**:
```sql
-- すでに追加済み
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP;
```

**UI表示**:
```
┌───────────────────────────────────────────┐
│ 一時スタッフ登録                           │
├───────────────────────────────────────────┤
│ このアカウントは期限付きで、指定日時に自動的に │
│ 無効化されます。                           │
│                                           │
│ アクセス期限: [2024-12-31 23:59] 📅       │
│                                           │
│ [✅ 期限後に自動削除する]                  │
│                                           │
│           [キャンセル]  [登録する]         │
└───────────────────────────────────────────┘
```

**自動無効化処理**:
```typescript
// Cron Job: /api/cron/expire-temporary-access/route.ts
export async function POST(request: NextRequest) {
  const now = new Date().toISOString()

  // 期限切れアカウントを無効化
  const { data: expiredUsers } = await supabase
    .from('users')
    .select('id, name, email')
    .not('access_expires_at', 'is', null)
    .lt('access_expires_at', now)
    .eq('is_active', true)

  for (const user of expiredUsers || []) {
    await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', user.id)

    // 履歴記録
    await supabase.from('user_history').insert({
      organization_id: user.organization_id,
      user_id: user.id,
      changed_by: null, // システム自動処理
      change_type: 'deactivated',
      old_values: { is_active: true },
      new_values: { is_active: false },
      notes: '一時アクセス期限切れによる自動無効化'
    })

    // 通知メール送信
    await sendAccessExpiredEmail(user.email, user.name)
  }

  return NextResponse.json({ success: true, expired: expiredUsers?.length })
}
```

---

## 9. 実装の優先順位

### Phase 1: 基本機能（最優先）

**目標**: 基本的なスタッフ管理機能を実装

1. ✅ **データベーススキーマ作成**
   - `users`テーブルのカラム追加
   - `user_history`テーブル作成
   - マイグレーション実行

2. ✅ **スタッフ一覧ページ**
   - `/staff`ルート作成
   - 一覧表示UI
   - 権限チェック（admin/leader/staff）

3. ✅ **スタッフ追加（単体）**
   - 追加モーダル
   - フォームバリデーション
   - Supabase Auth連携

4. ✅ **スタッフ編集**
   - 編集モーダル
   - 変更検知
   - 履歴記録

5. ✅ **論理削除**
   - 削除確認ダイアログ
   - `deleted_at`設定
   - admin権限削除防止

6. ✅ **アカウント有効化/無効化**
   - `is_active`トグル
   - ログイン制御
   - 履歴記録

7. ✅ **プラン上限チェック**
   - 上限取得API
   - 利用状況表示
   - 追加ボタン制御

### Phase 2: 管理機能

**目標**: 管理者の業務効率を向上

8. ✅ **変更履歴表示**
   - 履歴モーダル
   - 時系列表示
   - 変更者情報

9. ✅ **パスワードリセット**
   - リセットリンク生成
   - メール送信
   - トークン検証

10. ✅ **検索・フィルタリング**
    - リアルタイム検索
    - 部署フィルタ
    - 権限フィルタ
    - 状態フィルタ

11. ✅ **部署管理との連携**
    - 部署一覧取得
    - 部署ごとのスタッフ数表示

### Phase 3: 効率化機能

**目標**: 大量スタッフの管理を効率化

12. ✅ **CSV一括登録**
    - CSVテンプレート
    - パース処理
    - バリデーション
    - プレビュー表示

13. ✅ **利用状況アラート**
    - 80%警告
    - 100%上限表示
    - プランアップグレード誘導

14. ✅ **権限マトリックス表示**
    - 権限一覧表
    - ツールチップ説明

### Phase 4: 拡張機能（将来）

**目標**: ユーザビリティの向上と高度な機能

15. ⏳ **スタッフ活動サマリー**
    - 移動件数集計
    - 現場アクセス分析
    - アクティビティ可視化

16. ⏳ **招待リンク機能**
    - トークン生成
    - 招待メール
    - 初回パスワード設定

17. ⏳ **一時アクセス権限**
    - 期限設定
    - 自動無効化
    - 期限切れ通知

18. ⏳ **出退勤管理（オプション機能）**
    - `attendance_records`テーブル
    - 打刻UI
    - 勤怠レポート

---

## まとめ

本設計書は、スタッフ管理機能の完全な実装ガイドです。

**重要なポイント**:
1. ✅ プラン別の人数上限を設定し、適切な課金体系を実現
2. ✅ 権限（admin/leader/staff）に基づいた適切なアクセス制御
3. ✅ すべての変更を`user_history`に記録し、監査ログとして活用
4. ✅ 論理削除により過去の履歴データを保持
5. ✅ 将来的な出退勤管理機能との連携を考慮した設計

**次のステップ**:
1. [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)の更新
2. [MIGRATIONS.md](./MIGRATIONS.md)にマイグレーション記録
3. [SPECIFICATION_SAAS_FINAL.md](./SPECIFICATION_SAAS_FINAL.md)に実装タスク追記
4. Phase 1から順次実装開始

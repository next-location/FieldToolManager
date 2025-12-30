# DATABASE_SCHEMA.md 修正内容（2025-12-30）

> 本番環境のスキーマ調査結果に基づく修正

## 調査方法

`/api/test/check-production-schema`で本番データベースのカラム情報とサンプルデータを取得しました。

---

## 修正内容

### 1. `organizations`テーブル

#### ❌ 誤った記載（DATABASE_SCHEMA.mdに記載）
```sql
max_users INTEGER DEFAULT 20,
max_tools INTEGER DEFAULT 500,
```

#### ✅ 正しい状態（本番環境）
- **`max_users`カラムは存在しない**
- **`max_tools`カラムは存在しない**
- ユーザー数上限は`contracts.user_limit`で管理
- 道具数上限の制約は実装されていない

#### 理由
マルチテナントSaaSでは、組織ごとに契約が複数存在する可能性があるため、`organizations`テーブルではなく`contracts`テーブルで管理するのが正しい設計です。

---

### 2. `contracts`テーブル

#### ✅ 正しい記載（確認済み）
```sql
contract_type TEXT NOT NULL CHECK (contract_type IN ('monthly', 'annual')),
billing_day INTEGER DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
super_admin_created_by UUID NOT NULL,
```

#### 📝 補足情報
- `billing_day`は1-28の範囲のみ（31日は使用不可）
- 月末請求の場合は`billing_day = 28`を使用
- `super_admin_created_by`は必須フィールド（契約作成者のsuper_admin ID）

#### 実際のサンプル値
```json
{
  "contract_type": "monthly",
  "plan": "start",
  "billing_day": 27,
  "super_admin_created_by": "e8207168-0543-4a3f-aa00-d1dfb50e3bbc"
}
```

---

### 3. `plan`カラムの値

#### DATABASE_SCHEMA.mdの記載
```sql
plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium', 'enterprise')),
```

#### 本番環境の実際の値
```json
{
  "organizations": { "plan": "basic" },
  "contracts": { "plan": "start" }
}
```

#### 📝 注意点
- `contracts.plan`には`start`という値も存在する
- CHECK制約が`('basic', 'premium', 'enterprise')`のみだと、`start`が登録できない
- 実際には制約が異なる可能性がある（または後から追加された）

---

### 4. `packages`テーブル

#### `package_key`の実際の値
```json
{
  "package_key": "has_asset_package"
}
```

#### 📝 注意点
- ドキュメントでは`asset`, `dx`, `full`と記載されている箇所があるが、実際は`has_asset_package`のように接頭辞が付いている
- コード内で`package_key === 'asset'`のような比較をしている場合、動作しない可能性がある

---

### 5. `users`テーブル

#### ✅ 正しい記載（確認済み）
```sql
role TEXT NOT NULL CHECK (role IN ('staff', 'leader', 'admin', 'super_admin')),
```

#### 実際のサンプル値
```json
{
  "role": "admin",
  "organization_id": "e8b804b3-8935-46cd-a7f5-f4bb0c0541b1",
  "email": "hanako@sisan.jp",
  "name": "山田花子"
}
```

---

## テストコードへの影響

### 修正が必要な箇所

#### 1. `organizations`テーブルへのINSERT
```typescript
// ❌ 誤り
await supabase.from('organizations').insert({
  name: 'テスト会社',
  max_users: 30, // このカラムは存在しない
});

// ✅ 正しい
await supabase.from('organizations').insert({
  name: 'テスト会社',
  plan: 'basic', // max_usersは削除
});
```

#### 2. `contracts`テーブルへのINSERT
```typescript
// ❌ 誤り
await supabase.from('contracts').insert({
  billing_day: 31, // 1-28の範囲外でエラー
  contract_type: 'subscription', // 存在しない値
});

// ✅ 正しい
await supabase.from('contracts').insert({
  billing_day: 28, // 月末の場合は28を使用
  contract_type: 'monthly', // 'monthly'または'annual'
  super_admin_created_by: '00000000-0000-0000-0000-000000000000', // 必須
  admin_name: 'テスト管理者', // 必須
  admin_email: 'test@example.com', // 必須
});
```

#### 3. `packages`テーブルからのSELECT
```typescript
// ❌ 誤り
const { data } = await supabase
  .from('packages')
  .select('id')
  .eq('package_key', 'asset'); // 'asset'では見つからない

// ✅ 正しい
const { data } = await supabase
  .from('packages')
  .select('id')
  .eq('package_key', 'has_asset_package'); // 正しいキー名
```

---

## 推奨アクション

1. ✅ **DATABASE_SCHEMA.mdから`organizations.max_users`を削除**
2. ✅ **テストコードを本番スキーマに合わせて修正**
3. ✅ **`billing_day`の有効範囲（1-28）をドキュメントに明記**
4. ✅ **`package_key`の正しい値をドキュメントに記載**

---

## 更新日時
2025-12-30

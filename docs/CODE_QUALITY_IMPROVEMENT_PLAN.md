# コード品質改善計画 - TypeScript型安全化タスク

## 概要

現在のコードベースには921件のESLint警告（主に`any`型使用と未使用変数）が存在します。
これらは**ビルドや実行には影響しません**が、型安全性の向上とコード品質の維持のため、段階的に修正していきます。

## 実施タイミング

✅ **推奨開始時期**: テスト環境が完全に構築され、実動作テストが可能になった後

### 前提条件
- [ ] テスト環境（test-zairoku.com）が稼働
- [ ] 本番環境（zairoku.com）が稼働
- [ ] 両環境で主要機能の動作確認が完了
- [ ] E2Eテストまたは手動テストのフローが確立

## 段階的修正アプローチ

### Phase 1: 影響範囲の小さいファイルから開始（Week 1-2）

**対象ファイル例**:
- `app/(authenticated)/analytics/cost/page.tsx` (1箇所のany)
- `lib/utils/subdomain.ts` (2箇所のany)
- `types/attendance.ts` (1箇所のany)

**1ファイルあたりの修正フロー**:

```typescript
// ステップ1: 実際の型を調査（ローカル環境）
const handleClick = (e: any) => {
  console.log('Type:', typeof e);
  console.log('Keys:', Object.keys(e));
  console.log('Value:', e);
  // 実際にクリックして、ブラウザのコンソールで型を確認
};

// ステップ2: 調査結果から正確な型を定義
interface CustomClickEvent {
  target: HTMLElement;
  currentTarget: HTMLButtonElement;
  preventDefault: () => void;
  // 実際に使用されているプロパティのみ定義
}

// ステップ3: 型を適用
const handleClick = (e: CustomClickEvent) => {
  console.log(e.target);
};

// ステップ4: ローカルで動作確認
// ステップ5: テスト環境にデプロイ
// ステップ6: テスト環境で1-2日動作確認
// ステップ7: 問題なければ本番デプロイ
// ステップ8: Gitコミット
```

**週次サイクル**:
```
月曜: 5-10箇所のanyを修正（ローカル）
火曜: ローカルで動作テスト
水曜: テスト環境にデプロイ
木曜: テスト環境で動作確認
金曜: 本番デプロイ、Gitコミット
```

### Phase 2: 中程度の影響範囲（Week 3-8）

**対象ファイル例**:
- `app/(authenticated)/analytics/cashflow/page.tsx` (9箇所のany)
- `components/admin/` 配下のファイル
- `lib/` 配下のユーティリティファイル

**注意事項**:
- 1週間あたり5-10箇所を上限とする
- 問題が発生したら即座にロールバック
- 影響範囲を明確に記録

### Phase 3: コア機能（Week 9-15）

**対象ファイル例**:
- `app/(authenticated)/AttendanceWidget.tsx` (10箇所のany)
- `app/(authenticated)/analytics/financial/` (複数ファイル)
- `components/` 配下の重要コンポーネント

**より慎重なアプローチ**:
- テスト環境での確認期間を2-3日に延長
- 複数の利用シナリオでテスト
- 管理者・リーダー・スタッフの各権限でテスト

### Phase 4: その他の警告修正（Week 16-20）

**対象**:
- 未使用変数の削除
- `prefer-const`の修正
- `@next/next/no-html-link-for-pages`の修正（`<a>`を`<Link>`に変更）

## リスク管理

### ❌ やってはいけないこと

1. **一度に複数ファイルを修正しない**
   - 問題が起きた時に原因特定が困難になる

2. **テストなしでコミットしない**
   - 必ずテスト環境での動作確認を行う

3. **コア機能から始めない**
   - 影響範囲が小さいファイルから始める

### ✅ 安全策

1. **小さく修正、素早く検証**
   - 1週間あたり5-10箇所まで

2. **ロールバック手順の確認**
   ```bash
   # 問題が発生した場合
   git revert <commit-hash>
   git push origin main
   ```

3. **影響範囲の記録**
   - どのファイルを修正したか
   - どの機能に影響する可能性があるか
   - テスト項目

## 進捗管理

### チェックリスト

#### Phase 1: 影響範囲の小さいファイル
- [ ] `app/(authenticated)/analytics/cost/page.tsx`
- [ ] `lib/utils/subdomain.ts`
- [ ] `types/attendance.ts`
- [ ] `types/notification.ts`
- [ ] `types/organization.ts`

#### Phase 2: 中程度の影響範囲
- [ ] `app/(authenticated)/analytics/cashflow/page.tsx`
- [ ] `components/admin/ContractsTable.tsx`
- [ ] `lib/security/key-management.ts`
- [ ] `lib/pdf/stripe-invoice-generator.ts`

#### Phase 3: コア機能
- [ ] `app/(authenticated)/AttendanceWidget.tsx`
- [ ] `app/(authenticated)/analytics/financial/CashflowAnalytics.tsx`
- [ ] `app/(authenticated)/analytics/financial/SalesAnalytics.tsx`

#### Phase 4: その他の警告
- [ ] 未使用変数の削除
- [ ] `prefer-const`の修正
- [ ] `<a>`を`<Link>`に変更

## 現在のESLint警告数

**Total: 921 warnings**
- `@typescript-eslint/no-explicit-any`: ~500件
- `@typescript-eslint/no-unused-vars`: ~400件
- `prefer-const`: ~10件
- `@next/next/no-html-link-for-pages`: ~8件
- その他: ~3件

## メリット

### 型安全化によるメリット
1. **バグの早期発見**: コンパイル時に型エラーを検出
2. **リファクタリングの安全性向上**: 型が保証されているため、変更の影響範囲が明確
3. **IDEの補完機能向上**: 正確な型情報により、より良いコード補完
4. **ドキュメント効果**: 型定義が仕様書の役割を果たす
5. **将来のCI/CD対応**: ESLintをCI/CDパイプラインに組み込める

## 参考: 型定義のベストプラクティス

### unknownを使った安全な型チェック

```typescript
// anyの代わりにunknownを使う
const processData = (data: unknown) => {
  // 型ガードで安全に型チェック
  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item === 'object' && item !== null && 'id' in item) {
        return (item as { id: string }).id;
      }
    });
  }
};
```

### イベントハンドラの型定義

```typescript
// React.MouseEvent<HTMLButtonElement>を使う
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  console.log(e.currentTarget.value);
};

// フォーム送信
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
};
```

### APIレスポンスの型定義

```typescript
// 期待されるレスポンス型を定義
interface ApiResponse {
  data: Array<{ id: string; name: string }>;
  error?: string;
}

const fetchData = async (): Promise<ApiResponse> => {
  const response = await fetch('/api/data');
  return response.json();
};
```

## 関連ドキュメント

- [PRODUCTION_MIGRATION_LOG.md](./PRODUCTION_MIGRATION_LOG.md) - 本番移行ログ
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - 環境セットアップ
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - データベース設計

## 更新履歴

- 2025-12-23: 初版作成（ESLint設定緩和完了後）

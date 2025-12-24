# 今後の実装予定

**作成日**: 2025-12-23
**最終更新**: 2025-12-23

---

## 📋 Phase 2: CI/CD自動化（優先度: 中）

### GitHub Actions設定

**目的**: 自動ビルド・テスト・デプロイの実装

#### 実装内容

1. **自動ビルドチェック**:
   - PRが作成された際に自動的にビルドを実行
   - ビルドエラーがある場合はマージを禁止

2. **自動テスト実行**:
   - ユニットテスト実行
   - E2Eテスト実行（Playwright）
   - テスト失敗時はマージを禁止

3. **TypeScript型チェック**:
   - `npm run type-check` の自動実行
   - 型エラーがある場合はマージを禁止

4. **ESLintチェック**:
   - コードスタイルチェック
   - ESLintエラーがある場合は警告

5. **GitHub Actions ワークフロー**:
   ```yaml
   # .github/workflows/test.yml
   name: Test and Build

   on:
     pull_request:
       branches: [main, test]

   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm ci
         - run: npm run type-check
         - run: npm run lint
         - run: npm run build
         - run: npm run test
   ```

6. **ブランチ保護ルール更新**:
   - testブランチで「Require status checks to pass」を有効化
   - 必須チェック: `Test and Build`

#### 完了基準

- [ ] `.github/workflows/test.yml` 作成
- [ ] PRでの自動ビルド・テスト実行確認
- [ ] testブランチのステータスチェック有効化
- [ ] mainブランチのステータスチェック有効化

#### 優先度

**中**（テスト環境構築完了後に実装）

---

## 📋 Phase 3: 監視・アラート（優先度: 低）

### Sentryエラートラッキング

**目的**: 本番環境のエラー監視

#### 実装内容

1. Sentry導入
2. エラー自動送信
3. アラート設定（メール・Slack）

#### 優先度

**低**（顧客10社超えた後）

---

## 📋 Phase 4: パフォーマンス最適化（優先度: 低）

### 実装内容

1. 画像最適化（Next.js Image）
2. コード分割（Dynamic Import）
3. キャッシュ戦略
4. データベースクエリ最適化

#### 優先度

**低**（パフォーマンス問題が発生した際）

---

## 📋 Phase 5: Stripe決済自動化（優先度: 高）

**参照**: `docs/ADDITIONAL_FEATURES_SPEC.md`

**実装タイミング**: 顧客30社以上

---

**次回レビュー**: 2025-02-01

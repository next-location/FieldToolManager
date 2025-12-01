# 開発ガイドライン

## 目次
1. [開発環境セットアップ](#1-開発環境セットアップ)
2. [コーディング規約](#2-コーディング規約)
3. [ブランチ戦略](#3-ブランチ戦略)
4. [コミット規約](#4-コミット規約)
5. [プルリクエスト](#5-プルリクエスト)
6. [テスト](#6-テスト)
7. [ドキュメント](#7-ドキュメント)
8. [リリースプロセス](#8-リリースプロセス)

---

## 1. 開発環境セットアップ

### 1.1 必要なツール

```bash
# 必須
- Node.js 18.17.0 以上
- npm 9.x 以上 または pnpm 8.x
- Git 2.x 以上

# 推奨
- VS Code
- GitHub CLI
- Docker Desktop (Supabase Local Development)
```

### 1.2 初期セットアップ

```bash
# 1. リポジトリのクローン
git clone https://github.com/your-org/field-tool-manager.git
cd field-tool-manager

# 2. 依存関係のインストール
npm install

# 3. 環境変数の設定
cp .env.example .env.local
# .env.local を編集して必要な値を設定

# 4. Supabase ローカル環境の起動（オプション）
npx supabase start

# 5. データベースマイグレーション
npm run db:migrate

# 6. 開発サーバーの起動
npm run dev
```

### 1.3 VS Code 推奨拡張機能

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "steoates.autoimport",
    "usernamehw.errorlens"
  ]
}
```

---

## 2. コーディング規約

### 2.1 TypeScript/JavaScript

#### 基本ルール
```typescript
// ✅ Good - 明確な型定義
interface ToolData {
  id: string;
  name: string;
  categoryId: string;
  status: 'normal' | 'repair' | 'broken' | 'disposed';
}

// ❌ Bad - any型の使用
const data: any = fetchData();

// ✅ Good - 早期リターン
function validateTool(tool: ToolData): boolean {
  if (!tool.id) return false;
  if (!tool.name) return false;
  return true;
}

// ❌ Bad - ネストが深い
function validateTool(tool: ToolData): boolean {
  if (tool.id) {
    if (tool.name) {
      return true;
    }
  }
  return false;
}
```

#### 命名規則
```typescript
// ファイル名: kebab-case
tool-list.tsx
use-auth.ts
api-client.ts

// コンポーネント: PascalCase
export function ToolList() {}
export const QrScanner = () => {}

// 関数・変数: camelCase
const toolCount = 10;
function calculateTotal() {}

// 定数: UPPER_SNAKE_CASE
const MAX_TOOLS = 1000;
const API_BASE_URL = 'https://api.example.com';

// 型・インターフェース: PascalCase
type ToolStatus = 'normal' | 'repair';
interface ToolData {}

// Enum: PascalCase (値は UPPER_SNAKE_CASE)
enum UserRole {
  ADMIN = 'admin',
  LEADER = 'leader',
  STAFF = 'staff'
}
```

### 2.2 React/Next.js

#### コンポーネント構造
```tsx
// ✅ Good - 機能別にフォルダ分け
components/
├── features/
│   ├── tool-management/
│   │   ├── ToolList.tsx
│   │   ├── ToolCard.tsx
│   │   └── hooks/
│   │       └── useTools.ts
│   └── qr-scanner/
│       ├── QrScanner.tsx
│       └── QrResult.tsx
└── ui/
    ├── Button.tsx
    └── Input.tsx

// ✅ Good - カスタムフックの抽出
function ToolList() {
  const { tools, isLoading, error } = useTools();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {tools.map(tool => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  );
}

// ✅ Good - Props の型定義
interface ToolCardProps {
  tool: ToolData;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function ToolCard({ tool, onEdit, onDelete }: ToolCardProps) {
  // ...
}
```

### 2.3 CSS/Tailwind

```tsx
// ✅ Good - Tailwind クラスの整理
const buttonStyles = cn(
  // Base styles
  "px-4 py-2 rounded-lg font-medium transition-colors",
  // Variant styles
  variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
  variant === "secondary" && "bg-gray-200 text-gray-900 hover:bg-gray-300",
  // State styles
  disabled && "opacity-50 cursor-not-allowed"
);

// ❌ Bad - インラインで長いクラス名
<button className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
```

### 2.4 API/データベース

```typescript
// ✅ Good - エラーハンドリング
export async function getTools(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('tools')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Failed to fetch tools:', error);
    return { data: null, error };
  }
}

// ✅ Good - トランザクション処理
export async function moveTool(
  toolId: string,
  fromLocationId: string,
  toLocationId: string
) {
  const { data, error } = await supabase.rpc('move_tool', {
    p_tool_id: toolId,
    p_from_location: fromLocationId,
    p_to_location: toLocationId
  });

  if (error) {
    await logError('tool_movement_failed', error);
    throw error;
  }

  return data;
}
```

---

## 3. ブランチ戦略

### 3.1 Git Flow

```
main
  ├── develop
  │     ├── feature/add-qr-scanner
  │     ├── feature/implement-reports
  │     └── feature/user-management
  ├── release/v1.0.0
  └── hotfix/fix-login-bug
```

### 3.2 ブランチ命名規則

```bash
# 機能追加
feature/機能名
feature/add-bulk-import
feature/implement-notifications

# バグ修正
bugfix/バグ内容
bugfix/fix-qr-scan-error
bugfix/correct-inventory-calculation

# ホットフィックス（本番緊急修正）
hotfix/修正内容
hotfix/fix-auth-bypass
hotfix/patch-security-vulnerability

# リリース準備
release/バージョン
release/v1.0.0
release/v1.1.0

# 改善・リファクタリング
refactor/改善内容
refactor/optimize-queries
refactor/improve-component-structure

# ドキュメント
docs/ドキュメント内容
docs/update-api-spec
docs/add-deployment-guide
```

### 3.3 ブランチ運用ルール

```bash
# 新機能開発の流れ
1. develop から feature ブランチを作成
git checkout develop
git checkout -b feature/add-new-function

2. 開発・コミット
git add .
git commit -m "feat: 新機能を追加"

3. develop にマージ（PR経由）
git push origin feature/add-new-function
# GitHub で PR 作成

4. リリース準備
git checkout -b release/v1.0.0 develop

5. main にマージ
git checkout main
git merge --no-ff release/v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
```

---

## 4. コミット規約

### 4.1 Conventional Commits

```bash
<type>(<scope>): <subject>

<body>

<footer>
```

### 4.2 コミットタイプ

```bash
feat:     新機能
fix:      バグ修正
docs:     ドキュメントのみの変更
style:    コードの意味に影響しない変更（空白、フォーマット等）
refactor: バグ修正や機能追加を伴わないコード変更
perf:     パフォーマンス改善
test:     テストの追加や修正
build:    ビルドシステムや外部依存の変更
ci:       CI設定ファイルやスクリプトの変更
chore:    その他の変更（ビルドプロセスやツールの変更）
revert:   以前のコミットの取り消し
```

### 4.3 コミットメッセージ例

```bash
# ✅ Good
feat(auth): Supabase認証を実装

- ログイン/ログアウト機能
- セッション管理
- Remember Me機能

Closes #123

# ✅ Good
fix(qr-scan): iOS Safariでのカメラ権限エラーを修正

iOS 15以降でカメラアクセス権限の取得に失敗する問題を修正。
navigator.mediaDevices.getUserMedia()の呼び出し前に
権限チェックを追加。

Fixes #456

# ❌ Bad
更新
fix
WIP
```

---

## 5. プルリクエスト

### 5.1 PR テンプレート

```markdown
## 概要
<!-- 変更の概要を簡潔に記述 -->

## 変更内容
<!-- 具体的な変更内容をリスト形式で -->
- [ ] 機能A を実装
- [ ] バグB を修正
- [ ] テストを追加

## 関連Issue
<!-- 関連するIssue番号 -->
Closes #

## スクリーンショット
<!-- UI変更がある場合は必須 -->

## テスト方法
<!-- レビュアーがテストする手順 -->
1.
2.
3.

## チェックリスト
- [ ] コードが規約に従っている
- [ ] セルフレビューを実施した
- [ ] テストが通っている
- [ ] ドキュメントを更新した
```

### 5.2 レビュープロセス

```
1. PR作成
   - develop ブランチへの PR
   - タイトルは Conventional Commits 形式
   - ラベル付け（feature, bug, docs等）

2. 自動チェック
   - ESLint / Prettier
   - TypeScript ビルド
   - ユニットテスト
   - E2Eテスト

3. コードレビュー
   - 最低1名の承認が必要
   - 重要な変更は2名以上

4. マージ
   - Squash and merge を使用
   - マージ後、feature ブランチは削除
```

---

## 6. テスト

### 6.1 テスト戦略

```
テストピラミッド:
         /\
        /E2E\      (10%)  - Cypress/Playwright
       /______\
      /統合テスト\   (30%)  - API/DB連携
     /___________\
    /ユニットテスト\  (60%)  - Jest + React Testing Library
   /______________\
```

### 6.2 テストファイル構造

```
src/
├── components/
│   ├── ToolCard.tsx
│   └── ToolCard.test.tsx
├── lib/
│   ├── utils.ts
│   └── utils.test.ts
└── __tests__/
    ├── integration/
    │   └── api.test.ts
    └── e2e/
        └── user-flow.spec.ts
```

### 6.3 テスト記述例

```typescript
// ユニットテスト
describe('ToolCard', () => {
  it('should render tool information correctly', () => {
    const tool = {
      id: '1',
      name: 'ドライバー',
      status: 'normal' as const
    };

    render(<ToolCard tool={tool} />);

    expect(screen.getByText('ドライバー')).toBeInTheDocument();
    expect(screen.getByText('正常')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const handleEdit = jest.fn();
    render(<ToolCard tool={tool} onEdit={handleEdit} />);

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    expect(handleEdit).toHaveBeenCalledWith('1');
  });
});
```

---

## 7. ドキュメント

### 7.1 ドキュメント更新ルール

```
機能追加/変更時の必須更新:
- [ ] FEATURES.md - 機能仕様
- [ ] MANUAL.md - 操作方法
- [ ] ARCHITECTURE.md - 設計変更がある場合
- [ ] API.md - APIの追加/変更
- [ ] CHANGELOG.md - 変更履歴
```

### 7.2 コードコメント

```typescript
/**
 * 道具の移動を記録し、在庫を更新する
 *
 * @param toolId - 道具のUUID
 * @param toLocationId - 移動先の場所ID
 * @param quantity - 移動数量（数量管理の場合）
 * @returns 移動記録のID
 * @throws {InvalidLocationError} 無効な場所が指定された場合
 * @throws {InsufficientStockError} 在庫が不足している場合
 *
 * @example
 * ```ts
 * const movementId = await moveTool('uuid-123', 'location-456', 1);
 * ```
 */
export async function moveTool(
  toolId: string,
  toLocationId: string,
  quantity: number = 1
): Promise<string> {
  // 実装
}
```

---

## 8. リリースプロセス

### 8.1 リリースフロー

```bash
# 1. リリースブランチ作成
git checkout -b release/v1.0.0 develop

# 2. バージョン更新
npm version minor  # or major, patch

# 3. CHANGELOG 更新
npm run changelog

# 4. 最終テスト
npm run test:all
npm run build

# 5. PR作成・マージ
# develop → release/v1.0.0 → main

# 6. タグ付け
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 7. デプロイ
npm run deploy:production
```

### 8.2 セマンティックバージョニング

```
MAJOR.MINOR.PATCH

MAJOR: 破壊的変更
MINOR: 後方互換性のある機能追加
PATCH: 後方互換性のあるバグ修正

例:
1.0.0 → 1.0.1 (バグ修正)
1.0.1 → 1.1.0 (新機能追加)
1.1.0 → 2.0.0 (破壊的変更)
```

### 8.3 デプロイチェックリスト

```markdown
## デプロイ前チェックリスト

### コード品質
- [ ] すべてのテストが通っている
- [ ] ビルドが成功している
- [ ] Lintエラーがない
- [ ] TypeScriptエラーがない

### データベース
- [ ] マイグレーションスクリプトを準備
- [ ] バックアップを取得
- [ ] ロールバック手順を確認

### 環境変数
- [ ] 本番環境の環境変数を確認
- [ ] APIキーやシークレットを更新

### モニタリング
- [ ] エラー監視（Sentry）を設定
- [ ] アラートを設定
- [ ] ログ収集を確認

### ドキュメント
- [ ] CHANGELOG.mdを更新
- [ ] リリースノートを作成
- [ ] ユーザー向け告知を準備
```

---

## 更新履歴

- 2024-11-30: 初版作成
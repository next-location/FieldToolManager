# 環境セットアップガイド

## 概要

このドキュメントは、Field Tool Manager のローカル開発環境と本番環境の差異を最小化し、デプロイ時のエラーを防ぐための完全ガイドです。

## 1. Docker環境の構築

### 1.1 docker-compose.yml の作成

プロジェクトルートに以下のファイルを作成：

```yaml
# docker-compose.yml
version: '3.8'
services:
  # PostgreSQL (Supabaseと同じバージョン)
  postgres:
    image: supabase/postgres:15.1.0.117
    container_name: ftm-postgres
    ports:
      - "54322:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: field_tool_manager
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Supabase Auth
  auth:
    image: supabase/gotrue:v2.132.3
    container_name: ftm-auth
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "9999:9999"
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: http://localhost:9999
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://postgres:postgres@postgres:5432/field_tool_manager?search_path=auth
      GOTRUE_SITE_URL: http://localhost:3000
      GOTRUE_URI_ALLOW_LIST: http://localhost:3000
      GOTRUE_JWT_SECRET: your-super-secret-jwt-token-with-at-least-32-characters
      GOTRUE_JWT_EXP: 3600
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_DISABLE_SIGNUP: false
      GOTRUE_EMAIL_ENABLE: true
      GOTRUE_SMTP_HOST: mailhog
      GOTRUE_SMTP_PORT: 1025
      GOTRUE_SMTP_ADMIN_EMAIL: admin@fieldtool.local
      GOTRUE_MAILER_AUTOCONFIRM: true

  # Mailhog (開発用メールサーバー)
  mailhog:
    image: mailhog/mailhog:latest
    container_name: ftm-mailhog
    ports:
      - "1025:1025"
      - "8025:8025"

  # Redis (Rate Limiting用)
  redis:
    image: redis:7-alpine
    container_name: ftm-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```

### 1.2 Dockerコマンド

```bash
# 環境起動
docker-compose up -d

# 環境停止
docker-compose down

# データを含めて完全削除
docker-compose down -v

# ログ確認
docker-compose logs -f [service_name]
```

## 2. 環境変数の管理

### 2.1 環境変数ファイルの構造

```bash
# プロジェクトルート
.env.local          # ローカル開発用（Gitignore対象）
.env.staging        # ステージング環境用（Gitignore対象）
.env.production     # 本番環境用（Gitignore対象）
.env.example        # 環境変数のテンプレート（Git管理対象）
```

### 2.2 .env.example の作成

```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Application
NEXT_PUBLIC_APP_URL=
NODE_ENV=development

# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Redis (Rate Limiting)
REDIS_URL=

# Monitoring (Optional)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Feature Flags
NEXT_PUBLIC_ENABLE_CONTRACT=true
NEXT_PUBLIC_ENABLE_INVOICE=true
NEXT_PUBLIC_ENABLE_STRIPE=false

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

### 2.3 .env.local の設定例

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/field_tool_manager
DIRECT_URL=postgresql://postgres:postgres@localhost:54322/field_tool_manager

# Supabase (Local)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-key-change-in-production

# Redis
REDIS_URL=redis://localhost:6379

# Feature Flags (開発用)
NEXT_PUBLIC_ENABLE_CONTRACT=true
NEXT_PUBLIC_ENABLE_INVOICE=true
NEXT_PUBLIC_ENABLE_STRIPE=false

# Email (Mailhog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@fieldtool.local
```

## 3. データベースマイグレーション

### 3.1 Supabase CLIのセットアップ

```bash
# Supabase CLIのインストール
npm install -g supabase

# プロジェクトの初期化
supabase init

# ローカルSupabaseの起動
supabase start

# マイグレーション作成
supabase migration new create_initial_schema

# マイグレーション実行（ローカル）
supabase db push

# 本番環境への適用
supabase db push --db-url $PRODUCTION_DATABASE_URL
```

### 3.2 マイグレーションファイル構造

```
supabase/
├── migrations/
│   ├── 20250101000000_initial_schema.sql
│   ├── 20250102000000_create_rls_policies.sql
│   ├── 20250103000000_create_audit_tables.sql
│   └── 20250104000000_create_contract_tables.sql
├── seed.sql
└── config.toml
```

### 3.3 RLSポリシーの管理

```sql
-- supabase/migrations/20250102000000_create_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Organization isolation policy
CREATE POLICY "tenant_isolation_tools" ON tools
  FOR ALL
  USING (organization_id = auth.jwt() ->> 'organization_id');

CREATE POLICY "tenant_isolation_movements" ON tool_movements
  FOR ALL
  USING (organization_id = auth.jwt() ->> 'organization_id');

-- Audit log append-only policy
CREATE POLICY "audit_append_only" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "audit_read_own" ON audit_logs
  FOR SELECT
  USING (organization_id = auth.jwt() ->> 'organization_id');
```

## 4. 環境検証システム

### 4.1 環境変数バリデーター

`lib/env-validator.ts` を作成：

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),

  // Auth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_CONTRACT: z.string().transform(val => val === 'true'),
  NEXT_PUBLIC_ENABLE_INVOICE: z.string().transform(val => val === 'true'),
  NEXT_PUBLIC_ENABLE_STRIPE: z.string().transform(val => val === 'true'),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (): Env => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ 環境変数の検証に失敗しました:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
};

// アプリケーション起動時に実行
export const env = validateEnv();
```

### 4.2 起動時チェックスクリプト

`scripts/check-env.ts` を作成：

```typescript
#!/usr/bin/env node
import { validateEnv } from '../lib/env-validator';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

async function checkEnvironment() {
  console.log('🔍 環境チェックを開始します...\n');

  // 1. 環境変数の検証
  console.log('1️⃣ 環境変数の検証...');
  const env = validateEnv();
  console.log('✅ 環境変数: OK\n');

  // 2. データベース接続
  console.log('2️⃣ データベース接続テスト...');
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { error } = await supabase.from('organizations').select('count').limit(1);
    if (error) throw error;
    console.log('✅ データベース: OK\n');
  } catch (error) {
    console.error('❌ データベース接続に失敗:', error);
    process.exit(1);
  }

  // 3. Redis接続（オプション）
  if (env.REDIS_URL) {
    console.log('3️⃣ Redis接続テスト...');
    const redis = new Redis(env.REDIS_URL);
    try {
      await redis.ping();
      console.log('✅ Redis: OK\n');
      redis.disconnect();
    } catch (error) {
      console.error('⚠️ Redis接続に失敗（Rate Limitingが無効になります）:', error);
    }
  }

  // 4. RLSポリシーチェック
  console.log('4️⃣ RLSポリシーチェック...');
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('schemaname', 'public');

  const requiredPolicies = [
    'tenant_isolation_tools',
    'tenant_isolation_movements',
    'audit_append_only'
  ];

  const missingPolicies = requiredPolicies.filter(
    p => !policies?.some(policy => policy.policyname === p)
  );

  if (missingPolicies.length > 0) {
    console.error('❌ 不足しているRLSポリシー:', missingPolicies);
    process.exit(1);
  }
  console.log('✅ RLSポリシー: OK\n');

  console.log('🎉 環境チェック完了！すべて正常です。');
}

checkEnvironment().catch(console.error);
```

## 5. テスト戦略

### 5.1 E2Eテスト設定

`playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.2 RLSテスト

`e2e/rls-isolation.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { createTestOrganizations, loginAs } from './helpers';

test.describe('マルチテナントRLS分離', () => {
  test.beforeAll(async () => {
    await createTestOrganizations();
  });

  test('組織間でデータが分離されている', async ({ page }) => {
    // 組織Aでログイン
    await loginAs(page, 'org-a@test.com', 'password');
    await page.goto('/tools');
    const toolsA = await page.locator('[data-testid="tool-item"]').count();

    // 組織Bでログイン
    await loginAs(page, 'org-b@test.com', 'password');
    await page.goto('/tools');
    const toolsB = await page.locator('[data-testid="tool-item"]').count();

    // 異なるデータが表示されることを確認
    expect(toolsA).toBeGreaterThan(0);
    expect(toolsB).toBeGreaterThan(0);
    expect(toolsA).not.toBe(toolsB);
  });

  test('他組織のツールにアクセスできない', async ({ page }) => {
    await loginAs(page, 'org-a@test.com', 'password');

    // 組織BのツールIDで直接アクセス試行
    const response = await page.goto('/tools/org-b-tool-uuid');
    expect(response?.status()).toBe(404);
  });
});
```

## 6. CI/CDパイプライン

### 6.1 GitHub Actions設定

`.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
  NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SERVICE_KEY }}

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: supabase/postgres:15.1.0.117
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: |
          npm install -g supabase
          supabase db push --db-url $DATABASE_URL

      - name: Check environment
        run: npm run check:env

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Unit tests
        run: npm run test

      - name: Build
        run: npm run build

      - name: E2E tests
        run: npm run test:e2e

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Staging
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          npm install -g vercel
          vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
          vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
          vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Run production migrations
        run: |
          npm install -g supabase
          supabase db push --db-url ${{ secrets.PRODUCTION_DATABASE_URL }}

      - name: Deploy to Production
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          npm install -g vercel
          vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
          vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
          vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Notify deployment
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ Production deployment completed"}'
```

## 7. モニタリング設定

### 7.1 Sentry設定

`sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event, hint) {
    // 個人情報のフィルタリング
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
```

## 8. package.json スクリプト

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",

    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:reset": "docker-compose down -v && docker-compose up -d",

    "db:migrate": "supabase migration new",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset",
    "db:seed": "tsx supabase/seed.ts",

    "check:env": "tsx scripts/check-env.ts",
    "check:all": "npm run lint && npm run type-check && npm run check:env",

    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:rls": "tsx tests/rls-policies.test.ts",

    "prepare": "husky install"
  }
}
```

## 9. チェックリスト

### 開発開始前

- [ ] Docker Compose で環境構築
- [ ] `.env.local` を `.env.example` から作成
- [ ] `npm run docker:up` で Docker 起動
- [ ] `npm run db:push` でマイグレーション実行
- [ ] `npm run db:seed` でテストデータ投入
- [ ] `npm run check:env` で環境検証

### コミット前

- [ ] `npm run check:all` でリント・型チェック・環境チェック
- [ ] `npm run test` でユニットテスト
- [ ] `npm run test:e2e` でE2Eテスト
- [ ] `npm run test:rls` でRLSポリシーテスト

### デプロイ前

- [ ] ステージング環境でのテスト完了
- [ ] 本番環境のバックアップ取得
- [ ] マイグレーションのドライラン実行
- [ ] Feature Flags の確認
- [ ] 監視アラートの設定確認

### デプロイ後

- [ ] ヘルスチェックエンドポイントの確認
- [ ] Sentryでエラー監視
- [ ] ユーザーからのフィードバック収集
- [ ] パフォーマンスメトリクスの確認

## 10. トラブルシューティング

### よくある問題と解決方法

#### 1. RLSポリシーエラー
```sql
-- RLSが有効になっているか確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- ポリシーの確認
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

#### 2. マイグレーション競合
```bash
# ローカルマイグレーションをリセット
supabase db reset

# 本番からマイグレーション履歴を取得
supabase db pull
```

#### 3. 環境変数の不一致
```bash
# 環境変数の差分チェック
diff .env.local .env.staging
```

## 10. 本番環境でのデータベース接続方法

### 10.1 Supabase Client vs PostgreSQL直接接続

**重要：本番環境では必ずSupabase Clientを使用してください。**

#### 理由

PostgreSQL直接接続（`pg`ライブラリ）には以下の問題があります：

1. **PostgRESTスキーマキャッシュ問題**: 新しいカラムを追加してもPostgRESTが認識しない
2. **PgBouncer互換性問題**: Transaction Mode（ポート6543）ではプリペアドステートメントが使えない
3. **接続プール管理の複雑さ**: Vercelのサーバーレス環境では接続管理が困難

#### 正しい実装パターン

```typescript
// ✅ 推奨：Supabase Clientを使用
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function MyPage() {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  // ...
}
```

```typescript
// ❌ 非推奨：PostgreSQL直接接続（本番環境では使用しない）
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// スキーマキャッシュ問題が発生する可能性あり
```

#### ローカル開発環境の場合

ローカル環境（Dockerなど）では、PostgreSQL直接接続も問題なく動作します。ただし、本番環境との一貫性のため、**ローカルでもSupabase Clientを使用することを推奨**します。

#### スキーマキャッシュのリロード

新しいカラムを追加した後、PostgRESTがそれを認識しない場合は、以下のSQLを実行：

```sql
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
```

実行後、1-2分待ってからアプリケーションをリロードしてください。

### 10.2 既存コードの移行チェックリスト

本番環境で動作しない可能性があるページを特定し、Supabase Clientに移行：

```bash
# PostgreSQL直接接続を使用しているファイルを検索
grep -r "from 'pg'" app/
grep -r "new Pool" app/
```

各ファイルを以下のように修正：

1. `import { Pool } from 'pg'` → `import { createClient } from '@supabase/supabase-js'`
2. `new Pool()` → `createClient()`
3. `client.query()` → `supabase.from().select()`

## まとめ

このガイドに従うことで、ローカル開発環境と本番環境の差異を最小化し、安全で確実なデプロイが可能になります。問題が発生した場合は、このドキュメントのトラブルシューティングセクションを参照してください。
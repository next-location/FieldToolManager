# 次のセッション: スーパーアドミンログイン・ダッシュボード実装

## 🎯 実装タスク

以下の2つだけを実装してください：

1. **スーパーアドミンログインページ** (`/admin/login`)
2. **スーパーアドミンダッシュボード** (`/admin/dashboard`)

---

## 📊 現在の実装状況

### ✅ 実装済み

- `super_admins` テーブル（データ0件）
- `super_admin_logs` テーブル
- ディレクトリ: `app/(admin)/` 存在（中身は空）

### ❌ 未実装

- スーパーアドミンユーザーデータ
- ログインページ
- ダッシュボード
- 認証フロー

---

## 🛠️ 実装手順

### Step 1: データベース準備

#### 1.1 スーパーアドミンユーザー作成スクリプト

ファイル: `scripts/create-super-admin.ts`

```typescript
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createSuperAdmin() {
  const password = 'SuperAdmin123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('super_admins')
    .insert({
      email: 'superadmin@fieldtool.com',
      name: 'スーパー管理者',
      password_hash: passwordHash,
      permission_level: 'admin',
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ スーパーアドミン作成完了');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 ログイン情報');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', data.email);
    console.log('Password:', password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

createSuperAdmin();
```

#### 1.2 必要なパッケージをインストール

```bash
npm install bcrypt jose
npm install -D @types/bcrypt
```

#### 1.3 スクリプト実行

```bash
npx tsx scripts/create-super-admin.ts
```

---

### Step 2: 認証ヘルパー作成

ファイル: `lib/auth/super-admin.ts`

```typescript
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SUPER_ADMIN_JWT_SECRET || 'your-super-secret-key-change-in-production'
);

export interface SuperAdminPayload {
  id: string;
  email: string;
  name: string;
  permission_level: string;
}

// パスワード検証
export async function verifySuperAdminPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// JWT生成
export async function createSuperAdminToken(payload: SuperAdminPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET_KEY);
}

// JWT検証
export async function verifySuperAdminToken(token: string): Promise<SuperAdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SuperAdminPayload;
  } catch (error) {
    return null;
  }
}

// Cookie設定
export async function setSuperAdminCookie(payload: SuperAdminPayload) {
  const token = await createSuperAdminToken(payload);
  const cookieStore = await cookies();

  cookieStore.set('super_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8時間
    path: '/admin',
  });
}

// Cookie削除
export async function clearSuperAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('super_admin_token');
}

// 認証チェック
export async function getSuperAdminSession(): Promise<SuperAdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('super_admin_token')?.value;

  if (!token) return null;

  return verifySuperAdminToken(token);
}
```

---

### Step 3: ログインAPI実装

#### 3.1 ログインAPI

ファイル: `app/api/admin/login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdminPassword, setSuperAdminCookie } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 });
    }

    // スーパーアドミン取得
    const { data: superAdmin, error } = await supabase
      .from('super_admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !superAdmin) {
      return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 });
    }

    // アカウントロック確認
    if (superAdmin.locked_until && new Date(superAdmin.locked_until) > new Date()) {
      return NextResponse.json({
        error: 'アカウントがロックされています。しばらくしてから再度お試しください。'
      }, { status: 403 });
    }

    // パスワード検証
    const isValidPassword = await verifySuperAdminPassword(password, superAdmin.password_hash);

    if (!isValidPassword) {
      // ログイン失敗回数を更新
      const failedAttempts = (superAdmin.failed_login_attempts || 0) + 1;
      const updates: any = { failed_login_attempts: failedAttempts };

      // 5回失敗でロック（30分）
      if (failedAttempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      }

      await supabase
        .from('super_admins')
        .update(updates)
        .eq('id', superAdmin.id);

      return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 });
    }

    // ログイン成功 - セッションを作成
    await setSuperAdminCookie({
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      permission_level: superAdmin.permission_level,
    });

    // ログイン情報を更新
    await supabase
      .from('super_admins')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: request.headers.get('x-forwarded-for') || 'unknown',
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq('id', superAdmin.id);

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: superAdmin.id,
        action: 'login',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({ success: true, redirect: '/admin/dashboard' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'ログインエラーが発生しました' }, { status: 500 });
  }
}
```

#### 3.2 ログアウトAPI

ファイル: `app/api/admin/logout/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { clearSuperAdminCookie, getSuperAdminSession } from '@/lib/auth/super-admin';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const session = await getSuperAdminSession();

    if (session) {
      await supabase
        .from('super_admin_logs')
        .insert({
          super_admin_id: session.id,
          action: 'logout',
        });
    }

    await clearSuperAdminCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'ログアウトエラーが発生しました' }, { status: 500 });
  }
}
```

---

### Step 4: ログインページUI実装

ファイル: `app/(admin)/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'ログインに失敗しました');
        setLoading(false);
        return;
      }

      router.push('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('ログインエラーが発生しました');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* ロゴ */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">スーパーアドミン</h1>
            <p className="text-sm text-gray-600 mt-2">Field Tool Manager 管理画面</p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* ログインフォーム */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="superadmin@fieldtool.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          {/* セキュリティ警告 */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-yellow-800">
                このページはスーパーアドミン専用です。全ての操作はログに記録されます。
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-blue-100 mt-6">
          © 2025 Field Tool Manager
        </p>
      </div>
    </div>
  );
}
```

---

### Step 5: ダッシュボード実装

ファイル: `app/(admin)/dashboard/page.tsx`

```typescript
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminDashboardPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // 統計情報を取得
  const [organizationsResult, contractsResult, usersResult] = await Promise.all([
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    supabase.from('contracts').select('id, status', { count: 'exact' }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
  ]);

  const totalOrganizations = organizationsResult.count || 0;
  const activeContracts = contractsResult.data?.filter(c => c.status === 'active').length || 0;
  const totalUsers = usersResult.count || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">
              Field Tool Manager - スーパーアドミン
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{session.name}</span>
              <form action="/api/admin/logout" method="POST">
                <button type="submit" className="text-sm text-red-600 hover:text-red-800">
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h2>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">組織数</p>
                <p className="text-2xl font-bold text-gray-900">{totalOrganizations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">有効契約</p>
                <p className="text-2xl font-bold text-gray-900">{activeContracts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 今後の機能追加スペース */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🚧 今後追加予定の機能</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• 組織管理画面</li>
            <li>• パッケージ設定UI</li>
            <li>• 操作ログ閲覧</li>
            <li>• 売上分析</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
```

---

### Step 6: 環境変数設定

`.env.local`に追加：

```bash
# スーパーアドミン用JWT秘密鍵
SUPER_ADMIN_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

秘密鍵を生成：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 テスト手順

1. **パッケージインストール**
```bash
npm install bcrypt jose
npm install -D @types/bcrypt
```

2. **スーパーアドミンユーザー作成**
```bash
npx tsx scripts/create-super-admin.ts
```

3. **サーバー起動**
```bash
npm run dev
```

4. **ログインテスト**
- `http://localhost:3000/admin/login` にアクセス
- Email: `superadmin@fieldtool.com`
- Password: `SuperAdmin123!`
- ダッシュボードが表示されることを確認

---

## 📝 完了チェックリスト

- [ ] bcrypt, joseパッケージをインストール
- [ ] `lib/auth/super-admin.ts` 作成
- [ ] `scripts/create-super-admin.ts` 作成・実行
- [ ] `app/api/admin/login/route.ts` 作成
- [ ] `app/api/admin/logout/route.ts` 作成
- [ ] `app/(admin)/login/page.tsx` 作成
- [ ] `app/(admin)/dashboard/page.tsx` 作成
- [ ] 環境変数 `SUPER_ADMIN_JWT_SECRET` 設定
- [ ] ログインテスト完了
- [ ] ダッシュボード表示確認完了

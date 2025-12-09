import { test, expect } from '@playwright/test';

/**
 * パッケージ制御システムのE2Eテスト
 *
 * 注意: このテストを実行する前に、開発環境でSupabaseが起動していることを確認してください。
 * npm run supabase:start
 *
 * テストユーザーでログインし、パッケージ制御が正しく動作することを確認します。
 */

test.describe('Package Control E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にログインページへ移動
    await page.goto('/login');
  });

  test.describe('Asset Package Features', () => {
    test('should show tool management menu with asset package', async ({ page }) => {
      // LocalStorageにモックパッケージタイプを設定
      await page.addInitScript(() => {
        localStorage.setItem('mock_package_type', 'asset');
      });

      // テストユーザーでログイン
      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      // ダッシュボードへのリダイレクトを待つ
      await page.waitForURL('/');

      // サイドバーに道具管理メニューが表示されることを確認
      await expect(page.getByText('道具管理')).toBeVisible();
      await expect(page.getByText('重機管理')).toBeVisible();
      await expect(page.getByText('移動管理')).toBeVisible();

      // DXパック機能のメニューは表示されないことを確認
      await expect(page.getByText('作業報告書')).not.toBeVisible();
      await expect(page.getByText('勤怠管理')).not.toBeVisible();
      await expect(page.getByText('帳票管理')).not.toBeVisible();
    });

    test('should access tool management page with asset package', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('mock_package_type', 'asset');
      });

      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // 道具管理ページへアクセス
      await page.goto('/tools');

      // ページが正常に表示されることを確認
      await expect(page.getByText('道具一覧')).toBeVisible();
      await expect(page.getByText('新規登録')).toBeVisible();
    });

    test('should not access work reports page without dx package', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('mock_package_type', 'asset');
      });

      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // 作業報告書ページへアクセスを試みる
      await page.goto('/work-reports');

      // PackageRequired画面が表示されることを確認
      await expect(page.getByText('現場DX業務効率化パック が必要です')).toBeVisible();
      await expect(page.getByText('作業報告書')).toBeVisible();
    });
  });

  test.describe('DX Package Features', () => {
    test('should show dx management menu with dx package', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('mock_package_type', 'dx');
      });

      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // サイドバーにDXパック機能のメニューが表示されることを確認
      await expect(page.getByText('作業報告書')).toBeVisible();
      await expect(page.getByText('勤怠管理')).toBeVisible();
      await expect(page.getByText('帳票管理')).toBeVisible();

      // Asset機能のメニューは表示されないことを確認
      await expect(page.getByText('道具管理')).not.toBeVisible();
      await expect(page.getByText('重機管理')).not.toBeVisible();
    });

    test('should access work reports page with dx package', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('mock_package_type', 'dx');
      });

      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // 作業報告書ページへアクセス
      await page.goto('/work-reports');

      // ページが正常に表示されることを確認
      await expect(page.getByText('作業報告書管理')).toBeVisible();
    });
  });

  test.describe('Full Package Features', () => {
    test('should show all menus with full package', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('mock_package_type', 'full');
      });

      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // すべてのメニューが表示されることを確認
      await expect(page.getByText('道具管理')).toBeVisible();
      await expect(page.getByText('重機管理')).toBeVisible();
      await expect(page.getByText('移動管理')).toBeVisible();
      await expect(page.getByText('作業報告書')).toBeVisible();
      await expect(page.getByText('勤怠管理')).toBeVisible();
      await expect(page.getByText('帳票管理')).toBeVisible();
    });

    test('should access all pages with full package', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('mock_package_type', 'full');
      });

      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // 道具管理ページにアクセス
      await page.goto('/tools');
      await expect(page.getByText('道具一覧')).toBeVisible();

      // 作業報告書ページにアクセス
      await page.goto('/work-reports');
      await expect(page.getByText('作業報告書管理')).toBeVisible();
    });
  });

  test.describe('Trial Mode (No Package)', () => {
    test('should not show package-protected menus in trial mode', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('mock_package_type', 'none');
      });

      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // パッケージ保護されたメニューが表示されないことを確認
      await expect(page.getByText('道具管理')).not.toBeVisible();
      await expect(page.getByText('重機管理')).not.toBeVisible();
      await expect(page.getByText('作業報告書')).not.toBeVisible();
      await expect(page.getByText('勤怠管理')).not.toBeVisible();
      await expect(page.getByText('帳票管理')).not.toBeVisible();
    });

    test('should show upgrade prompt when accessing protected pages', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('mock_package_type', 'none');
      });

      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // 道具管理ページへアクセスを試みる
      await page.goto('/tools');

      // PackageRequired画面が表示されることを確認
      await expect(page.getByText('現場資産パック が必要です')).toBeVisible();
      await expect(page.getByText('パッケージを追加する')).toBeVisible();
      await expect(page.getByText('ダッシュボードに戻る')).toBeVisible();
    });
  });

  test.describe('Dev Package Control Widget', () => {
    test('should allow package switching in development mode', async ({ page }) => {
      // 開発環境限定の機能をテスト
      await page.addInitScript(() => {
        localStorage.setItem('mock_package_type', 'none');
      });

      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // DevPackageControlウィジェットが表示されることを確認（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        await expect(page.getByText('開発: パッケージ切替')).toBeVisible();
      }
    });
  });
});

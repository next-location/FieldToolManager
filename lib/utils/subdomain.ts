/**
 * セキュアなサブドメインを生成する
 * - 8文字のランダム英数字（小文字）
 * - 推測されにくい
 * - URLフレンドリー
 */
export function generateSecureSubdomain(): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let subdomain = '';

  // 最初の文字は必ず英字（数字で始まるのを避ける）
  subdomain += characters.charAt(Math.floor(Math.random() * 26));

  // 残り7文字はランダム
  for (let i = 0; i < 7; i++) {
    subdomain += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return subdomain;
}

/**
 * サブドメインの重複チェック
 */
export async function isSubdomainAvailable(supabase: any, subdomain: string): Promise<boolean> {
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('subdomain', subdomain)
    .maybeSingle();

  return !data;
}

/**
 * ユニークなサブドメインを生成（重複チェック付き）
 * 最大10回試行
 */
export async function generateUniqueSubdomain(supabase: any): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const subdomain = generateSecureSubdomain();
    const available = await isSubdomainAvailable(supabase, subdomain);

    if (available) {
      return subdomain;
    }
  }

  throw new Error('ユニークなサブドメインの生成に失敗しました');
}

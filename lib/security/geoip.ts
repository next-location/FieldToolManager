/**
 * GeoIP - IPアドレスから国を判定
 *
 * Cloudflare経由のリクエストではCloudflareがIPの国情報を付与してくれる
 * それ以外の場合は外部APIを使用（ip-api.com - 無料、月45リクエストまで）
 */

interface GeoIPResult {
  country: string; // 'JP', 'US', etc.
  countryName: string; // '日本', 'アメリカ', etc.
  region?: string;
  city?: string;
}

/**
 * IPアドレスから国コードを取得
 */
export async function getCountryFromIP(ipAddress: string): Promise<string> {
  // ローカルIPの場合は日本扱い
  if (isLocalIP(ipAddress)) {
    return 'JP';
  }

  try {
    // ip-api.comを使用（無料、リミット: 45req/min）
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=countryCode`, {
      headers: {
        'User-Agent': 'Zairoku/1.0',
      },
      signal: AbortSignal.timeout(3000), // 3秒でタイムアウト
    });

    if (!response.ok) {
      console.error('[GeoIP] API request failed:', response.status);
      return 'UNKNOWN';
    }

    const data = await response.json();
    return data.countryCode || 'UNKNOWN';
  } catch (error) {
    console.error('[GeoIP] Error fetching country:', error);
    // エラー時は制限しない（UNKNOWNを返す）
    return 'UNKNOWN';
  }
}

/**
 * IPアドレスから詳細な地域情報を取得
 */
export async function getGeoIPInfo(ipAddress: string): Promise<GeoIPResult> {
  // ローカルIPの場合
  if (isLocalIP(ipAddress)) {
    return {
      country: 'JP',
      countryName: '日本（ローカルネットワーク）',
      region: '不明',
      city: '不明',
    };
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,countryCode,country,regionName,city&lang=ja`, {
      headers: {
        'User-Agent': 'Zairoku/1.0',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return {
        country: 'UNKNOWN',
        countryName: '不明',
      };
    }

    const data = await response.json();

    if (data.status === 'fail') {
      return {
        country: 'UNKNOWN',
        countryName: '不明',
      };
    }

    return {
      country: data.countryCode || 'UNKNOWN',
      countryName: data.country || '不明',
      region: data.regionName,
      city: data.city,
    };
  } catch (error) {
    console.error('[GeoIP] Error fetching geo info:', error);
    return {
      country: 'UNKNOWN',
      countryName: '不明',
    };
  }
}

/**
 * ローカルIPかどうか判定
 */
function isLocalIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;

  // IPv4ローカルアドレス
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return true;
  }

  // IPv6ローカルアドレス
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }

  // ループバック
  if (ip === '127.0.0.1' || ip === 'localhost') {
    return true;
  }

  return false;
}

/**
 * 日本からのアクセスかチェック
 */
export async function isJapaneseIP(ipAddress: string): Promise<boolean> {
  const country = await getCountryFromIP(ipAddress);

  // UNKNOWNの場合は許可（エラー時にブロックしない）
  if (country === 'UNKNOWN') {
    console.warn('[GeoIP] Country unknown for IP:', ipAddress, '- allowing access');
    return true;
  }

  return country === 'JP';
}

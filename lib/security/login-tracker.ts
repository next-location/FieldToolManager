/**
 * ログイン試行追跡ユーティリティ
 * 不正ログイン警告機能のため、ログイン失敗・成功を記録
 */

import { createClient } from '@supabase/supabase-js';
import { getGeoIPInfo } from './geoip';
import { sendSecurityAlert } from '@/lib/notifications/security-alert';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type LoginAttemptType = 'password_failure' | '2fa_failure' | 'success';

interface RecordLoginParams {
  email: string;
  ipAddress: string;
  userAgent: string;
  attemptType: LoginAttemptType;
}

/**
 * ログイン試行を記録
 */
export async function recordLoginAttempt(params: RecordLoginParams): Promise<void> {
  const { email, ipAddress, userAgent, attemptType } = params;

  try {
    // GeoIP情報を取得
    const geoInfo = await getGeoIPInfo(ipAddress);
    const locationInfo = geoInfo.country === 'UNKNOWN'
      ? '不明'
      : [geoInfo.countryName, geoInfo.region, geoInfo.city].filter(Boolean).join(' - ');

    // データベースに記録
    await supabase.from('login_attempts').insert({
      email,
      ip_address: ipAddress,
      user_agent: userAgent,
      attempt_type: attemptType,
      country_code: geoInfo.country,
      location_info: locationInfo,
    });

    console.log('[Login Tracker] Recorded attempt:', { email, attemptType, country: geoInfo.country });

    // 警告チェック
    if (attemptType === 'password_failure') {
      await checkPasswordFailures(email, ipAddress, userAgent);
    } else if (attemptType === '2fa_failure') {
      await check2FAFailures(email, ipAddress, userAgent);
    }
  } catch (error) {
    console.error('[Login Tracker] Failed to record attempt:', error);
  }
}

/**
 * パスワード失敗が5回連続になったかチェック
 */
async function checkPasswordFailures(email: string, ipAddress: string, userAgent: string): Promise<void> {
  try {
    // 過去10分間のログイン試行を取得
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const { data: recentAttempts, error } = await supabase
      .from('login_attempts')
      .select('attempt_type')
      .eq('email', email)
      .gte('created_at', tenMinutesAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('[Login Tracker] Error checking password failures:', error);
      return;
    }

    // 最新5件すべてが失敗の場合は警告
    if (recentAttempts && recentAttempts.length >= 5) {
      const allFailures = recentAttempts.every(
        (attempt) => attempt.attempt_type === 'password_failure'
      );

      if (allFailures) {
        console.warn('[Login Tracker] 5 consecutive password failures detected:', email);

        await sendSecurityAlert({
          type: 'login_failure',
          email,
          ipAddress,
          userAgent,
          details: '過去10分間に5回のパスワード失敗',
        });
      }
    }
  } catch (error) {
    console.error('[Login Tracker] Error in checkPasswordFailures:', error);
  }
}

/**
 * 2FA失敗が3回連続になったかチェック
 */
async function check2FAFailures(email: string, ipAddress: string, userAgent: string): Promise<void> {
  try {
    // 過去10分間の2FA失敗を取得
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const { data: recentAttempts, error } = await supabase
      .from('login_attempts')
      .select('attempt_type')
      .eq('email', email)
      .eq('attempt_type', '2fa_failure')
      .gte('created_at', tenMinutesAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('[Login Tracker] Error checking 2FA failures:', error);
      return;
    }

    // 3回以上失敗している場合は警告
    if (recentAttempts && recentAttempts.length >= 3) {
      console.warn('[Login Tracker] 3 consecutive 2FA failures detected:', email);

      await sendSecurityAlert({
        type: '2fa_failure',
        email,
        ipAddress,
        userAgent,
        details: '過去10分間に3回の2FA認証失敗',
      });
    }
  } catch (error) {
    console.error('[Login Tracker] Error in check2FAFailures:', error);
  }
}

/**
 * 日本国外からのアクセスをチェックして警告
 */
export async function checkForeignIPAccess(
  email: string,
  ipAddress: string,
  userAgent: string,
  countryCode: string
): Promise<void> {
  if (countryCode !== 'JP' && countryCode !== 'UNKNOWN') {
    console.warn('[Login Tracker] Foreign IP access detected:', { email, countryCode });

    await sendSecurityAlert({
      type: 'foreign_ip',
      email,
      ipAddress,
      userAgent,
      details: `日本国外（${countryCode}）からのアクセス`,
    });
  }
}

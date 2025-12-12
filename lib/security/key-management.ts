import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabaseサービスロールキーの暗号化管理
 *
 * セキュリティ要件:
 * - サービスロールキーは暗号化して保存
 * - 復号化は必要最小限のタイミングのみ
 * - アクセスログを記録
 * - 定期的なキーローテーション対応
 */

// 暗号化アルゴリズムとキー長
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// 暗号化キーの取得（環境変数から）
function getEncryptionKey(): Buffer {
  const masterKey = process.env.SERVICE_KEY_ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('SERVICE_KEY_ENCRYPTION_KEY環境変数が設定されていません');
  }

  // マスターキーから派生キーを生成
  const salt = process.env.SERVICE_KEY_SALT || 'default-salt-change-in-production';
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * サービスロールキーの暗号化
 */
export function encryptServiceKey(plainKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainKey, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const tag = cipher.getAuthTag();

  // IV + Tag + 暗号化データを結合してBase64エンコード
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * サービスロールキーの復号化
 */
export function decryptServiceKey(encryptedKey: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedKey, 'base64');

  // IV、Tag、暗号化データを分離
  const iv = combined.slice(0, IV_LENGTH);
  const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * キーアクセスログの記録
 */
export async function logKeyAccess(
  action: 'encrypt' | 'decrypt' | 'rotate',
  adminId: string,
  metadata?: Record<string, any>
): Promise<void> {
  // 本番環境ではデータベースに記録
  if (process.env.NODE_ENV === 'production') {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // 既存の平文キーを使用
    );

    await supabase.from('service_key_access_logs').insert({
      admin_id: adminId,
      action,
      metadata,
      ip_address: metadata?.ip_address,
      user_agent: metadata?.user_agent,
      timestamp: new Date().toISOString(),
    });
  } else {
    // 開発環境ではコンソールログ
    console.log('[Key Access Log]', {
      adminId,
      action,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * セキュアなSupabaseクライアント作成
 * 暗号化されたキーを復号化して使用
 */
export function createSecureSupabaseClient(
  encryptedServiceKey?: string,
  adminId?: string
) {
  let serviceKey: string;

  if (encryptedServiceKey) {
    // 暗号化されたキーを復号化
    serviceKey = decryptServiceKey(encryptedServiceKey);
    if (adminId) {
      logKeyAccess('decrypt', adminId, { purpose: 'client_creation' });
    }
  } else {
    // フォールバック：環境変数から直接取得（移行期間のみ）
    serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    console.warn('警告: 暗号化されていないサービスキーを使用しています');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * キーローテーション
 * 新しいキーを生成し、古いキーを無効化
 */
export async function rotateServiceKey(
  currentKey: string,
  adminId: string
): Promise<{ newKey: string; encryptedKey: string }> {
  // Supabaseダッシュボードでの手動操作が必要
  // この関数は新しいキーの暗号化と記録のみ行う

  const newKey = currentKey; // 実際には新しいキーが渡される
  const encryptedKey = encryptServiceKey(newKey);

  await logKeyAccess('rotate', adminId, {
    action: 'key_rotation',
    timestamp: new Date().toISOString(),
  });

  return { newKey, encryptedKey };
}

/**
 * キーの検証
 * 暗号化されたキーが正しく復号化できるか確認
 */
export function validateEncryptedKey(encryptedKey: string): boolean {
  try {
    const decrypted = decryptServiceKey(encryptedKey);
    // Supabaseキーの形式チェック（service_role_で始まる）
    return decrypted.startsWith('eyJ') && decrypted.length > 100;
  } catch (error) {
    console.error('Key validation failed:', error);
    return false;
  }
}

/**
 * キーストレージの初期化
 * 本番環境移行時に実行
 */
export async function initializeKeyStorage(): Promise<void> {
  const currentKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!currentKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  const encryptedKey = encryptServiceKey(currentKey);

  // 暗号化されたキーを安全な場所に保存
  // 例：環境変数、Secret Manager、HSM など
  console.log('Encrypted service key (store this securely):');
  console.log(encryptedKey);

  // 検証
  if (validateEncryptedKey(encryptedKey)) {
    console.log('✅ Key encryption successful');
  } else {
    console.error('❌ Key encryption failed');
  }
}
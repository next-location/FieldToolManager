/**
 * 2FA (Two-Factor Authentication) ユーティリティ
 * Google Authenticator/Authy 互換のTOTP実装
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * 2FAシークレットを生成
 * @param email - スーパーアドミンのメールアドレス
 * @returns シークレットキーとotpauth URL
 */
export function generateSecret(email: string) {
  const secret = speakeasy.generateSecret({
    name: `ザイロク (${email})`,
    issuer: 'ザイロク',
    length: 32, // より強固なシークレット
  });

  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

/**
 * QRコードを生成（Data URL形式）
 * @param otpauth_url - otpauth:// 形式のURL
 * @returns Data URL形式のQRコード画像
 */
export async function generateQRCode(otpauth_url: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth_url);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QRコード生成エラー:', error);
    throw new Error('QRコードの生成に失敗しました');
  }
}

/**
 * TOTPトークンを検証
 * @param secret - Base32エンコードされたシークレット
 * @param token - ユーザーが入力した6桁のトークン
 * @param window - 許容する時間窓（デフォルト: 2 = ±60秒）
 * @returns 検証結果（true/false）
 */
export function verifyToken(
  secret: string,
  token: string,
  window: number = 2
): boolean {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window, // 時計のズレを考慮（±60秒）
    });

    return verified;
  } catch (error) {
    console.error('TOTP検証エラー:', error);
    return false;
  }
}

/**
 * バックアップコードを生成（10個）
 * @returns 生成されたバックアップコードの配列
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];

  for (let i = 0; i < 10; i++) {
    // 8文字のランダムなコードを生成（数字とアルファベット）
    const code = crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join('-') || '';

    codes.push(code);
  }

  return codes;
}

/**
 * バックアップコードをハッシュ化
 * @param codes - バックアップコードの配列
 * @returns ハッシュ化されたコードの配列
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const hashedCodes = await Promise.all(
    codes.map(async (code) => {
      const salt = await bcrypt.genSalt(10);
      return bcrypt.hash(code, salt);
    })
  );

  return hashedCodes;
}

/**
 * バックアップコードを検証
 * @param inputCode - ユーザーが入力したバックアップコード
 * @param hashedCodes - データベースに保存されたハッシュ化されたコード
 * @returns { valid: boolean, codeIndex: number } - 検証結果とコードのインデックス
 */
export async function verifyBackupCode(
  inputCode: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; codeIndex: number }> {
  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await bcrypt.compare(inputCode, hashedCodes[i]);
    if (isMatch) {
      return { valid: true, codeIndex: i };
    }
  }

  return { valid: false, codeIndex: -1 };
}

/**
 * シークレットを暗号化（データベース保存用）
 * @param secret - Base32エンコードされたシークレット
 * @param encryptionKey - 暗号化キー（環境変数から取得）
 * @returns 暗号化されたシークレット
 */
export function encryptSecret(secret: string, encryptionKey: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // ivと暗号化データを結合
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * シークレットを復号化
 * @param encryptedSecret - 暗号化されたシークレット
 * @param encryptionKey - 復号化キー（環境変数から取得）
 * @returns 復号化されたシークレット
 */
export function decryptSecret(
  encryptedSecret: string,
  encryptionKey: string
): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);

  const [ivHex, encrypted] = encryptedSecret.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

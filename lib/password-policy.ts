/**
 * パスワードポリシー検証ユーティリティ
 */

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSymbols: boolean
  passwordExpirationDays: number
  preventReuse: number
}

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * パスワードがポリシーに準拠しているかチェック
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy
): PasswordValidationResult {
  const errors: string[] = []

  // 最小文字数チェック
  if (password.length < policy.minLength) {
    errors.push(`パスワードは${policy.minLength}文字以上である必要があります`)
  }

  // 大文字チェック
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('パスワードには大文字を含める必要があります')
  }

  // 小文字チェック
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('パスワードには小文字を含める必要があります')
  }

  // 数字チェック
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('パスワードには数字を含める必要があります')
  }

  // 記号チェック
  if (policy.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('パスワードには記号を含める必要があります')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * パスワード強度を計算（0-4）
 */
export function calculatePasswordStrength(password: string): number {
  let strength = 0

  if (password.length >= 8) strength++
  if (password.length >= 12) strength++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++

  return Math.min(strength, 4)
}

/**
 * パスワード強度のラベルを取得
 */
export function getPasswordStrengthLabel(strength: number): string {
  const labels = ['非常に弱い', '弱い', '普通', '強い', '非常に強い']
  return labels[strength] || '非常に弱い'
}

/**
 * パスワード強度の色を取得
 */
export function getPasswordStrengthColor(strength: number): string {
  const colors = ['red', 'orange', 'yellow', 'lime', 'green']
  return colors[strength] || 'red'
}

/**
 * デフォルトのパスワードポリシー
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: false,
  passwordExpirationDays: 90,
  preventReuse: 5,
}

/**
 * パスワード変更モーダルコンポーネント
 *
 * 3ステップでパスワード変更を実行:
 * 1. 現在のパスワード入力 → 確認コード送信
 * 2. 確認コード + 新しいパスワード入力 → パスワード変更
 * 3. 完了画面
 */

'use client';

import { useState } from 'react';
import { Lock, Mail, Key, Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import { validatePassword, DEFAULT_PASSWORD_POLICY, calculatePasswordStrength, getPasswordStrengthLabel, getPasswordStrengthColor } from '@/lib/password-policy';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
}

export default function PasswordChangeModal({
  isOpen,
  onClose,
  userId,
  userEmail,
}: PasswordChangeModalProps) {
  const [step, setStep] = useState<'input' | 'verify' | 'complete'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: 現在のパスワード
  const [currentPassword, setCurrentPassword] = useState('');

  // Step 2: 確認コードと新しいパスワード
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // パスワード表示切り替え
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // パスワード強度
  const passwordStrength = calculatePasswordStrength(newPassword);
  const passwordValidation = validatePassword(newPassword, DEFAULT_PASSWORD_POLICY);

  // モーダルを閉じる
  const handleClose = () => {
    setStep('input');
    setCurrentPassword('');
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
  };

  // Step 1: 確認コード送信リクエスト
  const handleRequestChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users/password/request-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'リクエストに失敗しました');
      }

      setSuccess('確認コードをメールで送信しました');
      setStep('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: パスワード変更実行
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // パスワード一致確認
    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません');
      setLoading(false);
      return;
    }

    // パスワードポリシー確認
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/password/verify-and-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          verificationCode,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'パスワード変更に失敗しました');
      }

      setStep('complete');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // パスワード自動生成
  const generateSecurePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = 0; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGeneratePassword = () => {
    const generated = generateSecurePassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* 背景オーバーレイ */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* モーダルコンテンツ */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* 閉じるボタン */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>

          {/* プログレスバー */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Step {step === 'input' ? '1' : step === 'verify' ? '2' : '3'} / 3</span>
              <span>
                {step === 'input'
                  ? '本人確認'
                  : step === 'verify'
                  ? 'パスワード変更'
                  : '完了'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width:
                    step === 'input' ? '33%' : step === 'verify' ? '66%' : '100%',
                }}
              />
            </div>
          </div>

          {/* Step 1: 現在のパスワード入力 */}
          {step === 'input' && (
            <div>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Lock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-center mb-2">パスワード変更</h2>
              <p className="text-sm text-gray-600 text-center mb-6">
                現在のパスワードを入力してください
              </p>

              <form onSubmit={handleRequestChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    現在のパスワード
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full border rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="現在のパスワードを入力"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !currentPassword}
                  className="w-full px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '送信中...' : '確認コードを送信'}
                </button>
              </form>
            </div>
          )}

          {/* Step 2: 確認コードと新しいパスワード入力 */}
          {step === 'verify' && (
            <div>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-center mb-2">
                パスワード変更
              </h2>
              <p className="text-sm text-gray-600 text-center mb-6">
                メールで送信された確認コードを入力してください
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    確認コード（6桁）
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, ''))
                    }
                    required
                    className="w-full border rounded px-3 py-2 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="000000"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      新しいパスワード
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      自動生成
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full border rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="8文字以上、大小英数字を含む"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* パスワード強度インジケーター */}
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">強度:</span>
                        <span
                          className={`font-medium ${
                            passwordStrength === 0
                              ? 'text-red-600'
                              : passwordStrength === 1
                              ? 'text-orange-600'
                              : passwordStrength === 2
                              ? 'text-yellow-600'
                              : passwordStrength === 3
                              ? 'text-lime-600'
                              : 'text-green-600'
                          }`}
                        >
                          {getPasswordStrengthLabel(passwordStrength)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            passwordStrength === 0
                              ? 'bg-red-500'
                              : passwordStrength === 1
                              ? 'bg-orange-500'
                              : passwordStrength === 2
                              ? 'bg-yellow-500'
                              : passwordStrength === 3
                              ? 'bg-lime-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${(passwordStrength + 1) * 20}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <p className="font-semibold text-blue-900 mb-1">パスワード要件:</p>
                    <ul className="text-blue-800 space-y-0.5 ml-3">
                      <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                        • 8文字以上
                      </li>
                      <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>
                        • 大文字 (A-Z) を含む
                      </li>
                      <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>
                        • 小文字 (a-z) を含む
                      </li>
                      <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                        • 数字 (0-9) を含む
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    新しいパスワード（確認）
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full border rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="もう一度入力してください"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    className="flex-1 px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    戻る
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !verificationCode ||
                      !newPassword ||
                      !confirmPassword ||
                      !passwordValidation.isValid
                    }
                    className="flex-1 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '変更中...' : 'パスワードを変更'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: 完了 */}
          {step === 'complete' && (
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Key className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                パスワードを変更しました
              </h2>

              <p className="text-gray-600 mb-6">
                パスワードが正常に変更されました。<br />
                セキュリティ保護のため、他のデバイスからログアウトされました。
              </p>

              <button
                onClick={handleClose}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                閉じる
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

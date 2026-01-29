# Google reCAPTCHA v3 導入ガイド

## 概要

お問い合わせフォームに Google reCAPTCHA v3 を導入することで、より高度なスパム対策が可能になります。

## reCAPTCHA v3 の特徴

### メリット ✅
- **ユーザー体験が良い**: チェックボックスや画像選択が不要（バックグラウンドで動作）
- **スコアベース判定**: 0.0（ボット）〜1.0（人間）のスコアで判定
- **機械学習ベース**: Googleの機械学習により、高精度でボット検出
- **無料**: 月100万リクエストまで無料

### デメリット ⚠️
- **Googleアカウント必須**: Google Cloud Platformアカウントが必要
- **プライバシー懸念**: Googleにデータが送信される
- **VPNユーザーへの影響**: VPN使用時にスコアが低くなる可能性
- **追加の依存関係**: ライブラリとAPIキーの管理が必要

---

## 導入手順（このページだけに適用可能）

### 1. reCAPTCHA v3 のセットアップ

1. [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin/create) にアクセス
2. 新しいサイトを登録：
   - **ラベル**: ザイロク お問い合わせフォーム
   - **reCAPTCHAタイプ**: reCAPTCHAv3
   - **ドメイン**:
     - `localhost` (開発環境)
     - `zairoku.com` (本番環境)
3. **サイトキー**と**シークレットキー**を取得

### 2. 環境変数の設定

`.env.local` に以下を追加：

```bash
# Google reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

**Vercel本番環境にも設定が必要：**
1. Vercel Dashboard → プロジェクト選択
2. Settings → Environment Variables
3. 上記2つの環境変数を追加

### 3. npm パッケージのインストール

```bash
npm install react-google-recaptcha-v3
```

### 4. フロントエンド実装（contact/page.tsx）

```typescript
'use client'

import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import { useState } from 'react'

// reCAPTCHAラッパーコンポーネント
function ContactFormWithRecaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!executeRecaptcha) {
      console.error('reCAPTCHA not ready')
      return
    }

    try {
      // reCAPTCHAトークン取得
      const recaptchaToken = await executeRecaptcha('contact_form')

      const formData = new FormData(e.currentTarget)
      const data = {
        company: formData.get('company'),
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        employees: formData.get('employees'),
        inquiry_type: formData.get('inquiry_type'),
        message: formData.get('message'),
        recaptchaToken, // トークンを追加
      }

      const response = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        alert('送信成功')
      } else {
        alert('送信失敗')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 既存のフォーム要素 */}
    </form>
  )
}

// メインコンポーネント
export default function ContactPage() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  if (!siteKey) {
    console.warn('reCAPTCHA site key not configured')
    return <ContactFormWithoutRecaptcha /> // フォールバック
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      <ContactFormWithRecaptcha />
    </GoogleReCaptchaProvider>
  )
}
```

### 5. バックエンド実装（app/api/public/contact/route.ts）

```typescript
import { NextRequest, NextResponse } from 'next/server'

// reCAPTCHA検証関数
async function verifyRecaptcha(token: string): Promise<{ success: boolean; score: number }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY

  if (!secretKey) {
    console.warn('reCAPTCHA secret key not configured')
    return { success: true, score: 1.0 } // 設定なしの場合はスルー
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    })

    const data = await response.json()

    return {
      success: data.success,
      score: data.score || 0,
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return { success: false, score: 0 }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recaptchaToken, ...formData } = body

    // reCAPTCHA検証
    if (recaptchaToken) {
      const { success, score } = await verifyRecaptcha(recaptchaToken)

      // スコアが0.5未満はボットと判定
      if (!success || score < 0.5) {
        console.warn(`[Contact Form] reCAPTCHA failed: score=${score}`)
        return NextResponse.json(
          { error: 'セキュリティ検証に失敗しました。もう一度お試しください。' },
          { status: 400 }
        )
      }

      console.log(`[Contact Form] reCAPTCHA passed: score=${score}`)
    }

    // 既存の処理（バリデーション、メール送信など）
    // ...

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'お問い合わせの送信に失敗しました' },
      { status: 500 }
    )
  }
}
```

---

## 推奨設定

### スコア閾値の設定

| スコア範囲 | 判定 | 推奨アクション |
|----------|------|-------------|
| 0.9 - 1.0 | 非常に高い信頼性 | 許可 |
| 0.7 - 0.9 | 高い信頼性 | 許可 |
| 0.5 - 0.7 | 中程度の信頼性 | 許可（監視推奨） |
| 0.3 - 0.5 | 低い信頼性 | 追加検証または拒否 |
| 0.0 - 0.3 | ボットの可能性大 | 拒否 |

**推奨閾値: 0.5** (バランスが良い)

---

## reCAPTCHAとレート制限の組み合わせ

### 推奨する多層防御戦略

1. **reCAPTCHA** (第1層): ボット検出
2. **レート制限** (第2層): 連続送信防止（現在実装済み）
3. **入力検証** (第3層): 不正な値の拒否（現在実装済み）
4. **HTMLエスケープ** (第4層): インジェクション防止（現在実装済み）

### reCAPTCHA導入後のレート制限調整案

```typescript
// lib/security/rate-limiter.ts

// reCAPTCHA導入前（現在の設定）
contact: new RateLimiter(3, 300000, 600000), // 5分間に3回、10分ブロック

// reCAPTCHA導入後（推奨設定）
contact: new RateLimiter(5, 300000, 600000), // 5分間に5回、10分ブロック
// ※ reCAPTCHAがボットを防ぐため、正規ユーザーに余裕を持たせる
```

---

## このページだけに適用する方法

**結論: はい、可能です！**

上記の実装例は、`/contact` ページのみに適用されます。

### 理由:
1. **ページコンポーネントレベルで実装**: `/app/(public)/contact/page.tsx` のみで `GoogleReCaptchaProvider` を使用
2. **APIエンドポイントは独立**: `/api/public/contact/route.ts` は他のAPIに影響しない
3. **環境変数は全体で共有**: 他のページには影響なし（使用しなければ無視される）

### 他のフォームへの影響: なし
- ログインフォーム: 影響なし
- デモ申し込みフォーム: 影響なし
- 社内ユーザーのフォーム: 影響なし

---

## 導入判断のポイント

### reCAPTCHAを導入すべきケース ✅
- お問い合わせフォームが**公開されている**（誰でもアクセス可能）
- スパム送信が**既に発生している**、または懸念がある
- **営業時間外**に大量の迷惑メールが届く
- **Resend APIのコスト**が気になる

### reCAPTCHA不要のケース ❌
- 現在のレート制限とHTMLエスケープで**十分に防御できている**
- スパム送信が**ほとんど発生していない**
- ユーザー体験を**最優先**したい（reCAPTCHAは見えないが、一部のユーザーが不便を感じる可能性）
- プライバシーポリシーで**Googleへのデータ送信を避けたい**

---

## 現在の実装状況（2026年1月29日時点）

### 既に実装済み ✅
- [x] レート制限（5分間に3回まで）
- [x] HTMLエスケープ（インジェクション対策）
- [x] 入力検証（メールアドレス、電話番号、不審パターン検出）
- [x] 送信ログ記録

### 未実装（オプション）
- [ ] Google reCAPTCHA v3
- [ ] Supabaseへのログ保存
- [ ] 異常検知アラート

---

## まとめ

### 推奨事項

**段階的アプローチをお勧めします：**

1. **現在の実装で様子見（1〜2週間）**
   - レート制限 + HTMLエスケープ + 入力検証で十分効果があるか確認
   - ログを監視してスパムの発生状況を把握

2. **スパムが多い場合のみreCAPTCHA導入**
   - 明確にスパムが問題になった場合に検討
   - 導入は上記手順で簡単（1時間程度で完了）

3. **将来的な拡張**
   - 必要に応じてSupabaseログ保存
   - 異常検知アラート（Slack通知など）

### 現時点での結論

**今すぐreCAPTCHAを導入する必要はありません。**

理由：
- レート制限とHTMLエスケープで基本的な防御は完了
- reCAPTCHAは必要になってから導入しても遅くない
- ユーザー体験を優先すべき

**ただし、今後スパムが増えた場合は、このガイドに従って簡単に導入できます。**

---

## 参考リンク

- [Google reCAPTCHA v3 公式ドキュメント](https://developers.google.com/recaptcha/docs/v3)
- [react-google-recaptcha-v3 NPMパッケージ](https://www.npmjs.com/package/react-google-recaptcha-v3)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)

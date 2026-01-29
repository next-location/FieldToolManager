'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { trackContactPageView, trackContactFormSubmit } from '@/lib/analytics'

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // ページ表示時にトラッキング
  useEffect(() => {
    // gtagが読み込まれるまで少し待つ
    const timer = setTimeout(() => {
      trackContactPageView()
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    const formData = new FormData(e.currentTarget)
    const data = {
      company: formData.get('company'),
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      employees: formData.get('employees'),
      inquiry_type: formData.get('inquiry_type'),
      message: formData.get('message'),
    }

    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setSubmitStatus('success')
        e.currentTarget.reset()

        // GA4にコンバージョンイベント送信
        trackContactFormSubmit({
          inquiryType: data.inquiry_type as string,
        })
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Contact form submission error:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/">
                <Image
                  src="/ザイロクロゴ02.png"
                  alt="ザイロク"
                  width={150}
                  height={40}
                  priority
                  className="cursor-pointer w-auto h-[28px] sm:h-[32px]"
                />
              </Link>
            </div>
            <Link
              href="/contact"
              className="px-4 py-2 sm:px-10 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs sm:text-sm font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </header>

      {/* ヘッダーの高さ分のスペーサー */}
      <div className="h-[60px] sm:h-[72px]"></div>

      {/* お問い合わせフォーム */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 text-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">お問い合わせ</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 text-left">
            ザイロクに関するご質問やお見積りのご依頼は、下記フォームよりお気軽にお問い合わせください。
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-12">
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-semibold">お問い合わせを受け付けました。</p>
              <p className="text-green-700 text-sm mt-1">ご入力いただいたメールアドレスに確認メールをお送りしました。2営業日以内に担当者よりご連絡いたします。</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold">送信に失敗しました。</p>
              <p className="text-red-700 text-sm mt-1">お手数ですが、時間をおいて再度お試しいただくか、直接 info@zairoku.com までメールにてご連絡ください。</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* 会社名 */}
            <div>
              <label htmlFor="company" className="block text-sm font-bold text-gray-900 mb-2">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="company"
                name="company"
                required
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="例：株式会社サンプル"
              />
            </div>

            {/* お名前 */}
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-900 mb-2">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                maxLength={50}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="例：山田 太郎"
              />
            </div>

            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-900 mb-2">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="例：sample@example.com"
              />
            </div>

            {/* 電話番号 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-gray-900 mb-2">
                電話番号
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                maxLength={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="例：03-1234-5678"
              />
            </div>

            {/* 従業員数 */}
            <div>
              <label htmlFor="employees" className="block text-sm font-bold text-gray-900 mb-2">
                従業員数
              </label>
              <select
                id="employees"
                name="employees"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">選択してください</option>
                <option value="1-10">1〜10名</option>
                <option value="11-30">11〜30名</option>
                <option value="31-50">31〜50名</option>
                <option value="51-100">51〜100名</option>
                <option value="101+">101名以上</option>
              </select>
            </div>

            {/* お問い合わせ種別 */}
            <div>
              <label htmlFor="inquiry_type" className="block text-sm font-bold text-gray-900 mb-2">
                お問い合わせ種別 <span className="text-red-500">*</span>
              </label>
              <select
                id="inquiry_type"
                name="inquiry_type"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">選択してください</option>
                <option value="estimate">お見積り依頼</option>
                <option value="demo">デモ・説明希望</option>
                <option value="question">サービスに関する質問</option>
                <option value="other">その他</option>
              </select>
            </div>

            {/* お問い合わせ内容 */}
            <div>
              <label htmlFor="message" className="block text-sm font-bold text-gray-900 mb-2">
                お問い合わせ内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                maxLength={2000}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="お問い合わせ内容をご記入ください"
              />
            </div>

            {/* プライバシーポリシー */}
            <div className="bg-blue-50 rounded-lg p-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="privacy_policy"
                  required
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                />
                <span className="ml-3 text-sm text-gray-700">
                  <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">プライバシーポリシー</Link>に同意します <span className="text-red-500">*</span>
                </span>
              </label>
            </div>

            {/* 送信ボタン */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-bold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '送信中...' : '送信する'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gradient-to-br from-blue-900 to-blue-800 text-blue-100 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-xs sm:text-sm text-center text-blue-200">
            © 2025 Zairoku. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

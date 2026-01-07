'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import Link from 'next/link'

export default function PaymentPageFAB() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolled(true)
      } else if (currentScrollY < lastScrollY) {
        setIsScrolled(false)
      }

      lastScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* メニューオプション */}
      {isMenuOpen && (
        <div className="sm:hidden fixed right-4 bottom-36 flex flex-col gap-3 z-40 animate-fadeIn">
          <Link
            href="/payments/new?type=receipt"
            className="flex items-center justify-end gap-2"
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="bg-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium text-gray-900">
              入金登録
            </span>
            <div className="w-12 h-12 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center">
              <Plus className="h-5 w-5" />
            </div>
          </Link>
          <Link
            href="/payments/new?type=payment"
            className="flex items-center justify-end gap-2"
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="bg-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium text-gray-900">
              支払登録
            </span>
            <div className="w-12 h-12 bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center">
              <Plus className="h-5 w-5" />
            </div>
          </Link>
        </div>
      )}

      {/* 背景オーバーレイ */}
      {isMenuOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* メインFABボタン */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`sm:hidden fixed right-4 bottom-20 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center z-40 ${
          isScrolled ? 'w-10 h-10' : 'w-14 h-14'
        }`}
        aria-label="入出金登録"
      >
        {isMenuOpen ? (
          <X className={isScrolled ? 'h-5 w-5' : 'h-6 w-6'} />
        ) : (
          <Plus className={isScrolled ? 'h-5 w-5' : 'h-6 w-6'} />
        )}
      </button>
    </>
  )
}

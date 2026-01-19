'use client'

import { useEffect } from 'react'

export function MobileKeyboardEnterHint() {
  useEffect(() => {
    // Enterキー押下時にキーボードを閉じる処理
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
        // IME入力中（日本語変換中）はスキップ
        if (e.isComposing) {
          return
        }

        const type = e.target.getAttribute('type')
        // input要素（textarea以外）でEnterキーが押されたらblur
        if (['text', 'email', 'password', 'number', 'tel', 'url'].includes(type || '')) {
          e.preventDefault()
          e.target.blur()
        }
      }
    }

    // 全てのinput要素にenterkeyhint="done"を追加
    const addEnterKeyHint = (input: HTMLInputElement) => {
      if (!input.hasAttribute('enterkeyhint')) {
        input.setAttribute('enterkeyhint', 'done')
      }
    }

    const inputs = document.querySelectorAll<HTMLInputElement>(
      'input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="tel"], input[type="url"]'
    )

    inputs.forEach(addEnterKeyHint)

    // MutationObserverで動的に追加される要素も監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const newInputs = node.querySelectorAll<HTMLInputElement>(
              'input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="tel"], input[type="url"]'
            )
            newInputs.forEach(addEnterKeyHint)

            // node自体がinputの場合
            if (node instanceof HTMLInputElement) {
              const type = node.getAttribute('type')
              if (['text', 'email', 'password', 'number', 'tel', 'url'].includes(type || '')) {
                addEnterKeyHint(node)
              }
            }
          }
        })
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Enterキーイベントリスナーを追加
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      observer.disconnect()
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return null
}

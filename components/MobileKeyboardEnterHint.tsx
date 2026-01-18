'use client'

import { useEffect } from 'react'

export function MobileKeyboardEnterHint() {
  useEffect(() => {
    // 全てのinput要素にenterkeyhint="done"を追加
    const inputs = document.querySelectorAll<HTMLInputElement>(
      'input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="tel"], input[type="url"]'
    )

    inputs.forEach((input) => {
      if (!input.hasAttribute('enterkeyhint')) {
        input.setAttribute('enterkeyhint', 'done')
      }
    })

    // MutationObserverで動的に追加される要素も監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const newInputs = node.querySelectorAll<HTMLInputElement>(
              'input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="tel"], input[type="url"]'
            )
            newInputs.forEach((input) => {
              if (!input.hasAttribute('enterkeyhint')) {
                input.setAttribute('enterkeyhint', 'done')
              }
            })

            // node自体がinputの場合
            if (node instanceof HTMLInputElement) {
              const type = node.getAttribute('type')
              if (['text', 'email', 'password', 'number', 'tel', 'url'].includes(type || '')) {
                if (!node.hasAttribute('enterkeyhint')) {
                  node.setAttribute('enterkeyhint', 'done')
                }
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

    return () => observer.disconnect()
  }, [])

  return null
}

'use client'

import { useEffect, useState } from 'react'
import { TerminalDisplay } from './TerminalDisplay'

export default function TerminalPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  if (!token) return null

  return <TerminalDisplay token={token} />
}

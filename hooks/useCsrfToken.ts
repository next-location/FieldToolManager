import { useEffect, useState } from 'react';

/**
 * CSRFトークンを取得するカスタムフック
 * SSR対応: token初期値を空文字列にすることでHydration Errorを防ぐ
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchToken() {
      console.log('[useCsrfToken] Starting CSRF token fetch');

      if (mounted) {
        setLoading(true);
      }

      try {
        console.log('[useCsrfToken] Fetching from /api/csrf-token');
        const response = await fetch('/api/csrf-token');

        console.log('[useCsrfToken] Response status:', response.status);
        if (!response.ok) {
          throw new Error('Failed to fetch CSRF token');
        }

        const data = await response.json();
        console.log('[useCsrfToken] Received token:', data.token?.substring(0, 10) + '...');

        if (mounted) {
          setToken(data.token);
          setError(null);
          console.log('[useCsrfToken] Token set successfully');
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          console.error('[useCsrfToken] Failed to fetch CSRF token:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('[useCsrfToken] Loading complete');
        }
      }
    }

    fetchToken();

    return () => {
      mounted = false;
    };
  }, []);

  return { token, loading, error };
}

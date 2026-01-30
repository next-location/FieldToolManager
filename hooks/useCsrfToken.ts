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
      if (mounted) {
        setLoading(true);
      }

      try {
        const response = await fetch('/api/csrf-token');

        if (!response.ok) {
          throw new Error('Failed to fetch CSRF token');
        }

        const data = await response.json();

        if (mounted) {
          setToken(data.token);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          console.error('Failed to fetch CSRF token:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
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

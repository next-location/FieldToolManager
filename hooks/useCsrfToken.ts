import { useEffect, useState } from 'react';

/**
 * CSRFトークンを取得するカスタムフック
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchToken() {
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

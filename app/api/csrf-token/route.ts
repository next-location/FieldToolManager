import { getCsrfToken } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';

/**
 * CSRFトークン取得API
 * GET /api/csrf-token
 */
export async function GET() {
  try {
    const token = await getCsrfToken();
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Failed to generate CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[Test API] GET called');
  return NextResponse.json({ test: 'GET OK' });
}

export async function POST(request: NextRequest) {
  console.log('[Test API] POST called');
  return NextResponse.json({ test: 'POST OK' });
}
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('TEST ROUTE CALLED');
  return NextResponse.json({ test: 'OK' });
}
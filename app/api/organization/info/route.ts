import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subdomain = searchParams.get('subdomain')

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // サブドメインから組織情報を取得
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('id, name, subdomain')
      .eq('subdomain', subdomain)
      .single()

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      name: organization.name,
      subdomain: organization.subdomain,
    })
  } catch (error) {
    console.error('[ORGANIZATION INFO API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

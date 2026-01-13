import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        error: 'Not authenticated',
        authError: authError?.message
      }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({
        error: 'User data not found',
        userError: userError?.message
      }, { status: 404 })
    }

    // Get sites for this organization
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, name, organization_id, deleted_at')
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      organization_id: userData.organization_id,
      sites: sites || [],
      sitesError: sitesError?.message,
      totalSites: sites?.length || 0,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

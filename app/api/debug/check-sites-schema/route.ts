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

    // Get a sample site to see all columns
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .limit(1)

    // Get movements for this organization
    const { data: movements, error: movementsError } = await supabase
      .from('tool_movements')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      organization_id: userData.organization_id,
      sites: {
        success: !sitesError,
        error: sitesError?.message,
        data: sites || [],
        columns: sites && sites.length > 0 ? Object.keys(sites[0]) : [],
      },
      movements: {
        success: !movementsError,
        error: movementsError?.message,
        data: movements || [],
        count: movements?.length || 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

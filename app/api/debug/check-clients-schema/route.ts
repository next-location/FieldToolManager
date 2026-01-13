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

    // Try to get clients with different field combinations
    const { data: clientsWithCode, error: errorWithCode } = await supabase
      .from('clients')
      .select('id, name, code')
      .eq('organization_id', userData.organization_id)
      .limit(3)

    const { data: clientsWithoutCode, error: errorWithoutCode } = await supabase
      .from('clients')
      .select('id, name')
      .eq('organization_id', userData.organization_id)
      .limit(3)

    return NextResponse.json({
      organization_id: userData.organization_id,

      // With code column
      withCode: {
        success: !errorWithCode,
        error: errorWithCode?.message,
        data: clientsWithCode || [],
      },

      // Without code column
      withoutCode: {
        success: !errorWithoutCode,
        error: errorWithoutCode?.message,
        data: clientsWithoutCode || [],
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

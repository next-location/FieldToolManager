import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      companyName,
      personName,
      email,
      phone,
      department,
      employeeCount,
      toolCount,
      timeline,
      message
    } = body

    // 必須項目チェック
    if (!companyName || !personName || !email || !phone) {
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      )
    }

    // IPアドレス取得
    const headersList = headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // 24時間以内の重複申請チェック
    const { data: duplicateCheck } = await supabase.rpc('check_duplicate_demo_request', {
      p_email: email,
      p_ip_address: ipAddress
    })

    if (duplicateCheck) {
      return NextResponse.json(
        { error: '24時間以内に同じメールアドレスまたはIPアドレスから申請がありました。しばらく時間をおいてから再度お試しください。' },
        { status: 429 }
      )
    }

    // デモ申請を登録
    const { data: demoRequest, error: insertError } = await supabase
      .from('demo_requests')
      .insert({
        company_name: companyName,
        person_name: personName,
        email,
        phone,
        department: department || null,
        employee_count: employeeCount || null,
        tool_count: toolCount || null,
        timeline: timeline || null,
        message: message || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert demo request:', insertError)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      )
    }

    // デモアカウント自動生成（非同期処理）
    try {
      await fetch(`${request.nextUrl.origin}/api/demo/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ demoRequestId: demoRequest.id })
      })
    } catch (error) {
      console.error('Failed to create demo account:', error)
      // エラーでも申請は成功として扱う（後で手動対応可能）
    }

    return NextResponse.json({
      success: true,
      message: 'デモ申請を受け付けました'
    })

  } catch (error) {
    console.error('Demo request error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

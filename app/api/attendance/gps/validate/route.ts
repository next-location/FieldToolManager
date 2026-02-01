import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GPS座標間の距離を計算（Haversine公式）
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // 地球の半径（メートル）
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // 距離（メートル）
}

// POST /api/attendance/gps/validate
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, is_shift_work, work_pattern_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    // リクエストボディ取得
    const body = await request.json()
    const { latitude, longitude, location_type, site_id } = body

    // 必須パラメータチェック
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'GPS座標が必要です' },
        { status: 400 }
      )
    }

    // 組織のGPS設定を取得
    const { data: orgSettings, error: settingsError } = await supabase
      .from('organization_attendance_settings')
      .select('gps_requirement, gps_radius')
      .eq('organization_id', userData.organization_id)
      .single()

    if (settingsError || !orgSettings) {
      // 設定がない場合はデフォルト値を使用
      return NextResponse.json({
        valid: true,
        message: 'GPS設定が未設定のため、検証をスキップしました',
      })
    }

    // GPS検証が不要な場合
    if (orgSettings.gps_requirement === 'none') {
      return NextResponse.json({
        valid: true,
        message: 'GPS検証は不要です',
      })
    }

    // GPS検証が必要かどうかを判定
    let gpsRequired = false
    const gpsReq = orgSettings.gps_requirement

    if (gpsReq === 'all') {
      gpsRequired = true
    } else if (gpsReq === 'shift_only' && userData.is_shift_work) {
      gpsRequired = true
    } else if (gpsReq === 'shift_night') {
      // シフト制または夜勤パターンの場合
      if (userData.is_shift_work) {
        gpsRequired = true
      } else if (userData.work_pattern_id) {
        // 夜勤パターンかチェック
        const { data: workPattern } = await supabase
          .from('work_patterns')
          .select('is_night_shift')
          .eq('id', userData.work_pattern_id)
          .single()

        if (workPattern?.is_night_shift) {
          gpsRequired = true
        }
      }
    }

    // GPS検証が不要な場合
    if (!gpsRequired) {
      return NextResponse.json({
        valid: true,
        message: 'このユーザーはGPS検証対象外です',
      })
    }

    // 検証対象の場所を取得
    const allowedRadius = orgSettings.gps_radius || 100 // デフォルト100m

    // 事務所出勤の場合
    if (location_type === 'office') {
      // 打刻可能エリアテーブルから事務所エリアを取得
      const { data: allowedAreas, error: areasError } = await supabase
        .from('attendance_allowed_areas')
        .select('name, latitude, longitude, radius')
        .eq('organization_id', userData.organization_id)
        .eq('is_active', true)

      if (areasError || !allowedAreas || allowedAreas.length === 0) {
        return NextResponse.json({
          valid: false,
          message: '打刻可能エリアが設定されていません。管理者に確認してください',
        })
      }

      // 最も近いエリアを探す
      let nearestArea = null
      let minDistance = Infinity

      for (const area of allowedAreas) {
        if (!area.latitude || !area.longitude) continue

        const distance = calculateDistance(
          latitude,
          longitude,
          area.latitude,
          area.longitude
        )

        if (distance < minDistance) {
          minDistance = distance
          nearestArea = {
            ...area,
            distance,
          }
        }
      }

      if (!nearestArea) {
        return NextResponse.json({
          valid: false,
          message: '打刻可能エリアが見つかりません',
        })
      }

      const effectiveRadius = nearestArea.radius || allowedRadius

      if (nearestArea.distance <= effectiveRadius) {
        return NextResponse.json({
          valid: true,
          area: nearestArea.name,
          distance: Math.round(nearestArea.distance),
          radius: effectiveRadius,
          message: `${nearestArea.name}の範囲内です（${Math.round(nearestArea.distance)}m）`,
        })
      } else {
        return NextResponse.json({
          valid: false,
          area: nearestArea.name,
          distance: Math.round(nearestArea.distance),
          radius: effectiveRadius,
          message: `最寄りの${nearestArea.name}から${Math.round(nearestArea.distance)}m離れています（許容範囲: ${effectiveRadius}m）`,
        })
      }
    }

    // 現場出勤の場合
    if (location_type === 'site' && site_id) {
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('name, latitude, longitude, gps_radius')
        .eq('id', site_id)
        .eq('organization_id', userData.organization_id)
        .single()

      if (siteError || !site) {
        return NextResponse.json({
          valid: false,
          message: '現場が見つかりません',
        })
      }

      if (!site.latitude || !site.longitude) {
        // 現場に位置情報が設定されていない場合は検証をスキップ
        return NextResponse.json({
          valid: true,
          message: '現場の位置情報が未設定のため、GPS検証をスキップしました',
        })
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        site.latitude,
        site.longitude
      )

      const effectiveRadius = site.gps_radius || allowedRadius

      if (distance <= effectiveRadius) {
        return NextResponse.json({
          valid: true,
          site: site.name,
          distance: Math.round(distance),
          radius: effectiveRadius,
          message: `${site.name}の範囲内です（${Math.round(distance)}m）`,
        })
      } else {
        return NextResponse.json({
          valid: false,
          site: site.name,
          distance: Math.round(distance),
          radius: effectiveRadius,
          message: `${site.name}から${Math.round(distance)}m離れています（許容範囲: ${effectiveRadius}m）`,
        })
      }
    }

    // 在宅勤務の場合はGPS検証をスキップ
    if (location_type === 'remote') {
      return NextResponse.json({
        valid: true,
        message: '在宅勤務のためGPS検証は不要です',
      })
    }

    return NextResponse.json({
      valid: true,
      message: 'GPS検証完了',
    })
  } catch (error) {
    console.error('POST /api/attendance/gps/validate error:', error)
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    )
  }
}
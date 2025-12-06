import { createClient } from '@/lib/supabase/server'

/**
 * 作業報告書番号を生成する
 * フォーマット: WR-YYYY-NNN (例: WR-2025-001)
 *
 * @param organizationId - 組織ID
 * @returns 生成された作業報告書番号
 */
export async function generateWorkReportNumber(organizationId: string): Promise<string> {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()

  // トランザクション的な処理のため、最大3回リトライ
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // 現在の年のシーケンスを取得または作成
      const { data: sequence, error: selectError } = await supabase
        .from('work_report_number_sequences')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('year', currentYear)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = NOT FOUND以外のエラー
        throw selectError
      }

      let nextNumber: number

      if (!sequence) {
        // シーケンスが存在しない場合は新規作成
        const { data: newSequence, error: insertError } = await supabase
          .from('work_report_number_sequences')
          .insert({
            organization_id: organizationId,
            year: currentYear,
            last_number: 1,
          })
          .select()
          .single()

        if (insertError) {
          // 同時作成の競合の場合はリトライ
          if (insertError.code === '23505') {
            continue
          }
          throw insertError
        }

        nextNumber = 1
      } else {
        // 既存のシーケンスを更新
        nextNumber = sequence.last_number + 1

        const { error: updateError } = await supabase
          .from('work_report_number_sequences')
          .update({ last_number: nextNumber })
          .eq('id', sequence.id)
          .eq('last_number', sequence.last_number) // 楽観的ロック

        if (updateError) {
          // 楽観的ロックの失敗の場合はリトライ
          continue
        }
      }

      // 作業報告書番号を生成 (例: WR-2025-001)
      const reportNumber = `WR-${currentYear}-${String(nextNumber).padStart(3, '0')}`
      return reportNumber

    } catch (error) {
      if (attempt === 2) {
        // 最後のリトライでも失敗した場合
        console.error('Failed to generate work report number after 3 attempts:', error)
        throw error
      }
      // リトライ前に少し待機
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
    }
  }

  throw new Error('Failed to generate work report number')
}

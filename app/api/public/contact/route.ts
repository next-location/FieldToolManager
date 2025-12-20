import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { company, name, email, phone, employees, inquiry_type, message } = body

    // バリデーション
    if (!company || !name || !email || !inquiry_type || !message) {
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      )
    }

    // 管理者への通知メール
    await resend.emails.send({
      from: 'noreply@zairoku.com',
      to: 'info@zairoku.com',
      subject: `【ザイロク】新規お問い合わせ - ${company}`,
      html: `
        <h2>新規お問い合わせが届きました</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold; width: 150px;">会社名</td>
            <td style="border: 1px solid #ddd; padding: 12px;">${company}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold;">お名前</td>
            <td style="border: 1px solid #ddd; padding: 12px;">${name}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold;">メールアドレス</td>
            <td style="border: 1px solid #ddd; padding: 12px;">${email}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold;">電話番号</td>
            <td style="border: 1px solid #ddd; padding: 12px;">${phone || '未入力'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold;">従業員数</td>
            <td style="border: 1px solid #ddd; padding: 12px;">${employees || '未入力'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold;">お問い合わせ種別</td>
            <td style="border: 1px solid #ddd; padding: 12px;">${
              inquiry_type === 'estimate' ? 'お見積り依頼' :
              inquiry_type === 'demo' ? 'デモ・説明希望' :
              inquiry_type === 'question' ? 'サービスに関する質問' :
              'その他'
            }</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold; vertical-align: top;">お問い合わせ内容</td>
            <td style="border: 1px solid #ddd; padding: 12px; white-space: pre-wrap;">${message}</td>
          </tr>
        </table>
      `,
    })

    // お客様への自動返信メール
    await resend.emails.send({
      from: 'noreply@zairoku.com',
      to: email,
      subject: '【ザイロク】お問い合わせを受け付けました',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">お問い合わせありがとうございます</h2>
          <p>${name} 様</p>
          <p>この度は、ザイロクにお問い合わせいただき、誠にありがとうございます。</p>
          <p>以下の内容でお問い合わせを受け付けました。</p>

          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold; width: 150px;">会社名</td>
              <td style="border: 1px solid #ddd; padding: 12px;">${company}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold;">お名前</td>
              <td style="border: 1px solid #ddd; padding: 12px;">${name}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold;">メールアドレス</td>
              <td style="border: 1px solid #ddd; padding: 12px;">${email}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold;">電話番号</td>
              <td style="border: 1px solid #ddd; padding: 12px;">${phone || '未入力'}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold;">従業員数</td>
              <td style="border: 1px solid #ddd; padding: 12px;">${employees || '未入力'}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold;">お問い合わせ種別</td>
              <td style="border: 1px solid #ddd; padding: 12px;">${
                inquiry_type === 'estimate' ? 'お見積り依頼' :
                inquiry_type === 'demo' ? 'デモ・説明希望' :
                inquiry_type === 'question' ? 'サービスに関する質問' :
                'その他'
              }</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; background-color: #f9f9f9; font-weight: bold; vertical-align: top;">お問い合わせ内容</td>
              <td style="border: 1px solid #ddd; padding: 12px; white-space: pre-wrap;">${message}</td>
            </tr>
          </table>

          <p>担当者が内容を確認の上、2営業日以内にご連絡させていただきます。</p>
          <p>今しばらくお待ちくださいますようお願い申し上げます。</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />

          <div style="color: #666; font-size: 14px;">
            <p style="margin: 5px 0;"><strong>株式会社ザイロク</strong></p>
            <p style="margin: 5px 0;">Email: info@zairoku.com</p>
            <p style="margin: 5px 0;">※このメールは自動送信されています。このメールに返信いただいても対応できませんので、ご了承ください。</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'お問い合わせの送信に失敗しました' },
      { status: 500 }
    )
  }
}

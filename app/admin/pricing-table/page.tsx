'use client';

export default function PricingTablePage() {
  return (
    <>
      <style jsx global>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
          margin: 0;
          padding: 20px;
          background: #f9fafb;
          color: #111827;
        }
        .pricing-container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .pricing-container h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1E6FFF;
          margin-bottom: 10px;
        }
        .pricing-container h2 {
          font-size: 20px;
          font-weight: 600;
          color: #374151;
          margin-top: 40px;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #E5E7EB;
        }
        .pricing-container h3 {
          font-size: 16px;
          font-weight: 600;
          color: #4B5563;
          margin-top: 24px;
          margin-bottom: 12px;
        }
        .pricing-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          font-size: 14px;
        }
        .pricing-table th {
          background: #F3F4F6;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border: 1px solid #E5E7EB;
        }
        .pricing-table td {
          padding: 12px 16px;
          border: 1px solid #E5E7EB;
        }
        .pricing-table tbody tr:hover {
          background: #F9FAFB;
        }
        .price-value {
          font-weight: 600;
          color: #1E6FFF;
        }
        .note-box {
          font-size: 13px;
          color: #6B7280;
          margin-top: 8px;
          padding: 12px;
          background: #FEF3C7;
          border-left: 4px solid #F59E0B;
          border-radius: 4px;
        }
        .badge-required {
          display: inline-block;
          padding: 2px 8px;
          background: #EF4444;
          color: white;
          font-size: 11px;
          font-weight: 600;
          border-radius: 4px;
          margin-left: 8px;
        }
        .badge-optional {
          display: inline-block;
          padding: 2px 8px;
          background: #10B981;
          color: white;
          font-size: 11px;
          font-weight: 600;
          border-radius: 4px;
          margin-left: 8px;
        }
        .pricing-container ul {
          margin: 8px 0;
          padding-left: 24px;
        }
        .pricing-container li {
          margin: 4px 0;
          color: #4B5563;
          font-size: 14px;
        }
        .summary-box {
          background: #EFF6FF;
          padding: 20px;
          border-radius: 8px;
          border: 2px solid #BFDBFE;
          margin-top: 32px;
        }
        .summary-box h3 {
          color: #1E40AF;
          margin-top: 0;
        }
        @media print {
          body { background: white; padding: 0; }
          .pricing-container { box-shadow: none; }
        }
      `}</style>

      <div className="pricing-container">
        <h1>ザイロク 初期費用料金表</h1>
        <p style={{ color: '#6B7280', marginBottom: '32px' }}>
          最終更新: 2025年12月 | 価格は全て税別表示
        </p>

        <h2>1. 基本設定費<span className="badge-required">必須</span></h2>
        <table className="pricing-table">
          <thead>
            <tr>
              <th>プラン</th>
              <th>対象人数</th>
              <th>含まれる内容</th>
              <th className="price-value">料金</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>スタート</strong></td>
              <td>~10名</td>
              <td>
                <ul>
                  <li>アカウント設定</li>
                  <li>権限設定</li>
                  <li>基本マスタ設定</li>
                  <li>通知設定</li>
                </ul>
              </td>
              <td className="price-value">¥10,000</td>
            </tr>
            <tr>
              <td><strong>スタンダード</strong></td>
              <td>11~30名</td>
              <td>同上</td>
              <td className="price-value">¥28,000</td>
            </tr>
            <tr>
              <td><strong>ビジネス</strong></td>
              <td>31~50名</td>
              <td>同上</td>
              <td className="price-value">¥45,000</td>
            </tr>
            <tr>
              <td><strong>プロ</strong></td>
              <td>51~100名</td>
              <td>同上</td>
              <td className="price-value">¥80,000</td>
            </tr>
            <tr>
              <td><strong>エンタープライズ</strong></td>
              <td>101名以上</td>
              <td>同上</td>
              <td className="price-value">要相談</td>
            </tr>
          </tbody>
        </table>

        <h2>2. データ登録費<span className="badge-optional">オプション</span></h2>
        <p style={{ color: '#6B7280', marginBottom: '16px' }}>
          既存の道具・消耗品・重機データをシステムに登録する作業費用です。CSV形式でのデータ取込に対応しています。
        </p>
        <table className="pricing-table">
          <thead>
            <tr>
              <th>サービス</th>
              <th>対象件数</th>
              <th className="price-value">料金</th>
              <th>備考</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowSpan={4}><strong>道具・消耗品・重機<br />データ登録</strong></td>
              <td>~100件</td>
              <td className="price-value">¥20,000</td>
              <td>CSV取込対応</td>
            </tr>
            <tr>
              <td>~500件</td>
              <td className="price-value">¥50,000</td>
              <td>CSV取込対応</td>
            </tr>
            <tr>
              <td>~1,000件</td>
              <td className="price-value">¥80,000</td>
              <td>CSV取込対応</td>
            </tr>
            <tr>
              <td>1,000件超</td>
              <td className="price-value">要相談</td>
              <td>大量データは別途お見積り</td>
            </tr>
          </tbody>
        </table>

        <h2>3. オンサイト作業費<span className="badge-optional">オプション</span></h2>
        <p style={{ color: '#6B7280', marginBottom: '16px' }}>
          現地での作業が必要な場合の費用です。時給制で最低3時間から受付いたします。
        </p>
        <table className="pricing-table">
          <thead>
            <tr>
              <th>サービス</th>
              <th>内容</th>
              <th className="price-value">料金</th>
              <th>備考</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>QRコード生成・印刷</strong></td>
              <td>現地でのQRコード貼り付け作業（5時間）</td>
              <td className="price-value">¥15,000</td>
              <td>
                <ul>
                  <li>時給 ¥3,000</li>
                  <li>最低3時間から受付</li>
                  <li>消耗品代は先方負担</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td><strong>棚卸し作業</strong></td>
              <td>現地での棚卸しサポート（5時間）</td>
              <td className="price-value">¥15,000</td>
              <td>
                <ul>
                  <li>時給 ¥3,000</li>
                  <li>最低3時間から受付</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>

        <h2>4. 研修費用<span className="badge-optional">オプション</span></h2>
        <table className="pricing-table">
          <thead>
            <tr>
              <th>研修タイプ</th>
              <th>対象</th>
              <th className="price-value">オンライン</th>
              <th className="price-value">オフライン</th>
              <th>備考</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>管理者研修</strong></td>
              <td>~5名</td>
              <td className="price-value">¥30,000</td>
              <td className="price-value">¥60,000</td>
              <td>システム管理者向け詳細研修（2時間）</td>
            </tr>
            <tr>
              <td><strong>現場スタッフ研修</strong></td>
              <td>~20名</td>
              <td className="price-value">¥5,000</td>
              <td className="price-value">¥50,000</td>
              <td>
                <ul>
                  <li>オンライン: 動画研修</li>
                  <li>オフライン: 現地実践研修（2時間）</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>

        <h2>5. 交通費・宿泊費・諸経費<span className="badge-optional">オプション</span></h2>
        <p style={{ color: '#6B7280', marginBottom: '16px' }}>
          オンサイト作業やオフライン研修が必要な場合の追加費用です。
        </p>
        <table className="pricing-table">
          <thead>
            <tr>
              <th>地域</th>
              <th className="price-value">交通費</th>
              <th className="price-value">宿泊費</th>
              <th className="price-value">日当</th>
              <th>備考</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>東京23区</strong></td>
              <td className="price-value">¥2,000</td>
              <td className="price-value">-</td>
              <td className="price-value">-</td>
              <td>-</td>
            </tr>
            <tr>
              <td><strong>関東圏内</strong></td>
              <td className="price-value">¥5,000~¥10,000</td>
              <td className="price-value">-</td>
              <td className="price-value">-</td>
              <td>距離により変動</td>
            </tr>
            <tr>
              <td><strong>東海・関西</strong></td>
              <td className="price-value">¥20,000~¥30,000</td>
              <td className="price-value">¥10,000</td>
              <td className="price-value">¥3,000</td>
              <td>新幹線利用</td>
            </tr>
            <tr>
              <td><strong>その他地域</strong></td>
              <td className="price-value">実費</td>
              <td className="price-value">¥10,000</td>
              <td className="price-value">¥3,000</td>
              <td>要事前見積</td>
            </tr>
          </tbody>
        </table>

        <div className="summary-box">
          <h3>💡 初期費用を抑えるポイント</h3>
          <ul>
            <li><strong>自社でデータ登録:</strong> CSV形式でデータを整備して自社で登録すれば、データ登録費(¥20,000~¥80,000)が不要</li>
            <li><strong>オンライン研修を活用:</strong> オフライン研修(¥50,000~¥60,000)の代わりに、オンライン研修(¥5,000~¥30,000)を選択</li>
            <li><strong>QRコード貼付を自社で:</strong> システム生成したQRコードを印刷・貼付する作業を自社で行えば、オンサイト費用(¥15,000~)が不要</li>
          </ul>
          <p style={{ marginTop: '16px', color: '#1E40AF', fontWeight: '600' }}>
            → 最小構成の場合、初期費用は基本設定費のみ（¥10,000~¥80,000）で開始可能です
          </p>
        </div>

        <div className="note-box">
          <strong>📌 注意事項</strong>
          <ul style={{ marginTop: '8px', marginBottom: '0' }}>
            <li>上記価格は全て税別表示です</li>
            <li>実際の費用は契約内容により異なる場合があります</li>
            <li>カスタマイズ対応やエンタープライズプランは別途お見積りとなります</li>
          </ul>
        </div>
      </div>
    </>
  );
}

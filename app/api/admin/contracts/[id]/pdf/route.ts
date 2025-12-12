import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // スーパーアドミン認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 契約データを取得
    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        *,
        organizations (
          name,
          billing_address
        )
      `)
      .eq('id', id)
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: '契約が見つかりません' }, { status: 404 });
    }

    // jsPDFでPDFを作成
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 日本語フォントを読み込んでBase64に変換
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');
    const fontData = fs.readFileSync(fontPath);
    const fontBase64 = fontData.toString('base64');

    // 日本語フォントを登録
    doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
    doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
    doc.setFont('NotoSansJP');

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '令和〇年〇月〇日';
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const reiwaYear = year - 2018;
      return `令和${reiwaYear}年${date.getMonth() + 1}月${date.getDate()}日`;
    };

    const customerName = contract.organizations?.name || '';
    const customerAddress = contract.organizations?.billing_address || '';
    const customerRepresentative = contract.billing_contact_name || '';

    let yPos = 20;

    // タイトル
    doc.setFontSize(18);
    doc.text('クラウドサービス「ザイロク」利用契約書', 105, yPos, { align: 'center' });
    yPos += 15;

    // 前文
    doc.setFontSize(10);
    const preamble = `${customerName}（以下「甲」という）、株式会社ネクストロケーション（以下「乙」という）、および株式会社リノバンス（以下「丙」という）は、乙および丙が共同で提供するクラウドサービス「ザイロク」（以下「本サービス」という）の利用に関し、以下の通り契約を締結する。`;
    const preambleLines = doc.splitTextToSize(preamble, 170);
    doc.text(preambleLines, 20, yPos);
    yPos += preambleLines.length * 5 + 5;

    // 各条文を追加
    const articles = [
      {
        title: '第１条（定義と役割）',
        items: [
          '本契約において、乙および丙は連帯して本サービスを甲に提供するものとする。',
          '乙はシステムの開発・運用・保守を担当し、丙は甲への導入支援・窓口業務を担当する。',
        ],
      },
      {
        title: '第２条（利用料金の支払いと遅延措置）',
        items: [
          '甲は、別途定める利用申込書に基づき、利用料金を乙が指定する銀行口座へ支払う。',
          '支払期日までに支払いが確認できない場合、乙および丙は何らの通知催告を要せず、直ちに本サービスの提供を停止（アカウントロック）することができる。',
          '甲は、支払いが遅延した場合、支払期日の翌日から支払済みに至るまで、年14.6％の割合による遅延損害金を加算して支払うものとする。',
        ],
      },
      {
        title: '第３条（IDおよびパスワードの管理）',
        items: [
          '甲は、本サービスを利用するためのIDおよびパスワードを、自己の責任において厳重に管理するものとする。',
          '乙および丙は、入力されたIDおよびパスワードが登録されたものと一致することを所定の方法により確認した場合、それが甲自身による利用であるとみなす。盗用、不正使用、その他事故により甲に損害が生じた場合でも、乙および丙は一切責任を負わない。',
        ],
      },
      {
        title: '第４条（禁止事項）',
        items: [
          '甲は、本サービスの利用にあたり、以下の行為を行ってはならない。',
          '(1) 法令、公序良俗に違反する行為またはそのおそれのある行為',
          '(2) 乙もしくは丙または第三者の財産、プライバシーもしくは肖像権を侵害する行為、または侵害するおそれのある行為',
          '(3) 乙もしくは丙または第三者を差別もしくは誹謗中傷し、またはその名誉もしくは信用を毀損する行為',
          '(4) 詐欺等の犯罪に結びつく、または結びつくおそれのある行為',
          '(5) わいせつ、児童ポルノまたは児童虐待にあたる画像、文書等を送信または表示する行為、またはこれらを収録した媒体を販売する行為、またはその送信、表示、販売を想起させる広告を表示または送信する行為',
          '(6) 乙もしくは丙または第三者の設備等に無権限でアクセスし、またはその利用もしくは運営に支障を与える行為（与えるおそれのある行為を含む）',
          '(7) 本サービスに接続しているシステム全般について、権限なく不正にアクセスする行為、クラッキング行為、アタック行為、逆アセンブル、逆コンパイル、リバースエンジニアリング等の解析行為',
          '(8) 上記各号のいずれかに該当する行為（当該行為を第三者が行っている場合を含む）が見られるデータ等へ当該行為を助長する目的でリンクをはる行為',
          '(9) 本サービスを再販売、再配布する行為',
          '(10) その他、乙および丙が不適切と判断する行為',
        ],
      },
      {
        title: '第５条（本サービスの一時的な中断）',
        items: [
          '乙および丙は、以下のいずれかに該当する場合、甲に事前に通知することなく本サービスの全部または一部を一時的に中断することができる。',
          '(1) 本サービス用設備等の保守を定期的にまたは緊急に行う場合',
          '(2) 火災、停電等により本サービスの提供ができなくなった場合',
          '(3) 地震、噴火、洪水、津波等の天災により本サービスの提供ができなくなった場合',
          '(4) 戦争、動乱、暴動、騒乱、労働争議等により本サービスの提供ができなくなった場合',
          '(5) その他、運用上または技術上、乙および丙が本サービスの一時的な中断が必要と判断した場合',
          '前項に定める本サービスの一時的な中断により甲に損害が生じた場合でも、乙および丙は一切の責任を負わないものとする。',
        ],
      },
      {
        title: '第６条（本サービスの変更、追加、廃止）',
        items: [
          '乙および丙は、甲に事前に通知することなく、本サービスの全部または一部の内容を変更、追加、廃止することができる。',
          '乙および丙は、前項に定める本サービスの変更、追加、廃止により甲に生じた損害について一切の責任を負わないものとする。',
        ],
      },
      {
        title: '第７条（甲の損害に対する免責）',
        items: [
          '乙および丙は、本契約の履行に関し、甲に発生した損害について一切責任を負わないものとする。ただし、当該損害が乙および丙の故意または重過失に起因する場合はこの限りでない。',
          '乙および丙の責めに帰すべき事由により甲に損害が発生した場合において、乙および丙が甲に対して負う損害賠償額は、債務不履行、不法行為その他請求原因の如何にかかわらず、損害発生時から遡って過去12ヶ月間に甲から現実に受領した本サービスの利用料金の総額を上限とする。',
        ],
      },
      {
        title: '第８条（秘密保持）',
        items: [
          '甲、乙および丙は、本契約に関連して相手方より秘密として開示を受けた技術上または営業上その他業務上の情報を秘密として保持し、相手方の事前の書面による承諾がない限り第三者に開示・漏洩してはならず、本契約の目的以外に使用してはならない。',
          '次の各号に定める情報については、前項の秘密情報に含まれないものとする。',
          '(1) 開示の時に既に公知であったもの',
          '(2) 開示後に自己の責に帰すべからざる事由により公知となったもの',
          '(3) 開示の時に既に自己が保有していたもの',
          '(4) 正当な権限を有する第三者から秘密保持義務を負うことなく適法に取得したもの',
          '(5) 秘密情報によることなく独自に開発・取得したもの',
          '第１項の規定にかかわらず、法令の定めまたは権限ある官公署の命令により秘密情報の開示を求められた場合は、当該法令または命令の定める範囲で秘密情報を開示することができる。',
          '甲、乙および丙は、本契約終了後も本条に定める秘密保持義務を負うものとする。',
        ],
      },
      {
        title: '第９条（個人情報の取扱い）',
        items: [
          '乙および丙は、甲から提供を受けた個人情報（個人情報の保護に関する法律第２条第１項に定める個人情報をいう）について、本サービスの提供の目的のみに利用するものとし、甲の書面による事前の同意なく第三者に開示または漏洩しないものとする。',
          '乙および丙は、個人情報の取扱いに関する業務の全部または一部を第三者に委託する場合、当該委託先に対して必要かつ適切な監督を行うものとする。',
          '乙および丙は、個人情報について、漏洩、滅失またはき損の防止等、その管理のために必要かつ適切な安全管理措置を講じるものとする。',
        ],
      },
      {
        title: '第１０条（契約の解除）',
        items: [
          '甲、乙または丙は、相手方が次の各号のいずれかに該当した場合、催告その他何らの手続を要しないで、直ちに本契約の全部または一部を解除することができる。',
          '(1) 本契約に違反し、相当期間を定めた催告後も違反が是正されないとき',
          '(2) 手形または小切手が不渡りとなったとき',
          '(3) 第三者より差押え、仮差押え、仮処分もしくは競売の申立てがあったとき、または公租公課の滞納処分を受けたとき',
          '(4) 破産手続開始、民事再生手続開始、会社更生手続開始もしくは特別清算開始の申立てがなされたとき、または自ら振り出しもしくは引き受けた手形もしくは小切手につき、銀行取引停止処分を受けたとき',
          '(5) 解散、営業の全部もしくは重要な一部の譲渡の決議をしたとき',
          '(6) 資産または信用状態に重大な変化が生じ、本契約に基づく債務の履行が困難になるおそれがあると認められるとき',
          '(7) その他、本契約を継続し難い重大な事由が生じたとき',
          '本条に基づき契約が解除された場合、解除した当事者は、解除により相手方に生じた損害について賠償する責任を負わない。',
        ],
      },
    ];

    for (const article of articles) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.text(article.title, 20, yPos);
      yPos += 7;

      doc.setFontSize(9);
      article.items.forEach((item, index) => {
        const itemText = `${index + 1}. ${item}`;
        const lines = doc.splitTextToSize(itemText, 165);
        doc.text(lines, 25, yPos);
        yPos += lines.length * 4 + 3;

        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
      });
      yPos += 3;
    }

    // 新しいページに署名欄
    doc.addPage();
    yPos = 20;

    doc.setFontSize(10);
    doc.text(
      '以上、本契約の成立を証するため、本書３通を作成し、甲乙丙記名押印の上、各１通を保有する。',
      20,
      yPos
    );
    yPos += 15;

    doc.text(formatDate(contract.start_date), 150, yPos);
    yPos += 20;

    // 甲（利用者）
    doc.setFontSize(11);
    doc.text('（甲）利用者', 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.text(`住所： ${customerAddress}`, 20, yPos);
    yPos += 6;
    doc.text(`氏名： ${customerRepresentative || customerName}`, 20, yPos);
    yPos += 6;
    doc.text('印', 180, yPos);
    yPos += 15;

    // 乙（開発・保守）
    doc.setFontSize(11);
    doc.text('（乙）開発・保守', 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.text('住所：東京都港区南青山2丁目2番15号 WinAoyamaビル917', 20, yPos);
    yPos += 6;
    doc.text('氏名：株式会社ネクストロケーション 代表取締役　明石 洋一', 20, yPos);
    yPos += 6;
    doc.text('印', 180, yPos);
    yPos += 15;

    // 丙（販売・サポート）
    doc.setFontSize(11);
    doc.text('（丙）販売・サポート', 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.text('住所：東京都渋谷区恵比寿西2-4-8　ウィンド恵比寿ビル8F', 20, yPos);
    yPos += 6;
    doc.text('氏名：株式会社リノバンス 代表取締役　鈴木 智久', 20, yPos);
    yPos += 6;
    doc.text('印', 180, yPos);

    // PDFをバッファに変換
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // ファイル名をエンコード（日本語対応）
    const fileName = `ザイロク利用契約書_${customerName}.pdf`;
    const encodedFileName = encodeURIComponent(fileName);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodedFileName}"`,
      },
    });
  } catch (error: any) {
    console.error('[Contract PDF API] Error:', error);
    return NextResponse.json(
      { error: 'PDF生成に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}

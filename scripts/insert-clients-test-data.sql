-- 取引先マスタのテストデータ投入スクリプト
-- 使用方法: PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f scripts/insert-clients-test-data.sql

-- 組織IDを取得（A建設の組織ID）
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- テスト建設株式会社の組織IDを取得
  SELECT id INTO v_org_id FROM organizations WHERE name = 'テスト建設株式会社' LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'テスト建設株式会社の組織が見つかりません';
  END IF;

  -- 顧客データ（3件）
  INSERT INTO clients (
    organization_id, code, name, name_kana, short_name, client_type,
    industry, postal_code, address, phone, email,
    contact_person, contact_department, contact_phone, contact_email,
    payment_terms, payment_method, payment_due_days,
    rating, notes, is_active
  ) VALUES
  (
    v_org_id, 'CL-0001', '株式会社サンライズ開発', 'カブシキガイシャサンライズカイハツ', 'サンライズ開発', 'customer',
    '不動産開発', '150-0001', '東京都渋谷区神宮前1-2-3 サンライズビル5F', '03-1234-5678', 'info@sunrise-dev.co.jp',
    '山田太郎', '建設事業部', '03-1234-5679', 'yamada@sunrise-dev.co.jp',
    '月末締め翌月末払い', 'bank_transfer', 30,
    5, '大手デベロッパー。案件規模が大きく信頼性が高い。', true
  ),
  (
    v_org_id, 'CL-0002', '有限会社グリーンホーム', 'ユウゲンガイシャグリーンホーム', 'グリーンホーム', 'customer',
    '住宅建設', '220-0012', '神奈川県横浜市西区みなとみらい2-3-4', '045-987-6543', 'contact@greenhome.jp',
    '鈴木花子', '営業部', '045-987-6544', 'suzuki@greenhome.jp',
    '月末締め翌々月10日払い', 'bank_transfer', 40,
    4, '地域密着型の住宅メーカー。定期的に案件がある。', true
  ),
  (
    v_org_id, 'CL-0003', '東日本建設株式会社', 'ヒガシニホンケンセツカブシキガイシャ', '東日本建設', 'customer',
    '総合建設', '100-0005', '東京都千代田区丸の内1-1-1 丸の内ビル10F', '03-5555-1111', 'info@higashinihon.co.jp',
    '佐藤一郎', '工事部', '03-5555-1112', 'sato@higashinihon.co.jp',
    '20日締め翌月末払い', 'bank_transfer', 40,
    5, '大手ゼネコン。高品質を要求されるが単価が良い。', true
  );

  -- 仕入先データ（2件）
  INSERT INTO clients (
    organization_id, code, name, name_kana, short_name, client_type,
    industry, postal_code, address, phone, email,
    contact_person, contact_department, contact_phone, contact_email,
    payment_terms, payment_method, payment_due_days,
    bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder,
    tax_registration_number,
    notes, is_active
  ) VALUES
  (
    v_org_id, 'CL-0004', '株式会社ツールマスター', 'カブシキガイシャツールマスター', 'ツールマスター', 'supplier',
    '工具販売', '144-0051', '東京都大田区西蒲田7-1-1', '03-3333-2222', 'sales@toolmaster.co.jp',
    '高橋次郎', '営業部', '03-3333-2223', 'takahashi@toolmaster.co.jp',
    '月末締め翌月末払い', 'bank_transfer', 30,
    'みずほ銀行', '蒲田支店', 'current', '1234567', 'カ)ツールマスター',
    'T1234567890123',
    '電動工具の主要仕入先。在庫豊富で納期が早い。', true
  ),
  (
    v_org_id, 'CL-0005', '山本重機リース', 'ヤマモトジュウキリース', '山本重機', 'supplier',
    '重機レンタル', '210-0023', '神奈川県川崎市川崎区小川町1-1', '044-222-3333', 'info@yamamoto-juki.jp',
    '山本三郎', '営業部', '044-222-3334', 'yamamoto@yamamoto-juki.jp',
    '月末締め翌月20日払い', 'bank_transfer', 20,
    '三井住友銀行', '川崎支店', 'current', '7654321', 'ヤマモトジュウキリース',
    'T9876543210987',
    '重機レンタルの主要取引先。メンテナンスも対応可能。', true
  );

  -- 協力会社データ（2件）
  INSERT INTO clients (
    organization_id, code, name, name_kana, short_name, client_type,
    industry, postal_code, address, phone, email,
    contact_person, contact_department, contact_phone, contact_email,
    payment_terms, payment_method, payment_due_days,
    rating, notes, is_active
  ) VALUES
  (
    v_org_id, 'CL-0006', '田中塗装工業', 'タナカトソウコウギョウ', '田中塗装', 'partner',
    '塗装工事', '142-0053', '東京都品川区中延5-2-3', '03-4444-5555', 'info@tanaka-paint.jp',
    '田中四郎', '代表', '090-1234-5678', 'tanaka@tanaka-paint.jp',
    '月末締め翌月末払い', 'bank_transfer', 30,
    4, '塗装工事の協力会社。技術力が高く納期を守る。', true
  ),
  (
    v_org_id, 'CL-0007', '中村電気設備', 'ナカムラデンキセツビ', '中村電気', 'partner',
    '電気工事', '233-0002', '神奈川県横浜市港南区上大岡西1-6-1', '045-888-9999', 'contact@nakamura-denki.jp',
    '中村五郎', '代表', '090-9876-5432', 'nakamura@nakamura-denki.jp',
    '月末締め翌月末払い', 'bank_transfer', 30,
    5, '電気工事の協力会社。急な依頼にも対応してくれる。', true
  );

  RAISE NOTICE '取引先テストデータの投入が完了しました（7件）';
END $$;

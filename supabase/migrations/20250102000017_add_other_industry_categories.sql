-- 各大分類に「その他」業種を追加
-- 土木・基礎 > その他
INSERT INTO industry_categories (parent_id, name, name_en, sort_order, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'その他', 'Other', 99, true);

-- 建築・構造 > その他
INSERT INTO industry_categories (parent_id, name, name_en, sort_order, is_active)
VALUES ('22222222-2222-2222-2222-222222222222', 'その他', 'Other', 99, true);

-- 内装・仕上 > その他
INSERT INTO industry_categories (parent_id, name, name_en, sort_order, is_active)
VALUES ('33333333-3333-3333-3333-333333333333', 'その他', 'Other', 99, true);

-- 設備・インフラ > その他
INSERT INTO industry_categories (parent_id, name, name_en, sort_order, is_active)
VALUES ('44444444-4444-4444-4444-444444444444', 'その他', 'Other', 99, true);

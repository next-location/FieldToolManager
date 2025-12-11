-- 同一組織への重複した有効契約を防止
-- 1組織につき1つの有効契約（status='active'）のみ許可

-- 部分インデックス：organization_idとstatusの組み合わせでユニーク制約
-- status='active'の契約のみに制約を適用（過去の契約は重複OK）
CREATE UNIQUE INDEX IF NOT EXISTS contracts_unique_active_organization
  ON contracts(organization_id)
  WHERE status = 'active';

COMMENT ON INDEX contracts_unique_active_organization IS '1組織につき1つのアクティブ契約のみ許可（過去契約は除外）';

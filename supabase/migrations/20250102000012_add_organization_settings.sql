-- 組織設定カラムの追加
-- 各組織が運用方法をカスタマイズできるようにする

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  require_qr_scan_on_movement BOOLEAN DEFAULT false;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  require_qr_scan_on_return BOOLEAN DEFAULT false;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  require_approval_for_loss BOOLEAN DEFAULT false;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  enable_monthly_inventory_reminder BOOLEAN DEFAULT true;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  enable_site_closure_checklist BOOLEAN DEFAULT true;

-- カラムのコメント
COMMENT ON COLUMN organizations.require_qr_scan_on_movement IS '道具移動時にQRスキャン必須（厳密モード）';
COMMENT ON COLUMN organizations.require_qr_scan_on_return IS '道具返却時のみQRスキャン必須';
COMMENT ON COLUMN organizations.require_approval_for_loss IS '紛失報告時に承認フロー必須';
COMMENT ON COLUMN organizations.enable_monthly_inventory_reminder IS '月次棚卸しリマインド通知を有効化';
COMMENT ON COLUMN organizations.enable_site_closure_checklist IS '現場終了時に道具返却チェックリスト表示';

-- インデックス作成（設定による検索が発生する場合に備えて）
CREATE INDEX IF NOT EXISTS idx_organizations_qr_scan_settings
  ON organizations(require_qr_scan_on_movement, require_qr_scan_on_return);

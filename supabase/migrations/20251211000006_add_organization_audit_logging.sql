-- 組織情報変更履歴の自動記録機能
-- Add super admin tracking to audit_logs and create trigger for organizations table changes

-- audit_logsテーブルにスーパーアドミン情報を追加
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS super_admin_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS super_admin_name TEXT;

COMMENT ON COLUMN audit_logs.super_admin_id IS 'スーパーアドミンが操作した場合のID';
COMMENT ON COLUMN audit_logs.super_admin_name IS 'スーパーアドミンが操作した場合の名前';

-- 組織情報変更を記録するトリガー関数
CREATE OR REPLACE FUNCTION log_organization_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields jsonb := '{}'::jsonb;
  old_vals jsonb := '{}'::jsonb;
  new_vals jsonb := '{}'::jsonb;
  current_user_id uuid;
  current_super_admin_id text;
  current_super_admin_name text;
BEGIN
  -- スーパーアドミンのセッション情報を取得（存在する場合）
  BEGIN
    current_super_admin_id := current_setting('app.super_admin_id', true);
    current_super_admin_name := current_setting('app.super_admin_name', true);
  EXCEPTION WHEN OTHERS THEN
    current_super_admin_id := NULL;
    current_super_admin_name := NULL;
  END;

  -- 通常のユーザーIDを取得（存在する場合）
  BEGIN
    current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    -- 変更された各フィールドを比較
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      old_vals := old_vals || jsonb_build_object('name', OLD.name);
      new_vals := new_vals || jsonb_build_object('name', NEW.name);
    END IF;

    IF OLD.subdomain IS DISTINCT FROM NEW.subdomain THEN
      old_vals := old_vals || jsonb_build_object('subdomain', OLD.subdomain);
      new_vals := new_vals || jsonb_build_object('subdomain', NEW.subdomain);
    END IF;

    IF OLD.phone IS DISTINCT FROM NEW.phone THEN
      old_vals := old_vals || jsonb_build_object('phone', OLD.phone);
      new_vals := new_vals || jsonb_build_object('phone', NEW.phone);
    END IF;

    IF OLD.fax IS DISTINCT FROM NEW.fax THEN
      old_vals := old_vals || jsonb_build_object('fax', OLD.fax);
      new_vals := new_vals || jsonb_build_object('fax', NEW.fax);
    END IF;

    IF OLD.postal_code IS DISTINCT FROM NEW.postal_code THEN
      old_vals := old_vals || jsonb_build_object('postal_code', OLD.postal_code);
      new_vals := new_vals || jsonb_build_object('postal_code', NEW.postal_code);
    END IF;

    IF OLD.address IS DISTINCT FROM NEW.address THEN
      old_vals := old_vals || jsonb_build_object('address', OLD.address);
      new_vals := new_vals || jsonb_build_object('address', NEW.address);
    END IF;

    IF OLD.billing_contact_name IS DISTINCT FROM NEW.billing_contact_name THEN
      old_vals := old_vals || jsonb_build_object('billing_contact_name', OLD.billing_contact_name);
      new_vals := new_vals || jsonb_build_object('billing_contact_name', NEW.billing_contact_name);
    END IF;

    IF OLD.billing_contact_email IS DISTINCT FROM NEW.billing_contact_email THEN
      old_vals := old_vals || jsonb_build_object('billing_contact_email', OLD.billing_contact_email);
      new_vals := new_vals || jsonb_build_object('billing_contact_email', NEW.billing_contact_email);
    END IF;

    IF OLD.billing_contact_phone IS DISTINCT FROM NEW.billing_contact_phone THEN
      old_vals := old_vals || jsonb_build_object('billing_contact_phone', OLD.billing_contact_phone);
      new_vals := new_vals || jsonb_build_object('billing_contact_phone', NEW.billing_contact_phone);
    END IF;

    IF OLD.billing_address IS DISTINCT FROM NEW.billing_address THEN
      old_vals := old_vals || jsonb_build_object('billing_address', OLD.billing_address);
      new_vals := new_vals || jsonb_build_object('billing_address', NEW.billing_address);
    END IF;

    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      old_vals := old_vals || jsonb_build_object('is_active', OLD.is_active);
      new_vals := new_vals || jsonb_build_object('is_active', NEW.is_active);
    END IF;

    IF OLD.sales_status IS DISTINCT FROM NEW.sales_status THEN
      old_vals := old_vals || jsonb_build_object('sales_status', OLD.sales_status);
      new_vals := new_vals || jsonb_build_object('sales_status', NEW.sales_status);
    END IF;

    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      old_vals := old_vals || jsonb_build_object('priority', OLD.priority);
      new_vals := new_vals || jsonb_build_object('priority', NEW.priority);
    END IF;

    IF OLD.expected_contract_amount IS DISTINCT FROM NEW.expected_contract_amount THEN
      old_vals := old_vals || jsonb_build_object('expected_contract_amount', OLD.expected_contract_amount);
      new_vals := new_vals || jsonb_build_object('expected_contract_amount', NEW.expected_contract_amount);
    END IF;

    IF OLD.lead_source IS DISTINCT FROM NEW.lead_source THEN
      old_vals := old_vals || jsonb_build_object('lead_source', OLD.lead_source);
      new_vals := new_vals || jsonb_build_object('lead_source', NEW.lead_source);
    END IF;

    IF OLD.sales_notes IS DISTINCT FROM NEW.sales_notes THEN
      old_vals := old_vals || jsonb_build_object('sales_notes', OLD.sales_notes);
      new_vals := new_vals || jsonb_build_object('sales_notes', NEW.sales_notes);
    END IF;

    -- 変更があった場合のみ記録
    IF old_vals != '{}'::jsonb THEN
      INSERT INTO audit_logs (
        organization_id,
        user_id,
        super_admin_id,
        super_admin_name,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
      ) VALUES (
        NEW.id,
        current_user_id,
        current_super_admin_id,
        current_super_admin_name,
        'UPDATE',
        'organization',
        NEW.id,
        old_vals,
        new_vals
      );
    END IF;

  ELSIF TG_OP = 'INSERT' THEN
    -- 新規作成時は新しい値のみ記録
    new_vals := jsonb_build_object(
      'name', NEW.name,
      'subdomain', NEW.subdomain,
      'phone', NEW.phone,
      'address', NEW.address,
      'is_active', NEW.is_active
    );

    INSERT INTO audit_logs (
      organization_id,
      user_id,
      super_admin_id,
      super_admin_name,
      action,
      entity_type,
      entity_id,
      new_values
    ) VALUES (
      NEW.id,
      current_user_id,
      current_super_admin_id,
      current_super_admin_name,
      'INSERT',
      'organization',
      NEW.id,
      new_vals
    );

  ELSIF TG_OP = 'DELETE' THEN
    -- 削除時は古い値を記録
    old_vals := jsonb_build_object(
      'name', OLD.name,
      'subdomain', OLD.subdomain,
      'phone', OLD.phone,
      'address', OLD.address,
      'is_active', OLD.is_active
    );

    INSERT INTO audit_logs (
      organization_id,
      user_id,
      super_admin_id,
      super_admin_name,
      action,
      entity_type,
      entity_id,
      old_values
    ) VALUES (
      OLD.id,
      current_user_id,
      current_super_admin_id,
      current_super_admin_name,
      'DELETE',
      'organization',
      OLD.id,
      old_vals
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを作成（既存の場合は削除してから作成）
DROP TRIGGER IF EXISTS log_organization_changes_trigger ON organizations;

CREATE TRIGGER log_organization_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_organization_changes();

COMMENT ON FUNCTION log_organization_changes() IS '組織情報の変更を自動的にaudit_logsテーブルに記録する';
COMMENT ON TRIGGER log_organization_changes_trigger ON organizations IS '組織情報の変更履歴を記録';

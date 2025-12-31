-- system_settingsにIP制限設定を追加
-- デフォルトで有効化（セキュリティ優先）

INSERT INTO system_settings (key, value, description)
VALUES (
  'security_settings',
  jsonb_build_object(
    'ipRestrictionEnabled', true,
    'allowedCountries', jsonb_build_array('JP'),
    'updatedAt', NOW()
  ),
  'スーパー管理者画面のセキュリティ設定（IP制限、2FA推奨など）'
)
ON CONFLICT (key) DO UPDATE SET
  value = jsonb_set(
    COALESCE(system_settings.value, '{}'::jsonb),
    '{ipRestrictionEnabled}',
    'true'::jsonb
  ) || jsonb_build_object(
    'allowedCountries', jsonb_build_array('JP'),
    'updatedAt', NOW()
  );

-- コメント
COMMENT ON COLUMN system_settings.value IS 'JSONB形式の設定値。security_settingsの場合: {ipRestrictionEnabled: boolean, allowedCountries: string[], updatedAt: timestamp}';

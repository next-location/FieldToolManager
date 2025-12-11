-- Super Adminにrole（権限レベル）を追加

-- roleカラムを追加
ALTER TABLE super_admins
ADD COLUMN role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('owner', 'sales'));

-- 既存のSuper AdminをOwnerに設定
UPDATE super_admins SET role = 'owner';

-- コメント追加
COMMENT ON COLUMN super_admins.role IS 'Super Adminの権限レベル: owner（オーナー、全権限）, sales（営業、制限あり）';

-- 権限レベルの説明
/*
owner: オーナー（あなた）
  - 全ての機能にアクセス可能
  - Super Adminアカウントの追加・編集・削除
  - パッケージ設定の変更
  - 契約設定の変更
  - 全ての操作が可能

sales: 営業担当
  - 契約の閲覧のみ（作成・編集・削除は不可）
  - パッケージ設定は閲覧のみ（編集・削除は不可）
  - 組織の閲覧
  - 売上分析の閲覧
  - 操作ログの閲覧
  - Super Adminアカウントの管理は不可
*/

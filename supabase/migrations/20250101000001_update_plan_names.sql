-- 契約テーブルのプラン名を新しい値に更新
-- basic → start
-- premium → standard
-- enterprise → enterprise (変更なし)

-- 既存の契約のプラン名を更新
UPDATE contracts
SET plan = CASE
    WHEN plan = 'basic' THEN 'start'
    WHEN plan = 'premium' THEN 'standard'
    ELSE plan
END
WHERE plan IN ('basic', 'premium');

-- 今後新規作成時に古いプラン名が使われないようにCHECK制約を更新（もし存在する場合）
-- 注: 既存の制約を削除して新しい制約を追加する必要がある場合があります

-- プランマスタテーブルがある場合はそちらも更新
-- （plans テーブルが存在する場合のみ実行）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'plans'
    ) THEN
        UPDATE plans
        SET plan_key = CASE
            WHEN plan_key = 'basic' THEN 'start'
            WHEN plan_key = 'premium' THEN 'standard'
            ELSE plan_key
        END,
        plan_name = CASE
            WHEN plan_key = 'basic' THEN 'スタート'
            WHEN plan_key = 'premium' THEN 'スタンダード'
            ELSE plan_name
        END
        WHERE plan_key IN ('basic', 'premium');
    END IF;
END $$;
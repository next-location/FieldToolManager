-- 重機メーカーを削除し、道具メーカーのみに修正
-- 建築・土木・塗装業の道具（電動工具・手工具・測定機器・安全用具・塗装機器）のメーカーのみを登録

-- Step 1: 重機メーカーを削除
DELETE FROM tool_manufacturers
WHERE is_system_common = true
AND name IN ('コマツ', 'ヤンマー', 'クボタ', 'キャタピラー');

-- Step 2: コメント更新
COMMENT ON TABLE tool_manufacturers IS '道具メーカーマスタ。建築・土木・塗装業の道具（電動工具・手工具・測定機器・安全用具・塗装機器）のメーカーを管理。重機メーカーは含まない。';

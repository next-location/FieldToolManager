-- 既存のtoolsデータをtool_itemsに移行
-- quantity > 1 の道具は、個別アイテムとして分割

DO $$
DECLARE
  tool_record RECORD;
  item_count INTEGER;
  i INTEGER;
BEGIN
  -- 削除されていない全ての道具をループ
  FOR tool_record IN
    SELECT * FROM tools WHERE deleted_at IS NULL
  LOOP
    -- quantityの数だけtool_itemsを作成
    item_count := COALESCE(tool_record.quantity, 1);

    FOR i IN 1..item_count LOOP
      INSERT INTO tool_items (
        tool_id,
        organization_id,
        serial_number,
        qr_code,
        current_location,
        current_site_id,
        status,
        notes,
        created_at
      ) VALUES (
        tool_record.id,
        tool_record.organization_id,
        LPAD(i::TEXT, 3, '0'), -- "001", "002", "003" などのシリアル番号
        -- 既存のQRコードは最初のアイテムに引き継ぎ、残りは新規生成
        CASE
          WHEN i = 1 THEN tool_record.qr_code
          ELSE uuid_generate_v4()
        END,
        COALESCE(tool_record.current_location, 'warehouse'),
        tool_record.current_site_id,
        COALESCE(tool_record.status, 'available'),
        CASE
          WHEN i = 1 AND tool_record.notes IS NOT NULL
          THEN tool_record.notes || ' (移行データ)'
          WHEN i > 1
          THEN '移行により自動生成されたアイテム #' || i
          ELSE NULL
        END,
        tool_record.created_at
      );
    END LOOP;

    RAISE NOTICE '道具 % (%) から % 個のアイテムを作成しました',
      tool_record.name, tool_record.id, item_count;
  END LOOP;

  RAISE NOTICE '移行完了: % 個の道具レコードを処理しました',
    (SELECT COUNT(*) FROM tools WHERE deleted_at IS NULL);
END $$;

-- 移行後の確認クエリ（コメント化）
-- SELECT
--   t.name,
--   t.model_number,
--   t.quantity as original_quantity,
--   COUNT(ti.id) as migrated_items
-- FROM tools t
-- LEFT JOIN tool_items ti ON t.id = ti.tool_id AND ti.deleted_at IS NULL
-- WHERE t.deleted_at IS NULL
-- GROUP BY t.id, t.name, t.model_number, t.quantity
-- ORDER BY t.name;

-- toolsテーブルに個別の低在庫アラート設定を追加
ALTER TABLE tools
ADD COLUMN enable_low_stock_alert BOOLEAN DEFAULT true;

COMMENT ON COLUMN tools.enable_low_stock_alert IS '低在庫アラートの有効/無効（組織設定でアラートがONの場合にのみ有効）';

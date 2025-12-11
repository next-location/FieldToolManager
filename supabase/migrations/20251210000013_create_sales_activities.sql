-- 営業活動履歴テーブル
CREATE TABLE IF NOT EXISTS sales_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_lead_id UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,

  -- 活動タイプ
  activity_type TEXT NOT NULL CHECK (
    activity_type IN (
      'phone_call',        -- 架電
      'email',             -- メール送信
      'inquiry_form',      -- 問い合わせフォーム
      'meeting',           -- 対面商談
      'online_meeting',    -- オンライン商談
      'proposal_sent',     -- 提案書送付
      'follow_up',         -- フォローアップ
      'status_change',     -- ステータス変更
      'other'              -- その他
    )
  ),

  -- 活動詳細
  title TEXT NOT NULL,
  description TEXT,

  -- 結果
  outcome TEXT CHECK (
    outcome IN (
      'success',           -- 成功（つながった、アポ取得等）
      'no_answer',         -- 不在・不通
      'declined',          -- 断られた
      'pending',           -- 保留
      'scheduled'          -- 予定
    )
  ),

  -- 次回アクション
  next_action TEXT,
  next_action_date TIMESTAMPTZ,

  -- メタデータ
  activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sales_activities_lead ON sales_activities(sales_lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_date ON sales_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_activities_type ON sales_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_sales_activities_created_at ON sales_activities(created_at DESC);

-- コメント
COMMENT ON TABLE sales_activities IS '営業活動履歴テーブル';
COMMENT ON COLUMN sales_activities.activity_type IS '活動タイプ: phone_call(架電), email(メール), inquiry_form(問い合わせフォーム), meeting(対面商談), online_meeting(オンライン商談), proposal_sent(提案書送付), follow_up(フォローアップ), status_change(ステータス変更), other(その他)';
COMMENT ON COLUMN sales_activities.outcome IS '結果: success(成功), no_answer(不在・不通), declined(断られた), pending(保留), scheduled(予定)';

# ザイロク 開発履歴 (CHANGELOG)

## 開発ログ
| 日付 | 担当 | 概要 | 詳細・備考 |
| --- | --- | --- | --- |
| 2026-02-01 | Claude | ダッシュボード全面リニューアル | 4権限（Admin/Manager/Leader/Staff）×3パッケージ（Asset/DX/Full）に対応した新ダッシュボード実装。スマホファースト設計、ウィジェット型アーキテクチャ採用。AlertWidget、QuickActionWidget、StatusCardWidget実装。APIルート（/api/dashboard/alerts、/api/dashboard/stats）追加。 |
| 2026-01-31 | Claude | CSRF保護方針変更 | CSRFトークン実装を中止。@supabase/ssrのSameSite=Lax Cookieで十分な保護が提供されることを確認。全APIとコンポーネントからCSRF関連コードを削除。docs/CSRF_PROTECTION_POLICY.mdを作成。 |
| 2026-01-26 | Claude | 出退勤アラートMVP実装 | データベース修正、祝日API統合、営業日判定機能、組織設定UI追加。Phase 1 MVP完了。 |
| 2025-12-xx | 初期 | プロジェクト開始 | |
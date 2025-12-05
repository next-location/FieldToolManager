/**
 * 取引先マスタ型定義
 */

/**
 * 取引先分類
 */
export type ClientType =
  | 'customer'  // 顧客（発注者）
  | 'supplier'  // 仕入先（資材・道具調達先）
  | 'partner'   // 協力会社（下請け・外注先）
  | 'both';     // 顧客兼仕入先

/**
 * 支払方法
 */
export type PaymentMethod =
  | 'bank_transfer'  // 銀行振込
  | 'cash'           // 現金
  | 'check'          // 小切手
  | 'credit'         // 掛売り
  | 'other';         // その他

/**
 * 銀行口座種別
 */
export type BankAccountType =
  | 'savings'   // 普通預金
  | 'current'   // 当座預金
  | 'other';    // その他

/**
 * 取引先マスタ
 */
export interface Client {
  id: string; // UUID
  organization_id: string; // 組織ID

  // 基本情報
  code: string; // 取引先コード（例: CL-0001）
  name: string; // 取引先名
  name_kana?: string; // フリガナ
  short_name?: string; // 略称

  // 取引先分類
  client_type: ClientType; // 取引先分類
  industry?: string; // 業種

  // 連絡先情報
  postal_code?: string; // 郵便番号
  address?: string; // 住所
  phone?: string; // 電話番号
  fax?: string; // FAX番号
  email?: string; // メールアドレス
  website?: string; // ウェブサイト

  // 担当者情報
  contact_person?: string; // 担当者名
  contact_department?: string; // 担当部署
  contact_phone?: string; // 担当者電話番号
  contact_email?: string; // 担当者メールアドレス

  // 取引条件
  payment_terms?: string; // 支払条件（例: 月末締め翌月末払い）
  payment_method?: PaymentMethod; // 支払方法
  payment_due_days?: number; // 支払期日（日数）

  // 銀行情報
  bank_name?: string; // 銀行名
  bank_branch?: string; // 支店名
  bank_account_type?: BankAccountType; // 口座種別
  bank_account_number?: string; // 口座番号
  bank_account_holder?: string; // 口座名義

  // 財務情報
  credit_limit?: number; // 与信限度額
  current_balance: number; // 現在残高（売掛金・買掛金）

  // 税務情報
  tax_id?: string; // 法人番号・事業者番号
  tax_registration_number?: string; // インボイス登録番号
  is_tax_exempt: boolean; // 非課税事業者

  // 取引実績
  first_transaction_date?: string; // 初回取引日
  last_transaction_date?: string; // 最終取引日
  total_transaction_count: number; // 取引回数
  total_transaction_amount: number; // 累計取引額

  // 評価・メモ
  rating?: number; // 評価（1-5）
  notes?: string; // 備考・メモ
  internal_notes?: string; // 社内用メモ

  // ステータス
  is_active: boolean; // 有効/無効

  // タイムスタンプ
  created_at: string;
  updated_at: string;
  deleted_at?: string; // 論理削除
}

/**
 * 取引先作成用入力データ
 */
export interface CreateClientInput {
  // 基本情報（必須）
  code: string;
  name: string;
  client_type: ClientType;

  // 基本情報（任意）
  name_kana?: string;
  short_name?: string;
  industry?: string;

  // 連絡先情報
  postal_code?: string;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;

  // 担当者情報
  contact_person?: string;
  contact_department?: string;
  contact_phone?: string;
  contact_email?: string;

  // 取引条件
  payment_terms?: string;
  payment_method?: PaymentMethod;
  payment_due_days?: number;

  // 銀行情報
  bank_name?: string;
  bank_branch?: string;
  bank_account_type?: BankAccountType;
  bank_account_number?: string;
  bank_account_holder?: string;

  // 財務情報
  credit_limit?: number;

  // 税務情報
  tax_id?: string;
  tax_registration_number?: string;
  is_tax_exempt?: boolean;

  // 評価・メモ
  rating?: number;
  notes?: string;
  internal_notes?: string;

  // ステータス
  is_active?: boolean;
}

/**
 * 取引先更新用入力データ
 */
export interface UpdateClientInput extends Partial<CreateClientInput> {
  id: string;
}

/**
 * 取引先フィルター条件
 */
export interface ClientFilters {
  client_type?: ClientType | ClientType[]; // 取引先分類
  is_active?: boolean; // 有効/無効
  search?: string; // 検索キーワード（名前、コード、住所など）
  industry?: string; // 業種
  rating?: number; // 評価
}

/**
 * 取引先一覧レスポンス
 */
export interface ClientsListResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 取引先統計情報
 */
export interface ClientStats {
  total_clients: number; // 総取引先数
  active_clients: number; // 有効な取引先数
  customers_count: number; // 顧客数
  suppliers_count: number; // 仕入先数
  partners_count: number; // 協力会社数
  total_receivables: number; // 総売掛金
  total_payables: number; // 総買掛金
  avg_rating: number; // 平均評価
}

/**
 * 取引先コード生成パラメータ
 */
export interface GenerateClientCodeParams {
  prefix?: string; // プレフィックス（デフォルト: 'CL'）
}

/**
 * 取引先の日本語ラベル
 */
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  customer: '顧客',
  supplier: '仕入先',
  partner: '協力会社',
  both: '顧客兼仕入先',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: '銀行振込',
  cash: '現金',
  check: '小切手',
  credit: '掛売り',
  other: 'その他',
};

export const BANK_ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  savings: '普通預金',
  current: '当座預金',
  other: 'その他',
};

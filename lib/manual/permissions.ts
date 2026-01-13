import type { ManualFrontmatter } from './types'

/**
 * ユーザー権限レベルの定義
 */
export const PERMISSION_LEVELS = {
  PUBLIC: 0,
  STAFF: 1,
  LEADER: 2,
  MANAGER: 3,
  OWNER: 4,
} as const

/**
 * ロールから権限レベルを取得
 */
export function getRolePermissionLevel(role: string | null): number {
  if (!role) return PERMISSION_LEVELS.PUBLIC

  switch (role) {
    case 'super_admin':
    case 'admin':
      return PERMISSION_LEVELS.OWNER
    case 'manager':
      return PERMISSION_LEVELS.MANAGER
    case 'leader':
      return PERMISSION_LEVELS.LEADER
    case 'staff':
    case 'user': // userロールもstaffと同じ権限レベル
      return PERMISSION_LEVELS.STAFF
    default:
      return PERMISSION_LEVELS.PUBLIC
  }
}

/**
 * ユーザーが記事を閲覧できるか権限チェック
 */
export function canAccessArticle(
  userPermission: number,
  articlePermission: number
): boolean {
  return userPermission >= articlePermission
}

/**
 * ユーザーがプランで記事を閲覧できるかチェック
 */
export function canAccessByPlan(
  userPlan: string | null,
  requiredPlans: string[]
): boolean {
  // basicは全員アクセス可能
  if (requiredPlans.includes('basic')) return true

  if (!userPlan) return false

  // ユーザーのプランが必要なプランに含まれているかチェック
  return requiredPlans.includes(userPlan)
}

/**
 * 記事リストを権限とプランでフィルタ
 */
export function filterArticlesByPermission<T extends { frontmatter: ManualFrontmatter }>(
  articles: T[],
  userPermission: number,
  userPlan: string | null
): T[] {
  return articles.filter((article) => {
    const hasPermission = canAccessArticle(userPermission, article.frontmatter.permission)
    const hasPlan = canAccessByPlan(userPlan, article.frontmatter.plans)
    return hasPermission && hasPlan
  })
}

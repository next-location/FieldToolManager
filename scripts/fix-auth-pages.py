#!/usr/bin/env python3
"""
全ページでrequireAuth()を使うように一括修正するスクリプト
"""
import os
import re
import glob

def fix_page(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 既にrequireAuthを使っている場合はスキップ
    if 'requireAuth' in content:
        return False

    # supabase.auth.getUser()パターンがない場合はスキップ
    if 'supabase.auth.getUser()' not in content:
        return False

    original_content = content

    # import文を追加
    if "from '@/lib/supabase/server'" in content:
        # createClientのimportがある場合
        content = content.replace(
            "import { createClient } from '@/lib/supabase/server'",
            "import { requireAuth } from '@/lib/auth/page-auth'"
        )

    # redirect importを削除（requireAuthが自動的にredirectする）
    content = re.sub(r"import \{ redirect \} from 'next/navigation'\n", "", content)

    # 認証チェックパターンを置換
    # パターン1: const supabase = await createClient() + getUser() + redirect
    pattern1 = r"const supabase = await createClient\(\)\s*\n\s*const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\)\s*\n\s*if \(!user\) \{\s*redirect\('/login'\)\s*\}"
    content = re.sub(pattern1, "const { userId, organizationId, userRole, supabase } = await requireAuth()", content, flags=re.MULTILINE)

    # userData.organization_id -> organizationId
    content = re.sub(r"userData\?\.organization_id", "organizationId", content)
    content = re.sub(r"userData\.organization_id", "organizationId", content)

    # userData.role -> userRole
    content = re.sub(r"userData\?\.role", "userRole", content)
    content = re.sub(r"userData\.role", "userRole", content)

    # user.id -> userId
    content = re.sub(r"\buser\.id\b", "userId", content)

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True

    return False

# 全ページを処理
pages = glob.glob('app/(authenticated)/**/page.tsx', recursive=True)
fixed_count = 0

for page in pages:
    if fix_page(page):
        print(f"✓ Fixed: {page}")
        fixed_count += 1

print(f"\n{fixed_count}/{len(pages)} pages fixed")

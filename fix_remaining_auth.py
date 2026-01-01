#!/usr/bin/env python3
import re
import sys
import glob

def fix_file(filepath):
    """
    requireAuthをインポート済みだが、まだsupabase.auth.getUser()を使っているファイルを修正
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # requireAuthがインポートされていない場合はスキップ
        if 'requireAuth' not in content:
            return False, "requireAuth not imported"

        # すでに requireAuth() を呼び出している場合はスキップ
        if 'await requireAuth()' in content:
            # supabase.auth.getUser() パターンが残っている場合は削除
            pattern = re.compile(
                r'\s*const\s+{\s*data:\s*{\s*user\s*}[^}]*}\s*=\s*await\s+supabase\.auth\.getUser\(\)\s*\n'
                r'\s*if\s*\(\s*!user\s*\)\s*{\s*redirect\([^\)]+\)\s*}\s*\n'
                r'(?:\s*const\s+{\s*data:\s*userData[^}]*}\s*=\s*await\s+supabase[^\n]+\n)?',
                re.MULTILINE
            )
            content = pattern.sub('', content)

            if content != original:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True, "Removed supabase.auth.getUser()"
            return False, "No changes needed"

        # requireAuthインポート済みだが未使用の場合は変換
        # パターン: 関数の最初の const supabase = await createClient() を requireAuth() に置換
        func_pattern = re.compile(
            r'(export\s+default\s+async\s+function\s+\w+[^{]*{\s*(?:const\s+[^=]+=\s+await\s+\w+\s*\n\s*)?)'
            r'const\s+{\s*data:\s*{\s*user\s*}[^}]*}\s*=\s*await\s+supabase\.auth\.getUser\(\)\s*\n'
            r'\s*if\s*\(\s*!user\s*\)\s*{\s*redirect\([^\)]+\)\s*}\s*\n'
            r'(?:\s*const\s+{\s*data:\s*userData[^}]*}\s*=\s*await\s+supabase[^\n]+\n'
            r'\s*if\s*\([^)]+\)\s*{\s*redirect\([^\)]+\)\s*}\s*\n)?',
            re.MULTILINE | re.DOTALL
        )

        replacement = r'\1const { userId, organizationId, userRole, supabase } = await requireAuth()\n\n  '
        content = func_pattern.sub(replacement, content)

        # 変数置換
        content = re.sub(r'\buserData\?\.organization_id\b', 'organizationId', content)
        content = re.sub(r'\buserData\.organization_id\b', 'organizationId', content)
        content = re.sub(r'\buserData\?\.role\b', 'userRole', content)
        content = re.sub(r'\buserData\.role\b', 'userRole', content)
        content = re.sub(r'\buser\.id\b', 'userId', content)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, "Converted to requireAuth()"

        return False, "No pattern matched"

    except Exception as e:
        return False, f"Error: {str(e)}"

# すべての認証ページを検索
files = glob.glob('/Users/youichiakashi/FieldToolManager/app/(authenticated)/**/page.tsx', recursive=True)

print(f"検索対象: {len(files)} ファイル")

success = 0
skip = 0

for filepath in files:
    # supabase.auth.getUser パターンが含まれるファイルのみ処理
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            if 'supabase.auth.getUser' not in f.read():
                continue
    except:
        continue

    changed, message = fix_file(filepath)

    relative_path = filepath.replace('/Users/youichiakashi/FieldToolManager/', '')

    if changed:
        print(f"✅ {relative_path}: {message}")
        success += 1
    else:
        print(f"⏭️  {relative_path}: {message}")
        skip += 1

print(f"\n完了: {success}件修正, {skip}件スキップ")

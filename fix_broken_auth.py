#!/usr/bin/env python3
import re
import glob

files = glob.glob('/Users/youichiakashi/FieldToolManager/app/(authenticated)/**/page.tsx', recursive=True)

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # requireAuthインポートがあるかチェック
        if 'requireAuth' not in content:
            continue

        # すでに requireAuth() を呼び出している場合はスキップ
        if 'const { userId, organizationId, userRole, supabase } = await requireAuth()' in content:
            continue

        # userRole, organizationId, supabase のいずれかが使われているかチェック
        if not any(word in content for word in ['userRole', 'organizationId', 'supabase']):
            continue

        # 関数定義を見つける
        func_match = re.search(r'(export default async function \w+[^{]*\{)', content)
        if not func_match:
            continue

        func_start = func_match.end()

        # params の await がある場合はその後に挿入
        params_pattern = r'(\s*const\s+[^=]+=\s+await\s+params\s*\n)'
        params_match = re.search(params_pattern, content[func_start:])

        if params_match:
            insert_pos = func_start + params_match.end()
            before = content[:insert_pos]
            after = content[insert_pos:]
            content = before + '  const { userId, organizationId, userRole, supabase } = await requireAuth()\n\n' + after
        else:
            # paramsがない場合は関数の直後に挿入
            before = content[:func_start]
            after = content[func_start:]
            content = before + '\n  const { userId, organizationId, userRole, supabase } = await requireAuth()\n' + after

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"✅ {filepath.replace('/Users/youichiakashi/FieldToolManager/', '')}")

    except Exception as e:
        print(f"❌ {filepath}: {e}")

print("完了")

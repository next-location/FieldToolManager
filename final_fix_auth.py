#!/usr/bin/env python3
import re
import glob

files = glob.glob('/Users/youichiakashi/FieldToolManager/app/(authenticated)/**/page.tsx', recursive=True)

fixed = 0

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # パターン: 関数パラメータの中にrequireAuth()がある
        # export default async function FuncName({
        #   const { ... } = await requireAuth()
        #   params...
        # }: { ... }) {

        pattern = re.compile(
            r'(export default async function \w+\(\{)\s*'
            r'const\s+\{\s*([^}]+)\s*\}\s*=\s*await\s+requireAuth\(\)\s*\n\s*\n'
            r'(\s*params[^:]*:\s*[^}]+}[^{]*\{)\s*'
            r'const\s+\{[^}]+\}\s*=\s*await\s+params',
            re.MULTILINE | re.DOTALL
        )

        # 置換: paramsを先に、requireAuth()を後に
        def replacer(m):
            func_start = m.group(1)  # export default async function FuncName({
            auth_vars = m.group(2)    # userId, organizationId, userRole, supabase
            params_and_types = m.group(3)  # params...}: {...}) {  const {...} = await params

            # paramsの抽出
            params_match = re.search(r'const\s+\{([^}]+)\}\s*=\s*await\s+params', params_and_types)
            if not params_match:
                return m.group(0)

            params_vars = params_match.group(1).strip()

            # 新しい構造を構築
            return (
                f'{func_start}\n'
                f'  params,\n'
                f'}}: {{\n'
                f'  params: Promise<{{ id: string }}>\n'
                f'}}}) {{\n'
                f'  const {{ {params_vars} }} = await params\n'
                f'  const {{ {auth_vars} }} = await requireAuth()\n'
            )

        content = pattern.sub(replacer, content)

        # より簡単なパターン: 関数定義の直後にrequireAuthがある場合
        simple_pattern = re.compile(
            r'(export default async function \w+\(\{)\s*'
            r'const\s+\{\s*([^}]+)\s*\}\s*=\s*await\s+requireAuth\(\)\s*\n\s*'
            r'(params[^}]*}[^}]*}\))\s*\{',
            re.MULTILINE
        )

        def simple_replacer(m):
            func_start = m.group(1)
            auth_vars = m.group(2)
            params_part = m.group(3)

            return (
                f'{func_start}\n'
                f'  {params_part} {{\n'
            )

        content = simple_pattern.sub(simple_replacer, content)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

            rel_path = filepath.replace('/Users/youichiakashi/FieldToolManager/', '')
            print(f'✅ {rel_path}')
            fixed += 1

    except Exception as e:
        print(f'❌ {filepath}: {e}')

print(f'\n完了: {fixed}件修正')

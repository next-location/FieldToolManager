#!/bin/bash

# GitHub CLI認証セットアップスクリプト
# Purpose: GitHub ProjectsのAPIアクセス権限を設定

echo "================================================"
echo "GitHub CLI 認証セットアップ"
echo "================================================"
echo ""

# 現在の認証状態を確認
echo "1. 現在の認証状態:"
echo "-------------------"
gh auth status

echo ""
echo "2. Project権限が不足しています"
echo "-------------------"
echo "GitHub Projectsにアクセスするには、以下の手順で新しいトークンを作成してください:"
echo ""

echo "【手順】"
echo ""
echo "Step 1: GitHubで新しいPersonal Access Token (Classic)を作成"
echo "       URL: https://github.com/settings/tokens/new"
echo ""
echo "Step 2: 以下のスコープを選択:"
echo "       ☑ repo        (Full control of private repositories)"
echo "       ☑ project     (Full control of projects)"
echo "       ☑ read:org    (Read org and team membership)"
echo "       ☑ workflow    (Update GitHub Action workflows)"
echo ""
echo "Step 3: トークンを作成して、コピー"
echo ""
echo "Step 4: 以下のコマンドでトークンを設定:"
echo "       方法A: 環境変数として設定（一時的）"
echo "              export GH_TOKEN='ghp_xxxxxxxxxxxxxxxxxxxx'"
echo ""
echo "       方法B: gh auth loginで設定（永続的）"
echo "              gh auth logout"
echo "              gh auth login"
echo "              → GitHub.com を選択"
echo "              → HTTPS を選択"
echo "              → Paste an authentication token を選択"
echo "              → トークンを貼り付け"
echo ""

# トークン設定の確認
echo "3. トークンが設定されているか確認"
echo "-------------------"
if [ -z "$GH_TOKEN" ]; then
    echo "❌ GH_TOKEN環境変数が設定されていません"
else
    echo "✅ GH_TOKEN環境変数が設定されています"
    echo "   トークン: ${GH_TOKEN:0:7}..."
fi

echo ""
echo "4. 設定完了後のテスト"
echo "-------------------"
echo "以下のコマンドでProjectsにアクセスできるか確認:"
echo "gh project list --owner next-location"
echo ""

# 対話的な設定オプション
read -p "今すぐトークンを設定しますか？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "トークンを入力してください (ghp_で始まる文字列):"
    read -s TOKEN
    export GH_TOKEN=$TOKEN

    # トークンをgh authに設定
    echo $TOKEN | gh auth login --with-token

    if [ $? -eq 0 ]; then
        echo "✅ 認証設定が完了しました"
        echo ""
        echo "Projectsへのアクセスをテスト中..."
        gh project list --owner next-location --limit 1
        if [ $? -eq 0 ]; then
            echo "✅ Projectsへのアクセスが確認できました"
        else
            echo "❌ Projectsへのアクセスに失敗しました。トークンのproject権限を確認してください"
        fi
    else
        echo "❌ 認証設定に失敗しました"
    fi
fi

echo ""
echo "================================================"
echo "セットアップ完了"
echo "================================================"
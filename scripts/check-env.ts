#!/usr/bin/env node

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('❌ .env.local ファイルが見つかりません');
  process.exit(1);
}

// Environment schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),

  // Auth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_CONTRACT: z.string().transform(val => val === 'true'),
  NEXT_PUBLIC_ENABLE_INVOICE: z.string().transform(val => val === 'true'),
  NEXT_PUBLIC_ENABLE_STRIPE: z.string().transform(val => val === 'true'),
});

type Env = z.infer<typeof envSchema>;

async function validateEnv(): Promise<Env> {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ 環境変数の検証に失敗しました:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

async function checkDatabase(env: Env) {
  console.log('2️⃣ データベース接続テスト...');

  // Note: Supabaseのローカル環境がない場合はスキップ
  if (!env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost')) {
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
      const { error } = await supabase
        .from('organizations')
        .select('count')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // Table doesn't exist is OK
        throw error;
      }
      console.log('✅ データベース: OK\n');
    } catch (error) {
      console.error('❌ データベース接続に失敗:', error);
      process.exit(1);
    }
  } else {
    console.log('⏭️  ローカルSupabaseは後でセットアップします\n');
  }
}

async function checkRedis(env: Env) {
  if (env.REDIS_URL) {
    console.log('3️⃣ Redis接続テスト...');
    const redis = new Redis(env.REDIS_URL, {
      retryStrategy: () => null,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    });

    try {
      await redis.ping();
      console.log('✅ Redis: OK\n');
      redis.disconnect();
    } catch (error) {
      console.error('⚠️ Redis接続に失敗（Rate Limitingが無効になります）');
      console.log('  Dockerを起動してください: docker-compose up -d redis\n');
    }
  }
}

async function checkDockerServices() {
  console.log('4️⃣ Docker サービスチェック...');

  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync('docker-compose ps --services --filter "status=running"');
    const runningServices = stdout.trim().split('\n').filter(Boolean);

    const requiredServices = ['postgres', 'redis', 'mailhog'];
    const missingServices = requiredServices.filter(s => !runningServices.includes(s));

    if (missingServices.length > 0) {
      console.log(`⚠️ 以下のDockerサービスが起動していません: ${missingServices.join(', ')}`);
      console.log('  起動コマンド: docker-compose up -d\n');
    } else {
      console.log('✅ Docker サービス: 全て稼働中\n');
    }
  } catch (error) {
    console.log('⚠️ Docker Composeが利用できません。手動でサービスを確認してください\n');
  }
}

async function checkEnvironment() {
  console.log('🔍 環境チェックを開始します...\n');
  console.log('============================================\n');

  // 1. 環境変数の検証
  console.log('1️⃣ 環境変数の検証...');
  const env = await validateEnv();
  console.log('✅ 環境変数: OK\n');

  // 2. データベース接続
  await checkDatabase(env);

  // 3. Redis接続
  await checkRedis(env);

  // 4. Dockerサービス
  await checkDockerServices();

  console.log('============================================');
  console.log('🎉 環境チェック完了！\n');

  // 推奨事項を表示
  console.log('📋 次のステップ:');
  console.log('1. Dockerサービスを起動: docker-compose up -d');
  console.log('2. Supabaseをセットアップ: npm run supabase:init');
  console.log('3. マイグレーション実行: npm run db:push');
  console.log('4. 開発サーバー起動: npm run dev\n');
}

// メイン実行
checkEnvironment().catch(error => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});
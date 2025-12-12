import winston from 'winston';

const isDevelopment = process.env.NODE_ENV === 'development';

// ログレベル設定
// development: debug以上すべて表示
// production: info以上のみ表示（debugは非表示）
const logLevel = isDevelopment ? 'debug' : 'info';

// ログフォーマット
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
  })
);

// Loggerインスタンス作成
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports: [
    // コンソール出力
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
  ],
});

// 本番環境ではファイルにも出力（オプション）
if (!isDevelopment) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  );
}

// 使い方：
// logger.debug('デバッグ情報');     // 開発環境のみ
// logger.info('情報ログ');          // 開発・本番両方
// logger.warn('警告ログ');          // 開発・本番両方
// logger.error('エラーログ');       // 開発・本番両方

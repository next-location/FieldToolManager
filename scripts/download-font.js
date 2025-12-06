const https = require('https');
const fs = require('fs');

// Google Fonts APIから実際のフォントURLを取得
const apiUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400&display=swap';

https.get(apiUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // CSS内のフォントURLを抽出
    const match = data.match(/url\((https:\/\/[^)]+\.ttf)\)/);
    if (!match) {
      console.error('TTF URL not found');
      return;
    }
    
    const fontUrl = match[1];
    console.log('Downloading font from:', fontUrl);
    
    // フォントファイルをダウンロード
    https.get(fontUrl, (fontRes) => {
      const chunks = [];
      fontRes.on('data', chunk => chunks.push(chunk));
      fontRes.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const output = `export const NotoSansJPBase64 = '${base64}';`;
        fs.writeFileSync('/Users/youichiakashi/FieldToolManager/app/api/work-reports/[id]/pdf/font.ts', output);
        console.log('Font converted successfully, size:', buffer.length, 'bytes');
      });
    });
  });
});

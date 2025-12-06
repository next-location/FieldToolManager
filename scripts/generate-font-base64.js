const fs = require('fs');

// NotoSansJPをダウンロードして変換
const https = require('https');
const fontUrl = 'https://github.com/satob/Tex/raw/master/NotoSansJP-Regular.ttf';

https.get(fontUrl, (response) => {
  const chunks = [];
  response.on('data', (chunk) => chunks.push(chunk));
  response.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const base64 = buffer.toString('base64');
    const output = `export const NotoSansJPBase64 = '${base64}';`;
    fs.writeFileSync('/Users/youichiakashi/FieldToolManager/app/api/work-reports/[id]/pdf/font.ts', output);
    console.log('Font converted successfully');
  });
}).on('error', (err) => {
  console.error('Error downloading font:', err.message);
});

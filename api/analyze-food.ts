import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import busboy from 'busboy';

export const config = { api: { bodyParser: false } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseForm(req: VercelRequest): Promise<{ buffer: Buffer; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: 20 * 1024 * 1024 } });
    let fileBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    bb.on('file', (_field, file, info) => {
      mimeType = info.mimeType || 'image/jpeg';
      const chunks: Buffer[] = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });
    bb.on('finish', () => {
      if (fileBuffer) resolve({ buffer: fileBuffer, mimeType });
      else reject(new Error('ファイルが見つかりません'));
    });
    bb.on('error', reject);
    req.pipe(bb);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { buffer, mimeType } = await parseForm(req);
    const base64Data = buffer.toString('base64');
    const imageMediaType = (
      mimeType === 'image/png' ? 'image/png' :
      mimeType === 'image/gif' ? 'image/gif' :
      mimeType === 'image/webp' ? 'image/webp' : 'image/jpeg'
    ) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: imageMediaType, data: base64Data }
          },
          {
            type: 'text',
            text: `この食事の写真を分析して、以下のJSON形式のみで返答してください。前後の説明文は不要です。

{
  "mealName": "料理名（日本語）",
  "items": [
    {
      "name": "食材・料理名",
      "amount": "量（例：1杯、150g）",
      "calories": カロリー数値(kcal),
      "protein": タンパク質g数値,
      "fat": 脂質g数値,
      "carbs": 炭水化物g数値
    }
  ],
  "totalCalories": 合計カロリー数値,
  "totalProtein": 合計タンパク質g数値,
  "totalFat": 合計脂質g数値,
  "totalCarbs": 合計炭水化物g数値,
  "healthScore": 健康スコア1-100の数値,
  "advice": "この食事に対する栄養アドバイス（日本語・2文程度）",
  "confidence": "high/medium/low"
}`
          }
        ]
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: '解析結果の取得に失敗しました' });

    const foodData = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data: foodData });
  } catch (error) {
    console.error('Food analysis error:', error);
    return res.status(500).json({
      error: '解析中にエラーが発生しました',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import busboy from 'busboy';
import sharp from 'sharp';

export const config = { api: { bodyParser: false } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseForm(req: VercelRequest): Promise<{ buffer: Buffer; mimeType: string; healthData?: any; userProfile?: any }> {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: 20 * 1024 * 1024 } });
    let fileBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let healthData: any = undefined;
    let userProfile: any = undefined;

    bb.on('field', (name, value) => {
      if (name === 'healthData') {
        try { healthData = JSON.parse(value); } catch {}
      }
      if (name === 'userProfile') {
        try { userProfile = JSON.parse(value); } catch {}
      }
    });

    bb.on('file', (_field, file, info) => {
      mimeType = info.mimeType || 'image/jpeg';
      const chunks: Buffer[] = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });

    bb.on('finish', () => {
      if (fileBuffer) resolve({ buffer: fileBuffer, mimeType, healthData, userProfile });
      else reject(new Error('ファイルが見つかりません'));
    });
    bb.on('error', reject);
    req.pipe(bb);
  });
}

function calcScoreServer(nutrition: any, health: any, userProfile: any): number {
  const weight = userProfile?.weight ?? 60;
  const fiber = nutrition.totalFiber ?? 0;

  // Layer A
  let layerA = 0;
  const proteinRatio = nutrition.totalProtein / (weight * 0.5);
  layerA += Math.min(20, Math.round(proteinRatio * 20));
  const fatRatio = (nutrition.totalFat * 9) / Math.max(nutrition.totalCalories, 1);
  if (fatRatio >= 0.20 && fatRatio <= 0.30) layerA += 15;
  else if (fatRatio >= 0.15) layerA += 10;
  else if (fatRatio <= 0.40) layerA += 8;
  else layerA += 3;
  const carbRatio = (nutrition.totalCarbs * 4) / Math.max(nutrition.totalCalories, 1);
  if (carbRatio >= 0.40 && carbRatio <= 0.60) layerA += 15;
  else if (carbRatio >= 0.30) layerA += 10;
  else if (carbRatio <= 0.70) layerA += 8;
  else layerA += 3;
  if (fiber >= 8) layerA += 10;
  else if (fiber >= 5) layerA += 7;
  else if (fiber >= 3) layerA += 4;
  layerA = Math.min(60, layerA);

  // Layer B
  let layerB = 0;
  if (health) {
    if ((health.ldlCholesterol ?? 0) >= 120 && nutrition.totalFat >= 35) layerB -= 10;
    if ((health.triglycerides ?? 0) >= 150 && nutrition.totalCarbs >= 50) layerB -= 10;
    if ((health.bmi ?? 0) >= 25 && nutrition.totalCalories >= 700) layerB -= 10;
    if ((health.ferritin ?? 999) < 25 && fiber >= 5) layerB += 10;
    if ((health.crp ?? 0) >= 0.3 && nutrition.totalFat <= 20) layerB += 10;
    layerB = Math.max(-15, Math.min(15, layerB));
  }

  // Layer C
  let layerC = 0;
  if (userProfile?.goal === 'muscle' && nutrition.totalProtein >= 25) layerC = 10;
  if (userProfile?.goal === 'diet' && nutrition.totalCalories <= 500) layerC = 10;
  if (userProfile?.goal === 'nutrition' && fiber >= 8) layerC = 10;

  return Math.max(0, Math.min(100, layerA + layerB + layerC));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { buffer, mimeType, healthData, userProfile } = await parseForm(req);

    // sharpでJPEGに変換（HEIC含む全形式対応・リサイズも同時実行）
    let processedBuffer = buffer;
    let processedMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
    try {
      processedBuffer = await sharp(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      processedMediaType = 'image/jpeg';
      console.log('sharp converted:', buffer.length, '->', processedBuffer.length);
    } catch (sharpErr) {
      // sharpが失敗した場合は元のバッファで続行
      console.warn('sharp failed, using original:', sharpErr);
      const normalized = mimeType.toLowerCase();
      processedMediaType = (
        normalized.includes('png')  ? 'image/png'  :
        normalized.includes('gif')  ? 'image/gif'  :
        normalized.includes('webp') ? 'image/webp' : 'image/jpeg'
      ) as typeof processedMediaType;
    }

    const base64Data = processedBuffer.toString('base64');
    const imageMediaType = processedMediaType;

    // healthData から旧形式のフラット構造を抽出（Layer B 計算用）
    let healthDataParsed: any = undefined;
    if (healthData) {
      if (Array.isArray(healthData.markers) && healthData.markers.length > 0) {
        // 新形式: markers[] → フラット構造に変換
        const findValue = (name: string) => {
          const marker = healthData.markers.find((m: any) =>
            m.name?.toLowerCase().includes(name.toLowerCase())
          );
          return marker?.value;
        };
        healthDataParsed = {
          ldlCholesterol: findValue('LDL') ?? findValue('ldl'),
          triglycerides: findValue('中性脂肪') ?? findValue('triglyceride') ?? findValue('TG'),
          ferritin: findValue('フェリチン') ?? findValue('ferritin'),
          crp: findValue('CRP') ?? findValue('crp'),
          bmi: findValue('BMI') ?? findValue('bmi'),
        };
      } else {
        // 旧形式: そのまま利用
        healthDataParsed = healthData;
      }
    }

    const userProfileParsed = userProfile ?? undefined;

    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
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
            text: `あなたはJSONのみを返すAPIです。説明文・前置き・コードブロック記号(\`\`\`)は一切含めず、必ずJSONオブジェクト { } のみで応答してください。

このサービスは医療診断ではなく生活習慣改善支援のウェルネスツールです。
栄養素の数値推定のみ行い、病名・疾患名・診断的表現は使用禁止。
adviceフィールドには「〜が期待できます」「〜の参考として」等の限定表現を使用。

この食事の写真を詳しく分析してください。
日本食・アジア料理・西洋料理を含む世界各地の料理に精通しており、
日本のコンビニ食・定食・弁当・ファストフード・家庭料理についても
正確にカロリーと栄養素を推定できます。
料理の量は特に指示がない限り、日本の一般的な一人前（定食・外食の標準量）を基準に推定してください。

以下のJSON形式のみで返答してください。前後の説明文は不要です。

{
  "mealName": "料理名（日本語・具体的に例：豚骨ラーメン、チキンカレー定食）",
  "items": [
    {
      "name": "食材・料理名（日本語）",
      "amount": "量（例：1杯、150g、1個）",
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
  "totalFiber": 合計食物繊維g数値（推定値。不明な場合は0）,
  "advice": "この食事に対する具体的な栄養コメント（日本語・2文程度・参考情報として良い点や工夫できる点を含む。「改善します」「治ります」等の断定表現は使わず「〜が期待できます」等の限定表現を使用）",
  "confidence": "high/medium/low（画像から食事を明確に識別できた場合high）"
}

画像が不鮮明・食事が写っていない場合のみ、
mealName を「認識不可」にしてください。`
          }
        ]
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON in response:', responseText.substring(0, 200));
      return res.status(500).json({ success: false, error: 'AIの応答からJSONを取得できませんでした' });
    }

    let foodData;
    try {
      foodData = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('JSON parse failed:', jsonMatch[0].substring(0, 200));
      return res.status(500).json({ success: false, error: 'レスポンスのJSON解析に失敗しました' });
    }

    const healthScore = calcScoreServer(foodData, healthDataParsed, userProfileParsed);
    return res.status(200).json({ success: true, data: { ...foodData, healthScore } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('analyze-food error:', msg);
    return res.status(500).json({ success: false, error: 'API Error: ' + msg.substring(0, 100) });
  }
}

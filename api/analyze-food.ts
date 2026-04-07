import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import busboy from 'busboy';

export const config = { api: { bodyParser: false } };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseForm(req: VercelRequest): Promise<{ buffer: Buffer; mimeType: string; healthData?: any }> {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: 20 * 1024 * 1024 } });
    let fileBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let healthData: any = undefined;

    bb.on('field', (name, value) => {
      if (name === 'healthData') {
        try { healthData = JSON.parse(value); } catch {}
      }
    });

    bb.on('file', (_field, file, info) => {
      mimeType = info.mimeType || 'image/jpeg';
      const chunks: Buffer[] = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });

    bb.on('finish', () => {
      if (fileBuffer) resolve({ buffer: fileBuffer, mimeType, healthData });
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
    const { buffer, mimeType, healthData } = await parseForm(req);
    const base64Data = buffer.toString('base64');
    const imageMediaType = (
      mimeType === 'image/png' ? 'image/png' :
      mimeType === 'image/gif' ? 'image/gif' :
      mimeType === 'image/webp' ? 'image/webp' : 'image/jpeg'
    ) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    // bloodTestResults 形式（markers[]）と旧形式（ldlCholesterol等）の両方に対応
    let healthContext = '';
    if (healthData) {
      if (Array.isArray(healthData.markers) && healthData.markers.length > 0) {
        // 新形式: bloodTestResults（markers[]）
        const lowMarkers   = healthData.markers.filter((m: any) => m.status === 'low');
        const highMarkers  = healthData.markers.filter((m: any) => m.status === 'borderline');

        const lowNames  = lowMarkers.map((m: any) => m.name).join('、') || 'なし';
        const highNames = highMarkers.map((m: any) => m.name).join('、') || 'なし';

        healthContext = `
【このユーザーの血液検査データ（AIによる解析結果）】
- 不足・低値の項目: ${lowNames}
- 要注意の項目: ${highNames}

血液検査結果を考慮して healthScore と advice を生成してください：

不足バイオマーカーへの対応（スコアアップ要因）:
- フェリチン/鉄 が低値 → 赤身肉・レバー・ほうれん草・あさりを含む料理を高評価し、adviceでこれらを推奨
- ビタミンD が低値 → 鮭・サバ・イワシ・きのこ類・卵を含む料理を高評価し、adviceでこれらを推奨
- 亜鉛 が低値 → 牡蠣・牛肉・ナッツ類を含む料理を高評価
- マグネシウム が低値 → 海藻・ナッツ・豆類を含む料理を高評価

要注意バイオマーカーへの対応（スコアダウン要因）:
- 中性脂肪/トリグリセリド が要注意 → 揚げ物・白米過多・砂糖多めの食事はスコアを下げ、adviceで注意喚起
- LDL/コレステロール が要注意 → 飽和脂肪酸多い食事（バター・肉の脂身・揚げ物）はスコアを下げる
- 血糖/HbA1c が要注意 → 糖質過多の食事はスコアを下げ、食物繊維・低GI食を推奨
- CRP が要注意 → 加工肉・超加工食品・トランス脂肪酸はスコアを下げる
`;
      } else {
        // 旧形式: healthCheckData（ldlCholesterol等のフラット構造）
        healthContext = `
【このユーザーの健康診断データ】
- LDLコレステロール: ${healthData.ldlCholesterol ?? '不明'} mg/dL（基準値60-119）
- HDLコレステロール: ${healthData.hdlCholesterol ?? '不明'} mg/dL（基準値40-119）
- 中性脂肪: ${healthData.triglycerides ?? '不明'} mg/dL（基準値0-149）
- 血糖値: ${healthData.bloodSugar ?? '不明'} mg/dL（基準値70-99）
- HbA1c: ${healthData.hba1c ?? '不明'} %（基準値0-5.5）
- CRP: ${healthData.crp ?? '不明'} mg/dL（基準値0-0.30）
- フェリチン: ${healthData.ferritin ?? '不明'} ng/mL
- BMI: ${healthData.bmi ?? '不明'}
- 総合判定: ${healthData.overallRating ?? '不明'}
- 異常フラグ: ${healthData.abnormalFlags?.join('、') ?? 'なし'}

このユーザーの健康状態を考慮して healthScore を計算してください：
- LDLが120以上の場合、脂質の多い食事（揚げ物・肉の脂身・バター）はスコアを大きく下げる
- 中性脂肪が150以上の場合、糖質・アルコールを含む食事はスコアを下げる
- CRPが0.30以上の場合、炎症を促進する食事（加工肉・トランス脂肪酸）はスコアを下げる
- フェリチンが低い場合、鉄分を含む食事はスコアを上げる
- BMIが25以上の場合、高カロリー食はスコアを下げる
`;
      }
    }

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
            text: `${healthContext}この食事の写真を詳しく分析してください。
日本食・アジア料理・西洋料理を含む世界各地の料理に精通しており、
日本のコンビニ食・定食・弁当・ファストフード・家庭料理についても
正確にカロリーと栄養素を推定できます。

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
  "healthScore": 健康スコア1-100の数値（野菜多め・バランス良い=高スコア、揚げ物・糖質多め=低スコア）,
  "advice": "この食事に対する具体的な栄養アドバイス（日本語・2文程度・改善点や良い点を含む）",
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
    if (!jsonMatch) return res.status(500).json({ error: '解析結果の取得に失敗しました' });

    const foodData = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data: foodData });
  } catch (error) {
    console.error('analyze-food error:', JSON.stringify(error));
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: msg });
  }
}

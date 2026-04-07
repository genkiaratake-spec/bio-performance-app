import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body as any;
    const healthData = body.healthData;

    if (!healthData) return res.status(400).json({ error: 'healthData is required' });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `以下の健康診断データに基づいて、この人に最適な食材推奨リストを作成してください。
必ずJSON形式のみで返答し、前後の説明文は不要です。

【健康診断データ】
- LDLコレステロール: ${healthData.ldlCholesterol ?? '不明'} mg/dL
- HDLコレステロール: ${healthData.hdlCholesterol ?? '不明'} mg/dL
- 中性脂肪: ${healthData.triglycerides ?? '不明'} mg/dL
- 総コレステロール: ${healthData.totalCholesterol ?? '不明'} mg/dL
- 血糖値: ${healthData.bloodSugar ?? '不明'} mg/dL
- HbA1c: ${healthData.hba1c ?? '不明'} %
- CRP: ${healthData.crp ?? '不明'} mg/dL
- フェリチン: ${healthData.ferritin ?? '不明'} ng/mL
- BMI: ${healthData.bmi ?? '不明'}
- ヘモグロビン: ${healthData.hemoglobin ?? '不明'} g/dL
- γ-GTP: ${healthData.gammaGtp ?? '不明'} U/L
- 異常フラグ: ${healthData.abnormalFlags?.join('、') ?? 'なし'}
- 総合判定: ${healthData.overallRating ?? '不明'}

以下のJSON形式で返答：
{
  "summary": "この人の栄養状態の簡潔なサマリー（2文）",
  "optimal": [
    {
      "name": "食材名",
      "category": "カテゴリ（タンパク質/野菜/脂質/炭水化物/果物/発酵食品）",
      "reason": "推奨理由（この人の数値に基づいた具体的な理由）",
      "nutrients": ["主な栄養素1", "栄養素2", "栄養素3"]
    }
  ],
  "recommended": [
    {
      "name": "食材名",
      "category": "カテゴリ",
      "reason": "推奨理由",
      "nutrients": ["栄養素1", "栄養素2", "栄養素3"]
    }
  ],
  "caution": [
    {
      "name": "食材・食品名",
      "category": "カテゴリ",
      "reason": "注意理由"
    }
  ],
  "avoid": [
    {
      "name": "食材・食品名",
      "category": "カテゴリ",
      "reason": "回避理由"
    }
  ]
}

optimal: 4食材（最もこの人に必要な食材）
recommended: 4食材（積極的に摂るべき食材）
caution: 2食材（控えめにすべき食品）
avoid: 2食材（なるべく避けるべき食品）`
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: '解析結果の取得に失敗しました' });

    const nutritionData = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data: nutritionData });
  } catch (error) {
    console.error('Nutrition analysis error:', error);
    return res.status(500).json({ error: '解析中にエラーが発生しました' });
  }
}

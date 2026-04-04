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
    const { healthData, userProfile } = req.body as any;
    if (!healthData) return res.status(400).json({ error: 'healthData is required' });

    const goal = userProfile?.goal === 'muscle' ? '筋肉増強・パフォーマンス向上' :
                 userProfile?.goal === 'diet'   ? 'ダイエット・体重管理'         : '栄養バランス改善';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `以下の健康診断データとユーザーの目標に基づいて、最適なサプリメントを提案してください。
必ずJSON形式のみで返答し、前後の説明文は不要です。

【健康診断データ】
- LDLコレステロール: ${healthData.ldlCholesterol ?? '不明'} mg/dL（基準値60-119）
- HDLコレステロール: ${healthData.hdlCholesterol ?? '不明'} mg/dL（基準値40-119）
- 中性脂肪: ${healthData.triglycerides ?? '不明'} mg/dL（基準値0-149）
- 血糖値: ${healthData.bloodSugar ?? '不明'} mg/dL
- HbA1c: ${healthData.hba1c ?? '不明'} %
- CRP: ${healthData.crp ?? '不明'} mg/L（基準値0-0.30）
- フェリチン: ${healthData.ferritin ?? '不明'} ng/mL
- ビタミンD: ${healthData.vitaminD ?? '不明'} ng/mL
- ヘモグロビン: ${healthData.hemoglobin ?? '不明'} g/dL
- γ-GTP: ${healthData.gammaGtp ?? '不明'} U/L
- BMI: ${healthData.bmi ?? '不明'}
- 異常フラグ: ${healthData.abnormalFlags?.join('、') ?? 'なし'}
- 総合判定: ${healthData.overallRating ?? '不明'}

【ユーザーの目標】${goal}

以下のJSON形式で返答：
{
  "summary": "このユーザーの栄養状態サマリー（2文・具体的な数値に言及）",
  "supplements": [
    {
      "name": "サプリメント名（日本語）",
      "priority": "high" | "medium" | "low",
      "reason": "このユーザーの数値に基づく具体的な推奨理由（数値に言及）",
      "dosage": "推奨用量（例：1カプセル/日）",
      "timing": "服用タイミング（例：朝食後、就寝前）",
      "estimatedMonthlyPrice": 月額目安（円・数値のみ）,
      "targetMarker": "改善を目指す検査値（例：ビタミンD 28→40-60 ng/mL）",
      "amazonSearchQuery": "Amazonで検索するキーワード（英語可）"
    }
  ],
  "totalMonthlyEstimate": 合計月額目安（円・数値）
}

サプリは3〜5種類。優先度highは最大2種類。
根拠のある提案のみ行い、不明な値に基づく推奨は避けてください。`,
      }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: '解析結果の取得に失敗しました' });

    const supplementData = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data: supplementData });
  } catch (error) {
    console.error('Supplement analysis error:', error);
    return res.status(500).json({ error: '解析中にエラーが発生しました' });
  }
}

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
    const { fileBase64, mediaType, healthGoal, exercise, dietStyle } = req.body as {
      fileBase64: string;
      mediaType: string;
      healthGoal: string;
      exercise: string;
      dietStyle: string;
    };

    if (!fileBase64 || !mediaType) {
      return res.status(400).json({ error: 'fileBase64 と mediaType は必須です' });
    }

    const isPdf = mediaType === 'application/pdf' || mediaType.includes('pdf');

    const userContext = [
      healthGoal  ? `健康ゴール: ${healthGoal}`   : null,
      exercise    ? `運動習慣: ${exercise}`         : null,
      dietStyle   ? `食事スタイル: ${dietStyle}`    : null,
    ].filter(Boolean).join('\n');

    const fileContent: Anthropic.MessageParam['content'][number] = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
      : { type: 'image',    source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: fileBase64 } };

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `血液検査レポートを解析し、以下のJSON形式のみで返してください。

{
  "markers": [{"name":"バイオマーカー名","value":"測定値","unit":"単位","reference_range":"基準値","status":"ok|borderline|low","note":"コメント"}],
  "overall_assessment": "総合評価（2〜3文）",
  "supplements": [{"name":"サプリ名","dosage":"用量","timing":"タイミング","reason":"理由（2文以内）","priority":"high|normal","monthly_cost":"月額目安"}],
  "dietary_advice": "食事アドバイス（3〜4文）"
}

statusはok（基準値内）/ borderline（やや外れ）/ low（明らかな不足）で判定。
記載のない項目は含めない。必ずvalidなJSONのみ返す。`,
      messages: [{
        role: 'user',
        content: [
          fileContent,
          {
            type: 'text',
            text: userContext
              ? `上記の血液検査結果を解析してください。\n\nユーザー情報:\n${userContext}`
              : '上記の血液検査結果を解析してください。',
          },
        ],
      }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: '解析結果のJSON取得に失敗しました', raw: responseText.slice(0, 300) });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Blood test analysis error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: '解析中にエラーが発生しました', detail: msg });
  }
}

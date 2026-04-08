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
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: `血液検査レポートを解析し、以下のJSON形式のみで返してください。

【重要：規制準拠ルール】
このサービスは医療診断ではなく、生活習慣改善の参考情報を提供するウェルネスツールです。以下のルールを厳守してください：
- 病名・疾患名を断定的に伝えない（例：「貧血です」「脂肪肝の可能性が高い」は禁止）
- 治療方針・薬の服用を指示しない
- 数値が基準を外れている場合は「医療機関での確認をお勧めします」と添える
- サプリや食事について「改善します」「治ります」等の断定表現を使わない
- 「一般的な栄養補給の選択肢として」「参考情報として」等の限定表現を使う

【表現の置き換えルール】
NG → OK
「〇〇欠乏症です」→「〇〇関連の指標に着目が必要です」
「〇〇の可能性が高いです」→「〇〇関連指標に注意が必要です。医療機関での確認も検討してください」
「〇〇を飲めば改善します」→「一般的な栄養補給の選択肢として〇〇が挙げられます」
「このアルゴリズムが判定します」→「生活改善の優先順位を整理します」

{
  "markers": [{"name":"バイオマーカー名","value":"測定値","unit":"単位","reference_range":"基準値","status":"ok|borderline|low","note":"コメント"}],
  "overall_assessment": "総合評価（2〜3文）",
  "supplements": [{"name":"サプリ名","dosage":"用量","timing":"タイミング","reason":"理由（2文以内）","priority":"high|normal","monthly_cost":"月額目安"}],
  "dietary_advice": "食事アドバイス（3〜4文）"
}

statusはok（基準値内）/ borderline（やや外れ）/ low（明らかな不足）で判定。
noteやoverall_assessment、dietary_adviceでは上記の規制準拠ルールに従った表現のみ使用すること。
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
    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'response:', responseText.substring(0, 200));
      return res.status(500).json({ success: false, error: 'レスポンスの解析に失敗しました（JSON不正）' });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Blood test analysis error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: '解析中にエラーが発生しました', detail: msg });
  }
}

import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false,
  },
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseForm(req: VercelRequest): Promise<{ buffer: Buffer; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    let fileBuffer: Buffer | null = null;
    let mimeType = 'application/pdf';

    bb.on('file', (_field, file, info) => {
      mimeType = info.mimeType || 'application/pdf';
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { buffer, mimeType } = await parseForm(req);
    const base64Data = buffer.toString('base64');
    const isImage = mimeType.startsWith('image/');

    const contentItem = isImage
      ? {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mimeType as 'image/jpeg' | 'image/png',
            data: base64Data,
          },
        }
      : {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64Data,
          },
        };

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          contentItem,
          {
            type: 'text',
            text: `この健康診断結果から以下の項目を抽出してください。
項目が存在しない場合はnullにしてください。
必ずJSON形式のみで返答し、前後の説明文は不要です。

{
  "checkupDate": "検診日（YYYY-MM-DD形式）",
  "age": 年齢（数値）,
  "gender": "性別（male/female）",
  "height": 身長cm（数値）,
  "weight": 体重kg（数値）,
  "bmi": BMI（数値）,
  "bloodPressureSystolic": 収縮期血圧（数値）,
  "bloodPressureDiastolic": 拡張期血圧（数値）,
  "totalCholesterol": 総コレステロール（数値）,
  "ldlCholesterol": LDLコレステロール（数値）,
  "hdlCholesterol": HDLコレステロール（数値）,
  "triglycerides": 中性脂肪（数値）,
  "bloodSugar": 血糖値（数値）,
  "hba1c": HbA1c（数値）,
  "uricAcid": 尿酸（数値）,
  "got": GOT/AST（数値）,
  "gpt": GPT/ALT（数値）,
  "gammaGtp": γ-GTP（数値）,
  "hemoglobin": ヘモグロビン（数値）,
  "vitaminD": ビタミンD ng/mL（数値、あれば）,
  "ferritin": フェリチン（数値、あれば）,
  "crp": CRP（数値、あれば）,
  "abnormalFlags": ["基準値外の項目名のリスト"],
  "doctorComment": "医師のコメント（あれば）",
  "overallRating": "総合評価（A/B/C/D等）"
}`
          }
        ]
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: '解析結果の取得に失敗しました' });
    }

    const healthData = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data: healthData });

  } catch (error) {
    console.error('Health check analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: '解析中にエラーが発生しました',
      detail: errorMessage
    });
  }
}

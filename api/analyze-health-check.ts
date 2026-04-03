import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const rawBody = Buffer.concat(chunks);

    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Invalid content type' });
    }
    const boundary = boundaryMatch[1];

    const bodyStr = rawBody.toString('binary');
    const parts = bodyStr.split('--' + boundary);

    let fileData: Buffer | null = null;
    let fileType = 'application/pdf';

    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data') && part.includes('name="file"')) {
        const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
        if (contentTypeMatch) fileType = contentTypeMatch[1].trim();
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const fileContent = part.substring(headerEnd + 4);
          const cleanContent = fileContent.replace(/\r\n$/, '').replace(/--$/, '');
          fileData = Buffer.from(cleanContent, 'binary');
        }
      }
    }

    if (!fileData) {
      return res.status(400).json({ error: 'ファイルが見つかりません' });
    }

    const base64Data = fileData.toString('base64');
    const isImage = fileType.startsWith('image/');

    const contentItem = isImage
      ? {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: fileType as 'image/jpeg' | 'image/png',
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
      messages: [
        {
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
}`,
            },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({ error: '解析結果の取得に失敗しました' });
    }

    const healthData = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data: healthData });
  } catch (error) {
    console.error('Health check analysis error:', error);
    return res.status(500).json({ error: '解析中にエラーが発生しました: ' + String(error) });
  }
}

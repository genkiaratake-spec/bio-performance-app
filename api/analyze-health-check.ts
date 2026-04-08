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
    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    });
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
  // CORS headers for Capacitor iOS app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { buffer, mimeType } = await parseForm(req);
    console.log('PDF buffer size:', buffer.length, 'mimeType:', mimeType);
    if (buffer.length < 100) {
      return res.status(400).json({ success: false, error: 'ファイルが空または破損しています' });
    }
    const base64Data = buffer.toString('base64');

    // MIMEタイプの正規化
    // iPhoneのSafariはPDFをoctet-streamで送ることがある
    let normalizedMimeType = mimeType;
    if (
      mimeType === 'application/octet-stream' ||
      mimeType === 'application/x-pdf' ||
      mimeType === '' ||
      !mimeType
    ) {
      normalizedMimeType = 'application/pdf';
    }

    const isImage = normalizedMimeType.startsWith('image/');

    const contentItem = isImage
      ? {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: normalizedMimeType as 'image/jpeg' | 'image/png',
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
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          contentItem,
          {
            type: 'text',
            text: `あなたはJSONのみを返すAPIです。説明文・前置き・コードブロック記号(\`\`\`)は一切含めず、必ずJSONオブジェクト { } のみで応答してください。

この健康診断結果から以下の項目を抽出してください。
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
  "vitaminD": ビタミンD ng/mL（数値、あれば。nmol/Lの場合は÷2.496で変換）,
  "ferritin": フェリチン ng/mL（数値、あれば）,
  "crp": CRP mg/dL（数値、あれば）,
  "vitaminB12": ビタミンB12 pg/mL（数値、あれば。pmol/Lの場合は×1.355で変換）,
  "folate": 葉酸 ng/mL（数値、あれば）,
  "homocysteine": ホモシステイン µmol/L（数値、あれば。mg/Lの場合は×7.4で変換）,
  "zinc": 血清亜鉛 µg/dL（数値、あれば）,
  "omega3Index": Omega-3 Index %（赤血球中EPA+DHA割合、数値、あれば）,
  "tsh": TSH µIU/mL（数値、あれば）,
  "ft3": 遊離T3 pg/mL（数値、あれば）,
  "ft4": 遊離T4 ng/dL（数値、あれば）,
  "tpoAntibody": TPOAb IU/mL（数値、あれば）,
  "cortisol": コルチゾール µg/dL（朝、数値、あれば）,
  "testosterone": テストステロン ng/dL（数値、あれば）,
  "homaIr": HOMA-IR（数値、あれば）,
  "hsCrp": 高感度CRP mg/L（数値、あれば。mg/dLの場合は×10で変換。crpと重複する場合はhsCrpに統合）,
  "apoB": ApoB（アポリポタンパクB）mg/dL（数値、あれば）,
  "lipoproteinA": リポタンパク(a) mg/dL（数値、あれば。nmol/Lの場合は÷2.5で変換）,
  "hematocrit": ヘマトクリット %（数値、あれば）,
  "rbc": 赤血球数 ×10⁶/µL（数値、あれば）,
  "calcium": 血清カルシウム mg/dL（数値、あれば）,
  "dheas": DHEA-S µg/dL（数値、あれば）,
  "lh": LH（黄体形成ホルモン）mIU/mL（数値、あれば）,
  "fsh": FSH（卵胞刺激ホルモン）mIU/mL（数値、あれば）,
  "estradiol": エストラジオール pg/mL（数値、あれば）,
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
      console.error('No JSON in response:', responseText.substring(0, 200));
      return res.status(500).json({ success: false, error: 'AIの応答からJSONを取得できませんでした' });
    }

    let healthData;
    try {
      healthData = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('JSON parse failed:', jsonMatch[0].substring(0, 200));
      return res.status(500).json({ success: false, error: 'レスポンスのJSON解析に失敗しました' });
    }
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

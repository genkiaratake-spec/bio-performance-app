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

// Map known keys from extractedBiomarkers to flat HealthCheckData fields
const KEY_MAP: Record<string, string> = {
  hba1c: 'hba1c',
  ldl: 'ldlCholesterol', ldlCholesterol: 'ldlCholesterol',
  hdl: 'hdlCholesterol', hdlCholesterol: 'hdlCholesterol',
  triglycerides: 'triglycerides', tg: 'triglycerides',
  bloodSugar: 'bloodSugar', fbg: 'bloodSugar',
  ast: 'got', got: 'got',
  alt: 'gpt', gpt: 'gpt',
  gammaGtp: 'gammaGtp', ggt: 'gammaGtp',
  hsCrp: 'hsCrp',
  crp: 'crp',
  vitaminD: 'vitaminD',
  ferritin: 'ferritin',
  hemoglobin: 'hemoglobin', hgb: 'hemoglobin',
  hematocrit: 'hematocrit',
  wbc: 'wbc',
  rbc: 'rbc',
  plt: 'plt', platelets: 'plt',
  uricAcid: 'uricAcid',
  creatinine: 'creatinine',
  egfr: 'egfr',
  bun: 'bun',
  totalProtein: 'totalProtein',
  albumin: 'albumin',
  totalCholesterol: 'totalCholesterol',
  tsh: 'tsh',
  ft3: 'ft3',
  ft4: 'ft4',
  bmi: 'bmi',
  systolicBp: 'bloodPressureSystolic',
  diastolicBp: 'bloodPressureDiastolic',
  waistCircumference: 'waistCircumference',
  weight: 'weight',
  height: 'height',
  vitaminB12: 'vitaminB12',
  folate: 'folate',
  homocysteine: 'homocysteine',
  zinc: 'zinc',
  omega3Index: 'omega3Index',
  tpoAntibody: 'tpoAntibody',
  cortisol: 'cortisol',
  testosterone: 'testosterone',
  homaIr: 'homaIr',
  apoB: 'apoB',
  lipoproteinA: 'lipoproteinA',
  calcium: 'calcium',
  dheas: 'dheas',
  lh: 'lh',
  fsh: 'fsh',
  estradiol: 'estradiol',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { buffer, mimeType } = await parseForm(req);
    console.log('PDF buffer size:', buffer.length, 'mimeType:', mimeType);
    if (buffer.length < 100) {
      return res.status(400).json({ success: false, error: 'ファイルが空または破損しています' });
    }
    const base64Data = buffer.toString('base64');

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
          source: { type: 'base64' as const, media_type: normalizedMimeType as 'image/jpeg' | 'image/png', data: base64Data },
        }
      : {
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64Data },
        };

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          contentItem,
          {
            type: 'text',
            text: `あなたは健康診断・血液検査レポートを読み取る専門AIです。
添付ファイルから検査値をすべて抽出し、以下の形式のJSONのみを返してください。
説明文・コードブロック・マークダウン記号は不要です。

抽出ルール：
1. ファイルに含まれる全ての検査項目を抽出する（事前定義の項目に限定しない）
2. 各項目を以下の形式で返す
3. 値が読み取れない項目はnullとする
4. 単位変換が必要な場合は変換して返す

単位変換ルール：
- 25(OH)D: nmol/L → ng/mL の場合は ÷2.496
- B12: pmol/L → pg/mL の場合は ×1.355
- CRP: mg/dL → mg/L の場合は ×10
- ホモシステイン: mg/L → µmol/L の場合は ×7.4
- HbA1c: mmol/mol(IFCC) → % の場合は (値×0.0915)+2.15

返却形式：
{
  "extractedBiomarkers": [
    {
      "key": "snake_case_english_key",
      "label": "検査項目名（日本語）",
      "value": 数値またはnull,
      "unit": "単位",
      "referenceRange": "基準値（例：0-5.5）または null",
      "isAbnormal": true/false/null
    }
  ],
  "checkupDate": "YYYY-MM-DD または null",
  "institutionName": "検査機関名 または null",
  "overallRating": "総合判定（例：A・B・C1・C2・D）または null"
}

keyの命名規則（既存フィールドとの互換性のため以下に従う）：
  HbA1c → "hba1c"
  LDL → "ldlCholesterol"
  HDL → "hdlCholesterol"
  中性脂肪・TG → "triglycerides"
  血糖値・グルコース → "bloodSugar"
  AST・GOT → "ast"
  ALT・GPT → "alt"
  γGTP・γ-GT → "gammaGtp"
  hs-CRP・高感度CRP → "hsCrp"
  CRP（通常感度）→ "crp"
  ビタミンD・25(OH)D → "vitaminD"
  フェリチン → "ferritin"
  ヘモグロビン → "hemoglobin"
  ヘマトクリット → "hematocrit"
  白血球 → "wbc"
  赤血球 → "rbc"
  血小板 → "platelets"
  尿酸 → "uricAcid"
  クレアチニン → "creatinine"
  eGFR → "egfr"
  BUN・尿素窒素 → "bun"
  総タンパク → "totalProtein"
  アルブミン → "albumin"
  総コレステロール → "totalCholesterol"
  TSH → "tsh"
  FT3 → "ft3"
  FT4 → "ft4"
  BMI → "bmi"
  収縮期血圧 → "systolicBp"
  拡張期血圧 → "diastolicBp"
  腹囲 → "waistCircumference"
  体重 → "weight"
  身長 → "height"
  上記以外の項目 → 日本語名をローマ字またはスネークケース英語に変換して命名`
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

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('JSON parse failed:', jsonMatch[0].substring(0, 200));
      return res.status(500).json({ success: false, error: 'レスポンスのJSON解析に失敗しました' });
    }

    const extractedBiomarkers: any[] = parsed.extractedBiomarkers || [];

    // Build flat HealthCheckData object for backward compatibility
    const flatData: Record<string, any> = {
      checkupDate: parsed.checkupDate || null,
      overallRating: parsed.overallRating || null,
      institutionName: parsed.institutionName || null,
      abnormalFlags: [] as string[],
    };

    const abnormals: string[] = [];

    for (const bm of extractedBiomarkers) {
      if (!bm.key || bm.value === null || bm.value === undefined) continue;

      // Map to known flat field
      const flatKey = KEY_MAP[bm.key] || bm.key;
      if (!(flatKey in flatData)) {
        flatData[flatKey] = bm.value;
      }

      if (bm.isAbnormal === true) {
        abnormals.push(bm.label || bm.key);
      }
    }

    flatData.abnormalFlags = abnormals;
    flatData.allBiomarkers = extractedBiomarkers;
    flatData.totalExtracted = extractedBiomarkers.filter((b: any) => b.value !== null).length;

    return res.status(200).json({ success: true, data: flatData });

  } catch (error) {
    console.error('Health check analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: '解析中にエラーが発生しました',
      detail: errorMessage
    });
  }
}

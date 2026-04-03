import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'ファイルが必要です' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const isImage = file.type.startsWith('image/');
    const mediaType = isImage
      ? (file.type as 'image/jpeg' | 'image/png')
      : 'application/pdf';

    const contentItem = isImage
      ? {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType as 'image/jpeg' | 'image/png',
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
      return new Response(
        JSON.stringify({ error: '解析結果の取得に失敗しました' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const healthData = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, data: healthData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Health check analysis error:', error);
    return new Response(
      JSON.stringify({ error: '解析中にエラーが発生しました' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

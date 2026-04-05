import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ProductResult {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sodium?: number;
  image_url?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { barcode, bloodTestResults } = req.body as { barcode: string; bloodTestResults?: any };

    if (!barcode) {
      return res.status(400).json({ error: 'バーコードが必要です' });
    }

    // ── 1. Open Food Facts lookup ──────────────────────────────────────────
    const offUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_ja,brands,nutriments,image_url`;
    const offRes = await fetch(offUrl, {
      headers: { 'User-Agent': 'BioPerformanceApp/1.0 (contact@example.com)' },
    });

    if (!offRes.ok) {
      return res.status(200).json({ found: false });
    }

    const offData = await offRes.json() as any;

    if (offData.status !== 1 || !offData.product) {
      return res.status(200).json({ found: false });
    }

    const p = offData.product;
    const n = p.nutriments || {};

    const product: ProductResult = {
      name:      p.product_name_ja || p.product_name || '不明な商品',
      brand:     p.brands || '',
      calories:  Math.round(n['energy-kcal_100g'] ?? n['energy_100g'] ?? 0),
      protein:   Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
      fat:       Math.round((n['fat_100g'] ?? 0) * 10) / 10,
      carbs:     Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
      fiber:     n['fiber_100g'] != null ? Math.round(n['fiber_100g'] * 10) / 10 : undefined,
      sodium:    n['sodium_100g'] != null ? Math.round(n['sodium_100g'] * 1000 * 10) / 10 : undefined,
      image_url: p.image_url || undefined,
    };

    // ── 2. Claude AI advice ────────────────────────────────────────────────
    let nutritionText = `商品名: ${product.name}`;
    if (product.brand) nutritionText += `\nブランド: ${product.brand}`;
    nutritionText += `\n\n【100g当たりの栄養成分】
- カロリー: ${product.calories} kcal
- タンパク質: ${product.protein} g
- 脂質: ${product.fat} g
- 炭水化物: ${product.carbs} g`;
    if (product.fiber != null)  nutritionText += `\n- 食物繊維: ${product.fiber} g`;
    if (product.sodium != null) nutritionText += `\n- 食塩相当量: ${product.sodium} mg`;

    let bloodContext = '';
    if (bloodTestResults?.markers?.length) {
      const low  = bloodTestResults.markers.filter((m: any) => m.status === 'low').map((m: any) => m.name);
      const high = bloodTestResults.markers.filter((m: any) => m.status === 'borderline').map((m: any) => m.name);
      if (low.length)  bloodContext += `\n不足傾向の検査項目: ${low.join(', ')}`;
      if (high.length) bloodContext += `\n基準値上限に近い項目: ${high.join(', ')}`;
    }

    const userMessage = bloodContext
      ? `${nutritionText}\n\n【血液検査データ】${bloodContext}`
      : nutritionText;

    const claudeRes = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: '食品の栄養情報と血液検査結果を照合して、2〜3文の簡潔な日本語アドバイスを返してください。血液検査データがない場合は一般的な栄養コメントを返してください。アドバイスのみ返し、余計な前置きは不要です。',
      messages: [{ role: 'user', content: userMessage }],
    });

    const aiAdvice = (claudeRes.content[0] as any).text?.trim() || '';

    // Check for warnings based on blood test
    let warning: string | undefined;
    if (bloodTestResults?.markers?.length) {
      const markers = bloodTestResults.markers as Array<{ name: string; status: string }>;
      const hasHighTriglycerides = markers.some(m =>
        (m.name.includes('中性脂肪') || m.name.includes('トリグリセリド')) && m.status === 'borderline'
      );
      const hasHighLDL = markers.some(m =>
        (m.name.includes('LDL') || m.name.includes('悪玉')) && m.status === 'borderline'
      );

      const warnings: string[] = [];
      if (hasHighTriglycerides && product.carbs > 50) {
        warnings.push('糖質が高めです。中性脂肪が気になる方は摂取量に注意してください。');
      }
      if (hasHighLDL && product.fat > 15) {
        warnings.push('脂質が高めです。LDLコレステロールが気になる方は量に注意してください。');
      }
      if (warnings.length) warning = warnings.join(' ');
    }

    return res.status(200).json({ found: true, product, aiAdvice, warning });

  } catch (err: any) {
    console.error('lookup-barcode error:', err);
    return res.status(500).json({ error: 'サーバーエラーが発生しました', details: err.message });
  }
}

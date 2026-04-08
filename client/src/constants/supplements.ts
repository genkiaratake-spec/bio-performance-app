export const AMAZON_ASSOCIATE_ID = "XXXXX-22";

export type SupplementPriority = "high" | "medium";

export type Supplement = {
  name: string;
  productName: string;
  dosage: string;
  timing: string;
  priority: SupplementPriority;
  reason: string;
  biomarker?: string;
  currentValue?: string;
  targetValue?: string;
  monthlyPrice: number;
  amazonUrl: string;
};

export const SUPPLEMENTS: Supplement[] = [
  {
    name: "ビタミン D+K",
    productName: "Life Extension Vitamins D and K with Sea-Iodine",
    dosage: "1カプセル / 日",
    timing: "食事と一緒に",
    priority: "high",
    reason:
      "ビタミンD3（5,000 IU）＋K1・K2（MK-4・MK-7）を1カプセルで補給。一般的な栄養補給の選択肢として、骨・免疫・血管の健康維持が期待できます。",
    biomarker: "ビタミンD",
    currentValue: "28 ng/mL",
    targetValue: "40-60 ng/mL",
    monthlyPrice: 2800,
    amazonUrl: `https://www.amazon.co.jp/s?k=Life+Extension+Vitamins+D+and+K+Sea-Iodine&tag=${AMAZON_ASSOCIATE_ID}`,
  },
  {
    name: "マグネシウム",
    productName: "Life Extension Magnesium Glycinate",
    dosage: "2〜3カプセル / 日（105〜315mg）",
    timing: "就寝前",
    priority: "high",
    reason:
      "グリシン酸マグネシウム（高吸収型）。一般的な栄養補給の選択肢として、睡眠の質・筋弛緩・ストレス軽減への寄与が期待できます。酸化マグネシウムと比べて吸収率が高いとされています。",
    monthlyPrice: 2200,
    amazonUrl: `https://www.amazon.co.jp/s?k=Life+Extension+Magnesium+Glycinate&tag=${AMAZON_ASSOCIATE_ID}`,
  },
  {
    name: "オメガ3",
    productName: "Life Extension Super Omega-3 EPA/DHA Fish Oil",
    dosage: "2カプセル / 日（EPA 1,400mg / DHA 1,000mg）",
    timing: "食事と一緒に",
    priority: "medium",
    reason:
      "EPA・DHAオメガ3脂肪酸＋セサミリグナン＋オリーブポリフェノール配合。一般的な栄養補給の選択肢として、心臓・脳の健康維持への寄与が期待できます。",
    biomarker: "CRP",
    currentValue: "0.3 mg/L",
    targetValue: "< 0.5 mg/L（維持）",
    monthlyPrice: 3200,
    amazonUrl: `https://www.amazon.co.jp/s?k=Life+Extension+Super+Omega-3+EPA+DHA&tag=${AMAZON_ASSOCIATE_ID}`,
  },
  {
    name: "ビタミンB群",
    productName: "Life Extension BioActive Complete B-Complex",
    dosage: "1カプセル / 日",
    timing: "朝食後",
    priority: "medium",
    reason:
      "8種類のビタミンBを活性型（バイオアクティブ）フォームで配合。一般的な栄養補給の選択肢として、エネルギー代謝・神経機能の維持への寄与が期待できます。",
    monthlyPrice: 1800,
    amazonUrl: `https://www.amazon.co.jp/s?k=Life+Extension+BioActive+B-Complex&tag=${AMAZON_ASSOCIATE_ID}`,
  },
];

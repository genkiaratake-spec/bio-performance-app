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
      "ビタミンD3（5,000 IU）＋K1・K2（MK-4・MK-7）を1カプセルで補給。骨密度・免疫機能・血管健康を総合サポート。K2がカルシウムを骨へ適切に誘導し、動脈への沈着を防ぐ。",
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
      "グリシン酸マグネシウム（高吸収型）。睡眠の質向上・筋弛緩・ストレス軽減・心臓・骨・神経機能をサポート。酸化マグネシウムと比べて吸収率が高く、胃腸への負担が少ない。",
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
      "EPA・DHAオメガ3脂肪酸＋セサミリグナン＋オリーブポリフェノール配合。心臓・脳・炎症管理をサポート。南太平洋の海洋哺乳類に配慮した漁業から採取したワイルドキャッチ。",
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
      "8種類のビタミンBを活性型（バイオアクティブ）フォームで配合。エネルギー代謝・心臓・脳・神経機能をサポート。メチルコバラミン（B12）・5-MTHF（葉酸）など吸収率の高い形態を使用。",
    monthlyPrice: 1800,
    amazonUrl: `https://www.amazon.co.jp/s?k=Life+Extension+BioActive+B-Complex&tag=${AMAZON_ASSOCIATE_ID}`,
  },
];

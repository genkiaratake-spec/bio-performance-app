import type { HealthCheckData, BiomarkerStatus, BiomarkerEntry, HealthCategory } from '../types/healthCheck';

/* ------------------------------------------------------------------ */
/*  Biomarker definitions                                              */
/* ------------------------------------------------------------------ */
interface BiomarkerDef {
  key: string;
  label: string;
  unit: string;
  categories: HealthCategory[];
  optimalRange: string;
  evaluate: (v: number) => BiomarkerStatus;
}

const DEFS: BiomarkerDef[] = [
  { key: 'hba1c', label: 'HbA1c', unit: '%', categories: ['metabolism'],
    optimalRange: '<5.5%',
    evaluate: v => v < 5.5 ? 'optimal' : v < 6.0 ? 'sufficient' : 'out_of_range' },
  { key: 'bloodSugar', label: '空腹時血糖', unit: 'mg/dL', categories: ['metabolism'],
    optimalRange: '70–99',
    evaluate: v => (v >= 70 && v <= 99) ? 'optimal' : (v >= 100 && v <= 109) ? 'sufficient' : 'out_of_range' },
  { key: 'homaIr', label: 'HOMA-IR', unit: '', categories: ['metabolism'],
    optimalRange: '<1.5',
    evaluate: v => v < 1.5 ? 'optimal' : v < 2.5 ? 'sufficient' : 'out_of_range' },
  { key: 'ldlCholesterol', label: 'LDL-C', unit: 'mg/dL', categories: ['metabolism', 'heart'],
    optimalRange: '<100',
    evaluate: v => v < 100 ? 'optimal' : v < 130 ? 'sufficient' : 'out_of_range' },
  { key: 'hdlCholesterol', label: 'HDL-C', unit: 'mg/dL', categories: ['metabolism', 'heart'],
    optimalRange: '≥60',
    evaluate: v => v >= 60 ? 'optimal' : v >= 50 ? 'sufficient' : 'out_of_range' },
  { key: 'triglycerides', label: '中性脂肪', unit: 'mg/dL', categories: ['metabolism', 'heart'],
    optimalRange: '<100',
    evaluate: v => v < 100 ? 'optimal' : v < 150 ? 'sufficient' : 'out_of_range' },
  { key: 'apoB', label: 'ApoB', unit: 'mg/dL', categories: ['metabolism', 'heart'],
    optimalRange: '<80',
    evaluate: v => v < 80 ? 'optimal' : v < 100 ? 'sufficient' : 'out_of_range' },
  { key: 'lipoproteinA', label: 'Lp(a)', unit: 'mg/dL', categories: ['heart'],
    optimalRange: '<30',
    evaluate: v => v < 30 ? 'optimal' : v < 50 ? 'sufficient' : 'out_of_range' },
  { key: 'hsCrp', label: 'hs-CRP', unit: 'mg/L', categories: ['inflammation', 'heart'],
    optimalRange: '<0.5',
    evaluate: v => v < 0.5 ? 'optimal' : v < 1.0 ? 'sufficient' : 'out_of_range' },
  { key: 'vitaminD', label: '25(OH)D', unit: 'ng/mL', categories: ['nutrients', 'inflammation', 'cognition'],
    optimalRange: '40–60',
    evaluate: v => (v >= 40 && v <= 60) ? 'optimal' : (v >= 20 && v < 40) ? 'sufficient' : 'out_of_range' },
  { key: 'ferritin', label: 'フェリチン', unit: 'ng/mL', categories: ['nutrients', 'inflammation', 'fitness'],
    optimalRange: '50–200',
    evaluate: v => (v >= 50 && v <= 200) ? 'optimal' : (v >= 20 && v < 50) ? 'sufficient' : 'out_of_range' },
  { key: 'vitaminB12', label: 'ビタミンB12', unit: 'pg/mL', categories: ['nutrients', 'cognition'],
    optimalRange: '≥800',
    evaluate: v => v >= 800 ? 'optimal' : v >= 400 ? 'sufficient' : 'out_of_range' },
  { key: 'homocysteine', label: 'ホモシステイン', unit: 'µmol/L', categories: ['nutrients', 'cognition', 'heart'],
    optimalRange: '<8',
    evaluate: v => v < 8 ? 'optimal' : v < 10 ? 'sufficient' : 'out_of_range' },
  { key: 'folate', label: '葉酸', unit: 'ng/mL', categories: ['nutrients'],
    optimalRange: '≥10',
    evaluate: v => v >= 10 ? 'optimal' : v >= 5 ? 'sufficient' : 'out_of_range' },
  { key: 'zinc', label: '亜鉛', unit: 'µg/dL', categories: ['nutrients', 'hormones'],
    optimalRange: '80–120',
    evaluate: v => (v >= 80 && v <= 120) ? 'optimal' : (v >= 70 && v < 80) ? 'sufficient' : 'out_of_range' },
  { key: 'omega3Index', label: 'Omega-3 Index', unit: '%', categories: ['nutrients', 'heart', 'cognition'],
    optimalRange: '≥8%',
    evaluate: v => v >= 8 ? 'optimal' : v >= 4 ? 'sufficient' : 'out_of_range' },
  { key: 'calcium', label: 'カルシウム', unit: 'mg/dL', categories: ['nutrients'],
    optimalRange: '8.5–10.5',
    evaluate: v => (v >= 8.5 && v <= 10.5) ? 'optimal' : (v >= 8.0 && v < 8.5) ? 'sufficient' : 'out_of_range' },
  { key: 'tsh', label: 'TSH', unit: 'µIU/mL', categories: ['hormones', 'cognition'],
    optimalRange: '1.0–2.5',
    evaluate: v => (v >= 1.0 && v <= 2.5) ? 'optimal' : ((v >= 0.5 && v < 1.0) || (v > 2.5 && v <= 4.5)) ? 'sufficient' : 'out_of_range' },
  { key: 'ft3', label: 'FT3', unit: 'pg/mL', categories: ['hormones'],
    optimalRange: '3.0–4.0',
    evaluate: v => (v >= 3.0 && v <= 4.0) ? 'optimal' : (v >= 2.3 && v <= 4.5) ? 'sufficient' : 'out_of_range' },
  { key: 'ft4', label: 'FT4', unit: 'ng/dL', categories: ['hormones'],
    optimalRange: '1.0–1.5',
    evaluate: v => (v >= 1.0 && v <= 1.5) ? 'optimal' : (v >= 0.8 && v <= 1.7) ? 'sufficient' : 'out_of_range' },
  { key: 'tpoAntibody', label: 'TPOAb', unit: 'IU/mL', categories: ['hormones', 'inflammation'],
    optimalRange: '<35',
    evaluate: v => v < 35 ? 'optimal' : v < 100 ? 'sufficient' : 'out_of_range' },
  { key: 'cortisol', label: 'コルチゾール(朝)', unit: 'µg/dL', categories: ['hormones', 'cognition'],
    optimalRange: '8–18',
    evaluate: v => (v >= 8 && v <= 18) ? 'optimal' : ((v >= 5 && v < 8) || (v > 18 && v <= 22)) ? 'sufficient' : 'out_of_range' },
  { key: 'testosterone', label: 'テストステロン', unit: 'ng/dL', categories: ['hormones', 'fitness'],
    optimalRange: '500–900(男性)',
    evaluate: v => (v >= 500 && v <= 900) ? 'optimal' : (v >= 300 && v < 500) ? 'sufficient' : 'out_of_range' },
  { key: 'dheas', label: 'DHEA-S', unit: 'µg/dL', categories: ['hormones'],
    optimalRange: '男性200–400',
    evaluate: v => (v >= 200 && v <= 400) ? 'optimal' : (v >= 100 && v < 200) ? 'sufficient' : 'out_of_range' },
  { key: 'hemoglobin', label: 'ヘモグロビン', unit: 'g/dL', categories: ['fitness'],
    optimalRange: '男性14–17',
    evaluate: v => (v >= 14 && v <= 17) ? 'optimal' : (v >= 12 && v < 14) ? 'sufficient' : 'out_of_range' },
  { key: 'hematocrit', label: 'ヘマトクリット', unit: '%', categories: ['fitness', 'cognition'],
    optimalRange: '男性40–50%',
    evaluate: v => (v >= 40 && v <= 50) ? 'optimal' : (v >= 36 && v < 40) ? 'sufficient' : 'out_of_range' },
  { key: 'rbc', label: '赤血球', unit: '×10⁶/µL', categories: ['fitness', 'nutrients', 'cognition'],
    optimalRange: '4.5–5.5',
    evaluate: v => (v >= 4.5 && v <= 5.5) ? 'optimal' : (v >= 4.0 && v < 4.5) ? 'sufficient' : 'out_of_range' },
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */
export function getBiomarkerStatus(key: string, value: number | null): BiomarkerStatus {
  if (value === null || value === undefined) return 'unavailable';
  const def = DEFS.find(d => d.key === key);
  if (!def) return 'unavailable';
  return def.evaluate(value);
}

export function evaluateBiomarkers(data: HealthCheckData): BiomarkerEntry[] {
  const entries: BiomarkerEntry[] = [];
  const seen = new Set<string>();
  for (const def of DEFS) {
    if (seen.has(def.key)) continue;
    seen.add(def.key);
    const val = (data as any)[def.key] as number | null;
    const status = val !== null && val !== undefined ? def.evaluate(val) : 'unavailable';
    // Add one entry per primary category
    entries.push({
      key: def.key,
      label: def.label,
      value: val,
      unit: def.unit,
      status,
      category: def.categories[0],
      optimalRange: def.optimalRange,
    });
  }
  return entries;
}

export function groupByCategory(entries: BiomarkerEntry[]): Record<HealthCategory, BiomarkerEntry[]> {
  const result: Record<HealthCategory, BiomarkerEntry[]> = {
    metabolism: [], heart: [], hormones: [], inflammation: [],
    nutrients: [], fitness: [], cognition: [],
  };
  // Use DEFS to assign markers to ALL their categories (not just primary)
  const entryMap = new Map(entries.map(e => [e.key, e]));
  for (const def of DEFS) {
    const entry = entryMap.get(def.key);
    if (!entry) continue;
    for (const cat of def.categories) {
      if (!result[cat].some(e => e.key === entry.key)) {
        result[cat].push({ ...entry, category: cat });
      }
    }
  }
  return result;
}

export function getCategoryScore(entries: BiomarkerEntry[]): {
  total: number; measured: number; optimal: number; sufficient: number; outOfRange: number;
} {
  const total = entries.length;
  const measured = entries.filter(e => e.status !== 'unavailable').length;
  const optimal = entries.filter(e => e.status === 'optimal').length;
  const sufficient = entries.filter(e => e.status === 'sufficient').length;
  const outOfRange = entries.filter(e => e.status === 'out_of_range').length;
  return { total, measured, optimal, sufficient, outOfRange };
}

export { DEFS as BIOMARKER_DEFS };

/* ------------------------------------------------------------------ */
/*  BiO basic panel 75 biomarker keys                                  */
/* ------------------------------------------------------------------ */
export const BIO_75_BIOMARKER_KEYS = new Set([
  'totalProtein', 'bun', 'bloodUreaNitrogen', 'ureaNitrogen',
  'creatinine', 'uricAcid', 'egfr',
  'hdl', 'hdlCholesterol', 'ldl', 'ldlCholesterol',
  'triglycerides', 'tg', 'totalCholesterol', 'nonHdlCholesterol',
  'freeFattyAcid', 'nefa',
  'ldh', 'lactateDehydrogenase',
  'ast', 'got', 'alt', 'gpt',
  'alp', 'alkalinePhosphatase',
  'che', 'cholinesterase',
  'ggt', 'gammaGtp',
  'ck', 'cpk', 'creatineKinase',
  'amylase',
  'totalBilirubin', 'directBilirubin', 'indirectBilirubin',
  'glucose', 'bloodSugar', 'fbg', 'hba1c', 'insulin', 'homaIr',
  'sodium', 'potassium', 'chloride', 'chlor',
  'calcium', 'phosphorus', 'phosphate',
  'iron', 'serumIron', 'uibc', 'tibc',
  'ferritin', 'magnesium', 'copper', 'zinc',
  'crp', 'hsCrp', 'homocysteine',
  'tsh', 'ft3', 'ft4', 'tpoAntibody',
  'wbc', 'whiteBloodCells', 'rbc', 'redBloodCells',
  'reticulocytes', 'hemoglobin', 'hgb',
  'hematocrit', 'ht', 'mcv', 'mch', 'mchc',
  'platelets', 'plt', 'rdw', 'mpv',
  'neutrophilPct', 'neutrophils',
  'lymphocytePct', 'lymphocytes',
  'monocytePct', 'monocytes',
  'eosinophilPct', 'eosinophils',
  'basophilPct', 'basophils',
  'albumin', 'globulin', 'agRatio',
  'alpha1Globulin', 'alpha2Globulin', 'betaGlobulin', 'gammaGlobulin',
  'testosterone', 'freeTestosterone', 'shbg',
  'cortisol', 'dheas', 'dhea',
  'estradiol', 'fsh', 'lh',
  'vitaminD', 'twentyFiveOHD',
  'vitaminB12', 'b12', 'folate',
  'omega3Index', 'ceruloplasmin',
  'hPyloriAntibody', 'pepsinogen1', 'pepsinogen2', 'pepsinogenRatio',
  'apoB', 'lipoproteinA', 'lpa',
  'cea', 'ca19_9', 'psa', 'afp',
]);

export const BIO_75_UNIQUE_COUNT = 75;

export const NON_BLOOD_TEST_KEYS = new Set([
  'height', 'weight', 'bmi', 'bodyFatPct', 'waistCircumference',
  'standardWeight', 'obesityDegree', 'visceralFatCt',
  'systolicBp', 'diastolicBp', 'bloodPressure',
  'vision', 'eyePressure', 'hearing',
  'fvc', 'fev1', 'fev1Ratio', 'vitalCapacity',
  'ecg', 'abi', 'pwv',
  'urineProtein', 'urineGlucose', 'urobilinogen',
  'urineBilirubin', 'urinePH', 'urineSpecificGravity',
  'urineKetone', 'urineRbc', 'urineWbc', 'urineEpithelial',
]);

/* ------------------------------------------------------------------ */
/*  Range bar data                                                     */
/* ------------------------------------------------------------------ */
export interface BiomarkerRange {
  min: number;
  sufficientLow?: number;
  optimalLow: number;
  optimalHigh: number;
  sufficientHigh?: number;
  max: number;
}

const RANGES: Record<string, BiomarkerRange> = {
  hba1c:          { min: 4.0, sufficientLow: 5.0, optimalLow: 4.5, optimalHigh: 5.5, sufficientHigh: 5.9, max: 8.0 },
  bloodSugar:     { min: 50, sufficientLow: 70, optimalLow: 70, optimalHigh: 99, sufficientHigh: 109, max: 150 },
  homaIr:         { min: 0, optimalLow: 0, optimalHigh: 1.5, sufficientHigh: 2.4, max: 5.0 },
  ldlCholesterol: { min: 40, optimalLow: 0, optimalHigh: 100, sufficientHigh: 129, max: 200 },
  hdlCholesterol: { min: 20, sufficientLow: 50, optimalLow: 60, optimalHigh: 100, max: 120 },
  triglycerides:  { min: 0, optimalLow: 0, optimalHigh: 100, sufficientHigh: 149, max: 300 },
  apoB:           { min: 0, optimalLow: 0, optimalHigh: 80, sufficientHigh: 99, max: 160 },
  lipoproteinA:   { min: 0, optimalLow: 0, optimalHigh: 30, sufficientHigh: 49, max: 100 },
  hsCrp:          { min: 0, optimalLow: 0, optimalHigh: 0.5, sufficientHigh: 0.9, max: 5.0 },
  vitaminD:       { min: 0, sufficientLow: 20, optimalLow: 40, optimalHigh: 60, sufficientHigh: 80, max: 100 },
  ferritin:       { min: 0, sufficientLow: 20, optimalLow: 50, optimalHigh: 200, max: 400 },
  vitaminB12:     { min: 0, sufficientLow: 400, optimalLow: 800, optimalHigh: 2000, max: 2500 },
  homocysteine:   { min: 0, optimalLow: 0, optimalHigh: 8, sufficientHigh: 9.9, max: 20 },
  folate:         { min: 0, sufficientLow: 5, optimalLow: 10, optimalHigh: 25, max: 40 },
  zinc:           { min: 40, sufficientLow: 70, optimalLow: 80, optimalHigh: 120, max: 160 },
  omega3Index:    { min: 0, sufficientLow: 4, optimalLow: 8, optimalHigh: 14, max: 18 },
  calcium:        { min: 7, sufficientLow: 8.0, optimalLow: 8.5, optimalHigh: 10.5, sufficientHigh: 11, max: 12 },
  tsh:            { min: 0, sufficientLow: 0.5, optimalLow: 1.0, optimalHigh: 2.5, sufficientHigh: 4.5, max: 8 },
  ft3:            { min: 1.5, sufficientLow: 2.3, optimalLow: 3.0, optimalHigh: 4.0, sufficientHigh: 4.5, max: 6 },
  ft4:            { min: 0.5, sufficientLow: 0.8, optimalLow: 1.0, optimalHigh: 1.5, sufficientHigh: 1.7, max: 2.5 },
  tpoAntibody:    { min: 0, optimalLow: 0, optimalHigh: 35, sufficientHigh: 100, max: 300 },
  cortisol:       { min: 0, sufficientLow: 5, optimalLow: 8, optimalHigh: 18, sufficientHigh: 22, max: 30 },
  testosterone:   { min: 100, sufficientLow: 300, optimalLow: 500, optimalHigh: 900, max: 1200 },
  dheas:          { min: 50, sufficientLow: 100, optimalLow: 200, optimalHigh: 400, max: 600 },
  hemoglobin:     { min: 8, sufficientLow: 12, optimalLow: 14, optimalHigh: 17, sufficientHigh: 18, max: 20 },
  hematocrit:     { min: 28, sufficientLow: 36, optimalLow: 40, optimalHigh: 50, sufficientHigh: 54, max: 60 },
  rbc:            { min: 3.0, sufficientLow: 4.0, optimalLow: 4.5, optimalHigh: 5.5, sufficientHigh: 6.0, max: 7.0 },
};

export function getBiomarkerRange(key: string): BiomarkerRange | null {
  return RANGES[key] || null;
}

export function getBarPosition(key: string, value: number): number {
  const range = RANGES[key];
  if (!range) return 50;
  const clamped = Math.max(range.min, Math.min(range.max, value));
  return ((clamped - range.min) / (range.max - range.min)) * 100;
}

/* ------------------------------------------------------------------ */
/*  Biomarker descriptions                                             */
/* ------------------------------------------------------------------ */
export const BIOMARKER_DESCRIPTIONS: Record<string, string> = {
  hba1c: '過去2〜3ヶ月の平均血糖値を反映する指標。糖尿病リスクの評価に重要。',
  bloodSugar: '空腹時の血糖値。インスリン抵抗性や糖代謝の基本指標。',
  homaIr: 'インスリン抵抗性の指標。空腹時血糖とインスリンから算出。',
  ldlCholesterol: '「悪玉コレステロール」。動脈硬化の主要リスク因子。',
  hdlCholesterol: '「善玉コレステロール」。動脈から余分なコレステロールを回収する。',
  triglycerides: '中性脂肪。食事やアルコールの影響を受けやすい。',
  apoB: '動脈硬化リスクの最も正確な指標。LDLより予測力が高い。',
  lipoproteinA: '遺伝的に決まる心血管リスク因子。LDLが正常でも高値の場合がある。',
  hsCrp: '体内の慢性炎症レベルを検出。心血管疾患リスクの独立予測因子。',
  vitaminD: '免疫・骨密度・気分に関与。日本人の約70%が不足。',
  ferritin: '体内の鉄貯蔵量を反映。貧血がなくても低値なら鉄欠乏の可能性。',
  vitaminB12: '神経機能・赤血球生成に必須。菜食・胃薬服用者で不足しやすい。',
  homocysteine: '心血管・認知症リスクのマーカー。葉酸・B12不足で上昇。',
  folate: '細胞分裂・DNA合成に必要。ホモシステインの代謝にも関与。',
  zinc: '免疫・ホルモン・酵素反応に関与する必須ミネラル。',
  omega3Index: '赤血球中のEPA+DHA割合。心血管・抗炎症の指標。',
  calcium: '骨・筋肉・神経機能に必須。副甲状腺ホルモンと連動。',
  tsh: '甲状腺機能の基本指標。代謝・エネルギー・体重に影響。',
  ft3: '活性型甲状腺ホルモン。実際の代謝活性を反映。',
  ft4: '甲状腺ホルモンの前駆体。T3に変換されて機能する。',
  tpoAntibody: '甲状腺自己免疫の指標。橋本病のスクリーニングに使用。',
  cortisol: 'ストレスホルモン。朝に高く夕方に低下するのが正常。',
  testosterone: '筋肉量・エネルギー・気分に直結。40代以降で低下傾向。',
  dheas: '副腎由来のホルモン。テストステロンの前駆体。加齢で低下。',
  hemoglobin: '酸素運搬能力の指標。貧血のスクリーニングに使用。',
  hematocrit: '血液中の赤血球の割合。酸素運搬能力と関連。',
  rbc: '赤血球数。酸素運搬・貧血の基本指標。',
};

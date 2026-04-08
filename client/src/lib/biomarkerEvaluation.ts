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

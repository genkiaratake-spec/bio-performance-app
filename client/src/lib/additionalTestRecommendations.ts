import type { HealthCheckData } from '../types/healthCheck';

export interface AdditionalTest {
  key: string;
  name: string;
  category: string;
  impact: 'high' | 'medium';
  reason: string;
  approximateCost: string;
  searchQuery: string;
}

const ADDITIONAL_TESTS: AdditionalTest[] = [
  { key:'vitaminD', name:'ビタミンD（25(OH)D）', category:'栄養素・炎症', impact:'high',
    reason:'日本人の約70%が不足。免疫・骨・炎症の鍵となる指標で、標準健診に含まれない。',
    approximateCost:'約2,000〜4,000円（自費）', searchQuery:'ビタミンD 血液検査 自費 クリニック' },
  { key:'ferritin', name:'フェリチン（貯蔵鉄）', category:'栄養素・フィットネス', impact:'high',
    reason:'貧血がなくても鉄欠乏による慢性疲労を見逃す原因。ヘモグロビンとは別に測定が必要。',
    approximateCost:'約1,000〜2,000円（自費）', searchQuery:'フェリチン 血液検査 自費' },
  { key:'hsCrp', name:'hs-CRP（高感度CRP）', category:'炎症・心臓', impact:'high',
    reason:'標準CRPより10倍以上感度が高く、慢性炎症の早期検出や心血管リスク評価に重要。',
    approximateCost:'約1,000〜3,000円（自費）', searchQuery:'hs-CRP 高感度CRP 血液検査 自費' },
  { key:'omega3Index', name:'Omega-3 Index', category:'心臓・炎症', impact:'high',
    reason:'赤血球中のEPA+DHA比率。日本人でも魚食減少で低値が増加。CVDリスクの独立予測因子。',
    approximateCost:'約5,000〜8,000円（自費・専門検査）', searchQuery:'Omega-3 Index オメガ3指数 血液検査' },
  { key:'vitaminB12', name:'ビタミンB12', category:'栄養素・認知', impact:'high',
    reason:'神経・認知機能に直結。菜食傾向・胃薬服用中・40歳以上は特にリスクが高い。',
    approximateCost:'約1,000〜2,000円（自費）', searchQuery:'ビタミンB12 血液検査 自費' },
  { key:'homaIr', name:'HOMA-IR（インスリン抵抗性）', category:'代謝', impact:'high',
    reason:'空腹時血糖が正常でもインスリン抵抗性を検出できる。糖尿病予備群の早期発見に有効。',
    approximateCost:'約2,000〜4,000円（自費）', searchQuery:'HOMA-IR インスリン抵抗性 血液検査 自費' },
  { key:'homocysteine', name:'ホモシステイン', category:'認知・心臓', impact:'medium',
    reason:'認知症リスクと心血管リスクの両方に関係。葉酸・B12不足のマーカーとしても機能。',
    approximateCost:'約2,000〜3,000円（自費）', searchQuery:'ホモシステイン 血液検査 自費' },
  { key:'apoB', name:'ApoB（アポリポタンパクB）', category:'心臓・血管', impact:'medium',
    reason:'LDLより正確な心血管リスク指標として欧米の予防医学でスタンダードになりつつある。',
    approximateCost:'約2,000〜3,000円（自費）', searchQuery:'ApoB アポB 血液検査 自費' },
  { key:'cortisol', name:'コルチゾール（朝）', category:'ホルモン', impact:'medium',
    reason:'慢性ストレス・副腎疲労の客観的指標。朝8〜9時の採血が正確。',
    approximateCost:'約2,000〜4,000円（自費）', searchQuery:'コルチゾール 血液検査 自費 朝' },
  { key:'zinc', name:'血清亜鉛', category:'栄養素・ホルモン', impact:'medium',
    reason:'免疫・テストステロン・甲状腺T3変換に必要。日本人の亜鉛不足は顕在化しやすい。',
    approximateCost:'約1,500〜3,000円（自費）', searchQuery:'血清亜鉛 血液検査 自費' },
  { key:'testosterone', name:'テストステロン（男性）', category:'ホルモン・フィットネス', impact:'medium',
    reason:'筋肉量・エネルギー・気分に直結。40代以降の男性では低下が顕著になりやすい。',
    approximateCost:'約2,000〜4,000円（自費）', searchQuery:'テストステロン 血液検査 自費' },
  { key:'lipoproteinA', name:'Lipoprotein(a)', category:'心臓・血管', impact:'medium',
    reason:'遺伝的に決まる心血管リスク因子。LDLが正常でも高値の場合がある。生涯1回の測定を推奨。',
    approximateCost:'約2,000〜3,000円（自費）', searchQuery:'リポタンパク(a) Lp(a) 血液検査 自費' },
];

export function getAdditionalTestRecommendations(data: HealthCheckData): AdditionalTest[] {
  return ADDITIONAL_TESTS.filter(t => {
    const val = (data as any)[t.key];
    return val === null || val === undefined;
  });
}

export function getHighPriorityTests(data: HealthCheckData): AdditionalTest[] {
  return getAdditionalTestRecommendations(data).filter(t => t.impact === 'high');
}

export function getCompletionSummary(data: HealthCheckData): {
  currentMeasured: number; totalRecommended: number;
  highPriority: number; estimatedImprovementItems: number;
} {
  const missing = getAdditionalTestRecommendations(data);
  const highPriority = missing.filter(t => t.impact === 'high').length;
  const measured = ADDITIONAL_TESTS.length - missing.length;
  return {
    currentMeasured: measured,
    totalRecommended: ADDITIONAL_TESTS.length,
    highPriority,
    estimatedImprovementItems: missing.length,
  };
}

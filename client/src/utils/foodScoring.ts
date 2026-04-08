export interface NutritionData {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber?: number;
}

export interface HealthData {
  ldlCholesterol?: number;
  triglycerides?: number;
  ferritin?: number;
  crp?: number;
  bmi?: number;
}

export interface UserProfile {
  goal?: 'muscle' | 'diet' | 'nutrition';
  weight?: number;
}

export interface ScoreBreakdown {
  layerA: number;
  layerB: number;
  layerC: number;
  total: number;
  reasons: string[];
}

function calcLayerA(nutrition: NutritionData, weight: number = 60): number {
  let score = 0;

  const proteinTarget = weight * 0.5;
  const proteinRatio = nutrition.totalProtein / proteinTarget;
  score += Math.min(20, Math.round(proteinRatio * 20));

  const fatCalRatio = (nutrition.totalFat * 9) / Math.max(nutrition.totalCalories, 1);
  if (fatCalRatio >= 0.20 && fatCalRatio <= 0.30) score += 15;
  else if (fatCalRatio >= 0.15 && fatCalRatio < 0.20) score += 10;
  else if (fatCalRatio > 0.30 && fatCalRatio <= 0.40) score += 8;
  else score += 3;

  const carbCalRatio = (nutrition.totalCarbs * 4) / Math.max(nutrition.totalCalories, 1);
  if (carbCalRatio >= 0.40 && carbCalRatio <= 0.60) score += 15;
  else if (carbCalRatio >= 0.30 && carbCalRatio < 0.40) score += 10;
  else if (carbCalRatio > 0.60 && carbCalRatio <= 0.70) score += 8;
  else score += 3;

  const fiber = nutrition.totalFiber ?? 0;
  if (fiber >= 8) score += 10;
  else if (fiber >= 5) score += 7;
  else if (fiber >= 3) score += 4;

  return Math.min(60, score);
}

function calcLayerB(nutrition: NutritionData, health: HealthData): { points: number; reasons: string[] } {
  let points = 0;
  const reasons: string[] = [];

  if ((health.ldlCholesterol ?? 0) >= 120 && nutrition.totalFat >= 35) {
    points -= 10;
    reasons.push('脂質バランスの観点から調整');
  }
  if ((health.triglycerides ?? 0) >= 150 && nutrition.totalCarbs >= 50) {
    points -= 10;
    reasons.push('糖質バランスの観点から調整');
  }
  if ((health.bmi ?? 0) >= 25 && nutrition.totalCalories >= 700) {
    points -= 10;
    reasons.push('カロリーバランスの観点から調整');
  }
  if ((health.ferritin ?? 999) < 25 && (nutrition.totalFiber ?? 0) >= 5) {
    points += 10;
    reasons.push('食物繊維補給の観点からプラス評価');
  }
  if ((health.crp ?? 0) >= 0.3 && nutrition.totalFat <= 20) {
    points += 10;
    reasons.push('炎症ケアの観点からプラス評価');
  }

  points = Math.max(-15, Math.min(15, points));
  return { points, reasons };
}

function calcLayerC(nutrition: NutritionData, goal?: string): { points: number; reason: string } {
  if (goal === 'muscle' && nutrition.totalProtein >= 25) return { points: 10, reason: '設定中のゴール（筋肉増強）に適した食事' };
  if (goal === 'diet' && nutrition.totalCalories <= 500) return { points: 10, reason: '設定中のゴール（ダイエット）に適した食事' };
  if (goal === 'nutrition' && (nutrition.totalFiber ?? 0) >= 8) return { points: 10, reason: '設定中のゴール（栄養補給）に適した食事' };
  return { points: 0, reason: '' };
}

export function calcFoodScore(
  nutrition: NutritionData,
  health?: HealthData,
  userProfile?: UserProfile
): ScoreBreakdown {
  const weight = userProfile?.weight ?? 60;
  const goal = userProfile?.goal;

  const layerA = calcLayerA(nutrition, weight);
  const { points: layerB, reasons: layerBReasons } = health ? calcLayerB(nutrition, health) : { points: 0, reasons: [] };
  const { points: layerC, reason: layerCReason } = calcLayerC(nutrition, goal);

  const total = Math.max(0, Math.min(100, layerA + layerB + layerC));

  const goalLabel: Record<string, string> = { muscle: '筋肉増強', diet: 'ダイエット', nutrition: '栄養補給' };
  const reasons = [
    '栄養バランス（タンパク質・脂質・炭水化物・食物繊維）を考慮',
    ...(health ? ['健康診断データを反映'] : []),
    ...(goal ? [`設定中のゴール（${goalLabel[goal]}）を反映`] : []),
    ...layerBReasons,
    ...(layerCReason ? [layerCReason] : []),
  ];

  return { layerA, layerB, layerC, total, reasons };
}

export function getScoreBand(score: number): { color: 'green' | 'yellow' | 'red'; label: string; message: string } {
  if (score >= 80) return { color: 'green', label: '優良', message: '今日の食事はあなたの身体によく合っています' };
  if (score >= 50) return { color: 'yellow', label: '良好', message: 'バランスは良好です。もう一工夫でさらに向上します' };
  return { color: 'red', label: '要改善', message: 'いくつかの栄養素を見直してみましょう' };
}

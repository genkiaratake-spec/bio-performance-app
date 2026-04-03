export interface CrispMenuItem {
  name: string;
  size: 'S' | 'M' | 'L';
  category: 'salad' | 'bowl' | 'plate';
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  tags: string[];
  url: string;
}

export const CRISP_MENU: CrispMenuItem[] = [
  {
    name: 'クラシック・チキンシーザー',
    size: 'M', category: 'salad',
    calories: 368, protein: 22.6, fat: 25.2, carbs: 15.3, fiber: 3.3,
    tags: ['high-protein', 'low-carb'],
    url: 'https://crisp.co.jp/menu',
  },
  {
    name: 'サーモンアボカドシーザー',
    size: 'M', category: 'salad',
    calories: 361, protein: 14.8, fat: 27.0, carbs: 19.2, fiber: 6.4,
    tags: ['high-fiber', 'low-calorie'],
    url: 'https://crisp.co.jp/menu',
  },
  {
    name: 'マーケットサラダ',
    size: 'M', category: 'salad',
    calories: 396, protein: 14.5, fat: 20.4, carbs: 48.3, fiber: 15.2,
    tags: ['high-fiber', 'low-fat'],
    url: 'https://crisp.co.jp/menu',
  },
  {
    name: 'ワフー・ゴマチキン',
    size: 'M', category: 'salad',
    calories: 445, protein: 25.6, fat: 30.9, carbs: 19.5, fiber: 5.3,
    tags: ['high-protein'],
    url: 'https://crisp.co.jp/menu',
  },
  {
    name: 'カル・メックス',
    size: 'M', category: 'salad',
    calories: 423, protein: 19.5, fat: 28.2, carbs: 28.5, fiber: 7.1,
    tags: ['high-fiber'],
    url: 'https://crisp.co.jp/menu',
  },
  {
    name: 'クラシック・チキンコブ',
    size: 'M', category: 'salad',
    calories: 440, protein: 25.0, fat: 30.8, carbs: 17.9, fiber: 3.6,
    tags: ['high-protein', 'low-carb'],
    url: 'https://crisp.co.jp/menu',
  },
  {
    name: 'サウスウェスタン・コブ',
    size: 'M', category: 'salad',
    calories: 616, protein: 30.9, fat: 46.8, carbs: 22.9, fiber: 7.0,
    tags: ['high-protein'],
    url: 'https://crisp.co.jp/menu',
  },
  {
    name: 'スパイシーバイマイ',
    size: 'M', category: 'salad',
    calories: 473, protein: 23.3, fat: 35.1, carbs: 21.3, fiber: 6.3,
    tags: ['high-protein'],
    url: 'https://crisp.co.jp/menu',
  },
  {
    name: 'サーモンクリーム',
    size: 'M', category: 'salad',
    calories: 420, protein: 23.3, fat: 24.5, carbs: 34.6, fiber: 11.7,
    tags: ['high-protein', 'high-fiber'],
    url: 'https://crisp.co.jp/menu',
  },
  {
    name: 'イタリアン・ベジ',
    size: 'M', category: 'salad',
    calories: 489, protein: 25.3, fat: 35.8, carbs: 20.3, fiber: 4.9,
    tags: ['high-protein'],
    url: 'https://crisp.co.jp/menu',
  },
  {
    name: 'チキンタコボウル',
    size: 'M', category: 'bowl',
    calories: 526, protein: 20.4, fat: 36.2, carbs: 34.5, fiber: 6.7,
    tags: ['high-fiber'],
    url: 'https://crisp.co.jp/menu',
  },
  {
    name: 'クリスピーエッグボウル',
    size: 'M', category: 'bowl',
    calories: 452, protein: 21.7, fat: 16.4, carbs: 61.0, fiber: 11.8,
    tags: ['high-fiber', 'low-fat'],
    url: 'https://crisp.co.jp/menu',
  },
];

export function recommendCrispMenu(
  healthData?: any,
  userProfile?: any
): { menu: CrispMenuItem; score: number; reason: string }[] {
  return CRISP_MENU.map(menu => {
    let score = 50;
    const reasons: string[] = [];

    if (healthData) {
      const ldl = healthData.ldlCholesterol;
      const triglycerides = healthData.triglycerides;
      const bmi = healthData.bmi;
      const ferritin = healthData.ferritin;
      const crp = healthData.crp;

      if (ldl && ldl >= 120) {
        if (menu.fat <= 20) { score += 20; reasons.push('脂質が少なくLDL改善に◎'); }
        else if (menu.fat >= 35) { score -= 15; }
      }

      if (triglycerides && triglycerides >= 150) {
        if (menu.carbs <= 20) { score += 20; reasons.push('低糖質で中性脂肪改善に◎'); }
        else if (menu.carbs >= 50) { score -= 15; }
      }

      if (bmi && bmi >= 25) {
        if (menu.calories <= 400) { score += 15; reasons.push('低カロリーでBMI改善に◎'); }
        else if (menu.calories >= 600) { score -= 10; }
      }

      if (ferritin && ferritin < 25) {
        if (menu.fiber >= 10) { score += 15; reasons.push('食物繊維豊富で腸内環境◎'); }
      }

      if (crp && crp >= 0.3) {
        if (menu.name.includes('サーモン')) { score += 20; reasons.push('オメガ3で炎症抑制に◎'); }
      }
    }

    if (userProfile?.goal === 'muscle') {
      if (menu.protein >= 25) { score += 20; reasons.push('高タンパクで筋肉増強に最適'); }
    }
    if (userProfile?.goal === 'diet') {
      if (menu.calories <= 400) { score += 20; reasons.push('カロリー控えめでダイエットに最適'); }
    }
    if (userProfile?.goal === 'nutrition') {
      if (menu.fiber >= 8) { score += 15; reasons.push('食物繊維豊富で栄養バランス◎'); }
    }

    if (userProfile?.dietaryRestrictions?.includes('noSeafood')) {
      if (menu.name.includes('サーモン')) score -= 50;
    }

    const reason = reasons.length > 0 ? reasons[0] : 'バランスの良い一品';
    return { menu, score, reason };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

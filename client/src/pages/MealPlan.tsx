import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Calendar, ChefHat, Info, Clock, Flame, Zap, BookOpen, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

type Meal = {
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  matchScore: number;
  keyNutrients: string[];
  time: string;
};

type DayPlan = {
  day: string;
  dayShort: string;
  meals: { type: string; meal: Meal }[];
};

const weeklyPlan: DayPlan[] = [
  {
    day: "月曜日", dayShort: "月",
    meals: [
      { type: "朝食", meal: { name: "鮭と卵のプロテインボウル", category: "高タンパク", calories: 420, protein: 35, carbs: 30, fat: 18, matchScore: 96, keyNutrients: ["オメガ3", "ビタミンD", "鉄分"], time: "10分" } },
      { type: "昼食", meal: { name: "鶏むね肉とほうれん草のキヌアサラダ", category: "鉄分強化", calories: 520, protein: 42, carbs: 40, fat: 16, matchScore: 94, keyNutrients: ["鉄分", "葉酸", "タンパク質"], time: "15分" } },
      { type: "夕食", meal: { name: "レバニラ炒め定食（玄米）", category: "ヘム鉄補給", calories: 580, protein: 38, carbs: 55, fat: 20, matchScore: 98, keyNutrients: ["ヘム鉄", "ビタミンA", "ビタミンB12"], time: "20分" } },
    ],
  },
  {
    day: "火曜日", dayShort: "火",
    meals: [
      { type: "朝食", meal: { name: "アボカドトーストwith温泉卵", category: "良質脂質", calories: 380, protein: 18, carbs: 35, fat: 22, matchScore: 90, keyNutrients: ["一価不飽和脂肪酸", "ビタミンD", "コリン"], time: "8分" } },
      { type: "昼食", meal: { name: "サーモンのグリル＆ブロッコリー", category: "オメガ3強化", calories: 490, protein: 40, carbs: 28, fat: 22, matchScore: 97, keyNutrients: ["オメガ3", "ビタミンD", "ビタミンC"], time: "20分" } },
      { type: "夕食", meal: { name: "豚ヒレ肉のソテー＆温野菜", category: "ビタミンB群", calories: 540, protein: 36, carbs: 42, fat: 18, matchScore: 91, keyNutrients: ["ビタミンB1", "鉄分", "カリウム"], time: "25分" } },
    ],
  },
  {
    day: "水曜日", dayShort: "水",
    meals: [
      { type: "朝食", meal: { name: "ギリシャヨーグルト＆ブルーベリーボウル", category: "腸内環境", calories: 320, protein: 22, carbs: 38, fat: 10, matchScore: 88, keyNutrients: ["プロバイオティクス", "アントシアニン", "カルシウム"], time: "5分" } },
      { type: "昼食", meal: { name: "牛赤身ステーキ＆玄米", category: "ヘム鉄補給", calories: 560, protein: 45, carbs: 45, fat: 18, matchScore: 95, keyNutrients: ["ヘム鉄", "亜鉛", "ビタミンB12"], time: "20分" } },
      { type: "夕食", meal: { name: "鯖の味噌煮＆納豆セット", category: "オメガ3強化", calories: 510, protein: 34, carbs: 40, fat: 22, matchScore: 93, keyNutrients: ["オメガ3", "ビタミンK2", "DHA"], time: "25分" } },
    ],
  },
  {
    day: "木曜日", dayShort: "木",
    meals: [
      { type: "朝食", meal: { name: "プロテインスムージー（バナナ・ほうれん草）", category: "時短栄養", calories: 350, protein: 30, carbs: 40, fat: 8, matchScore: 89, keyNutrients: ["鉄分", "カリウム", "タンパク質"], time: "3分" } },
      { type: "昼食", meal: { name: "チキンとアボカドのラップ", category: "バランス型", calories: 480, protein: 35, carbs: 38, fat: 20, matchScore: 92, keyNutrients: ["タンパク質", "一価不飽和脂肪酸", "食物繊維"], time: "10分" } },
      { type: "夕食", meal: { name: "鮭のちゃんちゃん焼き＆雑穀米", category: "オメガ3強化", calories: 530, protein: 38, carbs: 48, fat: 16, matchScore: 96, keyNutrients: ["オメガ3", "ビタミンD", "食物繊維"], time: "25分" } },
    ],
  },
  {
    day: "金曜日", dayShort: "金",
    meals: [
      { type: "朝食", meal: { name: "卵2個のオムレツ＆全粒粉トースト", category: "高タンパク", calories: 400, protein: 24, carbs: 32, fat: 20, matchScore: 91, keyNutrients: ["ビタミンD", "コリン", "食物繊維"], time: "10分" } },
      { type: "昼食", meal: { name: "マグロたたき丼（玄米）", category: "DHA強化", calories: 500, protein: 40, carbs: 50, fat: 12, matchScore: 94, keyNutrients: ["DHA", "鉄分", "タンパク質"], time: "15分" } },
      { type: "夕食", meal: { name: "鶏レバーのバルサミコソテー", category: "ヘム鉄補給", calories: 480, protein: 36, carbs: 30, fat: 22, matchScore: 97, keyNutrients: ["ヘム鉄", "ビタミンA", "葉酸"], time: "20分" } },
    ],
  },
];

/* Circular progress ring component */
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-border" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="text-teal" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-foreground text-sm font-bold" style={{ fontFamily: "var(--font-mono)" }}>{score}</text>
    </svg>
  );
}

/* Macro progress bar */
function MacroBar({ label, value, max, color, unit = "g" }: { label: string; value: number; max: number; color: string; unit?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
        <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)" }}>{value}<span className="text-[10px] text-muted-foreground font-normal ml-0.5">{unit}</span></span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" as const }} className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
}

export default function MealPlan() {
  const [selectedDay, setSelectedDay] = useState(0);

  const handleSaveRecipe = () => {
    toast.success("レシピをお気に入りに保存しました（デモ）", {
      description: "マイレシピからいつでも確認できます。",
    });
  };

  const currentDay = weeklyPlan[selectedDay];

  const dailyTotals = currentDay.meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.meal.calories,
      protein: acc.protein + m.meal.protein,
      carbs: acc.carbs + m.meal.carbs,
      fat: acc.fat + m.meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const avgScore = Math.round(currentDay.meals.reduce((s, m) => s + m.meal.matchScore, 0) / currentDay.meals.length);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="stat-label mb-1">Personalized Meal Plan</p>
          <h1 className="text-2xl lg:text-3xl font-bold">ミールプラン</h1>
          <p className="text-sm text-muted-foreground mt-1.5">あなたのバイオデータに最適化された、今週の食事プランです。</p>
        </motion.div>

        {/* Day selector - pill style */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {weeklyPlan.map((day, i) => (
            <button
              key={day.day}
              onClick={() => setSelectedDay(i)}
              className={`flex flex-col items-center px-4 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                selectedDay === i
                  ? "bg-primary text-primary-foreground"
                  : "elevated-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`text-[10px] mb-0.5 ${selectedDay === i ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>{day.dayShort}</span>
              {day.day.replace("曜日", "")}
            </button>
          ))}
        </motion.div>

        {/* Daily overview card */}
        <motion.div key={`overview-${selectedDay}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="elevated-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{currentDay.day} — 日次サマリー</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal font-semibold ml-auto">鉄分・ビタミンD強化</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 items-center">
            {/* Score ring */}
            <div className="flex flex-col items-center gap-1 col-span-2 lg:col-span-1">
              <ScoreRing score={avgScore} size={72} />
              <span className="stat-label mt-1">適合スコア</span>
            </div>

            {/* Macro bars */}
            <div className="col-span-2 lg:col-span-4 grid sm:grid-cols-4 gap-4">
              <MacroBar label="カロリー" value={dailyTotals.calories} max={2200} color="bg-amber" unit="kcal" />
              <MacroBar label="タンパク質" value={dailyTotals.protein} max={150} color="bg-teal" />
              <MacroBar label="炭水化物" value={dailyTotals.carbs} max={250} color="bg-primary/60" />
              <MacroBar label="脂質" value={dailyTotals.fat} max={80} color="bg-muted-foreground/40" />
            </div>
          </div>
        </motion.div>

        {/* Meals list */}
        <div className="space-y-3 mb-8">
          {currentDay.meals.map((item, i) => (
            <motion.div
              key={`${selectedDay}-${item.type}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
              className="elevated-card rounded-xl p-5 group"
            >
              <div className="flex items-start gap-4">
                {/* Score ring */}
                <ScoreRing score={item.meal.matchScore} size={48} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{item.type}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.meal.time}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{item.meal.category}</span>
                  </div>
                  <h3 className="text-sm font-bold mb-2">{item.meal.name}</h3>

                  {/* Inline macros */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-amber" />{item.meal.calories}kcal</span>
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-teal" />P:{item.meal.protein}g</span>
                    <span>C:{item.meal.carbs}g</span>
                    <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />F:{item.meal.fat}g</span>
                  </div>

                  {/* Key nutrients */}
                  <div className="flex flex-wrap gap-1.5">
                    {item.meal.keyNutrients.map((n) => (
                      <span key={n} className="text-[10px] px-2 py-0.5 rounded-full bg-teal/8 text-teal font-medium">{n}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Save CTA */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="elevated-card rounded-xl p-6 text-center">
          <h3 className="text-base font-bold mb-1.5">今週のレシピを保存する</h3>
          <p className="text-xs text-muted-foreground mb-4">AIが提案したミールプランをお気に入りに保存して、いつでも確認できます。</p>
          <Button onClick={handleSaveRecipe} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-semibold h-10 px-8">
            <BookOpen className="w-4 h-4" /> レシピを保存
          </Button>
        </motion.div>

        {/* Disclaimer */}
        <div className="mt-6 flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <p>
            ミールプランは管理栄養士監修のアルゴリズムに基づく提案であり、医療行為ではありません。
            食物アレルギーがある場合は、各食材の成分をご確認ください。
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

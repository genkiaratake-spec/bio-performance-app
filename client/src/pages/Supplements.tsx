import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Pill, AlertCircle, CheckCircle2, Info, ShoppingCart, Star, TrendingUp, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Supplement = {
  name: string;
  dosage: string;
  timing: string;
  priority: "high" | "medium" | "low";
  reason: string;
  biomarker: string;
  currentValue: string;
  targetValue: string;
  monthlyPrice: number;
};

const supplements: Supplement[] = [
  {
    name: "ビタミンD3",
    dosage: "2,000 IU / 日",
    timing: "朝食後",
    priority: "high",
    reason: "血液検査でビタミンD値が基準値（30 ng/mL）を下回っています。免疫機能・骨密度・テストステロン維持に重要。",
    biomarker: "ビタミンD",
    currentValue: "28 ng/mL",
    targetValue: "40-60 ng/mL",
    monthlyPrice: 980,
  },
  {
    name: "キレート鉄（ビスグリシン酸鉄）",
    dosage: "27 mg / 日",
    timing: "空腹時（ビタミンCと同時摂取推奨）",
    priority: "high",
    reason: "フェリチン値が基準値を下回っています。酸素運搬能力・集中力・持久力の維持に直結。キレート型は胃腸への負担が少ない。",
    biomarker: "フェリチン",
    currentValue: "45 ng/mL",
    targetValue: "80-150 ng/mL",
    monthlyPrice: 1280,
  },
  {
    name: "オメガ3（EPA/DHA）",
    dosage: "2,000 mg / 日",
    timing: "食事と一緒に",
    priority: "medium",
    reason: "あなたの遺伝子型はオメガ3の代謝効率が高く、抗炎症効果を最大限に活用できます。CRP値の維持・脳機能の最適化に。",
    biomarker: "CRP",
    currentValue: "0.3 mg/L",
    targetValue: "< 0.5 mg/L（維持）",
    monthlyPrice: 1580,
  },
  {
    name: "マグネシウム（グリシン酸）",
    dosage: "400 mg / 日",
    timing: "就寝前",
    priority: "medium",
    reason: "睡眠の質の向上・筋弛緩・ストレス軽減に寄与。日本人の約70%がマグネシウム不足と推定されています。",
    biomarker: "—",
    currentValue: "未測定",
    targetValue: "—",
    monthlyPrice: 1180,
  },
  {
    name: "ビタミンK2（MK-7）",
    dosage: "100 μg / 日",
    timing: "ビタミンD3と同時",
    priority: "low",
    reason: "ビタミンD3の補給時にK2を併用することで、カルシウムの適切な代謝（骨への沈着）を促進。",
    biomarker: "—",
    currentValue: "—",
    targetValue: "—",
    monthlyPrice: 780,
  },
];

const priorityConfig = {
  high: { label: "高優先", color: "text-amber", bg: "bg-amber/10", dot: "bg-amber", icon: AlertCircle },
  medium: { label: "中優先", color: "text-teal", bg: "bg-teal/10", dot: "bg-teal", icon: TrendingUp },
  low: { label: "低優先", color: "text-muted-foreground", bg: "bg-secondary", dot: "bg-muted-foreground/40", icon: CheckCircle2 },
};

/* Biomarker mini bar */
function BiomarkerBar({ current, target }: { current: string; target: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-amber font-semibold" style={{ fontFamily: "var(--font-mono)" }}>{current}</span>
      <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
      <span className="text-teal font-semibold" style={{ fontFamily: "var(--font-mono)" }}>{target}</span>
    </div>
  );
}

export default function Supplements() {
  const totalMonthly = supplements.reduce((sum, s) => sum + s.monthlyPrice, 0);

  const handleOrder = () => {
    toast.success("サプリメントの注文リクエストを送信しました（デモ）", {
      description: "注文確認メールをお送りします。",
    });
  };

  const handleSingleOrder = (name: string) => {
    toast.info("近日公開予定", {
      description: `${name}の個別注文機能は近日公開予定です。`,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="stat-label mb-1">Supplement Optimization</p>
          <h1 className="text-2xl lg:text-3xl font-bold">サプリメント最適化</h1>
          <p className="text-sm text-muted-foreground mt-1.5">あなたのバイオデータから特定された、不足栄養素を補うサプリメント提案です。</p>
        </motion.div>

        {/* Summary row */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-3 mb-6">
          <div className="elevated-card rounded-xl p-4 text-center">
            <span className="stat-label">提案数</span>
            <p className="stat-value text-2xl mt-1">{supplements.length}<span className="stat-unit ml-1">種類</span></p>
          </div>
          <div className="elevated-card rounded-xl p-4 text-center">
            <span className="stat-label">高優先</span>
            <p className="text-2xl font-bold text-amber mt-1" style={{ fontFamily: "var(--font-mono)" }}>{supplements.filter(s => s.priority === "high").length}<span className="stat-unit ml-1">種類</span></p>
          </div>
          <div className="elevated-card rounded-xl p-4 text-center">
            <span className="stat-label">月額目安</span>
            <p className="stat-value text-2xl mt-1">¥{totalMonthly.toLocaleString()}</p>
          </div>
        </motion.div>

        {/* Supplement list */}
        <div className="space-y-3 mb-8">
          {supplements.map((supp, i) => {
            const config = priorityConfig[supp.priority];
            return (
              <motion.div
                key={supp.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                className="elevated-card rounded-xl p-5 group"
              >
                <div className="flex items-start gap-4">
                  {/* Priority dot */}
                  <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Pill className={`w-4 h-4 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold">{supp.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${config.bg} ${config.color}`}>{config.label}</span>
                    </div>

                    {/* Reason */}
                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">{supp.reason}</p>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="bg-card rounded-lg p-2.5">
                        <span className="text-muted-foreground/70 block mb-0.5">用量</span>
                        <span className="font-semibold text-foreground">{supp.dosage}</span>
                      </div>
                      <div className="bg-card rounded-lg p-2.5">
                        <span className="text-muted-foreground/70 block mb-0.5">タイミング</span>
                        <span className="font-semibold text-foreground">{supp.timing}</span>
                      </div>
                      <div className="bg-card rounded-lg p-2.5">
                        <span className="text-muted-foreground/70 block mb-0.5">月額目安</span>
                        <span className="font-semibold text-foreground">¥{supp.monthlyPrice.toLocaleString()}</span>
                      </div>
                      {supp.biomarker !== "—" && (
                        <div className="bg-card rounded-lg p-2.5">
                          <span className="text-muted-foreground/70 block mb-0.5">{supp.biomarker}</span>
                          <BiomarkerBar current={supp.currentValue} target={supp.targetValue} />
                        </div>
                      )}
                    </div>

                    {/* Order button */}
                    <div className="mt-3">
                      <button
                        onClick={() => handleSingleOrder(supp.name)}
                        className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                        style={{ background: "#4ade8018", color: "#4ade80", border: "1px solid #4ade8030" }}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        注文する
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Order CTA */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="elevated-card rounded-xl p-6 text-center">
          <Star className="w-5 h-5 text-amber mx-auto mb-3" />
          <h3 className="text-base font-bold mb-1.5">パーソナライズ・サプリメントパックを注文</h3>
          <p className="text-xs text-muted-foreground mb-4">上記のサプリメントを、1日分ずつ個包装でお届けします。</p>
          <Button onClick={handleOrder} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-semibold h-10 px-8">
            <ShoppingCart className="w-4 h-4" /> 月額 ¥{totalMonthly.toLocaleString()} で注文する
          </Button>
        </motion.div>

        {/* Disclaimer */}
        <div className="mt-6 flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <p>
            サプリメントの提案は管理栄養士監修のアルゴリズムに基づくものであり、医薬品の処方ではありません。
            服用中の薬がある場合は、必ず医師にご相談ください。効果効能を保証するものではありません。
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

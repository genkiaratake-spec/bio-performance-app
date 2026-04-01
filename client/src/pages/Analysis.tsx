import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, AlertTriangle, ArrowRight, Info, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";

type FoodItem = {
  name: string;
  category: string;
  compatibility: "excellent" | "good" | "caution" | "avoid";
  reason: string;
  nutrients: string[];
};

const foodData: FoodItem[] = [
  { name: "サーモン", category: "タンパク質", compatibility: "excellent", reason: "オメガ3脂肪酸が豊富。あなたの遺伝子型はオメガ3の代謝効率が高く、炎症マーカー（CRP）の改善に寄与。", nutrients: ["オメガ3", "ビタミンD", "タンパク質"] },
  { name: "ほうれん草", category: "野菜", compatibility: "excellent", reason: "鉄分・葉酸が豊富。フェリチン値が基準値を下回っているため、鉄分の積極的な摂取を推奨。", nutrients: ["鉄分", "葉酸", "ビタミンK"] },
  { name: "卵", category: "タンパク質", compatibility: "excellent", reason: "ビタミンD・コリンが豊富。ビタミンD値が低めのため、卵黄からの自然な補給が効果的。", nutrients: ["ビタミンD", "コリン", "タンパク質"] },
  { name: "レバー（鶏）", category: "タンパク質", compatibility: "excellent", reason: "ヘム鉄の最良の供給源。フェリチン値の改善に最も効率的。", nutrients: ["ヘム鉄", "ビタミンA", "ビタミンB12"] },
  { name: "アボカド", category: "脂質", compatibility: "good", reason: "良質な一価不飽和脂肪酸。あなたの脂質代謝遺伝子型と相性が良い。", nutrients: ["一価不飽和脂肪酸", "カリウム", "食物繊維"] },
  { name: "ブルーベリー", category: "果物", compatibility: "good", reason: "抗酸化物質（アントシアニン）が豊富。認知機能のサポートに寄与。", nutrients: ["アントシアニン", "ビタミンC", "食物繊維"] },
  { name: "玄米", category: "炭水化物", compatibility: "good", reason: "低GI炭水化物。血糖値の安定に寄与し、HbA1c値の維持に効果的。", nutrients: ["食物繊維", "マグネシウム", "ビタミンB1"] },
  { name: "納豆", category: "発酵食品", compatibility: "good", reason: "ビタミンK2・ナットウキナーゼが豊富。腸内環境の改善に寄与。", nutrients: ["ビタミンK2", "タンパク質", "プロバイオティクス"] },
  { name: "白砂糖（過剰摂取）", category: "糖質", compatibility: "caution", reason: "急激な血糖値上昇を引き起こす。HbA1c値は正常範囲だが、パフォーマンス維持のため控えめに。", nutrients: [] },
  { name: "加工肉（ハム・ソーセージ）", category: "加工食品", compatibility: "caution", reason: "亜硝酸塩・添加物を含む。CRP値への影響を考慮し、頻度を抑えることを推奨。", nutrients: [] },
  { name: "アルコール（過剰摂取）", category: "飲料", compatibility: "avoid", reason: "あなたの遺伝子型（ALDH2）はアルコール代謝効率がやや低い傾向。肝機能への負担を軽減するため、週2回以下を推奨。", nutrients: [] },
  { name: "トランス脂肪酸", category: "脂質", compatibility: "avoid", reason: "炎症マーカーを悪化させるリスク。マーガリン・ショートニングを含む加工食品を避けることを推奨。", nutrients: [] },
];

const compatibilityConfig = {
  excellent: { label: "最適", icon: ThumbsUp, color: "text-teal", bg: "bg-teal/10", border: "border-teal/20", dot: "bg-teal" },
  good: { label: "推奨", icon: ThumbsUp, color: "text-teal", bg: "bg-teal/5", border: "border-teal/10", dot: "bg-teal/60" },
  caution: { label: "注意", icon: AlertTriangle, color: "text-amber", bg: "bg-amber/10", border: "border-amber/20", dot: "bg-amber" },
  avoid: { label: "非推奨", icon: ThumbsDown, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", dot: "bg-destructive" },
};

export default function Analysis() {
  const [filter, setFilter] = useState<"all" | "excellent" | "good" | "caution" | "avoid">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = foodData.filter((f) => {
    const matchFilter = filter === "all" || f.compatibility === filter;
    const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.category.includes(searchQuery);
    return matchFilter && matchSearch;
  });

  const counts = {
    excellent: foodData.filter(f => f.compatibility === "excellent").length,
    good: foodData.filter(f => f.compatibility === "good").length,
    caution: foodData.filter(f => f.compatibility === "caution").length,
    avoid: foodData.filter(f => f.compatibility === "avoid").length,
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="stat-label mb-1">Food Compatibility</p>
          <h1 className="text-2xl lg:text-3xl font-bold">食事解析</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            あなたのバイオデータに基づいた、食材の相性レポートです。
          </p>
        </motion.div>

        {/* Disclaimer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="elevated-card rounded-xl p-3.5 mb-6 flex items-start gap-3">
          <Info className="w-4 h-4 text-teal mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            以下の提案は、管理栄養士監修のアルゴリズムに基づく<span className="font-medium text-foreground">健康増進・パフォーマンス最適化</span>を目的としたものです。
            医療上の診断・処方ではありません。アレルギーや持病がある場合は、必ず医療機関にご相談ください。
          </p>
        </motion.div>

        {/* Summary cards */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["excellent", "good", "caution", "avoid"] as const).map((key) => {
            const c = compatibilityConfig[key];
            return (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? "all" : key)}
                className={`elevated-card rounded-xl p-4 text-left transition-all ${filter === key ? "ring-1 ring-primary/40" : ""}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className={`text-xs font-semibold ${c.color}`}>{c.label}</span>
                </div>
                <span className="stat-value text-xl">{counts[key]}</span>
                <span className="stat-unit ml-1">食材</span>
              </button>
            );
          })}
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="食材を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </motion.div>

        {/* Food list */}
        <div className="space-y-2 mb-8">
          {filtered.map((food, i) => {
            const config = compatibilityConfig[food.compatibility];
            const Icon = config.icon;
            return (
              <motion.div
                key={food.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.03 }}
                className="elevated-card rounded-xl p-4 group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold">{food.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${config.bg} ${config.color}`}>{config.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{food.category}</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">{food.reason}</p>
                    {food.nutrients.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {food.nutrients.map((n) => (
                          <span key={n} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary/80 font-medium">{n}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/20 mt-1 shrink-0 group-hover:text-primary/40 transition-colors" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center">
          <Link href="/meal-plan">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-semibold px-10 h-11">
              この解析を基にミールプランを見る
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

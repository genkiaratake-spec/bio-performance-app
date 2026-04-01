import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Activity, Droplets, Dna, TrendingUp, UtensilsCrossed, Pill, ArrowUpRight, AlertCircle, ScanLine, Flame, Beef, Wheat } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Demo data
const demoData = {
  name: "田中 太郎",
  lastBloodTest: "2026-03-15",
  lastDnaTest: "2026-01-20",
  performanceScore: 82,
  caloriesConsumed: 1847,
  caloriesTarget: 2400,
  protein: { current: 128, target: 160, color: "oklch(0.70 0.20 25)" },
  carbs: { current: 195, target: 280, color: "oklch(0.72 0.15 200)" },
  fat: { current: 58, target: 75, color: "oklch(0.78 0.16 75)" },
  biomarkers: [
    { name: "ヘモグロビン", value: "14.2", unit: "g/dL", status: "normal", range: "13.0-17.0", trend: "stable" },
    { name: "フェリチン", value: "45", unit: "ng/mL", status: "low", range: "50-200", trend: "down" },
    { name: "ビタミンD", value: "28", unit: "ng/mL", status: "low", range: "30-100", trend: "up" },
    { name: "テストステロン", value: "620", unit: "ng/dL", status: "normal", range: "300-1000", trend: "stable" },
    { name: "CRP", value: "0.3", unit: "mg/L", status: "normal", range: "0-3.0", trend: "stable" },
    { name: "HbA1c", value: "5.2", unit: "%", status: "normal", range: "4.6-6.2", trend: "stable" },
  ],
  weeklyScores: [72, 75, 78, 76, 80, 82, 82],
  // 30-day food log dots
  logDots: Array.from({ length: 30 }, (_, i) => (i < 25 ? (Math.random() > 0.15 ? "active" : "missed") : "inactive")),
};

/* ------------------------------------------------------------------ */
/*  Score Ring Component (MacroFactor-inspired)                        */
/* ------------------------------------------------------------------ */
function ScoreRing({ score, size = 160, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "oklch(0.72 0.15 200)" : score >= 60 ? "oklch(0.78 0.16 75)" : "oklch(0.60 0.22 25)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="score-ring-track" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className="score-ring-fill"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat-value" style={{ fontSize: size * 0.25 }}>{score}</span>
        <span className="stat-label mt-1">/ 100</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Macro Progress Bar                                                 */
/* ------------------------------------------------------------------ */
function MacroBar({ label, current, target, color, icon: Icon }: {
  label: string; current: number; target: number; color: string; icon: typeof Flame;
}) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{current}</span>
          <span className="text-[10px] text-muted-foreground">/ {target}g</span>
        </div>
      </div>
      <div className="macro-track">
        <motion.div
          className="macro-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini Sparkline                                                     */
/* ------------------------------------------------------------------ */
function Sparkline({ data, color, width = 100, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {data.length > 0 && (() => {
        const lastX = width;
        const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
        return <circle cx={lastX} cy={lastY} r="3" fill={color} />;
      })()}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Trend Badge                                                        */
/* ------------------------------------------------------------------ */
function TrendBadge({ trend }: { trend: string }) {
  if (trend === "up") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal/10 text-teal font-medium">↑</span>;
  if (trend === "down") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber/10 text-amber font-medium">↓</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">→</span>;
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  if (status === "normal") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal font-semibold">正常</span>;
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber/10 text-amber font-semibold flex items-center gap-0.5">
      <AlertCircle className="w-2.5 h-2.5" /> 要注意
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  const [data] = useState(demoData);
  const calPct = Math.round((data.caloriesConsumed / data.caloriesTarget) * 100);

  return (
    <DashboardLayout>
      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
          <p className="stat-label mb-1">Welcome back</p>
          <h1 className="text-2xl lg:text-3xl font-bold">
            {data.name}<span className="text-muted-foreground font-normal text-lg ml-1">さん</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5" style={{ fontFamily: "var(--font-mono)" }}>
            血液検査: {data.lastBloodTest} ・ DNA検査: {data.lastDnaTest}
          </p>
        </motion.div>

        {/* ============================================================ */}
        {/*  Top Row: Score Ring + Calories + Macros                      */}
        {/* ============================================================ */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-5 mb-6">
          {/* Performance Score Ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="elevated-card rounded-2xl p-6 flex flex-col items-center justify-center"
          >
            <p className="stat-label mb-4">Performance Score</p>
            <ScoreRing score={data.performanceScore} />
            <div className="flex items-center gap-1.5 mt-4">
              <TrendingUp className="w-3.5 h-3.5 text-teal" />
              <span className="text-xs text-teal font-medium">+10pt 先週比</span>
            </div>
          </motion.div>

          {/* Calories + Macros */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="elevated-card rounded-2xl p-6"
          >
            {/* Calorie header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="stat-label mb-1">Calories Consumed</p>
                <div className="flex items-baseline gap-1">
                  <span className="stat-value">{data.caloriesConsumed.toLocaleString()}</span>
                  <span className="stat-unit">/ {data.caloriesTarget.toLocaleString()} kcal</span>
                </div>
              </div>
              <div className="text-right">
                <p className="stat-label mb-1">Remaining</p>
                <span className="stat-value-sm text-muted-foreground">{(data.caloriesTarget - data.caloriesConsumed).toLocaleString()}</span>
                <span className="stat-unit">kcal</span>
              </div>
            </div>

            {/* Calorie progress bar */}
            <div className="macro-track mb-8" style={{ height: 10 }}>
              <motion.div
                className="macro-fill"
                style={{ background: `linear-gradient(90deg, oklch(0.72 0.15 200), oklch(0.78 0.16 75))`, height: 10, borderRadius: 5 }}
                initial={{ width: 0 }}
                animate={{ width: `${calPct}%` }}
                transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
              />
            </div>

            {/* Macro bars */}
            <div className="space-y-4">
              <MacroBar label="タンパク質" current={data.protein.current} target={data.protein.target} color={data.protein.color} icon={Beef} />
              <MacroBar label="炭水化物" current={data.carbs.current} target={data.carbs.target} color={data.carbs.color} icon={Wheat} />
              <MacroBar label="脂質" current={data.fat.current} target={data.fat.target} color={data.fat.color} icon={Flame} />
            </div>
          </motion.div>
        </div>

        {/* ============================================================ */}
        {/*  Middle Row: Weekly Trend + Food Log Dots + Quick Actions     */}
        {/* ============================================================ */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {/* Weekly Trend */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="elevated-card rounded-2xl p-5"
          >
            <p className="stat-label mb-3">Weekly Score Trend</p>
            <div className="flex items-end justify-between">
              <div>
                <span className="stat-value-sm">{data.weeklyScores[data.weeklyScores.length - 1]}</span>
                <span className="stat-unit">pt</span>
              </div>
              <Sparkline data={data.weeklyScores} color="oklch(0.72 0.15 200)" />
            </div>
            <div className="flex justify-between mt-3">
              {["月", "火", "水", "木", "金", "土", "日"].map((d, i) => (
                <span key={d} className={`text-[9px] ${i === data.weeklyScores.length - 1 ? "text-teal font-semibold" : "text-muted-foreground"}`}>{d}</span>
              ))}
            </div>
          </motion.div>

          {/* Food Log Dots (Habits) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="elevated-card rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="stat-label">Food Log (30 Days)</p>
              <span className="text-xs text-teal font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
                {data.logDots.filter(d => d === "active").length}/30
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {data.logDots.map((dot, i) => (
                <div
                  key={i}
                  className={`w-full aspect-square rounded-[3px] ${
                    dot === "active" ? "dot-active" : dot === "missed" ? "dot-missed" : "dot-inactive"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm dot-active" />
                <span className="text-[9px] text-muted-foreground">記録済み</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm dot-missed" />
                <span className="text-[9px] text-muted-foreground">未記録</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="elevated-card rounded-2xl p-5"
          >
            <p className="stat-label mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { href: "/food-scanner", icon: ScanLine, label: "フードスキャナー", desc: "食事を撮影", color: "text-amber" },
                { href: "/meal-plan", icon: UtensilsCrossed, label: "ミールプラン", desc: "今週のメニュー", color: "text-teal" },
                { href: "/supplements", icon: Pill, label: "サプリメント", desc: "不足栄養素を補う", color: "text-amber" },
              ].map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <action.icon className={`w-4 h-4 ${action.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-foreground">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ============================================================ */}
        {/*  Bottom Row: Biomarkers Table + Alerts                       */}
        {/* ============================================================ */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          {/* Biomarkers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="elevated-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="stat-label mb-1">Biomarkers</p>
                <h2 className="text-lg font-bold">主要バイオマーカー</h2>
              </div>
              <Link href="/upload">
                <Button variant="outline" size="sm" className="text-xs gap-1.5 border-border h-8 rounded-lg">
                  データ更新 <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 stat-label font-semibold">マーカー</th>
                    <th className="text-right py-2.5 stat-label font-semibold">値</th>
                    <th className="text-right py-2.5 stat-label font-semibold hidden sm:table-cell">基準範囲</th>
                    <th className="text-center py-2.5 stat-label font-semibold">トレンド</th>
                    <th className="text-right py-2.5 stat-label font-semibold">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {data.biomarkers.map((marker) => (
                    <tr key={marker.name} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                      <td className="py-3 font-medium text-sm">{marker.name}</td>
                      <td className="py-3 text-right" style={{ fontFamily: "var(--font-mono)" }}>
                        <span className="font-semibold">{marker.value}</span>
                        <span className="text-muted-foreground text-xs ml-1">{marker.unit}</span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground text-xs hidden sm:table-cell" style={{ fontFamily: "var(--font-mono)" }}>{marker.range}</td>
                      <td className="py-3 text-center"><TrendBadge trend={marker.trend} /></td>
                      <td className="py-3 text-right"><StatusBadge status={marker.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-4"
          >
            {/* Attention items */}
            <div className="elevated-card rounded-2xl p-5 border border-amber/10">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-amber" />
                <p className="stat-label text-amber" style={{ color: "oklch(0.78 0.16 75)" }}>Attention Required</p>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber/5 border border-amber/10">
                  <p className="text-xs font-semibold text-foreground mb-0.5">フェリチン</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">基準値をやや下回っています。鉄分を含む食材を意識しましょう。</p>
                </div>
                <div className="p-3 rounded-xl bg-amber/5 border border-amber/10">
                  <p className="text-xs font-semibold text-foreground mb-0.5">ビタミンD</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">基準値をやや下回っています。日光浴やサプリメントの検討を。</p>
                </div>
              </div>
            </div>

            {/* DNA insights */}
            <div className="elevated-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Dna className="w-4 h-4 text-teal" />
                <p className="stat-label">DNA Insights</p>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">筋肉タイプ</span>
                  <span className="text-xs font-semibold text-foreground">速筋優位型</span>
                </div>
                <div className="h-px bg-border/30" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">脂質代謝</span>
                  <span className="text-xs font-semibold text-amber">やや低効率</span>
                </div>
                <div className="h-px bg-border/30" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">カフェイン感受性</span>
                  <span className="text-xs font-semibold text-teal">高感受性</span>
                </div>
                <div className="h-px bg-border/30" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">アルコール代謝</span>
                  <span className="text-xs font-semibold text-amber">低効率</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}

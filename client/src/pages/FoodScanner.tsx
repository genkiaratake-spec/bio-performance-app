import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, AlertTriangle, CheckCircle, Info, Zap,
  ChevronDown, ChevronUp, X, TrendingDown, Minus,
  ShieldAlert, Flame, Droplets, Wheat, Beef, Apple, ScanLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type NutrientStatus = "sufficient" | "low" | "deficient" | "excess";
type AlertLevel = "safe" | "caution" | "warning";

interface DetectedFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface NutrientFlag {
  nutrient: string;
  status: NutrientStatus;
  current: string;
  optimal: string;
  message: string;
  source: "blood" | "dna";
}

interface ComponentAlert {
  component: string;
  level: AlertLevel;
  reason: string;
  source: "blood" | "dna";
}

interface ScanResult {
  foods: DetectedFood[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  performanceScore: number;
  nutrientFlags: NutrientFlag[];
  componentAlerts: ComponentAlert[];
}

/* ------------------------------------------------------------------ */
/*  Mock scan results                                                  */
/* ------------------------------------------------------------------ */
const mockResults: ScanResult = {
  foods: [
    { name: "グリルチキン", portion: "150g", calories: 248, protein: 38, carbs: 0, fat: 9.5, fiber: 0 },
    { name: "玄米", portion: "180g", calories: 264, protein: 5.4, carbs: 56, fat: 1.8, fiber: 2.5 },
    { name: "ブロッコリー", portion: "80g", calories: 27, protein: 3.6, carbs: 4.2, fat: 0.3, fiber: 4.2 },
    { name: "アボカド", portion: "50g", calories: 93, protein: 1, carbs: 4.3, fat: 8.5, fiber: 3.4 },
  ],
  totalCalories: 632,
  totalProtein: 48,
  totalCarbs: 64.5,
  totalFat: 20.1,
  totalFiber: 10.1,
  performanceScore: 87,
  nutrientFlags: [
    { nutrient: "鉄分", status: "low", current: "摂取量: 2.8mg", optimal: "推奨: 7.5mg/食", message: "血液検査でフェリチン値が基準値を下回っています。この食事では鉄分が不足しています。レバーやほうれん草を追加することを推奨します。", source: "blood" },
    { nutrient: "ビタミンD", status: "deficient", current: "摂取量: 0.3μg", optimal: "推奨: 5.5μg/食", message: "血液検査で25(OH)D値が低値です。この食事にはビタミンDがほとんど含まれていません。卵やサーモンの追加を推奨します。", source: "blood" },
    { nutrient: "オメガ3脂肪酸", status: "sufficient", current: "摂取量: 1.2g", optimal: "推奨: 1.0g/食", message: "アボカドからの良質な脂質が十分に摂取できています。あなたの遺伝子型はオメガ3の代謝効率が高い傾向です。", source: "dna" },
    { nutrient: "タンパク質", status: "sufficient", current: "摂取量: 48g", optimal: "推奨: 40g/食", message: "グリルチキンから十分なタンパク質が摂取できています。筋合成に最適な量です。", source: "blood" },
    { nutrient: "マグネシウム", status: "low", current: "摂取量: 45mg", optimal: "推奨: 100mg/食", message: "血液検査でマグネシウム値がやや低めです。玄米からの摂取はありますが、ナッツ類の追加を推奨します。", source: "blood" },
  ],
  componentAlerts: [
    { component: "グルテン（玄米は微量）", level: "safe", reason: "あなたの遺伝子型ではグルテン感受性は低い傾向です。玄米のグルテン含有量は極めて微量のため問題ありません。", source: "dna" },
    { component: "飽和脂肪酸", level: "caution", reason: "チキンの皮を含む場合、飽和脂肪酸がやや多くなります。あなたのLDLコレステロール値は正常範囲ですが、皮なしを推奨します。", source: "blood" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const statusConfig: Record<NutrientStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  sufficient: { label: "十分", color: "text-teal", bg: "bg-teal/10", icon: CheckCircle },
  low: { label: "不足気味", color: "text-amber", bg: "bg-amber/10", icon: TrendingDown },
  deficient: { label: "不足", color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle },
  excess: { label: "過剰", color: "text-amber", bg: "bg-amber/10", icon: AlertTriangle },
};

const alertConfig: Record<AlertLevel, { label: string; color: string; bg: string; border: string }> = {
  safe: { label: "安全", color: "text-teal", bg: "bg-teal/10", border: "border-teal/20" },
  caution: { label: "注意", color: "text-amber", bg: "bg-amber/10", border: "border-amber/20" },
  warning: { label: "警告", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
};

/* ------------------------------------------------------------------ */
/*  Score Ring                                                         */
/* ------------------------------------------------------------------ */
function ScoreRing({ score }: { score: number }) {
  const size = 140;
  const sw = 7;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "oklch(0.72 0.15 200)" : score >= 60 ? "oklch(0.78 0.16 75)" : "oklch(0.60 0.22 25)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="score-ring-track" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} className="score-ring-fill" stroke={color} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat-value" style={{ fontSize: 36 }}>{score}</span>
        <span className="stat-label mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Macro Bar (horizontal)                                             */
/* ------------------------------------------------------------------ */
function MacroBar({ label, value, max, color, icon: Icon }: { label: string; value: number; max: number; color: string; icon: typeof Flame }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)", color }}>{value}g</span>
      </div>
      <div className="macro-track">
        <motion.div className="macro-fill" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.4 }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function FoodScanner() {
  const [phase, setPhase] = useState<"idle" | "scanning" | "result">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [expandedFlag, setExpandedFlag] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPhase("scanning");
    setTimeout(() => {
      setResult(mockResults);
      setPhase("result");
    }, 2500);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const reset = () => {
    setPhase("idle");
    setPreviewUrl(null);
    setResult(null);
    setExpandedFlag(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="stat-label mb-1">AI Food Scanner</p>
          <h1 className="text-2xl lg:text-3xl font-bold">フードスキャナー</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            食事の写真を撮影すると、AIが栄養素を解析し、あなたのバイオデータに基づいた個別フィードバックを提供します。
          </p>
        </motion.div>

        {/* Disclaimer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="elevated-card rounded-xl p-3.5 mb-6 flex items-start gap-3">
          <Info className="w-4 h-4 text-teal mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            栄養素の推定値はAIによる概算です。管理栄養士監修のアルゴリズムに基づく<span className="font-medium text-foreground">健康増進・パフォーマンス最適化</span>を目的とした提案であり、医療上の診断・処方ではありません。
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/*  IDLE                                                        */}
          {/* ============================================================ */}
          {phase === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="elevated-card rounded-2xl border border-dashed border-border hover:border-primary/30 transition-all cursor-pointer p-12 lg:p-20 flex flex-col items-center justify-center gap-6 group relative block"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleInputChange}
                  style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, overflow: "hidden", top: 0, left: 0 }}
                />
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors glow-teal">
                  <ScanLine className="w-10 h-10 text-primary" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-2">食事の写真をアップロード</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    ドラッグ＆ドロップ、またはクリックして選択。AIが食品を識別し、カロリー・栄養素を自動解析します。
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="gap-2 border-border text-xs">
                    <Upload className="w-3.5 h-3.5" />
                    ファイルを選択
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 border-border text-xs">
                    <Camera className="w-3.5 h-3.5" />
                    カメラで撮影
                  </Button>
                </div>
              </label>

              {/* Tips */}
              <div className="grid sm:grid-cols-3 gap-4 mt-6">
                {[
                  { icon: Camera, title: "鮮明な写真", desc: "食品全体が映るよう、真上から撮影すると精度が向上します。" },
                  { icon: Zap, title: "バイオデータ連動", desc: "血液・DNA検査データに基づき、あなた専用のフィードバックを生成。" },
                  { icon: ShieldAlert, title: "注意成分アラート", desc: "遺伝子型に合わない成分を自動検出し、リスクを可視化します。" },
                ].map((tip, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="elevated-card rounded-xl p-4">
                    <tip.icon className="w-4 h-4 text-primary mb-2.5" />
                    <h3 className="text-xs font-bold mb-1">{tip.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{tip.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  SCANNING                                                    */}
          {/* ============================================================ */}
          {phase === "scanning" && (
            <motion.div key="scanning" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="elevated-card rounded-2xl p-8 flex flex-col items-center gap-6">
              {previewUrl && (
                <div className="relative w-full max-w-sm aspect-[4/3] rounded-xl overflow-hidden">
                  <img src={previewUrl} alt="食事写真" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-primary/30 rounded-full" />
                      <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin" />
                    </div>
                  </div>
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-primary/60"
                    initial={{ top: "0%" }}
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{ boxShadow: "0 0 12px oklch(0.72 0.15 200 / 0.5)" }}
                  />
                </div>
              )}
              <div className="text-center">
                <h2 className="text-lg font-bold mb-2">AIが解析中...</h2>
                <p className="text-sm text-muted-foreground">食品の識別・栄養素の算出・バイオデータとの照合を行っています</p>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  RESULT                                                      */}
          {/* ============================================================ */}
          {phase === "result" && result && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Top row: Photo + Score + Macros */}
              <div className="grid lg:grid-cols-[1fr_300px] gap-5">
                {/* Photo & detected foods */}
                <div className="elevated-card rounded-2xl overflow-hidden">
                  {previewUrl && (
                    <div className="relative w-full aspect-[16/9]">
                      <img src={previewUrl} alt="食事写真" className="w-full h-full object-cover" />
                      <button onClick={reset} className="absolute top-3 right-3 p-2 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="p-5">
                    <p className="stat-label mb-3">Detected Foods</p>
                    <div className="space-y-1">
                      {result.foods.map((food, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Apple className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <span className="text-sm font-medium">{food.name}</span>
                              <span className="text-[11px] text-muted-foreground ml-2">{food.portion}</span>
                            </div>
                          </div>
                          <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)" }}>{food.calories}<span className="stat-unit">kcal</span></span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score + Macros column */}
                <div className="space-y-4">
                  {/* Score ring */}
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="elevated-card rounded-2xl p-6 flex flex-col items-center">
                    <p className="stat-label mb-3">Performance Score</p>
                    <ScoreRing score={result.performanceScore} />
                    <p className="text-[11px] text-muted-foreground mt-3 text-center leading-relaxed max-w-[200px]">
                      あなたのバイオデータに基づく、この食事の総合評価
                    </p>
                  </motion.div>

                  {/* Calories + Macros */}
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="elevated-card rounded-2xl p-5">
                    <div className="text-center mb-5">
                      <p className="stat-label mb-1">Total Calories</p>
                      <span className="stat-value">{result.totalCalories}</span>
                      <span className="stat-unit">kcal</span>
                    </div>
                    <div className="space-y-3.5">
                      <MacroBar label="タンパク質" value={result.totalProtein} max={60} color="oklch(0.70 0.20 25)" icon={Beef} />
                      <MacroBar label="炭水化物" value={result.totalCarbs} max={80} color="oklch(0.72 0.15 200)" icon={Wheat} />
                      <MacroBar label="脂質" value={result.totalFat} max={30} color="oklch(0.78 0.16 75)" icon={Droplets} />
                      <MacroBar label="食物繊維" value={result.totalFiber} max={15} color="oklch(0.68 0.16 150)" icon={Flame} />
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* ====================================================== */}
              {/*  Nutrient Flags                                         */}
              {/* ====================================================== */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-amber" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">バイオデータ連動フィードバック</h2>
                    <p className="text-[11px] text-muted-foreground">あなたの血液検査・DNA検査データに基づく個別評価</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {result.nutrientFlags.map((flag, i) => {
                    const config = statusConfig[flag.status];
                    const Icon = config.icon;
                    const isExpanded = expandedFlag === i;

                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.06 }} className="elevated-card rounded-xl overflow-hidden">
                        <button onClick={() => setExpandedFlag(isExpanded ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                              <Icon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold">{flag.nutrient}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${config.bg} ${config.color}`}>{config.label}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                                  {flag.source === "blood" ? "血液検査" : "DNA検査"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{flag.current}</span>
                                <Minus className="w-2.5 h-2.5 text-muted-foreground/40" />
                                <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{flag.optimal}</span>
                              </div>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="px-4 pb-4 pt-0">
                                <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground leading-relaxed">
                                  {flag.message}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* ====================================================== */}
              {/*  Component Alerts                                       */}
              {/* ====================================================== */}
              {result.componentAlerts.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <ShieldAlert className="w-4 h-4 text-destructive" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">注意成分アラート</h2>
                      <p className="text-[11px] text-muted-foreground">あなたの遺伝子型・血液データに基づく成分リスク評価</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {result.componentAlerts.map((alert, i) => {
                      const config = alertConfig[alert.level];
                      return (
                        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.06 }} className={`elevated-card rounded-xl p-4 border ${config.border}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                              <ShieldAlert className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-semibold">{alert.component}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${config.bg} ${config.color}`}>{config.label}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                                  {alert.source === "blood" ? "血液検査" : "DNA検査"}
                                </span>
                              </div>
                              <p className="text-[13px] text-muted-foreground leading-relaxed">{alert.reason}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Action buttons */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={reset} variant="outline" className="flex-1 gap-2 border-border h-11">
                  <Camera className="w-4 h-4" />
                  別の食事をスキャン
                </Button>
                <Button className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11">
                  <Zap className="w-4 h-4" />
                  この食事をログに保存
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

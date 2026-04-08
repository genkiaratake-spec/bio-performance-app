import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, AlertTriangle, Info, Zap,
  X, Apple, ScanLine, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";
import { addMealLog } from "../utils/mealLog";
import { getScoreBand } from "../utils/foodScoring";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FoodItem {
  name: string;
  amount: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface FoodAnalysisResult {
  mealName: string;
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber?: number;
  healthScore: number;
  advice: string;
  confidence: 'high' | 'medium' | 'low';
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'capacitor:'
  ? 'https://bio-performance-app.vercel.app'
  : '';

function scoreStyle(score: number) {
  const band = getScoreBand(score);
  if (band.color === 'green') return { badge: 'bg-teal/10 text-teal', ring: '#22c55e', label: band.label };
  if (band.color === 'yellow') return { badge: 'bg-amber/10 text-amber', ring: '#eab308', label: band.label };
  return { badge: 'bg-destructive/10 text-destructive', ring: '#ef4444', label: band.label };
}

/* ------------------------------------------------------------------ */
/*  Score Ring                                                         */
/* ------------------------------------------------------------------ */
function ScoreRing({ score }: { score: number }) {
  const size = 120;
  const sw = 7;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const { ring } = scoreStyle(score);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="score-ring-track" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} className="score-ring-fill" stroke={ring} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat-value" style={{ fontSize: 30 }}>{score}</span>
        <span className="stat-label mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  Meal type guess from current hour                                  */
/* ------------------------------------------------------------------ */
function guessMealType(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 21) return 'dinner';
  return 'snack';
}

export default function FoodScanner() {
  const [phase, setPhase] = useState<"idle" | "scanning" | "result">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFood = useCallback(async (file: File) => {
    setAnalysisError(null);
    setAnalysisResult(null);
    setPreviewUrl(URL.createObjectURL(file));
    setPhase("scanning");

    try {
      const formData = new FormData();
      formData.append('file', file);          // 変換なしで直接送信

      // bloodTestResults（新形式）を優先、なければ healthCheckData（旧形式）を使用
      const bloodTestRaw = localStorage.getItem('bloodTestResults');
      const healthCheckRaw = localStorage.getItem('healthCheckData');
      const healthPayload = bloodTestRaw || healthCheckRaw;
      if (healthPayload) {
        formData.append('healthData', healthPayload);
      }

      // ユーザープロフィール（ゴール・体重）を送信
      const goalRaw = localStorage.getItem('userGoal');
      const weightRaw = localStorage.getItem('userWeight');
      if (goalRaw || weightRaw) {
        formData.append('userProfile', JSON.stringify({
          goal: goalRaw || undefined,
          weight: weightRaw ? Number(weightRaw) : undefined,
        }));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${API_BASE}/api/analyze-food`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        setAnalysisError('Parse error: ' + text.substring(0, 60));
        setPhase("idle");
        return;
      }

      if (result.success) {
        setAnalysisResult(result.data);
        setPhase("result");
      } else {
        setAnalysisError(result.error || '解析に失敗しました');
        setPhase("idle");
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setAnalysisError('タイムアウト（60秒）');
      } else {
        setAnalysisError('fetch失敗: ' + (err instanceof Error ? err.message : String(err)));
      }
      setPhase("idle");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) analyzeFood(file);
  }, [analyzeFood]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyzeFood(file);
  }, [analyzeFood]);

  const reset = () => {
    setPhase("idle");
    setPreviewUrl(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setShowScoreDetail(false);
  };

  const handleSaveMeal = () => {
    if (!analysisResult) return;

    // mealLog (Home.tsx 連携用)
    addMealLog({
      mealType: guessMealType(),
      mealName: analysisResult.mealName,
      totalCalories: analysisResult.totalCalories,
      totalProtein: analysisResult.totalProtein,
      totalFat: analysisResult.totalFat,
      totalCarbs: analysisResult.totalCarbs,
      healthScore: analysisResult.healthScore,
    });

    // foodLogs (FoodLog.tsx 後方互換)
    const foodLogs: Array<FoodAnalysisResult & { date: string }> =
      JSON.parse(localStorage.getItem('foodLogs') || '[]');
    foodLogs.push({ ...analysisResult, date: new Date().toISOString() });
    localStorage.setItem('foodLogs', JSON.stringify(foodLogs));

    // トーストを表示してリセット
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      reset();
    }, 1500);
  };

  return (
    <DashboardLayout>
      {/* ── 保存完了トースト ── */}
      <AnimatePresence>
        {savedMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            style={{
              position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
              background: "#4ade80", color: "#000",
              padding: "10px 24px", borderRadius: 999,
              fontSize: 13, fontWeight: 700, zIndex: 9999,
              boxShadow: "0 4px 24px #4ade8050",
              whiteSpace: "nowrap",
            }}
          >
            ✅ 食事を記録しました
          </motion.div>
        )}
      </AnimatePresence>

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
            ※ 本アプリは医療機器ではありません。栄養素の推定値はAIによる概算です。表示される情報は生活習慣改善の参考を目的としており、医学的診断・治療を提供するものではありません。
          </p>
        </motion.div>

        {/* Error banner */}
        {analysisError && phase === "idle" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="elevated-card rounded-xl p-4 mb-5 flex items-center gap-3 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{analysisError}</p>
          </motion.div>
        )}

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
                  id="food-camera-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
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
                  { icon: Zap, title: "リアルタイム解析", desc: "Claude AIが食品を識別し、カロリー・PFCを瞬時に算出します。" },
                  { icon: Apple, title: "食事ログ保存", desc: "解析結果をログに記録して、毎日の栄養管理に活用できます。" },
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
                <p className="text-sm text-muted-foreground">食品の識別・栄養素の算出を行っています</p>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  RESULT                                                      */}
          {/* ============================================================ */}
          {phase === "result" && analysisResult && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Header card: photo + meal name + score */}
              <div className="elevated-card rounded-2xl overflow-hidden">
                {previewUrl && (
                  <div className="relative w-full aspect-[16/9]">
                    <img src={previewUrl} alt="食事写真" className="w-full h-full object-cover" />
                    <button onClick={reset} className="absolute top-3 right-3 p-2 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="stat-label mb-1">解析結果</p>
                    <h2 className="text-xl font-bold">{analysisResult.mealName}</h2>
                    <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold mt-1.5 ${scoreStyle(analysisResult.healthScore).badge}`}>
                      信頼度: {analysisResult.confidence === 'high' ? '高' : analysisResult.confidence === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <ScoreRing score={analysisResult.healthScore} />
                    <span className="text-[11px] font-bold mt-1" style={{ color: scoreStyle(analysisResult.healthScore).ring }}>
                      {scoreStyle(analysisResult.healthScore).label}
                    </span>
                  </div>
                </div>

                {/* Score explanation collapsible */}
                <div className="px-5 pb-4">
                  <button
                    onClick={() => setShowScoreDetail(!showScoreDetail)}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showScoreDetail ? 'rotate-180' : ''}`} />
                    このスコアの根拠
                  </button>
                  <AnimatePresence>
                    {showScoreDetail && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 text-[11px] text-muted-foreground space-y-1 pl-1">
                          <p className="mb-1.5">このスコアは以下を考慮しています：</p>
                          <p>✅ 栄養バランス（タンパク質・脂質・炭水化物・食物繊維）</p>
                          {localStorage.getItem('bloodTestResults') || localStorage.getItem('healthCheckData')
                            ? <p>✅ 健康診断データ</p>
                            : null}
                          {localStorage.getItem('userGoal')
                            ? <p>✅ 設定中のゴール</p>
                            : null}
                          <p className="mt-2 text-[10px] opacity-70">※ 本スコアは医療診断ではありません。生活習慣改善の参考としてご活用ください。</p>
                          {!localStorage.getItem('bloodTestResults') && !localStorage.getItem('healthCheckData') && (
                            <p className="mt-1 text-[10px] text-teal">💡 健康診断データを登録するとスコアがより精度よくなります</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* PFC Summary */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "カロリー", value: analysisResult.totalCalories, unit: "kcal", color: "oklch(0.72 0.15 200)" },
                  { label: "タンパク質", value: analysisResult.totalProtein, unit: "g", color: "oklch(0.70 0.20 25)" },
                  { label: "脂質", value: analysisResult.totalFat, unit: "g", color: "oklch(0.78 0.16 75)" },
                  { label: "炭水化物", value: analysisResult.totalCarbs, unit: "g", color: "oklch(0.68 0.16 150)" },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }} className="elevated-card rounded-xl p-4 text-center">
                    <p className="stat-label mb-1">{item.label}</p>
                    <span className="stat-value" style={{ color: item.color }}>{item.value}</span>
                    <span className="stat-unit">{item.unit}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Food items list */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="elevated-card rounded-2xl p-5">
                <p className="stat-label mb-3">検出した食品</p>
                <div className="space-y-0.5">
                  {analysisResult.items.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.05 }} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Apple className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-[11px] text-muted-foreground ml-2">{item.amount}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                        {item.calories}<span className="stat-unit">kcal</span>
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Advice */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="elevated-card rounded-xl p-4 border border-teal/20 bg-teal/5">
                <div className="flex items-start gap-3">
                  <Zap className="w-4 h-4 text-teal mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground leading-relaxed">{analysisResult.advice}</p>
                </div>
              </motion.div>

              {/* Action buttons */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button onClick={reset} variant="outline" className="flex-1 gap-2 border-border h-11">
                  <Camera className="w-4 h-4" />
                  再撮影する
                </Button>
                <Button onClick={handleSaveMeal} className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11">
                  <Zap className="w-4 h-4" />
                  記録する
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

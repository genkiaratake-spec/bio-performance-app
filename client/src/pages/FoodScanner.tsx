import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, AlertTriangle, Info, Zap,
  X, Apple, ScanLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";

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
  if (score >= 80) return { badge: 'bg-teal/10 text-teal', ring: 'oklch(0.72 0.15 200)' };
  if (score >= 60) return { badge: 'bg-amber/10 text-amber', ring: 'oklch(0.78 0.16 75)' };
  return { badge: 'bg-destructive/10 text-destructive', ring: 'oklch(0.60 0.22 25)' };
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
export default function FoodScanner() {
  const [phase, setPhase] = useState<"idle" | "scanning" | "result">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const maxSize = 1024;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85);
      };
      img.src = url;
    });
  };

  const analyzeFood = useCallback(async (file: File) => {
    setAnalysisError(null);
    setAnalysisResult(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPhase("scanning");

    try {
      const formData = new FormData();

      // 2MB以上の場合のみリサイズ（失敗時は元ファイルを使用）
      if (file.size > 2 * 1024 * 1024) {
        try {
          const resizedBlob = await resizeImage(file);
          const resizedFile = new File([resizedBlob], 'food.jpg', { type: 'image/jpeg' });
          console.log('Resized:', file.size, '->', resizedFile.size);
          formData.append('file', resizedFile);
        } catch (resizeErr) {
          console.warn('Resize failed, using original:', resizeErr);
          formData.append('file', file);
        }
      } else {
        formData.append('file', file);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_BASE}/api/analyze-food`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      console.log('Response:', response.status, text.substring(0, 200));
      let result;
      try { result = JSON.parse(text); } catch {
        setAnalysisError('レスポンスの解析に失敗しました: ' + text.substring(0, 100));
        setPhase("idle");
        return;
      }

      if (result.success) {
        setAnalysisResult(result.data);
        setPhase("result");
      } else {
        setAnalysisError(result.error || result.detail || '解析に失敗しました');
        setPhase("idle");
      }
    } catch (err) {
      console.error('analyzeFood error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setAnalysisError('解析がタイムアウトしました');
      } else {
        const detail = err instanceof Error ? err.message : String(err);
        setAnalysisError('通信エラーが発生しました: ' + detail);
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
  };

  const saveToLog = () => {
    if (!analysisResult) return;
    const logs: Array<FoodAnalysisResult & { date: string }> = JSON.parse(localStorage.getItem('foodLogs') || '[]');
    logs.push({ ...analysisResult, date: new Date().toISOString() });
    localStorage.setItem('foodLogs', JSON.stringify(logs));
    alert('食事ログに保存しました');
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
                    <p className="text-[10px] text-muted-foreground mt-1.5">健康スコア</p>
                  </div>
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
                <Button onClick={saveToLog} className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11">
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

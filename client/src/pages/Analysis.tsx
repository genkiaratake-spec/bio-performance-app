import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, AlertTriangle, ArrowRight, Info, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Compatibility = "excellent" | "good" | "caution" | "avoid";

type FoodItem = {
  name: string;
  category: string;
  compatibility: Compatibility;
  reason: string;
  nutrients: string[];
};

type NutritionData = {
  summary: string;
  optimal: Array<{ name: string; category: string; reason: string; nutrients?: string[] }>;
  recommended: Array<{ name: string; category: string; reason: string; nutrients?: string[] }>;
  caution: Array<{ name: string; category: string; reason: string }>;
  avoid: Array<{ name: string; category: string; reason: string }>;
};

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const compatibilityConfig = {
  excellent: { label: "最適", icon: ThumbsUp, color: "text-teal", bg: "bg-teal/10", border: "border-teal/20", dot: "bg-teal" },
  good: { label: "推奨", icon: ThumbsUp, color: "text-teal", bg: "bg-teal/5", border: "border-teal/10", dot: "bg-teal/60" },
  caution: { label: "注意", icon: AlertTriangle, color: "text-amber", bg: "bg-amber/10", border: "border-amber/20", dot: "bg-amber" },
  avoid: { label: "非推奨", icon: ThumbsDown, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", dot: "bg-destructive" },
};

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'capacitor:'
  ? 'https://bio-performance-app.vercel.app'
  : '';

const SESSION_KEY = 'nutritionAnalysisCache';

function toFoodItems(data: NutritionData): FoodItem[] {
  const items: FoodItem[] = [];
  for (const f of data.optimal) items.push({ ...f, compatibility: "excellent", nutrients: f.nutrients ?? [] });
  for (const f of data.recommended) items.push({ ...f, compatibility: "good", nutrients: f.nutrients ?? [] });
  for (const f of data.caution) items.push({ ...f, compatibility: "caution", nutrients: [] });
  for (const f of data.avoid) items.push({ ...f, compatibility: "avoid", nutrients: [] });
  return items;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function Analysis() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | Compatibility>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [foodData, setFoodData] = useState<FoodItem[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHealthData, setHasHealthData] = useState<boolean | null>(null);

  const runAnalysis = (raw: string) => {
    let healthData: any;
    try { healthData = JSON.parse(raw); } catch { setError('データの読み込みに失敗しました'); return; }
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/analyze-nutrition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthData }),
    })
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(result.data));
          setFoodData(toFoodItems(result.data));
          setSummary(result.data.summary);
        } else {
          setError(result.error || '解析に失敗しました');
        }
      })
      .catch(err => setError('通信エラー: ' + (err instanceof Error ? err.message : String(err))))
      .finally(() => setLoading(false));
  };

  const reanalyze = () => {
    const raw = localStorage.getItem('healthCheckData');
    if (!raw) return;
    sessionStorage.removeItem(SESSION_KEY);
    setFoodData([]);
    setSummary('');
    runAnalysis(raw);
  };

  useEffect(() => {
    const raw = localStorage.getItem('healthCheckData');
    if (!raw) {
      setHasHealthData(false);
      return;
    }
    setHasHealthData(true);

    // セッションキャッシュがあれば再利用
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      try {
        const parsed: NutritionData = JSON.parse(cached);
        setFoodData(toFoodItems(parsed));
        setSummary(parsed.summary);
        return;
      } catch {}
    }

    runAnalysis(raw);
  }, []);

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
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="stat-label mb-1">Food Analysis</p>
              <h1 className="text-2xl lg:text-3xl font-bold">食事解析</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                あなたの健康診断データに基づいた、食材推奨レポートです。
              </p>
            </div>
            {foodData.length > 0 && !loading && (
              <button
                onClick={reanalyze}
                className="shrink-0 mt-1 text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors whitespace-nowrap"
              >
                🔄 再解析する
              </button>
            )}
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="elevated-card rounded-xl p-3.5 mb-6 flex items-start gap-3">
          <Info className="w-4 h-4 text-teal mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            以下の提案は、AIによる解析に基づく<span className="font-medium text-foreground">健康増進・パフォーマンス最適化</span>を目的としたものです。
            医療上の診断・処方ではありません。アレルギーや持病がある場合は、必ず医療機関にご相談ください。
          </p>
        </motion.div>

        {/* ── 健康診断データなし ── */}
        {hasHealthData === false && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="elevated-card rounded-2xl p-10 flex flex-col items-center text-center">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-bold mb-2">健康診断データが未登録です</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
              健康診断・人間ドックの結果をアップロードすると、
              あなたの数値に基づいた食材推奨が表示されます。
            </p>
            <Button onClick={() => navigate('/upload')} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-11 px-8">
              健康診断をアップロード
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* ── ローディング ── */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="elevated-card rounded-2xl p-12 flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="w-12 h-12 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-primary rounded-full animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">健康診断データを解析中...</p>
          </motion.div>
        )}

        {/* ── エラー ── */}
        {error && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="elevated-card rounded-xl p-4 mb-5 flex items-center gap-3 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {/* ── データあり ── */}
        {!loading && foodData.length > 0 && (
          <>
            {/* Summary */}
            {summary && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="elevated-card rounded-xl p-4 mb-5 border border-teal/20 bg-teal/5">
                <p className="text-sm text-foreground leading-relaxed">{summary}</p>
              </motion.div>
            )}

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
                    key={food.name + i}
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
              <Link href="/food-log">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-semibold px-10 h-11">
                  食事ログを見る
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

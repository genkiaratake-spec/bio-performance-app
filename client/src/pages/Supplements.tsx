import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ExternalLink, ArrowRight, AlertTriangle, RefreshCw } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface SupplementItem {
  name: string;
  priority: "high" | "medium" | "low";
  reason: string;
  dosage: string;
  timing: string;
  estimatedMonthlyPrice: number;
  targetMarker: string;
  amazonSearchQuery: string;
}

interface SupplementData {
  summary: string;
  supplements: SupplementItem[];
  totalMonthlyEstimate: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const API_BASE = typeof window !== "undefined" && window.location.protocol === "capacitor:"
  ? "https://bio-performance-app.vercel.app"
  : "";

const SESSION_KEY = "supplementsData";

const PRIORITY_CONFIG = {
  high:   { label: "高優先", color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
  medium: { label: "中優先", color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.25)" },
  low:    { label: "低優先", color: "#6b7280", bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.2)" },
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function Supplements() {
  const [, navigate] = useLocation();
  const [supplementData, setSupplementData] = useState<SupplementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHealthData, setHasHealthData] = useState<boolean | null>(null);

  const runAnalysis = (healthData: any, userProfile: any) => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/analyze-supplements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healthData, userProfile }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(result.data));
          setSupplementData(result.data);
        } else {
          setError(result.error || "解析に失敗しました");
        }
      })
      .catch((err) => setError("通信エラー: " + (err instanceof Error ? err.message : String(err))))
      .finally(() => setLoading(false));
  };

  const reanalyze = () => {
    const raw = localStorage.getItem("healthCheckData");
    if (!raw) return;
    sessionStorage.removeItem(SESSION_KEY);
    setSupplementData(null);
    try {
      const healthData = JSON.parse(raw);
      const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
      runAnalysis(healthData, userProfile);
    } catch {
      setError("データの読み込みに失敗しました");
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem("healthCheckData");
    if (!raw) { setHasHealthData(false); return; }
    setHasHealthData(true);

    // キャッシュ確認
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      try {
        setSupplementData(JSON.parse(cached));
        return;
      } catch {}
    }

    try {
      const healthData = JSON.parse(raw);
      const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
      runAnalysis(healthData, userProfile);
    } catch {
      setError("データの読み込みに失敗しました");
    }
  }, []);

  /* ── 健康診断データなし ── */
  if (hasHealthData === false) {
    return (
      <div className="p-5 pt-16 lg:pt-8 lg:p-8 pb-24 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", height: "100%" }}>
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">SUPPLEMENT OPTIMIZATION</p>
          <h1 className="text-2xl font-bold text-white mb-2">サプリメント最適化</h1>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111118] rounded-2xl p-10 flex flex-col items-center text-center border border-white/8"
        >
          <div className="text-5xl mb-4">💊</div>
          <h2 className="text-xl font-bold text-white mb-2">健康診断データが未登録です</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-sm leading-relaxed">
            健康診断・人間ドックの結果をアップロードすると、
            あなたの数値に基づいたサプリメント提案が表示されます。
          </p>
          <button
            onClick={() => navigate("/upload")}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-black transition-colors"
            style={{ background: "#4ade80" }}
          >
            健康診断をアップロード
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── ローディング ── */
  if (loading) {
    return (
      <div className="p-5 pt-16 lg:pt-8 lg:p-8 pb-24 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", height: "100%" }}>
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">SUPPLEMENT OPTIMIZATION</p>
          <h1 className="text-2xl font-bold text-white mb-2">サプリメント最適化</h1>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#111118] rounded-2xl p-12 flex flex-col items-center gap-4 border border-white/8"
        >
          <div className="relative w-12 h-12">
            <div className="w-12 h-12 border-4 border-green-500/20 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-green-500 rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-400">健康診断データを解析中...</p>
          <p className="text-xs text-gray-600">30秒ほどかかる場合があります</p>
        </motion.div>
      </div>
    );
  }

  /* ── エラー ── */
  if (error && !supplementData) {
    return (
      <div className="p-5 pt-16 lg:pt-8 lg:p-8 pb-24 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", height: "100%" }}>
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">SUPPLEMENT OPTIMIZATION</p>
          <h1 className="text-2xl font-bold text-white mb-2">サプリメント最適化</h1>
        </div>
        <div className="bg-[#111118] rounded-xl p-4 border border-orange-500/20 flex items-start gap-3 mb-4">
          <AlertTriangle size={16} className="text-orange-400 shrink-0 mt-0.5" />
          <p className="text-sm text-orange-400">{error}</p>
        </div>
        <button
          onClick={reanalyze}
          className="w-full py-3 rounded-xl text-sm font-semibold text-black transition-colors"
          style={{ background: "#4ade80" }}
        >
          再試行する
        </button>
      </div>
    );
  }

  /* ── データなし（初期状態） ── */
  if (!supplementData) return null;

  const highCount   = supplementData.supplements.filter((s) => s.priority === "high").length;
  const totalPrice  = supplementData.totalMonthlyEstimate;

  /* ── メイン表示 ── */
  return (
    <div className="p-5 pt-16 lg:pt-8 lg:p-8 pb-24 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", height: "100%" }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">SUPPLEMENT OPTIMIZATION</p>
          <h1 className="text-2xl font-bold text-white mb-2">サプリメント最適化</h1>
          <p className="text-sm text-gray-400">あなたの健康診断データに基づいたサプリメント提案です。</p>
        </div>
        <button
          onClick={reanalyze}
          className="shrink-0 mt-1 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:border-green-500/40 hover:text-green-400 transition-colors whitespace-nowrap"
        >
          <RefreshCw size={11} />
          再解析
        </button>
      </div>

      {/* Summary */}
      {supplementData.summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111118] rounded-xl p-4 border border-green-500/20 mb-5"
          style={{ background: "rgba(74,222,128,0.04)" }}
        >
          <p className="text-sm text-gray-300 leading-relaxed">{supplementData.summary}</p>
        </motion.div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "推奨数",   value: `${supplementData.supplements.length} 種類`, valueClass: "text-white" },
          { label: "高優先",   value: `${highCount} 種類`,                          valueClass: "text-orange-400" },
          { label: "月額目安", value: `¥${totalPrice.toLocaleString()}`,             valueClass: "text-white" },
        ].map((item) => (
          <div key={item.label} className="bg-[#111118] rounded-xl p-3 border border-white/8">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-lg font-bold ${item.valueClass}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Supplement cards */}
      <div className="space-y-4 mb-6">
        {supplementData.supplements.map((s, i) => {
          const pc = PRIORITY_CONFIG[s.priority] ?? PRIORITY_CONFIG.low;
          const amazonUrl = `https://www.amazon.co.jp/s?k=${encodeURIComponent(s.amazonSearchQuery)}`;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
              className="bg-[#111118] rounded-xl p-4 border border-white/8"
            >
              {/* Name + priority */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base font-bold text-white">{s.name}</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: pc.color, background: pc.bg, border: `1px solid ${pc.border}` }}
                >
                  {pc.label}
                </span>
              </div>

              {/* Reason */}
              <p className="text-sm text-gray-300 mb-3 leading-relaxed">{s.reason}</p>

              {/* Dosage / Timing */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">用量</p>
                  <p className="text-sm font-medium text-white">{s.dosage}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">タイミング</p>
                  <p className="text-sm font-medium text-white">{s.timing}</p>
                </div>
              </div>

              {/* Price + target marker */}
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">月額目安</p>
                  <p className="text-sm font-medium text-white">¥{s.estimatedMonthlyPrice.toLocaleString()}</p>
                </div>
                {s.targetMarker && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">改善目標</p>
                    <p className="text-xs text-green-400 font-medium">{s.targetMarker}</p>
                  </div>
                )}
              </div>

              {/* Amazon button */}
              <a
                href={amazonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ background: "#f97316" }}
              >
                <ExternalLink size={14} />
                Amazonで探す
              </a>
            </motion.div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 text-center leading-relaxed">
        サプリメントの提案はAIによる解析に基づくものであり、医薬品の処方ではありません。服用中の薬がある場合は、必ず医師にご相談ください。
      </p>
    </div>
  );
}

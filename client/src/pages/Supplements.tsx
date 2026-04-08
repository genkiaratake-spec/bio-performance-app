import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ExternalLink, ArrowRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface SupplementItem {
  name: string;
  priority: "high" | "normal";
  reason: string;
  dosage: string;
  timing: string;
  monthly_cost: string;
}

interface BloodTestResults {
  supplements: SupplementItem[];
  overall_assessment?: string;
  savedAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const BLOOD_TEST_KEY = "bloodTestResults";

const PRIORITY_CONFIG = {
  high:   { label: "優先",  color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
  normal: { label: "通常",  color: "#6b7280", bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.2)" },
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function Supplements() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<BloodTestResults | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BLOOD_TEST_KEY);
      if (!raw) { setHasData(false); return; }
      const parsed: BloodTestResults = JSON.parse(raw);
      if (!parsed.supplements || parsed.supplements.length === 0) { setHasData(false); return; }
      setData(parsed);
      setHasData(true);
    } catch {
      setHasData(false);
    }
  }, []);

  /* ── データなし ── */
  if (hasData === false) {
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
          <h2 className="text-xl font-bold text-white mb-2">血液検査データが未登録です</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-sm leading-relaxed">
            まず血液検査結果をアップロードしてください。
            AIが解析してあなた専用のサプリメント処方を生成します。
          </p>
          <button
            onClick={() => navigate("/upload")}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-black transition-colors"
            style={{ background: "#4ade80" }}
          >
            血液検査をアップロード
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── 初期状態（null） ── */
  if (!data) return null;

  const supplements  = data.supplements;
  const highCount    = supplements.filter(s => s.priority === "high").length;

  /* ── メイン表示 ── */
  return (
    <div className="p-5 pt-16 lg:pt-8 lg:p-8 pb-24 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", height: "100%" }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">SUPPLEMENT OPTIMIZATION</p>
          <h1 className="text-2xl font-bold text-white mb-2">サプリメント最適化</h1>
          <p className="text-sm text-gray-400">血液検査結果に基づいたサプリメント処方です。</p>
        </div>
        <button
          onClick={() => navigate("/upload")}
          className="shrink-0 mt-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:border-green-500/40 hover:text-green-400 transition-colors whitespace-nowrap"
        >
          再アップロード
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: "処方数",   value: `${supplements.length} 種類`, valueClass: "text-white" },
          { label: "優先サプリ", value: `${highCount} 種類`,         valueClass: "text-orange-400" },
        ].map((item) => (
          <div key={item.label} className="bg-[#111118] rounded-xl p-3 border border-white/8">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-lg font-bold ${item.valueClass}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Supplement cards */}
      <div className="space-y-4 mb-6">
        {supplements.map((s, i) => {
          const pc = PRIORITY_CONFIG[s.priority] ?? PRIORITY_CONFIG.normal;
          const amazonUrl = `https://www.amazon.co.jp/s?k=${encodeURIComponent(s.name)}`;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
              className="bg-[#111118] rounded-xl p-4 border border-white/8"
              style={{ borderColor: s.priority === "high" ? "rgba(249,115,22,0.25)" : undefined }}
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

              {/* Dosage / Timing / Price */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "用量",     value: s.dosage },
                  { label: "タイミング", value: s.timing },
                  { label: "月額目安",  value: s.monthly_cost },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#0e0e15] rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-500 mb-1">{label}</p>
                    <p className="text-xs font-semibold text-gray-200">{value}</p>
                  </div>
                ))}
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
        ※ 本アプリは医療機器ではありません。サプリメントの提案は生活習慣改善の参考情報であり、医学的診断・治療を提供するものではありません。※ 個人の状態により効果は異なります。医療機関への相談もご検討ください。
      </p>
    </div>
  );
}

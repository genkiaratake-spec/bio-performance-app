import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, Trash2, ArrowRight, FlaskConical, TrendingUp, TrendingDown } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { getHealthHistory, deleteHealthCheck, compareLatestTwo } from "../lib/healthHistory";
import { evaluateBiomarkers, getCategoryScore, BIOMARKER_DEFS } from "../lib/biomarkerEvaluation";
import type { HealthCheckHistory } from "../types/healthCheck";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDateJP(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function addMonths(iso: string, months: number): Date {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatMonthJP(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月頃`;
}

/** Map biomarker key -> human label using BIOMARKER_DEFS */
function biomarkerLabel(key: string): string {
  const def = BIOMARKER_DEFS.find((d) => d.key === key);
  return def ? def.label : key;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HealthHistory() {
  const [, navigate] = useLocation();
  const [history, setHistory] = useState<HealthCheckHistory[]>([]);

  useEffect(() => {
    setHistory(getHealthHistory());
  }, []);

  const handleDelete = (id: string) => {
    deleteHealthCheck(id);
    setHistory(getHealthHistory());
  };

  const comparison = history.length >= 2 ? compareLatestTwo() : null;

  // Compute change list for latest entry
  const changeEntries = comparison
    ? Object.entries(comparison.changes).map(([key, val]) => ({
        key,
        label: biomarkerLabel(key),
        delta: val.delta!,
      }))
    : [];

  // Sort by absolute delta descending, take first 5
  const topChanges = changeEntries
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  /* ---------------------------------------------------------------- */
  /*  Next test reminder                                               */
  /* ---------------------------------------------------------------- */
  const latestDate = history.length > 0 ? history[0].uploadedAt : null;
  const nextTestDate = latestDate ? addMonths(latestDate, 3) : null;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <DashboardLayout>
      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <p className="stat-label mb-1">Health History</p>
          <h1 className="text-2xl lg:text-3xl font-bold">検査履歴</h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            過去の健康診断データと改善トレンド
          </p>
        </motion.div>

        {/* ========================================================== */}
        {/*  Empty State                                                */}
        {/* ========================================================== */}
        {history.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="elevated-card rounded-2xl p-10 flex flex-col items-center text-center gap-4"
          >
            <span className="text-5xl">🔬</span>
            <p className="text-lg font-semibold text-foreground">
              まだ検査結果がありません
            </p>
            <button
              onClick={() => navigate("/analysis")}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "#4ade80", color: "#000" }}
            >
              アップロードする
            </button>
          </motion.div>
        )}

        {/* ========================================================== */}
        {/*  Next Test Reminder                                         */}
        {/* ========================================================== */}
        {history.length > 0 && nextTestDate && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{
              background: "rgba(74, 222, 128, 0.08)",
              border: "1px solid rgba(74, 222, 128, 0.25)",
            }}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 shrink-0" style={{ color: "#4ade80" }} />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  次回推奨検査時期：{formatMonthJP(nextTestDate)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  前回から3ヶ月後が目安です
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/analysis")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shrink-0"
              style={{ background: "#4ade80", color: "#000" }}
            >
              検査結果をアップロード
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* ========================================================== */}
        {/*  Single-entry hint                                          */}
        {/* ========================================================== */}
        {history.length === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-xs text-muted-foreground mb-5 flex items-center gap-2"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            次回検査を登録すると改善トレンドが表示されます
          </motion.div>
        )}

        {/* ========================================================== */}
        {/*  History Cards                                              */}
        {/* ========================================================== */}
        <div className="flex flex-col gap-5">
          {history.map((entry, idx) => {
            const isLatest = idx === 0;
            const entries = evaluateBiomarkers(entry.data);
            const stats = getCategoryScore(entries);
            const barTotal = stats.optimal + stats.sufficient + stats.outOfRange;
            const optPct = barTotal > 0 ? (stats.optimal / barTotal) * 100 : 0;
            const sufPct = barTotal > 0 ? (stats.sufficient / barTotal) * 100 : 0;
            const oorPct = barTotal > 0 ? (stats.outOfRange / barTotal) * 100 : 0;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 + idx * 0.06 }}
                className="rounded-2xl p-5"
                style={{
                  background: "#111118",
                  border: "1px solid #222",
                  borderRadius: 16,
                }}
              >
                {/* Top row: date + badge / delete */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">
                      {formatDateJP(entry.uploadedAt)}
                    </span>
                    {entry.label && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "#ffffff10", color: "#aaa" }}
                      >
                        {entry.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isLatest && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}
                      >
                        現在
                      </span>
                    )}
                    {!isLatest && (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span>
                    <strong className="text-foreground">{stats.measured}</strong> 項目測定
                  </span>
                  <span>
                    Optimal{" "}
                    <strong style={{ color: "#4ade80" }}>{stats.optimal}</strong>
                  </span>
                  <span>
                    要注意{" "}
                    <strong style={{ color: "#f87171" }}>{stats.outOfRange}</strong>
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  className="w-full h-2 rounded-full overflow-hidden flex"
                  style={{ background: "#1a1a24" }}
                >
                  {optPct > 0 && (
                    <div
                      style={{
                        width: `${optPct}%`,
                        background: "#4ade80",
                        transition: "width 0.6s ease",
                      }}
                    />
                  )}
                  {sufPct > 0 && (
                    <div
                      style={{
                        width: `${sufPct}%`,
                        background: "#60a5fa",
                        transition: "width 0.6s ease",
                      }}
                    />
                  )}
                  {oorPct > 0 && (
                    <div
                      style={{
                        width: `${oorPct}%`,
                        background: "#f87171",
                        transition: "width 0.6s ease",
                      }}
                    />
                  )}
                </div>

                {/* Delta tags (latest only, if comparison available) */}
                {isLatest && topChanges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {topChanges.map((ch) => {
                      const improved = ch.delta > 0
                        ? /* higher is better for some, worse for others — use simple heuristic:
                             positive delta on "good" markers = improved, negative = worsened.
                             For simplicity, show green for positive delta, red for negative. */
                          true
                        : false;
                      return (
                        <span
                          key={ch.key}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: improved
                              ? "rgba(74,222,128,0.12)"
                              : "rgba(248,113,113,0.12)",
                            color: improved ? "#4ade80" : "#f87171",
                          }}
                        >
                          {improved ? (
                            <TrendingUp className="w-2.5 h-2.5" />
                          ) : (
                            <TrendingDown className="w-2.5 h-2.5" />
                          )}
                          {ch.label}{" "}
                          {improved ? "▲" : "▼"}
                          {Math.abs(ch.delta)}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Detail button */}
                <button
                  onClick={() => navigate("/analysis")}
                  className="mt-4 flex items-center gap-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                  style={{ color: "#60a5fa" }}
                >
                  詳細を見る
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}

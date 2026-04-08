import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { getTodayMealLog, MealLogEntry } from "../utils/mealLog";
import { getScoreBand } from "../utils/foodScoring";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const MEAL_LABEL: Record<string, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function scoreBandStyle(score: number) {
  const band = getScoreBand(score);
  if (band.color === "green") return { color: "#22c55e", bg: "#22c55e18", border: "#22c55e40" };
  if (band.color === "yellow") return { color: "#eab308", bg: "#eab30818", border: "#eab30840" };
  return { color: "#ef4444", bg: "#ef444418", border: "#ef444440" };
}

/* ------------------------------------------------------------------ */
/*  Score Ring (compact)                                               */
/* ------------------------------------------------------------------ */
function ScoreRingSmall({ score }: { score: number }) {
  const size = 80;
  const sw = 5;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const band = scoreBandStyle(score);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg style={{ transform: "rotate(-90deg)" }} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1a28" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={band.color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{score}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Meal card                                                          */
/* ------------------------------------------------------------------ */
function MealCard({ entry }: { entry: MealLogEntry }) {
  const band = scoreBandStyle(entry.healthScore);
  const scoreBand = getScoreBand(entry.healthScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: "#111118", border: "1px solid #222", borderRadius: 14, padding: 14 }}
    >
      {/* Top row: icon + name + time + score */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.mealName}
          </p>
          <p style={{ fontSize: 10, color: "#555" }}>
            {MEAL_LABEL[entry.mealType] || "食事"} · {formatTime(entry.loggedAt)}
          </p>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: band.bg, border: `1px solid ${band.border}`,
            borderRadius: 999, padding: "3px 10px",
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: band.color }}>{entry.healthScore}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: band.color }}>{scoreBand.label}</span>
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ background: "#1a1a22", borderRadius: 999, height: 4, marginBottom: 10, overflow: "hidden" }}>
        <div style={{
          width: `${Math.min(100, entry.healthScore)}%`,
          height: "100%",
          background: band.color,
          borderRadius: 999,
          transition: "width 0.6s ease-out",
        }} />
      </div>

      {/* Macros */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {[
          { label: "カロリー", value: entry.totalCalories, unit: "kcal", color: "#4ade80" },
          { label: "タンパク質", value: entry.totalProtein, unit: "g", color: "#f97316" },
          { label: "脂質", value: entry.totalFat, unit: "g", color: "#fbbf24" },
          { label: "炭水化物", value: entry.totalCarbs, unit: "g", color: "#60a5fa" },
        ].map(({ label, value, unit, color }) => (
          <div key={label} style={{ background: "#0e0e15", borderRadius: 8, padding: "6px 4px", textAlign: "center" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color }}>{value}<span style={{ fontSize: 9, color: "#555", fontWeight: 400 }}>{unit}</span></p>
            <p style={{ fontSize: 9, color: "#555" }}>{label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function FoodLog() {
  const [todayMeals, setTodayMeals] = useState<MealLogEntry[]>([]);

  useEffect(() => {
    const meals = getTodayMealLog();
    setTodayMeals(meals);
  }, []);

  const avgScore = todayMeals.length > 0
    ? Math.round(todayMeals.reduce((s, m) => s + m.healthScore, 0) / todayMeals.length)
    : 0;
  const totalBand = scoreBandStyle(avgScore);
  const totalLabel = getScoreBand(avgScore);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="stat-label mb-1">Daily Score</p>
          <h1 className="text-2xl lg:text-3xl font-bold">今日の食事スコア</h1>
        </motion.div>

        {todayMeals.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: "#111118", border: "1px solid #222", borderRadius: 16, padding: "48px 24px", textAlign: "center" }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              まだ食事が記録されていません
            </h2>
            <p style={{ fontSize: 12, color: "#555", marginBottom: 20, lineHeight: 1.7 }}>
              ホーム画面から食事を撮影して記録しましょう。
            </p>
            <Link href="/">
              <button style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#4ade80", color: "#000", border: "none",
                borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
                ホームへ戻る
              </button>
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Today's total score card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              style={{ background: "#111118", border: "1px solid #222", borderRadius: 16, padding: 20, marginBottom: 16 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ScoreRingSmall score={avgScore} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>
                    本日の平均スコア
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: totalBand.color }}>{avgScore}</span>
                    <span style={{ fontSize: 12, color: "#555" }}>/ 100</span>
                  </div>
                  <span style={{
                    display: "inline-block", fontSize: 11, fontWeight: 700,
                    background: totalBand.bg, border: `1px solid ${totalBand.border}`,
                    color: totalBand.color, borderRadius: 999, padding: "2px 10px",
                  }}>
                    {totalLabel.label}
                  </span>
                  <p style={{ fontSize: 11, color: "#666", marginTop: 6 }}>
                    {todayMeals.length}食記録済み
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Meal list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {todayMeals
                .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
                .map((entry) => (
                  <MealCard key={entry.id} entry={entry} />
                ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

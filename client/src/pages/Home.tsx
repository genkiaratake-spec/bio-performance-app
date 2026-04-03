import { motion } from "framer-motion";
import { Link } from "wouter";
import { Camera, Plus, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import {
  getTodayMealLog,
  getTodayNutritionSummary,
  getTodayAverageScore,
  MealLogEntry,
} from "../utils/mealLog";

// ── helpers ──────────────────────────────────────────────────────────────────
const dateStr = new Date().toLocaleDateString("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const MEAL_LABELS: Record<MealLogEntry["mealType"], { label: string; icon: string }> = {
  breakfast: { label: "朝食", icon: "🍳" },
  lunch:     { label: "昼食", icon: "🍱" },
  dinner:    { label: "夕食", icon: "🍽️" },
  snack:     { label: "間食", icon: "🍎" },
};

function ProgressBar({ value, max, color = "#4ade80", bg = "#1a1a22", height = 6 }: {
  value: number; max: number; color?: string; bg?: string; height?: number;
}) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ background: bg, borderRadius: 999, height, overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ background: color, height: "100%", borderRadius: 999 }}
      />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{ background: "#111118", border: "1px solid #222", borderRadius: 16, padding: "16px" }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10, fontWeight: 600 }}>
      {children}
    </p>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [todayLogs, setTodayLogs] = useState<MealLogEntry[]>([]);
  const [nutritionSummary, setNutritionSummary] = useState({
    totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, mealCount: 0,
  });
  const [todayScore, setTodayScore] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setTodayLogs(getTodayMealLog());
      setNutritionSummary(getTodayNutritionSummary());
      setTodayScore(getTodayAverageScore());
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  // userProfile からカロリー目標を取得
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const calorieGoal  = parseInt(userProfile.dailyCalories || "2000");
  const proteinGoal  = parseInt(userProfile.dailyProtein  || "150");
  const fatGoal      = parseInt(userProfile.dailyFat       || "65");
  const carbsGoal    = parseInt(userProfile.dailyCarbs     || "260");

  const { totalCalories, totalProtein, totalFat, totalCarbs } = nutritionSummary;
  const hasLogs = todayLogs.length > 0;
  const totalPfcG = totalProtein + totalFat + totalCarbs;

  return (
    <div style={{ height: "100vh", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#0a0a0f", color: "#fff", paddingBottom: 100 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 20px 16px" }}>
        <div>
          <p style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>{dateStr}</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>今日の食事</h1>
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "linear-gradient(135deg, #4ade80, #22c55e)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "#000",
        }}>
          G
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>

        {/* ── Diet Score Card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <Card>
            <SectionLabel>本日の食事スコア</SectionLabel>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 12 }}>
              {hasLogs && todayScore > 0 ? (
                <span style={{ fontSize: 52, fontWeight: 800, color: "#4ade80", lineHeight: 1 }}>{todayScore}</span>
              ) : (
                <span style={{ fontSize: 32, fontWeight: 700, color: "#4ade80", lineHeight: 1 }}>
                  {hasLogs ? "集計中..." : "---"}
                </span>
              )}
              <span style={{ fontSize: 16, color: "#555", marginBottom: 6 }}>/ 100</span>
            </div>
            <ProgressBar value={todayScore} max={100} color="#4ade80" height={8} />
            <p style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
              {!hasLogs
                ? "食事を記録するとスコアが表示されます"
                : "記録した食事のスコア平均"}
            </p>
          </Card>
        </motion.div>

        {/* ── Calories Card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.07 }}>
          <Card>
            <SectionLabel>総カロリー</SectionLabel>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  {totalCalories.toLocaleString()}
                </span>
                <span style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>/ {calorieGoal.toLocaleString()} kcal</span>
              </div>
              <span style={{
                fontSize: 13, fontWeight: 700, color: "#4ade80",
                background: "#4ade8015", borderRadius: 8, padding: "3px 8px",
              }}>
                {calorieGoal > 0 ? Math.round((totalCalories / calorieGoal) * 100) : 0}%
              </span>
            </div>
            <ProgressBar value={totalCalories} max={calorieGoal} color="#4ade80" height={8} />
            <p style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
              残り {Math.max(0, calorieGoal - totalCalories).toLocaleString()} kcal
            </p>
          </Card>
        </motion.div>

        {/* ── PFC Card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.14 }}>
          <Card>
            <SectionLabel>PFC摂取量</SectionLabel>
            {[
              { key: "protein", label: "タンパク質", g: totalProtein, goal: proteinGoal, color: "#4ade80" },
              { key: "fat",     label: "脂質",       g: totalFat,     goal: fatGoal,     color: "#fbbf24" },
              { key: "carbs",   label: "炭水化物",   g: totalCarbs,   goal: carbsGoal,   color: "#60a5fa" },
            ].map(({ key, label, g, goal, color }) => {
              const pct = goal > 0 ? Math.round((g / goal) * 100) : 0;
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                      <span style={{ fontSize: 12, color: "#aaa", fontWeight: 500 }}>{label}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{g}g</span>
                      <span style={{ fontSize: 11, color: "#555" }}>/ {goal}g</span>
                      <span style={{ fontSize: 11, color, fontWeight: 600, minWidth: 32, textAlign: "right" }}>{pct}%</span>
                    </div>
                  </div>
                  <ProgressBar value={g} max={goal} color={color} height={5} />
                </div>
              );
            })}

            {/* Composition bar */}
            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: 10, color: "#444", marginBottom: 5 }}>構成比</p>
              {totalPfcG > 0 ? (
                <>
                  <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 6 }}>
                    <div style={{ flex: totalProtein, background: "#4ade80" }} />
                    <div style={{ flex: totalFat,     background: "#fbbf24" }} />
                    <div style={{ flex: totalCarbs,   background: "#60a5fa" }} />
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    {[
                      { label: "P", color: "#4ade80", g: totalProtein },
                      { label: "F", color: "#fbbf24", g: totalFat     },
                      { label: "C", color: "#60a5fa", g: totalCarbs   },
                    ].map(({ label, color, g }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: color, display: "inline-block" }} />
                        <span style={{ fontSize: 10, color: "#666" }}>
                          {label} {Math.round((g / totalPfcG) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ height: 6, background: "#1a1a22", borderRadius: 4 }} />
              )}
            </div>
          </Card>
        </motion.div>

        {/* ── Meal Log Card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.21 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <SectionLabel>本日の食事記録</SectionLabel>
              {hasLogs && (
                <span style={{ fontSize: 10, color: "#555" }}>
                  {todayLogs.length}件
                </span>
              )}
            </div>

            {!hasLogs ? (
              /* 空状態 */
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>まだ食事が記録されていません</p>
                <p style={{ fontSize: 11, color: "#444" }}>「食事を撮影」から記録を始めましょう</p>
                <Link href="/food-scanner">
                  <button style={{
                    marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6,
                    background: "#4ade8018", border: "1px solid #4ade8040",
                    color: "#4ade80", borderRadius: 10, padding: "8px 16px",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>
                    <Camera style={{ width: 12, height: 12 }} />
                    食事を撮影する
                  </button>
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {todayLogs.map((log) => {
                  const meta = MEAL_LABELS[log.mealType] ?? { label: "食事", icon: "🍽️" };
                  const time = new Date(log.loggedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={log.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: "#0e0e15", borderRadius: 12, padding: "12px",
                      border: "1px solid #1e1e28",
                      marginBottom: 8,
                    }}>
                      {/* Icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: "#1a1a28",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22, flexShrink: 0, border: "1px solid #222",
                      }}>
                        {meta.icon}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{meta.label}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "#555" }}>
                            <Clock style={{ width: 9, height: 9 }} />{time}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {log.mealName}
                        </p>
                      </div>

                      {/* Right */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{log.totalCalories} kcal</p>
                        {log.healthScore > 0 && (
                          <p style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>
                            スコア {log.healthScore}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 追加ボタン */}
                <Link href="/food-scanner">
                  <button style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: "#4ade8010", border: "1px dashed #4ade8030",
                    color: "#4ade8088", borderRadius: 10, padding: "10px",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    marginTop: 4,
                  }}>
                    <Plus style={{ width: 12, height: 12 }} />
                    食事を追加
                  </button>
                </Link>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* ── Camera FAB ── */}
      <div style={{ position: "fixed", bottom: 84, right: 20, zIndex: 50 }}>
        <Link href="/food-scanner">
          <motion.button
            whileTap={{ scale: 0.93 }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#4ade80", color: "#000",
              border: "none", borderRadius: 999,
              padding: "13px 20px", fontSize: 13, fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 24px #4ade8060",
              whiteSpace: "nowrap",
            }}
          >
            <Camera style={{ width: 16, height: 16 }} />
            食事を撮影
          </motion.button>
        </Link>
      </div>
    </div>
  );
}

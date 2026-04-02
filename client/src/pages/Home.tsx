import { motion } from "framer-motion";
import { Link } from "wouter";
import { Camera, Plus, Clock } from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
const now = new Date();
const dateStr = now.toLocaleDateString("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

function ProgressBar({ value, max, color = "#4ade80", bg = "#1a1a22", height = 6 }: {
  value: number; max: number; color?: string; bg?: string; height?: number;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
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

// ── data ─────────────────────────────────────────────────────────────────────
const calories = { current: 1480, goal: 2100 };
const pfc = {
  protein:  { g: 98,  goal: 150, color: "#4ade80" },
  fat:      { g: 52,  goal: 70,  color: "#fbbf24" },
  carbs:    { g: 184, goal: 260, color: "#60a5fa" },
};
const totalPfcG = pfc.protein.g + pfc.fat.g + pfc.carbs.g;

const meals = [
  {
    id: "breakfast",
    label: "朝食",
    time: "07:30",
    calories: 520,
    score: 82,
    recorded: true,
    emoji: "🍳",
    desc: "オートミール・ゆで卵・バナナ",
  },
  {
    id: "lunch",
    label: "昼食",
    time: "12:15",
    calories: 680,
    score: 74,
    recorded: true,
    emoji: "🍱",
    desc: "鶏むね肉定食・味噌汁・玄米",
  },
  {
    id: "dinner",
    label: "夕食",
    time: null,
    calories: null,
    score: null,
    recorded: false,
    emoji: null,
    desc: null,
  },
];

const dietScore = 78; // 夕食未記録なので暫定
const scoreRecorded = meals.every((m) => m.recorded);

// ── components ───────────────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: "#111118",
        border: "1px solid #222",
        borderRadius: 16,
        padding: "16px",
      }}
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
              {scoreRecorded ? (
                <span style={{ fontSize: 52, fontWeight: 800, color: "#4ade80", lineHeight: 1 }}>{dietScore}</span>
              ) : (
                <span style={{ fontSize: 32, fontWeight: 700, color: "#4ade80", lineHeight: 1 }}>集計中...</span>
              )}
              <span style={{ fontSize: 16, color: "#555", marginBottom: 6 }}>/ 100</span>
            </div>
            <ProgressBar value={dietScore} max={100} color="#4ade80" height={8} />
            {!scoreRecorded && (
              <p style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
                夕食を記録すると最終スコアが確定します
              </p>
            )}
          </Card>
        </motion.div>

        {/* ── Calories Card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.07 }}>
          <Card>
            <SectionLabel>総カロリー</SectionLabel>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  {calories.current.toLocaleString()}
                </span>
                <span style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>/ {calories.goal.toLocaleString()} kcal</span>
              </div>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: "#4ade80",
                background: "#4ade8015",
                borderRadius: 8, padding: "3px 8px",
              }}>
                {Math.round((calories.current / calories.goal) * 100)}%
              </span>
            </div>
            <ProgressBar value={calories.current} max={calories.goal} color="#4ade80" height={8} />
            <p style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
              残り {(calories.goal - calories.current).toLocaleString()} kcal
            </p>
          </Card>
        </motion.div>

        {/* ── PFC Card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.14 }}>
          <Card>
            <SectionLabel>PFC摂取量</SectionLabel>

            {/* Rows */}
            {[
              { key: "protein", label: "タンパク質", ...pfc.protein },
              { key: "fat",     label: "脂質",       ...pfc.fat     },
              { key: "carbs",   label: "炭水化物",   ...pfc.carbs   },
            ].map(({ key, label, g, goal, color }) => {
              const pct = Math.round((g / goal) * 100);
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
              <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 6 }}>
                <div style={{ flex: pfc.protein.g, background: "#4ade80" }} />
                <div style={{ flex: pfc.fat.g,     background: "#fbbf24" }} />
                <div style={{ flex: pfc.carbs.g,   background: "#60a5fa" }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                {[
                  { label: "P", color: "#4ade80", g: pfc.protein.g },
                  { label: "F", color: "#fbbf24", g: pfc.fat.g     },
                  { label: "C", color: "#60a5fa", g: pfc.carbs.g   },
                ].map(({ label, color, g }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: color, display: "inline-block" }} />
                    <span style={{ fontSize: 10, color: "#666" }}>
                      {label} {Math.round((g / totalPfcG) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Meal Log Card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.21 }}>
          <Card>
            <SectionLabel>本日の食事記録</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {meals.map((meal) => (
                <div key={meal.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "#0e0e15", borderRadius: 12, padding: "12px",
                  border: "1px solid #1e1e28",
                }}>
                  {/* Thumbnail / emoji */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: meal.recorded ? "#1a1a28" : "#111",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, flexShrink: 0,
                    border: "1px solid #222",
                  }}>
                    {meal.recorded ? meal.emoji : <span style={{ color: "#333", fontSize: 18 }}>?</span>}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{meal.label}</span>
                      {meal.recorded && meal.time && (
                        <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "#555" }}>
                          <Clock style={{ width: 9, height: 9 }} />{meal.time}
                        </span>
                      )}
                    </div>
                    {meal.recorded ? (
                      <p style={{ fontSize: 11, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {meal.desc}
                      </p>
                    ) : (
                      <p style={{ fontSize: 11, color: "#444" }}>未記録</p>
                    )}
                  </div>

                  {/* Right side */}
                  {meal.recorded ? (
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{meal.calories} kcal</p>
                      <p style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>
                        スコア {meal.score}
                      </p>
                    </div>
                  ) : (
                    <Link href="/food-scanner">
                      <button style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "#4ade8018", border: "1px solid #4ade8040",
                        color: "#4ade80", borderRadius: 8, padding: "6px 12px",
                        fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0,
                      }}>
                        <Plus style={{ width: 12, height: 12 }} />
                        追加
                      </button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
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

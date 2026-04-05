import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Camera, Plus, Clock } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  getTodayMealLog,
  getTodayNutritionSummary,
  getTodayAverageScore,
  MealLogEntry,
} from "../utils/mealLog";
import BarcodeScanner from "../components/BarcodeScanner";

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

const API_BASE =
  window.location.protocol === "capacitor:"
    ? "https://bio-performance-app.vercel.app"
    : "";

function guessMealType(): "breakfast" | "lunch" | "dinner" | "snack" {
  const h = new Date().getHours();
  if (h >= 6  && h < 10) return "breakfast";
  if (h >= 11 && h < 14) return "lunch";
  if (h >= 17 && h < 21) return "dinner";
  return "snack";
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

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

// ── Barcode Icon SVG ──────────────────────────────────────────────────────────
function BarcodeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v3M3 16v3M8 5v14M12 5v14M16 5v14M21 5v3M21 16v3" />
    </svg>
  );
}

// ── Types for barcode result ──────────────────────────────────────────────────
interface BarcodeProduct {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sodium?: number;
  image_url?: string;
}

interface BarcodeResult {
  found: boolean;
  product?: BarcodeProduct;
  aiAdvice?: string;
  warning?: string;
  barcode?: string;
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [todayLogs, setTodayLogs] = useState<MealLogEntry[]>([]);
  const [nutritionSummary, setNutritionSummary] = useState({
    totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, mealCount: 0,
  });
  const [todayScore, setTodayScore] = useState(0);

  // Barcode states
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeResult | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  const refresh = useCallback(() => {
    setTodayLogs(getTodayMealLog());
    setNutritionSummary(getTodayNutritionSummary());
    setTodayScore(getTodayAverageScore());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  // userProfile からカロリー目標を取得
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const calorieGoal  = parseInt(userProfile.dailyCalories || "2000");
  const proteinGoal  = parseInt(userProfile.dailyProtein  || "150");
  const fatGoal      = parseInt(userProfile.dailyFat       || "65");
  const carbsGoal    = parseInt(userProfile.dailyCarbs     || "260");

  const { totalCalories, totalProtein, totalFat, totalCarbs } = nutritionSummary;
  const hasLogs = todayLogs.length > 0;
  const totalPfcG = totalProtein + totalFat + totalCarbs;

  // ── Barcode handlers ────────────────────────────────────────────────────
  const handleBarcodeDetected = async (barcode: string) => {
    setShowScanner(false);
    setScanLoading(true);
    setBarcodeResult(null);

    try {
      const bloodTestRaw = localStorage.getItem("bloodTestResults");
      const bloodTestResults = bloodTestRaw ? JSON.parse(bloodTestRaw) : undefined;

      const res = await fetch(`${API_BASE}/api/lookup-barcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, bloodTestResults }),
      });

      const data = await res.json();
      setBarcodeResult({ ...data, barcode });
    } catch (e) {
      setBarcodeResult({ found: false, barcode });
    } finally {
      setScanLoading(false);
    }
  };

  const handleSaveBarcodeToLog = () => {
    if (!barcodeResult?.product) return;
    const p = barcodeResult.product;
    const today = todayStr();
    const mealType = guessMealType();

    // Build new meal entry
    const newMeal = {
      id: crypto.randomUUID(),
      time: mealType,
      name: p.name,
      calories: p.calories,
      protein: p.protein,
      fat: p.fat,
      carbs: p.carbs,
      source: "barcode" as const,
      barcode: barcodeResult.barcode,
      recordedAt: new Date().toISOString(),
    };

    // Update foodLogs
    const raw = localStorage.getItem("foodLogs");
    const foodLogs: any[] = raw ? JSON.parse(raw) : [];
    const dayIdx = foodLogs.findIndex((d: any) => d.date === today);
    if (dayIdx >= 0) {
      foodLogs[dayIdx].meals = [...(foodLogs[dayIdx].meals || []), newMeal];
      foodLogs[dayIdx].totalCalories = (foodLogs[dayIdx].totalCalories || 0) + p.calories;
      foodLogs[dayIdx].protein       = (foodLogs[dayIdx].protein       || 0) + p.protein;
      foodLogs[dayIdx].fat           = (foodLogs[dayIdx].fat           || 0) + p.fat;
      foodLogs[dayIdx].carbs         = (foodLogs[dayIdx].carbs         || 0) + p.carbs;
    } else {
      foodLogs.push({
        date: today,
        totalCalories: p.calories,
        protein: p.protein,
        fat: p.fat,
        carbs: p.carbs,
        meals: [newMeal],
        score: 0,
      });
    }
    localStorage.setItem("foodLogs", JSON.stringify(foodLogs));

    // Also update mealLog (for Home stats)
    const mealLogRaw = localStorage.getItem("mealLog");
    const mealLog: any[] = mealLogRaw ? JSON.parse(mealLogRaw) : [];
    mealLog.push({
      id: newMeal.id,
      date: today,
      mealType,
      mealName: p.name,
      totalCalories: p.calories,
      totalProtein: p.protein,
      totalFat: p.fat,
      totalCarbs: p.carbs,
      healthScore: 0,
      loggedAt: newMeal.recordedAt,
    });
    localStorage.setItem("mealLog", JSON.stringify(mealLog));

    setBarcodeResult(null);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
    refresh();
  };

  return (
    <div style={{ height: "100vh", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#0a0a0f", color: "#fff", paddingBottom: 100 }}>

      {/* ── Barcode Scanner overlay ── */}
      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner
            onDetected={handleBarcodeDetected}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Scan loading overlay ── */}
      <AnimatePresence>
        {scanLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "rgba(0,0,0,0.75)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "3px solid #4ade8040",
              borderTopColor: "#4ade80",
              animation: "spin 0.8s linear infinite",
            }} />
            <p style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>商品を検索中...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Barcode result modal ── */}
      <AnimatePresence>
        {barcodeResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "rgba(0,0,0,0.8)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}
            onClick={() => setBarcodeResult(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 480,
                background: "#111118",
                borderRadius: "20px 20px 0 0",
                padding: "24px 20px 40px",
                maxHeight: "85vh", overflowY: "auto",
              }}
            >
              {/* Handle */}
              <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />

              {!barcodeResult.found ? (
                /* Not found */
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                    商品が見つかりませんでした
                  </p>
                  <p style={{ fontSize: 13, color: "#777", marginBottom: 24 }}>
                    バーコード: {barcodeResult.barcode}<br />
                    手動で入力しますか？
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => setBarcodeResult(null)}
                      style={{
                        flex: 1, padding: "12px", borderRadius: 12,
                        background: "#1e1e28", border: "1px solid #333",
                        color: "#aaa", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      閉じる
                    </button>
                    <button
                      onClick={() => { setBarcodeResult(null); setShowScanner(true); }}
                      style={{
                        flex: 1, padding: "12px", borderRadius: 12,
                        background: "#4ade8020", border: "1px solid #4ade8050",
                        color: "#4ade80", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      再スキャン
                    </button>
                  </div>
                </div>
              ) : (
                /* Found */
                <>
                  {/* Product image */}
                  {barcodeResult.product?.image_url && (
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                      <img
                        src={barcodeResult.product.image_url}
                        alt={barcodeResult.product?.name}
                        style={{
                          maxHeight: 120, maxWidth: "100%",
                          objectFit: "contain", borderRadius: 12,
                          border: "1px solid #222",
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}

                  {/* Product name */}
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4, lineHeight: 1.3 }}>
                    {barcodeResult.product?.name}
                  </p>
                  {barcodeResult.product?.brand && (
                    <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
                      {barcodeResult.product.brand}
                    </p>
                  )}

                  {/* Nutrition grid (per 100g) */}
                  <div style={{
                    background: "#0e0e15", borderRadius: 12, padding: 14,
                    marginBottom: 16, border: "1px solid #1e1e28",
                  }}>
                    <p style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600, textTransform: "uppercase" }}>
                      100g 当たりの栄養成分
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: "カロリー", value: `${barcodeResult.product?.calories ?? 0} kcal`, color: "#fff" },
                        { label: "タンパク質", value: `${barcodeResult.product?.protein ?? 0} g`, color: "#4ade80" },
                        { label: "脂質", value: `${barcodeResult.product?.fat ?? 0} g`, color: "#fbbf24" },
                        { label: "炭水化物", value: `${barcodeResult.product?.carbs ?? 0} g`, color: "#60a5fa" },
                        ...(barcodeResult.product?.fiber != null ? [{ label: "食物繊維", value: `${barcodeResult.product.fiber} g`, color: "#a78bfa" }] : []),
                        ...(barcodeResult.product?.sodium != null ? [{ label: "食塩相当量", value: `${barcodeResult.product.sodium} mg`, color: "#f87171" }] : []),
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <p style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Advice */}
                  {barcodeResult.aiAdvice && (
                    <div style={{
                      background: "#0f2018", border: "1px solid #4ade8030",
                      borderRadius: 12, padding: 14, marginBottom: 12,
                    }}>
                      <p style={{ fontSize: 10, color: "#4ade80", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>
                        AIアドバイス
                      </p>
                      <p style={{ fontSize: 13, color: "#ddd", lineHeight: 1.65 }}>{barcodeResult.aiAdvice}</p>
                    </div>
                  )}

                  {/* Warning */}
                  {barcodeResult.warning && (
                    <div style={{
                      background: "#1f1800", border: "1px solid #fbbf2430",
                      borderRadius: 12, padding: 14, marginBottom: 16,
                    }}>
                      <p style={{ fontSize: 10, color: "#fbbf24", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>
                        注意点
                      </p>
                      <p style={{ fontSize: 13, color: "#ddd", lineHeight: 1.65 }}>{barcodeResult.warning}</p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button
                      onClick={() => setBarcodeResult(null)}
                      style={{
                        flex: 1, padding: "13px", borderRadius: 12,
                        background: "#1e1e28", border: "1px solid #333",
                        color: "#aaa", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      閉じる
                    </button>
                    <button
                      onClick={handleSaveBarcodeToLog}
                      style={{
                        flex: 2, padding: "13px", borderRadius: 12,
                        background: "#4ade80", border: "none",
                        color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      食事に記録する
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save toast ── */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
              zIndex: 9999, background: "#4ade80", color: "#000",
              padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              boxShadow: "0 4px 20px rgba(74,222,128,0.4)",
            }}
          >
            ✓ 食事ログに追加しました
          </motion.div>
        )}
      </AnimatePresence>

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
                <p style={{ fontSize: 11, color: "#444", marginBottom: 16 }}>「食事を撮影」または「バーコード」から記録を始めましょう</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <Link href="/food-scanner">
                    <button style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "#4ade8018", border: "1px solid #4ade8040",
                      color: "#4ade80", borderRadius: 10, padding: "8px 14px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>
                      <Camera style={{ width: 12, height: 12 }} />
                      食事を撮影
                    </button>
                  </Link>
                  <button
                    onClick={() => setShowScanner(true)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "#60a5fa18", border: "1px solid #60a5fa40",
                      color: "#60a5fa", borderRadius: 10, padding: "8px 14px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    <BarcodeIcon size={12} />
                    バーコード
                  </button>
                </div>
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

      {/* ── FABs ── */}
      <div style={{
        position: "fixed", bottom: 84, right: 20, zIndex: 50,
        display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end",
      }}>
        {/* Barcode FAB */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setShowScanner(true)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "#1e2a3a", color: "#60a5fa",
            border: "1px solid #60a5fa40", borderRadius: 999,
            padding: "11px 18px", fontSize: 12, fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 0 18px #60a5fa25",
            whiteSpace: "nowrap",
          }}
        >
          <BarcodeIcon size={15} />
          バーコード
        </motion.button>

        {/* Camera FAB */}
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

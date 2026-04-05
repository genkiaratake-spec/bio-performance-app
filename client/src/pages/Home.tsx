import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Camera, Clock } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  getTodayMealLog,
  getTodayNutritionSummary,
  getTodayAverageScore,
  addMealLog,
  MealLogEntry,
} from "../utils/mealLog";
import BarcodeScanner from "../components/BarcodeScanner";
import ManualFoodEntry, { MealEntry } from "../components/ManualFoodEntry";

// ── helpers ──────────────────────────────────────────────────────────────────
const dateStr = new Date().toLocaleDateString("ja-JP", {
  year: "numeric", month: "long", day: "numeric", weekday: "long",
});

const API_BASE =
  window.location.protocol === "capacitor:"
    ? "https://bio-performance-app.vercel.app"
    : "";

const MEAL_LABELS: Record<MealLogEntry["mealType"], { label: string }> = {
  breakfast: { label: "朝食" },
  lunch:     { label: "昼食" },
  dinner:    { label: "夕食" },
  snack:     { label: "間食" },
};

const MEAL_PILL_COLORS: Record<MealLogEntry["mealType"], { bg: string; text: string }> = {
  breakfast: { bg: "#ff993320", text: "#ff9933" },
  lunch:     { bg: "#4ade8020", text: "#4ade80" },
  dinner:    { bg: "#a78bfa20", text: "#a78bfa" },
  snack:     { bg: "#fbbf2420", text: "#fbbf24" },
};

const SOURCE_ICONS: Record<string, string> = {
  photo:   "📷",
  barcode: "🔲",
  manual:  "✏️",
};

function guessMealType(): MealLogEntry["mealType"] {
  const h = new Date().getHours();
  if (h >= 6  && h < 10) return "breakfast";
  if (h >= 11 && h < 14) return "lunch";
  if (h >= 17 && h < 21) return "dinner";
  return "snack";
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── sub components ────────────────────────────────────────────────────────────
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #222", borderRadius: 16, padding: "16px" }}>
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

function BarcodeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v3M3 16v3M8 5v14M12 5v14M16 5v14M21 5v3M21 16v3" />
    </svg>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [todayLogs, setTodayLogs]   = useState<MealLogEntry[]>([]);
  const [nutrition, setNutrition]   = useState({ totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, mealCount: 0 });
  const [todayScore, setTodayScore] = useState(0);

  // UI state
  const [showScanner,      setShowScanner]      = useState(false);
  const [showManualEntry,  setShowManualEntry]  = useState(false);
  const [scanLoading,      setScanLoading]      = useState(false);
  const [barcodeResult,    setBarcodeResult]    = useState<BarcodeResultState | null>(null);
  const [toast,            setToast]            = useState<string | null>(null);

  // ── data refresh ────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    setTodayLogs(getTodayMealLog());
    setNutrition(getTodayNutritionSummary());
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

  const userProfile  = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const calorieGoal  = parseInt(userProfile.dailyCalories || "2000");
  const proteinGoal  = parseInt(userProfile.dailyProtein  || "150");
  const fatGoal      = parseInt(userProfile.dailyFat      || "65");
  const carbsGoal    = parseInt(userProfile.dailyCarbs    || "260");

  const { totalCalories, totalProtein, totalFat, totalCarbs } = nutrition;
  const hasLogs  = todayLogs.length > 0;
  const totalPfcG = totalProtein + totalFat + totalCarbs;

  // ── toast helper ─────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // ── manual entry save ────────────────────────────────────────────────────
  const handleManualSave = (meal: MealEntry) => {
    addMealLog({
      mealType:      meal.time,
      mealName:      meal.name,
      totalCalories: meal.calories,
      totalProtein:  meal.protein,
      totalFat:      meal.fat,
      totalCarbs:    meal.carbs,
      healthScore:   0,
      source:        'manual',
      fiber:         meal.fiber,
      sodium:        meal.sodium,
      note:          meal.note,
    });
    setShowManualEntry(false);
    showToast("✓ 食事を記録しました");
    refresh();
  };

  // ── barcode scan ─────────────────────────────────────────────────────────
  const handleBarcodeDetected = async (barcode: string) => {
    setShowScanner(false);
    setScanLoading(true);
    setBarcodeResult(null);
    try {
      const bloodTestRaw = localStorage.getItem("bloodTestResults");
      const bloodTestResults = bloodTestRaw ? JSON.parse(bloodTestRaw) : undefined;
      const res  = await fetch(`${API_BASE}/api/lookup-barcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, bloodTestResults }),
      });
      const data = await res.json();
      setBarcodeResult({ ...data, barcode });
    } catch {
      setBarcodeResult({ found: false, barcode });
    } finally {
      setScanLoading(false);
    }
  };

  const handleSaveBarcodeToLog = () => {
    if (!barcodeResult?.product) return;
    const p = barcodeResult.product;
    addMealLog({
      mealType:      guessMealType(),
      mealName:      p.name,
      totalCalories: p.calories,
      totalProtein:  p.protein,
      totalFat:      p.fat,
      totalCarbs:    p.carbs,
      healthScore:   0,
      source:        'barcode',
      barcode:       barcodeResult.barcode,
      fiber:         p.fiber,
      sodium:        p.sodium,
    });
    setBarcodeResult(null);
    showToast("✓ 食事ログに追加しました");
    refresh();
  };

  return (
    <div style={{ height: "100vh", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#0a0a0f", color: "#fff", paddingBottom: 100 }}>

      {/* ── Overlays ── */}
      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showManualEntry && (
          <ManualFoodEntry onSave={handleManualSave} onClose={() => setShowManualEntry(false)} />
        )}
      </AnimatePresence>

      {/* Scan loading */}
      <AnimatePresence>
        {scanLoading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "rgba(0,0,0,0.75)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "3px solid #4ade8040", borderTopColor: "#4ade80",
              animation: "spin 0.8s linear infinite",
            }} />
            <p style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>商品を検索中...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barcode result modal */}
      <AnimatePresence>
        {barcodeResult && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "rgba(0,0,0,0.8)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}
            onClick={() => setBarcodeResult(null)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 480,
                background: "#111118", borderRadius: "20px 20px 0 0",
                padding: "24px 20px 40px",
                maxHeight: "85vh", overflowY: "auto",
              }}
            >
              <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />

              {!barcodeResult.found ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>商品が見つかりませんでした</p>
                  <p style={{ fontSize: 13, color: "#777", marginBottom: 24 }}>
                    バーコード: {barcodeResult.barcode}<br />手動で入力しますか？
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setBarcodeResult(null)} style={secondaryBtnStyle}>閉じる</button>
                    <button
                      onClick={() => { setBarcodeResult(null); setShowScanner(true); }}
                      style={outlineBtnStyle}
                    >
                      再スキャン
                    </button>
                    <button
                      onClick={() => { setBarcodeResult(null); setShowManualEntry(true); }}
                      style={outlineBtnStyle}
                    >
                      手入力
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {barcodeResult.product?.image_url && (
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                      <img
                        src={barcodeResult.product.image_url}
                        alt={barcodeResult.product.name}
                        style={{ maxHeight: 120, maxWidth: "100%", objectFit: "contain", borderRadius: 12, border: "1px solid #222" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4, lineHeight: 1.3 }}>
                    {barcodeResult.product?.name}
                  </p>
                  {barcodeResult.product?.brand && (
                    <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>{barcodeResult.product.brand}</p>
                  )}

                  {/* Nutrition grid */}
                  <div style={{ background: "#0e0e15", borderRadius: 12, padding: 14, marginBottom: 16, border: "1px solid #1e1e28" }}>
                    <p style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600, textTransform: "uppercase" }}>
                      100g 当たりの栄養成分
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: "カロリー",   value: `${barcodeResult.product?.calories ?? 0} kcal`, color: "#fff" },
                        { label: "タンパク質", value: `${barcodeResult.product?.protein  ?? 0} g`,    color: "#4ade80" },
                        { label: "脂質",       value: `${barcodeResult.product?.fat      ?? 0} g`,    color: "#fbbf24" },
                        { label: "炭水化物",   value: `${barcodeResult.product?.carbs    ?? 0} g`,    color: "#60a5fa" },
                        ...(barcodeResult.product?.fiber  != null ? [{ label: "食物繊維",   value: `${barcodeResult.product.fiber} g`,   color: "#a78bfa" }] : []),
                        ...(barcodeResult.product?.sodium != null ? [{ label: "食塩相当量", value: `${barcodeResult.product.sodium} mg`, color: "#f87171" }] : []),
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <p style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {barcodeResult.aiAdvice && (
                    <div style={{ background: "#0f2018", border: "1px solid #4ade8030", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                      <p style={{ fontSize: 10, color: "#4ade80", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>AIアドバイス</p>
                      <p style={{ fontSize: 13, color: "#ddd", lineHeight: 1.65 }}>{barcodeResult.aiAdvice}</p>
                    </div>
                  )}
                  {barcodeResult.warning && (
                    <div style={{ background: "#1f1800", border: "1px solid #fbbf2430", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                      <p style={{ fontSize: 10, color: "#fbbf24", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>注意点</p>
                      <p style={{ fontSize: 13, color: "#ddd", lineHeight: 1.65 }}>{barcodeResult.warning}</p>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button onClick={() => setBarcodeResult(null)} style={secondaryBtnStyle}>閉じる</button>
                    <button onClick={handleSaveBarcodeToLog} style={primaryBtnStyle}>食事に記録する</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            style={{
              position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
              zIndex: 9999, background: "#4ade80", color: "#000",
              padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              boxShadow: "0 4px 20px rgba(74,222,128,0.4)", whiteSpace: "nowrap",
            }}
          >
            {toast}
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

        {/* ── Diet Score ── */}
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
              {!hasLogs ? "食事を記録するとスコアが表示されます" : "記録した食事のスコア平均"}
            </p>
          </Card>
        </motion.div>

        {/* ── Calories ── */}
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
              <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", background: "#4ade8015", borderRadius: 8, padding: "3px 8px" }}>
                {calorieGoal > 0 ? Math.round((totalCalories / calorieGoal) * 100) : 0}%
              </span>
            </div>
            <ProgressBar value={totalCalories} max={calorieGoal} color="#4ade80" height={8} />
            <p style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
              残り {Math.max(0, calorieGoal - totalCalories).toLocaleString()} kcal
            </p>
          </Card>
        </motion.div>

        {/* ── PFC ── */}
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
                      { label: "F", color: "#fbbf24", g: totalFat },
                      { label: "C", color: "#60a5fa", g: totalCarbs },
                    ].map(({ label, color, g }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: color, display: "inline-block" }} />
                        <span style={{ fontSize: 10, color: "#666" }}>{label} {Math.round((g / totalPfcG) * 100)}%</span>
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

        {/* ── Meal Log ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.21 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <SectionLabel>本日の食事記録</SectionLabel>
              {hasLogs && <span style={{ fontSize: 10, color: "#555" }}>{todayLogs.length}件</span>}
            </div>

            {!hasLogs ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>まだ食事が記録されていません</p>
                <p style={{ fontSize: 11, color: "#444", marginBottom: 16 }}>下のボタンから記録を始めましょう</p>
                {/* 空状態のクイックボタン */}
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/food-scanner">
                    <button style={quickBtnStyle("#4ade80")}>
                      <Camera style={{ width: 12, height: 12 }} /> 食事を撮影
                    </button>
                  </Link>
                  <button onClick={() => setShowScanner(true)} style={quickBtnStyle("#60a5fa")}>
                    <BarcodeIcon size={12} /> バーコード
                  </button>
                  <button onClick={() => setShowManualEntry(true)} style={quickBtnStyle("#a78bfa")}>
                    ✏️ 手入力
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todayLogs.map((log) => {
                  const pill  = MEAL_PILL_COLORS[log.mealType];
                  const label = MEAL_LABELS[log.mealType]?.label ?? "食事";
                  const icon  = SOURCE_ICONS[log.source ?? "photo"] ?? "🍽️";
                  const time  = new Date(log.loggedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div key={log.id} style={{
                      background: "#0e0e15", borderRadius: 12, padding: "12px",
                      border: "1px solid #1e1e28",
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        {/* Icon */}
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: "#1a1a28", border: "1px solid #222",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18, flexShrink: 0,
                        }}>
                          {icon}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {/* timing pill */}
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
                                background: pill.bg, color: pill.text,
                              }}>
                                {label}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "#555" }}>
                                <Clock style={{ width: 9, height: 9 }} />{time}
                              </span>
                            </div>
                            {/* calories */}
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                              {log.totalCalories} kcal
                            </span>
                          </div>

                          {/* meal name */}
                          <p style={{ fontSize: 12, color: "#ccc", fontWeight: 500, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {log.mealName}
                          </p>

                          {/* PFC row */}
                          <div style={{ display: "flex", gap: 10 }}>
                            {[
                              { label: "P", value: log.totalProtein, color: "#4ade80" },
                              { label: "F", value: log.totalFat,     color: "#fbbf24" },
                              { label: "C", value: log.totalCarbs,   color: "#60a5fa" },
                            ].map(({ label, value, color }) => (
                              <span key={label} style={{ fontSize: 10, color: "#666" }}>
                                <span style={{ color, fontWeight: 600 }}>{label}</span>: {value}g
                              </span>
                            ))}
                            {log.healthScore > 0 && (
                              <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 600, marginLeft: "auto" }}>
                                スコア {log.healthScore}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* ── FABs (3ボタン横並び) ── */}
      <div style={{
        position: "fixed", bottom: 84, left: 16, right: 16, zIndex: 50,
        display: "flex", gap: 8,
      }}>
        {/* 食事を撮影 */}
        <Link href="/food-scanner" style={{ flex: 2 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              background: "#4ade80", color: "#000",
              border: "none", borderRadius: 14,
              padding: "13px 0", fontSize: 13, fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 20px #4ade8050",
            }}
          >
            <Camera style={{ width: 15, height: 15 }} />
            食事を撮影
          </motion.button>
        </Link>

        {/* バーコード */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowScanner(true)}
          style={{
            flex: 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: "#1e2a3a", color: "#60a5fa",
            border: "1px solid #60a5fa40", borderRadius: 14,
            padding: "13px 0", fontSize: 12, fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <BarcodeIcon size={14} />
          バーコード
        </motion.button>

        {/* 手入力 */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowManualEntry(true)}
          style={{
            flex: 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: "#1e1a2a", color: "#a78bfa",
            border: "1px solid #a78bfa40", borderRadius: 14,
            padding: "13px 0", fontSize: 12, fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✏️ 手入力
        </motion.button>
      </div>
    </div>
  );
}

// ── button style helpers ──────────────────────────────────────────────────────
const primaryBtnStyle: React.CSSProperties = {
  flex: 2, padding: "13px", borderRadius: 12,
  background: "#4ade80", border: "none",
  color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1, padding: "13px", borderRadius: 12,
  background: "#1e1e28", border: "1px solid #333",
  color: "#aaa", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const outlineBtnStyle: React.CSSProperties = {
  flex: 1, padding: "13px", borderRadius: 12,
  background: "#4ade8015", border: "1px solid #4ade8040",
  color: "#4ade80", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

function quickBtnStyle(color: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: `${color}18`, border: `1px solid ${color}40`,
    color, borderRadius: 10, padding: "7px 12px",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
  };
}

// ── Barcode result state type ────────────────────────────────────────────────
interface BarcodeResultState {
  found: boolean;
  barcode?: string;
  product?: {
    name: string; brand: string; calories: number;
    protein: number; fat: number; carbs: number;
    fiber?: number; sodium?: number; image_url?: string;
  };
  aiAdvice?: string;
  warning?: string;
}

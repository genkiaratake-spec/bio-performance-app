import { motion, AnimatePresence } from "framer-motion";
import { Camera, Clock } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  getTodayMealLog,
  getTodayNutritionSummary,
  getTodayAverageScore,
  addMealLog,
  deleteMealLog,
  MealLogEntry,
} from "../utils/mealLog";
import BarcodeScanner from "../components/BarcodeScanner";
import ManualFoodEntry, { MealEntry } from "../components/ManualFoodEntry";
import { getScoreColor, getScoreLabel } from "../utils/scoreColor";

// ── constants ─────────────────────────────────────────────────────────────────
const dateStr = new Date().toLocaleDateString("ja-JP", {
  year: "numeric", month: "long", day: "numeric", weekday: "long",
});

const API_BASE =
  window.location.protocol === "capacitor:"
    ? "https://bio-performance-app.vercel.app"
    : "";

const MEAL_LABELS: Record<MealLogEntry["mealType"], string> = {
  breakfast: "朝食", lunch: "昼食", dinner: "夕食", snack: "間食",
};

const MEAL_PILL: Record<MealLogEntry["mealType"], { bg: string; text: string }> = {
  breakfast: { bg: "#ff993320", text: "#ff9933" },
  lunch:     { bg: "#4ade8020", text: "#4ade80" },
  dinner:    { bg: "#a78bfa20", text: "#a78bfa" },
  snack:     { bg: "#fbbf2420", text: "#fbbf24" },
};

const SOURCE_ICON: Record<string, string> = {
  photo: "📷", barcode: "🔲", manual: "✏️",
};

function guessMealType(): MealLogEntry["mealType"] {
  const h = new Date().getHours();
  if (h >= 6  && h < 10) return "breakfast";
  if (h >= 11 && h < 14) return "lunch";
  if (h >= 17 && h < 21) return "dinner";
  return "snack";
}

// ── sub-components ────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = "#4ade80", height = 6 }: {
  value: number; max: number; color?: string; height?: number;
}) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ background: "#1a1a22", borderRadius: 999, height, overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ background: color, height: "100%", borderRadius: 999 }}
      />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #222", borderRadius: 16, padding: 16 }}>
      {children}
    </div>
  );
}

function SLabel({ children }: { children: React.ReactNode }) {
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

// ── types ─────────────────────────────────────────────────────────────────────
interface FoodItem { name: string; amount: string; calories: number; protein: number; fat: number; carbs: number; }
interface PhotoResult {
  mealName: string; items: FoodItem[];
  totalCalories: number; totalProtein: number; totalFat: number; totalCarbs: number;
  healthScore: number; advice: string;
}
interface BarcodeResultState {
  found: boolean; barcode?: string;
  product?: { name: string; brand: string; calories: number; protein: number; fat: number; carbs: number; fiber?: number; sodium?: number; image_url?: string; };
  aiAdvice?: string; warning?: string;
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [, navigate]   = useLocation();
  const photoInputRef  = useRef<HTMLInputElement>(null);

  // data
  const [todayLogs,  setTodayLogs]  = useState<MealLogEntry[]>([]);
  const [nutrition,  setNutrition]  = useState({ totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, mealCount: 0 });
  const [todayScore, setTodayScore] = useState(0);

  // modals
  const [showScanner,     setShowScanner]     = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // photo analysis
  const [photoLoading,   setPhotoLoading]   = useState(false);
  const [photoResult,    setPhotoResult]    = useState<PhotoResult | null>(null);
  const [photoPreview,   setPhotoPreview]   = useState<string | null>(null);
  const [photoError,     setPhotoError]     = useState<string | null>(null);

  // barcode
  const [scanLoading,    setScanLoading]    = useState(false);
  const [barcodeResult,  setBarcodeResult]  = useState<BarcodeResultState | null>(null);
  const [barcodeGrams,   setBarcodeGrams]   = useState<number>(100);

  // toast
  const [toast, setToast] = useState<string | null>(null);

  // ── data ──────────────────────────────────────────────────────────────
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

  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const calorieGoal = parseInt(userProfile.dailyCalories || "2000");
  const proteinGoal = parseInt(userProfile.dailyProtein  || "150");
  const fatGoal     = parseInt(userProfile.dailyFat      || "65");
  const carbsGoal   = parseInt(userProfile.dailyCarbs    || "260");

  const totalCalories = Math.round(nutrition.totalCalories);
  const totalProtein  = Math.round(nutrition.totalProtein);
  const totalFat      = Math.round(nutrition.totalFat);
  const totalCarbs    = Math.round(nutrition.totalCarbs);
  const hasLogs   = todayLogs.length > 0;
  const totalPfcG = totalProtein + totalFat + totalCarbs;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // ── photo capture flow ────────────────────────────────────────────────
  const resizeImage = (file: File): Promise<Blob> =>
    new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1024;
        let { width: w, height: h } = img;
        if (w > max || h > max) {
          if (w > h) { h = (h / w) * max; w = max; }
          else       { w = (w / h) * max; h = max; }
        }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85);
      };
      img.src = url;
    });

  const handlePhotoFile = async (file: File) => {
    setPhotoError(null);
    setPhotoResult(null);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setPhotoLoading(true);

    try {
      const formData = new FormData();
      if (file.size > 2 * 1024 * 1024) {
        try {
          const blob = await resizeImage(file);
          formData.append("file", new File([blob], "food.jpg", { type: "image/jpeg" }));
        } catch {
          formData.append("file", file);
        }
      } else {
        formData.append("file", file);
      }

      const bloodTestRaw  = localStorage.getItem("bloodTestResults");
      const healthCheckRaw = localStorage.getItem("healthCheckData");
      const healthPayload = bloodTestRaw || healthCheckRaw;
      if (healthPayload) formData.append("healthData", healthPayload);

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 30000);
      const res  = await fetch(`${API_BASE}/api/analyze-food`, { method: "POST", body: formData, signal: controller.signal });
      clearTimeout(tid);

      const data = await res.json();
      if (data.success && data.data) {
        setPhotoResult(data.data);
      } else {
        setPhotoError(data.error || "解析に失敗しました。もう一度お試しください。");
      }
    } catch (e: any) {
      setPhotoError(e.name === "AbortError" ? "タイムアウトしました。再度お試しください。" : "通信エラーが発生しました。");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
    e.target.value = "";
  };

  const handleSavePhoto = () => {
    if (!photoResult) return;
    addMealLog({
      mealType:      guessMealType(),
      mealName:      photoResult.mealName,
      totalCalories: photoResult.totalCalories,
      totalProtein:  photoResult.totalProtein,
      totalFat:      photoResult.totalFat,
      totalCarbs:    photoResult.totalCarbs,
      healthScore:   photoResult.healthScore,
      source:        "photo",
    });
    setPhotoResult(null);
    setPhotoPreview(null);
    showToast("✓ 食事を記録しました");
    refresh();
  };

  // ── manual entry ──────────────────────────────────────────────────────
  const handleManualSave = (meal: MealEntry) => {
    addMealLog({
      mealType: meal.time, mealName: meal.name,
      totalCalories: meal.calories, totalProtein: meal.protein,
      totalFat: meal.fat, totalCarbs: meal.carbs,
      healthScore: 0, source: "manual",
      fiber: meal.fiber,
      sodium: meal.sodium,
      note: meal.note,
    });
    setShowManualEntry(false);
    showToast("✓ 食事を記録しました");
    refresh();
  };

  // ── barcode ──────────────────────────────────────────────────────────
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
    const ratio = barcodeGrams / 100;
    addMealLog({
      mealType: guessMealType(), mealName: p.name,
      totalCalories: Math.round(p.calories * ratio),
      totalProtein: Math.round(p.protein * ratio * 10) / 10,
      totalFat: Math.round(p.fat * ratio * 10) / 10,
      totalCarbs: Math.round(p.carbs * ratio * 10) / 10,
      healthScore: 0, source: "barcode",
      barcode: barcodeResult.barcode,
      fiber: p.fiber != null ? Math.round(p.fiber * ratio * 10) / 10 : undefined,
      sodium: p.sodium != null ? Math.round(p.sodium * ratio * 10) / 10 : undefined,
    });
    setBarcodeResult(null);
    setBarcodeGrams(100);
    showToast("✓ 食事ログに追加しました");
    refresh();
  };

  // ── delete meal ──────────────────────────────────────────────────────
  const handleDeleteMeal = (mealId: string) => {
    const today = new Date().toISOString().split("T")[0];

    // mealLog から削除（DailyFoodLog も内部で再計算）
    deleteMealLog(mealId);

    // foodLogs からも同期削除
    const raw = localStorage.getItem("foodLogs");
    if (raw) {
      const logs = JSON.parse(raw);
      const idx = logs.findIndex((l: any) => l.date === today);
      if (idx >= 0) {
        logs[idx].meals = logs[idx].meals.filter((m: any) => m.id !== mealId);
        logs[idx].totalCalories = Math.round(logs[idx].meals.reduce((s: number, m: any) => s + (m.calories ?? 0), 0));
        logs[idx].totalProtein  = Math.round(logs[idx].meals.reduce((s: number, m: any) => s + (m.protein  ?? 0), 0));
        logs[idx].totalFat      = Math.round(logs[idx].meals.reduce((s: number, m: any) => s + (m.fat      ?? 0), 0));
        logs[idx].totalCarbs    = Math.round(logs[idx].meals.reduce((s: number, m: any) => s + (m.carbs    ?? 0), 0));
        localStorage.setItem("foodLogs", JSON.stringify(logs));
      }
    }

    refresh();
  };

  // ── render ────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#0a0a0f", color: "#fff", paddingBottom: 100 }}>

      {/* hidden camera input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handlePhotoInputChange}
      />

      {/* ── Overlays ── */}
      <AnimatePresence>
        {showScanner && <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showManualEntry && <ManualFoodEntry onSave={handleManualSave} onClose={() => setShowManualEntry(false)} />}
      </AnimatePresence>

      {/* Photo loading */}
      <AnimatePresence>
        {photoLoading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}
          >
            {photoPreview && (
              <img src={photoPreview} style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 16, border: "2px solid #4ade8040", marginBottom: 8 }} />
            )}
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #4ade8040", borderTopColor: "#4ade80", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>AIが食事を解析中...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barcode loading */}
      <AnimatePresence>
        {scanLoading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}
          >
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #4ade8040", borderTopColor: "#4ade80", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>商品を検索中...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo result modal */}
      <AnimatePresence>
        {(photoResult || photoError) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={() => { setPhotoResult(null); setPhotoError(null); setPhotoPreview(null); }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 480, background: "#111118", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", maxHeight: "85vh", overflowY: "auto" }}
            >
              <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />

              {photoError ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ fontSize: 36, marginBottom: 12 }}>⚠️</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>解析に失敗しました</p>
                  <p style={{ fontSize: 13, color: "#777", marginBottom: 24 }}>{photoError}</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setPhotoError(null); setPhotoPreview(null); }} style={secBtn}>閉じる</button>
                    <button onClick={() => { setPhotoError(null); setPhotoPreview(null); photoInputRef.current?.click(); }} style={outBtn}>再撮影</button>
                  </div>
                </div>
              ) : photoResult && (
                <>
                  {photoPreview && (
                    <img src={photoPreview} alt="food" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 12, marginBottom: 16, border: "1px solid #222" }} />
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <p style={{ fontSize: 17, fontWeight: 800, color: "#fff", flex: 1 }}>{photoResult.mealName}</p>
                    {photoResult.healthScore > 0 && (
                      <div style={{ background: "#4ade8018", border: "1px solid #4ade8040", borderRadius: 10, padding: "4px 10px", textAlign: "center" }}>
                        <p style={{ fontSize: 10, color: "#4ade80", fontWeight: 600 }}>スコア</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: "#4ade80", lineHeight: 1 }}>{photoResult.healthScore}</p>
                      </div>
                    )}
                  </div>

                  {/* Nutrition */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#0e0e15", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #1e1e28" }}>
                    {[
                      { label: "カロリー",   value: `${photoResult.totalCalories} kcal`, color: "#fff" },
                      { label: "タンパク質", value: `${photoResult.totalProtein}g`,       color: "#4ade80" },
                      { label: "脂質",       value: `${photoResult.totalFat}g`,           color: "#fbbf24" },
                      { label: "炭水化物",   value: `${photoResult.totalCarbs}g`,         color: "#60a5fa" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 15, fontWeight: 700, color }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Food items */}
                  {photoResult.items?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 10, color: "#555", marginBottom: 8, letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase" }}>内訳</p>
                      {photoResult.items.map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < photoResult.items.length - 1 ? "1px solid #1a1a22" : "none" }}>
                          <div>
                            <p style={{ fontSize: 13, color: "#ddd", fontWeight: 500 }}>{item.name}</p>
                            <p style={{ fontSize: 10, color: "#555" }}>{item.amount}</p>
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{item.calories} kcal</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Advice */}
                  {photoResult.advice && (
                    <div style={{ background: "#0f2018", border: "1px solid #4ade8030", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                      <p style={{ fontSize: 10, color: "#4ade80", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>AIアドバイス</p>
                      <p style={{ fontSize: 13, color: "#ddd", lineHeight: 1.65 }}>{photoResult.advice}</p>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setPhotoResult(null); setPhotoPreview(null); }} style={secBtn}>閉じる</button>
                    <button onClick={handleSavePhoto} style={priBtn}>食事に記録する</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barcode result modal */}
      <AnimatePresence>
        {barcodeResult && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={() => { setBarcodeResult(null); setBarcodeGrams(100); }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 480, background: "#111118", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", maxHeight: "85vh", overflowY: "auto" }}
            >
              <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 20px" }} />

              {!barcodeResult.found ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>商品が見つかりませんでした</p>
                  <p style={{ fontSize: 13, color: "#777", marginBottom: 24 }}>バーコード: {barcodeResult.barcode}</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setBarcodeResult(null); setBarcodeGrams(100); }} style={secBtn}>閉じる</button>
                    <button onClick={() => { setBarcodeResult(null); setBarcodeGrams(100); setShowScanner(true); }} style={outBtn}>再スキャン</button>
                    <button onClick={() => { setBarcodeResult(null); setBarcodeGrams(100); setShowManualEntry(true); }} style={outBtn}>手入力</button>
                  </div>
                </div>
              ) : (
                <>
                  {barcodeResult.product?.image_url && (
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                      <img src={barcodeResult.product.image_url} alt={barcodeResult.product.name}
                        style={{ maxHeight: 120, maxWidth: "100%", objectFit: "contain", borderRadius: 12, border: "1px solid #222" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{barcodeResult.product?.name}</p>
                  {barcodeResult.product?.brand && <p style={{ fontSize: 12, color: "#666", marginBottom: 14 }}>{barcodeResult.product.brand}</p>}

                  {/* グラム数調整 */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ color: "#aaa", fontSize: 13 }}>摂取量</span>
                      <span style={{ color: "#4ade80", fontSize: 16, fontWeight: 700 }}>{barcodeGrams}g</span>
                    </div>
                    <input
                      type="range" min={10} max={500} step={5}
                      value={barcodeGrams}
                      onChange={e => setBarcodeGrams(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#4ade80" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginTop: 4 }}>
                      <span>10g</span>
                      <span>500g</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {[50, 100, 150, 200, 300].map(g => (
                        <button key={g} onClick={() => setBarcodeGrams(g)}
                          style={{
                            padding: "4px 10px", borderRadius: 20, fontSize: 12,
                            background: barcodeGrams === g ? "#4ade80" : "#2a2a2a",
                            color: barcodeGrams === g ? "#000" : "#aaa",
                            border: "1px solid #444", cursor: "pointer",
                          }}
                        >{g}g</button>
                      ))}
                    </div>
                  </div>

                  {/* 計算済み栄養成分 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#0e0e15", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #1e1e28" }}>
                    <p style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase", gridColumn: "1/-1", marginBottom: 6 }}>{barcodeGrams}g あたりの栄養成分</p>
                    {[
                      { label: "カロリー",   value: `${Math.round((barcodeResult.product?.calories ?? 0) * barcodeGrams / 100)} kcal`, color: "#fff" },
                      { label: "タンパク質", value: `${Math.round((barcodeResult.product?.protein ?? 0) * barcodeGrams / 100 * 10) / 10}g`, color: "#4ade80" },
                      { label: "脂質",       value: `${Math.round((barcodeResult.product?.fat ?? 0) * barcodeGrams / 100 * 10) / 10}g`, color: "#fbbf24" },
                      { label: "炭水化物",   value: `${Math.round((barcodeResult.product?.carbs ?? 0) * barcodeGrams / 100 * 10) / 10}g`, color: "#60a5fa" },
                      ...(barcodeResult.product?.fiber  != null ? [{ label: "食物繊維", value: `${Math.round(barcodeResult.product.fiber * barcodeGrams / 100 * 10) / 10}g`, color: "#a78bfa" }] : []),
                      ...(barcodeResult.product?.sodium != null ? [{ label: "食塩",    value: `${Math.round(barcodeResult.product.sodium * barcodeGrams / 100 * 10) / 10}mg`, color: "#f87171" }] : []),
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 15, fontWeight: 700, color }}>{value}</p>
                      </div>
                    ))}
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

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setBarcodeResult(null); setBarcodeGrams(100); }} style={secBtn}>閉じる</button>
                    <button onClick={handleSaveBarcodeToLog} style={priBtn}>食事に記録する</button>
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
            style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#4ade80", color: "#000", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(74,222,128,0.4)", whiteSpace: "nowrap" }}
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
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#000" }}>G</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>

        {/* Score */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <Card>
            <SLabel>本日の食事スコア</SLabel>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: hasLogs && todayScore > 0 ? 52 : 32, fontWeight: 800, color: hasLogs && todayScore > 0 ? getScoreColor(todayScore) : "#4ade80", lineHeight: 1 }}>
                {hasLogs && todayScore > 0 ? todayScore : hasLogs ? "集計中..." : "---"}
              </span>
              <span style={{ fontSize: 16, color: "#555", marginBottom: 6 }}>/ 100</span>
            </div>
            {hasLogs && todayScore > 0 && (
              <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: getScoreColor(todayScore), background: `${getScoreColor(todayScore)}18`, borderRadius: 999, padding: "2px 10px", marginBottom: 8 }}>
                {getScoreLabel(todayScore)}
              </span>
            )}
            <ProgressBar value={todayScore} max={100} color={hasLogs && todayScore > 0 ? getScoreColor(todayScore) : "#4ade80"} height={8} />
            <p style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
              {!hasLogs ? "食事を記録するとスコアが表示されます" : "記録した食事のスコア平均"}
            </p>
          </Card>
        </motion.div>

        {/* Calories */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.07 }}>
          <Card>
            <SLabel>総カロリー</SLabel>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{totalCalories.toLocaleString()}</span>
                <span style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>/ {calorieGoal.toLocaleString()} kcal</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", background: "#4ade8015", borderRadius: 8, padding: "3px 8px" }}>
                {calorieGoal > 0 ? Math.round((totalCalories / calorieGoal) * 100) : 0}%
              </span>
            </div>
            <ProgressBar value={totalCalories} max={calorieGoal} color="#4ade80" height={8} />
            <p style={{ fontSize: 11, color: "#555", marginTop: 8 }}>残り {Math.max(0, calorieGoal - totalCalories).toLocaleString()} kcal</p>
          </Card>
        </motion.div>

        {/* PFC */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.14 }}>
          <Card>
            <SLabel>PFC摂取量</SLabel>
            {([
              { key: "protein", label: "タンパク質", g: totalProtein, goal: proteinGoal, color: "#4ade80" },
              { key: "fat",     label: "脂質",       g: totalFat,     goal: fatGoal,     color: "#fbbf24" },
              { key: "carbs",   label: "炭水化物",   g: totalCarbs,   goal: carbsGoal,   color: "#60a5fa" },
            ] as const).map(({ key, label, g, goal, color }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                    <span style={{ fontSize: 12, color: "#aaa", fontWeight: 500 }}>{label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{g}g</span>
                    <span style={{ fontSize: 11, color: "#555" }}>/ {goal}g</span>
                    <span style={{ fontSize: 11, color, fontWeight: 600, minWidth: 32, textAlign: "right" }}>
                      {goal > 0 ? Math.round((g / goal) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <ProgressBar value={g} max={goal} color={color} height={5} />
              </div>
            ))}
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
                    {[["P", "#4ade80", totalProtein], ["F", "#fbbf24", totalFat], ["C", "#60a5fa", totalCarbs]].map(([l, c, g]) => (
                      <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: c as string, display: "inline-block" }} />
                        <span style={{ fontSize: 10, color: "#666" }}>{l} {Math.round(((g as number) / totalPfcG) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div style={{ height: 6, background: "#1a1a22", borderRadius: 4 }} />}
            </div>
          </Card>
        </motion.div>

        {/* Meal Log */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.21 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <SLabel>本日の食事記録</SLabel>
              {hasLogs && <span style={{ fontSize: 10, color: "#555" }}>{todayLogs.length}件</span>}
            </div>

            {/* ── 食事追加ボタン (常時表示) ── */}
            <div style={{ display: "flex", gap: 8, marginBottom: hasLogs ? 12 : 0 }}>
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#4ade8018", border: "1px solid #4ade8040", color: "#4ade80", borderRadius: 10, padding: "9px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <Camera style={{ width: 12, height: 12 }} />食事を撮影
              </button>
              <button
                onClick={() => setShowScanner(true)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#60a5fa18", border: "1px solid #60a5fa40", color: "#60a5fa", borderRadius: 10, padding: "9px 6px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <BarcodeIcon size={12} />バーコード
              </button>
              <button
                onClick={() => setShowManualEntry(true)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#a78bfa18", border: "1px solid #a78bfa40", color: "#a78bfa", borderRadius: 10, padding: "9px 6px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                ✏️手入力
              </button>
            </div>

            {!hasLogs ? (
              <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
                <p style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>まだ食事が記録されていません</p>
                <p style={{ fontSize: 11, color: "#444" }}>上のボタンから記録を始めましょう</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todayLogs.map((log) => {
                  const pill  = MEAL_PILL[log.mealType];
                  const label = MEAL_LABELS[log.mealType];
                  const icon  = SOURCE_ICON[log.source ?? "photo"] ?? "🍽️";
                  const time  = new Date(log.loggedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={log.id} style={{ background: "#0e0e15", borderRadius: 12, padding: "10px 12px", border: "1px solid #1e1e28", display: "flex", alignItems: "center", gap: 10 }}>
                      {/* ソースアイコン */}
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "#1a1a28", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                        {icon}
                      </div>

                      {/* 食事情報 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: pill.bg, color: pill.text }}>{label}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "#555" }}>
                            <Clock style={{ width: 9, height: 9 }} />{time}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: "#ccc", fontWeight: 500, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{log.mealName}</p>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{log.totalCalories} kcal</span>
                          <span style={{ fontSize: 10, color: "#555" }}>·</span>
                          {[["P", "#4ade80", log.totalProtein], ["F", "#fbbf24", log.totalFat], ["C", "#60a5fa", log.totalCarbs]].map(([l, c, g]) => (
                            <span key={l as string} style={{ fontSize: 10, color: "#666" }}>
                              <span style={{ color: c as string, fontWeight: 600 }}>{l}</span>:{Math.round(g as number)}g
                            </span>
                          ))}
                          {log.healthScore > 0 && (
                            <span style={{ fontSize: 10, color: getScoreColor(log.healthScore), fontWeight: 600, marginLeft: "auto" }}>スコア {log.healthScore}</span>
                          )}
                        </div>
                      </div>

                      {/* 削除ボタン */}
                      <button
                        onClick={() => handleDeleteMeal(log.id)}
                        style={{ background: "none", border: "none", color: "#3a3a4a", fontSize: 20, cursor: "pointer", padding: "0 2px", flexShrink: 0, lineHeight: 1, transition: "color 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#3a3a4a"; }}
                        title="削除"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

    </div>
  );
}

// ── shared button styles ──────────────────────────────────────────────────────
const priBtn: React.CSSProperties = { flex: 2, padding: "13px", borderRadius: 12, background: "#4ade80", border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const secBtn: React.CSSProperties = { flex: 1, padding: "13px", borderRadius: 12, background: "#1e1e28", border: "1px solid #333", color: "#aaa", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const outBtn: React.CSSProperties = { flex: 1, padding: "13px", borderRadius: 12, background: "#4ade8015", border: "1px solid #4ade8040", color: "#4ade80", fontSize: 13, fontWeight: 600, cursor: "pointer" };

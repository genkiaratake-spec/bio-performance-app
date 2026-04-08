import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Upload as UploadIcon, FileText, CheckCircle2,
  AlertCircle, ChevronRight, Zap, ArrowLeft,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Marker {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: "ok" | "borderline" | "low";
  note: string;
}

interface Supplement {
  name: string;
  dosage: string;
  timing: string;
  reason: string;
  priority: "high" | "normal";
  monthly_cost: string;
}

interface AnalysisResult {
  markers: Marker[];
  overall_assessment: string;
  supplements: Supplement[];
  dietary_advice: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const API_BASE = typeof window !== "undefined" && window.location.protocol === "capacitor:"
  ? "https://bio-performance-app.vercel.app" : "";

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:xxx/xxx;base64,XXXXX → XXXXX のみ
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STATUS_CONFIG = {
  ok:         { label: "正常",  color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)" },
  borderline: { label: "要注意", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)" },
  low:        { label: "不足",  color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
};

const ANALYSIS_STEPS = [
  "ファイルを読み込み中...",
  "血液検査データを識別中...",
  "バイオマーカーを解析中...",
  "サプリメントを最適化中...",
  "レポートを生成中...",
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 3, flex: 1, borderRadius: 999,
            background: i < current ? "#4ade80" : "rgba(255,255,255,0.1)",
            transition: "background 0.4s",
          }}
        />
      ))}
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #222", borderRadius: 16, padding: "16px 18px", marginBottom: 12 }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1: Welcome                                                    */
/* ------------------------------------------------------------------ */
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", textAlign: "center", gap: 0 }}
    >
      <div style={{ fontSize: 72, marginBottom: 24 }}>🔬</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 12, lineHeight: 1.3 }}>
        AI血液検査解析
      </h1>
      <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 32, maxWidth: 300 }}>
        血液検査の結果をアップロードするだけで、AIがバイオマーカーを解析し、
        あなた専用のサプリメント処方と食事アドバイスを生成します。
      </p>

      <div style={{ width: "100%", maxWidth: 340, marginBottom: 32 }}>
        {[
          { icon: "📋", text: "PDF・JPG・PNG に対応" },
          { icon: "🤖", text: "Claude AIによる高精度解析" },
          { icon: "💊", text: "パーソナライズされたサプリ処方" },
          { icon: "🔒", text: "解析後データは削除されます" },
        ].map((item) => (
          <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #1a1a28" }}>
            <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{item.icon}</span>
            <span style={{ fontSize: 13, color: "#aaa" }}>{item.text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        style={{
          width: "100%", maxWidth: 340, padding: "15px", borderRadius: 14,
          background: "#4ade80", color: "#000", fontWeight: 700, fontSize: 15,
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        はじめる <ChevronRight size={18} />
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2: Upload + Questionnaire                                     */
/* ------------------------------------------------------------------ */
function StepUpload({
  onAnalyze,
  onBack,
}: {
  onAnalyze: (file: File, healthGoal: string, exercise: string, dietStyle: string) => void;
  onBack: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [healthGoal, setHealthGoal] = useState("");
  const [exercise, setExercise] = useState("");
  const [dietStyle, setDietStyle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const FILE_INPUT_ID = "blood-test-file-input";

  const handleFile = useCallback((f: File) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      alert("PDF・JPG・PNG ファイルのみ対応しています");
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const canSubmit = !!file;

  const GOAL_OPTIONS   = ["体重管理・ダイエット", "筋肉増強・パフォーマンス向上", "疲労改善・エネルギーアップ", "健康維持・予防", "その他"];
  const EX_OPTIONS     = ["ほぼしない", "週1〜2回", "週3〜4回", "毎日"];
  const DIET_OPTIONS   = ["バランス食", "低糖質", "高タンパク", "植物性中心", "特になし"];

  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
    >
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, color: "#666", fontSize: 13, background: "none", border: "none", cursor: "pointer", marginBottom: 20 }}>
        <ArrowLeft size={15} /> 戻る
      </button>

      <h2 style={{ fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 4 }}>血液検査結果をアップロード</h2>
      <p style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>PDF・JPG・PNG に対応</p>

      {/* Drop zone */}
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          display: "block", position: "relative",
          border: file ? "2px solid #4ade80" : "2px dashed #333",
          borderRadius: 14, padding: "28px 20px", textAlign: "center",
          cursor: "pointer", marginBottom: 20,
          background: file ? "rgba(74,222,128,0.06)" : "#0e0e15",
          transition: "all 0.2s",
        }}
      >
        <input
          id={FILE_INPUT_ID}
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", top: 0, left: 0 }}
        />
        {file ? (
          <>
            <CheckCircle2 size={32} style={{ color: "#4ade80", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, marginBottom: 4 }}>{file.name}</p>
            <p style={{ fontSize: 11, color: "#555" }}>{(file.size / 1024).toFixed(0)} KB · タップして変更</p>
          </>
        ) : (
          <>
            <UploadIcon size={32} style={{ color: "#444", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>タップしてファイルを選択</p>
            <p style={{ fontSize: 11, color: "#555" }}>またはドラッグ＆ドロップ</p>
          </>
        )}
      </label>

      {/* Questionnaire */}
      <SectionCard>
        <p style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>健康情報（任意・精度向上）</p>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>健康ゴール</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setHealthGoal(healthGoal === opt ? "" : opt)}
                style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: healthGoal === opt ? "rgba(74,222,128,0.15)" : "#1a1a28",
                  border: `1px solid ${healthGoal === opt ? "#4ade80" : "#2a2a38"}`,
                  color: healthGoal === opt ? "#4ade80" : "#777",
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>運動習慣</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {EX_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setExercise(exercise === opt ? "" : opt)}
                style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: exercise === opt ? "rgba(74,222,128,0.15)" : "#1a1a28",
                  border: `1px solid ${exercise === opt ? "#4ade80" : "#2a2a38"}`,
                  color: exercise === opt ? "#4ade80" : "#777",
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>食事スタイル</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {DIET_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setDietStyle(dietStyle === opt ? "" : opt)}
                style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: dietStyle === opt ? "rgba(74,222,128,0.15)" : "#1a1a28",
                  border: `1px solid ${dietStyle === opt ? "#4ade80" : "#2a2a38"}`,
                  color: dietStyle === opt ? "#4ade80" : "#777",
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      <button
        onClick={() => canSubmit && onAnalyze(file!, healthGoal, exercise, dietStyle)}
        disabled={!canSubmit}
        style={{
          width: "100%", padding: "15px", borderRadius: 14, marginTop: 8,
          background: canSubmit ? "#4ade80" : "#1a1a28",
          color: canSubmit ? "#000" : "#444",
          fontWeight: 700, fontSize: 15, border: "none",
          cursor: canSubmit ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "all 0.2s",
        }}
      >
        <Zap size={16} />
        AI解析を開始する
      </button>

      <p style={{ fontSize: 11, color: "#444", textAlign: "center", marginTop: 12 }}>
        ※ データはAI解析後に削除されます
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3: Analyzing                                                  */
/* ------------------------------------------------------------------ */
function StepAnalyzing({ currentStep }: { currentStep: number }) {
  return (
    <motion.div
      key="analyzing"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", textAlign: "center" }}
    >
      {/* Spinner */}
      <div style={{ position: "relative", width: 72, height: 72, marginBottom: 28 }}>
        <div style={{ position: "absolute", inset: 0, border: "4px solid rgba(74,222,128,0.15)", borderRadius: "50%" }} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", inset: 0,
            border: "4px solid transparent", borderTopColor: "#4ade80",
            borderRadius: "50%",
          }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
          🔬
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>AI解析中...</h2>
      <p style={{ fontSize: 13, color: "#555", marginBottom: 32 }}>30秒ほどかかる場合があります</p>

      {/* Step list */}
      <div style={{ width: "100%", maxWidth: 320 }}>
        {ANALYSIS_STEPS.map((label, i) => {
          const done    = i < currentStep;
          const active  = i === currentStep;
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: done || active ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.15 }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid #1a1a28" }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: done ? "#4ade80" : active ? "rgba(74,222,128,0.2)" : "#1a1a28",
                border: active ? "2px solid #4ade80" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11,
              }}>
                {done ? "✓" : active ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ width: 8, height: 8, borderRadius: 2, background: "#4ade80" }} /> : ""}
              </div>
              <span style={{ fontSize: 12, color: done ? "#4ade80" : active ? "#fff" : "#444", fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4: Results                                                    */
/* ------------------------------------------------------------------ */
function StepResults({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const okCount         = result.markers.filter((m) => m.status === "ok").length;
  const borderlineCount = result.markers.filter((m) => m.status === "borderline").length;
  const lowCount        = result.markers.filter((m) => m.status === "low").length;

  return (
    <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 2 }}>解析レポート</h2>
          <p style={{ fontSize: 11, color: "#555" }}>AIによる血液検査解析結果</p>
        </div>
        <button
          onClick={onReset}
          style={{ fontSize: 12, color: "#666", background: "#1a1a28", border: "1px solid #2a2a38", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
        >
          再アップロード
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "正常", count: okCount,         color: "#4ade80" },
          { label: "要注意", count: borderlineCount, color: "#fbbf24" },
          { label: "不足", count: lowCount,          color: "#f87171" },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ background: "#111118", border: "1px solid #222", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 2 }}>{count}</p>
            <p style={{ fontSize: 10, color: "#666" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Overall assessment */}
      <SectionCard>
        <p style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>総合評価</p>
        <p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.7 }}>{result.overall_assessment}</p>
      </SectionCard>

      {/* Biomarkers */}
      <SectionCard>
        <p style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>バイオマーカー</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {result.markers.map((m, i) => {
            const sc = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.ok;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: i < result.markers.length - 1 ? "1px solid #1a1a28" : "none", gap: 10 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{m.name}</p>
                  {m.note && <p style={{ fontSize: 10, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.note}</p>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                    {m.value} <span style={{ fontSize: 10, color: "#555", fontWeight: 400 }}>{m.unit}</span>
                  </p>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                    background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                  }}>
                    {sc.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </SectionCard>

      {/* Supplements */}
      {result.supplements.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, padding: "0 2px" }}>
            サプリメント処方
          </p>
          {result.supplements.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              style={{
                background: "#111118", border: `1px solid ${s.priority === "high" ? "rgba(249,115,22,0.3)" : "#222"}`,
                borderRadius: 14, padding: "14px 16px", marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{s.name}</span>
                {s.priority === "high" && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }}>
                    優先
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: "#999", lineHeight: 1.6, marginBottom: 10 }}>{s.reason}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { label: "用量", value: s.dosage },
                  { label: "タイミング", value: s.timing },
                  { label: "月額目安", value: s.monthly_cost },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#0e0e15", borderRadius: 8, padding: "8px 10px" }}>
                    <p style={{ fontSize: 9, color: "#555", marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#ccc" }}>{value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dietary advice */}
      {result.dietary_advice && (
        <SectionCard>
          <p style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>食事アドバイス</p>
          <p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.7 }}>{result.dietary_advice}</p>
        </SectionCard>
      )}

      <p style={{ fontSize: 11, color: "#444", textAlign: "center", marginTop: 8, marginBottom: 4 }}>
        ※ 本アプリは医療機器ではありません。表示される情報は生活習慣改善の参考を目的としており、医学的診断・治療を提供するものではありません。数値に気になる点がある場合は、医療機関にご相談ください。
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
type Step = "welcome" | "upload" | "analyzing" | "results" | "error";

const BLOOD_TEST_KEY = "bloodTestResults";

export default function Upload() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("welcome");
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // マウント時: 保存済みデータがあれば即 results へ
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BLOOD_TEST_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.markers) {
          setResult(saved);
          setStep("results");
        }
      }
    } catch {}
  }, []);

  const handleAnalyze = async (file: File, healthGoal: string, exercise: string, dietStyle: string) => {
    setStep("analyzing");
    setAnalyzeStep(0);

    // Step animation
    const timer = setInterval(() => {
      setAnalyzeStep((prev) => {
        if (prev >= ANALYSIS_STEPS.length - 1) { clearInterval(timer); return prev; }
        return prev + 1;
      });
    }, 5000);

    try {
      const fileBase64 = await fileToBase64(file);
      const mediaType  = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

      const res = await fetch(`${API_BASE}/api/analyze-blood-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, mediaType, healthGoal, exercise, dietStyle }),
      });

      clearInterval(timer);
      setAnalyzeStep(ANALYSIS_STEPS.length - 1);

      const json = await res.json();
      if (json.success && json.data) {
        // 統一キーで保存（Analysis・Supplements が参照）
        const toSave = { ...json.data, savedAt: new Date().toISOString() };
        localStorage.setItem(BLOOD_TEST_KEY, JSON.stringify(toSave));
        setTimeout(() => {
          setResult(json.data);
          setStep("results");
        }, 600);
      } else {
        throw new Error(json.error || "解析に失敗しました");
      }
    } catch (err) {
      clearInterval(timer);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStep("error");
    }
  };

  const currentStep = step === "welcome" ? 1 : step === "upload" ? 2 : step === "analyzing" ? 3 : 4;

  return (
    <div
      style={{
        height: "100vh", overflowY: "auto", WebkitOverflowScrolling: "touch",
        background: "#0a0a0f", color: "#fff", padding: "52px 20px 100px",
      }}
    >
      {/* Step indicator */}
      <div style={{ marginBottom: 28 }}>
        <StepIndicator current={currentStep} total={4} />
      </div>

      <AnimatePresence mode="wait">

        {step === "welcome" && (
          <StepWelcome key="welcome" onNext={() => setStep("upload")} />
        )}

        {step === "upload" && (
          <StepUpload key="upload" onAnalyze={handleAnalyze} onBack={() => setStep("welcome")} />
        )}

        {step === "analyzing" && (
          <StepAnalyzing key="analyzing" currentStep={analyzeStep} />
        )}

        {step === "results" && result && (
          <StepResults key="results" result={result} onReset={() => {
            localStorage.removeItem(BLOOD_TEST_KEY);
            setResult(null);
            setStep("welcome");
          }} />
        )}

        {step === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}
          >
            <AlertCircle size={52} style={{ color: "#f87171", marginBottom: 20 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>解析に失敗しました</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 28, maxWidth: 280, lineHeight: 1.6 }}>{errorMsg}</p>
            <button
              onClick={() => { setErrorMsg(""); setStep("upload"); }}
              style={{
                padding: "13px 32px", borderRadius: 12, background: "#4ade80",
                color: "#000", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
              }}
            >
              やり直す
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Info, TrendingUp, Upload as UploadIcon, CheckCircle2, ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect, useCallback, useRef } from "react";
import { getRecentDailyLogs, DailyFoodLog } from "../utils/mealLog";

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

interface BloodTestResults {
  markers: Marker[];
  overall_assessment: string;
  dietary_advice: string;
  supplements: any[];
  savedAt?: string;
}

interface HistoryEntry {
  uploadedAt: string;
  data: BloodTestResults;
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const STATUS_CONFIG = {
  ok:         { label: "正常",   color: "text-teal",        bg: "bg-teal/10",        border: "border-teal/20" },
  borderline: { label: "要確認", color: "text-amber",       bg: "bg-amber/10",       border: "border-amber/20" },
  low:        { label: "要確認", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
};

const BLOOD_TEST_KEY = "bloodTestResults";
const HISTORY_KEY    = "healthCheckHistory";
const INSIGHT_DAYS   = 30;

const API_BASE = typeof window !== "undefined" && window.location.protocol === "capacitor:"
  ? "https://bio-performance-app.vercel.app" : "";

const ANALYSIS_STEPS = [
  "ファイルを読み込み中...",
  "血液検査データを識別中...",
  "バイオマーカーを解析中...",
  "サプリメントを最適化中...",
  "レポートを生成中...",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function addToHistory(data: BloodTestResults) {
  const raw = localStorage.getItem(HISTORY_KEY);
  let history: HistoryEntry[] = [];
  try { if (raw) history = JSON.parse(raw); } catch {}
  history.unshift({ uploadedAt: new Date().toISOString(), data });
  if (history.length > 10) history = history.slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/* ------------------------------------------------------------------ */
/*  Insight types                                                      */
/* ------------------------------------------------------------------ */
interface Insight {
  icon: string;
  title: string;
  message: string;
  actions: string[];
  color: "amber" | "red" | "teal";
}

/* ------------------------------------------------------------------ */
/*  Insight calculation (rule-based, no API)                           */
/* ------------------------------------------------------------------ */
function calcInsights(markers: Marker[], logs: DailyFoodLog[], userProfile: any): {
  insights: Insight[];
  daysRecorded: number;
} {
  const daysRecorded = logs.length;

  if (daysRecorded === 0) return { insights: [], daysRecorded: 0 };

  const proteinGoal = parseInt(userProfile?.dailyProtein || '150');
  const fatGoal     = parseInt(userProfile?.dailyFat     || '65');
  const carbsGoal   = parseInt(userProfile?.dailyCarbs   || '260');

  const avgProteinPct = logs.reduce((s, d) => s + (proteinGoal > 0 ? (d.protein  / proteinGoal)  * 100 : 100), 0) / daysRecorded;
  const avgFatPct     = logs.reduce((s, d) => s + (fatGoal    > 0 ? (d.fat       / fatGoal)      * 100 : 100), 0) / daysRecorded;
  const avgCarbsPct   = logs.reduce((s, d) => s + (carbsGoal  > 0 ? (d.carbs     / carbsGoal)    * 100 : 100), 0) / daysRecorded;

  const isLow         = (name: string) => markers.some(m => m.status === 'low'       && m.name.includes(name));
  const isBorderline  = (name: string) => markers.some(m => m.status === 'borderline' && m.name.includes(name));

  const insights: Insight[] = [];

  if (isLow('フェリチン') || isLow('鉄')) {
    if (avgProteinPct < 70) {
      insights.push({
        icon: '🥩', color: 'amber',
        title: '鉄分・タンパク質関連の指標に着目',
        message: `過去${daysRecorded}日のタンパク質平均達成率は${Math.round(avgProteinPct)}%です。鉄分を含む食品の摂取を意識してみてください。気になる場合は医療機関での確認をお勧めします。`,
        actions: ['赤身牛肉', 'レバー', 'ほうれん草・あさり'],
      });
    } else {
      insights.push({
        icon: '🐟', color: 'amber',
        title: '鉄関連指標：食事の工夫が参考になります',
        message: `フェリチン/鉄関連の指標に着目が必要です。タンパク質の摂取量は十分ですが、非ヘム鉄の吸収にはビタミンCとの同時摂取が参考になります。気になる場合は医療機関での確認をお勧めします。`,
        actions: ['赤身肉（ヘム鉄）', 'ほうれん草＋レモン', '豆腐・豆類'],
      });
    }
  }

  if (isLow('ビタミンD') || isLow('Vitamin D')) {
    insights.push({
      icon: '☀️', color: 'amber',
      title: 'ビタミンD関連指標：食事での工夫が参考になります',
      message: `ビタミンD関連の指標に着目が必要です。日照や食事からのビタミンD摂取を意識してみてください。気になる場合は医療機関での確認をお勧めします。`,
      actions: ['鮭・サバ・イワシ', 'きのこ類（干しシイタケ）', '卵（特に卵黄）'],
    });
  }

  if (isBorderline('中性脂肪') || isBorderline('トリグリセリド')) {
    if (avgCarbsPct > 120) {
      insights.push({
        icon: '🍚', color: 'red',
        title: '糖質摂取量：要確認',
        message: `過去${daysRecorded}日の炭水化物平均達成率は${Math.round(avgCarbsPct)}%です。中性脂肪関連指標に注意が必要です。炭水化物の量を意識してみてください。気になる場合は医療機関での確認をお勧めします。`,
        actions: ['白米→玄米・雑穀米に変更', '菓子・甘い飲料を控える', '野菜・海藻から食べる'],
      });
    }
  }

  if (isBorderline('LDL') || isBorderline('コレステロール')) {
    if (avgFatPct > 120) {
      insights.push({
        icon: '🫀', color: 'red',
        title: '脂質摂取量：要確認',
        message: `過去${daysRecorded}日の脂質平均達成率は${Math.round(avgFatPct)}%です。LDLコレステロール関連指標に注意が必要です。脂質の量を意識してみてください。気になる場合は医療機関での確認をお勧めします。`,
        actions: ['揚げ物を週2回以下に', '肉の脂身・バターを控える', 'オリーブオイル・魚油に置き換える'],
      });
    }
  }

  if (isLow('亜鉛') || isLow('マグネシウム')) {
    if (avgProteinPct < 80) {
      insights.push({
        icon: '🥜', color: 'teal',
        title: 'ミネラル関連指標：食事の工夫が参考になります',
        message: `過去${daysRecorded}日のタンパク質平均達成率は${Math.round(avgProteinPct)}%です。タンパク質を含む食品を意識すると、亜鉛・マグネシウムの摂取にも寄与が期待できます。`,
        actions: ['牡蠣・牛赤身肉', 'ナッツ類（アーモンド・カシューナッツ）', '豆腐・枝豆・レンズ豆'],
      });
    }
  }

  return { insights, daysRecorded };
}

/* ------------------------------------------------------------------ */
/*  Upload Zone component                                              */
/* ------------------------------------------------------------------ */
function UploadZone({ onComplete }: { onComplete: (data: BloodTestResults) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      setError("PDF・JPG・PNG ファイルのみ対応しています");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    setUploading(true);
    setAnalyzeStep(0);
    setError(null);

    const timer = setInterval(() => {
      setAnalyzeStep((prev) => {
        if (prev >= ANALYSIS_STEPS.length - 1) { clearInterval(timer); return prev; }
        return prev + 1;
      });
    }, 5000);

    try {
      const fileBase64 = await fileToBase64(file);
      const mediaType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

      const res = await fetch(`${API_BASE}/api/analyze-blood-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, mediaType }),
      });

      clearInterval(timer);
      setAnalyzeStep(ANALYSIS_STEPS.length - 1);

      const json = await res.json();
      if (json.success && json.data) {
        const toSave = { ...json.data, savedAt: new Date().toISOString() };
        // Save current as active, push old to history
        const oldRaw = localStorage.getItem(BLOOD_TEST_KEY);
        if (oldRaw) {
          try {
            const oldData = JSON.parse(oldRaw);
            if (oldData.markers) addToHistory(oldData);
          } catch {}
        }
        localStorage.setItem(BLOOD_TEST_KEY, JSON.stringify(toSave));
        setTimeout(() => {
          setUploading(false);
          onComplete(toSave);
        }, 600);
      } else {
        throw new Error(json.error || "解析に失敗しました");
      }
    } catch (err) {
      clearInterval(timer);
      setUploading(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (uploading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="elevated-card rounded-2xl p-8 flex flex-col items-center text-center">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-primary/15 rounded-full" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🔬</div>
        </div>
        <h2 className="text-lg font-bold mb-2">AI解析中...</h2>
        <p className="text-xs text-muted-foreground mb-6">30秒ほどかかる場合があります</p>
        <div className="w-full max-w-xs space-y-2">
          {ANALYSIS_STEPS.map((label, i) => {
            const done = i < analyzeStep;
            const active = i === analyzeStep;
            return (
              <div key={label} className="flex items-center gap-3 text-left">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary/20 border-2 border-primary' : 'bg-secondary'
                }`}>
                  {done ? '✓' : ''}
                </div>
                <span className={`text-xs ${done ? 'text-primary' : active ? 'text-foreground font-semibold' : 'text-muted-foreground/40'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="elevated-card rounded-2xl p-8 flex flex-col items-center text-center">
      <div className="text-5xl mb-4">🔬</div>
      <h2 className="text-xl font-bold mb-2">血液検査データが未登録です</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
        血液検査結果をアップロードすると、AIがバイオマーカーを解析してこの画面に表示します。
      </p>

      {error && (
        <div className="w-full max-w-sm mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`w-full max-w-sm rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all mb-4 block ${
          file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          className="hidden"
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-primary" />
            <p className="text-sm font-semibold text-primary">{file.name}</p>
            <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · タップして変更</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadIcon className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">PDF・JPG・PNGをドロップまたはタップ</p>
          </div>
        )}
      </label>

      <Button
        onClick={handleAnalyze}
        disabled={!file}
        className="w-full max-w-sm bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-11"
      >
        <Zap className="w-4 h-4" />
        AI解析を開始する
      </Button>
      <p className="text-[11px] text-muted-foreground mt-3">※ データはAI解析後に削除されます</p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Re-upload modal                                                    */
/* ------------------------------------------------------------------ */
function ReUploadModal({ onComplete, onClose }: { onComplete: (data: BloodTestResults) => void; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      setError("PDF・JPG・PNG ファイルのみ対応しています");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    setUploading(true);
    setAnalyzeStep(0);
    setError(null);

    const timer = setInterval(() => {
      setAnalyzeStep((prev) => {
        if (prev >= ANALYSIS_STEPS.length - 1) { clearInterval(timer); return prev; }
        return prev + 1;
      });
    }, 5000);

    try {
      const fileBase64 = await fileToBase64(file);
      const mediaType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

      const res = await fetch(`${API_BASE}/api/analyze-blood-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, mediaType }),
      });

      clearInterval(timer);
      setAnalyzeStep(ANALYSIS_STEPS.length - 1);

      const json = await res.json();
      if (json.success && json.data) {
        const toSave = { ...json.data, savedAt: new Date().toISOString() };
        const oldRaw = localStorage.getItem(BLOOD_TEST_KEY);
        if (oldRaw) {
          try {
            const oldData = JSON.parse(oldRaw);
            if (oldData.markers) addToHistory(oldData);
          } catch {}
        }
        localStorage.setItem(BLOOD_TEST_KEY, JSON.stringify(toSave));
        setTimeout(() => {
          setUploading(false);
          onComplete(toSave);
        }, 600);
      } else {
        throw new Error(json.error || "解析に失敗しました");
      }
    } catch (err) {
      clearInterval(timer);
      setUploading(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="elevated-card rounded-xl p-5 mb-6 border border-primary/20"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold">血液検査データを再アップロード</p>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕ 閉じる</button>
      </div>

      {uploading ? (
        <div className="flex flex-col items-center py-4">
          <div className="relative w-12 h-12 mb-4">
            <div className="absolute inset-0 border-4 border-primary/15 rounded-full" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {ANALYSIS_STEPS[Math.min(analyzeStep, ANALYSIS_STEPS.length - 1)]}
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {error}
            </div>
          )}
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className={`block w-full rounded-lg border-2 border-dashed p-4 cursor-pointer transition-all mb-3 ${
              file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
            }`}
          >
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary">{file.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <UploadIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">PDF・JPG・PNGを選択</span>
              </div>
            )}
          </label>
          <Button
            onClick={handleAnalyze}
            disabled={!file}
            size="sm"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            AI解析を開始する
          </Button>
        </>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  History section                                                    */
/* ------------------------------------------------------------------ */
function HistorySection() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  if (history.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="elevated-card rounded-xl p-5 mb-6">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">過去の健診データ</p>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-2">
              {history.map((entry, i) => {
                const date = new Date(entry.uploadedAt);
                const dateStr = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
                const okCount = entry.data.markers?.filter(m => m.status === 'ok').length ?? 0;
                const totalCount = entry.data.markers?.length ?? 0;
                const isExpanded = expandedIdx === i;
                return (
                  <div key={i} className="rounded-lg bg-secondary/40 overflow-hidden">
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                      className="w-full flex items-center justify-between p-3 text-left"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">{dateStr}</p>
                        <p className="text-[10px] text-muted-foreground">{okCount}/{totalCount} 正常</p>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="px-3 pb-3 space-y-1">
                            {entry.data.overall_assessment && (
                              <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{entry.data.overall_assessment}</p>
                            )}
                            {entry.data.markers?.map((m, j) => {
                              const sc = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.ok;
                              return (
                                <div key={j} className="flex items-center justify-between py-1">
                                  <span className="text-[11px] text-foreground">{m.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-foreground">{m.value} <span className="text-[9px] text-muted-foreground font-normal">{m.unit}</span></span>
                                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function Analysis() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<BloodTestResults | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [daysRecorded, setDaysRecorded] = useState(0);
  const [showReUpload, setShowReUpload] = useState(false);

  const loadData = useCallback(() => {
    try {
      const raw = localStorage.getItem(BLOOD_TEST_KEY);
      if (!raw) { setHasData(false); return; }
      const parsed: BloodTestResults = JSON.parse(raw);
      if (!parsed.markers || parsed.markers.length === 0) { setHasData(false); return; }
      setData(parsed);
      setHasData(true);

      const recentLogs  = getRecentDailyLogs(INSIGHT_DAYS);
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const { insights: calc, daysRecorded: days } = calcInsights(parsed.markers, recentLogs, userProfile);
      setInsights(calc);
      setDaysRecorded(days);
    } catch {
      setHasData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUploadComplete = (newData: BloodTestResults) => {
    setData(newData);
    setHasData(true);
    setShowReUpload(false);

    const recentLogs  = getRecentDailyLogs(INSIGHT_DAYS);
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const { insights: calc, daysRecorded: days } = calcInsights(newData.markers, recentLogs, userProfile);
    setInsights(calc);
    setDaysRecorded(days);
  };

  const okCount         = data?.markers.filter(m => m.status === "ok").length         ?? 0;
  const borderlineCount = data?.markers.filter(m => m.status === "borderline").length ?? 0;
  const lowCount        = data?.markers.filter(m => m.status === "low").length        ?? 0;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label mb-1">Blood Analysis</p>
              <h1 className="text-2xl lg:text-3xl font-bold">血液検査解析</h1>
            </div>
            {hasData === true && (
              <Button
                onClick={() => setShowReUpload(!showReUpload)}
                variant="outline"
                size="sm"
                className="gap-1.5 border-border text-xs"
              >
                📤 再アップロード
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            AIによる血液検査データの解析レポートです。
          </p>
        </motion.div>

        {/* Disclaimer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="elevated-card rounded-xl p-3.5 mb-6 flex items-start gap-3">
          <Info className="w-4 h-4 text-teal mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            ※ 本アプリは医療機器ではありません。表示される情報は生活習慣改善の参考を目的としており、医学的診断・治療を提供するものではありません。数値に気になる点がある場合は、医療機関にご相談ください。
          </p>
        </motion.div>

        {/* Re-upload modal */}
        <AnimatePresence>
          {showReUpload && (
            <ReUploadModal
              onComplete={handleUploadComplete}
              onClose={() => setShowReUpload(false)}
            />
          )}
        </AnimatePresence>

        {/* ── データなし → Upload Zone ── */}
        {hasData === false && (
          <UploadZone onComplete={handleUploadComplete} />
        )}

        {/* ── データあり ── */}
        {hasData === true && data && (
          <>
            {/* Summary counts */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "正常",   count: okCount,         colorClass: "text-teal" },
                { label: "要確認", count: borderlineCount, colorClass: "text-amber" },
                { label: "着目",   count: lowCount,        colorClass: "text-destructive" },
              ].map(({ label, count, colorClass }) => (
                <div key={label} className="elevated-card rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${colorClass}`}>{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </motion.div>

            {/* Overall assessment */}
            {data.overall_assessment && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="elevated-card rounded-xl p-4 mb-5 border border-teal/20 bg-teal/5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">総合評価</p>
                <p className="text-sm text-foreground leading-relaxed">{data.overall_assessment}</p>
              </motion.div>
            )}

            {/* Biomarkers list */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="elevated-card rounded-xl p-5 mb-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">バイオマーカー</p>
              <div className="space-y-0">
                {data.markers.map((m, i) => {
                  const sc = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.ok;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + i * 0.03 }}
                      className={`flex items-center justify-between py-3 ${i < data.markers.length - 1 ? "border-b border-border/30" : ""}`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-sm font-semibold text-foreground">{m.name}</p>
                        {m.note && <p className="text-[11px] text-muted-foreground mt-0.5">{m.note}</p>}
                        {m.reference_range && <p className="text-[10px] text-muted-foreground/60 mt-0.5">基準値: {m.reference_range}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {m.value}
                          {m.unit && <span className="text-[10px] font-normal text-muted-foreground ml-1">{m.unit}</span>}
                        </p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${sc.bg} ${sc.color}`}>
                          {sc.label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Dietary advice */}
            {data.dietary_advice && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="elevated-card rounded-xl p-5 mb-6">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">食事アドバイス</p>
                <p className="text-sm text-foreground leading-relaxed">{data.dietary_advice}</p>
              </motion.div>
            )}

            {/* Food × Blood Insights */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-teal" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">食事 × 血液の相関インサイト</p>
              </div>

              {daysRecorded === 0 ? (
                <div className="elevated-card rounded-xl p-5 text-center">
                  <p className="text-2xl mb-2">📊</p>
                  <p className="text-sm font-semibold text-foreground mb-1">食事記録を開始しましょう</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    食事をスキャンして記録することで、血液検査との相関インサイトが生成されます。
                    あと<span className="font-bold text-foreground">{INSIGHT_DAYS}日</span>分の記録が必要です。
                  </p>
                </div>
              ) : daysRecorded < INSIGHT_DAYS && insights.length === 0 ? (
                <div className="elevated-card rounded-xl p-5 text-center">
                  <p className="text-2xl mb-2">📈</p>
                  <p className="text-sm font-semibold text-foreground mb-1">記録を続けるとインサイトが生成されます</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    現在<span className="font-bold text-foreground">{daysRecorded}日</span>分の記録があります。
                    あと<span className="font-bold text-foreground">{INSIGHT_DAYS - daysRecorded}日</span>記録を続けることで、より精度の高いインサイトが得られます。
                  </p>
                </div>
              ) : insights.length === 0 ? (
                <div className="elevated-card rounded-xl p-5 text-center">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-sm font-semibold text-foreground mb-1">食事と血液検査の相関は良好です</p>
                  <p className="text-xs text-muted-foreground">過去{daysRecorded}日の食事記録と血液検査を照合した結果、特に改善が必要な相関は見つかりませんでした。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, i) => {
                    const borderColor = insight.color === 'red' ? 'border-destructive/20' : insight.color === 'amber' ? 'border-amber/20' : 'border-teal/20';
                    const iconBg = insight.color === 'red' ? 'bg-destructive/10' : insight.color === 'amber' ? 'bg-amber/10' : 'bg-teal/10';
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.37 + i * 0.05 }}
                        className={`elevated-card rounded-xl p-4 border ${borderColor}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`text-xl w-9 h-9 flex items-center justify-center rounded-lg shrink-0 ${iconBg}`}>{insight.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground mb-1">{insight.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-2">{insight.message}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {insight.actions.map((action, j) => (
                                <span key={j} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${iconBg} ${insight.color === 'red' ? 'text-destructive' : insight.color === 'amber' ? 'text-amber' : 'text-teal'}`}>
                                  {action}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {daysRecorded < INSIGHT_DAYS && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      ※ あと<span className="font-bold">{INSIGHT_DAYS - daysRecorded}日</span>分の食事記録でさらに精度が上がります
                    </p>
                  )}
                </div>
              )}
            </motion.div>

            {/* History section */}
            <HistorySection />

            {/* CTA */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center">
              <Button onClick={() => navigate('/supplements')} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-semibold px-10 h-11">
                サプリ処方を見る
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

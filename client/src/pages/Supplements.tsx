import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, AlertTriangle, CheckCircle2, RefreshCw, Info } from "lucide-react";
import { evaluateBiomarkers, groupByCategory, getCategoryScore } from '../lib/biomarkerEvaluation';
import { getHighPriorityTests } from '../lib/additionalTestRecommendations';
import { CATEGORY_LABELS } from '../types/healthCheck';
import type { HealthCategory } from '../types/healthCheck';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Recommendation {
  name: string;
  dose: string;
  grade: 'A' | 'B' | 'C';
  priority: 'high' | 'medium' | 'low' | 'caution';
  reason: string;
  trigger: string;
  retestTiming: string;
  warning: string;
}

interface NotNeeded {
  name: string;
  reason: string;
}

interface SupplementData {
  drugAlerts: string[];
  recommendations: Recommendation[];
  notNeeded: NotNeeded[];
}

interface Preferences {
  medications: string[];
  lifestyle: string[];
  symptoms: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const HEALTH_DATA_KEY = 'healthCheckData';
const BLOOD_TEST_KEY = 'bloodTestResults';
const PREFS_KEY = 'supplementPreferences';
const CACHE_KEY = 'supplementsData';

// Extract numeric health data from bloodTestResults markers format as fallback
function extractHealthDataFromBloodTest(): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(BLOOD_TEST_KEY);
    if (!raw) return null;
    const bt = JSON.parse(raw);
    if (!bt.markers || bt.markers.length === 0) return null;

    const result: Record<string, any> = {};
    const markers: Array<{ name: string; value: string; unit: string; status: string }> = bt.markers;

    const mapping: Record<string, string[]> = {
      ldlCholesterol: ['LDL', 'LDLコレステロール'],
      hdlCholesterol: ['HDL', 'HDLコレステロール'],
      triglycerides: ['中性脂肪', 'TG', 'トリグリセリド'],
      bloodSugar: ['血糖', '空腹時血糖', 'FBS'],
      hba1c: ['HbA1c', 'ヘモグロビンA1c'],
      ferritin: ['フェリチン'],
      vitaminD: ['ビタミンD', '25(OH)D', 'Vitamin D'],
      crp: ['CRP'],
      hsCrp: ['hs-CRP', '高感度CRP'],
      hemoglobin: ['ヘモグロビン', 'Hb'],
      bmi: ['BMI'],
      vitaminB12: ['ビタミンB12', 'B12'],
      folate: ['葉酸'],
      homocysteine: ['ホモシステイン'],
      zinc: ['亜鉛', 'Zn'],
      tsh: ['TSH'],
      cortisol: ['コルチゾール'],
      testosterone: ['テストステロン'],
    };

    for (const [key, aliases] of Object.entries(mapping)) {
      for (const alias of aliases) {
        const marker = markers.find(m => m.name.includes(alias));
        if (marker) {
          const num = parseFloat(marker.value);
          if (!isNaN(num)) { result[key] = num; break; }
        }
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch { return null; }
}

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'capacitor:'
  ? 'https://bio-performance-app.vercel.app' : '';

const MEDICATION_OPTIONS = [
  { value: 'statin', label: 'スタチン系' },
  { value: 'metformin', label: 'メトホルミン' },
  { value: 'ppi', label: 'PPI（胃薬）' },
  { value: 'warfarin', label: 'ワーファリン' },
  { value: 'thyroid', label: '甲状腺薬' },
  { value: 'ace', label: 'ACE阻害薬' },
  { value: 'diuretic', label: '利尿薬' },
  { value: 'oc', label: '経口避妊薬' },
  { value: 'steroid', label: 'ステロイド' },
  { value: 'nsaid', label: 'NSAIDs' },
];

const LIFESTYLE_OPTIONS = [
  { value: 'vegan', label: '菜食主義' },
  { value: 'hightraining', label: '高強度トレーニング' },
  { value: 'sleepbad', label: '慢性睡眠不足' },
  { value: 'stress', label: '高ストレス' },
  { value: 'hashimoto', label: '橋本病' },
  { value: 'apoe4', label: 'APOE ε4保有' },
  { value: 'mthfr', label: 'MTHFR変異あり' },
  { value: 'over40', label: '40歳以上' },
  { value: 'male', label: '男性' },
  { value: 'pregnant', label: '妊娠中' },
  { value: 'winter', label: '現在冬季（12–3月）' },
];

const SYMPTOM_OPTIONS = [
  { value: 'fatigue', label: '慢性疲労' },
  { value: 'musclepain', label: '筋肉痛・回復遅延' },
  { value: 'sleepissue', label: '入眠困難' },
  { value: 'anxstress', label: '不安・ストレス感' },
  { value: 'brainfog', label: '集中力低下' },
  { value: 'joint', label: '関節痛' },
];

const PRIORITY_CONFIG = {
  high:    { label: '高優先', color: '#ef4444', bg: '#ef444415', border: '#ef444440' },
  medium:  { label: '中優先', color: '#f97316', bg: '#f9731615', border: '#f9731640' },
  low:     { label: '低優先', color: '#4ade80', bg: '#4ade8015', border: '#4ade8040' },
  caution: { label: '慎重',   color: '#6b7280', bg: '#6b728015', border: '#6b728040' },
};

const GRADE_CONFIG = {
  A: { color: '#4ade80', bg: '#4ade8018' },
  B: { color: '#60a5fa', bg: '#60a5fa18' },
  C: { color: '#6b7280', bg: '#6b728018' },
};

/* ------------------------------------------------------------------ */
/*  Chip selector                                                      */
/* ------------------------------------------------------------------ */
function ChipSelector({ options, selected, onChange }: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {options.map(opt => {
        const active = selected.includes(opt.value);
        return (
          <button key={opt.value} onClick={() => toggle(opt.value)} style={{
            padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: active ? '#4ade8018' : '#1a1a28',
            border: `1px solid ${active ? '#4ade80' : '#2a2a38'}`,
            color: active ? '#4ade80' : '#777', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function Supplements() {
  const [, navigate] = useLocation();
  const [hasHealthData, setHasHealthData] = useState<boolean | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [data, setData] = useState<SupplementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Temp state for preference selection
  const [tempMeds, setTempMeds] = useState<string[]>([]);
  const [tempLife, setTempLife] = useState<string[]>([]);
  const [tempSymp, setTempSymp] = useState<string[]>([]);

  // Initialize - check healthCheckData first, then fallback to bloodTestResults
  useEffect(() => {
    let hasData = false;
    const healthRaw = localStorage.getItem(HEALTH_DATA_KEY);
    if (healthRaw) {
      try {
        const parsed = JSON.parse(healthRaw);
        if (parsed && (parsed.ldlCholesterol || parsed.bmi || parsed.hemoglobin)) {
          hasData = true;
        }
      } catch {}
    }
    if (!hasData) {
      // Fallback: try to extract from bloodTestResults
      const extracted = extractHealthDataFromBloodTest();
      if (extracted) {
        hasData = true;
        // Save as healthCheckData for future use
        localStorage.setItem(HEALTH_DATA_KEY, JSON.stringify(extracted));
      }
    }
    if (!hasData) { setHasHealthData(false); return; }
    setHasHealthData(true);

    // Restore preferences
    const prefsRaw = localStorage.getItem(PREFS_KEY);
    if (prefsRaw) {
      try {
        const savedPrefs: Preferences = JSON.parse(prefsRaw);
        setPrefs(savedPrefs);
        setTempMeds(savedPrefs.medications);
        setTempLife(savedPrefs.lifestyle);
        setTempSymp(savedPrefs.symptoms);
      } catch {}
    }

    // Check cache
    const cacheRaw = sessionStorage.getItem(CACHE_KEY);
    if (cacheRaw) {
      try { setData(JSON.parse(cacheRaw)); } catch {}
    }
  }, []);

  // Fetch supplements
  const fetchSupplements = useCallback(async (p: Preferences) => {
    setLoading(true);
    setError(null);
    try {
      let healthData = JSON.parse(localStorage.getItem(HEALTH_DATA_KEY) || '{}');
      // Fallback if healthCheckData is empty
      if (!healthData || (!healthData.ldlCholesterol && !healthData.bmi)) {
        healthData = extractHealthDataFromBloodTest() || {};
      }
      const res = await fetch(`${API_BASE}/api/analyze-supplements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          healthData,
          medications: p.medications,
          lifestyle: p.lifestyle,
          symptoms: p.symptoms,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(json.data));
      } else {
        throw new Error(json.error || '解析に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch when prefs exist but no cached data
  useEffect(() => {
    if (prefs && !data && !loading && hasHealthData) {
      fetchSupplements(prefs);
    }
  }, [prefs, data, loading, hasHealthData, fetchSupplements]);

  const handleSubmitPrefs = () => {
    const newPrefs: Preferences = { medications: tempMeds, lifestyle: tempLife, symptoms: tempSymp };
    localStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));
    setPrefs(newPrefs);
    setData(null);
    sessionStorage.removeItem(CACHE_KEY);
    fetchSupplements(newPrefs);
  };

  const handleReset = () => {
    sessionStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(PREFS_KEY);
    setData(null);
    setPrefs(null);
    setTempMeds([]);
    setTempLife([]);
    setTempSymp([]);
  };

  /* ── No health data ── */
  if (hasHealthData === false) {
    return (
      <div className="p-5 pt-16 lg:pt-8 lg:p-8 pb-24 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', height: '100%' }}>
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">SUPPLEMENT OPTIMIZATION</p>
          <h1 className="text-2xl font-bold text-white mb-2">サプリメント最適化</h1>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#111118] rounded-2xl p-10 flex flex-col items-center text-center border border-white/8">
          <div className="text-5xl mb-4">💊</div>
          <h2 className="text-xl font-bold text-white mb-2">健康診断データが未登録です</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-sm leading-relaxed">
            まず健康診断・血液検査の結果をアップロードしてください。データに基づいたサプリメント推奨を生成します。
          </p>
          <button onClick={() => navigate('/analysis')} className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-black transition-colors" style={{ background: '#4ade80' }}>
            健康診断をアップロード <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── Loading ── */
  if (hasHealthData === null) return null;

  /* ── Preference selection (no prefs yet OR no data) ── */
  if (!prefs && !data) {
    return (
      <div className="p-5 pt-16 lg:pt-8 lg:p-8 pb-24 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', height: '100%' }}>
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">SUPPLEMENT OPTIMIZATION</p>
          <h1 className="text-2xl font-bold text-white mb-2">サプリメント最適化</h1>
          <p className="text-sm text-gray-400">薬剤・ライフスタイル・症状を選択してください。</p>
        </div>

        <div style={{ background: '#111118', border: '1px solid #222', borderRadius: 16, padding: 18, marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 10, fontWeight: 600 }}>服用中の薬剤（複数選択可）</p>
          <ChipSelector options={MEDICATION_OPTIONS} selected={tempMeds} onChange={setTempMeds} />
        </div>

        <div style={{ background: '#111118', border: '1px solid #222', borderRadius: 16, padding: 18, marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 10, fontWeight: 600 }}>ライフスタイル・リスク（複数選択可）</p>
          <ChipSelector options={LIFESTYLE_OPTIONS} selected={tempLife} onChange={setTempLife} />
        </div>

        <div style={{ background: '#111118', border: '1px solid #222', borderRadius: 16, padding: 18, marginBottom: 18 }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 10, fontWeight: 600 }}>主観的症状（複数選択可）</p>
          <ChipSelector options={SYMPTOM_OPTIONS} selected={tempSymp} onChange={setTempSymp} />
        </div>

        <button onClick={handleSubmitPrefs} style={{
          width: '100%', padding: '14px', borderRadius: 14, background: '#4ade80', color: '#000',
          fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
        }}>
          推奨を確認する
        </button>

        <p style={{ fontSize: 11, color: '#444', textAlign: 'center', marginTop: 12 }}>
          ※ 選択しない項目はスキップ可能です
        </p>
      </div>
    );
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="p-5 pt-16 lg:pt-8 lg:p-8 pb-24 overflow-y-auto flex flex-col items-center justify-center" style={{ WebkitOverflowScrolling: 'touch', height: '100%' }}>
        <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 24 }}>
          <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(74,222,128,0.15)', borderRadius: '50%' }} />
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', inset: 0, border: '4px solid transparent', borderTopColor: '#4ade80', borderRadius: '50%' }} />
        </div>
        <p className="text-sm text-gray-400">推奨を計算中...</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="p-5 pt-16 lg:pt-8 lg:p-8 pb-24 overflow-y-auto flex flex-col items-center justify-center" style={{ WebkitOverflowScrolling: 'touch', height: '100%' }}>
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-white font-bold mb-2">エラーが発生しました</p>
        <p className="text-sm text-gray-400 mb-6">{error}</p>
        <button onClick={() => prefs && fetchSupplements(prefs)} style={{
          padding: '12px 24px', borderRadius: 12, background: '#4ade80', color: '#000', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
        }}>再試行</button>
      </div>
    );
  }

  /* ── Results ── */
  if (!data) return null;

  const highCount = data.recommendations.filter(r => r.priority === 'high').length;

  // Category evaluation
  const categoryData = useMemo(() => {
    try {
      const healthData = JSON.parse(localStorage.getItem(HEALTH_DATA_KEY) || '{}');
      const entries = evaluateBiomarkers(healthData);
      const grouped = groupByCategory(entries);
      return grouped;
    } catch { return null; }
  }, []);

  const highPriorityMissing = useMemo(() => {
    try {
      const healthData = JSON.parse(localStorage.getItem(HEALTH_DATA_KEY) || '{}');
      return getHighPriorityTests(healthData);
    } catch { return []; }
  }, []);

  // Supplement → category mapping
  const SUPP_CATEGORIES: Record<string, HealthCategory[]> = {
    'ビタミンD3 + K2': ['nutrients', 'inflammation', 'cognition'],
    'ビタミンD3': ['nutrients', 'inflammation', 'cognition'],
    'Omega-3（EPA+DHA）': ['heart', 'inflammation', 'cognition'],
    'Omega-3（DHA優位）': ['heart', 'inflammation', 'cognition'],
    '鉄（ビスグリシン酸鉄）': ['nutrients', 'fitness'],
    'ビタミンB12（メチルコバラミン）': ['nutrients', 'cognition'],
    'ビタミンB12検査': ['nutrients', 'cognition'],
    '5-MTHF（活性型葉酸）+ メチルB12': ['nutrients', 'cognition'],
    '葉酸 + B群複合（B6・B12）': ['nutrients', 'cognition'],
    '亜鉛（グリシン酸亜鉛）': ['nutrients', 'hormones'],
    'CoQ10（ユビキノール）': ['metabolism', 'fitness'],
    'ベルベリン': ['metabolism', 'heart'],
    'クルクミン + ピペリン': ['inflammation', 'heart'],
    'アシュワガンダ（KSM-66）': ['hormones'],
    'マグネシウム（グリシン酸Mg）': ['cognition'],
    'クレアチンモノハイドレート': ['fitness', 'cognition'],
    'セレン（セレノメチオニン）': ['hormones', 'inflammation'],
    'NMN': ['metabolism', 'hormones'],
  };

  return (
    <div className="p-5 pt-16 lg:pt-8 lg:p-8 pb-24 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', height: '100%' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">SUPPLEMENT OPTIMIZATION</p>
          <h1 className="text-2xl font-bold text-white mb-2">サプリメント最適化</h1>
          <p className="text-sm text-gray-400">血液検査結果に基づいた論文ベースの推奨です。</p>
        </div>
        <button onClick={handleReset}
          className="shrink-0 mt-1 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:border-green-500/40 hover:text-green-400 transition-colors whitespace-nowrap">
          <RefreshCw size={12} />再解析
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: '推奨サプリ', value: `${data.recommendations.length}`, color: 'text-white' },
          { label: '高優先度', value: `${highCount}`, color: 'text-red-400' },
          { label: '薬剤アラート', value: `${data.drugAlerts.length}`, color: data.drugAlerts.length > 0 ? 'text-orange-400' : 'text-gray-500' },
        ].map(item => (
          <div key={item.label} className="bg-[#111118] rounded-xl p-3 border border-white/8 text-center">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Category dots */}
      {categoryData && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {(Object.keys(CATEGORY_LABELS) as HealthCategory[]).map(cat => {
            const entries = categoryData[cat] || [];
            const score = getCategoryScore(entries);
            const dotColor = score.outOfRange > 0 ? '#E24B4A' : score.optimal > 0 ? '#1D9E75' : '#185FA5';
            const isBad = score.outOfRange > 0;
            return (
              <button key={cat} onClick={() => navigate('/analysis')}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#111118', border: '1px solid #222', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: isBad ? '#E24B4A' : '#888', fontWeight: isBad ? 700 : 500 }}>{CATEGORY_LABELS[cat]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Unmeasured banner */}
      {highPriorityMissing.length >= 3 && (
        <div style={{ background: '#185FA510', border: '1px solid #185FA530', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 12, color: '#60a5fa' }}>{highPriorityMissing.length}項目を追加測定すると推奨精度が上がります</p>
          <button onClick={() => navigate('/analysis')} style={{ fontSize: 11, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>確認する →</button>
        </div>
      )}

      {/* Drug alerts */}
      {data.drugAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {data.drugAlerts.map((alert, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ background: '#f9731612', border: '1px solid #f9731630', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle style={{ width: 16, height: 16, color: '#f97316', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: '#f97316', lineHeight: 1.6 }}>{alert}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      <div className="space-y-3 mb-6">
        {data.recommendations.map((rec, i) => {
          const pc = PRIORITY_CONFIG[rec.priority];
          const gc = GRADE_CONFIG[rec.grade];
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}
              style={{ background: '#111118', borderRadius: 14, padding: 16, borderLeft: `4px solid ${pc.color}`, border: `1px solid #222`, borderLeftColor: pc.color, borderLeftWidth: 4 }}>
              {/* Header: name + badges */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{rec.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: pc.color, background: pc.bg, border: `1px solid ${pc.border}` }}>
                  {pc.label}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: gc.color, background: gc.bg }}>
                  Grade {rec.grade}
                </span>
                {(SUPP_CATEGORIES[rec.name] || []).map(cat => (
                  <span key={cat} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 999, color: '#888', background: '#ffffff08', border: '1px solid #333' }}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                ))}
              </div>

              {/* Dose */}
              <div style={{ background: '#0e0e15', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                <p style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>投与量</p>
                <p style={{ fontSize: 12, color: '#ccc', fontWeight: 600 }}>{rec.dose}</p>
              </div>

              {/* Reason */}
              <p style={{ fontSize: 12, color: '#999', lineHeight: 1.7, marginBottom: 8 }}>{rec.reason}</p>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {rec.trigger && (
                  <span style={{ fontSize: 10, color: '#60a5fa', background: '#60a5fa15', padding: '3px 8px', borderRadius: 6 }}>
                    検出値: {rec.trigger}
                  </span>
                )}
                {rec.retestTiming && (
                  <span style={{ fontSize: 10, color: '#a78bfa', background: '#a78bfa15', padding: '3px 8px', borderRadius: 6 }}>
                    再検査: {rec.retestTiming}
                  </span>
                )}
              </div>

              {/* Warning */}
              {rec.warning && (
                <div style={{ background: '#f9731610', border: '1px solid #f9731625', borderRadius: 8, padding: '8px 10px' }}>
                  <p style={{ fontSize: 11, color: '#f97316', lineHeight: 1.5 }}>⚠️ {rec.warning}</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Not needed */}
      {data.notNeeded.length > 0 && (
        <div className="mb-6">
          <p style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 600 }}>補充不要</p>
          <div className="space-y-2">
            {data.notNeeded.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.03 }}
                style={{ background: '#111118', borderRadius: 12, padding: '10px 14px', borderLeft: '4px solid #4ade80', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: '#4ade80', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80' }}>{item.name}</span>
                  <p style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{item.reason}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ background: '#111118', border: '1px solid #222', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
        <Info style={{ width: 14, height: 14, color: '#555', flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>
          この推奨は学術論文に基づく情報提供です。医療行為ではありません。必ず医師・薬剤師にご相談ください。
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { evaluateBiomarkers, getCategoryScore, getBarPosition, getBiomarkerRange, getBiomarkerStatus, BIOMARKER_DEFS } from '../lib/biomarkerEvaluation';
import { getHealthHistory, compareLatestTwo } from '../lib/healthHistory';
import type { BiomarkerEntry, ExtractedBiomarker } from '../types/healthCheck';
import BiomarkerDetail from '../components/BiomarkerDetail';

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'capacitor:'
  ? 'https://bio-performance-app.vercel.app'
  : '';

const PANEL_TOTAL = 75;

const EXCLUDE_KEYS_SET = new Set([
  'height', 'weight', 'bmi', 'bodyfatpct', 'waistcircumference',
  'standardweight', 'obesitydegree', 'visceralfatct',
  'systolicbp', 'diastolicbp', 'bloodpressure',
  'vision', 'eyepressure', 'hearing',
  'fvc', 'fev1', 'fev1ratio', 'vitalcapacity',
  'ecg', 'abi', 'pwv',
]);

const EXCLUDE_LABELS_LIST = [
  '身長', '体重', 'bmi', '肥満', '腹囲', '体脂肪', '内臓脂肪',
  '血圧', '収縮', '拡張', '視力', '眼圧', '聴力',
  '肺活量', '心電図', 'x線', '超音波', '骨密度',
  '尿比重', '尿ph', '尿蛋白', '尿潜血', '尿糖', '尿沈渣', '便',
];

function isBloodTestItem(key: string, label: string): boolean {
  const k = (key || '').toLowerCase().replace(/[_\-\s]/g, '');
  const l = (label || '').toLowerCase();
  if (EXCLUDE_KEYS_SET.has(k)) return false;
  if (EXCLUDE_LABELS_LIST.some(ex => l.includes(ex))) return false;
  return true;
}

const BLOOD_ONLY_FALLBACK = new Set([
  'ldl', 'ldlCholesterol', 'hdl', 'hdlCholesterol',
  'triglycerides', 'tg', 'totalCholesterol', 'nonHdlCholesterol',
  'hba1c', 'glucose', 'bloodSugar', 'fbg', 'insulin', 'homaIr',
  'crp', 'hsCrp', 'homocysteine',
  'ast', 'alt', 'gammaGtp', 'alp', 'ldh', 'che', 'ck',
  'creatinine', 'bun', 'egfr', 'uricAcid',
  'hemoglobin', 'hgb', 'hematocrit', 'rbc', 'wbc', 'platelets',
  'mcv', 'mch', 'mchc', 'rdw',
  'neutrophilPct', 'lymphocytePct', 'eosinophilPct',
  'ferritin', 'iron', 'tibc',
  'vitaminD', 'vitaminB12', 'folate', 'zinc', 'magnesium',
  'tsh', 'ft3', 'ft4', 'tpoAntibody',
  'testosterone', 'freeTestosterone', 'cortisol', 'dheas',
  'estradiol', 'fsh', 'lh',
  'apoB', 'lipoproteinA', 'omega3Index',
  'calcium', 'sodium', 'potassium', 'albumin', 'totalProtein',
  'totalBilirubin', 'directBilirubin',
]);

const COLORS = {
  optimal: '#1DB97D',
  sufficient: '#5a8ccc',
  outOfRange: '#d4913a',
  unavailable: '#2a2a34',
};

/* ------------------------------------------------------------------ */
/*  Extract health data from bloodTestResults if healthCheckData       */
/*  is not available                                                   */
/* ------------------------------------------------------------------ */
function extractHealthDataFromBloodTest(): any {
  try {
    const raw = localStorage.getItem('bloodTestResults');
    if (!raw) return null;
    const bt = JSON.parse(raw);
    if (!bt.markers || bt.markers.length === 0) return null;
    const result: any = {};
    const markers = bt.markers;
    const mapping: Record<string, string[]> = {
      ldlCholesterol: ['LDL', 'LDLコレステロール'],
      hdlCholesterol: ['HDL', 'HDLコレステロール'],
      triglycerides: ['中性脂肪', 'TG'],
      bloodSugar: ['血糖', '空腹時血糖'],
      hba1c: ['HbA1c'],
      ferritin: ['フェリチン'],
      vitaminD: ['ビタミンD', '25(OH)D'],
      crp: ['CRP'],
      hsCrp: ['hs-CRP', '高感度CRP'],
      hemoglobin: ['ヘモグロビン', 'Hb'],
      vitaminB12: ['ビタミンB12', 'B12'],
      zinc: ['亜鉛'],
      tsh: ['TSH'],
      cortisol: ['コルチゾール'],
      testosterone: ['テストステロン'],
    };
    for (const [key, aliases] of Object.entries(mapping)) {
      for (const alias of aliases) {
        const marker = markers.find((m: any) => m.name?.includes(alias));
        if (marker) {
          const n = parseFloat(marker.value);
          if (!isNaN(n)) {
            result[key] = n;
            break;
          }
        }
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Client-side insight generation                                     */
/* ------------------------------------------------------------------ */
function generateInsight(entries: BiomarkerEntry[]): string {
  const outOfRange = entries.filter(e => e.status === 'out_of_range');
  const sufficient = entries.filter(e => e.status === 'sufficient');
  const optimal = entries.filter(e => e.status === 'optimal');
  const measured = entries.filter(e => e.status !== 'unavailable');

  if (outOfRange.length >= 3) {
    const names = outOfRange.slice(0, 3).map(e => e.label).join('・');
    return `${names}など${outOfRange.length}項目が要注意です。サプリ推奨画面で改善プランを確認しましょう。`;
  }
  if (outOfRange.length === 2) {
    const names = outOfRange.map(e => e.label).join('・');
    return `${names}が要注意です。サプリ推奨画面で改善プランを確認しましょう。`;
  }
  if (outOfRange.length === 1) {
    return `${outOfRange[0].label}が要注意です。他の指標は概ね良好な状態です。`;
  }
  if (sufficient.length >= 2) {
    const names = sufficient.slice(0, 2).map(e => e.label).join('・');
    return `要注意項目はありません。${names}などをさらに最適域に近づけましょう。`;
  }
  if (sufficient.length === 1) {
    return `要注意項目はありません。${sufficient[0].label}をさらに最適域に近づけましょう。`;
  }
  if (optimal.length > 0 && outOfRange.length === 0 && sufficient.length === 0) {
    return `測定した${measured.length}項目すべてが最適域です。この状態を維持しましょう。`;
  }
  if (measured.length <= 3) {
    return `現在${measured.length}項目を測定中です。より多くの項目を測定すると精度が上がります。`;
  }
  return `${measured.length}項目を測定しました。詳細はバイオマーカーリストで確認できます。`;
}

/* ------------------------------------------------------------------ */
/*  Inline RangeBar component                                          */
/* ------------------------------------------------------------------ */
function RangeBar({ bioKey, value, compact = false }: { bioKey: string; value: number; compact?: boolean }) {
  const range = getBiomarkerRange(bioKey);
  if (!range) return null;
  const pos = getBarPosition(bioKey, value);
  const h = compact ? 4 : 8;
  const total = range.max - range.min;
  if (total <= 0) return null;

  const lowOutEnd = range.sufficientLow ?? range.optimalLow;
  const sufLowStart = range.sufficientLow;
  const sufHighEnd = range.sufficientHigh;
  const highOutStart = range.sufficientHigh ?? range.optimalHigh;

  const lowOutW = ((lowOutEnd - range.min) / total) * 100;
  const sufLowW = sufLowStart != null ? ((range.optimalLow - sufLowStart) / total) * 100 : 0;
  const optimalW = ((range.optimalHigh - range.optimalLow) / total) * 100;
  const sufHighW = sufHighEnd != null ? ((sufHighEnd - range.optimalHigh) / total) * 100 : 0;
  const highOutW = ((range.max - highOutStart) / total) * 100;

  const segments: { width: number; color: string }[] = [];
  if (lowOutW > 0) segments.push({ width: lowOutW, color: '#3a3018' });
  if (sufLowW > 0) segments.push({ width: sufLowW, color: '#1e3a2e' });
  if (optimalW > 0) segments.push({ width: optimalW, color: '#1DB97D' });
  if (sufHighW > 0) segments.push({ width: sufHighW, color: '#1e3a2e' });
  if (highOutW > 0) segments.push({ width: highOutW, color: '#3a3018' });

  return (
    <div style={{ position: 'relative', width: compact ? 120 : '100%' }}>
      <div style={{ display: 'flex', height: h, borderRadius: h / 2, overflow: 'hidden' }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              width: `${seg.width}%`,
              backgroundColor: seg.color,
              minWidth: 1,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          top: -6,
          left: `${pos}%`,
          transform: 'translateX(-50%)',
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '6px solid #fff',
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sort helpers                                                       */
/* ------------------------------------------------------------------ */
type SortMode = 'oor-first' | 'optimal-first' | 'alpha' | 'delta';

const STATUS_ORDER_OOR: Record<string, number> = {
  out_of_range: 0,
  sufficient: 1,
  optimal: 2,
  unavailable: 3,
};
const STATUS_ORDER_OPT: Record<string, number> = {
  optimal: 0,
  sufficient: 1,
  out_of_range: 2,
  unavailable: 3,
};

function sortEntries(entries: BiomarkerEntry[], mode: SortMode, deltas: Record<string, number>): BiomarkerEntry[] {
  const sorted = [...entries];
  switch (mode) {
    case 'oor-first':
      sorted.sort((a, b) => (STATUS_ORDER_OOR[a.status] ?? 9) - (STATUS_ORDER_OOR[b.status] ?? 9));
      break;
    case 'optimal-first':
      sorted.sort((a, b) => (STATUS_ORDER_OPT[a.status] ?? 9) - (STATUS_ORDER_OPT[b.status] ?? 9));
      break;
    case 'alpha':
      sorted.sort((a, b) => a.label.localeCompare(b.label));
      break;
    case 'delta':
      sorted.sort((a, b) => {
        const da = Math.abs(deltas[a.key] ?? 0);
        const db = Math.abs(deltas[b.key] ?? 0);
        return db - da;
      });
      break;
  }
  return sorted;
}

/* ------------------------------------------------------------------ */
/*  Status badge config                                                */
/* ------------------------------------------------------------------ */
const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  optimal: { bg: '#0d2e24', color: '#1DB97D', label: '\u2713 Optimal' },
  sufficient: { bg: '#1a1f2e', color: '#5a8ccc', label: '\u25CF Sufficient' },
  out_of_range: { bg: '#2a1f0e', color: '#d4913a', label: '! Out of Range' },
  unavailable: { bg: '#1e1e26', color: '#555560', label: '\u2014 未測定' },
};

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */
export default function Analysis() {
  const [, navigate] = useLocation();
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('oor-first');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedBiomarker, setSelectedBiomarker] = useState<BiomarkerEntry | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- Upload handler ---- */
  const handleUploadFile = useCallback(async (file: File) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setUploadError('PDF・PNG・JPGのみ対応しています');
      return;
    }
    setIsAnalyzing(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      const response = await fetch(`${API_BASE}/api/analyze-health-check`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const text = await response.text();
      console.log('API response status:', response.status, 'length:', text.length);
      let result;
      try { result = JSON.parse(text); } catch {
        console.error('JSON parse failed, raw:', text.substring(0, 500));
        throw new Error(`解析結果の読み取りに失敗しました（HTTP ${response.status}）`);
      }
      if (result.success && result.data) {
        try {
          const { saveHealthCheck } = await import('../lib/healthHistory');
          saveHealthCheck(result.data);
        } catch {
          localStorage.setItem('healthCheckData', JSON.stringify(result.data));
        }
        sessionStorage.removeItem('labsInsight');
        sessionStorage.removeItem('supplementsData');
        setShowUpload(false);
        window.location.reload();
      } else {
        throw new Error(result.error || '解析に失敗しました');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setUploadError('タイムアウトしました。再度お試しください');
      } else {
        setUploadError(err instanceof Error ? err.message : '通信エラーが発生しました');
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /* ---- Load data ---- */
  useEffect(() => {
    let data: any = null;
    try {
      const raw = localStorage.getItem('healthCheckData');
      if (raw) data = JSON.parse(raw);
    } catch { /* ignore */ }
    if (!data) {
      data = extractHealthDataFromBloodTest();
    }
    setHealthData(data);
    setLoading(false);
  }, []);

  /* ---- Derived values: display biomarkers (blood test only) ---- */
  const entries = useMemo((): BiomarkerEntry[] => {
    if (!healthData) return [];

    const allBm: ExtractedBiomarker[] | undefined = (healthData as any).allBiomarkers;
    if (allBm && allBm.length > 0) {
      return allBm
        .filter(bm => isBloodTestItem(bm.key, bm.label))
        .map(bm => {
          const knownStatus = getBiomarkerStatus(bm.key, bm.value);
          let status = knownStatus;
          if (status === 'unavailable' && bm.value !== null) {
            status = bm.isAbnormal === true ? 'out_of_range' : bm.isAbnormal === false ? 'optimal' : 'unavailable';
          }
          return {
            key: bm.key,
            label: bm.label,
            value: bm.value,
            unit: bm.unit,
            status,
            category: 'nutrients' as const,
            optimalRange: bm.referenceRange || undefined,
          };
        });
    }

    return evaluateBiomarkers(healthData).filter(e => BLOOD_ONLY_FALLBACK.has(e.key));
  }, [healthData]);

  const score = useMemo(() => getCategoryScore(entries), [entries]);

  const comparison = useMemo(() => compareLatestTwo(), []);

  const deltas = useMemo(() => {
    const d: Record<string, number> = {};
    if (comparison) {
      for (const [key, change] of Object.entries(comparison.changes)) {
        if (change.delta != null) d[key] = change.delta;
      }
    }
    return d;
  }, [comparison]);

  const insight = useMemo(() => generateInsight(entries), [entries]);

  const history = useMemo(() => getHealthHistory(), []);

  const lastUpdatedDate = useMemo(() => {
    if (history.length === 0) return null;
    try {
      const d = new Date(history[0].uploadedAt);
      return `${d.getMonth() + 1}月${d.getDate()}日`;
    } catch {
      return null;
    }
  }, [history]);

  /* ---- Filter + sort ---- */
  const filteredEntries = useMemo(() => {
    let list = entries;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(e => e.label.toLowerCase().includes(q) || e.key.toLowerCase().includes(q));
    }
    return sortEntries(list, sortMode, deltas);
  }, [entries, searchQuery, sortMode, deltas]);

  /* ---- Group entries by status ---- */
  const groupedEntries = useMemo(() => {
    const groups: { status: string; label: string; color: string; entries: BiomarkerEntry[] }[] = [
      { status: 'out_of_range', label: 'Out of Range', color: COLORS.outOfRange, entries: [] },
      { status: 'sufficient', label: 'Sufficient', color: COLORS.sufficient, entries: [] },
      { status: 'optimal', label: 'Optimal', color: COLORS.optimal, entries: [] },
      { status: 'unavailable', label: 'Unavailable', color: COLORS.unavailable, entries: [] },
    ];
    for (const entry of filteredEntries) {
      const group = groups.find(g => g.status === entry.status);
      if (group) group.entries.push(entry);
    }
    return groups.filter(g => g.entries.length > 0);
  }, [filteredEntries]);

  /* ---- Previous value helper ---- */
  const getPreviousValue = useCallback((key: string): number | null => {
    if (!comparison) return null;
    const change = comparison.changes[key];
    return change?.previous ?? null;
  }, [comparison]);

  /* ---- Scroll to biomarker list ---- */
  const scrollToList = useCallback(() => {
    const el = document.getElementById('biomarker-list');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#555', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  /* ---- No data state ---- */
  if (!healthData) {
    return (
      <div style={{ height: '100vh', overflowY: 'auto', background: '#0a0a0f', color: '#fff', padding: '52px 20px 100px' }}>
        <div
          style={{
            background: '#111118',
            border: '1px solid #222',
            borderRadius: 16,
            padding: '40px 24px',
            textAlign: 'center',
            marginTop: 40,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔬</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            血液検査データがありません
          </div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.5 }}>
            健康診断・血液検査の結果をアップロードすると、バイオマーカーの詳細分析が表示されます。
          </div>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              background: '#a78bfa',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '12px 32px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            データをアップロード
          </button>
        </div>
        {/* Upload modal for no-data state */}
        {renderUploadModal()}
        <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); e.target.value = ''; }} />
      </div>
    );
  }

  /* ---- SVG circular gauge calculations ---- */
  const size = 140;
  const sw = 10;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const measured = score.measured;
  const total = PANEL_TOTAL;
  const unmeasured = total - measured;

  const optCount = score.optimal;
  const sufCount = score.sufficient;
  const oorCount = score.outOfRange;

  const optArc = total > 0 ? (optCount / total) * circ : 0;
  const sufArc = total > 0 ? (sufCount / total) * circ : 0;
  const oorArc = total > 0 ? (oorCount / total) * circ : 0;
  const unmArc = total > 0 ? (unmeasured / total) * circ : 0;

  const optOffset = 0;
  const sufOffset = optArc;
  const oorOffset = optArc + sufArc;
  const unmOffset = optArc + sufArc + oorArc;

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */
  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: '#0a0a0f', color: '#fff', padding: '52px 20px 100px' }}>

      {/* ---- Section 1: Header ---- */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Labs Summary</div>
          {lastUpdatedDate && (
            <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>
              Last updated: {lastUpdatedDate}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
            background: 'none', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
        >
          検査結果を更新
        </button>
      </div>

      {/* ---- Section 2: Circular Gauge + Status Numbers ---- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>

        {/* Left: SVG gauge */}
        <div style={{ flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#2a2a34"
              strokeWidth={sw}
            />
            {/* Optimal arc (green) */}
            {optArc > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={COLORS.optimal}
                strokeWidth={sw}
                strokeDasharray={`${optArc} ${circ - optArc}`}
                strokeDashoffset={-optOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            )}
            {/* Sufficient arc (blue) */}
            {sufArc > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={COLORS.sufficient}
                strokeWidth={sw}
                strokeDasharray={`${sufArc} ${circ - sufArc}`}
                strokeDashoffset={-sufOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            )}
            {/* Out of range arc (orange) */}
            {oorArc > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={COLORS.outOfRange}
                strokeWidth={sw}
                strokeDasharray={`${oorArc} ${circ - oorArc}`}
                strokeDashoffset={-oorOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            )}
            {/* Unmeasured arc (gray) */}
            {unmArc > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={COLORS.unavailable}
                strokeWidth={sw}
                strokeDasharray={`${unmArc} ${circ - unmArc}`}
                strokeDashoffset={-unmOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            )}
            {/* Center text */}
            <text
              x={size / 2}
              y={size / 2 - 4}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontSize={24}
              fontWeight={700}
            >
              {measured}/{total}
            </text>
            <text
              x={size / 2}
              y={size / 2 + 18}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#777"
              fontSize={10}
              fontWeight={500}
              letterSpacing={1}
            >
              BIOMARKERS
            </text>
          </svg>
        </div>

        {/* Right: Status numbers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.optimal }} />
            <span style={{ fontSize: 12, color: '#aaa' }}>{'\u2713'} Optimal</span>
            <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 'auto' }}>{optCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.sufficient }} />
            <span style={{ fontSize: 12, color: '#aaa' }}>{'\u25CF'} Sufficient</span>
            <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 'auto' }}>{sufCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.outOfRange }} />
            <span style={{ fontSize: 12, color: '#aaa' }}>! Out of Range</span>
            <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 'auto' }}>{oorCount}</span>
          </div>
          {lastUpdatedDate && (
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
              最終更新：{lastUpdatedDate}
            </div>
          )}
        </div>
      </div>

      {/* ---- Section 3: AI Insight Card ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: '#111118',
          border: '1px solid #222',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
          {insight}
        </div>
      </motion.div>

      {/* ---- Section 4: Search Bar ---- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#111118',
          border: '1px solid #222',
          borderRadius: 14,
          padding: '10px 14px',
          marginBottom: 12,
        }}
      >
        <Search size={16} color="#555" />
        <input
          type="text"
          placeholder="Search for Vitamin D, Cortisol, etc."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: 13,
          }}
        />
      </div>

      {/* ---- Section 5: Filter & Sort Bar ---- */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <button
          onClick={() => setShowSortDropdown(prev => !prev)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#777',
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: 2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 0',
          }}
        >
          <SlidersHorizontal size={12} />
          FILTER & SORT {showSortDropdown ? '\u2227' : '\u2228'}
        </button>
        <AnimatePresence>
          {showSortDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: 28,
                left: 0,
                background: '#181820',
                border: '1px solid #2a2a34',
                borderRadius: 12,
                padding: 6,
                zIndex: 100,
                minWidth: 220,
              }}
            >
              {([
                { key: 'oor-first' as SortMode, label: 'Out of Range \u2192 Optimal' },
                { key: 'optimal-first' as SortMode, label: 'Optimal \u2192 Out of Range' },
                { key: 'alpha' as SortMode, label: 'アルファベット順' },
                { key: 'delta' as SortMode, label: '前回からの変化が大きい順' },
              ]).map(opt => (
                <div
                  key={opt.key}
                  onClick={() => {
                    setSortMode(opt.key);
                    setShowSortDropdown(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: 12,
                    color: sortMode === opt.key ? '#a78bfa' : '#aaa',
                    fontWeight: sortMode === opt.key ? 600 : 400,
                    cursor: 'pointer',
                    borderRadius: 8,
                    background: sortMode === opt.key ? 'rgba(167,139,250,0.08)' : 'transparent',
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- Section 6: Biomarker List ---- */}
      <div id="biomarker-list">
        {groupedEntries.map(group => (
          <div key={group.status} style={{ marginBottom: 20 }}>
            {/* Group header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: group.color }}>
                {group.label}
              </span>
              <span style={{ fontSize: 11, color: '#666' }}>
                {group.entries.length} Biomarker{group.entries.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Biomarker cards */}
            {group.entries.map(entry => {
              const isUnavailable = entry.status === 'unavailable';
              const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.unavailable;

              return (
                <motion.div
                  key={entry.key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => !isUnavailable && setSelectedBiomarker(entry)}
                  style={{
                    background: '#111118',
                    border: '1px solid #1e1e28',
                    borderRadius: 14,
                    padding: '14px 16px',
                    marginBottom: 8,
                    cursor: isUnavailable ? 'default' : 'pointer',
                    opacity: isUnavailable ? 0.5 : 1,
                  }}
                >
                  {/* Top row: label + chevron */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{entry.label}</span>
                    {!isUnavailable && <ChevronRight size={16} color="#555" />}
                  </div>

                  {/* Value row */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                    <span style={{ fontSize: 24, fontWeight: 700 }}>
                      {entry.value !== null && entry.value !== undefined ? entry.value : '\u2014'}
                    </span>
                    {entry.value !== null && entry.value !== undefined && (
                      <span style={{ fontSize: 12, color: '#777' }}>{entry.unit}</span>
                    )}
                  </div>

                  {/* Bottom row: status badge + range bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: cfg.color,
                        background: cfg.bg,
                        padding: '3px 8px',
                        borderRadius: 6,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cfg.label}
                    </span>
                    {!isUnavailable && entry.value !== null && entry.value !== undefined && (
                      <RangeBar bioKey={entry.key} value={entry.value} compact />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ---- BiomarkerDetail modal ---- */}
      <AnimatePresence>
        {selectedBiomarker && (
          <BiomarkerDetail
            entry={selectedBiomarker}
            previousValue={getPreviousValue(selectedBiomarker.key)}
            onClose={() => setSelectedBiomarker(null)}
          />
        )}
      </AnimatePresence>

      {/* ---- Upload modal ---- */}
      {renderUploadModal()}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); e.target.value = ''; }} />
    </div>
  );

  function renderUploadModal() {
    if (!showUpload) return null;
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
        onClick={(e) => { if (e.target === e.currentTarget && !isAnalyzing) { setShowUpload(false); setUploadError(null); } }}
      >
        <div style={{
          background: '#1a1a24', borderRadius: 16,
          padding: 24, width: '100%', maxWidth: 400,
          border: '0.5px solid rgba(255,255,255,0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontWeight: 500, color: '#fff', fontSize: 15 }}>検査結果を更新</span>
            {!isAnalyzing && (
              <button
                onClick={() => { setShowUpload(false); setUploadError(null); }}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            )}
          </div>

          {isAnalyzing ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#8a8a8e', fontSize: 13 }}>
              <div style={{
                width: 32, height: 32, border: '3px solid #1DB97D',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
              }} />
              AIが検査結果を解析中...（30秒ほどかかります）
            </div>
          ) : (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1.5px dashed rgba(255,255,255,0.25)',
                  borderRadius: 12, padding: '32px 16px',
                  textAlign: 'center', cursor: 'pointer',
                  marginBottom: 12, transition: 'border-color 0.15s',
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleUploadFile(file); }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>タップしてファイルを選択</div>
                <div style={{ color: '#8a8a8e', fontSize: 11 }}>PDF・PNG・JPG に対応 / ドラッグ＆ドロップ可</div>
              </div>

              {uploadError && (
                <div style={{
                  background: 'rgba(226,75,74,0.15)', border: '0.5px solid #E24B4A',
                  borderRadius: 8, padding: '10px 12px',
                  color: '#E24B4A', fontSize: 12, marginBottom: 12,
                }}>
                  {uploadError}
                </div>
              )}

              <div style={{ color: '#555', fontSize: 10, textAlign: 'center', lineHeight: 1.5 }}>
                健康診断・血液検査・人間ドック結果に対応
              </div>
            </>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
}

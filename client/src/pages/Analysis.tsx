import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronRight, FileText, Upload, ArrowRight } from 'lucide-react';
import { evaluateBiomarkers, getCategoryScore, getBarPosition, getBiomarkerRange, getBiomarkerStatus, BIOMARKER_DEFS } from '../lib/biomarkerEvaluation';
import { getHealthHistory, compareLatestTwo } from '../lib/healthHistory';
import type { BiomarkerEntry, ExtractedBiomarker } from '../types/healthCheck';
import BiomarkerDetail from '../components/BiomarkerDetail';

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'capacitor:'
  ? 'https://bio-performance-app.vercel.app'
  : '';

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

  /* ---- Derived values ---- */
  const entries = useMemo((): BiomarkerEntry[] => {
    if (!healthData) return [];

    // Use allBiomarkers if available (open-ended extraction)
    const allBm: ExtractedBiomarker[] | undefined = (healthData as any).allBiomarkers;
    if (allBm && allBm.length > 0) {
      return allBm.map(bm => {
        // Use existing evaluation for known keys
        const knownStatus = getBiomarkerStatus(bm.key, bm.value);
        let status = knownStatus;
        if (status === 'unavailable' && bm.value !== null) {
          // Fallback: use isAbnormal flag from extraction
          status = bm.isAbnormal === true ? 'out_of_range' : bm.isAbnormal === false ? 'optimal' : 'unavailable';
        }
        return {
          key: bm.key,
          label: bm.label,
          value: bm.value,
          unit: bm.unit,
          status,
          category: 'nutrients' as const, // default category for display
          optimalRange: bm.referenceRange || undefined,
        };
      });
    }

    // Fallback to predefined evaluation
    return evaluateBiomarkers(healthData);
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
            onClick={() => navigate('/upload')}
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
      </div>
    );
  }

  /* ---- SVG circular gauge calculations ---- */
  const size = 140;
  const sw = 10;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const measured = score.measured;
  const total = score.total;
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
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Labs Summary</div>
        {lastUpdatedDate && (
          <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>
            Last updated: {lastUpdatedDate}
          </div>
        )}
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

      {/* ---- Section 7: Contributing Tests ---- */}
      <div style={{ marginTop: 32, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: 2,
              color: '#777',
            }}
          >
            CONTRIBUTING TESTS
          </span>
          <span
            onClick={() => navigate('/history')}
            style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa', cursor: 'pointer' }}
          >
            HISTORY <ArrowRight size={11} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
          </span>
        </div>

        {history.map(h => {
          const d = new Date(h.uploadedAt);
          const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
          const numKeys = Object.keys(h.data).filter(
            k => !['checkupDate', 'gender', 'abnormalFlags', 'doctorComment', 'overallRating'].includes(k)
              && (h.data as any)[k] !== null
          ).length;

          return (
            <div
              key={h.id}
              onClick={() => navigate('/history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#111118',
                border: '1px solid #1e1e28',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 6,
                cursor: 'pointer',
              }}
            >
              <FileText size={18} color="#555" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Medical checkup ({numKeys}項目)
                </div>
                <div style={{ fontSize: 11, color: '#666' }}>{dateStr}</div>
              </div>
              <ChevronRight size={16} color="#555" />
            </div>
          );
        })}

        {/* Upload banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#111118',
            border: '1px solid #1e1e28',
            borderRadius: 12,
            padding: '14px 14px',
            marginTop: 12,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/upload')}
        >
          <Upload size={18} color="#a78bfa" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Have other tests?</div>
            <div style={{ fontSize: 11, color: '#666' }}>他の検査結果をアップロード</div>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#a78bfa',
              background: 'rgba(167,139,250,0.1)',
              padding: '4px 10px',
              borderRadius: 8,
              letterSpacing: 1,
            }}
          >
            UPLOAD
          </span>
        </div>
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
    </div>
  );
}

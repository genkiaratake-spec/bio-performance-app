import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getLatestHealthCheck } from '../lib/healthHistory';
import { getHighPriorityTests } from '../lib/additionalTestRecommendations';

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
const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'capacitor:'
  ? 'https://bio-performance-app.vercel.app' : '';

const BLOOD_TEST_KEY = 'bloodTestResults';
const HEALTH_DATA_KEY = 'healthCheckData';

function extractHealthDataFromBloodTest(): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(BLOOD_TEST_KEY);
    if (!raw) return null;
    const bt = JSON.parse(raw);
    if (!bt.markers || bt.markers.length === 0) return null;
    const result: Record<string, any> = {};
    const markers: Array<{ name: string; value: string }> = bt.markers;
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
        const marker = markers.find(m => m.name?.includes(alias));
        if (marker) {
          const num = parseFloat(marker.value);
          if (!isNaN(num)) { result[key] = num; break; }
        }
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch { return null; }
}

function loadHealthData(): Record<string, any> | null {
  const latest = getLatestHealthCheck();
  if (latest && (latest.ldlCholesterol || latest.bmi || latest.hemoglobin)) return latest;
  const raw = localStorage.getItem(HEALTH_DATA_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.ldlCholesterol || parsed.bmi || parsed.hemoglobin)) return parsed;
    } catch {}
  }
  return extractHealthDataFromBloodTest();
}

/* ------------------------------------------------------------------ */
/*  Recommend Card                                                     */
/* ------------------------------------------------------------------ */
function RecommendCard({ rec }: { rec: Recommendation }) {
  const borderColor = rec.priority === 'high' ? '#E24B4A'
    : rec.priority === 'medium' ? '#EF9F27'
    : rec.priority === 'low' ? '#1D9E75' : '#555560';
  const gradeColors: Record<string, { bg: string; text: string }> = {
    A: { bg: '#EAF3DE', text: '#3B6D11' },
    B: { bg: '#E6F1FB', text: '#185FA5' },
    C: { bg: '#F1EFE8', text: '#5F5E5A' },
  };
  const gc = gradeColors[rec.grade] || gradeColors.C;

  return (
    <div className="rounded-xl p-4 mb-3 border border-white/8"
      style={{ background: '#111118', borderLeft: `3px solid ${borderColor}` }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{rec.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{rec.dose}</p>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded ml-2 flex-shrink-0"
          style={{ background: gc.bg, color: gc.text }}>
          エビデンス {rec.grade}
        </span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed mb-2">{rec.reason}</p>
      <div className="flex flex-wrap gap-1">
        {rec.trigger && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1a1a28', color: '#888' }}>
            {rec.trigger}
          </span>
        )}
        {rec.retestTiming && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1a1a28', color: '#888' }}>
            再検査: {rec.retestTiming}
          </span>
        )}
      </div>
      {rec.warning && (
        <div className="mt-2 text-xs leading-relaxed px-2 py-1.5 rounded"
          style={{ background: '#FAECE7', color: '#993C1D' }}>
          {rec.warning}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Prefs Form                                                         */
/* ------------------------------------------------------------------ */
function PrefsForm({ onSubmit }: { onSubmit: (p: Preferences) => void }) {
  const [meds, setMeds] = useState<string[]>([]);
  const [life, setLife] = useState<string[]>([]);
  const [syms, setSyms] = useState<string[]>([]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);

  const medList: [string, string][] = [
    ['statin','スタチン系'],['metformin','メトホルミン'],['ppi','PPI（胃薬）'],
    ['warfarin','ワーファリン'],['thyroid','甲状腺薬'],['ace','ACE阻害薬'],
    ['diuretic','利尿薬'],['oc','経口避妊薬'],['steroid','ステロイド'],
  ];
  const lifeList: [string, string][] = [
    ['vegan','菜食主義'],['hightraining','高強度トレーニング'],['sleepbad','慢性睡眠不足'],
    ['stress','高ストレス'],['hashimoto','橋本病'],['apoe4','APOE ε4保有'],
    ['mthfr','MTHFR変異あり'],['over40','40歳以上'],['male','男性'],
    ['pregnant','妊娠中'],['winter','現在冬季'],
  ];
  const symList: [string, string][] = [
    ['fatigue','慢性疲労'],['musclepain','筋肉痛・回復遅延'],['sleepissue','入眠困難'],
    ['anxstress','不安・ストレス'],['brainfog','集中力低下'],['joint','関節痛'],
  ];

  const CheckGroup = ({ list, selected, setSelected }: { list: [string, string][]; selected: string[]; setSelected: (v: string[]) => void }) => (
    <div className="flex flex-wrap gap-2 mb-4">
      {list.map(([val, label]) => (
        <button key={val}
          onClick={() => toggle(selected, setSelected, val)}
          className="text-xs px-3 py-1.5 rounded-full border transition-colors"
          style={{
            background: selected.includes(val) ? '#185FA520' : '#111118',
            borderColor: selected.includes(val) ? '#185FA5' : '#333',
            color: selected.includes(val) ? '#5a8ccc' : '#777',
          }}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: '#0a0a0f', color: '#fff', padding: '52px 20px 100px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>薬剤・ライフスタイル</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
        より正確な推奨のために教えてください（任意）
      </p>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 8 }}>服用中の薬剤</p>
      <CheckGroup list={medList} selected={meds} setSelected={setMeds} />
      <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 8 }}>ライフスタイル・リスク</p>
      <CheckGroup list={lifeList} selected={life} setSelected={setLife} />
      <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 8 }}>気になる症状</p>
      <CheckGroup list={symList} selected={syms} setSelected={setSyms} />
      <button
        onClick={() => onSubmit({ medications: meds, lifestyle: life, symptoms: syms })}
        style={{
          width: '100%', padding: 14, borderRadius: 14, background: '#fff', color: '#000',
          fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', marginTop: 8,
        }}>
        推奨を確認する
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function Supplements() {
  const [, navigate] = useLocation();
  const [healthData, setHealthData] = useState<Record<string, any> | null>(null);
  const [suppData, setSuppData] = useState<SupplementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);

  useEffect(() => {
    const data = loadHealthData();
    if (!data) return;
    setHealthData(data);

    const cached = sessionStorage.getItem('supplementsData');
    const savedPrefs = localStorage.getItem('supplementPreferences');
    if (cached && savedPrefs) {
      try { setSuppData(JSON.parse(cached)); } catch {}
    } else if (savedPrefs) {
      try { fetchSupplements(data, JSON.parse(savedPrefs)); } catch {}
    } else {
      setShowPrefs(true);
    }
  }, []);

  async function fetchSupplements(data: Record<string, any>, preferences: Preferences) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analyze-supplements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          healthData: data,
          medications: preferences.medications || [],
          lifestyle: preferences.lifestyle || [],
          symptoms: preferences.symptoms || [],
        }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setSuppData(result.data);
        sessionStorage.setItem('supplementsData', JSON.stringify(result.data));
      } else if (result.drugAlerts !== undefined || result.recommendations !== undefined) {
        setSuppData(result);
        sessionStorage.setItem('supplementsData', JSON.stringify(result));
      } else {
        setError('推奨データの取得に失敗しました');
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  // No health data
  if (!healthData) {
    return (
      <div style={{ height: '100vh', overflowY: 'auto', background: '#0a0a0f', color: '#fff', padding: '52px 20px 100px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>サプリメント最適化</h1>
        <div style={{ background: '#111118', border: '1px solid #222', borderRadius: 16, padding: '40px 24px', textAlign: 'center', marginTop: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💊</div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>健康診断データがありません</h2>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>
            まず健康診断・血液検査の結果をアップロードしてください。
          </p>
          <button onClick={() => navigate('/analysis')}
            style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            健康診断をアップロード
          </button>
        </div>
      </div>
    );
  }

  // Prefs selection
  if (showPrefs) {
    return <PrefsForm onSubmit={(p) => {
      localStorage.setItem('supplementPreferences', JSON.stringify(p));
      setShowPrefs(false);
      fetchSupplements(healthData, p);
    }} />;
  }

  // Loading
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #222', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 13, color: '#666' }}>推奨を生成中...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: '#0a0a0f', color: '#fff', padding: 20 }}>
        <p style={{ fontSize: 14, color: '#E24B4A', marginBottom: 16 }}>{error}</p>
        <button onClick={() => {
          const p = JSON.parse(localStorage.getItem('supplementPreferences') || '{}');
          fetchSupplements(healthData, p);
        }} style={{ border: '1px solid #333', background: 'none', color: '#fff', borderRadius: 12, padding: '10px 24px', fontSize: 13, cursor: 'pointer' }}>
          再試行
        </button>
      </div>
    );
  }

  if (!suppData) return null;

  const { drugAlerts = [], recommendations = [], notNeeded = [] } = suppData;
  const high = recommendations.filter(r => r.priority === 'high');
  const medium = recommendations.filter(r => r.priority === 'medium');
  const low = recommendations.filter(r => r.priority === 'low');
  const caution = recommendations.filter(r => r.priority === 'caution');
  const highPriorityTests = getHighPriorityTests(healthData as any);

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: '#0a0a0f', color: '#fff', padding: '52px 20px 100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Supplement Optimization</p>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>サプリメント最適化</h1>
        </div>
        <button onClick={() => {
          sessionStorage.removeItem('supplementsData');
          localStorage.removeItem('supplementPreferences');
          setShowPrefs(true);
          setSuppData(null);
        }} style={{ fontSize: 11, color: '#666', background: '#111118', border: '1px solid #222', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
          再解析
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>推奨数</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{recommendations.length}</p>
        </div>
        <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>高優先度</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#E24B4A' }}>{high.length}</p>
        </div>
        <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>薬剤注意</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: drugAlerts.length > 0 ? '#d4913a' : '#1D9E75' }}>{drugAlerts.length}</p>
        </div>
      </div>

      {/* Additional test banner */}
      {highPriorityTests.length >= 3 && (
        <div style={{ background: '#185FA510', border: '1px solid #185FA530', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, color: '#5a8ccc' }}>{highPriorityTests.length}項目を追加測定すると推奨精度が上がります</p>
          <button onClick={() => navigate('/analysis')} style={{ fontSize: 11, color: '#5a8ccc', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>確認→</button>
        </div>
      )}

      {/* Drug alerts */}
      {drugAlerts.map((alert, i) => (
        <div key={i} style={{ background: '#2a1f0e', border: '1px solid #d4913a30', borderRadius: 12, padding: '10px 14px', marginBottom: 8, fontSize: 12, color: '#d4913a', lineHeight: 1.6 }}>
          ⚠️ {alert}
        </div>
      ))}

      {/* Recommendations by priority */}
      {high.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#E24B4A', marginTop: 16, marginBottom: 8 }}>優先度：高</p>
          {high.map((r, i) => <RecommendCard key={`h${i}`} rec={r} />)}
        </>
      )}
      {medium.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#d4913a', marginTop: 16, marginBottom: 8 }}>優先度：中</p>
          {medium.map((r, i) => <RecommendCard key={`m${i}`} rec={r} />)}
        </>
      )}
      {low.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#1D9E75', marginTop: 16, marginBottom: 8 }}>優先度：低</p>
          {low.map((r, i) => <RecommendCard key={`l${i}`} rec={r} />)}
        </>
      )}
      {caution.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#666', marginTop: 16, marginBottom: 8 }}>慎重推奨</p>
          {caution.map((r, i) => <RecommendCard key={`c${i}`} rec={r} />)}
        </>
      )}

      {/* Not needed */}
      {notNeeded.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#555', marginTop: 16, marginBottom: 8 }}>補充不要</p>
          {notNeeded.map((r, i) => (
            <div key={i} style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: 12, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', flexShrink: 0, marginTop: 4 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1D9E75' }}>{r.name}</p>
                <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{r.reason}</p>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Disclaimer */}
      <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: 12, padding: '10px 14px', marginTop: 20, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, flexShrink: 0 }}>ℹ️</span>
        <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>
          この推奨は学術論文に基づく情報提供です。医療行為ではありません。必ず医師・薬剤師にご相談ください。
        </p>
      </div>
    </div>
  );
}

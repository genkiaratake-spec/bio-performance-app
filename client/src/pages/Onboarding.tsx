import { useState, useRef } from 'react';
import { useLocation } from 'wouter';

interface OnboardingData {
  goal: 'muscle' | 'nutrition' | 'diet' | '';
  gender: 'male' | 'female' | '';
  birthYear: string;
  height: string;
  weight: string;
  targetWeight: string;
  activityLevel: 'desk' | 'moderate' | 'active' | '';
  mealsPerDay: '2' | '3' | '4+' | '';
  sleepHours: 'under6' | '6to8' | 'over8' | '';
  dietaryRestrictions: string[];
  dislikedFoods: string[];
  cuisineType: 'japanese' | 'western' | 'chinese' | 'anything' | '';
  eatingOutFrequency: 'homecook' | 'sometimes' | 'mostly' | '';
  cookingTime: '15min' | '30min' | 'flexible' | '';
  dailyCalories: string;
  dailyProtein: string;
  dailyFat: string;
  dailyCarbs: string;
}

const TOTAL = 25;

function calcNutrition(data: OnboardingData) {
  const w = parseFloat(data.weight);
  const h = parseFloat(data.height);
  const age = new Date().getFullYear() - parseInt(data.birthYear || '1990');
  if (!w || !h) return { cal: 2000, protein: 150, fat: 55, carbs: 250 };
  const bmr = data.gender === 'male'
    ? 88.36 + 13.4 * w + 4.8 * h - 5.7 * age
    : 447.6 + 9.2 * w + 3.1 * h - 4.3 * age;
  const actMult = { desk: 1.2, moderate: 1.55, active: 1.725 }[data.activityLevel || 'desk'] ?? 1.2;
  let cal = Math.round(bmr * actMult);
  if (data.goal === 'diet') cal = Math.round(cal * 0.8);
  if (data.goal === 'muscle') cal = Math.round(cal * 1.1);
  const protein = Math.round(w * (data.goal === 'muscle' ? 2.0 : 1.5));
  const fat = Math.round(cal * 0.25 / 9);
  const carbs = Math.round((cal - protein * 4 - fat * 9) / 4);
  return { cal, protein, fat, carbs };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function ChoiceCard({ icon, title, sub, selected, onClick }: {
  icon: string; title: string; sub?: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-4 border transition-all ${
        selected ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-[#111118]'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-white text-sm font-semibold whitespace-pre-line leading-snug">{title}</p>
          {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
        </div>
        <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          selected ? 'border-green-500 bg-green-500' : 'border-white/20'
        }`}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  );
}

function TagButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm border transition-all ${
        selected ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-white/10 bg-[#111118] text-gray-300'
      }`}
    >
      {selected ? '✓ ' : ''}{label}
    </button>
  );
}

function NumberInput({ label, unit, value, onChange, placeholder }: {
  label: string; unit: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="bg-[#111118] border border-white/10 rounded-2xl p-4">
      <p className="text-gray-400 text-xs mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-3xl font-bold focus:outline-none placeholder:text-white/20"
          inputMode="decimal"
        />
        <span className="text-gray-400 text-sm pb-1">{unit}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [uploadState, setUploadState] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<OnboardingData>({
    goal: '', gender: '', birthYear: '', height: '', weight: '', targetWeight: '',
    activityLevel: '', mealsPerDay: '', sleepHours: '',
    dietaryRestrictions: [], dislikedFoods: [], cuisineType: '', eatingOutFrequency: '', cookingTime: '',
    dailyCalories: '', dailyProtein: '', dailyFat: '', dailyCarbs: '',
  });

  const progress = (step / TOTAL) * 100;
  const next = () => step < TOTAL ? setStep(s => s + 1) : finish();
  const back = () => { if (step > 1) setStep(s => s - 1); };
  const set = <K extends keyof OnboardingData>(key: K, val: OnboardingData[K]) =>
    setData(d => ({ ...d, [key]: val }));
  const toggle = (key: 'dietaryRestrictions' | 'dislikedFoods', val: string) =>
    setData(d => ({ ...d, [key]: d[key].includes(val) ? d[key].filter(v => v !== val) : [...d[key], val] }));

  const finish = () => {
    localStorage.setItem('onboardingComplete', 'true');
    localStorage.setItem('userProfile', JSON.stringify(data));
    navigate('/');
  };

  const applyCalc = () => {
    const { cal, protein, fat, carbs } = calcNutrition(data);
    setData(d => ({ ...d, dailyCalories: String(cal), dailyProtein: String(protein), dailyFat: String(fat), dailyCarbs: String(carbs) }));
  };

  const analyzeHealthCheck = async (file: File) => {
    setUploadState('analyzing');
    setUploadError(null);
    try {
      const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'capacitor:'
        ? 'https://bio-performance-app.vercel.app' : '';
      const formData = new FormData();
      formData.append('file', file);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      const response = await fetch(`${API_BASE}/api/analyze-health-check`, {
        method: 'POST', body: formData, signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch {
        setUploadState('error');
        setUploadError('解析に失敗しました');
        return;
      }
      if (result.success) {
        localStorage.setItem('healthCheckData', JSON.stringify(result.data));
        setUploadState('success');
        setTimeout(() => next(), 2000);
      } else {
        setUploadState('error');
        setUploadError(result.error || '解析に失敗しました');
      }
    } catch (err) {
      setUploadState('error');
      setUploadError(err instanceof Error && err.name === 'AbortError'
        ? 'タイムアウトしました。再度お試しください' : '通信エラーが発生しました');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyzeHealthCheck(file);
  };

  /* ---------- Layout ---------- */
  function Layout({ children, canNext = true, onNext = next, nextLabel = '次へ', showBack = true, onSkip }: {
    children: React.ReactNode; canNext?: boolean; onNext?: () => void;
    nextLabel?: string; showBack?: boolean; onSkip?: () => void;
  }) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <div className="px-5 pt-12 pb-4">
          <div className="flex items-center gap-3">
            {showBack && step > 1 && (
              <button onClick={back} className="text-gray-400 text-sm shrink-0">← 戻る</button>
            )}
            <div className="flex-1 bg-[#1a1a2e] rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-gray-500 text-xs shrink-0">{step}/{TOTAL}</span>
          </div>
        </div>
        <div className="flex-1 px-5 pb-4 overflow-y-auto">{children}</div>
        <div className="px-5 pb-10 space-y-2">
          {onSkip && (
            <button onClick={onSkip} className="w-full py-3 text-gray-500 text-sm">スキップ</button>
          )}
          <button
            onClick={onNext}
            disabled={!canNext}
            className={`w-full py-4 rounded-2xl font-semibold text-base transition-all ${
              canNext ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-[#1a1a2e] text-gray-600 cursor-not-allowed'
            }`}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    );
  }

  /* ============================= STEPS ============================= */

  /* -- 1: スプラッシュ -- */
  if (step === 1) return (
    <Layout showBack={false} nextLabel="はじめる">
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center">
        <div className="text-7xl mb-6">🧬</div>
        <h1 className="text-2xl font-bold text-white mb-4 leading-snug">
          あなたの血液データが、<br />最高の食事を<br />教えてくれる
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          健康診断データとAIを組み合わせて、<br />
          あなただけのパーソナライズされた<br />食事プランを作成します。
        </p>
      </div>
    </Layout>
  );

  /* -- 2: 機能紹介：食事撮影 -- */
  if (step === 2) return (
    <Layout showBack={false}>
      <div className="pt-6 text-center">
        <div className="text-5xl mb-4">📸</div>
        <h2 className="text-xl font-bold text-white mb-2">食事を撮影するだけ</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          写真を撮るとAIが瞬時にカロリー・PFCを解析。<br />面倒な入力は一切不要です。
        </p>
        <div className="bg-[#111118] rounded-2xl p-4 border border-white/5 text-left">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🍱</span>
            <div>
              <p className="text-white text-sm font-medium">チキンカレー定食</p>
              <p className="text-green-400 text-xs">健康スコア 78</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['680', 'kcal'], ['32g', 'タンパク質'], ['18g', '脂質']].map(([v, l]) => (
              <div key={l} className="bg-[#1a1a2e] rounded-xl p-2">
                <p className="text-white text-sm font-bold">{v}</p>
                <p className="text-gray-500 text-[10px]">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );

  /* -- 3: 機能紹介：血液データ -- */
  if (step === 3) return (
    <Layout showBack={false}>
      <div className="pt-6 text-center">
        <div className="text-5xl mb-4">🩸</div>
        <h2 className="text-xl font-bold text-white mb-2">健康診断データで個別最適化</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          LDL・血糖値・フェリチンなど<br />あなたの血液データを読み込んで、<br />本当に必要な栄養素を特定します。
        </p>
        <div className="space-y-2">
          {[
            { icon: '📉', label: 'LDLコレステロール高め', tag: '脂質の多い食事を控える', color: 'text-amber-400' },
            { icon: '🔴', label: 'フェリチン低値', tag: '鉄分豊富な食材を推奨', color: 'text-green-400' },
            { icon: '✅', label: 'HbA1c 正常範囲', tag: '血糖管理が良好です', color: 'text-green-400' },
          ].map(item => (
            <div key={item.label} className="bg-[#111118] border border-white/5 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1 text-left">
                <p className="text-white text-xs font-medium">{item.label}</p>
                <p className={`text-xs ${item.color}`}>{item.tag}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );

  /* -- 4: 機能紹介：食材推奨 -- */
  if (step === 4) return (
    <Layout showBack={false}>
      <div className="pt-6 text-center">
        <div className="text-5xl mb-4">🥗</div>
        <h2 className="text-xl font-bold text-white mb-2">あなた専用の食材リスト</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          血液データと目標から、<br />今のあなたに最適な食材と<br />避けるべき食品を自動生成します。
        </p>
        <div className="space-y-2">
          {[
            { icon: '✅', label: 'サーモン', tag: '最適', reason: 'フェリチン改善・オメガ3補給', bg: 'bg-teal-500/10', color: 'text-teal-400' },
            { icon: '✅', label: 'ほうれん草', tag: '最適', reason: '鉄分・葉酸が豊富', bg: 'bg-teal-500/10', color: 'text-teal-400' },
            { icon: '⚠️', label: 'バター・揚げ物', tag: '注意', reason: 'LDL値が高めのため控えめに', bg: 'bg-amber-500/10', color: 'text-amber-400' },
          ].map(item => (
            <div key={item.label} className={`${item.bg} border border-white/5 rounded-xl p-3 flex items-center gap-3`}>
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1 text-left">
                <p className="text-white text-xs font-medium">{item.label}</p>
                <p className="text-gray-400 text-xs">{item.reason}</p>
              </div>
              <span className={`text-xs font-semibold ${item.color}`}>{item.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );

  /* -- 5: 目標選択 -- */
  if (step === 5) return (
    <Layout canNext={!!data.goal}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">あなたの目標</p>
        <h2 className="text-xl font-bold text-white mb-6">最も近い目標を選んでください</h2>
        <div className="space-y-3">
          <ChoiceCard icon="💪" title="筋肉増強・パフォーマンス向上" sub="トレーニング効果を最大化する食事"
            selected={data.goal === 'muscle'} onClick={() => set('goal', 'muscle')} />
          <ChoiceCard icon="🥗" title="栄養バランスを整えたい" sub="不足している栄養素を効率よく補う"
            selected={data.goal === 'nutrition'} onClick={() => set('goal', 'nutrition')} />
          <ChoiceCard icon="🔥" title="ダイエット・体重管理" sub="健康的に体重を落とす食事"
            selected={data.goal === 'diet'} onClick={() => set('goal', 'diet')} />
        </div>
      </div>
    </Layout>
  );

  /* -- 6: 性別 -- */
  if (step === 6) return (
    <Layout canNext={!!data.gender}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">基本プロフィール</p>
        <h2 className="text-xl font-bold text-white mb-6">性別を教えてください</h2>
        <div className="space-y-3">
          <ChoiceCard icon="👨" title="男性" selected={data.gender === 'male'} onClick={() => set('gender', 'male')} />
          <ChoiceCard icon="👩" title="女性" selected={data.gender === 'female'} onClick={() => set('gender', 'female')} />
        </div>
      </div>
    </Layout>
  );

  /* -- 7: 生まれ年 -- */
  if (step === 7) return (
    <Layout canNext={data.birthYear.length === 4 && parseInt(data.birthYear) > 1920}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">基本プロフィール</p>
        <h2 className="text-xl font-bold text-white mb-6">生まれ年を入力してください</h2>
        <NumberInput label="生まれ年" unit="年" value={data.birthYear} onChange={v => set('birthYear', v)} placeholder="1990" />
        {data.birthYear.length === 4 && (
          <p className="text-gray-400 text-sm mt-3 text-center">
            {new Date().getFullYear() - parseInt(data.birthYear)} 歳
          </p>
        )}
      </div>
    </Layout>
  );

  /* -- 8: 身長 -- */
  if (step === 8) return (
    <Layout canNext={parseFloat(data.height) > 100}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">基本プロフィール</p>
        <h2 className="text-xl font-bold text-white mb-6">身長を入力してください</h2>
        <NumberInput label="身長" unit="cm" value={data.height} onChange={v => set('height', v)} placeholder="170" />
      </div>
    </Layout>
  );

  /* -- 9: 体重 -- */
  if (step === 9) return (
    <Layout canNext={parseFloat(data.weight) > 20}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">基本プロフィール</p>
        <h2 className="text-xl font-bold text-white mb-6">現在の体重を入力してください</h2>
        <NumberInput label="体重" unit="kg" value={data.weight} onChange={v => set('weight', v)} placeholder="65" />
        {data.height && data.weight && (
          <p className="text-gray-400 text-sm mt-3 text-center">
            BMI: {(parseFloat(data.weight) / (parseFloat(data.height) / 100) ** 2).toFixed(1)}
          </p>
        )}
      </div>
    </Layout>
  );

  /* -- 10: 目標体重 -- */
  if (step === 10) return (
    <Layout canNext={parseFloat(data.targetWeight) > 20} onSkip={() => { set('targetWeight', data.weight); next(); }}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">基本プロフィール</p>
        <h2 className="text-xl font-bold text-white mb-2">目標体重を入力してください</h2>
        <p className="text-gray-400 text-xs mb-6">現在: {data.weight || '—'} kg</p>
        <NumberInput label="目標体重" unit="kg" value={data.targetWeight} onChange={v => set('targetWeight', v)} placeholder="60" />
      </div>
    </Layout>
  );

  /* -- 11: 活動レベル -- */
  if (step === 11) return (
    <Layout canNext={!!data.activityLevel}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">ライフスタイル</p>
        <h2 className="text-xl font-bold text-white mb-6">日常の活動量はどのくらいですか？</h2>
        <div className="space-y-3">
          <ChoiceCard icon="💻" title="デスクワーク中心" sub="座っている時間が長い"
            selected={data.activityLevel === 'desk'} onClick={() => set('activityLevel', 'desk')} />
          <ChoiceCard icon="🚶" title="適度に動く" sub="週2〜3回の運動や立ち仕事"
            selected={data.activityLevel === 'moderate'} onClick={() => set('activityLevel', 'moderate')} />
          <ChoiceCard icon="🏃" title="活発に動く" sub="毎日運動・肉体労働"
            selected={data.activityLevel === 'active'} onClick={() => set('activityLevel', 'active')} />
        </div>
      </div>
    </Layout>
  );

  /* -- 12: 1日の食事回数 -- */
  if (step === 12) return (
    <Layout canNext={!!data.mealsPerDay}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">ライフスタイル</p>
        <h2 className="text-xl font-bold text-white mb-6">1日に何食食べますか？</h2>
        <div className="space-y-3">
          <ChoiceCard icon="🍽️" title="2食（朝抜きなど）" selected={data.mealsPerDay === '2'} onClick={() => set('mealsPerDay', '2')} />
          <ChoiceCard icon="🍽️🍽️" title="3食（朝・昼・夕）" selected={data.mealsPerDay === '3'} onClick={() => set('mealsPerDay', '3')} />
          <ChoiceCard icon="🍽️🍽️🍽️" title="4食以上（間食含む）" selected={data.mealsPerDay === '4+'} onClick={() => set('mealsPerDay', '4+')} />
        </div>
      </div>
    </Layout>
  );

  /* -- 13: 睡眠時間 -- */
  if (step === 13) return (
    <Layout canNext={!!data.sleepHours}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">ライフスタイル</p>
        <h2 className="text-xl font-bold text-white mb-6">平均の睡眠時間はどのくらいですか？</h2>
        <div className="space-y-3">
          <ChoiceCard icon="😴" title="6時間未満" sub="睡眠が少なめ" selected={data.sleepHours === 'under6'} onClick={() => set('sleepHours', 'under6')} />
          <ChoiceCard icon="😊" title="6〜8時間" sub="標準的な睡眠" selected={data.sleepHours === '6to8'} onClick={() => set('sleepHours', '6to8')} />
          <ChoiceCard icon="🌙" title="8時間以上" sub="たっぷり睡眠" selected={data.sleepHours === 'over8'} onClick={() => set('sleepHours', 'over8')} />
        </div>
      </div>
    </Layout>
  );

  /* -- 14: 食事制限・アレルギー -- */
  if (step === 14) return (
    <Layout onSkip={next}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">食の好みと制限</p>
        <h2 className="text-xl font-bold text-white mb-2">食事制限はありますか？</h2>
        <p className="text-gray-400 text-xs mb-5">該当するものをすべて選択（任意）</p>
        <div className="flex flex-wrap gap-2">
          {['アレルギー（卵）', 'アレルギー（乳製品）', 'アレルギー（小麦）', 'アレルギー（甲殻類）',
            'ベジタリアン', 'ヴィーガン', '宗教的制限（ハラール）', 'グルテンフリー', '糖質制限中',
          ].map(item => (
            <TagButton key={item} label={item}
              selected={data.dietaryRestrictions.includes(item)}
              onClick={() => toggle('dietaryRestrictions', item)} />
          ))}
        </div>
      </div>
    </Layout>
  );

  /* -- 15: 苦手な食材 -- */
  if (step === 15) return (
    <Layout onSkip={next}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">食の好みと制限</p>
        <h2 className="text-xl font-bold text-white mb-2">苦手な食材はありますか？</h2>
        <p className="text-gray-400 text-xs mb-5">該当するものをすべて選択（任意）</p>
        <div className="flex flex-wrap gap-2">
          {['レバー', 'ブロッコリー', 'ほうれん草', '納豆', '魚介類', '生野菜', '辛い食べ物',
            'きのこ類', '豆類', 'パクチー',
          ].map(item => (
            <TagButton key={item} label={item}
              selected={data.dislikedFoods.includes(item)}
              onClick={() => toggle('dislikedFoods', item)} />
          ))}
        </div>
      </div>
    </Layout>
  );

  /* -- 16: 好きな料理ジャンル -- */
  if (step === 16) return (
    <Layout canNext={!!data.cuisineType}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">食の好みと制限</p>
        <h2 className="text-xl font-bold text-white mb-6">好きな料理ジャンルは？</h2>
        <div className="space-y-3">
          <ChoiceCard icon="🍱" title="和食中心" sub="ご飯・味噌汁・魚料理など"
            selected={data.cuisineType === 'japanese'} onClick={() => set('cuisineType', 'japanese')} />
          <ChoiceCard icon="🥩" title="洋食中心" sub="パスタ・肉料理・サラダなど"
            selected={data.cuisineType === 'western'} onClick={() => set('cuisineType', 'western')} />
          <ChoiceCard icon="🍜" title="中華・アジア系" sub="ラーメン・炒め物・カレーなど"
            selected={data.cuisineType === 'chinese'} onClick={() => set('cuisineType', 'chinese')} />
          <ChoiceCard icon="🌍" title="なんでも好き" sub="特にこだわらない"
            selected={data.cuisineType === 'anything'} onClick={() => set('cuisineType', 'anything')} />
        </div>
      </div>
    </Layout>
  );

  /* -- 17: 外食頻度 -- */
  if (step === 17) return (
    <Layout canNext={!!data.eatingOutFrequency}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">食の好みと制限</p>
        <h2 className="text-xl font-bold text-white mb-6">外食・中食の頻度は？</h2>
        <div className="space-y-3">
          <ChoiceCard icon="🏠" title="ほぼ自炊" sub="外食は週1回以下"
            selected={data.eatingOutFrequency === 'homecook'} onClick={() => set('eatingOutFrequency', 'homecook')} />
          <ChoiceCard icon="🍱" title="半々くらい" sub="週3〜4回は外食・コンビニ"
            selected={data.eatingOutFrequency === 'sometimes'} onClick={() => set('eatingOutFrequency', 'sometimes')} />
          <ChoiceCard icon="🍔" title="ほぼ外食" sub="自炊はほとんどしない"
            selected={data.eatingOutFrequency === 'mostly'} onClick={() => set('eatingOutFrequency', 'mostly')} />
        </div>
      </div>
    </Layout>
  );

  /* -- 18: 料理時間 -- */
  if (step === 18) return (
    <Layout canNext={!!data.cookingTime}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">食の好みと制限</p>
        <h2 className="text-xl font-bold text-white mb-6">料理にかけられる時間は？</h2>
        <div className="space-y-3">
          <ChoiceCard icon="⚡" title="15分以内" sub="時短・簡単レシピが中心"
            selected={data.cookingTime === '15min'} onClick={() => set('cookingTime', '15min')} />
          <ChoiceCard icon="⏱️" title="30分程度" sub="標準的な調理時間"
            selected={data.cookingTime === '30min'} onClick={() => set('cookingTime', '30min')} />
          <ChoiceCard icon="👨‍🍳" title="時間はかけられる" sub="本格的な料理も OK"
            selected={data.cookingTime === 'flexible'} onClick={() => set('cookingTime', 'flexible')} />
        </div>
      </div>
    </Layout>
  );

  /* -- 19: 血液データの重要性 -- */
  if (step === 19) return (
    <Layout>
      <div className="pt-6 text-center">
        <div className="text-5xl mb-4">💡</div>
        <h2 className="text-xl font-bold text-white mb-3">もう少しで完了です</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          ここまでの情報でも食事プランを作成できますが、<br />
          <span className="text-white font-medium">健康診断データを追加すると</span><br />
          精度が格段に向上します。
        </p>
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 text-left space-y-3">
          {[
            { icon: '📊', text: '血液データなし：一般的な推奨食材リスト' },
            { icon: '🎯', text: '血液データあり：あなたの数値に基づく完全個別最適化' },
          ].map(item => (
            <div key={item.text} className="flex items-start gap-3">
              <span className="text-xl shrink-0">{item.icon}</span>
              <p className="text-white text-sm leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );

  /* -- 20: 健康診断アップロード（インライン） -- */
  if (step === 20) return (
    <Layout
      nextLabel={uploadState === 'success' ? '次へ →' : '今はスキップする'}
      canNext={true}
      onNext={next}
      showBack={true}
    >
      <h2 className="text-xl font-bold text-white mt-4 mb-2">健康診断をアップロード</h2>
      <p className="text-gray-400 text-sm mb-6">PDF・JPG・PNG形式に対応。後からでも登録できます。</p>

      {/* idle */}
      {uploadState === 'idle' && (
        <label htmlFor="onboarding-health-input" className="cursor-pointer block">
          <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-green-500/50 transition-all">
            <div className="text-4xl mb-3">📤</div>
            <p className="text-white text-sm font-medium mb-1">タップしてファイルを選択</p>
            <p className="text-gray-500 text-xs">PDF・JPG・PNG</p>
          </div>
          <input
            id="onboarding-health-input"
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden' }}
          />
        </label>
      )}

      {/* analyzing */}
      {uploadState === 'analyzing' && (
        <div className="border-2 border-green-500/30 rounded-2xl p-8 text-center bg-green-500/5">
          <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white text-sm font-medium">AIが解析中...</p>
          <p className="text-gray-500 text-xs mt-1">30秒ほどかかる場合があります</p>
        </div>
      )}

      {/* success */}
      {uploadState === 'success' && (
        <div className="border-2 border-green-500/50 rounded-2xl p-8 text-center bg-green-500/10">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-white text-sm font-medium mb-1">解析完了！</p>
          <p className="text-green-400 text-xs">健康診断データが登録されました</p>
          <p className="text-gray-500 text-xs mt-2">次のステップへ自動的に進みます...</p>
        </div>
      )}

      {/* error */}
      {uploadState === 'error' && (
        <div>
          <div className="border-2 border-red-500/30 rounded-2xl p-6 text-center bg-red-500/5 mb-3">
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-red-400 text-sm">{uploadError}</p>
          </div>
          <label htmlFor="onboarding-health-input-retry" className="cursor-pointer block">
            <div className="border border-white/10 rounded-2xl p-4 text-center hover:border-green-500/30 transition-all">
              <p className="text-gray-300 text-sm">再度試す</p>
            </div>
            <input
              id="onboarding-health-input-retry"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden' }}
            />
          </label>
        </div>
      )}

      {uploadState !== 'analyzing' && uploadState !== 'success' && (
        <button onClick={next} className="w-full mt-4 py-3 text-gray-500 text-sm">
          今はスキップする →
        </button>
      )}
    </Layout>
  );

  /* -- 21: プロフィールのまとめ -- */
  if (step === 21) return (
    <Layout nextLabel="カロリー目標を計算する" onNext={() => { applyCalc(); next(); }}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">確認</p>
        <h2 className="text-xl font-bold text-white mb-5">プロフィールの確認</h2>
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-4 space-y-3">
          {[
            { label: '目標', value: data.goal === 'muscle' ? '筋肉増強' : data.goal === 'nutrition' ? '栄養改善' : 'ダイエット' },
            { label: '性別', value: data.gender === 'male' ? '男性' : '女性' },
            { label: '年齢', value: data.birthYear ? `${new Date().getFullYear() - parseInt(data.birthYear)} 歳` : '—' },
            { label: '身長 / 体重', value: `${data.height || '—'} cm / ${data.weight || '—'} kg` },
            { label: '目標体重', value: data.targetWeight ? `${data.targetWeight} kg` : '—' },
            { label: '活動量', value: { desk: 'デスクワーク', moderate: '適度に動く', active: '活発' }[data.activityLevel || 'desk'] ?? '—' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">{row.label}</p>
              <p className="text-white text-sm font-medium">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );

  /* -- 22: カロリー計算結果 -- */
  if (step === 22) {
    const cal = parseInt(data.dailyCalories) || 2000;
    const protein = parseInt(data.dailyProtein) || 150;
    const fat = parseInt(data.dailyFat) || 55;
    const carbs = parseInt(data.dailyCarbs) || 250;
    return (
      <Layout>
        <div className="pt-4">
          <p className="text-green-400 text-xs font-semibold mb-2">カロリー目標</p>
          <h2 className="text-xl font-bold text-white mb-5">あなたの1日の推奨摂取量</h2>
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 mb-4">
            <p className="text-gray-400 text-xs text-center mb-1">推奨カロリー</p>
            <p className="text-white text-4xl font-bold text-center mb-1">{cal.toLocaleString()}</p>
            <p className="text-gray-400 text-xs text-center">kcal / 日</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'タンパク質', value: protein, unit: 'g', color: 'text-orange-400' },
              { label: '脂質', value: fat, unit: 'g', color: 'text-yellow-400' },
              { label: '炭水化物', value: carbs, unit: 'g', color: 'text-teal-400' },
            ].map(item => (
              <div key={item.label} className="bg-[#111118] border border-white/5 rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-gray-500 text-xs">{item.unit}</p>
                <p className="text-gray-400 text-[10px] mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs text-center mt-4 leading-relaxed">
            あとから「プロフィール」で調整できます
          </p>
        </div>
      </Layout>
    );
  }

  /* -- 23: 目標を調整 -- */
  if (step === 23) return (
    <Layout onSkip={next}>
      <div className="pt-4">
        <p className="text-green-400 text-xs font-semibold mb-2">カロリー目標</p>
        <h2 className="text-xl font-bold text-white mb-2">目標を微調整しますか？</h2>
        <p className="text-gray-400 text-xs mb-5">空欄のまま次へ進むと計算値をそのまま使用します</p>
        <div className="space-y-3">
          <NumberInput label="1日のカロリー目標" unit="kcal" value={data.dailyCalories}
            onChange={v => set('dailyCalories', v)} placeholder={data.dailyCalories} />
          <NumberInput label="タンパク質目標" unit="g" value={data.dailyProtein}
            onChange={v => set('dailyProtein', v)} placeholder={data.dailyProtein} />
          <NumberInput label="脂質目標" unit="g" value={data.dailyFat}
            onChange={v => set('dailyFat', v)} placeholder={data.dailyFat} />
          <NumberInput label="炭水化物目標" unit="g" value={data.dailyCarbs}
            onChange={v => set('dailyCarbs', v)} placeholder={data.dailyCarbs} />
        </div>
      </div>
    </Layout>
  );

  /* -- 24: プライバシーと利用規約 -- */
  if (step === 24) return (
    <Layout nextLabel="同意して続ける">
      <div className="pt-6">
        <div className="text-4xl text-center mb-4">🔒</div>
        <h2 className="text-xl font-bold text-white mb-2 text-center">プライバシーについて</h2>
        <p className="text-gray-400 text-xs text-center mb-6">ご利用前にご確認ください</p>
        <div className="space-y-3">
          {[
            { icon: '📱', title: 'データはデバイスに保存', desc: '健康診断データ・プロフィールはお使いのデバイス内のみに保存され、外部サーバーには送信されません。' },
            { icon: '🤖', title: 'AI解析の際の送信', desc: '食事写真・健康診断PDFをAI解析する際のみ、Anthropic社のAPIに送信されます。データは解析後に削除されます。' },
            { icon: '🚫', title: '第三者への提供なし', desc: 'あなたの個人情報・健康データを第三者に販売・提供することはありません。' },
          ].map(item => (
            <div key={item.title} className="bg-[#111118] border border-white/5 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{item.icon}</span>
                <div>
                  <p className="text-white text-sm font-semibold mb-1">{item.title}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );

  /* -- 25: 完了 -- */
  if (step === 25) return (
    <Layout nextLabel="Bio-Performance Lab をはじめる" onNext={finish} showBack={false}>
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center">
        <div className="text-7xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-4">セットアップ完了！</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          あなたの食事プランの準備ができました。<br />
          まずは健康診断データをアップロードするか、<br />
          食事の写真を撮ってみましょう。
        </p>
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 w-full text-left space-y-3">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">次のステップ</p>
          {[
            { icon: '📋', text: '健康診断データをアップロード', sub: '食材推奨の精度が大幅UP' },
            { icon: '📸', text: '食事を撮影して解析', sub: 'AIがカロリー・PFCを瞬時に算出' },
            { icon: '🥗', text: '食材相性レポートを確認', sub: 'あなたに最適な食材を一覧表示' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="text-white text-sm font-medium">{item.text}</p>
                <p className="text-gray-500 text-xs">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );

  return null;
}

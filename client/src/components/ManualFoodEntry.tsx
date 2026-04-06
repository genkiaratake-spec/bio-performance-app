import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── 型定義 ────────────────────────────────────────────────────────────────────
type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealEntry {
  id: string
  time: MealTime
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  // 炭水化物の内訳
  sugar?: number
  fiber?: number
  // 脂質の内訳
  saturatedFat?: number
  cholesterol?: number
  // ミネラル
  iron?: number
  sodium?: number
  potassium?: number
  // その他
  note?: string
  source: 'barcode' | 'manual' | 'photo'
  barcode?: string
  recordedAt: string
}

interface ManualFoodEntryProps {
  onSave: (meal: MealEntry) => void
  onClose: () => void
}

// ── helpers ───────────────────────────────────────────────────────────────────
const MEAL_TIMES: { key: MealTime; label: string }[] = [
  { key: 'breakfast', label: '朝食' },
  { key: 'lunch',     label: '昼食' },
  { key: 'dinner',    label: '夕食' },
  { key: 'snack',     label: '間食' },
]

function guessDefaultTime(): MealTime {
  const h = new Date().getHours()
  if (h >= 6  && h < 10) return 'breakfast'
  if (h >= 11 && h < 14) return 'lunch'
  if (h >= 17 && h < 21) return 'dinner'
  return 'snack'
}

function parseNum(v: string): number {
  const n = parseFloat(v)
  return isNaN(n) || n < 0 ? 0 : n
}

/** 血液検査の不足・高め項目を取得 */
function getBloodHints(): { low: string[]; high: string[] } {
  try {
    const raw = localStorage.getItem('bloodTestResults')
    if (!raw) return { low: [], high: [] }
    const data = JSON.parse(raw)
    const markers: Array<{ name: string; status: string }> = data.markers || []
    return {
      low:  markers.filter(m => m.status === 'low').map(m => m.name),
      high: markers.filter(m => m.status === 'borderline').map(m => m.name),
    }
  } catch { return { low: [], high: [] } }
}

/** 項目名がヒットするキーワードリストを返す */
function matchHint(targets: string[], keywords: string[]): boolean {
  return keywords.some(kw => targets.some(t => t.includes(kw)))
}

// ── コンポーネント ────────────────────────────────────────────────────────────
export default function ManualFoodEntry({ onSave, onClose }: ManualFoodEntryProps) {
  const [mealTime,  setMealTime]  = useState<MealTime>(guessDefaultTime())
  const [name,      setName]      = useState('')
  // 必須 PFC
  const [protein,   setProtein]   = useState('')
  const [fat,       setFat]       = useState('')
  const [carbs,     setCarbs]     = useState('')
  // 詳細
  const [showDetails, setShowDetails] = useState(false)
  // ① 炭水化物内訳
  const [sugar,     setSugar]     = useState('')
  const [fiber,     setFiber]     = useState('')
  // ② 脂質内訳
  const [satFat,    setSatFat]    = useState('')
  const [cholesterol, setCholesterol] = useState('')
  // ③ ミネラル
  const [iron,      setIron]      = useState('')
  const [sodium,    setSodium]    = useState('')
  const [potassium, setPotassium] = useState('')
  // ④ その他
  const [calOverride, setCalOverride] = useState('')
  const [note,      setNote]      = useState('')

  const nameRef = useRef<HTMLInputElement>(null)
  const bloodHints = getBloodHints()

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 350)
    return () => clearTimeout(t)
  }, [])

  const p = parseNum(protein)
  const f = parseNum(fat)
  const c = parseNum(carbs)
  const estimatedCalories = Math.round(p * 4 + f * 9 + c * 4)
  const finalCalories = calOverride !== '' ? parseNum(calOverride) : estimatedCalories

  // 炭水化物内訳バリデーション
  const sugarVal  = parseNum(sugar)
  const fiberVal  = parseNum(fiber)
  const carbsWarn = c > 0 && (sugarVal + fiberVal) > c

  const isValid = name.trim().length > 0 && (p > 0 || f > 0 || c > 0)

  const handleSave = () => {
    if (!isValid) return
    const meal: MealEntry = {
      id:            crypto.randomUUID(),
      time:          mealTime,
      name:          name.trim(),
      calories:      finalCalories,
      protein:       p,
      fat:           f,
      carbs:         c,
      sugar:         sugar   !== '' ? sugarVal              : undefined,
      fiber:         fiber   !== '' ? fiberVal              : undefined,
      saturatedFat:  satFat  !== '' ? parseNum(satFat)      : undefined,
      cholesterol:   cholesterol !== '' ? parseNum(cholesterol) : undefined,
      iron:          iron     !== '' ? parseNum(iron)       : undefined,
      sodium:        sodium   !== '' ? parseNum(sodium)     : undefined,
      potassium:     potassium !== '' ? parseNum(potassium) : undefined,
      note:          note.trim() || undefined,
      source:        'manual',
      recordedAt:    new Date().toISOString(),
    }
    onSave(meal)
  }

  // 血液検査ヒントバッジ
  const ironLow   = matchHint(bloodHints.low,  ['フェリチン', '鉄'])
  const ldlHigh   = matchHint(bloodHints.high, ['LDL', '悪玉コレステロール'])
  const tgHigh    = matchHint(bloodHints.high, ['中性脂肪', 'トリグリセリド'])
  const hba1cHigh = matchHint(bloodHints.high, ['HbA1c', '血糖'])

  return (
    /* ── 外側: フルスクリーン、下揃え ── */
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>

      {/* 背景オーバーレイ（クリックで閉じる） */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />

      {/* モーダル本体（スライドアニメーション） */}
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: 480, alignSelf: 'center', background: '#18181f', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}
      >
        {/* ドラッグハンドル + ヘッダー（固定） */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: '#2a2a35', borderRadius: 2, margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#e8e8f0' }}>食事を手入力</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#7a7a90', fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* スクロールエリア */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 20px 8px' }}>

          {/* 食事タイミング */}
          <div style={{ marginBottom: 18 }}>
            <p style={lbl}>食事タイミング</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {MEAL_TIMES.map(({ key, label }) => {
                const active = mealTime === key
                return (
                  <button key={key} onClick={() => setMealTime(key)} style={{ flex: 1, padding: '9px 4px', borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', border: `1px solid ${active ? '#3dd68c' : '#2a2a35'}`, background: active ? 'rgba(61,214,140,0.12)' : '#1e1e27', color: active ? '#3dd68c' : '#7a7a90', transition: 'all 0.15s' }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 食事名 */}
          <div style={{ marginBottom: 14 }}>
            <p style={lbl}>食事名 *</p>
            <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="例: 鶏むね肉、プロテインバー" style={inp(!!name)}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
          </div>

          {/* PFC 必須 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
            {[
              { label: 'タンパク質 (g)', val: protein, set: setProtein, color: '#3dd68c' },
              { label: '脂質 (g)',       val: fat,     set: setFat,     color: '#fbbf24' },
              { label: '炭水化物 (g)',   val: carbs,   set: setCarbs,   color: '#60a5fa' },
            ].map(({ label, val, set, color }) => (
              <div key={label}>
                <p style={{ ...lbl, color }}>{label}</p>
                <input type="text" inputMode="decimal" value={val} onChange={(e) => set(e.target.value)} placeholder="0" style={inp(parseNum(val) > 0)} />
              </div>
            ))}
          </div>

          {/* 推定カロリー */}
          <p style={{ fontSize: 12, color: '#7a7a90', marginBottom: 16, textAlign: 'right' }}>
            推定カロリー: <span style={{ color: '#a0a0b8', fontWeight: 600 }}>{estimatedCalories} kcal</span>
            <span style={{ color: '#555', marginLeft: 4 }}>(P×4 + F×9 + C×4)</span>
          </p>

          {/* 詳細トグル */}
          <button
            onClick={() => setShowDetails(v => !v)}
            style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#1e1e27', border: `1px dashed ${showDetails ? '#3dd68c50' : '#2a2a35'}`, color: showDetails ? '#3dd68c' : '#7a7a90', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 12, textAlign: 'center', transition: 'all 0.2s' }}
          >
            {showDetails ? '− 詳細を閉じる' : '＋ 詳細を入力（栄養成分・ミネラル）'}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >

                {/* ── ① 炭水化物の内訳 ── */}
                <DetailGroup
                  title={`炭水化物の内訳`}
                  subtitle={c > 0 ? `炭水化物 ${c}g のうち` : undefined}
                  color="#60a5fa"
                  badges={[
                    tgHigh  && { label: '中性脂肪↑ 糖質に注意', color: '#fbbf24' },
                    hba1cHigh && { label: 'HbA1c↑ 糖質管理を', color: '#f87171' },
                  ].filter(Boolean) as Badge[]}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <p style={lbl}>糖質 (g)<span style={hint}>HbA1c・中性脂肪</span></p>
                      <input type="text" inputMode="decimal" value={sugar} onChange={(e) => setSugar(e.target.value)} placeholder="0" style={inp(sugarVal > 0)} />
                    </div>
                    <div>
                      <p style={lbl}>食物繊維 (g)<span style={hint}>血糖・腸内環境</span></p>
                      <input type="text" inputMode="decimal" value={fiber} onChange={(e) => setFiber(e.target.value)} placeholder="0" style={inp(fiberVal > 0)} />
                    </div>
                  </div>
                  {carbsWarn && (
                    <p style={{ fontSize: 11, color: '#fbbf24', marginTop: 6 }}>
                      ⚠️ 糖質＋食物繊維の合計が炭水化物を超えています
                    </p>
                  )}
                </DetailGroup>

                {/* ── ② 脂質の内訳 ── */}
                <DetailGroup
                  title="脂質の内訳"
                  subtitle={f > 0 ? `脂質 ${f}g のうち` : undefined}
                  color="#fbbf24"
                  badges={[
                    ldlHigh && { label: 'LDL↑ 飽和脂肪酸に注意', color: '#f87171' },
                  ].filter(Boolean) as Badge[]}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <p style={lbl}>飽和脂肪酸 (g)<span style={hint}>LDL・動脈硬化</span></p>
                      <input type="text" inputMode="decimal" value={satFat} onChange={(e) => setSatFat(e.target.value)} placeholder="0" style={inp(parseNum(satFat) > 0)} />
                    </div>
                    <div>
                      <p style={lbl}>コレステロール (mg)<span style={hint}>血中コレステロール</span></p>
                      <input type="text" inputMode="decimal" value={cholesterol} onChange={(e) => setCholesterol(e.target.value)} placeholder="0" style={inp(parseNum(cholesterol) > 0)} />
                    </div>
                  </div>
                </DetailGroup>

                {/* ── ③ ミネラル ── */}
                <DetailGroup
                  title="ミネラル"
                  subtitle="血液検査関連"
                  color="#a78bfa"
                  badges={[
                    ironLow && { label: 'フェリチン低め → 鉄分に注目', color: '#3dd68c' },
                  ].filter(Boolean) as Badge[]}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <p style={lbl}>鉄分 (mg)<span style={ironLow ? { ...hint, color: '#3dd68c' } : hint}>フェリチン</span></p>
                      <input type="text" inputMode="decimal" value={iron} onChange={(e) => setIron(e.target.value)} placeholder="0" style={inp(parseNum(iron) > 0, ironLow ? '#3dd68c' : undefined)} />
                    </div>
                    <div>
                      <p style={lbl}>ナトリウム (mg)<span style={hint}>高血圧</span></p>
                      <input type="text" inputMode="decimal" value={sodium} onChange={(e) => setSodium(e.target.value)} placeholder="0" style={inp(parseNum(sodium) > 0)} />
                    </div>
                    <div>
                      <p style={lbl}>カリウム (mg)<span style={hint}>Na/Kバランス</span></p>
                      <input type="text" inputMode="decimal" value={potassium} onChange={(e) => setPotassium(e.target.value)} placeholder="0" style={inp(parseNum(potassium) > 0)} />
                    </div>
                  </div>
                </DetailGroup>

                {/* ── ④ その他 ── */}
                <DetailGroup title="その他" color="#555">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <p style={lbl}>カロリー上書き (kcal)</p>
                      <input type="text" inputMode="decimal" value={calOverride} onChange={(e) => setCalOverride(e.target.value)} placeholder={String(estimatedCalories)} style={inp(calOverride !== '')} />
                      {calOverride !== '' && (
                        <p style={{ fontSize: 10, color: '#7a7a90', marginTop: 3 }}>推定値: {estimatedCalories} kcal</p>
                      )}
                    </div>
                    <div>
                      <p style={lbl}>メモ</p>
                      <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="自由記述" style={{ ...inp(!!note), fontSize: 13 }} autoComplete="off" />
                    </div>
                  </div>
                </DetailGroup>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 保存ボタン（スクロール領域外・常に表示） */}
        <div style={{ padding: '12px 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))', borderTop: '1px solid #2a2a35', background: '#18181f', flexShrink: 0 }}>
          <button
            onClick={handleSave}
            disabled={!isValid}
            style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600, cursor: isValid ? 'pointer' : 'not-allowed', background: isValid ? '#3dd68c' : '#2a2a35', color: isValid ? '#0f0f12' : '#4a4a60', transition: 'all 0.2s' }}
          >
            記録する
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── DetailGroup コンポーネント ─────────────────────────────────────────────────
interface Badge { label: string; color: string }

function DetailGroup({ title, subtitle, color, badges = [], children }: {
  title: string
  subtitle?: string
  color: string
  badges?: Badge[]
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 16, background: '#1a1a23', borderRadius: 12, padding: '14px', border: `1px solid ${color}20` }}>
      {/* グループヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ width: 3, height: 14, background: color, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
        <p style={{ fontSize: 11, fontWeight: 700, color, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ fontSize: 10, color: '#555', margin: 0 }}>{subtitle}</p>
        )}
        {badges.map((b, i) => (
          <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: `${b.color}20`, color: b.color, border: `1px solid ${b.color}40` }}>
            {b.label}
          </span>
        ))}
      </div>
      {children}
    </div>
  )
}

// ── スタイル定数 ──────────────────────────────────────────────────────────────
const lbl: React.CSSProperties = {
  fontSize: 10, color: '#7a7a90', fontWeight: 500, marginBottom: 5, letterSpacing: '0.04em',
  display: 'flex', alignItems: 'center', gap: 4,
}

const hint: React.CSSProperties = {
  fontSize: 9, color: '#444', fontWeight: 400, letterSpacing: 0,
}

function inp(hasValue: boolean, accentColor?: string): React.CSSProperties {
  const accent = accentColor ?? '#3dd68c'
  return {
    width: '100%', padding: '10px 12px',
    background: '#222230',
    border: `1px solid ${hasValue ? `${accent}55` : '#2a2a35'}`,
    borderRadius: 8, color: '#e8e8f0',
    fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }
}

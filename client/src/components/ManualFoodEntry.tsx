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
  fiber?: number
  sodium?: number
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

// ── コンポーネント ────────────────────────────────────────────────────────────
export default function ManualFoodEntry({ onSave, onClose }: ManualFoodEntryProps) {
  const [mealTime, setMealTime]     = useState<MealTime>(guessDefaultTime())
  const [name, setName]             = useState('')
  const [protein, setProtein]       = useState('')
  const [fat, setFat]               = useState('')
  const [carbs, setCarbs]           = useState('')
  const [caloriesOverride, setCaloriesOverride] = useState('')
  const [fiber, setFiber]           = useState('')
  const [sodium, setSodium]         = useState('')
  const [note, setNote]             = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // オープン時にフォーカス
  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 350)
    return () => clearTimeout(t)
  }, [])

  const p = parseNum(protein)
  const f = parseNum(fat)
  const c = parseNum(carbs)
  const estimatedCalories = Math.round(p * 4 + f * 9 + c * 4)
  const finalCalories = caloriesOverride !== '' ? parseNum(caloriesOverride) : estimatedCalories

  const isValid = name.trim().length > 0 && (p > 0 || f > 0 || c > 0)

  const handleSave = () => {
    if (!isValid) return
    const meal: MealEntry = {
      id: crypto.randomUUID(),
      time: mealTime,
      name: name.trim(),
      calories: finalCalories,
      protein: p,
      fat: f,
      carbs: c,
      fiber:   fiber  !== '' ? parseNum(fiber)  : undefined,
      sodium:  sodium !== '' ? parseNum(sodium) : undefined,
      note:    note.trim() || undefined,
      source: 'manual',
      recordedAt: new Date().toISOString(),
    }
    onSave(meal)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          height: '85vh',
          background: '#18181f',
          borderRadius: '16px 16px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ドラッグハンドル */}
        <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2 }} />
        </div>

        {/* ヘッダー */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px 10px',
        }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#e8e8f0', margin: 0 }}>食事を手入力</p>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#7a7a90',
              fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* スクロール可能なコンテンツ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>

          {/* 食事タイミング */}
          <div style={{ marginBottom: 20 }}>
            <p style={labelStyle}>食事タイミング</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {MEAL_TIMES.map(({ key, label }) => {
                const active = mealTime === key
                return (
                  <button
                    key={key}
                    onClick={() => setMealTime(key)}
                    style={{
                      flex: 1, padding: '9px 4px', borderRadius: 8, fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer', border: `1px solid ${active ? '#3dd68c' : '#2a2a35'}`,
                      background: active ? 'rgba(61,214,140,0.12)' : '#1e1e27',
                      color: active ? '#3dd68c' : '#7a7a90',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 食事名 */}
          <div style={{ marginBottom: 14 }}>
            <p style={labelStyle}>食事名 *</p>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 鶏むね肉、プロテインバー"
              style={inputStyle(!!name)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>

          {/* PFC */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            {[
              { label: 'タンパク質 (g)', value: protein, set: setProtein, color: '#3dd68c' },
              { label: '脂質 (g)',       value: fat,     set: setFat,     color: '#fbbf24' },
              { label: '炭水化物 (g)',   value: carbs,   set: setCarbs,   color: '#60a5fa' },
            ].map(({ label, value, set, color }) => (
              <div key={label}>
                <p style={{ ...labelStyle, color }}>{label}</p>
                <input
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder="0"
                  style={inputStyle(parseNum(value) > 0)}
                />
              </div>
            ))}
          </div>

          {/* カロリー自動計算プレビュー */}
          <p style={{ fontSize: 12, color: '#7a7a90', marginBottom: 18, textAlign: 'right' }}>
            推定カロリー:{' '}
            <span style={{ color: '#a0a0b8', fontWeight: 600 }}>
              {estimatedCalories} kcal
            </span>
            <span style={{ color: '#555', marginLeft: 4 }}>(P×4 + F×9 + C×4)</span>
          </p>

          {/* 詳細 (折りたたみ) */}
          <button
            onClick={() => setShowDetails(v => !v)}
            style={{
              width: '100%', padding: '10px', borderRadius: 8,
              background: '#1e1e27', border: '1px dashed #2a2a35',
              color: '#7a7a90', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', marginBottom: 12, textAlign: 'center',
            }}
          >
            {showDetails ? '− 詳細を閉じる' : '＋ 詳細を入力（カロリー・繊維・メモ）'}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'カロリー (kcal)', value: caloriesOverride, set: setCaloriesOverride, ph: String(estimatedCalories) },
                    { label: '食物繊維 (g)',     value: fiber,           set: setFiber,            ph: '0' },
                    { label: 'ナトリウム (mg)',  value: sodium,          set: setSodium,           ph: '0' },
                  ].map(({ label, value, set, ph }) => (
                    <div key={label}>
                      <p style={labelStyle}>{label}</p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        placeholder={ph}
                        style={inputStyle(parseNum(value) > 0)}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 14 }}>
                  <p style={labelStyle}>メモ</p>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="自由記述"
                    style={inputStyle(!!note)}
                    autoComplete="off"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 保存ボタン */}
        <div style={{ padding: '12px 20px 32px', borderTop: '1px solid #222' }}>
          <button
            onClick={handleSave}
            disabled={!isValid}
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: isValid ? '#3dd68c' : '#2a2a35',
              border: 'none',
              color: isValid ? '#0f0f12' : '#4a4a60',
              fontSize: 14, fontWeight: 600,
              cursor: isValid ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            記録する
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── スタイル定数 ──────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: '#7a7a90', fontWeight: 500,
  marginBottom: 5, letterSpacing: '0.04em',
}

function inputStyle(hasValue: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '10px 12px',
    background: '#1e1e27',
    border: `1px solid ${hasValue ? '#3dd68c55' : '#2a2a35'}`,
    borderRadius: 8, color: '#e8e8f0',
    fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }
}

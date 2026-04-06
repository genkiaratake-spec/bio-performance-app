import { useState } from 'react'

// ── 型定義 ────────────────────────────────────────────────────────────────────
export interface MealEntry {
  id: string
  time: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  sugar?: number
  fiber?: number
  saturatedFat?: number
  cholesterol?: number
  sodium?: number
  iron?: number
  note?: string
  source: 'manual'
  recordedAt: string
}

interface ManualFoodEntryProps {
  onSave: (meal: MealEntry) => void
  onClose: () => void
}

// ── コンポーネント ────────────────────────────────────────────────────────────
export default function ManualFoodEntry({ onSave, onClose }: ManualFoodEntryProps) {
  // 時刻から食事タイミングを自動判定
  const getDefaultMealTime = (): MealEntry['time'] => {
    const h = new Date().getHours()
    if (h >= 6  && h < 11) return 'breakfast'
    if (h >= 11 && h < 15) return 'lunch'
    if (h >= 17 && h < 22) return 'dinner'
    return 'snack'
  }

  const [mealTime,     setMealTime]     = useState<MealEntry['time']>(getDefaultMealTime())
  const [name,         setName]         = useState('')
  const [calories,     setCalories]     = useState('')
  const [protein,      setProtein]      = useState('')
  const [fat,          setFat]          = useState('')
  const [carbs,        setCarbs]        = useState('')
  const [sugar,        setSugar]        = useState('')
  const [fiber,        setFiber]        = useState('')
  const [saturatedFat, setSaturatedFat] = useState('')
  const [cholesterol,  setCholesterol]  = useState('')
  const [sodium,       setSodium]       = useState('')
  const [iron,         setIron]         = useState('')
  const [note,         setNote]         = useState('')
  const [showDetails,  setShowDetails]  = useState(false)

  // 推定カロリー計算
  const estimatedCalories = Math.round(
    (parseFloat(protein) || 0) * 4 +
    (parseFloat(fat)     || 0) * 9 +
    (parseFloat(carbs)   || 0) * 4
  )

  // バリデーション
  const isValid =
    name.trim().length > 0 &&
    (
      (parseFloat(protein) || 0) > 0 ||
      (parseFloat(fat)     || 0) > 0 ||
      (parseFloat(carbs)   || 0) > 0
    )

  const handleSave = () => {
    if (!isValid) return
    const meal: MealEntry = {
      id:          crypto.randomUUID(),
      time:        mealTime,
      name:        name.trim(),
      calories:    calories ? Math.round(parseFloat(calories)) : estimatedCalories,
      protein:     Math.round(parseFloat(protein)      || 0),
      fat:         Math.round(parseFloat(fat)          || 0),
      carbs:       Math.round(parseFloat(carbs)        || 0),
      sugar:       sugar        ? parseFloat(sugar)        : undefined,
      fiber:       fiber        ? parseFloat(fiber)        : undefined,
      saturatedFat:saturatedFat ? parseFloat(saturatedFat) : undefined,
      cholesterol: cholesterol  ? parseFloat(cholesterol)  : undefined,
      sodium:      sodium       ? parseFloat(sodium)       : undefined,
      iron:        iron         ? parseFloat(iron)         : undefined,
      note:        note.trim()  || undefined,
      source:      'manual',
      recordedAt:  new Date().toISOString(),
    }
    onSave(meal)
  }

  // ── スタイル定数 ────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: '#1e1e27', border: '1px solid #2a2a35',
    borderRadius: 8, color: '#e8e8f0',
    fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: '#7a7a90', fontWeight: 500,
    marginBottom: 4, display: 'block',
  }

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 11, color: '#4a4a60', fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase' as const,
    marginBottom: 8, marginTop: 16,
  }

  const rowStyle: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 8, marginBottom: 8,
  }

  const mealTimeLabels: Record<MealEntry['time'], string> = {
    breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食',
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* 背景オーバーレイ */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }}
      />

      {/* モーダル本体 */}
      <div style={{
        position: 'relative', background: '#18181f',
        borderRadius: '16px 16px 0 0',
        display: 'flex', flexDirection: 'column',
        maxHeight: '85vh', zIndex: 1,
      }}>

        {/* ── 固定ヘッダー ── */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{
            width: 36, height: 4, background: '#2a2a35',
            borderRadius: 2, margin: '0 auto 12px',
          }} />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16,
          }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#e8e8f0' }}>
              食事を手入力
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none',
                color: '#7a7a90', fontSize: 22, cursor: 'pointer',
                lineHeight: 1, padding: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── スクロール可能なフォーム ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 8px' }}>

          {/* 食事タイミング */}
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>食事タイミング</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setMealTime(t)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8,
                    border: `1px solid ${mealTime === t ? '#3dd68c' : '#2a2a35'}`,
                    background: mealTime === t ? 'rgba(61,214,140,0.12)' : '#1e1e27',
                    color: mealTime === t ? '#3dd68c' : '#7a7a90',
                    fontSize: 12, fontWeight: mealTime === t ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {mealTimeLabels[t]}
                </button>
              ))}
            </div>
          </div>

          {/* 食事名（必須） */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>
              食事名 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              style={inputStyle}
              type="text"
              placeholder="例: 鶏むね肉、プロテインバー、サラダ"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* ── 主要栄養素 ── */}
          <div style={sectionHeaderStyle}>主要栄養素</div>

          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>タンパク質 (g)</label>
              <input
                style={inputStyle} type="text" inputMode="decimal"
                placeholder="0" value={protein}
                onChange={e => setProtein(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>脂質 (g)</label>
              <input
                style={inputStyle} type="text" inputMode="decimal"
                placeholder="0" value={fat}
                onChange={e => setFat(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>炭水化物 (g)</label>
            <input
              style={inputStyle} type="text" inputMode="decimal"
              placeholder="0" value={carbs}
              onChange={e => setCarbs(e.target.value)}
            />
          </div>

          {/* 推定カロリー */}
          {estimatedCalories > 0 && (
            <div style={{ fontSize: 12, color: '#7a7a90', marginBottom: 8, marginTop: 4 }}>
              推定カロリー:{' '}
              <span style={{ color: '#3dd68c', fontWeight: 600 }}>{estimatedCalories} kcal</span>
              　（P×4 + F×9 + C×4）
            </div>
          )}

          {/* ── 詳細セクション（折りたたみ） ── */}
          <button
            onClick={() => setShowDetails(v => !v)}
            style={{
              background: 'none', border: '1px solid #2a2a35',
              borderRadius: 8, color: '#7a7a90', fontSize: 13,
              cursor: 'pointer', padding: '8px 12px',
              width: '100%', textAlign: 'left',
              marginBottom: showDetails ? 0 : 8, fontFamily: 'inherit',
            }}
          >
            {showDetails ? '▲ 詳細を閉じる' : '▼ 詳細を入力（任意）'}
          </button>

          {showDetails && (
            <div style={{ marginTop: 8 }}>
              {/* カロリー手動入力 */}
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>
                  カロリー (kcal)
                  <span style={{ color: '#4a4a60', fontSize: 11 }}>空欄の場合は推定値を使用</span>
                </label>
                <input
                  style={inputStyle} type="text" inputMode="decimal"
                  placeholder={estimatedCalories > 0 ? `${estimatedCalories}（推定）` : '0'}
                  value={calories}
                  onChange={e => setCalories(e.target.value)}
                />
              </div>

              {/* 炭水化物の内訳 */}
              <div style={sectionHeaderStyle}>炭水化物の内訳</div>
              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>糖質 (g)</label>
                  <input style={inputStyle} type="text" inputMode="decimal"
                    placeholder="0" value={sugar} onChange={e => setSugar(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>食物繊維 (g)</label>
                  <input style={inputStyle} type="text" inputMode="decimal"
                    placeholder="0" value={fiber} onChange={e => setFiber(e.target.value)} />
                </div>
              </div>

              {/* 脂質の内訳 */}
              <div style={sectionHeaderStyle}>脂質の内訳</div>
              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>飽和脂肪酸 (g)</label>
                  <input style={inputStyle} type="text" inputMode="decimal"
                    placeholder="0" value={saturatedFat} onChange={e => setSaturatedFat(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>コレステロール (mg)</label>
                  <input style={inputStyle} type="text" inputMode="decimal"
                    placeholder="0" value={cholesterol} onChange={e => setCholesterol(e.target.value)} />
                </div>
              </div>

              {/* ミネラル */}
              <div style={sectionHeaderStyle}>ミネラル</div>
              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>ナトリウム (mg)</label>
                  <input style={inputStyle} type="text" inputMode="decimal"
                    placeholder="0" value={sodium} onChange={e => setSodium(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>鉄分 (mg)</label>
                  <input style={inputStyle} type="text" inputMode="decimal"
                    placeholder="0" value={iron} onChange={e => setIron(e.target.value)} />
                </div>
              </div>

              {/* メモ */}
              <div style={sectionHeaderStyle}>メモ</div>
              <div style={{ marginBottom: 8 }}>
                <input
                  style={inputStyle} type="text"
                  placeholder="自由記述"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* バリデーションメッセージ */}
          {name.trim().length > 0 &&
           (parseFloat(protein) || 0) === 0 &&
           (parseFloat(fat)     || 0) === 0 &&
           (parseFloat(carbs)   || 0) === 0 && (
            <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 8, marginBottom: 4 }}>
              ⚠ タンパク質・脂質・炭水化物のいずれかを入力してください
            </div>
          )}

        </div>
        {/* スクロール領域ここまで */}

        {/* ── 固定フッター: 保存ボタン ── */}
        <div style={{
          padding: '12px 20px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          borderTop: '1px solid #2a2a35',
          background: '#18181f',
          flexShrink: 0,
        }}>
          <button
            onClick={handleSave}
            disabled={!isValid}
            style={{
              width: '100%', padding: 14, borderRadius: 12,
              border: 'none', fontSize: 15, fontWeight: 700,
              cursor: isValid ? 'pointer' : 'not-allowed',
              background: isValid ? '#3dd68c' : '#2a2a35',
              color: isValid ? '#0f0f12' : '#4a4a60',
              transition: 'background 0.2s, color 0.2s',
              fontFamily: 'inherit',
            }}
          >
            記録する
          </button>
        </div>

      </div>
    </div>
  )
}

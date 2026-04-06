import { useState } from 'react'

export interface MealEntry {
  id: string
  time: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber?: number
  sodium?: number
  note?: string
  source: 'manual'
  recordedAt: string
}

interface Props {
  onSave: (meal: MealEntry) => void
  onClose: () => void
}

export default function ManualFoodEntry({ onSave, onClose }: Props) {
  const getDefaultTime = (): MealEntry['time'] => {
    const h = new Date().getHours()
    if (h >= 6 && h < 11) return 'breakfast'
    if (h >= 11 && h < 15) return 'lunch'
    if (h >= 17 && h < 22) return 'dinner'
    return 'snack'
  }

  const [mealTime, setMealTime] = useState<MealEntry['time']>(getDefaultTime())
  const [name, setName]         = useState('')
  const [protein, setProtein]   = useState('')
  const [fat, setFat]           = useState('')
  const [carbs, setCarbs]       = useState('')
  const [calories, setCalories] = useState('')
  const [fiber, setFiber]       = useState('')
  const [sodium, setSodium]     = useState('')
  const [note, setNote]         = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const p = parseFloat(protein) || 0
  const f = parseFloat(fat)     || 0
  const c = parseFloat(carbs)   || 0
  const estimatedCal = Math.round(p * 4 + f * 9 + c * 4)
  const isValid = name.trim().length > 0 && (p > 0 || f > 0 || c > 0)

  const handleSave = () => {
    if (!isValid) return
    onSave({
      id: crypto.randomUUID(),
      time: mealTime,
      name: name.trim(),
      calories: calories ? Math.round(parseFloat(calories)) : estimatedCal,
      protein: Math.round(p),
      fat:     Math.round(f),
      carbs:   Math.round(c),
      fiber:   fiber  ? parseFloat(fiber)  : undefined,
      sodium:  sodium ? parseFloat(sodium) : undefined,
      note:    note.trim() || undefined,
      source: 'manual',
      recordedAt: new Date().toISOString(),
    })
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: '#1e1e27', border: '1px solid #2a2a35',
    borderRadius: 8, color: '#e8e8f0', fontSize: 14,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: 12, color: '#7a7a90', fontWeight: 500,
    marginBottom: 4, display: 'block',
  }
  const TIMES = [
    { key: 'breakfast' as const, label: '朝食' },
    { key: 'lunch'     as const, label: '昼食' },
    { key: 'dinner'    as const, label: '夕食' },
    { key: 'snack'     as const, label: '間食' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      paddingBottom: '80px',
    }}>
      {/* オーバーレイ */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }}
      />

      {/* モーダル本体 */}
      <div style={{
        position: 'relative',
        background: '#18181f',
        borderRadius: '16px 16px 0 0',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(90vh - 80px)',
        marginBottom: '80px',
        overflow: 'hidden',
        zIndex: 1,
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
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#7a7a90',
              fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0,
            }}>✕</button>
          </div>
        </div>

        {/* ── スクロール可能フォーム ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 8px' }}>

          {/* 食事タイミング */}
          <div style={{ marginBottom: 16 }}>
            <div style={lbl}>食事タイミング</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {TIMES.map(t => (
                <button key={t.key} onClick={() => setMealTime(t.key)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontFamily: 'inherit',
                  border: `1px solid ${mealTime === t.key ? '#3dd68c' : '#2a2a35'}`,
                  background: mealTime === t.key ? 'rgba(61,214,140,0.12)' : '#1e1e27',
                  color: mealTime === t.key ? '#3dd68c' : '#7a7a90',
                  fontSize: 12, fontWeight: mealTime === t.key ? 600 : 400, cursor: 'pointer',
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* 食事名（必須） */}
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>食事名 <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              style={inp} type="text"
              placeholder="例: 鶏むね肉、プロテインバー"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>

          {/* 主要栄養素 */}
          <div style={{
            fontSize: 11, color: '#4a4a60', fontWeight: 600,
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
          }}>主要栄養素 *（最低1項目）</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={lbl}>タンパク質 (g)</label>
              <input style={inp} type="text" inputMode="decimal"
                placeholder="0" value={protein} onChange={e => setProtein(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>脂質 (g)</label>
              <input style={inp} type="text" inputMode="decimal"
                placeholder="0" value={fat} onChange={e => setFat(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={lbl}>炭水化物 (g)</label>
            <input style={inp} type="text" inputMode="decimal"
              placeholder="0" value={carbs} onChange={e => setCarbs(e.target.value)} />
          </div>

          {/* 推定カロリー */}
          {estimatedCal > 0 && (
            <div style={{ fontSize: 12, color: '#7a7a90', marginBottom: 8 }}>
              推定カロリー:{' '}
              <span style={{ color: '#3dd68c', fontWeight: 600 }}>{estimatedCal} kcal</span>
            </div>
          )}

          {/* バリデーション警告 */}
          {name.trim().length > 0 && p === 0 && f === 0 && c === 0 && (
            <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 8 }}>
              ⚠ タンパク質・脂質・炭水化物のいずれかを入力してください
            </div>
          )}

          {/* 詳細（折りたたみ） */}
          <button onClick={() => setShowDetails(v => !v)} style={{
            background: 'none', border: '1px solid #2a2a35', borderRadius: 8,
            color: '#7a7a90', fontSize: 13, cursor: 'pointer',
            padding: '8px 12px', width: '100%', textAlign: 'left',
            marginBottom: 8, fontFamily: 'inherit',
          }}>
            {showDetails ? '▲ 詳細を閉じる' : '▼ 詳細を入力（任意）'}
          </button>

          {showDetails && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={lbl}>カロリー上書き (kcal)</label>
                  <input style={inp} type="text" inputMode="decimal"
                    placeholder={estimatedCal > 0 ? `${estimatedCal}（推定）` : '0'}
                    value={calories} onChange={e => setCalories(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>食物繊維 (g)</label>
                  <input style={inp} type="text" inputMode="decimal"
                    placeholder="0" value={fiber} onChange={e => setFiber(e.target.value)} />
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={lbl}>ナトリウム (mg)</label>
                <input style={inp} type="text" inputMode="decimal"
                  placeholder="0" value={sodium} onChange={e => setSodium(e.target.value)} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={lbl}>メモ</label>
                <input style={inp} type="text"
                  placeholder="自由記述" value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </div>
          )}

        </div>
        {/* ── スクロール領域ここまで ── */}

        {/* ── 固定フッター：記録するボタン ── */}
        <div style={{
          padding: '12px 20px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          borderTop: '1px solid #2a2a35',
          background: '#18181f',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            style={{
              display: 'block',
              width: '100%',
              padding: '15px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '15px',
              fontWeight: 700,
              cursor: isValid ? 'pointer' : 'not-allowed',
              background: isValid ? '#3dd68c' : '#2a2a35',
              color: isValid ? '#0f0f12' : '#4a4a60',
              fontFamily: 'inherit',
              transition: 'background 0.2s',
            }}
          >
            {isValid ? '記録する' : '食事名とPFCを入力してください'}
          </button>
        </div>

      </div>
    </div>
  )
}

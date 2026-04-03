import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Camera, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FoodItem {
  name: string;
  amount: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface FoodLogEntry {
  mealName: string;
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  healthScore: number;
  advice: string;
  confidence: 'high' | 'medium' | 'low';
  date: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function groupByDay(logs: FoodLogEntry[]): { dateKey: string; label: string; entries: FoodLogEntry[] }[] {
  const map = new Map<string, FoodLogEntry[]>();
  for (const log of logs) {
    const key = log.date.slice(0, 10); // YYYY-MM-DD
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, entries]) => ({
      dateKey: key,
      label: formatDate(entries[0].date),
      entries: entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }));
}

function scoreColor(score: number) {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#fbbf24';
  return '#f87171';
}

/* ------------------------------------------------------------------ */
/*  Log Entry Card                                                     */
/* ------------------------------------------------------------------ */
function LogCard({ entry, onDelete }: { entry: FoodLogEntry; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background: '#111118', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {/* Score badge */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: '#1a1a28', border: `2px solid ${scoreColor(entry.healthScore)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: scoreColor(entry.healthScore),
        }}>
          {entry.healthScore}
        </div>

        {/* Name + time */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.mealName}
          </p>
          <p style={{ fontSize: 10, color: '#555' }}>{formatTime(entry.date)}</p>
        </div>

        {/* Calories */}
        <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 6 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{entry.totalCalories}</p>
          <p style={{ fontSize: 10, color: '#555' }}>kcal</p>
        </div>

        {expanded
          ? <ChevronUp style={{ width: 14, height: 14, color: '#444', flexShrink: 0 }} />
          : <ChevronDown style={{ width: 14, height: 14, color: '#444', flexShrink: 0 }} />
        }
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1e1e28' }}>
              {/* PFC row */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 12, marginBottom: 10 }}>
                {[
                  { label: 'P', value: entry.totalProtein, color: '#f97316' },
                  { label: 'F', value: entry.totalFat, color: '#fbbf24' },
                  { label: 'C', value: entry.totalCarbs, color: '#60a5fa' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ flex: 1, background: '#0e0e15', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color }}>{value}g</p>
                    <p style={{ fontSize: 10, color: '#555' }}>{label === 'P' ? 'タンパク質' : label === 'F' ? '脂質' : '炭水化物'}</p>
                  </div>
                ))}
              </div>

              {/* Items */}
              {entry.items.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, color: '#444', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>検出した食品</p>
                  {entry.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, marginBottom: 6, borderBottom: i < entry.items.length - 1 ? '1px solid #1a1a22' : 'none' }}>
                      <div>
                        <span style={{ fontSize: 12, color: '#ccc' }}>{item.name}</span>
                        <span style={{ fontSize: 10, color: '#555', marginLeft: 6 }}>{item.amount}</span>
                      </div>
                      <span style={{ fontSize: 12, color: '#888' }}>{item.calories} kcal</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Advice */}
              {entry.advice && (
                <div style={{ background: '#4ade8008', border: '1px solid #4ade8020', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                  <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6 }}>{entry.advice}</p>
                </div>
              )}

              {/* Delete */}
              <button
                onClick={onDelete}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#f87171', fontSize: 11, cursor: 'pointer', padding: 0 }}
              >
                <Trash2 style={{ width: 12, height: 12 }} />
                この記録を削除
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
export default function FoodLog() {
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('foodLogs');
    if (raw) {
      try { setLogs(JSON.parse(raw)); } catch {}
    }
  }, []);

  const deleteEntry = (date: string) => {
    const updated = logs.filter(l => l.date !== date);
    setLogs(updated);
    localStorage.setItem('foodLogs', JSON.stringify(updated));
  };

  const grouped = groupByDay(logs);

  // 今日の合計
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter(l => l.date.slice(0, 10) === todayKey);
  const todayCalories = todayLogs.reduce((s, l) => s + l.totalCalories, 0);
  const todayProtein = todayLogs.reduce((s, l) => s + l.totalProtein, 0);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="stat-label mb-1">Food Log</p>
          <h1 className="text-2xl lg:text-3xl font-bold">食事ログ</h1>
          <p className="text-sm text-muted-foreground mt-1.5">撮影・解析した食事の履歴</p>
        </motion.div>

        {/* 今日のサマリー（ログがある場合のみ） */}
        {todayLogs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            style={{ background: '#111118', border: '1px solid #222', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>今日の合計</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{todayCalories}</span>
                <span style={{ fontSize: 12, color: '#555', marginLeft: 4 }}>kcal</span>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>P {todayProtein}g</p>
                <p style={{ fontSize: 10, color: '#555' }}>{todayLogs.length}食記録済み</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ログがない場合の空状態 */}
        {logs.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            style={{ background: '#111118', border: '1px solid #222', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>食事ログがありません</h2>
            <p style={{ fontSize: 12, color: '#555', marginBottom: 20, lineHeight: 1.7 }}>
              食事を撮影して解析すると、<br />ここに記録が表示されます。
            </p>
            <Link href="/food-scanner">
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#4ade80', color: '#000', border: 'none',
                borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                <Camera style={{ width: 14, height: 14 }} />
                食事を撮影する
              </button>
            </Link>
          </motion.div>
        )}

        {/* 日別ログ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grouped.map(({ dateKey, label, entries }, gi) => (
            <motion.div key={dateKey} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + gi * 0.05 }}>
              {/* 日付ヘッダー */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: dateKey === todayKey ? '#4ade80' : '#aaa' }}>
                  {dateKey === todayKey ? '今日 · ' : ''}{label}
                </p>
                <p style={{ fontSize: 11, color: '#555' }}>
                  {entries.reduce((s, e) => s + e.totalCalories, 0)} kcal
                </p>
              </div>

              {/* エントリーリスト */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entries.map((entry) => (
                  <LogCard
                    key={entry.date}
                    entry={entry}
                    onDelete={() => deleteEntry(entry.date)}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

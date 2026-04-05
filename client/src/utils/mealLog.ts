/* ===================================================================
   mealLog.ts  –  食事記録ユーティリティ
   - MealLogEntry  : 1食分のフラットな記録（Home / FoodScanner が使用）
   - DailyFoodLog  : 日別集計（FoodLog ページが使用）
   90日以上前のデータは自動削除
=================================================================== */

export interface MealLogEntry {
  id: string;
  date: string;          // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealName: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  healthScore: number;
  loggedAt: string;      // ISO timestamp
  source?: 'photo' | 'barcode' | 'manual';
  // 炭水化物の内訳
  fiber?: number;    // 食物繊維 (g)
  sugar?: number;    // 糖質 (g)
  // 脂質の内訳
  saturatedFat?: number;  // 飽和脂肪酸 (g)
  cholesterol?: number;   // コレステロール (mg)
  // ミネラル
  iron?: number;      // 鉄分 (mg)
  sodium?: number;    // ナトリウム (mg)
  potassium?: number; // カリウム (mg)
  // その他
  note?: string;
  barcode?: string;
}

export interface DailyMeal {
  id: string;
  time: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  recordedAt: string;    // ISO timestamp
}

export interface DailyFoodLog {
  date: string;          // YYYY-MM-DD
  totalCalories: number;
  protein: number;
  fat: number;
  carbs: number;
  meals: DailyMeal[];
  score: number;         // 0-100 平均スコア
}

/* ------------------------------------------------------------------ */
/*  Internal keys                                                      */
/* ------------------------------------------------------------------ */
const MEAL_LOG_KEY   = 'mealLog';   // MealLogEntry[] – Home / FoodScanner
const DAILY_LOG_KEY  = 'foodLogs';  // DailyFoodLog[] – FoodLog page

const MAX_DAYS = 90;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function cutoffDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - MAX_DAYS);
  return d.toISOString().split('T')[0];
}

/* ================================================================== */
/*  MealLogEntry API (flat list – used by Home, FoodScanner)          */
/* ================================================================== */

export function getMealLog(): MealLogEntry[] {
  try {
    const raw = localStorage.getItem(MEAL_LOG_KEY);
    if (!raw) return [];
    const all: MealLogEntry[] = JSON.parse(raw);
    // 90日以上古いものを除去
    const cutoff = cutoffDate();
    return all.filter(e => e.date >= cutoff);
  } catch {
    return [];
  }
}

export function getTodayMealLog(): MealLogEntry[] {
  const today = todayStr();
  return getMealLog().filter(e => e.date === today);
}

export function addMealLog(entry: Omit<MealLogEntry, 'id' | 'date' | 'loggedAt'>): MealLogEntry {
  const logs = getMealLog();
  const newEntry: MealLogEntry = {
    ...entry,
    id: Date.now().toString(),
    date: todayStr(),
    loggedAt: new Date().toISOString(),
  };
  logs.push(newEntry);
  localStorage.setItem(MEAL_LOG_KEY, JSON.stringify(logs));

  // DailyFoodLog にも同期
  _syncToDailyLog(newEntry);

  return newEntry;
}

export function deleteMealLog(id: string): void {
  const logs = getMealLog().filter(e => e.id !== id);
  localStorage.setItem(MEAL_LOG_KEY, JSON.stringify(logs));
  // DailyLog 側も再計算
  _rebuildDailyLog(todayStr(), logs.filter(e => e.date === todayStr()));
}

/* ================================================================== */
/*  DailyFoodLog API (day-aggregated – used by FoodLog, Analysis)     */
/* ================================================================== */

export function getDailyLogs(): DailyFoodLog[] {
  try {
    const raw = localStorage.getItem(DAILY_LOG_KEY);
    if (!raw) return [];
    const all: DailyFoodLog[] = JSON.parse(raw);
    const cutoff = cutoffDate();
    return all.filter(d => d.date >= cutoff);
  } catch {
    return [];
  }
}

export function getDailyLogByDate(date: string): DailyFoodLog | null {
  return getDailyLogs().find(d => d.date === date) ?? null;
}

/** 過去 N 日分の DailyFoodLog を返す */
export function getRecentDailyLogs(days: number): DailyFoodLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return getDailyLogs().filter(d => d.date >= cutoffStr);
}

/* ================================================================== */
/*  Summary helpers (used by Home)                                     */
/* ================================================================== */

export function getTodayNutritionSummary() {
  const todayLogs = getTodayMealLog();
  if (todayLogs.length > 0) {
    return {
      totalCalories: Math.round(todayLogs.reduce((s, e) => s + e.totalCalories, 0)),
      totalProtein:  Math.round(todayLogs.reduce((s, e) => s + e.totalProtein,  0)),
      totalFat:      Math.round(todayLogs.reduce((s, e) => s + e.totalFat,      0)),
      totalCarbs:    Math.round(todayLogs.reduce((s, e) => s + e.totalCarbs,    0)),
      mealCount:     todayLogs.length,
    };
  }
  // mealLog にデータがなければ foodLogs からフォールバック
  const dayLog = getDailyLogByDate(todayStr());
  if (dayLog) {
    return {
      totalCalories: Math.round(dayLog.totalCalories),
      totalProtein:  Math.round(dayLog.protein),
      totalFat:      Math.round(dayLog.fat),
      totalCarbs:    Math.round(dayLog.carbs),
      mealCount:     dayLog.meals.length,
    };
  }
  return { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, mealCount: 0 };
}

export function getTodayAverageScore(): number {
  const todayLogs = getTodayMealLog();
  if (todayLogs.length === 0) return 0;
  const scored = todayLogs.filter(e => e.healthScore > 0);
  if (scored.length === 0) return 0;
  return Math.round(scored.reduce((s, e) => s + e.healthScore, 0) / scored.length);
}

/* ================================================================== */
/*  Internal sync: MealLogEntry → DailyFoodLog                        */
/* ================================================================== */

function _syncToDailyLog(entry: MealLogEntry): void {
  const dailyLogs = getDailyLogs();
  const idx = dailyLogs.findIndex(d => d.date === entry.date);

  const newMeal: DailyMeal = {
    id: entry.id,
    time: entry.mealType,
    name: entry.mealName,
    calories: entry.totalCalories,
    protein:  entry.totalProtein,
    fat:      entry.totalFat,
    carbs:    entry.totalCarbs,
    recordedAt: entry.loggedAt,
  };

  if (idx === -1) {
    // 当日エントリがなければ新規作成
    dailyLogs.push({
      date:          entry.date,
      totalCalories: Math.round(entry.totalCalories),
      protein:       Math.round(entry.totalProtein),
      fat:           Math.round(entry.totalFat),
      carbs:         Math.round(entry.totalCarbs),
      meals:         [newMeal],
      score:         entry.healthScore,
    });
  } else {
    const day = dailyLogs[idx];
    day.meals.push(newMeal);
    day.totalCalories = Math.round(day.totalCalories + entry.totalCalories);
    day.protein       = Math.round(day.protein       + entry.totalProtein);
    day.fat           = Math.round(day.fat           + entry.totalFat);
    day.carbs         = Math.round(day.carbs         + entry.totalCarbs);
    // スコアは scored 食事の平均
    const scored = day.meals.filter(m => (m as any).healthScore > 0);
    day.score = entry.healthScore; // 直近スコアを上書き（簡易版）
  }

  // 90日超えを除去して保存
  const cutoff = cutoffDate();
  const pruned = dailyLogs.filter(d => d.date >= cutoff);
  localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(pruned));
}

function _rebuildDailyLog(date: string, entries: MealLogEntry[]): void {
  const dailyLogs = getDailyLogs().filter(d => d.date !== date);
  if (entries.length > 0) {
    const day: DailyFoodLog = {
      date,
      totalCalories: entries.reduce((s, e) => s + e.totalCalories, 0),
      protein:       entries.reduce((s, e) => s + e.totalProtein,  0),
      fat:           entries.reduce((s, e) => s + e.totalFat,      0),
      carbs:         entries.reduce((s, e) => s + e.totalCarbs,    0),
      meals:         entries.map(e => ({
        id: e.id, time: e.mealType, name: e.mealName,
        calories: e.totalCalories, protein: e.totalProtein,
        fat: e.totalFat, carbs: e.totalCarbs, recordedAt: e.loggedAt,
      })),
      score: Math.round(
        entries.filter(e => e.healthScore > 0).reduce((s, e) => s + e.healthScore, 0) /
        Math.max(1, entries.filter(e => e.healthScore > 0).length)
      ),
    };
    dailyLogs.push(day);
  }
  localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(dailyLogs));
}

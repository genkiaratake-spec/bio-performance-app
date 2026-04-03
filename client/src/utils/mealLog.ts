export interface MealLogEntry {
  id: string;
  date: string;        // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealName: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  healthScore: number;
  loggedAt: string;    // ISO timestamp
}

const MEAL_LOG_KEY = 'mealLog';

export function getMealLog(): MealLogEntry[] {
  try {
    const raw = localStorage.getItem(MEAL_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getTodayMealLog(): MealLogEntry[] {
  const today = new Date().toISOString().split('T')[0];
  return getMealLog().filter(entry => entry.date === today);
}

export function addMealLog(entry: Omit<MealLogEntry, 'id' | 'date' | 'loggedAt'>): MealLogEntry {
  const logs = getMealLog();
  const newEntry: MealLogEntry = {
    ...entry,
    id: Date.now().toString(),
    date: new Date().toISOString().split('T')[0],
    loggedAt: new Date().toISOString(),
  };
  logs.push(newEntry);
  localStorage.setItem(MEAL_LOG_KEY, JSON.stringify(logs));
  return newEntry;
}

export function deleteMealLog(id: string): void {
  const logs = getMealLog().filter(e => e.id !== id);
  localStorage.setItem(MEAL_LOG_KEY, JSON.stringify(logs));
}

export function getTodayNutritionSummary() {
  const todayLogs = getTodayMealLog();
  return {
    totalCalories: todayLogs.reduce((sum, e) => sum + e.totalCalories, 0),
    totalProtein:  todayLogs.reduce((sum, e) => sum + e.totalProtein,  0),
    totalFat:      todayLogs.reduce((sum, e) => sum + e.totalFat,      0),
    totalCarbs:    todayLogs.reduce((sum, e) => sum + e.totalCarbs,    0),
    mealCount:     todayLogs.length,
  };
}

export function getTodayAverageScore(): number {
  const todayLogs = getTodayMealLog();
  if (todayLogs.length === 0) return 0;
  const scored = todayLogs.filter(e => e.healthScore > 0);
  if (scored.length === 0) return 0;
  return Math.round(scored.reduce((sum, e) => sum + e.healthScore, 0) / scored.length);
}

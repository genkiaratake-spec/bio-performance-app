import type { HealthCheckData, HealthCheckHistory } from '../types/healthCheck';

const HISTORY_KEY = 'healthCheckHistory';
const LATEST_KEY  = 'healthCheckData';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function saveHealthCheck(data: HealthCheckData, label?: string): HealthCheckHistory {
  const entry: HealthCheckHistory = {
    id: genId(),
    uploadedAt: new Date().toISOString(),
    data,
    label,
  };

  // Save as latest
  localStorage.setItem(LATEST_KEY, JSON.stringify(data));

  // Add to history (max 10)
  let history = getHealthHistory();
  history.unshift(entry);
  if (history.length > 10) history = history.slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  return entry;
}

export function getHealthHistory(): HealthCheckHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getLatestHealthCheck(): HealthCheckData | null {
  try {
    const raw = localStorage.getItem(LATEST_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function deleteHealthCheck(id: string): void {
  let history = getHealthHistory();
  history = history.filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  // If we deleted the latest, update LATEST_KEY
  if (history.length > 0) {
    localStorage.setItem(LATEST_KEY, JSON.stringify(history[0].data));
  } else {
    localStorage.removeItem(LATEST_KEY);
  }
}

export function compareLatestTwo(): {
  current: HealthCheckHistory;
  previous: HealthCheckHistory;
  changes: Record<string, { current: number | null; previous: number | null; delta: number | null }>;
} | null {
  const history = getHealthHistory();
  if (history.length < 2) return null;

  const current = history[0];
  const previous = history[1];

  const numericKeys = Object.keys(current.data).filter(k =>
    k !== 'checkupDate' && k !== 'gender' && k !== 'abnormalFlags' &&
    k !== 'doctorComment' && k !== 'overallRating'
  );

  const changes: Record<string, { current: number | null; previous: number | null; delta: number | null }> = {};

  for (const key of numericKeys) {
    const curVal = (current.data as any)[key];
    const prevVal = (previous.data as any)[key];
    if (curVal !== null && prevVal !== null && typeof curVal === 'number' && typeof prevVal === 'number') {
      const delta = Math.round((curVal - prevVal) * 100) / 100;
      if (delta !== 0) {
        changes[key] = { current: curVal, previous: prevVal, delta };
      }
    }
  }

  return { current, previous, changes };
}

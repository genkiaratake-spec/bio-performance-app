import type { TestPlan, ClinicBooking } from '../types/healthCheck';

const BOOKING_KEY = 'clinicBookings';
const PLAN_KEY    = 'testPlan';

export const PLAN_PRICES: Record<TestPlan, { perTest: number; annual: number; label: string }> = {
  '1': { perTest: 19800, annual: 19800,  label: '年1回' },
  '2': { perTest: 17800, annual: 35600,  label: '年2回' },
  '4': { perTest: 14800, annual: 59200,  label: '年4回' },
  '6': { perTest: 12800, annual: 76800,  label: '年6回' },
};

export const MOCK_CLINICS = [
  { id: '1', name: '青山クリニック',        address: '港区青山',     distance: '0.4km', hours: '月〜土 8:00–18:00', available: true, remaining: undefined as number | undefined },
  { id: '2', name: '渋谷メディカル',        address: '渋谷区道玄坂', distance: '1.2km', hours: '月〜土 9:00–19:00', available: true },
  { id: '3', name: '新宿ウェルネスクリニック', address: '新宿区西新宿', distance: '2.1km', hours: '月〜金 8:30–17:30', available: true, remaining: 2 },
  { id: '4', name: '銀座ヘルスクリニック',    address: '中央区銀座',   distance: '3.5km', hours: '月〜土 9:00–18:00', available: true },
  { id: '5', name: '恵比寿メディカル',       address: '渋谷区恵比寿', distance: '4.2km', hours: '月〜金 8:00–17:00', available: false },
];

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function savePlan(plan: TestPlan): void {
  localStorage.setItem(PLAN_KEY, plan);
}

export function getSavedPlan(): TestPlan | null {
  const raw = localStorage.getItem(PLAN_KEY);
  if (raw && ['1', '2', '4', '6'].includes(raw)) return raw as TestPlan;
  return null;
}

export function saveBooking(booking: Omit<ClinicBooking, 'id'>): ClinicBooking {
  const entry: ClinicBooking = { ...booking, id: genId() };
  const bookings = getBookings();
  bookings.push(entry);
  localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
  return entry;
}

export function getBookings(): ClinicBooking[] {
  try {
    const raw = localStorage.getItem(BOOKING_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function updateBookingStatus(id: string, status: ClinicBooking['status']): void {
  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.id === id);
  if (idx >= 0) {
    bookings[idx].status = status;
    localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
  }
}

export function getRemainingTests(): number {
  const plan = getSavedPlan();
  if (!plan) return 0;
  const total = parseInt(plan);
  const completed = getBookings().filter(b => b.status === 'completed').length;
  return Math.max(0, total - completed);
}

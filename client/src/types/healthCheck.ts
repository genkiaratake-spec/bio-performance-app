export interface HealthCheckData {
  checkupDate: string | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  totalCholesterol: number | null;
  ldlCholesterol: number | null;
  hdlCholesterol: number | null;
  triglycerides: number | null;
  bloodSugar: number | null;
  hba1c: number | null;
  uricAcid: number | null;
  got: number | null;
  gpt: number | null;
  gammaGtp: number | null;
  hemoglobin: number | null;
  vitaminD: number | null;
  ferritin: number | null;
  crp: number | null;
  abnormalFlags: string[];
  doctorComment: string | null;
  overallRating: string | null;
  // Extended biomarkers
  vitaminB12: number | null;
  folate: number | null;
  homocysteine: number | null;
  zinc: number | null;
  omega3Index: number | null;
  tsh: number | null;
  ft3: number | null;
  ft4: number | null;
  tpoAntibody: number | null;
  cortisol: number | null;
  testosterone: number | null;
  homaIr: number | null;
  hsCrp: number | null;
  // Additional biomarkers
  apoB: number | null;
  lipoproteinA: number | null;
  hematocrit: number | null;
  rbc: number | null;
  calcium: number | null;
  dheas: number | null;
  lh: number | null;
  fsh: number | null;
  estradiol: number | null;
}

export type BiomarkerStatus = 'optimal' | 'sufficient' | 'out_of_range' | 'unavailable';

export type HealthCategory =
  | 'metabolism'
  | 'heart'
  | 'hormones'
  | 'inflammation'
  | 'nutrients'
  | 'fitness'
  | 'cognition';

export interface BiomarkerEntry {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  status: BiomarkerStatus;
  category: HealthCategory;
  optimalRange?: string;
}

export const CATEGORY_LABELS: Record<HealthCategory, string> = {
  metabolism: '代謝',
  heart: '心臓・血管',
  hormones: 'ホルモン',
  inflammation: '炎症',
  nutrients: '栄養素',
  fitness: 'フィットネス',
  cognition: '認知パフォーマンス',
};

export interface HealthCheckHistory {
  id: string;
  uploadedAt: string;
  data: HealthCheckData;
  label?: string;
}

export type TestPlan = '1' | '2' | '4' | '6';

export interface ClinicBooking {
  id: string;
  clinicName: string;
  date: string;
  time: string;
  plan: TestPlan;
  status: 'scheduled' | 'completed' | 'cancelled';
}

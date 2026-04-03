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
}

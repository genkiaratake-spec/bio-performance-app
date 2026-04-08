export function getScoreColor(score: number): string {
  if (score >= 70) return '#4ade80'; // 緑
  if (score >= 40) return '#fbbf24'; // 黄
  return '#f87171';                  // 赤
}

export function getScoreLabel(score: number): string {
  if (score >= 70) return '良好';
  if (score >= 40) return '普通';
  return '要改善';
}

export function getScoreTailwind(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

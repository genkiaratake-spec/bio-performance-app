import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { ArrowRight, Info, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { getRecentDailyLogs, DailyFoodLog } from "../utils/mealLog";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Marker {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: "ok" | "borderline" | "low";
  note: string;
}

interface BloodTestResults {
  markers: Marker[];
  overall_assessment: string;
  dietary_advice: string;
  supplements: any[];
  savedAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const STATUS_CONFIG = {
  ok:         { label: "正常",   color: "text-teal",        bg: "bg-teal/10",        border: "border-teal/20" },
  borderline: { label: "要注意", color: "text-amber",       bg: "bg-amber/10",       border: "border-amber/20" },
  low:        { label: "不足",   color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
};

const BLOOD_TEST_KEY = "bloodTestResults";
const INSIGHT_DAYS   = 30;

/* ------------------------------------------------------------------ */
/*  Insight types                                                      */
/* ------------------------------------------------------------------ */
interface Insight {
  icon: string;
  title: string;
  message: string;
  actions: string[];
  color: "amber" | "red" | "teal";
}

/* ------------------------------------------------------------------ */
/*  Insight calculation (rule-based, no API)                           */
/* ------------------------------------------------------------------ */
function calcInsights(markers: Marker[], logs: DailyFoodLog[], userProfile: any): {
  insights: Insight[];
  daysRecorded: number;
} {
  const daysRecorded = logs.length;

  if (daysRecorded === 0) return { insights: [], daysRecorded: 0 };

  const proteinGoal = parseInt(userProfile?.dailyProtein || '150');
  const fatGoal     = parseInt(userProfile?.dailyFat     || '65');
  const carbsGoal   = parseInt(userProfile?.dailyCarbs   || '260');

  // 平均達成率を計算
  const avgProteinPct = logs.reduce((s, d) => s + (proteinGoal > 0 ? (d.protein  / proteinGoal)  * 100 : 100), 0) / daysRecorded;
  const avgFatPct     = logs.reduce((s, d) => s + (fatGoal    > 0 ? (d.fat       / fatGoal)      * 100 : 100), 0) / daysRecorded;
  const avgCarbsPct   = logs.reduce((s, d) => s + (carbsGoal  > 0 ? (d.carbs     / carbsGoal)    * 100 : 100), 0) / daysRecorded;

  const isLow         = (name: string) => markers.some(m => m.status === 'low'       && m.name.includes(name));
  const isBorderline  = (name: string) => markers.some(m => m.status === 'borderline' && m.name.includes(name));

  const insights: Insight[] = [];

  // 鉄・フェリチン
  if (isLow('フェリチン') || isLow('鉄')) {
    if (avgProteinPct < 70) {
      insights.push({
        icon: '🥩', color: 'amber',
        title: '鉄分・タンパク質が不足傾向',
        message: `過去${daysRecorded}日のタンパク質平均達成率は${Math.round(avgProteinPct)}%です。鉄分を含む食品の摂取が少ない傾向があります。`,
        actions: ['赤身牛肉', 'レバー', 'ほうれん草・あさり'],
      });
    } else {
      insights.push({
        icon: '🐟', color: 'amber',
        title: '鉄の吸収率を高める工夫を',
        message: `血液検査でフェリチン/鉄の低下が確認されています。タンパク質の摂取量は十分ですが、非ヘム鉄の吸収を高めるためビタミンCと一緒に摂ることが効果的です。`,
        actions: ['赤身肉（ヘム鉄）', 'ほうれん草＋レモン', '豆腐・豆類'],
      });
    }
  }

  // ビタミンD
  if (isLow('ビタミンD') || isLow('Vitamin D')) {
    insights.push({
      icon: '☀️', color: 'amber',
      title: 'ビタミンD不足を食事で補う',
      message: `血液検査でビタミンDの低下が確認されています。日照不足と合わせて、ビタミンDを含む食品を毎日意識的に摂りましょう。`,
      actions: ['鮭・サバ・イワシ', 'きのこ類（干しシイタケ）', '卵（特に卵黄）'],
    });
  }

  // 中性脂肪
  if (isBorderline('中性脂肪') || isBorderline('トリグリセリド')) {
    if (avgCarbsPct > 120) {
      insights.push({
        icon: '🍚', color: 'red',
        title: '糖質過多の傾向あり',
        message: `過去${daysRecorded}日の炭水化物平均達成率は${Math.round(avgCarbsPct)}%です。糖質の過多が中性脂肪値を上昇させている可能性があります。炭水化物を約${Math.round(avgCarbsPct - 100)}%削減することを目指しましょう。`,
        actions: ['白米→玄米・雑穀米に変更', '菓子・甘い飲料を控える', '野菜・海藻から食べる'],
      });
    }
  }

  // LDL
  if (isBorderline('LDL') || isBorderline('コレステロール')) {
    if (avgFatPct > 120) {
      insights.push({
        icon: '🫀', color: 'red',
        title: '脂質の摂取過多の傾向あり',
        message: `過去${daysRecorded}日の脂質平均達成率は${Math.round(avgFatPct)}%です。飽和脂肪酸の過多がLDLコレステロール上昇に関与している可能性があります。`,
        actions: ['揚げ物を週2回以下に', '肉の脂身・バターを控える', 'オリーブオイル・魚油に置き換える'],
      });
    }
  }

  // 亜鉛・マグネシウム
  if (isLow('亜鉛') || isLow('マグネシウム')) {
    if (avgProteinPct < 80) {
      insights.push({
        icon: '🥜', color: 'teal',
        title: 'ミネラル補給にタンパク質源を増やす',
        message: `過去${daysRecorded}日のタンパク質平均達成率は${Math.round(avgProteinPct)}%です。タンパク質を含む食品を増やすと亜鉛・マグネシウムの改善が期待できます。`,
        actions: ['牡蠣・牛赤身肉', 'ナッツ類（アーモンド・カシューナッツ）', '豆腐・枝豆・レンズ豆'],
      });
    }
  }

  return { insights, daysRecorded };
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function Analysis() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<BloodTestResults | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [daysRecorded, setDaysRecorded] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BLOOD_TEST_KEY);
      if (!raw) { setHasData(false); return; }
      const parsed: BloodTestResults = JSON.parse(raw);
      if (!parsed.markers || parsed.markers.length === 0) { setHasData(false); return; }
      setData(parsed);
      setHasData(true);

      // インサイト計算
      const recentLogs  = getRecentDailyLogs(INSIGHT_DAYS);
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const { insights: calc, daysRecorded: days } = calcInsights(parsed.markers, recentLogs, userProfile);
      setInsights(calc);
      setDaysRecorded(days);
    } catch {
      setHasData(false);
    }
  }, []);

  const okCount         = data?.markers.filter(m => m.status === "ok").length         ?? 0;
  const borderlineCount = data?.markers.filter(m => m.status === "borderline").length ?? 0;
  const lowCount        = data?.markers.filter(m => m.status === "low").length        ?? 0;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="stat-label mb-1">Blood Analysis</p>
          <h1 className="text-2xl lg:text-3xl font-bold">血液検査解析</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            AIによる血液検査データの解析レポートです。
          </p>
        </motion.div>

        {/* Disclaimer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="elevated-card rounded-xl p-3.5 mb-6 flex items-start gap-3">
          <Info className="w-4 h-4 text-teal mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            以下の解析結果は、AIによる解析に基づく<span className="font-medium text-foreground">健康増進・パフォーマンス最適化</span>を目的としたものです。
            医療上の診断・処方ではありません。持病がある場合は必ず医療機関にご相談ください。
          </p>
        </motion.div>

        {/* ── データなし ── */}
        {hasData === false && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="elevated-card rounded-2xl p-10 flex flex-col items-center text-center">
            <div className="text-5xl mb-4">🔬</div>
            <h2 className="text-xl font-bold mb-2">血液検査データが未登録です</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
              まず血液検査結果をアップロードしてください。
              AIがバイオマーカーを解析してこの画面に表示します。
            </p>
            <Button onClick={() => navigate('/upload')} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-11 px-8">
              血液検査をアップロード
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* ── データあり ── */}
        {hasData === true && data && (
          <>
            {/* Summary counts */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "正常",   count: okCount,         colorClass: "text-teal" },
                { label: "要注意", count: borderlineCount, colorClass: "text-amber" },
                { label: "不足",   count: lowCount,        colorClass: "text-destructive" },
              ].map(({ label, count, colorClass }) => (
                <div key={label} className="elevated-card rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${colorClass}`}>{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </motion.div>

            {/* Overall assessment */}
            {data.overall_assessment && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="elevated-card rounded-xl p-4 mb-5 border border-teal/20 bg-teal/5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">総合評価</p>
                <p className="text-sm text-foreground leading-relaxed">{data.overall_assessment}</p>
              </motion.div>
            )}

            {/* Biomarkers list */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="elevated-card rounded-xl p-5 mb-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">バイオマーカー</p>
              <div className="space-y-0">
                {data.markers.map((m, i) => {
                  const sc = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.ok;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + i * 0.03 }}
                      className={`flex items-center justify-between py-3 ${i < data.markers.length - 1 ? "border-b border-border/30" : ""}`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-sm font-semibold text-foreground">{m.name}</p>
                        {m.note && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{m.note}</p>}
                        {m.reference_range && <p className="text-[10px] text-muted-foreground/60 mt-0.5">基準値: {m.reference_range}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {m.value}
                          {m.unit && <span className="text-[10px] font-normal text-muted-foreground ml-1">{m.unit}</span>}
                        </p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${sc.bg} ${sc.color}`}>
                          {sc.label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Dietary advice */}
            {data.dietary_advice && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="elevated-card rounded-xl p-5 mb-6">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">食事アドバイス</p>
                <p className="text-sm text-foreground leading-relaxed">{data.dietary_advice}</p>
              </motion.div>
            )}

            {/* Food × Blood Insights */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-teal" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">食事 × 血液の相関インサイト</p>
              </div>

              {daysRecorded === 0 ? (
                <div className="elevated-card rounded-xl p-5 text-center">
                  <p className="text-2xl mb-2">📊</p>
                  <p className="text-sm font-semibold text-foreground mb-1">食事記録を開始しましょう</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    食事をスキャンして記録することで、血液検査との相関インサイトが生成されます。
                    あと<span className="font-bold text-foreground">{INSIGHT_DAYS}日</span>分の記録が必要です。
                  </p>
                </div>
              ) : daysRecorded < INSIGHT_DAYS && insights.length === 0 ? (
                <div className="elevated-card rounded-xl p-5 text-center">
                  <p className="text-2xl mb-2">📈</p>
                  <p className="text-sm font-semibold text-foreground mb-1">記録を続けるとインサイトが生成されます</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    現在<span className="font-bold text-foreground">{daysRecorded}日</span>分の記録があります。
                    あと<span className="font-bold text-foreground">{INSIGHT_DAYS - daysRecorded}日</span>記録を続けることで、より精度の高いインサイトが得られます。
                  </p>
                </div>
              ) : insights.length === 0 ? (
                <div className="elevated-card rounded-xl p-5 text-center">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-sm font-semibold text-foreground mb-1">食事と血液検査の相関は良好です</p>
                  <p className="text-xs text-muted-foreground">過去{daysRecorded}日の食事記録と血液検査を照合した結果、特に改善が必要な相関は見つかりませんでした。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, i) => {
                    const borderColor = insight.color === 'red' ? 'border-destructive/20' : insight.color === 'amber' ? 'border-amber/20' : 'border-teal/20';
                    const iconBg = insight.color === 'red' ? 'bg-destructive/10' : insight.color === 'amber' ? 'bg-amber/10' : 'bg-teal/10';
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.37 + i * 0.05 }}
                        className={`elevated-card rounded-xl p-4 border ${borderColor}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`text-xl w-9 h-9 flex items-center justify-center rounded-lg shrink-0 ${iconBg}`}>{insight.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground mb-1">{insight.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-2">{insight.message}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {insight.actions.map((action, j) => (
                                <span key={j} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${iconBg} ${insight.color === 'red' ? 'text-destructive' : insight.color === 'amber' ? 'text-amber' : 'text-teal'}`}>
                                  {action}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {daysRecorded < INSIGHT_DAYS && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      ※ あと<span className="font-bold">{INSIGHT_DAYS - daysRecorded}日</span>分の食事記録でさらに精度が上がります
                    </p>
                  )}
                </div>
              )}
            </motion.div>

            {/* CTA */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center">
              <Button onClick={() => navigate('/supplements')} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-semibold px-10 h-11">
                サプリ処方を見る
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

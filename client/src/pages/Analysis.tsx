import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

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

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function Analysis() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<BloodTestResults | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BLOOD_TEST_KEY);
      if (!raw) { setHasData(false); return; }
      const parsed: BloodTestResults = JSON.parse(raw);
      if (!parsed.markers || parsed.markers.length === 0) { setHasData(false); return; }
      setData(parsed);
      setHasData(true);
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

import { motion } from "framer-motion";
import { Link } from "wouter";
import { Bell, ChevronRight, Flame, Moon, Zap, Activity, Apple, Dna } from "lucide-react";

const CIRCUMFERENCE = 2 * Math.PI * 48;

function ScoreRing({
  value,
  label,
  color,
  size = 120,
}: {
  value: number;
  label: string;
  color: string;
  size?: number;
}) {
  const r = 48;
  const offset = CIRCUMFERENCE * (1 - value / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 112 112">
          {/* Track */}
          <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
          {/* Progress */}
          <circle
            cx="56"
            cy="56"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 56 56)"
            style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white leading-none">{value}</span>
          <span className="text-[9px] text-white/40 mt-0.5 uppercase tracking-widest">%</span>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">{label}</span>
    </div>
  );
}

const metrics = [
  { label: "HRV", value: "62ms", trend: "+4", positive: true },
  { label: "Resting HR", value: "54bpm", trend: "-2", positive: true },
  { label: "Calories", value: "2,140", trend: "87%", positive: true },
  { label: "Protein", value: "142g", trend: "94%", positive: true },
];

const activities = [
  { icon: Moon, label: "Sleep", value: "7h 24m", sub: "2 disturbances", color: "#4A9EFF" },
  { icon: Zap, label: "Recovery", value: "82%", sub: "Optimal", color: "#00FF87" },
  { icon: Flame, label: "Strain", value: "14.2", sub: "Moderate", color: "#FF6B35" },
];

const quickLinks = [
  { href: "/food-scanner", icon: Apple, label: "Food Scanner", desc: "Scan your meal" },
  { href: "/analysis", icon: Dna, label: "Analysis", desc: "View biomarkers" },
];

export default function Home() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">{dateStr}</p>
          <h1 className="text-lg font-bold text-white">おはようございます 👋</h1>
        </div>
        <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center relative">
          <Bell className="w-4 h-4 text-white/70" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#00FF87]" />
        </button>
      </div>

      {/* 3 Score Rings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-4 mt-2 rounded-2xl bg-[#0f0f0f] border border-white/6 px-4 py-6"
      >
        <div className="flex items-center justify-around">
          <ScoreRing value={75} label="Sleep" color="#4A9EFF" />
          <ScoreRing value={82} label="Recovery" color="#00FF87" size={136} />
          <ScoreRing value={65} label="Strain" color="#FF6B35" />
        </div>

        {/* Activity strip */}
        <div className="flex gap-2 mt-5">
          {activities.map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="flex-1 rounded-xl bg-white/4 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3" style={{ color }} />
                <span className="text-[10px] text-white/50 uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-sm font-bold text-white leading-none">{value}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-4 mt-3 grid grid-cols-4 gap-2"
      >
        {metrics.map(({ label, value, trend, positive }) => (
          <div key={label} className="rounded-xl bg-[#0f0f0f] border border-white/6 px-2.5 py-3">
            <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xs font-bold text-white leading-none">{value}</p>
            <p className={`text-[10px] mt-1 font-medium ${positive ? "text-[#00FF87]" : "text-red-400"}`}>{trend}</p>
          </div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mx-4 mt-3 grid grid-cols-2 gap-2"
      >
        {quickLinks.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <div className="rounded-xl bg-[#0f0f0f] border border-white/6 p-4 flex items-center gap-3 active:bg-white/5 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#00FF87]/10 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-[#00FF87]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">{label}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{desc}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/20 ml-auto shrink-0" />
            </div>
          </Link>
        ))}
      </motion.div>

      {/* Today's Insight */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mx-4 mt-3"
      >
        <div className="rounded-xl border border-[#00FF87]/20 bg-[#00FF87]/5 px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-[#00FF87]" />
            <span className="text-[10px] font-semibold text-[#00FF87] uppercase tracking-widest">Today's Insight</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            回復スコアが高い今日は高強度トレーニングに最適です。タンパク質摂取を
            <span className="text-white font-semibold"> 150g</span> 目標にすることで筋合成を最大化できます。
          </p>
        </div>
      </motion.div>

      {/* Upload CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mx-4 mt-3"
      >
        <Link href="/upload">
          <div className="rounded-xl bg-[#00FF87] px-4 py-4 flex items-center gap-3 active:opacity-90 transition-opacity">
            <div className="flex-1">
              <p className="text-xs font-bold text-black">血液・DNAデータをアップロード</p>
              <p className="text-[10px] text-black/60 mt-0.5">最新の検査結果でインサイトを更新</p>
            </div>
            <ChevronRight className="w-4 h-4 text-black/60 shrink-0" />
          </div>
        </Link>
      </motion.div>
    </div>
  );
}

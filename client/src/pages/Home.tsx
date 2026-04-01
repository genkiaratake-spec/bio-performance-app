import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, FlaskConical, Dna, UtensilsCrossed, Pill, Activity, Shield, ScanLine, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663494339540/PZWieBELV22uisfpiZwnXE/hero-bg-mU4kbkuAZM5BS9tSLcfcRc.webp";
const BLOOD_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663494339540/PZWieBELV22uisfpiZwnXE/blood-test-abstract-ehCZsVa2iJc2iLoZYXfPt8.webp";
const MEAL_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663494339540/PZWieBELV22uisfpiZwnXE/meal-hero-2ohFe5Z9yFxLm54bXgbnWk.webp";

const features = [
  {
    icon: Dna,
    title: "DNA・血液データ解析",
    description: "遺伝子検査と血液検査の結果をAIが統合解析。あなたの体質と現在の状態を可視化します。",
    accent: "teal",
  },
  {
    icon: ScanLine,
    title: "AIフードスキャナー",
    description: "食事の写真を撮るだけでAIがカロリー・栄養素を自動解析。血液・DNAデータと照合し、不足栄養素や注意成分をフラグします。",
    accent: "amber",
  },
  {
    icon: UtensilsCrossed,
    title: "パーソナライズ・ミールプラン",
    description: "あなたのバイオデータに基づき、最適なメニューをAIが自動提案。毎週更新されるあなた専用の食事プランを提供します。",
    accent: "teal",
  },
  {
    icon: Pill,
    title: "サプリメント最適化",
    description: "不足している栄養素を特定し、あなたに必要なサプリメントを科学的根拠に基づき提案。",
    accent: "amber",
  },
  {
    icon: Activity,
    title: "パフォーマンス・トラッキング",
    description: "食事と仕事の集中力・睡眠の質の相関を記録。継続的な改善を見える化します。",
    accent: "teal",
  },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } } };

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="relative min-h-screen flex items-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="relative z-10 container mx-auto px-6 lg:px-12 py-32">
          <div className="max-w-2xl">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-8">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center glow-teal">
                  <FlaskConical className="w-4.5 h-4.5 text-primary" />
                </div>
                <span className="text-xs tracking-[0.35em] uppercase text-muted-foreground font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  Bio-Performance Lab
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.15] mb-6" style={{ fontFamily: "var(--font-display)" }}>
                あなたの
                <span className="text-gradient-teal"> バイオデータ </span>
                が導く、
                <br />
                <span className="text-gradient-amber">最適な食事</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-base lg:text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">
                血液検査・DNA検査の結果をAIが解析し、仕事のパフォーマンスを最大化する食事・サプリメントを完全パーソナライズ。
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <Link href="/dashboard">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-semibold px-8 h-12">
                    はじめる
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/upload">
                  <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary gap-2 text-sm font-semibold px-8 h-12">
                    データをアップロード
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60">Scroll</span>
          <motion.div
            className="w-px h-8 bg-gradient-to-b from-primary/40 to-transparent"
            animate={{ scaleY: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </section>

      {/* ───────────────────────── Features ───────────────────────── */}
      <section className="py-28 relative">
        <div className="container mx-auto px-6 lg:px-12">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="stat-label mb-3">Core Features</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl lg:text-4xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              科学が、あなたの食事を変える
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground max-w-xl mx-auto text-sm">
              トップアスリートが実践するデータ駆動型の栄養管理を、あなたの日常に。
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger} className="grid md:grid-cols-2 gap-4">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="elevated-card rounded-xl p-6 group hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${feature.accent === "teal" ? "bg-teal/10 text-teal" : "bg-amber/10 text-amber"}`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold mb-1.5">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 mt-1 shrink-0 group-hover:text-primary/50 transition-colors" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────────────────────── How it works ───────────────────────── */}
      <section className="py-28 relative">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="stat-label mb-3">How It Works</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl lg:text-4xl font-bold mb-8" style={{ fontFamily: "var(--font-display)" }}>
                3ステップで
                <br />
                <span className="text-gradient-teal">最適化</span>が始まる
              </motion.h2>

              <div className="space-y-8">
                {[
                  { step: "01", title: "データをアップロード", desc: "血液検査・DNA検査の結果（PDF/画像）をアップロード。主要な検査機関のフォーマットに対応。" },
                  { step: "02", title: "AIが解析・提案", desc: "あなたの体質と現在の栄養状態をAIが統合解析。相性の良い食材と避けるべき食材を特定。" },
                  { step: "03", title: "最適なプランを実行", desc: "あなた専用のメニューを毎週自動提案。不足栄養素を補うサプリメントも最適化します。" },
                ].map((item) => (
                  <motion.div key={item.step} variants={fadeUp} className="flex gap-5">
                    <div className="text-2xl font-bold text-primary/20" style={{ fontFamily: "var(--font-mono)" }}>
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-base font-bold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden glow-teal">
                <img src={BLOOD_IMG} alt="DNA and blood analysis visualization" className="w-full h-80 object-cover" />
              </div>
              <div className="absolute -bottom-6 -left-6 w-48 h-48 rounded-xl overflow-hidden border-2 border-background glow-amber">
                <img src={MEAL_IMG} alt="Optimized meal" className="w-full h-full object-cover" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── CTA + Disclaimer ───────────────────────── */}
      <section className="py-28 relative">
        <div className="container mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="elevated-card rounded-2xl p-8 lg:p-14 text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              あなたのパフォーマンスを、科学で最適化する
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8 text-sm leading-relaxed">
              本サービスは医師・管理栄養士の監修に基づくアルゴリズムを使用しています。
              医療行為（診断・処方）ではなく、健康増進・パフォーマンス最適化を目的としたアドバイスを提供します。
              体調に不安がある場合は、必ず医療機関にご相談ください。
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-semibold px-10 h-12">
                無料で始める
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground font-medium" style={{ fontFamily: "var(--font-display)" }}>
              Bio-Performance Lab
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 Bio-Performance Lab. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

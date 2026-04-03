import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  ShoppingCart,
  Star,
  TrendingUp,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SUPPLEMENTS } from "@/constants/supplements";

const priorityConfig = {
  high: {
    label: "高優先",
    color: "text-amber",
    bg: "bg-amber/10",
    dot: "bg-amber",
    icon: AlertCircle,
  },
  medium: {
    label: "中優先",
    color: "text-muted-foreground",
    bg: "bg-secondary",
    dot: "bg-muted-foreground/40",
    icon: TrendingUp,
  },
};

function BiomarkerRow({ current, target }: { current: string; target: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-amber font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
        {current}
      </span>
      <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
      <span className="text-teal font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
        {target}
      </span>
    </div>
  );
}

export default function Supplements() {
  const totalMonthly = SUPPLEMENTS.reduce((sum, s) => sum + s.monthlyPrice, 0);
  const highCount = SUPPLEMENTS.filter((s) => s.priority === "high").length;

  const handleOpenAll = () => {
    SUPPLEMENTS.forEach((s) => {
      window.open(s.amazonUrl, "_blank", "noopener,noreferrer");
    });
  };

  const handleSubscription = () => {
    toast.info("定期便機能は現在準備中です");
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="stat-label mb-1">Supplement Optimization</p>
          <h1 className="text-2xl lg:text-3xl font-bold">サプリメント最適化</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            あなたのバイオデータから特定された、Life Extension推奨サプリメント提案です。
          </p>
        </motion.div>

        {/* Summary row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="elevated-card rounded-xl p-4 text-center">
            <span className="stat-label">推奨数</span>
            <p className="stat-value text-2xl mt-1">
              {SUPPLEMENTS.length}
              <span className="stat-unit ml-1">種類</span>
            </p>
          </div>
          <div className="elevated-card rounded-xl p-4 text-center">
            <span className="stat-label">高優先</span>
            <p className="text-2xl font-bold text-amber mt-1" style={{ fontFamily: "var(--font-mono)" }}>
              {highCount}
              <span className="stat-unit ml-1">種類</span>
            </p>
          </div>
          <div className="elevated-card rounded-xl p-4 text-center">
            <span className="stat-label">月額目安</span>
            <p className="stat-value text-2xl mt-1">¥{totalMonthly.toLocaleString()}</p>
          </div>
        </motion.div>

        {/* Supplement cards */}
        <div className="space-y-3 mb-8">
          {SUPPLEMENTS.map((supp, i) => {
            const config = priorityConfig[supp.priority];
            const Icon = config.icon;
            return (
              <motion.div
                key={supp.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                className="elevated-card rounded-xl p-5"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title + badge */}
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="text-sm font-bold">{supp.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    </div>

                    {/* Product name */}
                    <p className="text-[11px] text-muted-foreground/60 mb-2 italic">{supp.productName}</p>

                    {/* Reason */}
                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">{supp.reason}</p>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mb-3">
                      <div className="bg-card rounded-lg p-2.5">
                        <span className="text-muted-foreground/70 block mb-0.5">用量</span>
                        <span className="font-semibold text-foreground">{supp.dosage}</span>
                      </div>
                      <div className="bg-card rounded-lg p-2.5">
                        <span className="text-muted-foreground/70 block mb-0.5">タイミング</span>
                        <span className="font-semibold text-foreground">{supp.timing}</span>
                      </div>
                      <div className="bg-card rounded-lg p-2.5">
                        <span className="text-muted-foreground/70 block mb-0.5">月額目安</span>
                        <span className="font-semibold text-foreground">¥{supp.monthlyPrice.toLocaleString()}</span>
                      </div>
                      {supp.biomarker && supp.currentValue && supp.targetValue && (
                        <div className="bg-card rounded-lg p-2.5">
                          <span className="text-muted-foreground/70 block mb-0.5">{supp.biomarker}</span>
                          <BiomarkerRow current={supp.currentValue} target={supp.targetValue} />
                        </div>
                      )}
                    </div>

                    {/* Amazon button */}
                    <a
                      href={supp.amazonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Amazonで購入 →
                      <span className="text-[10px] font-normal opacity-80 ml-1">Life Extension</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="elevated-card rounded-xl p-6 text-center"
        >
          <Star className="w-5 h-5 text-amber mx-auto mb-3" />
          <h3 className="text-base font-bold mb-1.5">Life Extension 推奨セットを見る</h3>
          <p className="text-xs text-muted-foreground mb-4">
            上記4製品をAmazonでまとめて確認できます。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={handleOpenAll}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-semibold h-10 px-8"
            >
              <ShoppingCart className="w-4 h-4" />
              4製品をまとめてAmazonで見る
            </Button>
            <Button
              onClick={handleSubscription}
              variant="outline"
              className="gap-2 text-sm font-semibold h-10 px-6 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-gray-200"
            >
              定期便で一括注文（準備中）
            </Button>
          </div>
        </motion.div>

        {/* Affiliate notice */}
        <p className="mt-4 text-xs text-gray-500">
          ※ AmazonリンクはLifeExtension製品のアフィリエイトリンクを含む場合があります。
          "XXXXX"はAmazonアソシエイトID取得後に置き換えてください。
        </p>

        {/* Disclaimer */}
        <div className="mt-3 mb-6 flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <p>
            サプリメントの提案は管理栄養士監修のアルゴリズムに基づくものであり、医薬品の処方ではありません。
            服用中の薬がある場合は、必ず医師にご相談ください。効果効能を保証するものではありません。
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}

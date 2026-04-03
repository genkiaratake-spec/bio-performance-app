import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Upload as UploadIcon, FileText, CheckCircle2, ArrowRight, Info, Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type UploadState = "idle" | "uploading" | "analyzing" | "complete";

const COMING_SOON_BADGE = (
  <span style={{
    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
    background: "#f97316/15", color: "#f97316",
    backgroundColor: "rgba(249,115,22,0.15)",
    border: "1px solid rgba(249,115,22,0.3)",
    marginLeft: 6, whiteSpace: "nowrap" as const,
  }}>
    近日対応予定
  </span>
);

export default function Upload() {
  const [checkupState, setCheckupState] = useState<UploadState>("idle");
  const [checkupFileName, setCheckupFileName] = useState("");

  const simulateUpload = useCallback(() => {
    const fakeName = "checkup_2026_03.pdf";
    setCheckupFileName(fakeName);
    setCheckupState("uploading");
    setTimeout(() => {
      setCheckupState("analyzing");
      setTimeout(() => {
        setCheckupState("complete");
        toast.success("健康診断データの解析が完了しました", {
          description: "食事アドバイスが更新されました。",
        });
      }, 2000);
    }, 1500);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    simulateUpload();
  }, [simulateUpload]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="stat-label mb-1">Data Integration</p>
          <h1 className="text-2xl lg:text-3xl font-bold">健康データを登録</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            健康診断・人間ドックの結果をアップロードして、パーソナライズ食事アドバイスを始めましょう。
          </p>
        </motion.div>

        {/* 対応している健診バッジ */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="elevated-card rounded-xl p-4 mb-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">対応している健診</p>
          <div className="flex flex-wrap gap-2">
            {["協会けんぽ", "企業健診", "自治体特定健診", "人間ドック"].map((label) => (
              <span
                key={label}
                className="text-[11px] font-semibold px-3 py-1 rounded-full"
                style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Section 1: 健康診断・人間ドック（メイン） */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className={`elevated-card rounded-xl p-5 mb-3 transition-all ${checkupState === "complete" ? "ring-1 ring-teal/30" : ""}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center text-lg shrink-0">📋</div>
            <div className="flex-1">
              <h3 className="text-sm font-bold flex items-center">健康診断・人間ドック結果</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">直近1〜3年分の結果をアップロード</p>
            </div>
            {checkupState === "complete" && <CheckCircle2 className="w-4 h-4 text-teal shrink-0" />}
          </div>

          {checkupState === "idle" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={simulateUpload}
              className="border border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                <UploadIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">PDF・画像（jpg/png）をドラッグ＆ドロップ</p>
              <p className="text-[10px] text-muted-foreground/60">またはクリックしてファイルを選択</p>
            </div>
          )}

          {checkupState === "uploading" && (
            <div className="border border-border rounded-xl p-8 text-center">
              <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-semibold">アップロード中...</p>
              <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>{checkupFileName}</p>
            </div>
          )}

          {checkupState === "analyzing" && (
            <div className="border border-amber/20 rounded-xl p-8 text-center">
              <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-amber border-t-transparent animate-spin" />
              <p className="text-xs font-semibold text-amber">AIが解析中...</p>
              <p className="text-[10px] text-muted-foreground mt-1">データを読み取り、バイオマーカーを抽出しています</p>
            </div>
          )}

          {checkupState === "complete" && (
            <div className="border border-teal/20 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-teal" />
              <p className="text-xs font-semibold text-teal">解析完了</p>
              <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>{checkupFileName}</p>
            </div>
          )}
        </motion.div>

        {/* 対応フォーマット */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="elevated-card rounded-xl p-5 mb-4">
          <h3 className="text-xs font-bold mb-3">対応フォーマット</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { ext: "PDF", desc: "検査結果レポート" },
              { ext: "JPG/PNG", desc: "スキャン画像" },
              { ext: "CSV", desc: "データエクスポート" },
              { ext: "JSON", desc: "構造化データ" },
            ].map((fmt) => (
              <div key={fmt.ext} className="flex items-center gap-2 p-2.5 rounded-lg bg-card">
                <FileText className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold" style={{ fontFamily: "var(--font-mono)" }}>{fmt.ext}</p>
                  <p className="text-[10px] text-muted-foreground">{fmt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* プライバシー */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
          className="elevated-card rounded-xl p-4 mb-4 flex items-start gap-3"
          style={{ borderColor: "rgba(74,222,128,0.15)" }}
        >
          <Lock className="w-4 h-4 text-teal mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">データの安全性</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              アップロードされたデータはAES-256で暗号化して保存され、第三者に共有されることはありません。
              食事アドバイスの生成のみに使用されます。
            </p>
          </div>
        </motion.div>

        {/* Next step */}
        {checkupState === "complete" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="text-center mb-4">
            <Link href="/analysis">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-semibold h-10 px-8">
                食事解析を見る <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground pb-4">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <p>
            ※本サービスは食事アドバイスを目的とするものであり、医療上の診断・処方ではありません。
            体調に不安がある場合は必ず医療機関にご相談ください。
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}

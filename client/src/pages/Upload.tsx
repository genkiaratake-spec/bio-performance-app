import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Upload as UploadIcon, FileText, Dna, Droplets, CheckCircle2, ArrowRight, Info, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type UploadState = "idle" | "uploading" | "analyzing" | "complete";

export default function Upload() {
  const [bloodTestState, setBloodTestState] = useState<UploadState>("idle");
  const [dnaTestState, setDnaTestState] = useState<UploadState>("idle");
  const [bloodFileName, setBloodFileName] = useState("");
  const [dnaFileName, setDnaFileName] = useState("");

  const simulateUpload = useCallback((type: "blood" | "dna") => {
    const setState = type === "blood" ? setBloodTestState : setDnaTestState;
    const setName = type === "blood" ? setBloodFileName : setDnaFileName;

    const fakeName = type === "blood" ? "blood_test_2026_03.pdf" : "dna_analysis_report.pdf";
    setName(fakeName);
    setState("uploading");

    setTimeout(() => {
      setState("analyzing");
      setTimeout(() => {
        setState("complete");
        toast.success(
          type === "blood" ? "血液検査データの解析が完了しました" : "DNA検査データの解析が完了しました"
        );
      }, 2000);
    }, 1500);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: "blood" | "dna") => {
    e.preventDefault();
    simulateUpload(type);
  }, [simulateUpload]);

  const handleFileSelect = useCallback((type: "blood" | "dna") => {
    simulateUpload(type);
  }, [simulateUpload]);

  const renderUploadCard = (
    type: "blood" | "dna",
    state: UploadState,
    fileName: string,
    icon: typeof Droplets,
    title: string,
    description: string,
    accentColor: string,
  ) => {
    const Icon = icon;
    const isComplete = state === "complete";
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: type === "blood" ? 0.1 : 0.15 }}
        className={`elevated-card rounded-xl p-5 transition-all ${isComplete ? "ring-1 ring-teal/30" : ""}`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${type === "blood" ? "bg-teal/10" : "bg-amber/10"}`}>
            <Icon className={`w-4 h-4 ${accentColor}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="text-[11px] text-muted-foreground">{description}</p>
          </div>
          {isComplete && <CheckCircle2 className="w-4 h-4 text-teal ml-auto" />}
        </div>

        {state === "idle" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, type)}
            onClick={() => handleFileSelect(type)}
            className="border border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
              <UploadIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-xs text-muted-foreground mb-0.5">PDF・画像ファイルをドラッグ＆ドロップ</p>
            <p className="text-[10px] text-muted-foreground/60">またはクリックしてファイルを選択</p>
          </div>
        )}

        {state === "uploading" && (
          <div className="border border-border rounded-xl p-8 text-center">
            <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-semibold">アップロード中...</p>
            <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>{fileName}</p>
          </div>
        )}

        {state === "analyzing" && (
          <div className="border border-amber/20 rounded-xl p-8 text-center">
            <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-amber border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-amber">AIが解析中...</p>
            <p className="text-[10px] text-muted-foreground mt-1">データを読み取り、バイオマーカーを抽出しています</p>
          </div>
        )}

        {state === "complete" && (
          <div className="border border-teal/20 rounded-xl p-8 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-teal" />
            <p className="text-xs font-semibold text-teal">解析完了</p>
            <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono)" }}>{fileName}</p>
          </div>
        )}
      </motion.div>
    );
  };

  const bothComplete = bloodTestState === "complete" && dnaTestState === "complete";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="stat-label mb-1">Data Integration</p>
          <h1 className="text-2xl lg:text-3xl font-bold">データ連携</h1>
          <p className="text-sm text-muted-foreground mt-1.5">血液検査・DNA検査の結果をアップロードして、パーソナライズ解析を開始しましょう。</p>
        </motion.div>

        {/* Info banner */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="elevated-card rounded-xl p-4 mb-6 flex items-start gap-3">
          <Shield className="w-4 h-4 text-teal mt-0.5 shrink-0" />
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">対応検査機関: </span>
            SRL、BML、LSI メディエンス、ユーグレナ（mycode）、ジェネシスヘルスケア等。
            データは暗号化して保存され、第三者に共有されることはありません。
          </div>
        </motion.div>

        {/* Upload cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {renderUploadCard("blood", bloodTestState, bloodFileName, Droplets, "血液検査", "直近の血液検査結果", "text-teal")}
          {renderUploadCard("dna", dnaTestState, dnaFileName, Dna, "DNA検査", "遺伝子検査レポート", "text-amber")}
        </div>

        {/* Supported formats */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="elevated-card rounded-xl p-5 mb-6">
          <h3 className="text-xs font-bold mb-3">対応フォーマット</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { ext: "PDF", desc: "検査結果レポート" },
              { ext: "JPG/PNG", desc: "スキャン画像" },
              { ext: "CSV", desc: "データエクスポート" },
              { ext: "JSON", desc: "構造化データ" },
            ].map((fmt) => (
              <div key={fmt.ext} className="flex items-center gap-2 p-2.5 rounded-lg bg-card">
                <FileText className="w-3.5 h-3.5 text-muted-foreground/60" />
                <div>
                  <p className="text-[11px] font-semibold" style={{ fontFamily: "var(--font-mono)" }}>{fmt.ext}</p>
                  <p className="text-[10px] text-muted-foreground">{fmt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Next step */}
        {bothComplete && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="text-center">
            <Link href="/analysis">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-semibold h-10 px-8">
                食事解析を見る <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <p>アップロードされたデータはAIによる栄養最適化の目的のみに使用され、医療診断には使用されません。</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

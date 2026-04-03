import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import {
  Upload as UploadIcon,
  FileText,
  CheckCircle2,
  ArrowRight,
  Info,
  Lock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { HealthCheckData } from "@/types/healthCheck";

type UploadState = "idle" | "uploading" | "analyzing" | "complete" | "error";

// ── ヘルパー ─────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  unit,
  isAbnormal,
}: {
  label: string;
  value: number | null;
  unit?: string;
  isAbnormal: boolean;
}) {
  if (value === null) return null;
  return (
    <div
      className="rounded-lg p-2.5"
      style={{ background: isAbnormal ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.04)" }}
    >
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p
        className="text-sm font-bold"
        style={{ color: isAbnormal ? "#f97316" : "#fff" }}
      >
        {value}
        {unit && <span className="text-[10px] font-normal text-gray-500 ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

// ── メインコンポーネント ───────────────────────────────────────────────────────

export default function Upload() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState("");
  const [analysisResult, setAnalysisResult] = useState<HealthCheckData | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setUploadState("uploading");
    setAnalysisError(null);
    setAnalysisResult(null);

    // 短いディレイでUIをuploadingに見せてからanalyzing へ
    await new Promise((r) => setTimeout(r, 800));
    setUploadState("analyzing");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze-health-check", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setAnalysisResult(result.data);
        localStorage.setItem("healthCheckData", JSON.stringify(result.data));
        setUploadState("complete");
      } else {
        setAnalysisError(result.error || "解析に失敗しました");
        setUploadState("error");
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setAnalysisError('通信エラーが発生しました: ' + detail);
      setUploadState('error');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) analyzeFile(file);
    },
    [analyzeFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) analyzeFile(file);
    },
    [analyzeFile]
  );

  const handleClickZone = () => {
    if (uploadState === "idle" || uploadState === "error") {
      fileInputRef.current?.click();
    }
  };

  const handleReset = () => {
    setUploadState("idle");
    setFileName("");
    setAnalysisResult(null);
    setAnalysisError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const abnormalSet = new Set(analysisResult?.abnormalFlags ?? []);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* 隠しファイル入力 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="stat-label mb-1">Data Integration</p>
          <h1 className="text-2xl lg:text-3xl font-bold">健康データを登録</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            健康診断・人間ドックの結果をアップロードして、パーソナライズ食事アドバイスを始めましょう。
          </p>
        </motion.div>

        {/* 対応している健診バッジ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="elevated-card rounded-xl p-4 mb-4"
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
            対応している健診
          </p>
          <div className="flex flex-wrap gap-2">
            {["協会けんぽ", "企業健診", "自治体特定健診", "人間ドック"].map((label) => (
              <span
                key={label}
                className="text-[11px] font-semibold px-3 py-1 rounded-full"
                style={{
                  background: "rgba(74,222,128,0.12)",
                  color: "#4ade80",
                  border: "1px solid rgba(74,222,128,0.25)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* アップロードカード */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={`elevated-card rounded-xl p-5 mb-3 transition-all ${
            uploadState === "complete" ? "ring-1 ring-teal/30" : ""
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center text-lg shrink-0">
              📋
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold">健康診断・人間ドック結果</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                PDF・jpg・png に対応
              </p>
            </div>
            {uploadState === "complete" && (
              <CheckCircle2 className="w-4 h-4 text-teal shrink-0" />
            )}
          </div>

          {/* idle */}
          {(uploadState === "idle" || uploadState === "error") && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={handleClickZone}
              className="border border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                <UploadIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">
                PDF・画像（jpg/png）をドラッグ＆ドロップ
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                またはクリックしてファイルを選択
              </p>
              {uploadState === "error" && analysisError && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-orange-400">
                  <AlertCircle className="w-3 h-3" />
                  {analysisError}
                </div>
              )}
            </div>
          )}

          {/* uploading */}
          {uploadState === "uploading" && (
            <div className="border border-border rounded-xl p-8 text-center">
              <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-semibold">アップロード中...</p>
              <p
                className="text-[10px] text-muted-foreground mt-1"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {fileName}
              </p>
            </div>
          )}

          {/* analyzing */}
          {uploadState === "analyzing" && (
            <div className="border border-amber/20 rounded-xl p-8 text-center">
              <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-amber border-t-transparent animate-spin" />
              <p className="text-xs font-semibold text-amber">AIが健康診断を解析中です...</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                30秒ほどかかる場合があります
              </p>
            </div>
          )}

          {/* complete */}
          {uploadState === "complete" && (
            <div className="border border-teal/20 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-teal" />
              <p className="text-xs font-semibold text-teal">解析完了</p>
              <p
                className="text-[10px] text-muted-foreground mt-1"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {fileName}
              </p>
              <button
                onClick={handleReset}
                className="mt-3 text-[10px] text-muted-foreground/60 underline underline-offset-2"
              >
                別のファイルをアップロード
              </button>
            </div>
          )}
        </motion.div>

        {/* ── 解析結果 ── */}
        {uploadState === "complete" && analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3 mb-4"
          >
            {/* 総合評価カード */}
            <div className="elevated-card rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                    総合評価
                  </p>
                  <p className="text-4xl font-bold text-teal leading-none">
                    {analysisResult.overallRating ?? "―"}
                  </p>
                  {analysisResult.checkupDate && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      検診日: {analysisResult.checkupDate}
                    </p>
                  )}
                </div>
                <CheckCircle2 className="w-5 h-5 text-teal mt-1" />
              </div>

              {analysisResult.doctorComment && (
                <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 border-t border-border/40 pt-3">
                  {analysisResult.doctorComment}
                </p>
              )}

              {/* 異常フラグ */}
              {abnormalSet.size > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    基準値外の項目
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...abnormalSet].map((flag) => (
                      <span
                        key={flag}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(249,115,22,0.12)",
                          color: "#f97316",
                          border: "1px solid rgba(249,115,22,0.3)",
                        }}
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 数値一覧カード */}
            <div className="elevated-card rounded-xl p-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                検査数値
              </p>
              <div className="grid grid-cols-2 gap-2">
                <MetricCard label="BMI" value={analysisResult.bmi} isAbnormal={abnormalSet.has("BMI")} />
                <MetricCard
                  label="血圧（収/拡）"
                  value={
                    analysisResult.bloodPressureSystolic !== null &&
                    analysisResult.bloodPressureDiastolic !== null
                      ? Number(
                          `${analysisResult.bloodPressureSystolic}.${String(analysisResult.bloodPressureDiastolic).padStart(2, "0")}`
                        )
                      : null
                  }
                  isAbnormal={abnormalSet.has("血圧")}
                />
                <MetricCard
                  label="総コレステロール"
                  value={analysisResult.totalCholesterol}
                  unit="mg/dL"
                  isAbnormal={abnormalSet.has("総コレステロール")}
                />
                <MetricCard
                  label="LDL"
                  value={analysisResult.ldlCholesterol}
                  unit="mg/dL"
                  isAbnormal={abnormalSet.has("LDL") || abnormalSet.has("LDLコレステロール")}
                />
                <MetricCard
                  label="HDL"
                  value={analysisResult.hdlCholesterol}
                  unit="mg/dL"
                  isAbnormal={abnormalSet.has("HDL") || abnormalSet.has("HDLコレステロール")}
                />
                <MetricCard
                  label="中性脂肪"
                  value={analysisResult.triglycerides}
                  unit="mg/dL"
                  isAbnormal={abnormalSet.has("中性脂肪")}
                />
                <MetricCard
                  label="血糖値"
                  value={analysisResult.bloodSugar}
                  unit="mg/dL"
                  isAbnormal={abnormalSet.has("血糖値") || abnormalSet.has("血糖")}
                />
                <MetricCard
                  label="HbA1c"
                  value={analysisResult.hba1c}
                  unit="%"
                  isAbnormal={abnormalSet.has("HbA1c")}
                />
                <MetricCard
                  label="γ-GTP"
                  value={analysisResult.gammaGtp}
                  unit="U/L"
                  isAbnormal={abnormalSet.has("γ-GTP") || abnormalSet.has("γGTP")}
                />
                <MetricCard
                  label="ヘモグロビン"
                  value={analysisResult.hemoglobin}
                  unit="g/dL"
                  isAbnormal={abnormalSet.has("ヘモグロビン")}
                />
                {analysisResult.vitaminD !== null && (
                  <MetricCard
                    label="ビタミンD"
                    value={analysisResult.vitaminD}
                    unit="ng/mL"
                    isAbnormal={abnormalSet.has("ビタミンD")}
                  />
                )}
                {analysisResult.crp !== null && (
                  <MetricCard
                    label="CRP"
                    value={analysisResult.crp}
                    unit="mg/L"
                    isAbnormal={abnormalSet.has("CRP")}
                  />
                )}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/">
                <button
                  className="w-full py-3 rounded-xl text-sm font-semibold text-black transition-colors"
                  style={{ background: "#4ade80" }}
                >
                  食事スコアに反映する
                </button>
              </Link>
              <Link href="/supplements">
                <button className="w-full py-3 rounded-xl bg-secondary text-sm font-semibold text-muted-foreground hover:bg-secondary/80 transition-colors">
                  サプリ提案を見る <ArrowRight className="inline w-3.5 h-3.5 ml-1" />
                </button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* 対応フォーマット */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="elevated-card rounded-xl p-5 mb-4"
        >
          <h3 className="text-xs font-bold mb-3">対応フォーマット</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { ext: "PDF", desc: "検査結果レポート" },
              { ext: "JPG/PNG", desc: "スキャン画像" },
            ].map((fmt) => (
              <div key={fmt.ext} className="flex items-center gap-2 p-2.5 rounded-lg bg-card">
                <FileText className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <div>
                  <p
                    className="text-[11px] font-semibold"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {fmt.ext}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{fmt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* プライバシー */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
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

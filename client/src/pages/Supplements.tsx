import { ExternalLink } from "lucide-react";

const AMAZON_ASSOCIATE_ID = "XXXXX-22";

const supplements = [
  {
    id: 1,
    name: "ビタミン D+K",
    brand: "Life Extension Vitamins D and K with Sea-Iodine",
    priority: "高優先",
    priorityColor: "text-orange-400",
    description: "ビタミンD3（5,000 IU）＋K1・K2（MK-4・MK-7）を1カプセルで補給。骨密度・免疫機能・血管健康を総合サポート。K2がカルシウムを骨へ適切に誘導し、動脈への沈着を防ぐ。",
    dose: "1カプセル / 日",
    timing: "食事と一緒に",
    monthlyPrice: "¥2,800",
    metric: { label: "ビタミンD", current: "28 ng/mL", target: "40-60 ng/mL" },
    amazonUrl: `https://www.amazon.co.jp/s?k=Life+Extension+Vitamins+D+and+K+Sea-Iodine&tag=${AMAZON_ASSOCIATE_ID}`,
  },
  {
    id: 2,
    name: "マグネシウム",
    brand: "Life Extension Magnesium Glycinate",
    priority: "高優先",
    priorityColor: "text-orange-400",
    description: "グリシン酸マグネシウム（高吸収型）。睡眠の質向上・筋弛緩・ストレス軽減・心臓・骨・神経機能をサポート。酸化マグネシウムと比べ吸収率が高く、胃腸への負担が少ない。",
    dose: "2〜3カプセル / 日",
    timing: "就寝前",
    monthlyPrice: "¥2,200",
    metric: null,
    amazonUrl: `https://www.amazon.co.jp/s?k=Life+Extension+Magnesium+Glycinate&tag=${AMAZON_ASSOCIATE_ID}`,
  },
  {
    id: 3,
    name: "オメガ3",
    brand: "Life Extension Super Omega-3 EPA/DHA Fish Oil",
    priority: "中優先",
    priorityColor: "text-gray-400",
    description: "EPA・DHAオメガ3脂肪酸＋セサミリグナン＋オリーブポリフェノール配合。心臓・脳・炎症管理をサポート。南太平洋のワイルドキャッチ、Non-GMO・グルテンフリー。",
    dose: "2カプセル / 日",
    timing: "食事と一緒に",
    monthlyPrice: "¥3,200",
    metric: { label: "CRP", current: "0.3 mg/L", target: "< 0.5 mg/L（維持）" },
    amazonUrl: `https://www.amazon.co.jp/s?k=Life+Extension+Super+Omega-3+EPA+DHA&tag=${AMAZON_ASSOCIATE_ID}`,
  },
  {
    id: 4,
    name: "ビタミンB群",
    brand: "Life Extension BioActive Complete B-Complex",
    priority: "中優先",
    priorityColor: "text-gray-400",
    description: "8種類のビタミンBを活性型（バイオアクティブ）フォームで配合。エネルギー代謝・心臓・脳・神経機能をサポート。メチルコバラミン（B12）・5-MTHF（葉酸）など吸収率の高い形態を使用。",
    dose: "1カプセル / 日",
    timing: "朝食後",
    monthlyPrice: "¥1,800",
    metric: null,
    amazonUrl: `https://www.amazon.co.jp/s?k=Life+Extension+BioActive+B-Complex&tag=${AMAZON_ASSOCIATE_ID}`,
  },
];

export default function Supplements() {
  const totalMonthly = "¥10,000";

  const openAllLinks = () => {
    supplements.forEach((s) => window.open(s.amazonUrl, "_blank"));
  };

  return (
    <div className="p-5 pt-16 lg:pt-8 lg:p-8 pb-24 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', height: '100%' }}>
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">SUPPLEMENT OPTIMIZATION</p>
        <h1 className="text-2xl font-bold text-white mb-2">サプリメント最適化</h1>
        <p className="text-sm text-gray-400">あなたのバイオデータから特定された、不足栄養素を補うサプリメント提案です。</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "推奨数", value: "4 種類" },
          { label: "高優先", value: "2 種類", valueClass: "text-orange-400" },
          { label: "月額目安", value: totalMonthly },
        ].map((item) => (
          <div key={item.label} className="bg-[#111118] rounded-xl p-3 border border-white/8">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-lg font-bold ${item.valueClass || "text-white"}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Supplement cards */}
      <div className="space-y-4 mb-6">
        {supplements.map((s) => (
          <div key={s.id} className="bg-[#111118] rounded-xl p-4 border border-white/8">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-base font-bold text-white">{s.name}</span>
                <span className={`ml-2 text-xs font-medium ${s.priorityColor}`}>{s.priority}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2">{s.brand}</p>
            <p className="text-sm text-gray-300 mb-3 leading-relaxed">{s.description}</p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">用量</p>
                <p className="text-sm font-medium text-white">{s.dose}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">タイミング</p>
                <p className="text-sm font-medium text-white">{s.timing}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">月額目安</p>
                <p className="text-sm font-medium text-white">{s.monthlyPrice}</p>
              </div>
              {s.metric && (
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">{s.metric.label}</p>
                  <p className="text-xs text-gray-400">
                    {s.metric.current}
                    <span className="mx-1 text-gray-600">→</span>
                    <span className="text-green-400">{s.metric.target}</span>
                  </p>
                </div>
              )}
            </div>

            <a
              href={s.amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
            >
              <ExternalLink size={14} />
              Amazonで購入 — Life Extension
            </a>
          </div>
        ))}
      </div>

      {/* Order section */}
      <div className="bg-[#111118] rounded-xl p-4 border border-white/8 mb-4">
        <h3 className="text-base font-bold text-white mb-1">Life Extension 推奨セットを見る</h3>
        <p className="text-xs text-gray-400 mb-4">上記4製品をAmazonで確認できます。</p>
        <button
          onClick={openAllLinks}
          className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium text-sm mb-2 transition-colors"
        >
          4製品をまとめてAmazonで見る
        </button>
        <button
          onClick={() => alert("定期便機能は現在準備中です。しばらくお待ちください。")}
          className="w-full py-3 rounded-xl bg-gray-700 text-gray-300 font-medium text-sm transition-colors"
        >
          定期便で一括注文（準備中）
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center leading-relaxed">
        サプリメントの提案は管理栄養士監修のアルゴリズムに基づくものであり、医薬品の処方ではありません。服用中の薬がある場合は、必ず医師にご相談ください。
      </p>
      <p className="text-xs text-gray-600 text-center mt-1">
        ※ AmazonリンクはLife Extension製品のアフィリエイトリンクを含む場合があります。
      </p>
    </div>
  );
}

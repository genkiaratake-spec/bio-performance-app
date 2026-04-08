import type { VercelRequest, VercelResponse } from '@vercel/node';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Recommendation {
  name: string;
  dose: string;
  grade: 'A' | 'B' | 'C';
  priority: 'high' | 'medium' | 'low' | 'caution';
  reason: string;
  trigger: string;
  retestTiming: string;
  warning: string;
}

interface NotNeeded {
  name: string;
  reason: string;
}

interface SupplementResponse {
  drugAlerts: string[];
  recommendations: Recommendation[];
  notNeeded: NotNeeded[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const v = (val: any): number | null => (val != null && !isNaN(Number(val)) ? Number(val) : null);
const has = (arr: string[], key: string) => arr.includes(key);

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { healthData, medications = [], lifestyle = [], symptoms = [] } = req.body as any;
    if (!healthData) return res.status(400).json({ error: 'healthData is required' });

    const meds: string[] = medications;
    const life: string[] = lifestyle;
    const symp: string[] = symptoms;

    const drugAlerts: string[] = [];
    const recommendations: Recommendation[] = [];
    const notNeeded: NotNeeded[] = [];

    // ── Drug alerts ──
    if (has(meds, 'warfarin')) drugAlerts.push('ワーファリン服用中：ビタミンK2（MK-7）は絶対禁忌。K2含有サプリ・納豆・青汁は全て避けること。');
    if (has(meds, 'thyroid')) drugAlerts.push('甲状腺薬（レボチロキシン）服用中：鉄・カルシウム・マグネシウムは服用から最低4時間空けること。');
    if (has(meds, 'statin')) drugAlerts.push('スタチン服用中：CoQ10が最大40%低下（メバロン酸経路阻害）。CoQ10 100–300mg/日の補充を強く推奨。');
    if (has(meds, 'metformin')) drugAlerts.push('メトホルミン服用中：使用者の22–29%がB12欠乏（ADA 2025）。高用量・長期使用者は年1回B12検査推奨。');
    if (has(meds, 'ppi')) drugAlerts.push('PPI服用中：B12・鉄・マグネシウム・亜鉛・VitCの吸収を長期的に阻害。定期的なモニタリングを推奨。');
    if (has(life, 'pregnant')) drugAlerts.push('妊娠中：アシュワガンダ・ベルベリンは禁忌。高用量VitDも医師に相談。');

    // ── Vitamin D3 + K2 (Grade A) ──
    const vitD = v(healthData.vitaminD);
    {
      let warning = '';
      if (has(meds, 'warfarin')) warning = 'ワーファリン服用中→K2禁忌。D3のみ使用。';

      if (vitD !== null) {
        if (vitD < 20) {
          recommendations.push({
            name: 'ビタミンD3 + K2', dose: 'D3 4000–6000 IU/日 + K2（MK-7）100–200µg/日',
            grade: 'A', priority: 'high',
            reason: `25(OH)D ${vitD} ng/mL — 欠乏（<20）。免疫・骨・VDR飽和のために必要。`,
            trigger: `vitaminD: ${vitD}`, retestTiming: '3ヶ月後に25(OH)D再測定', warning,
          });
        } else if (vitD < 40) {
          recommendations.push({
            name: 'ビタミンD3 + K2', dose: 'D3 2000–4000 IU/日 + K2 100µg/日',
            grade: 'A', priority: 'medium',
            reason: `25(OH)D ${vitD} ng/mL — 不足域（20–40）。目標値は40–60 ng/mL。`,
            trigger: `vitaminD: ${vitD}`, retestTiming: '3ヶ月後に25(OH)D再測定', warning,
          });
        } else if (vitD <= 80) {
          notNeeded.push({ name: 'ビタミンD3', reason: `25(OH)D ${vitD} ng/mL — 充足域（40–80）。補充不要。` });
        } else {
          recommendations.push({
            name: 'ビタミンD3', dose: '補充を中止し医師に相談',
            grade: 'A', priority: 'high',
            reason: `25(OH)D ${vitD} ng/mL — 過剰域（>80）。高Ca血症リスク。`,
            trigger: `vitaminD: ${vitD}`, retestTiming: '4週後に再測定', warning: '過剰摂取による高カルシウム血症リスク。直ちに医師に相談。',
          });
        }
      } else if (has(life, 'winter')) {
        recommendations.push({
          name: 'ビタミンD3 + K2', dose: 'D3 2000–4000 IU/日',
          grade: 'A', priority: 'medium',
          reason: '冬季・未測定。日本在住者の82.2%が冬季に不足（ROAD study）。',
          trigger: '未測定 + 冬季', retestTiming: '25(OH)D測定を推奨', warning,
        });
      }
    }

    // ── Omega-3 (Grade A) ──
    const o3i = v(healthData.omega3Index);
    {
      if (o3i !== null) {
        if (o3i < 4) {
          recommendations.push({
            name: 'Omega-3（EPA+DHA）', dose: 'EPA+DHA 2000–4000mg/日',
            grade: 'A', priority: 'high',
            reason: `Omega-3 Index ${o3i}% — 高リスク域（<4%）。心血管・抗炎症に必要。`,
            trigger: `omega3Index: ${o3i}`, retestTiming: '3ヶ月後にO3I再測定', warning: '',
          });
        } else if (o3i < 8) {
          recommendations.push({
            name: 'Omega-3（EPA+DHA）', dose: 'EPA+DHA 1000–2000mg/日',
            grade: 'A', priority: 'medium',
            reason: `Omega-3 Index ${o3i}% — 中間域（4–8%）。目標8%以上。`,
            trigger: `omega3Index: ${o3i}`, retestTiming: '3ヶ月後にO3I再測定', warning: '',
          });
        } else {
          notNeeded.push({ name: 'Omega-3', reason: `Omega-3 Index ${o3i}% — 充足域（≥8%）。補充不要。` });
        }
      } else if (has(life, 'apoe4')) {
        recommendations.push({
          name: 'Omega-3（DHA優位）', dose: 'DHA優位 2g/日',
          grade: 'A', priority: 'medium',
          reason: 'APOE ε4保有者はDHA脳代謝が速い。O3I測定を強く推奨（PreventE4試験）。',
          trigger: 'APOE ε4', retestTiming: 'O3I測定を推奨', warning: '',
        });
      }
    }

    // ── Iron (Grade A/B) ──
    const ferr = v(healthData.ferritin);
    {
      if (ferr !== null) {
        if (ferr < 20) {
          recommendations.push({
            name: '鉄（ビスグリシン酸鉄）', dose: '鉄 60–100mg/日（ビスグリシン酸鉄、食間）',
            grade: 'A', priority: 'high',
            reason: `フェリチン ${ferr} ng/mL — 欠乏（<20）。貧血・疲労リスク。`,
            trigger: `ferritin: ${ferr}`, retestTiming: '8週後にフェリチン・CBC再測定',
            warning: 'CRP同時測定推奨（炎症時にフェリチンは偽高値）。甲状腺薬は4時間空ける。',
          });
        } else if (ferr < 50 && has(symp, 'fatigue')) {
          recommendations.push({
            name: '鉄（ビスグリシン酸鉄）', dose: '鉄 30–60mg/日（週3–4回、食間）',
            grade: 'B', priority: 'medium',
            reason: `フェリチン ${ferr} ng/mL + 慢性疲労症状。Vaucher 2012 RCT（非貧血疲労に有効）。`,
            trigger: `ferritin: ${ferr} + fatigue`, retestTiming: '8週後にフェリチン再測定', warning: '',
          });
        } else if (ferr >= 50) {
          notNeeded.push({ name: '鉄', reason: `フェリチン ${ferr} ng/mL — 充足域（≥50）。補充不要。` });
        }
      }
    }

    // ── Vitamin B12 (Grade A/B) ──
    const b12 = v(healthData.vitaminB12);
    {
      if (b12 !== null) {
        if (b12 < 200) {
          recommendations.push({
            name: 'ビタミンB12（メチルコバラミン）', dose: 'メチルコバラミン 1000–2000µg/日（舌下）',
            grade: 'A', priority: 'high',
            reason: `B12 ${b12} pg/mL — 欠乏（<200）。神経障害・貧血リスク。MMA検査推奨。`,
            trigger: `vitaminB12: ${b12}`, retestTiming: '8週後にB12・MMA再測定', warning: '',
          });
        } else if (b12 < 400) {
          let reason = `B12 ${b12} pg/mL — グレーゾーン（NICE 2024）。機能的欠乏の可能性。`;
          if (has(life, 'mthfr')) reason += ' MTHFR変異→メチルB12が特に重要。';
          if (has(meds, 'metformin')) reason += ' メトホルミン服用者の欠乏リスク2.95倍。';
          recommendations.push({
            name: 'ビタミンB12（メチルコバラミン）', dose: 'メチルコバラミン 500–1000µg/日',
            grade: 'B', priority: 'medium', reason,
            trigger: `vitaminB12: ${b12}`, retestTiming: '3ヶ月後にB12再測定', warning: '',
          });
        } else {
          let reason = `B12 ${b12} pg/mL — 充足域（≥400）。補充不要。`;
          if (has(meds, 'metformin')) reason += ' 年1回モニタリング継続推奨。';
          notNeeded.push({ name: 'ビタミンB12', reason });
        }
      } else if (has(meds, 'metformin') || has(meds, 'ppi')) {
        recommendations.push({
          name: 'ビタミンB12検査', dose: 'まずB12・MMA検査を実施',
          grade: 'B', priority: 'medium',
          reason: `${has(meds, 'metformin') ? 'メトホルミン' : 'PPI'}服用中→B12欠乏リスク。未測定のため検査推奨。`,
          trigger: `medications: ${has(meds, 'metformin') ? 'metformin' : 'ppi'}`, retestTiming: 'B12・MMA検査を実施', warning: '',
        });
      }
    }

    // ── Folate + B complex (Grade A) ──
    const fol = v(healthData.folate);
    const hcy = v(healthData.homocysteine);
    {
      const needFolate = (fol !== null && fol < 10) || (hcy !== null && hcy >= 10) || has(life, 'mthfr');
      if (needFolate) {
        const isMthfr = has(life, 'mthfr');
        const triggers: string[] = [];
        if (fol !== null && fol < 10) triggers.push(`folate: ${fol}`);
        if (hcy !== null && hcy >= 10) triggers.push(`homocysteine: ${hcy}`);
        if (isMthfr) triggers.push('MTHFR変異');

        const reasonParts: string[] = [];
        if (fol !== null && fol < 10) reasonParts.push(`葉酸 ${fol} ng/mL — 低値`);
        if (hcy !== null && hcy >= 10) reasonParts.push(`ホモシステイン ${hcy} µmol/L — 高値（心血管リスク）`);
        if (isMthfr) reasonParts.push('MTHFR変異→活性型葉酸が必要');

        recommendations.push({
          name: isMthfr ? '5-MTHF（活性型葉酸）+ メチルB12' : '葉酸 + B群複合（B6・B12）',
          dose: isMthfr ? '5-MTHF 400–800µg + メチルB12 500µg/日' : '葉酸 400–800µg + B12 500µg + B6 25mg/日',
          grade: 'A', priority: (hcy !== null && hcy >= 10) ? 'high' : 'medium',
          reason: reasonParts.join('。') + '。',
          trigger: triggers.join(', '), retestTiming: '4週後にホモシステイン再測定', warning: '',
        });
      }
    }

    // ── Zinc (Grade B) ──
    const zn = v(healthData.zinc);
    {
      if (zn !== null) {
        if (zn < 70) {
          let warning = '長期高用量（>40mg/日）は銅欠乏リスク。';
          if (has(meds, 'ace')) warning += ' ACE阻害薬→Zn排泄増加。';
          recommendations.push({
            name: '亜鉛（グリシン酸亜鉛）', dose: '亜鉛 25–40mg/日（食後）',
            grade: 'B', priority: 'medium',
            reason: `Zn ${zn} µg/dL — 低値（目標70–120）。免疫・甲状腺T3変換・テストステロンに必要。`,
            trigger: `zinc: ${zn}`, retestTiming: '3ヶ月後に血清亜鉛再測定', warning,
          });
        } else {
          notNeeded.push({ name: '亜鉛', reason: `Zn ${zn} µg/dL — 充足域（≥70）。補充不要。` });
        }
      }
    }

    // ── CoQ10 (Grade A/B) ──
    {
      if (has(meds, 'statin')) {
        recommendations.push({
          name: 'CoQ10（ユビキノール）', dose: 'CoQ10 100–300mg/日（食後）',
          grade: 'A', priority: 'high',
          reason: 'スタチン→HMG-CoA経路阻害によりCoQ10が最大40%低下。Habicht 2024（7 RCT）で筋症状軽減確認。',
          trigger: 'medications: statin', retestTiming: '筋症状を4週後に再評価', warning: '',
        });
      } else if (has(symp, 'fatigue')) {
        recommendations.push({
          name: 'CoQ10（ユビキノール）', dose: 'CoQ10 100–200mg/日',
          grade: 'B', priority: 'low',
          reason: '慢性疲労症状。Tsai 2022（13 RCT, Hedges\' g=-0.398）。',
          trigger: 'symptoms: fatigue', retestTiming: '8週後に症状再評価', warning: '',
        });
      }
    }

    // ── Berberine (Grade B) ──
    {
      const hba1c = v(healthData.hba1c);
      const fbg = v(healthData.bloodSugar);
      const ldl = v(healthData.ldlCholesterol);
      const hsCrp = v(healthData.hsCrp);
      const crp = v(healthData.crp);
      const homaIr = v(healthData.homaIr);

      const triggers: string[] = [];
      if (hba1c !== null && hba1c >= 5.5) triggers.push(`HbA1c: ${hba1c}`);
      if (fbg !== null && fbg >= 100) triggers.push(`血糖: ${fbg}`);
      if (ldl !== null && ldl >= 130) triggers.push(`LDL: ${ldl}`);
      if (hsCrp !== null && hsCrp >= 1.0) triggers.push(`hs-CRP: ${hsCrp}`);
      else if (crp !== null && crp >= 0.1) triggers.push(`CRP: ${crp}`);
      if (homaIr !== null && homaIr >= 2.5) triggers.push(`HOMA-IR: ${homaIr}`);

      if (triggers.length > 0) {
        let warning = '消化器症状→食直前投与で軽減。降糖薬との相互作用注意。妊娠中禁忌。';
        if (has(meds, 'warfarin')) warning += ' ワーファリンとの相互作用あり。医師に相談。';
        recommendations.push({
          name: 'ベルベリン', dose: '500mg × 2–3回/日（食直前15分）',
          grade: 'B', priority: 'medium',
          reason: `代謝指標に改善余地あり。Zamani 2024（49 RCT）：HbA1c -0.4%、LDL -18.5 mg/dL。`,
          trigger: triggers.join(', '), retestTiming: '12週後にHbA1c・脂質プロファイル再測定', warning,
        });
      } else if (hba1c !== null || ldl !== null) {
        notNeeded.push({ name: 'ベルベリン', reason: '代謝指標が正常域。ベルベリンは異常がある場合に有効。正常値への投与は不要。' });
      }
    }

    // ── Curcumin + Piperine (Grade B) ──
    {
      const hsCrp = v(healthData.hsCrp);
      const needCurcumin = (hsCrp !== null && hsCrp >= 1.0) || has(symp, 'joint');
      if (needCurcumin) {
        recommendations.push({
          name: 'クルクミン + ピペリン', dose: 'クルクミン 400–800mg/日 + ピペリン 5–20mg（食後）',
          grade: 'B', priority: (hsCrp !== null && hsCrp >= 2) ? 'high' : 'medium',
          reason: 'Dehzad 2023（66 RCT）：CRP -0.58 mg/L、TNF-α -3.48 pg/mL。',
          trigger: [hsCrp !== null && hsCrp >= 1.0 ? `hs-CRP: ${hsCrp}` : '', has(symp, 'joint') ? 'symptoms: joint' : ''].filter(Boolean).join(', '),
          retestTiming: '8週後にhs-CRP再測定', warning: 'ピペリンなしでは吸収率が極めて低い。',
        });
      }
    }

    // ── Ashwagandha (Grade B) ──
    {
      const cort = v(healthData.cortisol);
      const alt = v(healthData.gpt);
      const needAshwa = !has(life, 'pregnant') && (
        (cort !== null && cort > 20) || has(symp, 'anxstress') || has(symp, 'sleepissue') || has(life, 'stress')
      );
      if (needAshwa) {
        const triggers: string[] = [];
        if (cort !== null && cort > 20) triggers.push(`cortisol: ${cort}`);
        if (has(symp, 'anxstress')) triggers.push('symptoms: anxstress');
        if (has(symp, 'sleepissue')) triggers.push('symptoms: sleepissue');
        if (has(life, 'stress')) triggers.push('lifestyle: stress');

        let warning = '甲状腺機能亢進症・自己免疫疾患・妊娠中は禁忌。肝障害（6件報告、全例可逆）に注意。';
        if (alt !== null && alt > 40) warning += ' ALT高値あり→使用には慎重を。';
        if (has(life, 'hashimoto')) warning += ' 橋本病→甲状腺ホルモン値をモニタリングしながら使用。';

        recommendations.push({
          name: 'アシュワガンダ（KSM-66）', dose: 'KSM-66 300–600mg/日（≥5% withanolides、就寝前）',
          grade: 'B', priority: 'medium',
          reason: 'Bonilla 2024（35 RCT）：コルチゾール -11.3%、不安スコア -2.35。',
          trigger: triggers.join(', '), retestTiming: '8週後にコルチゾール・PSS再評価', warning,
        });
      }
    }

    // ── Magnesium (Grade B) ──
    {
      const needMg = has(symp, 'sleepissue') || has(meds, 'diuretic') || has(meds, 'ppi');
      if (needMg) {
        const reasonParts = ['睡眠潜時-17.4分短縮（Mah & Pitre 2021, 3 RCT）。NMDA受容体拮抗+GABA作動作用。'];
        if (has(meds, 'diuretic')) reasonParts.push('利尿薬→Mg排泄増加。');
        if (has(meds, 'ppi')) reasonParts.push('PPI→Mg吸収阻害。');
        const triggers: string[] = [];
        if (has(symp, 'sleepissue')) triggers.push('symptoms: sleepissue');
        if (has(meds, 'diuretic')) triggers.push('medications: diuretic');
        if (has(meds, 'ppi')) triggers.push('medications: ppi');

        recommendations.push({
          name: 'マグネシウム（グリシン酸Mg）', dose: 'マグネシウム 200–400mg/日（就寝前）',
          grade: 'B', priority: 'low',
          reason: reasonParts.join(' '),
          trigger: triggers.join(', '), retestTiming: '4週後に睡眠品質再評価',
          warning: '酸化Mgは避ける（下痢リスク）。グリシン酸・テレオン酸型を選ぶ。',
        });
      }
    }

    // ── Creatine (Grade A) ──
    {
      const needCr = has(life, 'hightraining') || has(symp, 'musclepain') || has(life, 'sleepbad') || has(life, 'vegan');
      if (needCr) {
        const reasonParts: string[] = [];
        if (has(life, 'hightraining')) reasonParts.push('筋力・パフォーマンス改善はエビデンスA（多数のRCT）。');
        if (has(symp, 'musclepain')) reasonParts.push('筋肉痛・回復遅延の軽減が期待できる。');
        if (has(life, 'sleepbad')) reasonParts.push('睡眠剥奪時の認知保護（Gordji-Nejad 2024, Sci Rep）。');
        if (has(life, 'vegan')) reasonParts.push('菜食主義→脳内クレアチン基礎量が低い傾向。');

        const isHighPri = has(life, 'hightraining') || has(symp, 'musclepain');
        recommendations.push({
          name: 'クレアチンモノハイドレート', dose: 'クレアチン 3–5g/日（維持量）',
          grade: 'A', priority: isHighPri ? 'medium' : 'low',
          reason: reasonParts.join(' '),
          trigger: [has(life, 'hightraining') ? 'hightraining' : '', has(symp, 'musclepain') ? 'musclepain' : '', has(life, 'sleepbad') ? 'sleepbad' : '', has(life, 'vegan') ? 'vegan' : ''].filter(Boolean).join(', '),
          retestTiming: '4–8週後にパフォーマンス再評価', warning: '水分補給を増やす。',
        });
      }
    }

    // ── Selenium (Grade B) ──
    {
      const tpoAb = v(healthData.tpoAntibody);
      const needSe = has(life, 'hashimoto') || (tpoAb !== null && tpoAb > 35);
      if (needSe) {
        recommendations.push({
          name: 'セレン（セレノメチオニン）', dose: 'セレノメチオニン 100–200µg/日',
          grade: 'B', priority: 'medium',
          reason: 'Huwiler 2024（35 RCT, n=2358）：TPOAb有意低下（SMD -0.96）、TSH改善。',
          trigger: [has(life, 'hashimoto') ? 'hashimoto' : '', tpoAb !== null && tpoAb > 35 ? `TPOAb: ${tpoAb}` : ''].filter(Boolean).join(', '),
          retestTiming: '3ヶ月後にTPOAb・TSH再測定',
          warning: '血清Se≥122µg/Lは禁忌（T2DM・がんリスク）。200µg/日超は避ける。',
        });
      }
    }

    // ── NMN (Grade C) ──
    {
      if (has(life, 'over40')) {
        recommendations.push({
          name: 'NMN', dose: '250–500mg/日（朝）',
          grade: 'C', priority: 'caution',
          reason: 'NAD+上昇は確認済み。ただし代謝的臨床アウトカム改善はRCTで未確認（Zhang 2024, 12 RCT）。',
          trigger: 'lifestyle: over40', retestTiming: 'NAD+代謝物を6ヶ月後に測定（任意）',
          warning: '代謝的効果の誇張に注意。長期安全性データは限定的。',
        });
      }
    }

    // Sort: high > medium > low > caution
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, caution: 3 };
    recommendations.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

    const result: SupplementResponse = { drugAlerts, recommendations, notNeeded };
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Supplement analysis error:', error);
    return res.status(500).json({ error: '解析中にエラーが発生しました' });
  }
}

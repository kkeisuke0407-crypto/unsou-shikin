import fs from 'node:fs';
import path from 'node:path';

const repo = 'C:/Users/user/運送業ファクタリング/unsou-shikin';
const outDir = path.join(repo, 'reports/keyword-research/actwill-unsou');
fs.mkdirSync(outDir, { recursive: true });

const csv = (value) => {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const writeCsv = (name, columns, rows) => {
  const body = [columns.join(','), ...rows.map((row) => columns.map((key) => csv(row[key])).join(','))].join('\r\n');
  fs.writeFileSync(path.join(outDir, name), `\uFEFF${body}\r\n`, 'utf8');
};

// Actual KWP observations already captured in this project. A blank value is intentionally
// left blank rather than guessed. Estimated volume is only a conservative range conversion.
const kwp = new Map([
  ['運送業 資金繰り', { range: '10–100', est: 40, comp: '低', low: 270, high: 1389, source: 'KWP raw 2026-08-11' }],
  ['運送業 運転資金', { range: '10–100', est: 40, comp: '低', low: 582, high: 1810, source: 'KWP raw 2026-08-11' }],
  ['運送業 資金調達', { range: '10–100', est: 40, comp: '低', low: 344, high: 1101, source: 'KWP raw 2026-08-11' }],
  ['法人 カーリース 審査 通らない', { range: '10–100', est: 40, comp: '中', low: 293, high: 949, source: 'KWP観測 2026-08-12' }],
  ['リース 審査 通らない 法人', { range: '10–100', est: 40, comp: '低', low: 385, high: 985, source: 'KWP観測 2026-08-12' }],
  ['トラック ローン 審査', { range: '10–100', est: 40, comp: '中', low: 149, high: 1033, source: 'KWP観測 2026-08-12' }],
  ['トラック リース 審査', { range: '10–100', est: 40, comp: '中', low: 199, high: 860, source: 'KWP観測 2026-08-12' }],
  ['法人 カーリース 審査', { range: '10–100', est: 40, comp: '高', low: 232, high: 742, source: 'KWP観測 2026-08-12' }],
  ['トラック 増車', { range: '10–100', est: 40, comp: '低', source: 'KWP観測 2026-08-12' }],
  ['大型トラック 購入', { range: '10–100', est: 40, comp: '高', low: 40, high: 76, source: 'KWP観測 2026-08-12' }],
  ['トラック 修理代', { range: '10–100', est: 40, comp: '低', source: 'KWP観測 2026-08-12' }],
  ['トラック 修理費', { range: '10–100', est: 40, comp: '低', source: 'KWP観測 2026-08-12' }],
  ['トラック ミッション 修理', { range: '10–100', est: 40, comp: '低', source: 'KWP観測 2026-08-12' }],
  ['トラック 事故 修理', { range: '10–100', est: 40, comp: '低', source: 'KWP観測 2026-08-12' }],
  ['トラック タイヤ交換', { range: '1000–10000', est: 3000, comp: '低', low: 140, high: 786, source: 'KWP観測 2026-08-12' }],
  ['傭車代', { range: '10–100', est: 40, comp: '低', source: 'KWP観測 2026-08-12' }],
  ['傭車費', { range: '100–1000', est: 300, comp: '低', source: 'KWP観測 2026-08-12' }],
  ['庸車代', { range: '10–100', est: 40, comp: '低', source: 'KWP観測 2026-08-12' }],
  ['庸車費', { range: '10–100', est: 40, comp: '低', source: 'KWP観測 2026-08-12' }],
  ['傭車費 外注費', { range: '10–100', est: 40, comp: '低', source: 'KWP観測 2026-08-12' }],
  ['傭車費 とは', { range: '100–1000', est: 300, comp: '低', source: 'KWP観測 2026-08-12' }],
]);

const groups = [];
const add = (theme, subTheme, intent, phrases, reason, risk = '') => {
  for (const keyword of phrases) groups.push({ keyword, theme, sub_theme: subTheme, intent, reason, risk });
};
const combine = (left, right, join = ' ') => left.flatMap((a) => right.map((b) => `${a}${join}${b}`));

// 1. 傭車・協力会社・外注: corporate vocabulary with a direct cash event.
for (const head of ['傭車費', '傭車代', '庸車費', '庸車代']) {
  add('傭車・外注', '傭車支払', '協力会社等への支払原資', combine([head], ['支払い', '資金繰り', '資金不足', '払えない', '支払い 間に合わない', '立替', '先払い', '運転資金', '支払日', '支払い 資金']), '運送業の協力会社・傭車支払に直結する業界語。');
}
for (const head of ['協力会社 支払い', '下請け 支払い', '外注費 支払い', '再委託費 支払い', '運送会社 外注費 支払い', '運送会社 協力会社 支払い']) {
  add('傭車・外注', '協力会社・外注', '協力会社等への支払原資', combine([head], ['資金繰り', '資金不足', '払えない', '間に合わない', '立替', '入金前', '運転資金']), '運送会社の下請け・外注支払いの資金ギャップ。');
}
add('傭車・外注', '用語・採用除外', '情報収集', ['傭車費 とは', '傭車代 とは', '庸車費 とは', '傭車 募集', '傭車 求人', '協力会社 募集 運送', '傭車 単価 相場'], '用語説明・求人・取引先探索を除く。', '情報収集・求人・取引先探索');

// 2. Fuel, payment cards and road charges.
for (const head of ['燃料カード', '軽油カード', 'ガソリンカード', 'ETCコーポレートカード', 'ETCカード 法人', '高速料金 運送会社', 'AdBlue 運送会社', '尿素水 運送会社']) {
  add('燃料・ETC', 'カード・引落', '燃料・通行費の支払資金', combine([head], ['支払い', '引き落とし', '引き落とし 間に合わない', '残高不足', '限度額 足りない', '利用停止', '支払い 資金繰り', '支払い 入金前']), '後払いカード・高速料金の支払期日と入金ギャップ。');
}
for (const head of ['燃料代', '軽油代', '高速代', '高速料金', 'AdBlue', '尿素水']) {
  add('燃料・ETC', '固定費・変動費', '燃料・通行費の支払資金', combine(['運送会社'], [head], ' ').flatMap((p) => ['支払い 間に合わない', '資金繰り', '払えない', '運転資金'].map((e) => `${p} ${e}`)), '運送会社を明示した支払資金不足。');
}

// 3. Vehicle finance, purchase and expansion. Keep vehicle type specificity because ticket size can be large.
const vehicleTypes = ['トラック', '中古トラック', '大型トラック', '冷凍車', 'ウイング車', 'トレーラー', 'ダンプ', 'ユニック車', '平ボディ トラック', '物流車両'];
for (const type of vehicleTypes) {
  add('車両導入・増車', 'ローン・リース否決', '車両導入の代替資金', [`${type} ローン 審査 通らない`, `${type} ローン 審査 落ち`, `${type} ローン 否決`, `${type} ローン 組めない`, `${type} リース 審査 通らない`, `${type} リース 審査 落ち`, `${type} リース 組めない`], '車両が必要で既存金融手段に失敗した可能性。', '個人購入・販売店意図の混入');
  add('車両導入・増車', '購入・頭金・増車', '車両導入の先行資金', [`${type} 頭金 足りない`, `${type} 購入 自己資金 足りない`, `${type} 購入 資金`, `${type} 買い替え 資金`, `${type} 増車 資金`, `${type} 増車 ローン`, `${type} 増台 資金`], '車両購入・増車は300万円以上の資金需要へつながりやすい。', '個人購入・販売店意図の混入');
}
add('車両導入・増車', '法人フィルター', '車両導入の代替資金', ['法人 トラック ローン 審査 通らない', '法人 トラック リース 審査 通らない', '運送会社 車両ローン 審査 通らない', '運送会社 トラック リース 審査', '事業用車両 ローン 審査 通らない', '法人 車両ローン 審査 通らない', '法人 カーリース 審査 通らない', 'リース 審査 通らない 法人'], '法人・事業用を明示し個人購入を抑える。');

// 4. Repair, accident, insurance gap and downtime.
const repairTypes = ['トラック', '大型トラック', '冷凍車', 'トレーラー', '運送会社 車両'];
const repairParts = ['エンジン', 'ミッション', 'クラッチ', 'デフ', 'ターボ', 'DPF', 'ラジエーター', '冷凍機'];
for (const type of repairTypes) {
  add('修理・事故・稼働停止', '修理費支払', '稼働継続の緊急資金', [`${type} 修理代 分割`, `${type} 修理費 分割`, `${type} 修理代 一括 払えない`, `${type} 修理費 払えない`, `${type} 修理 資金`, `${type} 修理代 立替`, `${type} 修理費 支払い`], '稼働停止回避・高額修理の資金需要。', '修理業者探し・工賃相場の混入');
}
for (const part of repairParts) {
  add('修理・事故・稼働停止', '部品・重整備', '稼働継続の緊急資金', [`トラック ${part} 修理代 払えない`, `トラック ${part} 修理費 分割`, `トラック ${part} 修理 資金`, `大型トラック ${part} 修理 資金`], 'エンジン・ミッション等の重整備は一括支払困難のシグナル。', '修理方法の情報収集');
}
add('修理・事故・稼働停止', '事故・保険金待ち', '事故後のつなぎ資金', ['トラック 事故 修理費 資金', '運送会社 事故 修理費 資金', '貨物事故 弁償 運送会社', '運送会社 事故 賠償 支払い', '保険金 入るまで 修理代', '車両保険 免責 資金', 'トラック 事故車 買い替え 資金', '事故車 買い替え 資金', '運送会社 稼働停止 資金繰り', 'トラック 故障 稼働停止 資金'], '事故・保険金待ちで売上停止と支払いが重なる局面。', '損害賠償・保険相談だけの可能性');
add('修理・事故・稼働停止', '情報収集除外', '修理業者探し', ['トラック タイヤ交換', 'トラック 車検 費用', 'トラック 修理 相場', 'トラック 修理 出張', '近く の トラック 修理', 'トラック パンク 修理'], '価格・店舗・修理作業の検索は融資意図が弱い。', '修理業者・相場');

// 5. Receivable timing / shipper / prime contractor payment gaps.
for (const head of ['荷主 入金', '元請 入金', '運賃 入金', '売掛金 入金', '請求書 入金', '入金サイト 運送', '支払いサイト 運送']) {
  add('入金ギャップ', '荷主・元請・売掛金', '入金前の支払資金', combine([head], ['遅い', '遅延', '翌々月', '入金待ち', '入金前 資金', '入金前 支払い', '資金繰り', '支払い 間に合わない']), '荷主・元請からの入金と先払いコストのズレ。', '会計・契約条件の情報収集');
}
add('入金ギャップ', '運送会社明示', '入金前の支払資金', ['運送会社 売掛金 入金前 資金', '運送会社 入金待ち 資金繰り', '運送会社 入金前 支払い', '運送業 入金サイト 長い', '運送会社 翌々月払い 資金繰り', '運賃 入金 遅い 資金繰り', '荷主 支払い 遅い 運送会社', '元請 支払い 遅い 運送会社'], '運送会社を明示した回収サイト起点の資金不足。');

// 6. Growth events: work exists, but costs arrive first.
const growthEvents = ['大口受注', '新規受注', '受注増', '繁忙期', '増便', '新規荷主', '新規路線', '傭車増加', 'ドライバー増員', '車両増台', '新規拠点', '事業拡大'];
for (const event of growthEvents) {
  add('受注増・成長資金', '先行資金', '成長に伴う運転資金', [`${event} 運送会社 運転資金`, `${event} 運送会社 資金繰り`, `${event} 運送会社 先行資金`, `${event} 運送会社 資金不足`, `${event} 運送業 資金`, `${event} 傭車代 資金`], '仕事の増加に対し人件費・燃料・傭車費が先行する局面。');
}
add('受注増・成長資金', '運送特化表現', '成長に伴う運転資金', ['新規荷主 運転資金', '増便 資金 運送会社', '繁忙期 傭車 資金', '新規路線 資金 運送会社', '受注増 傭車代', '大口受注 資金不足 運送', '仕事あるのに資金がない 運送会社', '運送会社 増車 資金', '運送会社 ドライバー増員 資金'], '成長局面を明示するため審査健全度が比較的高い。');

// 7. Direct finance terms remain a control group, but are not the only route.
for (const head of ['運送業', '運送会社', '物流会社', '貨物運送会社']) {
  add('直接金融・比較', '運送業向け資金調達', '法人向け事業資金を探す', combine([head], ['資金調達', '事業資金', '運転資金', 'ビジネスローン', '法人融資', '車両資金', '設備資金', '追加融資', 'つなぎ資金']), '案件との整合性が高い対照群。', '金融比較・他業種の混入、CPC上昇の可能性');
}

// 8. Bank / public finance timing and rejection.
for (const head of ['銀行融資', '公庫融資', '保証協会 融資', '追加融資', '運転資金 融資']) {
  add('融資待ち・追加資金', '審査・実行待ち', '既存調達が間に合わない', combine([head], ['間に合わない 運送会社', '実行 遅い 運送会社', '断られた 運送会社', '審査 通らない 運送会社', '追加 運送会社', '借り換え 運送会社']), '既存の金融手段を使おうとして時間・審査で詰まる局面。', '金融KWのためCPC上昇・審査悪化の可能性');
}
add('融資待ち・追加資金', '借入整理', '資金調達の見直し', ['運送会社 複数借入 資金繰り', '運送会社 追加融資', '運送業 追加融資', '運送会社 借り換え', '運送会社 借入 一本化', '運送業 借入 一本化', '運送会社 融資 審査 通らない', '銀行 融資 断られた 運送業'], '既存借入がある法人の追加調達・条件見直し。', '一本化可否は広告主・法令確認が必要');

// 9. Equipment and operating base related funding.
for (const item of ['フォークリフト', '配車システム', 'デジタコ', '点呼システム', '倉庫設備', '冷凍設備', '物流倉庫', '営業所', '運行管理システム']) {
  add('設備・拠点投資', '設備導入', '設備投資資金', [`運送会社 ${item} 導入資金`, `運送会社 ${item} 設備資金`, `物流会社 ${item} 資金`, `${item} 導入 資金 運送会社`], '法人の設備投資・拠点整備に伴うまとまった需要。', '補助金・製品比較意図の混入');
}

// 10. Payroll / insurance. Keep temporary-cost terms; demote irreversible distress.
for (const head of ['ドライバー 給料', 'ドライバー 賞与', '人件費', '社会保険料', '任意保険料', '車両保険料']) {
  add('人件費・保険', '先行固定費', '固定費の一時的な資金不足', [`運送会社 ${head} 資金繰り`, `運送会社 ${head} 支払い`, `運送会社 ${head} 支払い 間に合わない`, `運送会社 ${head} 運転資金`], '給与・保険料は先行しやすい固定費。', '長期滞納・給与未払いは審査健全度が低い');
}
add('人件費・保険', '末期除外', '審査困難', ['運送会社 給料 払えない', '運送会社 社会保険 払えない', '運送会社 税金 滞納', '運送会社 差押え', '運送会社 倒産', '運送会社 破産', '運送会社 廃業'], '末期的な資金難・法的問題は初期出稿から外す。', '審査健全度が低い');

// Add previously active long tails so the audit has a consistent inventory.
add('既存配信監査', '既存設定', '既存Google広告キーワード', [
  'トラック エンジン 修理代 払えない', 'トラック ミッション 修理代', 'トラック リース 審査 通らない', 'トラック ローン 審査 通らない', 'トラック 購入 自己資金 足りない', 'トラック 事故 修理費 資金', 'トラック 修理 資金', 'トラック 修理費 払えない', 'トラック 増車', 'トラック 増車 ローン', 'トラック 増車 資金', 'トラック 頭金 足りない', '運送会社 資金ショート', '運送会社 資金不足', '運送会社 事故 賠償 支払い', '運送会社 車両修理 資金', '運送会社 車両増車 資金', '運送会社 売掛金 入金前 資金', '運送会社 融資', '運送業 ビジネスローン', '運送業 支払い 間に合わない', '運送業 事業資金', '運送業 燃料代 払えない', '荷主 入金 遅い 運送会社', '貨物事故 弁償 運送会社', '協力会社 支払い 間に合わない 運送', '事故車 買い替え 資金', '受注増 資金繰り 運送会社', '受注増 傭車代', '新規荷主 運転資金', '増便 資金 運送会社', '大口受注 資金不足 運送', '入金前 支払い 運送会社', '繁忙期 運転資金 運送会社', '繁忙期 傭車 資金', '保険金 入るまで 修理代'
], '既存設定との差分・重複を確認するために記録。');

// Short head terms that are useful KWP expansion starts even when they are not safe to run alone.
add('KWP再調査優先', '短い業界シード', '関連候補の発見', [
  '傭車費', 'トラック 修理費 一括 払えない', '高速料金 運送会社 資金繰り', '運賃 入金前 支払い'
], '短い種語または高意図の自然文。単独出稿可否はKWP関連候補と検索語句で確認する。', '短い種語は説明・会計意図も混在する');

// Preserve every previously observed KWP head term in the master, even when it is a seed or an exclusion.
for (const keyword of kwp.keys()) {
  if (!groups.some((item) => item.keyword === keyword)) {
    add('既存KWP観測', '短い種語・対照', 'KWP実測のある対照語', [keyword], '過去のKWP観測を漏れなく比較対象に残す。単独出稿の可否は別途評価。', '短い語は販売・情報収集意図を含む場合がある');
  }
}

const excludedRegex = /(?:とは|相場|費用$|料金$|求人|募集|近く|出張|タイヤ交換|車検 費用|価格|工賃|個人|個人事業主|一人親方|フリーランス|数万円|10万円|30万円|50万円|100万円|滞納|差押え|倒産|破産|廃業|給料 払えない)/;
const scoreCpc = (low) => {
  if (low === undefined) return '';
  if (low <= 50) return 15;
  if (low <= 100) return 13;
  if (low <= 200) return 10;
  if (low <= 350) return 7;
  if (low <= 600) return 4;
  return 1;
};
const scoreRow = (entry) => {
  const k = entry.keyword;
  const isExcluded = excludedRegex.test(k);
  const corporate = /傭車|庸車|協力会社|荷主|元請|運賃|運送会社|運送業|貨物事故|増便|デジタコ|点呼|ETCコーポレート/.test(k) ? 25 : /トラック|冷凍車|トレーラー|ダンプ|物流車両|事業用車両|法人/.test(k) ? 15 : 5;
  const funding = /資金不足|払えない|間に合わない|残高不足|利用停止|入金前|入金待ち|審査 通らない|審査 落ち|否決|組めない|頭金 足りない/.test(k) ? 25 : /資金繰り|運転資金|支払い|立替|先払い|追加融資|借り換え|一本化/.test(k) ? 20 : /資金|融資|ローン|リース/.test(k) ? 12 : 0;
  const over3m = /増車|増台|購入|買い替え|ローン|リース|大口受注|新規路線|新規拠点|設備|冷凍車|トレーラー|大型トラック|ダンプ|フォークリフト|倉庫/.test(k) ? 20 : /エンジン|ミッション|事故|貨物事故|傭車|庸車|外注費|協力会社|燃料カード|ETC/.test(k) ? 12 : 6;
  const health = /大口受注|新規受注|受注増|繁忙期|増便|新規荷主|新規路線|増台|増車|入金前|入金待ち|傭車|庸車|協力会社/.test(k) ? 15 : /修理|事故|燃料|ETC|高速|審査 通らない|頭金/.test(k) ? 10 : /資金ショート|給料 払えない|社会保険|差押え|倒産|破産|廃業/.test(k) ? 0 : 8;
  const observed = kwp.get(k) || {};
  const cpc = scoreCpc(observed.low);
  const total = isExcluded ? 0 : corporate + funding + over3m + health + (cpc === '' ? 0 : cpc);
  let rank = 'B';
  if (isExcluded) rank = '除外';
  else if (cpc !== '' && observed.low <= 100 && total >= 70 && observed.est >= 30) rank = 'S';
  else if (total >= 60) rank = 'A';
  else if (total >= 40) rank = 'B';
  else rank = 'C';
  // Known broad terms with clear purchase/repair-shop intent are not launch candidates even if cheap.
  if (['大型トラック 購入', 'トラック タイヤ交換', 'トラック 車検 費用', '傭車費 とは'].includes(k)) rank = '除外';
  return {
    ...entry,
    corporate_transport_score: corporate,
    funding_intent_score: funding,
    over_3m_score: over3m,
    financial_health_score: health,
    cpc_score: cpc === '' ? '未評価' : cpc,
    total_score: total,
    monthly_search_range: observed.range || '未調査',
    estimated_monthly_searches: observed.est ?? '',
    competition: observed.comp || 'CPC不明',
    top_bid_low: observed.low ?? 'CPC不明',
    top_bid_high: observed.high ?? 'CPC不明',
    rank,
    recommended_match_type: rank === 'S' || rank === 'A' ? '完全一致（KWP確認後にフレーズ追加）' : rank === 'B' ? 'KWP再調査後に判断' : '出稿しない',
    initial_max_cpc: rank === 'S' || rank === 'A' ? (observed.low !== undefined && observed.low > 50 ? '50円テスト対象外（低額帯が50円超）' : '50円') : '—',
    source: observed.source || '追加KWPシード（要実測）',
    notes: observed.range ? '検索数はKWPレンジ。推定検索数は安全側の換算値（0–10=4、10–100=40、100–1000=300、1000–10000=3000）。' : 'KWP未調査。検索数・CPCを推測していない。',
  };
};

const seen = new Set();
const rows = groups
  .map((item) => ({ ...item, keyword: item.keyword.replace(/\s+/g, ' ').trim() }))
  .filter((item) => item.keyword && !seen.has(item.keyword) && seen.add(item.keyword))
  .map(scoreRow)
  .sort((a, b) => ['S', 'A', 'B', 'C', '除外'].indexOf(a.rank) - ['S', 'A', 'B', 'C', '除外'].indexOf(b.rank) || b.total_score - a.total_score || a.keyword.localeCompare(b.keyword, 'ja'));

const masterColumns = ['keyword', 'theme', 'sub_theme', 'intent', 'corporate_transport_score', 'funding_intent_score', 'over_3m_score', 'financial_health_score', 'cpc_score', 'total_score', 'monthly_search_range', 'estimated_monthly_searches', 'competition', 'top_bid_low', 'top_bid_high', 'rank', 'recommended_match_type', 'initial_max_cpc', 'reason', 'risk', 'source', 'notes'];
writeCsv('02_KW_MASTER.csv', masterColumns, rows);

// Operational initial set: no automatic import. This only nominates the strongest 120 terms.
// The 50-yen gate deliberately avoids silently raising bids above the stated launch policy.
const initialThemeOrder = ['傭車・外注', '受注増・成長資金', '車両導入・増車', '修理・事故・稼働停止', '燃料・ETC', '入金ギャップ', '融資待ち・追加資金', '直接金融・比較', '設備・拠点投資'];
const initialDisallowed = /(?:既存配信監査|とは|相場|求人|募集|運送会社 協力会社 (?!支払い)|ETCコーポレートカード 入金前)/;
const initial = initialThemeOrder.flatMap((theme) => rows
  .filter((r) => r.theme === theme && ['S', 'A'].includes(r.rank) && !initialDisallowed.test(`${r.theme} ${r.keyword}`))
  .slice(0, 14))
  .slice(0, 120)
  .map((r) => ({
  campaign: '共通探索CP',
  ad_group: r.theme,
  keyword: r.keyword,
  match_type: '完全一致',
  rank: r.rank,
  estimated_searches: r.estimated_monthly_searches === '' ? '未調査' : r.estimated_monthly_searches,
  top_bid_low: r.top_bid_low,
  initial_max_cpc: r.initial_max_cpc,
  intent: r.intent,
  reason: r.reason,
}));
writeCsv('03_INITIAL_TEST_KW.csv', ['campaign', 'ad_group', 'keyword', 'match_type', 'rank', 'estimated_searches', 'top_bid_low', 'initial_max_cpc', 'intent', 'reason'], initial);

const summaryRows = [...new Set(rows.map((r) => r.theme))].map((theme) => {
  const subset = rows.filter((r) => r.theme === theme);
  const eligible = subset.filter((r) => r.rank !== '除外');
  const values = eligible.map((r) => Number(r.estimated_monthly_searches)).filter(Number.isFinite);
  const bids = eligible.map((r) => Number(r.top_bid_low)).filter(Number.isFinite);
  const S = subset.filter((r) => r.rank === 'S').length;
  const A = subset.filter((r) => r.rank === 'A').length;
  return {
    theme,
    keyword_count: subset.length,
    S_count: S,
    A_count: A,
    estimated_total_searches: values.length ? values.reduce((sum, n) => sum + n, 0) : '未調査',
    average_cpc_low: bids.length ? Math.round(bids.reduce((sum, n) => sum + n, 0) / bids.length) : 'CPC不明',
    corporate_transport_strength: /傭車|入金ギャップ|受注増/.test(theme) ? '非常に強い' : /燃料|車両|修理/.test(theme) ? '強い' : '中〜強',
    funding_intent_strength: /直接金融|融資待ち/.test(theme) ? '非常に強い' : /傭車|入金ギャップ|受注増|修理/.test(theme) ? '強い' : '中〜強',
    recommendation: theme === '傭車・外注' ? '最優先。説明・求人語を除き、支払い系をKWP再投入。' : theme === '受注増・成長資金' ? '審査健全度が高い。成長イベント別に検証。' : theme === '車両導入・増車' ? '金額期待は高いが個人・販売店意図を必ず除外。' : theme === '修理・事故・稼働停止' ? '「支払えない・保険金待ち」だけを残す。' : theme === '燃料・ETC' ? 'カード・引落・限度額に限定。' : 'KWP数値が取れてから採否を判断。',
  };
});
writeCsv('04_KW_THEME_SUMMARY.csv', ['theme', 'keyword_count', 'S_count', 'A_count', 'estimated_total_searches', 'average_cpc_low', 'corporate_transport_strength', 'funding_intent_strength', 'recommendation'], summaryRows);

const negatives = [
  '# すべて初期の完全一致/フレーズ配信を前提。実際の検索語句を見て追加する。',
  '# 法人対象外', '個人', '個人事業主', 'フリーランス', '一人親方', '軽貨物 個人', '個人向け', '学生',
  '# 商品・情報・店舗探し', 'とは', '意味', '相場', '価格', '料金', '費用', '工賃', '年収', '利益率', '求人', '募集', '近く', '出張', '持ち込み', '修理工場', '中古車販売',
  '# 少額・成果条件不一致', '数万円', '10万円', '30万円', '50万円', '100万円', '審査なし', 'ブラック', '闇金', 'ファクタリング', '補助金',
  '# 初期除外する審査リスク', '税金 滞納', '社会保険 滞納', '差押え', '倒産', '破産', '廃業', '給料 未払い',
  '# 商標・会社名（別途、正式な禁止語をASP画面で確認）', 'アクト ウィル', 'アクトウィル'
].join('\r\n');
fs.writeFileSync(path.join(outDir, '05_NEGATIVE_KEYWORDS.txt'), `\uFEFF${negatives}\r\n`, 'utf8');

const seedThemes = [
  ['傭車・外注', ['傭車費 支払い', '傭車代 資金繰り', '庸車費 支払い 間に合わない', '協力会社 支払い 運送会社', '運送会社 外注費 資金不足']],
  ['燃料・ETC', ['燃料カード 引き落とし 間に合わない', '軽油カード 限度額 足りない', 'ETCコーポレートカード 支払い', '高速料金 運送会社 資金繰り', 'AdBlue 運送会社 支払い']],
  ['車両導入・否決', ['法人 トラック ローン 審査 通らない', '中古トラック リース 審査 落ち', '運送会社 車両ローン 審査 通らない', 'トラック 頭金 足りない', '冷凍車 購入 資金']],
  ['修理・事故', ['トラック 修理代 分割', 'トラック ミッション 修理費 分割', '保険金 入るまで 修理代', '貨物事故 弁償 運送会社', '運送会社 稼働停止 資金繰り']],
  ['入金ギャップ', ['荷主 入金 遅い 運送会社', '元請 支払い 遅い 運送会社', '運賃 入金前 支払い', '運送会社 翌々月払い 資金繰り', '売掛金 入金待ち 運送会社']],
  ['受注増・成長', ['大口受注 運送会社 運転資金', '新規荷主 運転資金', '増便 資金 運送会社', '繁忙期 傭車 資金', 'ドライバー増員 運送会社 資金']],
  ['融資待ち', ['銀行融資 間に合わない 運送会社', '公庫融資 実行 遅い 運送会社', '追加融資 断られた 運送会社', '運送会社 融資 審査 通らない', '運送会社 追加融資']],
  ['設備', ['運送会社 フォークリフト 導入資金', '運送会社 配車システム 導入資金', '運送会社 デジタコ 設備資金', '物流倉庫 資金 運送会社']]
];
fs.writeFileSync(path.join(outDir, '06_KWP_SEEDS.txt'), `\uFEFF# Keyword Planner「新しいキーワードを見つける」へテーマごとに投入\r\n# 対象: 日本 / 日本語 / Google。期間は過去12か月。関連候補も必ず展開する。\r\n\r\n${seedThemes.map(([theme, terms]) => `## ${theme}\r\n${terms.join('\r\n')}`).join('\r\n\r\n')}\r\n`, 'utf8');

const counts = Object.fromEntries(['S', 'A', 'B', 'C', '除外'].map((rank) => [rank, rows.filter((r) => r.rank === rank).length]));
const known = rows.filter((r) => r.estimated_monthly_searches !== '');
const knownSA = known.filter((r) => ['S', 'A'].includes(r.rank));
const knownSAEstimate = knownSA.reduce((sum, r) => sum + Number(r.estimated_monthly_searches), 0);
const initialKnownEstimate = initial.reduce((sum, r) => sum + (Number(r.estimated_searches) || 0), 0);
const priorityKeywords = [
  '傭車費', '傭車代 支払い', '傭車代 資金繰り', '傭車費 支払い 間に合わない', '庸車費 支払い', '協力会社 支払い 間に合わない',
  '運送会社 外注費 支払い 入金前', 'トラック ローン 審査 通らない', '法人 トラック ローン 審査 通らない', '中古トラック ローン 審査 落ち',
  'トラック リース 審査 通らない', '法人 トラック リース 審査 通らない', 'トラック 頭金 足りない', 'トラック 購入 自己資金 足りない',
  'トラック 増車 資金', '冷凍車 購入 資金', 'トラック 修理代 分割', 'トラック 修理費 一括 払えない',
  'トラック ミッション 修理費 分割', '保険金 入るまで 修理代', '運送会社 稼働停止 資金繰り', '燃料カード 引き落とし 間に合わない',
  '軽油カード 限度額 足りない', 'ETCコーポレートカード 支払い', '高速料金 運送会社 資金繰り', '荷主 入金 遅い 運送会社',
  '運賃 入金前 支払い', '大口受注 運送会社 運転資金', '新規荷主 運転資金', '繁忙期 傭車 資金'
];
const byKeyword = new Map(rows.map((r) => [r.keyword, r]));
const top30 = priorityKeywords.map((keyword, index) => {
  const r = byKeyword.get(keyword);
  if (!r) return `${index + 1}. \`${keyword}\` — KWP再調査シード`;
  return `${index + 1}. \`${r.keyword}\` — ${r.theme} / KWP ${r.monthly_search_range} / 低額帯 ${r.top_bid_low}`;
}).join('\n');
const cpc50Priority = priorityKeywords.filter((keyword) => byKeyword.get(keyword)?.top_bid_low === 'CPC不明').slice(0, 20);
const cpc50 = cpc50Priority.map((keyword) => {
  const r = byKeyword.get(keyword);
  return `- \`${keyword}\`（KWP ${r.monthly_search_range}、CPC不明。上限50円で観測する候補）`;
}).join('\n');
const highCpc = rows.filter((r) => Number(r.top_bid_low) > 100 && ['S', 'A', 'B'].includes(r.rank)).map((r) => `- \`${r.keyword}\`：低額帯 ${r.top_bid_low}円（${r.monthly_search_range}）`).join('\n');
const summary = `# アクト・ウィル運送業案件｜PPCキーワード調査・選定\n\n- 作成日: 2026-08-12（JST）\n- 対象: アクト・ウィルの法人・運送事業者向け事業資金案件\n- 成果地点: 新規の法人がWEB申込み/問い合わせ後30日以内に簡単審査（仮査定）を完了\n- 出稿方針: 商標は対象外。低CPCを目的化せず、法人運送会社率・資金イベント・300万円以上期待・審査健全度を優先する。\n\n## 結論\n\n**現時点のKWP実測だけでは、法人運送会社×高資金需要だけで月3,000〜5,000検索を作れるとは確認できない。**\n\n既存のKWP実測が付いたS/A語の安全側合計は **約${knownSAEstimate}検索/月**。これは語句間の重複を控除していない上限寄りの足し算であり、広告の実インプレッション見込みではない。今回の候補母集団は **${rows.length}語**（S ${counts.S} / A ${counts.A} / B ${counts.B} / C ${counts.C} / 除外 ${counts.除外}）まで拡張したが、${rows.length - known.length}語はKWP未調査であり、検索数をゼロとも有望とも判定していない。\n\nしたがって、初回の正しいゴールは「3,000〜5,000という数を作る」ではなく、**傭車・協力会社支払、車両導入否決、受注増の先行資金、入金ギャップ**をKWPで一括展開して、法人性を維持した実測母数を積むこと。量が出ても修理店・中古販売・求人・用語説明が主体なら採用しない。\n\n## 調査方法と情報源\n\n1. 国土交通省・全日本トラック協会の運送原価・資金繰り資料で、燃料油脂・修繕・タイヤ・車両リース/減価償却・保険・人件費・高速料金・傭車費が資金需要になり得ることを確認。\n2. NEXCO東日本のETCコーポレートカード案内で、カード利用料金が後払い請求となることを確認。\n3. 既存のKWP CSV（2026-08-11）とKWP初回観測（2026-08-12）を読み込み、実測レンジ・競合性・上部掲載単価は判明分だけ転記。\n4. 上記の業界語と資金不足イベントを自然な検索文へ展開し、KWP再投入用の候補群を作成。\n\n### 一次・業界情報源\n\n- 国土交通省「標準的な運賃に係る原価計算」: https://www.mlit.go.jp/common/001222602.pdf\n- 国土交通省「トラック運送事業の経営分析報告書」: https://www.mlit.go.jp/common/001726549.pdf\n- 全日本トラック協会「経営分析報告書」: https://jta.or.jp/wp-content/themes/jta_theme/pdf/keiei/H24%20keieibunseki_syaryou_chiiki.pdf\n- NEXCO東日本「ETCコーポレートカード」: https://www.driveplaza.com/etc/dis/etc_dis_frequency/\n- 国土交通省「物流業界の多重下請構造」: https://www.mlit.go.jp/seisakutokatsu/freight/seisakutokatsu_freight_tk2_000015.html\n\n## 発見した穴テーマと検索行動\n\n|テーマ|検索行動|評価|\n|---|---|---|\n|傭車・協力会社・外注|荷主入金前に協力会社へ支払う。\`傭車費\`/\`庸車費\`は法人運送会社率が特に高い。|最優先。ただし\`とは\`・求人・単価は除外|\n|車両ローン・リース否決|車両導入が必要で、既存の金融手段が使えない。|金額期待は高いが、法人修飾で個人購入を抑える|\n|車両修理・事故・保険金待ち|稼働停止を避けるため一括支払・保険金入金前の資金を探す。|\`分割\`/\`払えない\`/\`保険金待ち\`に限定|\n|燃料カード・ETC|後払いカードの引落・限度額と入金サイトのズレ。|カード/引落/残高/利用停止に限定|\n|荷主・元請の入金ギャップ|運賃回収より先に燃料・人件費・傭車費が出る。|会計解説意図を除き、入金前支払いへ寄せる|\n|受注増・増便・新規荷主|仕事がある成長局面で先行コストが必要。|健全度が高く、広告文の適合性もよい|\n|銀行・公庫待ち|既存の調達手段の審査・実行が間に合わない。|高意図だがCPC上昇・審査悪化の両方に注意|\n\n## 法人運送会社率が高い語彙\n\n\`傭車費\` / \`傭車代\` / \`庸車費\` / \`庸車代\` / \`協力会社支払い\` / \`荷主入金\` / \`元請支払い\` / \`運賃入金\` / \`ETCコーポレートカード\` / \`増便\` / \`新規荷主\` / \`新規路線\` / \`貨物事故\` / \`配車システム\` / \`点呼システム\` / \`デジタコ\`。\n\n## 100点スコアの読み方\n\n- 法人運送会社率 25点、資金調達意図 25点、300万円以上期待 20点、審査健全度 15点、CPC魅力度 15点。\n- **CPC不明は0点ではなく「未評価」**。CSVの \`total_score\` はCPC未評価分を足していない保守的な暫定値で、CPCが安いという意味ではない。\n- KWPの安全側換算は、0–10→4、10–100→40、100–1000→300、1000–10000→3,000。KWPレンジと別列にした。\n\n## 最も期待値が高い穴KW TOP30\n\n${top30}\n\n## CPC50円からテストする価値が高いKW\n\n${cpc50 || 'KWP低額帯が確認できたS/A語で50円以下のものは現時点ではない。CPC不明のA語は50円で小さく観測する価値はあるが、安価と断定しない。'}\n\n## 高意図だが後回しにするKW\n\n${highCpc || 'KWP低額帯が確認できた候補が少ないため、追加KWP後に再判定。'}\n\n## 検索数があっても出稿しない語\n\n- \`トラック タイヤ交換\`（KWP 1,000–10,000、低額帯140円）：修理店・交換作業意図が中心。\n- \`傭車費 とは\`（KWP 100–1,000）：業界用語の説明検索。\n- \`大型トラック 購入\`（KWP 10–100、低額帯40円）：販売・中古車探しが主で、法人融資意図を確定できない。\n- \`トラック 車検 費用\`：費用相場・整備情報の可能性が高い。\n\n## 0–10でも束ねる価値があるテーマ\n\n車両ローン/リース否決、重整備の分割・一括払不能、傭車/協力会社の支払期限、燃料カード・ETCの引落、保険金待ち、受注増の傭車代。この層はKWPで0–10が多く、単語単位では小さいが、資金イベントと法人性が明確である。\n\n## 初期戦略と初日の推奨KW数\n\n1. **Google広告へ即時に一括追加はしない。** \`03_INITIAL_TEST_KW.csv\` はS/Aから${initial.length}語を選んだ候補表で、KWP未調査語は先にKWPで確認する。\n2. 初日は、既存の配信語と重複しない **40〜60語の完全一致**を推奨。テーマは「傭車・協力会社」「車両否決」「受注増・入金前」を分け、広告文もテーマ別にする。\n3. 入札は原則50円。KWP低額帯が50円を超える語は、勝手に上げず \`50円テスト対象外\` として保留する。\n4. 最初の判断はクリックではなく、検索語句の法人性→仮査定導線のMCV→成果確定で行う。\n\n**初期出稿候補${initial.length}語のうち、KWP実測がある語だけの安全側検索数合計は約${initialKnownEstimate}検索/月。** これは3,000〜5,000に遠く、未調査語に勝手な検索数を足して埋めていない。次のKWP一括調査で、候補 ${rows.length}語をテーマごとに展開し、S/Aだけの実測検索母数を再集計してから増枠判断する。\n\n## 次に追加調査する領域\n\n1. \`傭車\`/\`庸車\`の地域・業態別関連語（冷凍、一般貨物、幹線、地場、スポット便）をKWPの関連候補から拾う。\n2. 燃料カード・ETCコーポレートカードのブランドを除いた支払・引落・限度額語を関連候補で拡張する。\n3. 車両ローン/リースは「法人」「事業用」「運送会社」を付け、販売店・個人購入を検索語句レポートで除外する。\n4. 受注増・増便・新規路線は運送特有の語を足し、実際に検索される自然文だけを残す。\n5. 3,000〜5,000を目標にするときも、説明語・求人・修理店・個人購入を混ぜない。実測で届かなければ、この案件では高意図だけの母数上限として受け入れる。\n`;
fs.writeFileSync(path.join(outDir, '01_RESEARCH_SUMMARY.md'), summary, 'utf8');

console.log(JSON.stringify({ outDir, candidates: rows.length, ranks: counts, knownKwp: known.length, knownSAEstimate, initialRows: initial.length, initialKnownEstimate }, null, 2));

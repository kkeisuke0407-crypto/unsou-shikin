import fs from 'node:fs';
import path from 'node:path';

const repo = 'C:/Users/user/運送業ファクタリング/unsou-shikin';
const sourcePath = path.join(repo, 'reports/keyword-research/actwill-unsou/03_INITIAL_TEST_KW.csv');
const outDir = path.join(repo, 'reports/ppc-launch/2026-08-12-actwill-research-phase1-gae');
const landingPage = 'https://unsou-shikin.hakobu-family.com/actwill/';
const campaign = '共通探索CP';

const parseCsv = (text) => {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const parseLine = (line) => {
    const result = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
        else quoted = !quoted;
      } else if (char === ',' && !quoted) { result.push(value); value = ''; }
      else value += char;
    }
    result.push(value);
    return result;
  };
  const [header, ...body] = lines.map(parseLine);
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])));
};
const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const writeUtf16Csv = (fileName, headers, rows) => {
  const content = [headers.map(escape).join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\r\n') + '\r\n';
  fs.writeFileSync(path.join(outDir, fileName), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(content, 'utf16le')]));
};
const count = (text) => Array.from(text).length;
const assertLimit = (label, text, max) => {
  if (count(text) > max) throw new Error(`${label} exceeds ${max}: ${text} (${count(text)})`);
};

if (!fs.existsSync(sourcePath)) throw new Error(`Missing source: ${sourcePath}`);
fs.mkdirSync(outDir, { recursive: true });
const source = new Map(parseCsv(fs.readFileSync(sourcePath, 'utf8')).map((row) => [row.keyword, row]));

// Phase 1 deliberately uses 48 new, exact-match candidates (eight per intent). It excludes
// words already present in the previous GAE packages, high-CPC observed terms and mechanically
// generated phrases judged unnatural. The remaining initial pool stays in 03_INITIAL_TEST_KW.csv.
const selections = {
  'AG04 傭車・協力会社支払': [
    '運送会社 外注費 支払い 入金前', '協力会社 支払い 間に合わない', '協力会社 支払い 資金不足', '協力会社 支払い 払えない',
    '傭車代 支払い 間に合わない', '傭車代 資金不足', '傭車代 払えない', '傭車費 支払い 間に合わない',
  ],
  'AG05 受注増・入金ギャップ': [
    '大口受注 運送会社 運転資金', '大口受注 運送会社 資金繰り', '新規路線 運送会社 運転資金', '新規路線 運送会社 資金繰り',
    '新規拠点 運送会社 運転資金', '新規拠点 運送会社 資金繰り', '傭車増加 運送会社 資金不足', '運送会社 増車 資金',
  ],
  'AG06 車両導入・リース否決': [
    '運送会社 車両ローン 審査 通らない', '事業用車両 ローン 審査 通らない', '大型トラック ローン 審査 通らない', '大型トラック リース 審査 通らない',
    'トレーラー ローン 審査 通らない', 'トレーラー リース 審査 通らない', 'ダンプ ローン 審査 通らない', 'ダンプ リース 審査 通らない',
  ],
  'AG07 事故・稼働復旧': [
    '大型トラック 修理代 一括 払えない', '大型トラック 修理費 払えない', '大型トラック 修理代 立替', '大型トラック 修理費 支払い',
    '冷凍車 修理代 一括 払えない', '冷凍車 修理費 払えない', '運送会社 車両 修理代 一括 払えない', '運送会社 車両 修理費 払えない',
  ],
  'AG08 燃料・ETC支払': [
    'ETCコーポレートカード 支払い', 'ETCコーポレートカード 支払い 資金繰り', 'ETCコーポレートカード 引き落とし 間に合わない', 'ETCコーポレートカード 残高不足',
    'ETCコーポレートカード 利用停止', '運送会社 高速代 支払い 間に合わない', '運送会社 高速料金 支払い 間に合わない', '運送会社 高速料金 払えない',
  ],
  'AG09 設備・拠点投資': [
    '運送会社 フォークリフト 導入資金', '運送会社 配車システム 設備資金', '運送会社 デジタコ 設備資金', '運送会社 点呼システム 設備資金',
    '運送会社 倉庫設備 導入資金', '運送会社 冷凍設備 導入資金', '運送会社 営業所 設備資金', '運送会社 物流倉庫 導入資金',
  ],
};
const legacyKeywordFiles = [
  path.join(repo, 'reports/ppc-launch/2026-08-11-actwill-unsou-gae/04_GAE_ADD_KEYWORDS_UTF16.csv'),
  path.join(repo, 'reports/ppc-launch/2026-08-12-actwill-hidden-intent-add-ag-gae/02_GAE_ADD_KEYWORDS_UTF16.csv'),
];
const legacy = new Set();
for (const file of legacyKeywordFiles) {
  for (const row of parseCsv(fs.readFileSync(file, 'utf16le'))) legacy.add(row.Keyword);
}
const keywordRows = [];
for (const [adGroup, keywords] of Object.entries(selections)) {
  for (const keyword of keywords) {
    const item = source.get(keyword);
    if (!item) throw new Error(`Selected keyword is missing from initial research: ${keyword}`);
    if (item.campaign !== campaign) throw new Error(`Campaign mismatch: ${keyword}`);
    if (item.initial_max_cpc !== '50円') throw new Error(`Not eligible for 50-yen phase 1: ${keyword}`);
    if (legacy.has(keyword)) throw new Error(`Already in earlier GAE package: ${keyword}`);
    keywordRows.push({ Campaign: campaign, 'Ad group': adGroup, Keyword: keyword, 'Match type': 'Exact', Status: 'Enabled', 'Max CPC': '50', 'Final URL': landingPage });
  }
}
if (keywordRows.length !== 48 || new Set(keywordRows.map((row) => row.Keyword)).size !== 48) throw new Error('Expected 48 unique keywords');

const newAdGroups = ['AG08 燃料・ETC支払', 'AG09 設備・拠点投資'];
writeUtf16Csv('01_GAE_ADD_ADGROUPS_UTF16.csv', ['Campaign', 'Ad group', 'Status', 'Max CPC'], newAdGroups.map((name) => ({ Campaign: campaign, 'Ad group': name, Status: 'Enabled', 'Max CPC': '50' })));
writeUtf16Csv('02_GAE_ADD_KEYWORDS_UTF16.csv', ['Campaign', 'Ad group', 'Keyword', 'Match type', 'Status', 'Max CPC', 'Final URL'], keywordRows);

const rsas = [
  {
    adGroup: 'AG08 燃料・ETC支払',
    headlines: ['法人の運送会社限定', '燃料・高速代の資金を確認', 'ETC支払い前の資金繰り', '運送会社の運転資金に', '300万円以上の事業資金', '仮査定は最短60分', '全国対応・来店不要', '300万円〜最大1億円', '融資条件を確認', '原則不動産担保不要', '第三者保証人原則不要', '運送業向けビジネスローン', '代表者の連帯保証が必要', 'まとまった資金を相談', '条件を仮査定で確認'],
    descriptions: ['燃料費・高速料金など先行支出の資金繰りを検討する法人運送会社へ。条件を確認。', '300万円〜最大1億円。最短60分の仮査定に対応、全国から来店不要で相談できます。', 'まとまった事業資金が必要な法人向け。まずは審査前の仮査定で利用条件を確認。', '審査あり。融資条件は審査結果により決まります。法人代表者の連帯保証が必要です。'],
  },
  {
    adGroup: 'AG09 設備・拠点投資',
    headlines: ['法人の運送会社限定', '設備投資の資金を確認', '車両・倉庫の事業資金', '配車・運行管理の導入に', '300万円以上の事業資金', '仮査定は最短60分', '全国対応・来店不要', '300万円〜最大1億円', '融資条件を確認', '原則不動産担保不要', '第三者保証人原則不要', '運送業向けビジネスローン', '代表者の連帯保証が必要', 'まとまった資金を相談', '条件を仮査定で確認'],
    descriptions: ['設備・拠点整備など、まとまった資金が必要な法人運送会社へ。融資条件を確認。', '300万円〜最大1億円。最短60分の仮査定に対応、全国から来店不要で相談できます。', 'フォークリフトや運行管理の導入など、事業資金の選択肢を比較して検討できます。', '審査あり。融資条件は審査結果により決まります。法人代表者の連帯保証が必要です。'],
  },
];
const rsaRows = rsas.map((rsa) => {
  rsa.headlines.forEach((headline, index) => assertLimit(`RSA ${rsa.adGroup} headline ${index + 1}`, headline, 30));
  rsa.descriptions.forEach((description, index) => assertLimit(`RSA ${rsa.adGroup} description ${index + 1}`, description, 90));
  return {
    Campaign: campaign, 'Ad group': rsa.adGroup, 'Ad type': 'Responsive search ad', Status: 'Enabled', 'Final URL': landingPage, 'Path 1': 'unsou', 'Path 2': 'shikin',
    'Headline 1': rsa.headlines[0], 'Headline 1 position': '1',
    ...Object.fromEntries(rsa.headlines.slice(1).map((headline, index) => [`Headline ${index + 2}`, headline])),
    ...Object.fromEntries(rsa.descriptions.map((description, index) => [`Description ${index + 1}`, description])),
  };
});
const rsaHeaders = ['Campaign', 'Ad group', 'Ad type', 'Status', 'Final URL', 'Path 1', 'Path 2', 'Headline 1', 'Headline 1 position', ...Array.from({ length: 14 }, (_, index) => `Headline ${index + 2}`), 'Description 1', 'Description 2', 'Description 3', 'Description 4'];
writeUtf16Csv('03_GAE_ADD_RSA_UTF16.csv', rsaHeaders, rsaRows);

const review = `# アクト・ウィル｜研究反映 Phase 1 GAE\n\n- 作成日: 2026-08-12（JST）\n- 対象キャンペーン: \`${campaign}\`（既存名をそのまま使用）\n- LP: ${landingPage}\n- 状態: **未インポート**。Google Ads Editorのプレビューで内容を確認してから適用する。\n\n## このパッケージの内容\n\n|ファイル|内容|件数|\n|---|---:|---:|\n|01_GAE_ADD_ADGROUPS_UTF16.csv|新規広告グループ|2|\n|02_GAE_ADD_KEYWORDS_UTF16.csv|完全一致キーワード|48|\n|03_GAE_ADD_RSA_UTF16.csv|新規RSA|2|\n\n既存のAG04〜AG07にはキーワードのみを追加し、AG08・AG09だけを新設します。\n\n## 採用基準\n\n- \`03_INITIAL_TEST_KW.csv\` にある候補のうち、\`initial_max_cpc=50円\`だけを対象にした。\n- 過去のGAEパッケージに既出のキーワードは除外した。\n- KWP低額帯が50円を超えた \`法人 カーリース 審査 通らない\`、\`リース 審査 通らない 法人\`、\`運送業 運転資金\` は入れない。\n- 直接金融・銀行融資待ち・不自然な入金ギャップ語はPhase 2候補として残し、この少額検証には含めない。\n\n## Google Ads Editorのインポート順\n\n1. \`01_GAE_ADD_ADGROUPS_UTF16.csv\`\n2. \`02_GAE_ADD_KEYWORDS_UTF16.csv\`\n3. \`03_GAE_ADD_RSA_UTF16.csv\`\n\nプレビューでは、既存キャンペーン \`${campaign}\` の更新、広告グループ2件追加、キーワード48件追加、RSA2件追加だけであることを確認してください。**新しいキャンペーンの作成が表示された場合は適用しないでください。**\n\n## 初動の見方\n\n50円は市場CPCの断定ではなく、少額観測の上限です。インプレッションが不足する語を一律で増額せず、まず検索語句の法人性とMCVを確認します。\n`;
fs.writeFileSync(path.join(outDir, 'README.md'), review, 'utf8');

console.log(JSON.stringify({ outDir, campaign, adGroupsAdded: newAdGroups.length, keywords: keywordRows.length, rsas: rsaRows.length }, null, 2));

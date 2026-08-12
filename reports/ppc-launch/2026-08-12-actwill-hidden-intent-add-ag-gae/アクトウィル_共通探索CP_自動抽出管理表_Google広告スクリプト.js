// アクト・ウィル｜共通探索CP 日次集計 Google広告スクリプト
//
// Google広告 > ツール > 一括操作 > スクリプト に貼り付けて実行してください。
// 初回は新しいGoogleスプレッドシートを作成し、実行ログにURLを表示します。
// 2回目以降は、初回ログのURLを CONFIG.SPREADSHEET_URL に貼ると同じ管理表を更新します。
//
// 取得対象: 共通探索CP（AG01〜AG07）
// 取得内容: キャンペーン・検索語句・キーワードの日次実績（広告費 / MCV）
// 手入力: A8の仮査定完了・確定報酬（成果_ASPタブ）
//
// 重要: 成果確定には約30日を要するため、初期の自動判定は最終CVだけで停止しません。

var CONFIG = {
  // 初回実行時は空欄のまま。作成されたURLをログから貼り戻す。
  SPREADSHEET_URL: '',

  // Google広告上のキャンペーン名を完全一致で指定する。
  CAMPAIGN_NAME: '共通探索CP',
  LOOKBACK_DAYS: 2,          // 前日・前々日を毎日取り直し、遅延反映したMCVを拾う。
  ANALYSIS_WINDOW_DAYS: 30,  // 分析対象。0なら全期間。

  // 案件の確定情報。
  PAYOUT_YEN: 10000,
  APPROVAL_RATE: 0.9866,
  DAILY_BUDGET_YEN: 2000,
  INITIAL_CPC_YEN: 50,
  TEST_BUDGET_YEN: 14000,
  FINAL_CONVERSION_LAG_DAYS: 30,

  // MCVから最終成果への率は未計測。ここは0のまま運用データで決める。
  TARGET_MCV_TO_FINAL_RATE: 0,

  // 自動「候補」への掲載基準。自動で停止・除外・入札変更はしない。
  REVIEW_CLICKS: 10,
  REVIEW_COST_YEN: 700,
  PROMOTE_MCV: 1
};

var TABS = {
  campDaily: '生_キャンペーン日次',
  termDaily: '生_検索語句日次',
  kwDaily: '生_キーワード日次',
  summary: '実績サマリー',
  terms: '検索語句判定候補',
  kw: 'KW別実績・判断候補',
  action: '今日のアクション',
  asp: '成果_ASP',
  setting: '設定'
};

function main() {
  var ss = openOrCreateSpreadsheet_();
  ensureSheets_(ss);
  loadSettings_(ss);

  var tz = AdsApp.currentAccount().getTimeZone();
  var today = formatDate_(new Date(), tz);
  var end = offsetDate_(today, -1);
  var start = offsetDate_(today, -CONFIG.LOOKBACK_DAYS);
  Logger.log('取得対象: ' + CONFIG.CAMPAIGN_NAME + ' / ' + start + '〜' + end);

  pullCampaignDaily_(ss, start, end);
  pullSearchTermDaily_(ss, start, end);
  pullKeywordDaily_(ss, start, end);
  rebuildAnalysis_(ss, tz);

  Logger.log('完了: ' + ss.getUrl());
}

function openOrCreateSpreadsheet_() {
  if (CONFIG.SPREADSHEET_URL) return SpreadsheetApp.openByUrl(CONFIG.SPREADSHEET_URL);
  var ss = SpreadsheetApp.create('アクト・ウィル｜共通探索CP 自動抽出管理表');
  ss.getSheets()[0].setName(TABS.campDaily);
  Logger.log('管理表を新規作成しました。次回以降のため、下記URLを CONFIG.SPREADSHEET_URL に貼り戻してください。');
  Logger.log(ss.getUrl());
  return ss;
}

function ensureSheets_(ss) {
  ensureSheet_(ss, TABS.campDaily, ['日付', 'キャンペーン', 'クリック', '費用', '表示', 'MCV']);
  ensureSheet_(ss, TABS.termDaily, ['日付', 'キャンペーン', '広告グループ', '検索語句', '配信KW', '配信KWマッチ', 'クリック', '費用', 'MCV']);
  ensureSheet_(ss, TABS.kwDaily, ['日付', 'キャンペーン', '広告グループ', 'キーワード', 'マッチ', '入札CPC', '表示', 'クリック', '費用', 'MCV']);
  ensureSheet_(ss, TABS.asp, ['日付', 'キャンペーン', '公式遷移（MCV）', '仮査定完了', '承認成果', '確定報酬', 'メモ']);

  var setting = ensureSheet_(ss, TABS.setting, ['項目', '値', '補足']);
  if (setting.getLastRow() === 1) {
    setting.getRange(2, 1, 11, 3).setValues([
      ['対象キャンペーン', CONFIG.CAMPAIGN_NAME, 'Google広告上の名前と完全一致'],
      ['再取得日数', CONFIG.LOOKBACK_DAYS, '遅延反映のMCVを拾うため、前日・前々日を再取得'],
      ['分析対象日数', CONFIG.ANALYSIS_WINDOW_DAYS, '0なら全期間'],
      ['成果報酬', CONFIG.PAYOUT_YEN, '新規審査完了 1件あたり'],
      ['確定率', CONFIG.APPROVAL_RATE, '案件情報: 98.66%'],
      ['日予算', CONFIG.DAILY_BUDGET_YEN, '初期設定'],
      ['初期上限CPC', CONFIG.INITIAL_CPC_YEN, '低CPCテスト開始値'],
      ['テスト枠', CONFIG.TEST_BUDGET_YEN, '初期テスト枠'],
      ['成果確定目安（日）', CONFIG.FINAL_CONVERSION_LAG_DAYS, '最終CVだけで早期停止しない'],
      ['MCV→最終CV率', CONFIG.TARGET_MCV_TO_FINAL_RATE, '未計測。実績がたまってから入力'],
      ['管理上の注意', '候補の自動反映なし', '除外・停止・CPC変更はプレビュー確認後に手動で実施']
    ]);
  }
}

function ensureSheet_(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(header);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#12304a').setFontColor('#ffffff');
  }
  return sh;
}

function loadSettings_(ss) {
  var sh = ss.getSheetByName(TABS.setting);
  var rows = sh.getDataRange().getValues();
  var values = {};
  for (var i = 1; i < rows.length; i++) values[String(rows[i][0])] = rows[i][1];
  if (values['対象キャンペーン']) CONFIG.CAMPAIGN_NAME = String(values['対象キャンペーン']);
  if (values['再取得日数'] !== undefined && values['再取得日数'] !== '') CONFIG.LOOKBACK_DAYS = Number(values['再取得日数']);
  if (values['分析対象日数'] !== undefined && values['分析対象日数'] !== '') CONFIG.ANALYSIS_WINDOW_DAYS = Number(values['分析対象日数']);
  if (values['成果報酬'] !== undefined && values['成果報酬'] !== '') CONFIG.PAYOUT_YEN = Number(values['成果報酬']);
  if (values['確定率'] !== undefined && values['確定率'] !== '') CONFIG.APPROVAL_RATE = Number(values['確定率']);
  if (values['成果確定目安（日）'] !== undefined && values['成果確定目安（日）'] !== '') CONFIG.FINAL_CONVERSION_LAG_DAYS = Number(values['成果確定目安（日）']);
  if (values['MCV→最終CV率'] !== undefined && values['MCV→最終CV率'] !== '') CONFIG.TARGET_MCV_TO_FINAL_RATE = Number(values['MCV→最終CV率']);
}

function pullCampaignDaily_(ss, start, end) {
  var query = "SELECT segments.date, campaign.name, metrics.clicks, metrics.cost_micros, metrics.impressions, metrics.conversions " +
    "FROM campaign WHERE campaign.name = '" + escapeGaql_(CONFIG.CAMPAIGN_NAME) + "' " +
    "AND segments.date BETWEEN '" + start + "' AND '" + end + "'";
  var rows = [];
  var it = AdsApp.search(query);
  while (it.hasNext()) {
    var r = it.next();
    rows.push([r.segments.date, r.campaign.name, n_(r.metrics.clicks), yen_(r.metrics.costMicros), n_(r.metrics.impressions), n_(r.metrics.conversions)]);
  }
  upsertByDate_(ss.getSheetByName(TABS.campDaily), rows, start, end, 2);
}

function pullSearchTermDaily_(ss, start, end) {
  var query = "SELECT segments.date, campaign.name, ad_group.name, search_term_view.search_term, " +
    "segments.keyword.info.text, segments.keyword.info.match_type, metrics.clicks, metrics.cost_micros, metrics.conversions " +
    "FROM search_term_view WHERE campaign.name = '" + escapeGaql_(CONFIG.CAMPAIGN_NAME) + "' " +
    "AND segments.date BETWEEN '" + start + "' AND '" + end + "'";
  var rows = [];
  var it = AdsApp.search(query);
  while (it.hasNext()) {
    var r = it.next();
    var source = r.segments.keyword && r.segments.keyword.info ? r.segments.keyword.info : {};
    rows.push([r.segments.date, r.campaign.name, r.adGroup.name, r.searchTermView.searchTerm,
      source.text || '', source.matchType || '', n_(r.metrics.clicks), yen_(r.metrics.costMicros), n_(r.metrics.conversions)]);
  }
  upsertByDate_(ss.getSheetByName(TABS.termDaily), rows, start, end, 4);
}

function pullKeywordDaily_(ss, start, end) {
  var query = "SELECT segments.date, campaign.name, ad_group.name, ad_group_criterion.keyword.text, " +
    "ad_group_criterion.keyword.match_type, ad_group_criterion.effective_cpc_bid_micros, metrics.impressions, " +
    "metrics.clicks, metrics.cost_micros, metrics.conversions " +
    "FROM keyword_view WHERE campaign.name = '" + escapeGaql_(CONFIG.CAMPAIGN_NAME) + "' " +
    "AND segments.date BETWEEN '" + start + "' AND '" + end + "' " +
    "AND ad_group_criterion.status != 'REMOVED'";
  var rows = [];
  var it = AdsApp.search(query);
  while (it.hasNext()) {
    var r = it.next();
    var kw = r.adGroupCriterion.keyword || {};
    rows.push([r.segments.date, r.campaign.name, r.adGroup.name, kw.text || '', kw.matchType || '',
      yen_(r.adGroupCriterion.effectiveCpcBidMicros), n_(r.metrics.impressions), n_(r.metrics.clicks),
      yen_(r.metrics.costMicros), n_(r.metrics.conversions)]);
  }
  upsertByDate_(ss.getSheetByName(TABS.kwDaily), rows, start, end, 4);
}

function upsertByDate_(sh, incoming, start, end, keyColumns) {
  var data = sh.getDataRange().getValues();
  var header = data.shift();
  var keep = [];
  var startKey = start.replace(/-/g, '');
  var endKey = end.replace(/-/g, '');
  for (var i = 0; i < data.length; i++) {
    var dateKey = dateKey_(data[i][0]);
    if (dateKey < startKey || dateKey > endKey) keep.push(data[i]);
  }
  var merged = keep.concat(incoming);
  merged.sort(function(a, b) {
    var left = dateKey_(a[0]) + '|' + a.slice(1, keyColumns + 1).join('|');
    var right = dateKey_(b[0]) + '|' + b.slice(1, keyColumns + 1).join('|');
    return left < right ? -1 : left > right ? 1 : 0;
  });
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  if (merged.length) sh.getRange(2, 1, merged.length, header.length).setValues(merged);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#12304a').setFontColor('#ffffff');
  sh.autoResizeColumns(1, header.length);
}

function rebuildAnalysis_(ss, tz) {
  var from = '';
  if (CONFIG.ANALYSIS_WINDOW_DAYS > 0) from = offsetDate_(formatDate_(new Date(), tz), -CONFIG.ANALYSIS_WINDOW_DAYS);
  var camp = readRows_(ss.getSheetByName(TABS.campDaily), from);
  var terms = readRows_(ss.getSheetByName(TABS.termDaily), from);
  var keywords = readRows_(ss.getSheetByName(TABS.kwDaily), from);
  var asp = readRows_(ss.getSheetByName(TABS.asp), from);

  writeSummary_(ss.getSheetByName(TABS.summary), camp, terms, keywords, asp);
  writeTermCandidates_(ss.getSheetByName(TABS.terms), terms);
  writeKeywordAnalysis_(ss.getSheetByName(TABS.kw), keywords);
  writeActions_(ss.getSheetByName(TABS.action), terms, keywords, asp);
}

function readRows_(sh, from) {
  if (!sh || sh.getLastRow() < 2) return [];
  var data = sh.getDataRange().getValues();
  data.shift();
  if (!from) return data;
  var key = from.replace(/-/g, '');
  return data.filter(function(row) { return dateKey_(row[0]) >= key; });
}

function writeSummary_(sh, camp, terms, keywords, asp) {
  var agg = { clicks: 0, cost: 0, impressions: 0, mcv: 0 };
  camp.forEach(function(r) {
    agg.clicks += n_(r[2]); agg.cost += n_(r[3]); agg.impressions += n_(r[4]); agg.mcv += n_(r[5]);
  });
  var aspAgg = { assessment: 0, approved: 0, revenue: 0 };
  asp.forEach(function(r) {
    aspAgg.assessment += n_(r[3]); aspAgg.approved += n_(r[4]); aspAgg.revenue += n_(r[5]);
  });
  var lines = [
    ['アクト・ウィル｜共通探索CP 自動集計サマリー', '', '', ''],
    ['対象期間', CONFIG.ANALYSIS_WINDOW_DAYS ? '直近' + CONFIG.ANALYSIS_WINDOW_DAYS + '日' : '全期間', '', ''],
    ['広告費', agg.cost, 'クリック', agg.clicks],
    ['表示', agg.impressions, '実CPC', agg.clicks ? Math.round(agg.cost / agg.clicks) : 0],
    ['MCV（公式遷移）', agg.mcv, 'MCVR', agg.clicks ? agg.mcv / agg.clicks : 0],
    ['仮査定完了（手入力）', aspAgg.assessment, '承認成果（手入力）', aspAgg.approved],
    ['確定報酬（手入力）', aspAgg.revenue, '最終CPA', aspAgg.approved ? Math.round(agg.cost / aspAgg.approved) : 0],
    ['案件報酬', CONFIG.PAYOUT_YEN, '確定率', CONFIG.APPROVAL_RATE],
    ['注意', '成果確定目安は約' + CONFIG.FINAL_CONVERSION_LAG_DAYS + '日。最終CVゼロだけで初期停止しない。', '', ''],
    ['', '', '', ''],
    ['広告グループ別', '広告費', 'クリック', 'MCV']
  ];
  var byAg = {};
  keywords.forEach(function(r) {
    var name = r[2] || '不明';
    if (!byAg[name]) byAg[name] = { cost: 0, clicks: 0, mcv: 0 };
    byAg[name].cost += n_(r[8]); byAg[name].clicks += n_(r[7]); byAg[name].mcv += n_(r[9]);
  });
  Object.keys(byAg).sort().forEach(function(name) { lines.push([name, byAg[name].cost, byAg[name].clicks, byAg[name].mcv]); });
  writeSheet_(sh, lines, 1, [1, 11]);
  sh.getRange('B3:B3').setNumberFormat('¥#,##0');
  sh.getRange('D4:D4').setNumberFormat('¥#,##0');
  sh.getRange('D5:D5').setNumberFormat('0.0%');
  sh.getRange('B7:B8').setNumberFormat('¥#,##0');
  sh.getRange('D7:D7').setNumberFormat('¥#,##0');
  sh.getRange('D8:D8').setNumberFormat('0.00%');
}

function writeTermCandidates_(sh, rows) {
  var map = {};
  rows.forEach(function(r) {
    var key = [r[1], r[2], r[3], r[4], r[5]].join('|');
    if (!map[key]) map[key] = { campaign: r[1], ag: r[2], term: r[3], kw: r[4], match: r[5], clicks: 0, cost: 0, mcv: 0 };
    map[key].clicks += n_(r[6]); map[key].cost += n_(r[7]); map[key].mcv += n_(r[8]);
  });
  var lines = [['キャンペーン', '広告グループ', '検索語句', '配信KW', 'マッチ', 'クリック', '広告費', 'MCV', '実CPC', '自動候補', '手動判定', '対応メモ']];
  Object.keys(map).forEach(function(key) {
    var v = map[key];
    var cpc = v.clicks ? Math.round(v.cost / v.clicks) : 0;
    var action = '継続観察';
    if (v.mcv >= CONFIG.PROMOTE_MCV) action = '完全一致・専用AGの候補';
    else if (v.clicks >= CONFIG.REVIEW_CLICKS || v.cost >= CONFIG.REVIEW_COST_YEN) action = '検索意図を確認（除外候補）';
    lines.push([v.campaign, v.ag, v.term, v.kw, v.match, v.clicks, v.cost, v.mcv, cpc, action, '', '']);
  });
  lines = [lines[0]].concat(lines.slice(1).sort(function(a, b) { return b[6] - a[6]; }));
  writeSheet_(sh, lines, 1, [1]);
  sh.getRange(2, 7, Math.max(1, lines.length - 1), 1).setNumberFormat('¥#,##0');
  sh.getRange(2, 9, Math.max(1, lines.length - 1), 1).setNumberFormat('¥#,##0');
}

function writeKeywordAnalysis_(sh, rows) {
  var map = {};
  rows.forEach(function(r) {
    var key = [r[1], r[2], r[3], r[4]].join('|');
    if (!map[key]) map[key] = { campaign: r[1], ag: r[2], kw: r[3], match: r[4], bid: r[5], imp: 0, clicks: 0, cost: 0, mcv: 0 };
    map[key].bid = r[5]; map[key].imp += n_(r[6]); map[key].clicks += n_(r[7]); map[key].cost += n_(r[8]); map[key].mcv += n_(r[9]);
  });
  var lines = [['キャンペーン', '広告グループ', 'キーワード', 'マッチ', '現入札CPC', '表示', 'クリック', '広告費', 'MCV', '実CPC', 'CPMCV', '自動候補', '手動判断', '対応メモ']];
  Object.keys(map).forEach(function(key) {
    var v = map[key];
    var cpc = v.clicks ? Math.round(v.cost / v.clicks) : 0;
    var cpmcv = v.mcv ? Math.round(v.cost / v.mcv) : 0;
    var action = '継続観察';
    if (v.mcv >= CONFIG.PROMOTE_MCV) action = '継続・検索語句を抽出';
    else if (v.clicks >= CONFIG.REVIEW_CLICKS || v.cost >= CONFIG.REVIEW_COST_YEN) action = '検索語句精査';
    else if (v.imp === 0) action = '未配信確認（状態・地域・CPC）';
    lines.push([v.campaign, v.ag, v.kw, v.match, v.bid, v.imp, v.clicks, v.cost, v.mcv, cpc, cpmcv, action, '', '']);
  });
  lines = [lines[0]].concat(lines.slice(1).sort(function(a, b) { return b[7] - a[7]; }));
  writeSheet_(sh, lines, 1, [1]);
  sh.getRange(2, 5, Math.max(1, lines.length - 1), 1).setNumberFormat('¥#,##0');
  sh.getRange(2, 8, Math.max(1, lines.length - 1), 3).setNumberFormat('¥#,##0');
}

function writeActions_(sh, terms, keywords, asp) {
  var lines = [['優先度', '対象', '理由', '自動提案', '手動で行うこと']];
  var termMap = {};
  terms.forEach(function(r) {
    var term = r[3];
    if (!termMap[term]) termMap[term] = { clicks: 0, cost: 0, mcv: 0 };
    termMap[term].clicks += n_(r[6]); termMap[term].cost += n_(r[7]); termMap[term].mcv += n_(r[8]);
  });
  Object.keys(termMap).forEach(function(term) {
    var v = termMap[term];
    if (v.mcv >= CONFIG.PROMOTE_MCV) lines.push(['高', term, 'MCV ' + v.mcv + '件', '勝ち検索語句候補', '完全一致＋専用AG追加を検討。元の発掘KWには除外を戻す。']);
    else if (v.clicks >= CONFIG.REVIEW_CLICKS || v.cost >= CONFIG.REVIEW_COST_YEN) lines.push(['中', term, 'MCV 0 / ' + v.clicks + 'クリック / ¥' + v.cost, '意図確認候補', '個人・求人・説明検索・修理店等なら完全一致で除外。']);
  });
  if (asp.length === 0) lines.push(['中', '成果_ASP', '最終成果の手入力が未登録', '成果の遅延を可視化', 'A8で仮査定完了・確定報酬を確認後、成果_ASPへ入力。']);
  if (lines.length === 1) lines.push(['低', 'データ待ち', '直近期間のクリックまたは検索語句が未取得', '配信状況を確認', 'Google広告側のCP状態・日付範囲・計測設定を確認。']);
  lines = [lines[0]].concat(lines.slice(1).sort(function(a, b) { return a[0] < b[0] ? -1 : 1; }));
  writeSheet_(sh, lines, 1, [1]);
}

function writeSheet_(sh, rows, frozenRows, boldRows) {
  sh.clearContents();
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.setFrozenRows(frozenRows);
  for (var i = 0; i < boldRows.length; i++) {
    sh.getRange(boldRows[i], 1, 1, rows[0].length).setFontWeight('bold').setBackground('#12304a').setFontColor('#ffffff');
  }
  sh.autoResizeColumns(1, rows[0].length);
}

function formatDate_(date, tz) {
  return Utilities.formatDate(date, tz, 'yyyy-MM-dd');
}

function offsetDate_(dateString, days) {
  var d = new Date(dateString + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd');
}

function dateKey_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, 'Asia/Tokyo', 'yyyyMMdd');
  return String(value).replace(/[^0-9]/g, '').substring(0, 8);
}

function n_(value) { return Number(value) || 0; }
function yen_(micros) { return Math.round((Number(micros) || 0) / 1000000); }
function escapeGaql_(value) { return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

# アクト・ウィル｜共通探索CP GAE取込みパッケージ

`actwill_ppc_launch_plan.xlsx` の初日KW・RSA広告文・除外KWをもとにした、新規の検索キャンペーン用ファイルです。

## 作成内容

- 新規キャンペーン名: `共通探索CP`
- 配信方式: Google検索のみ / 手動CPC / 検索パートナーOFF / AI Max OFF
- 地域・言語: 日本 / 日本語
- 初期上限CPC: 全16キーワードとも50円
- 日予算: 1,000円（計画表に指定がないための仮置き）
- キャンペーン状態: **一時停止**（インポート直後に配信されません）
- 広告グループ: 3件、RSA: 3件、キーワード: 16件、除外キーワード: 19件、サイトリンク: 5件、コールアウト: 8件

## 取込み順

1. `01_GAE_CREATE_CAMPAIGN_UTF16.csv`
2. `02_GAE_ADD_LOCATION_UTF16.csv`
3. `03_GAE_ADD_ADGROUPS_UTF16.csv`
4. `04_GAE_ADD_KEYWORDS_UTF16.csv`
5. `05_GAE_ADD_RSA_UTF16.csv`
6. `06_GAE_ADD_CAMPAIGN_NEGATIVES_UTF16.csv`
7. `07_GAE_ADD_CAMPAIGN_SITELINKS_UTF16.csv`
8. `08_GAE_ADD_CAMPAIGN_CALLOUTS_UTF16.csv`

Google Ads Editorで各CSVを順にインポートしてください。すべてUTF-16LE（BOM付き）なので、Windows環境でも日本語が文字化けしません。プレビューでは、新規キャンペーンが **`共通探索CP` の1件のみ**作成されること、除外KWが19件であることを確認してから投稿します。

## 除外KWのマッチタイプ

- 完全一致: アクトウィルの商標4語
- フレーズ一致: 法人対象外・情報収集・別ニーズ・別商品の15語

サイトリンクは、記事LP内の実在するセクション（`#terms`、`#check`、`#flow`、`#faq`、`#compare`）へ設定しています。

# プロジェクト管理ドキュメント

## 📋 プロジェクト概要

### プロジェクト名
HIKING GATE ACCESS IN JAPAN
*変更する可能性あり

### 開発の目的
開発者は、AIを活用したNext.jsでのウェブアプリケーション開発を習得すること。
Type Script、位置情報、AIへの問い合わせと回答の利用

### このウェブサイトの目的・ゴール
登山をしたい外国人と日本人のユーザーが、簡単に登山口までのアクセス情報を取得できること。


背景：自家用車を持っていない場合に、登山口までのアクセスを調べて計画するのはとても時間がかかる。土地勘や登山の経験があまりない場合はさらにハードルが上がっている。
海外の方が日本で登山をしたいとおもったら、なおさらハードルがあがる。
一方近年のAIは性能が大きく上がっており、AIを活用することで簡単に情報収集できることを活用したい。

### 主要機能
- UI言語はまず日本語で作成する。ただし、日・英対応に移行しやすいようにしておく。
- UIは当面日本語で実装するが、文言の直書きを増やしすぎず、将来的に英語へ切り替えやすい構成にする。
- アプリ内では、日本の登山口、山に関するデータをデータベースで保持する。
- ユーザーは、UIから登山したい山を選択する。
- APIでAIに問い合わせを行い、取得した回答を成形して表示する。
  - 表示したい情報：
    - その登山口までのアクセス
    - その登山口から登れる主要な山
    - 頂上までの時間
    - 山小屋があるかどうか
    - 登山口近くの温泉
    - 登山口近くのレストラン

### 第二弾以降で実装したい機能
- 二つ以上のAIエージェントに問い合わせを行い、ユーザーは回答を比較できるようにする
- UI言語は、英語と日本語を切り替えられることする

### カスタムナレッジAI（RAG）機能（アイディア）
日本の登山に関する独自情報をJSONで構造化し、それをコンテキストとしてAIに与えることで、より精度の高い回答を実現する。

**アプローチ：RAG（Retrieval-Augmented Generation）**
- モデルの再学習（ファインチューニング）ではなく、取得したデータをプロンプトに注入する方式
- Gemini APIの範囲で実装可能

**ナレッジベースの対象（第一弾）**
- 山小屋（huts）
- テント場（campsites）
- 各施設の情報：営業開始日・営業終了日・予約・キャンセル・最寄り登山口・最寄り山頂・ウェブサイト・電話番号

**実装イメージ**
1. Supabaseに山小屋・テント場の構造化データを蓄積
2. ユーザーが登山口を選択したとき、関連データをSupabaseから取得
3. 取得データをプロンプトのコンテキストとして注入し、Geminiに質問
4. UIでエージェントを選択できるようにする
   - 「一般AI」: コンテキストなしで回答（素のGemini）
   - 「カスタムAI」: HikingGateのナレッジベースを使って回答
5. 両エージェントの回答を並べて比較表示（第二弾機能と統合）

### 登山道・ルートデータ（計画）
- **YAMAP** で登山ルートの **GPX ファイルを出力**し、本アプリ用のデータソースとする。
- 上記 GPX を取り込み、地図上に**登山道（ルート）を描画**するための **API** を実装する（Next.js の `app/api/` 配下を想定）。
- GPX の保管場所（DB / ストレージ）、ルートと登山口・山データの紐づけ、利用規約（YAMAP・第三者データの取り扱い）は実装時に具体化する。


---

## 🛠️ 技術スタック
### フレームワーク・ライブラリ
- **フレームワーク**: Next.js
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **状態管理**: <!-- 使用する状態管理ライブラリを記入 -->
- **データベース**: Supabase（PostgreSQL + PostGIS）
- **AI API**: Google Gemini（無料枠を活用）
- **地図サービス**: **Mapbox**（[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/)）。転職ポートフォリオでも説明しやすいスタックとして採用。無料枠あり（月間セッション等の上限は [Mapbox の料金ページ](https://www.mapbox.com/pricing) で確認）。
- **その他**: <!-- その他の主要なライブラリを記入 -->

### 開発環境
- **Node.js バージョン**: <!-- 使用するNode.jsのバージョン -->
- **パッケージマネージャー**: <!-- npm / yarn / pnpm -->
- **エディタ**: Cursor

### デプロイ・ホスティング
- **デプロイ先**: <!-- Vercel / Netlify / その他 -->
- **ドメイン**: <!-- 使用するドメインがあれば記入 -->

### AI活用
- **AIエディタ**:Cursor
- **AIエディタの立ち位置**:Cursorは、主にガイド役として実装の案をAI paneで表示したり、解説したりする。ソースコードを直接編集することはない。（実装者がAIに頼りすぎずに、スキルアップできるようにする）

---

## 📐 開発ルール・ガイドライン

### コーディング規約
- **命名規則**:
  - コンポーネント: PascalCase（例: `MapContainer`, `PinMarker`）
  - 変数・関数: camelCase（例: `userLocation`, `getTrailheads`）
  - 定数: UPPER_SNAKE_CASE（例: `API_BASE_URL`）
  - ファイル名: コンポーネントはPascalCase、その他はcamelCase
- **座標（地理データ）**: アプリ内の **タプルは `[経度, 緯度]`（WGS84）** とする（Mapbox / GeoJSON と同じ並び）。フィールド名は **`lngLat`**（例: `src/lib/queries/trailheads.ts` の `Trailhead`、`useUserLocation` の `userLocation`）。DB は `lat` / `lng` 列のまま、アプリ型へは **`[row.lng, row.lat]`** でマッピングする。
- **インデント**: スペース2つ
- **文言管理**:
  - JSX内に日本語文言を直接大量に書かない
  - 将来の多言語対応を見据え、UI文言はまとめて管理しやすい形にする
- **コンポーネントの分離**: 
  - 1つのコンポーネントは1つの責任を持つ
  - 再利用可能な部分は`components/`に分離
  - ロジックとUIは可能な限り分離
- **Server Components vs Client Components**:
  - デフォルトはServer Component（`'use client'`なし）
  - ブラウザAPI（`window`, `document`）やインタラクションが必要な場合のみ`'use client'`を使用
  - データベースアクセスはServer ComponentまたはAPI Routeで実行

### App Router・クライアント境界のルール（実装時・AI支援時の遵守）

Next.js の Server / Client の取り違えは、`window is not defined` や `ssr: false is not allowed` などに直結し、デバッグに時間がかかる。**コード生成や提案でも、境界を無視した「とりあえず動きそうな」書き方は避ける。** 詳細な経緯は `Cursor/2026-03-17_map_setup_notes.md` を参照。

**原則**

- 新規ページ・機能を足すときは、**どのファイルが Server Component / Client Component かを先に決めてから** import と `dynamic` を書く。
- **`window` / `document` / `navigator`、Mapbox GL JS、地図キャンバス DOM** などブラウザ専用の API やライブラリは、**Server Component のツリーから import しない**（トップレベルで `mapbox-gl` を読むとサーバーでも評価され、エラーになりうる）。

**`next/dynamic` と `ssr: false`**

- **`dynamic(..., { ssr: false })` は Server Component 内では使えない**（App Router では `page.tsx` が多く Server Component のため、そこに直接書くとエラーになる）。
- 推奨パターン: **`page.tsx` は Server のまま** → 子として **`'use client'` のラッパー**（例: `MapContainerWrapper`）を置く → **ラッパー内**で `dynamic(..., { ssr: false })` により地図本体を読み込む。

**地図（Mapbox GL JS）まわり（方針）**

- **Mapbox GL JS** は WebGL ベースで、**必ずクライアント専用**として扱う。`page.tsx` に直書きせず、**`'use client'` コンポーネント**、または **`next/dynamic` + `ssr: false`** で地図コンポーネントを読み込む（既存の `MapContainerWrapper` パターンと同じ思想）。
- **アクセストークン**は環境変数で渡す（後述「Mapbox 組み込み手順」）。**公開トークン**でも URL 制限を Mapbox ダッシュボードでかけるのが前提。秘密にしたい処理はサーバー側に置く。
- 地図が「エラーはないのに真っ白」のときはロジックだけでなく、**親から子までの高さチェーン**を疑う。`h-full` だけに頼らず、`layout` / `body` / 地図用コンテナに **明示的な高さ**（例: `h-screen`、flex 子の `min-h-0` など）を確保する。
- **旧実装メモ**: 当初は OpenStreetMap + Leaflet を試したが、`react-leaflet` 単体での解決不整合などがあり、後に Mapbox へ方針変更。経緯の詳細は `Cursor/2026-03-17_map_setup_notes.md` を参照。

**この節の扱い**

- 今後、別機能（認証 UI、位置情報フックの共有方針など）で同種の手戻りがあれば、**ここに箇条書きで追記**し、プロジェクトの「決め事」として蓄積する。

### ファイル構成

#### ディレクトリ構造
```
src/
├── app/                    # Next.js App Router（ルーティング + ページ）
│   ├── page.tsx            # トップページ（/）
│   ├── layout.tsx          # 共通レイアウト
│   ├── globals.css         # グローバルスタイル
│   └── api/                # API Routes（バックエンド）
│       ├── trailheads/
│       │   └── route.ts   # /api/trailheads（登山口データ取得）
│       ├── ai/
│       │   └── route.ts   # /api/ai（AI問い合わせ）
│       └── trails/        # 予定: YAMAP 出力 GPX 由来の登山道描画 API（「登山道・ルートデータ」参照）
│           └── route.ts
├── components/             # 再利用可能なUIコンポーネント
│   ├── MapContainer.tsx    # 地図コンテナ
│   ├── PinMarker.tsx        # ピンコンポーネント（登山口・山頂）
│   ├── InfoTooltip.tsx     # ツールチップ（基本情報表示）
│   ├── AISidebar.tsx       # AI結果サイドバー
│   └── LocationButton.tsx  # 現在地ボタン
└── lib/                    # ユーティリティ・設定・接続
    ├── supabase.ts         # Supabaseクライアント設定
    └── gemini.ts           # Google Gemini API設定
```

#### ファイル命名規則
- **コンポーネント**: PascalCase（例: `MapContainer.tsx`）
- **API Routes**: `route.ts`（Next.jsの規約）
- **ユーティリティ**: camelCase（例: `supabase.ts`）
- **ページ**: `page.tsx`（Next.jsの規約）

#### ディレクトリの役割
- **`app/`**: ルーティングとページ。フォルダ名がURLになる（`app/about/page.tsx` → `/about`）
- **`components/`**: 複数のページで再利用するUIコンポーネント
- **`lib/`**: データベース接続、API設定、共通関数など
- **`app/api/`**: サーバーサイドAPI。データベースアクセスや外部API呼び出し

### Git運用
開発者は一人なので、基本的にはdevelopブランチで作業を行う。
デプロイするときは、releaseブランチで行う

### アーキテクチャの原則
- **関心の分離**: UI、ロジック、データアクセスを明確に分離
- **再利用性**: 共通の機能は`components/`や`lib/`に配置
- **単一責任の原則**: 1つのコンポーネント/関数は1つの責任のみ
- **型安全性**: TypeScriptの型を適切に使用し、`any`は避ける
- **パフォーマンス**: 不要な再レンダリングを避ける（`useMemo`, `useCallback`を適切に使用）
- **多言語対応を前提にした設計**:
  - 実装順は日本語優先とする
  - ただし、DB・UI文言・APIレスポンス・AIプロンプトは日英対応しやすい構造で設計する
  - 翻訳作業は後回しでもよいが、設計は先に考慮する

### その他のルール
- **データフロー**: 
  - 親から子へはPropsでデータを渡す
  - 子から親へはコールバック関数でデータを渡す
  - グローバルな状態が必要な場合は状態管理ライブラリを検討
- **多言語対応方針**:
  - 対応言語は当面、日本語・英語の2言語
  - 初期実装は日本語UIのみで進める
  - DB設計は日本語専用に固定せず、少なくとも`*_ja` / `*_en`のような拡張を見据える
  - AI回答は将来的に`locale`に応じて日本語/英語を切り替えられるようにする
- **エラーハンドリング**: 
  - API呼び出しは必ずtry-catchでエラーハンドリング
  - ユーザーに分かりやすいエラーメッセージを表示
- **コメント**: 
  - 複雑なロジックには説明コメントを追加
  - 関数の目的は関数名で明確にする（コメント不要なレベルを目指す）

### Mapbox 組み込み手順（アカウント作成済み想定・実装は各自）

以下は **Next.js（App Router）** に Mapbox を載せるときの標準的な流れ。コードの詳細は [Mapbox GL JS の Install 手順](https://docs.mapbox.com/mapbox-gl-js/guides/install/) と [Next.js の環境変数](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables) を参照。

1. **アクセストークンを取得**  
   [Mapbox Account](https://account.mapbox.com/) → **Access tokens**。Default public token か、用途別にトークンを作成。

2. **環境変数を設定（クライアント用）**  
   プロジェクト直下に `.env.local` を作成（Git にコミットしない）。  
   - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...`  
   `NEXT_PUBLIC_` プレフィックスでブラウザから参照可能。本番（Vercel 等）でも同じ名前で設定する。

3. **Mapbox ダッシュボードで URL 制限（推奨）**  
   トークンの **URL restrictions** に `http://localhost:3000/*` と本番ドメインを追加。漏洩時の悪用を抑える。

4. **パッケージを追加**  
   ```bash
   npm install mapbox-gl
   npm install -D @types/mapbox-gl
   ```  
   React ラッパーを使う場合は `react-map-gl` の利用も選択肢（公式ドキュメントと互換バージョンを確認）。

5. **グローバル CSS**  
   `layout.tsx` などクライアントに届く経路で `mapbox-gl/dist/mapbox-gl.css` を import（または地図専用レイヤーに限定）。

6. **地図コンポーネントの置き場所**  
   - `'use client'` なコンポーネント内で `mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` を設定してから `new mapboxgl.Map({ container, style: 'mapbox://styles/mapbox/...' })` を初期化。  
   - もしくは **`next/dynamic` + `ssr: false`** でそのコンポーネントを遅延読み込み（既存の `MapContainerWrapper` と同様）。

7. **ビルド・Worker（必要な場合）**  
   一部のバンドラ設定では Mapbox の worker を明示する必要がある。エラーが出たら [Mapbox のトラブルシューティング](https://docs.mapbox.com/mapbox-gl-js/guides/install/#transpiling) と Next.js の `transpilePackages` 等を確認。

8. **`.gitignore`**  
   `.env.local` が無視されていることを確認。

---

## 🔗 参考リンク・リソース

### ドキュメント
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- <!-- その他の参考ドキュメント -->

### デザイン・UI
- <!-- デザインシステムやUIライブラリのリンク -->
- <!-- デザインファイル（Figma等）のリンク -->

### API・サービス
- **Supabase**: [Supabase公式ドキュメント](https://supabase.com/docs)
  - PostgreSQL + PostGISで位置情報を扱う
  - 無料プランあり
- **Google Gemini API**: [Google AI Studio](https://makersuite.google.com/app/apikey)
  - 無料枠: 1分あたり15リクエスト、1日あたり1,500リクエスト
  - 日本語対応良好
- **Mapbox**: [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/)
  - [スタイル一覧](https://docs.mapbox.com/api/maps/styles/)（`mapbox://styles/...`）
  - [アカウント・トークン](https://account.mapbox.com/)
  - React 連携: [react-map-gl](https://visgl.github.io/react-map-gl/)（任意）

### その他
- <!-- その他の参考になるリンク -->

---

## 📝 変更履歴

### 2026-03-21
- App Router における Server / Client 境界、`dynamic` + `ssr: false`、Leaflet 地図の高さまわりについて、`2026-03-17_map_setup_notes` の実績に基づき「App Router・クライアント境界のルール」を追記

### 2026-03-28
- YAMAP の GPX 出力と、本アプリ用の登山道描画 API を「登山道・ルートデータ（計画）」として追記。`app/api/` のディレクトリ例に `trails/`（予定）を追加

### 2026-04-11
- 地図スタックを **OpenStreetMap + Leaflet** から **Mapbox（Mapbox GL JS）** へ変更する方針を明記。App Router・クライアント境界の説明を Mapbox 前提に更新。「Mapbox 組み込み手順」セクションを追加
- コード・ドキュメントの座標を **`[経度, 緯度]` / `lngLat`** に統一（`useUserLocation`、`trailheads` クエリ、`MapContainer` 等）。`Cursor` 配下の写経ガイドを現状に合わせて更新

### 2026-04-14
- 「カスタムナレッジAI（RAG）機能」をアイディアとして追記。JSONナレッジベースをプロンプトに注入するRAGアプローチで、一般AIとカスタムAIをUI上で切り替え・比較できる機能の構想

### YYYY-MM-DD
- <!-- 変更内容を記入 -->

---

## ❓ 質問・課題

### 未解決の質問
- <!-- 解決が必要な質問や課題を記入 -->

### 検討中の事項
- DBの多言語対応方式
  - まずは `name_ja` / `name_en` のようなシンプルな構成を第一候補とする
  - 将来的に言語追加が必要になった場合は translation テーブル方式も検討する
- UI文言管理の方式
  - 小規模な辞書オブジェクトで始めるか、早い段階でi18nライブラリを導入するか
- AIプロンプトの言語切替方式
  - UI言語と同じ言語で回答させる方針を基本とする

---

## 📌 メモ・補足

<!-- その他、重要なメモや補足情報を自由に記入してください -->

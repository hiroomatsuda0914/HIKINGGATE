# 2026-03-17 Map Setup Notes

## 今日やろうとしたこと
- Next.js アプリに地図を表示する
- OpenStreetMap と Leaflet を使って、現在地中心の地図を出す

## 主なエラーと原因

### 1. `window is not defined`
- 原因:
  - `leaflet` や `react-leaflet` はブラウザ環境を前提としている
  - Next.js の Server Component 側で読み込まれると `window` が存在せずエラーになる
- 対応:
  - `MapContainerWrapper.tsx` を作成
  - そこで `dynamic(..., { ssr: false })` を使い、地図コンポーネントをクライアント側だけで読み込むようにした

### 2. `ssr: false is not allowed with next/dynamic in Server Components`
- 原因:
  - `page.tsx` は Server Component なので、そこに直接 `dynamic(..., { ssr: false })` を書けなかった
- 対応:
  - `page.tsx` からは `MapContainerWrapper` を普通に読み込む
  - `MapContainerWrapper.tsx` を Client Component にして、その中で `dynamic(..., { ssr: false })` を使った

### 3. `Element type is invalid`
- 原因:
  - `react-leaflet` を使った構成の中で、実行時に React コンポーネントとして解決されず、`object` 扱いになる箇所があった
  - 切り分けの途中で import 方法や `dynamic` の使い方が複雑になり、不安定になった
- 対応:
  - `react-leaflet` ベースの構成はいったんやめた
  - `MapContainer.tsx` では生の `leaflet` を使って地図を初期化する形に変更した

### 4. 地図はエラーなく表示されたが、画面に出なかった
- 原因:
  - 地図を入れる要素の高さが 0 になっていた
  - `h-full` を使っていても、親要素側に高さ指定がないと描画領域が確保されない
- 対応:
  - `layout.tsx` の `html`, `body` に `h-full` を追加
  - `page.tsx` に `h-screen` を追加
  - `MapContainer.tsx` の地図コンテナも `h-screen` に変更

## 今日の最終構成

### `src/app/page.tsx`
- Server Component
- `MapContainerWrapper` を表示するだけ

### `src/components/MapContainerWrapper.tsx`
- Client Component
- `dynamic(..., { ssr: false })` で `MapContainer` を読み込む

### `src/components/MapContainer.tsx`
- Client Component
- `leaflet` を直接使って地図を初期化する
- 現在地が取れたら地図を表示する

### `src/lib/hooks/useUserLocation.ts`
- カスタムフック
- 現在地取得ロジックを分離
- 取得失敗時は東京駅をデフォルト位置にする

### `src/lib/constants/leaflet.ts`
- Leaflet のデフォルトマーカー設定

## 今日学んだこと
- Next.js では Server Component と Client Component の違いが重要
- ブラウザ専用ライブラリは、Server Component からそのまま読めない
- `dynamic(..., { ssr: false })` を使う場所にも制約がある
- 画面に何も出ないときは、ロジックだけでなく CSS の高さも確認する

## 明日以降のおすすめ
- まずは現在地マーカーを 1 つ表示する
- 次に仮の登山口データを配列で置いて、複数ピンを表示する
- その後で Supabase 連携に進む

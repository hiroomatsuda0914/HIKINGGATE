# 写経用チュートリアル：上高地にピンを置く

## 現行実装（2026-04 時点）

リポジトリの実装は次に更新されています。**新しく写経する場合はソースを正**としてください。

| 項目 | 現行 |
|------|------|
| 地図 | **Mapbox GL JS**（`src/components/MapContainer.tsx`） |
| クライアント境界 | `MapContainerWrapper` の `dynamic(..., { ssr: false })`（`PROJECT.md` 参照） |
| 座標 | **`[経度, 緯度]`（WGS84）**。データのフィールド名は **`lngLat`** |
| 現在地 | `useUserLocation` が **`[longitude, latitude]`** を返す（`src/lib/hooks/useUserLocation.ts`） |
| 登山口データ（DB） | `src/lib/queries/trailheads.ts` で `lngLat: [row.lng, row.lat]` にマッピング |

---

## （アーカイブ）2026-03 時点の Leaflet 写経手順

以下は **当時 `leaflet` で地図を組んだ段階**の学習用メモです。**座標は当時 `[緯度, 経度]`（`latLng`）**、**API は Leaflet** 前提の記述が残っています。概念（`useEffect`・ref・クリーンアップ・二重実行対策）は流用できますが、**コードはそのまま貼らないでください。**

旧構成の参照:

- `MapContainer.tsx` …（当時）`leaflet` で初期化
- `src/lib/hooks/useUserLocation.ts` … Geolocation（現行は `[経度, 緯度]` に変更済み）
- `src/lib/constants/leaflet.ts` …（当時）デフォルトマーカー画像 → 現行は未使用

---

## （旧）Step 0｜ゴールと用語

**ゴール（当時）**: 地図上に「上高地」を表す **1 本のマーカー** を表示する。

**用語（当時の Leaflet 前提）**:

- 当時のメモでは **緯度・経度のタプル** を `[緯度, 経度]`（`latLng`）として扱っていた。**現行は `[経度, 緯度]`（`lngLat`）に統一**。
- **マーカー（Leaflet）** … `L.marker(latlng)` で作り、`marker.addTo(map)` で載せる。**現行は `mapboxgl.Marker`**。

代表座標の例（河童橋付近の目安）— **現行コードでは経度を先にした `lngLat: [137.6348, 36.2544]` のように持つ**:

```ts
// （参考）緯度・経度を別々に知っている場合のイメージ
const lat = 36.2544;
const lng = 137.6348;
// 現行アプリのタプル: [経度, 緯度]
const lngLat: [number, number] = [lng, lat];
```

---

## （旧）Step 1｜仮データ用の型を定義する（TypeScript）

### やること

`MapContainer.tsx` の **先頭付近**（`import` の直後、`export default function` の前）に、登山口 1 件分の形を表す型を書く。

### 写経用コード（現行では `lngLat` + `[経度, 緯度]`）

```ts
// 登山口を識別する ID は文字列、という意味の別名（型エイリアス）
type TrailheadId = string;

// 1 件の登山口データが満たすべき形（オブジェクトの型宣言）
interface Trailhead {
  id: TrailheadId; // 一意なキー（例: 'kamikochi'）
  nameJa: string; // 日本語表示名（ポップアップなどに使う）
  /** [経度, 緯度] WGS84 — Mapbox / GeoJSON と同じ並び */
  lngLat: [number, number]; // マーカーを置く座標
}
```

### 解説（TypeScript）

| 書き方 | 意味 |
|--------|------|
| `type TrailheadId = string` | 「文字列の別名」を付ける。**意味をコード上で表す**のに使う。中身は普通の `string`。 |
| `interface Trailhead { ... }` | オブジェクトの **プロパティ名と型の契約** を宣言する。クラスではない。 |
| `lngLat: [number, number]` | **タプル型**：**`[経度, 緯度]`**（現行の取り決め）。 |
| `/** ... */` | JSDoc コメント。エディタのホバー説明に出る。 |

### 解説（設計）

後で Supabase から取るときも「1 件 = この形に近いオブジェクト」にマッピングしやすくするため、**いまから `id` と `nameJa` を持たせる**。

---

## （旧）Step 2｜上高地だけの配列データを置く

### やること

型の直後に、**アプリ内の仮データ**として定数配列を置く。

### 写経用コード（`lngLat` = [経度, 緯度]）

```ts
// アプリ内の仮データ。あとから要素を増やせばピンも増やせる
const TRAILHEADS: Trailhead[] = [
  {
    id: 'kamikochi', // 内部 ID
    nameJa: '上高地', // UI / ポップアップ用の名前
    lngLat: [137.6348, 36.2544], // [経度, 緯度]（河童橋付近の目安）
  },
];
```

### 解説（TypeScript）

| 書き方 | 意味 |
|--------|------|
| `const TRAILHEADS: Trailhead[]` | 「`Trailhead` 型の要素だけを持つ配列」という **注釈（annotation）」。推論だけに任せてもよいが、**意図を明示**できる。 |
| `{ id: '...', ... }` | オブジェクトリテラル。`interface Trailhead` に書いたキーと一致させる。 |

### 解説（ロジック）

最初は要素 1 つでよい。あとから同じ形のオブジェクトを増やすだけで **複数ピン** に拡張できる。

> **注（Step 3 以降）**: 次のセクションからのコード断片は **Leaflet + 当時の `latLng`（`[緯度, 経度]`）** のままです。現行は **`mapboxgl.Marker`** と **`lngLat: [経度, 緯度]`** で `MapContainer.tsx` を参照してください。

---

## （旧）Step 3｜マーカーを差し込むための `useRef` を用意する

### やること

`MapContainer` 関数の中で、既にある `mapElementRef` / `mapInstanceRef` に加え、**Leaflet のマーカー（複数なら配列）** を保持する ref を追加する。

### 写経用コード（マーカーが 1 本の場合）

```ts
// Leaflet のマーカー複数本を保持。再レンダーしても同じ配列を指し続ける
const trailheadMarkersRef = useRef<L.Marker[]>([]);
```

### 写経用コード（最初は 1 本だけなら `L.Marker | null` でも可）

```ts
// 1 本だけなら null から始めて、作成後にマーカーを代入するパターン
const kamikochiMarkerRef = useRef<L.Marker | null>(null);
```

### 解説（TypeScript）

| 書き方 | 意味 |
|--------|------|
| `useRef<L.Marker[]>([])` | 再レンダーしても **同じ配列インスタンス** を保つ箱。初期値は空配列 `[]`。 |
| `useRef<L.Marker \| null>(null)` | 最初はマーカー未作成なので `null`、作成後は `L.Marker` を入れる。 |

### 解説（React / Leaflet）

- **マーカーを `useState` に入れない理由**: Leaflet のオブジェクトは React の state の対象にしない方が扱いやすい（再レンダーと無関係な **命令的 API** だから）。
- **ref に入れる理由**: `useEffect` のクリーンアップで **同じインスタンスを `remove()`** したい。

---

## （旧）Step 4｜地図を作った直後にマーカーを追加する

### やること

いまの「地図を `L.map` で作る `useEffect`」の中で、`mapInstanceRef.current = map;` の **後** に、上高地のマーカーを作って地図に載せる。

### 写経用コード（配列 ref 版・おすすめ）

地図作成 `useEffect` 内、`map` ができたあと:

```ts
    // 既存: タイルレイヤー追加のあと、この地図インスタンスを ref に保存
    mapInstanceRef.current = map;

    // --- ここから追加 ---
    // 前回の effect で残ったマーカーがあれば地図から外す（二重表示防止）
    trailheadMarkersRef.current.forEach((m) => m.remove());
    // 配列を空にしてから作り直す
    trailheadMarkersRef.current = [];

    // 仮データの各登山口に 1 本ずつマーカーを置く
    for (const t of TRAILHEADS) {
      const marker = L.marker(t.latLng); // 座標指定でマーカー生成
      marker.addTo(map); // この map の子レイヤーとして追加
      marker.bindPopup(t.nameJa); // クリックで表示する文字列
      trailheadMarkersRef.current.push(marker); // 後で remove するために保持
    }
    // --- ここまで ---
```

`return () => { ... }` のクリーンアップでは、**地図を `remove` する前にマーカーを外す**と安全です。

```ts
    return () => {
      // 地図を壊す前に、載せたマーカーをすべて削除
      trailheadMarkersRef.current.forEach((m) => {
        m.remove(); // DOM / レイヤーからマーカーを除去
      });
      trailheadMarkersRef.current = []; // ref 内の参照もクリア
      map.remove(); // Leaflet の地図インスタンスを破棄
      mapInstanceRef.current = null; // 次の effect で新規作成できるようにする
    };
```

### 写経用コード（単一 ref 版）

```ts
    // すでにマーカーがあれば先に消す（再実行時の二重登録防止）
    if (kamikochiMarkerRef.current) {
      kamikochiMarkerRef.current.remove();
      kamikochiMarkerRef.current = null;
    }

    const t = TRAILHEADS[0]; // いまは 1 件目だけ使う
    // 生成 → 地図へ追加 → ポップアップ紐付けをメソッドチェーンで一行に
    const marker = L.marker(t.latLng).addTo(map).bindPopup(t.nameJa);
    kamikochiMarkerRef.current = marker; // クリーンアップ用に ref に保存
```

クリーンアップ:

```ts
      if (kamikochiMarkerRef.current) {
        kamikochiMarkerRef.current.remove(); // マーカーを地図から外す
        kamikochiMarkerRef.current = null; // ref をリセット
      }
      map.remove(); // 地図本体を破棄
```

### 解説（TypeScript）

| 書き方 | 意味 |
|--------|------|
| `for (const t of TRAILHEADS)` | 配列の各要素を `t` としてループ（インデックス不要なときに読みやすい）。 |
| `trailheadMarkersRef.current.push(marker)` | ref の `.current` は **ミュータブル**。React 外のオブジェクト配列にマーカーを貯める。 |

### 解説（ロジック）

1. **`L.marker(t.latLng)`** … 指定座標にピン。`leaflet.ts` で `DefaultIcon` が既に設定されているので、青いピンが出る。
2. **`addTo(map)`** … その地図インスタンスの子レイヤーとして追加。
3. **`bindPopup`** … クリックで名前が出る（任意だがデバッグに便利）。
4. **クリーンアップで `remove`** … Strict Mode では `useEffect` が開発時に二重実行されることがある。**古いマーカーを残さない**ために重要。
5. **ループ前に `forEach(remove)`** … 同じ `useEffect` が再実行されたときの **二重登録防止**。

---

## （旧）Step 5｜`useEffect` の依存配列を確認する

### やること

地図を作っている `useEffect` の依存配列が `[userLocation]` のままなら、**現状のままでよい**場合が多いです。

- 地図は「`userLocation` が初めて取れたとき」に 1 回作り直される想定。
- `TRAILHEADS` は **ファイル内定数** なので、依存に入れなくても動く（モジュール読み込み時に固定）。

### 解説（ロジック）

もし将来 `TRAILHEADS` を **props や API 結果** に変えたら、`useEffect` の依存にその値を入れ、**データが変わったらマーカー差し替え**する必要が出る。いまは定数なのでシンプルでよい。

---

## 写経用｜1つ目と2つ目の `useEffect` をまとめる

`MapContainer` 内で **この2本をこの順番で** 並べるイメージです。`ref` 宣言の直後に置くとよいです。

### なぜ2本に分けるか

| | **1つ目** | **2つ目** |
|---|-----------|-----------|
| **やること** | 地図用 `div` に `L.map` で地図を**作る**。タイル・登山口マーカーを載せる。 | 地図が**すでにある**ときだけ、**表示中心**を `userLocation` に合わせる（`setView`） |
| **`map` 変数** | `const map = L.map(...)` は **この `useEffect` の中だけ**で使える | **参照できない**（スコープ外）。`mapInstanceRef.current` を使う |
| **クリーンアップ** | マーカー `remove` → `map.remove()` → `mapInstanceRef = null` | **不要**（地図を壊さない） |

### 写経用コード（全文・行コメント）

```tsx
  // ----- 1つ目：地図の生成・マーカー・破棄（userLocation が変わると地図を作り直す想定）-----
  useEffect(() => {
    // 位置未取得 / 地図用 DOM 未マウント / 既に Leaflet 地図あり → 何もしない
    if (!userLocation || !mapElementRef.current || mapInstanceRef.current) {
      return;
    }

    // この div に地図を1枚作り、初期中心は現在地・ズーム 13
    const map = L.map(mapElementRef.current).setView(userLocation, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map; // 2つ目の effect からも同じ地図を触れるようにする

    // 再実行時用：古いマーカーを消してから作り直す（二重ピン防止）
    trailheadMarkersRef.current.forEach((m) => m.remove());
    trailheadMarkersRef.current = [];

    for (const t of TRAILHEADS) {
      const marker = L.marker(t.latLng);
      marker.addTo(map);
      marker.bindPopup(t.nameJa);
      trailheadMarkersRef.current.push(marker);
    }

    return () => {
      // アンマウント or userLocation 変化で effect がやり直しになる前に後始末
      trailheadMarkersRef.current.forEach((m) => {
        m.remove();
      });
      trailheadMarkersRef.current = [];
      map.remove(); // この effect 内の map だけが有効
      mapInstanceRef.current = null;
    };
  }, [userLocation]);

  // ----- 2つ目：位置だけ更新（地図インスタンスは作り直さない）-----
  useEffect(() => {
    // まだ地図がない（1つ目が走る前など）は何もしない
    if (!userLocation || !mapInstanceRef.current) {
      return;
    }

    mapInstanceRef.current.setView(userLocation, 13);
  }, [userLocation]);
```

### よくある誤り（ここに書かない）

- **2つ目の先頭**に `map.remove()` / `trailheadMarkersRef` の全削除 / `mapInstanceRef.current = null` を書く  
  → `map` は **未定義**（TS2552）。また ref を `null` にしてから `setView` しようとすると **型・実行時ともにおかしい**（TS2339 など）。
- **2つ目で `map` を使う**  
  → `map` は1つ目の `{ }` の内側の変数なので、**実装場所が違う effect になっている**状態。

---

## （旧）Step 6（任意）｜現在地と上高地の両方が見えるようにする

### やること

マーカー追加後に `fitBounds` で表示範囲を広げる。

```ts
    // 現在地と全登山口を囲む矩形を作る（スプレッドで点をまとめて渡す）
    const bounds = L.latLngBounds([userLocation, ...TRAILHEADS.map((t) => t.latLng)]);
    // その範囲が画面に収まるようズーム・中心を自動調整（余白 40px）
    map.fitBounds(bounds, { padding: [40, 40] });
```

### 解説（TypeScript）

- `TRAILHEADS.map((t) => t.latLng)` … 各要素の `latLng` だけの **新しい配列** を作る。
- スプレッド `...` で `bounds` に複数点を渡す。

### 解説（ロジック）

ユーザーが遠くにいても、**上高地が画面外に出ない**ようにできる。ただしズームが低くなりすぎる場合は `maxZoom` オプションを `fitBounds` の第 2 引数に足すとよい。

---

## （旧）Step 7（整理）｜動作確認のチェックリスト

1. `npm run dev` で地図が表示される。
2. 上高地付近に **もう 1 本のピン** が出る（現在地とは別）。
3. ピンをクリックすると **「上高地」** のポップアップが出る（`bindPopup` した場合）。
4. 開発者ツールに **エラーが出ていない**。

---

## よくあるつまずき（プロジェクト固有）

| 現象 | 見る場所 |
|------|-----------|
| マーカーがずれる / 表示されない | 座標が **`[経度, 緯度]`** になっているか、`mapboxgl.Marker.setLngLat` にそのまま渡しているか。 |
| ピンがない | `useEffect` の早期 `return` で地図がまだ作られていない、またはクリーンアップで消している順序の問題。 |
| 二重にピンが増える | マーカー追加前の `remove` / 配列のクリアを忘れている。 |

`PROJECT.md` の **App Router・クライアント境界** に従い、**`MapContainer` は引き続き `'use client'`** のまま編集すること。

---

## 参考：完成イメージのファイル構造（自己確認用）

写経が終わったあと、おおむね次のような並びになるイメージです（行数は目安）。

```tsx
'use client'; // このファイルはブラウザで動く Client Component（hooks / Leaflet 利用のため）

import { useEffect, useRef } from 'react'; // 副作用と DOM/Leaflet 参照用の ref
import L from 'leaflet'; // 地図・マーカー・タイルの本体ライブラリ
import { useUserLocation } from '../lib/hooks/useUserLocation'; // 現在地 or フォールバック座標
import '../lib/constants/leaflet'; // マーカー画像パスを修正（副作用のみの import）

type TrailheadId = string; // 登山口 ID は文字列、という意味付け

interface Trailhead {
  id: TrailheadId;
  nameJa: string;
  latLng: [number, number];
}

const TRAILHEADS: Trailhead[] = [
  { id: 'kamikochi', nameJa: '上高地', latLng: [36.2544, 137.6348] },
];

export default function MapContainer() {
  const { userLocation, loading } = useUserLocation(); // 緯度経度と読み込み中フラグ
  const mapElementRef = useRef<HTMLDivElement | null>(null); // 地図を描画する div
  const mapInstanceRef = useRef<L.Map | null>(null); // Leaflet の Map インスタンス
  const trailheadMarkersRef = useRef<L.Marker[]>([]); // 登山口マーカーを配列で保持

  useEffect(() => {
    // ... 地図作成 + マーカー + クリーンアップ（付録の全文を参照）
  }, [userLocation]); // 位置が変わったら地図を作り直す想定

  // ... 以下既存の setView 用 useEffect や JSX
}
```

（既存の 2 つ目の `useEffect`（`setView` だけ）は残してもよいが、`fitBounds` を入れた場合は挙動が重複するので、あとで整理してもよい。）

---

## 参考｜`useUserLocation.ts`（要点・現行）

`MapContainer` が **`userLocation` / `loading` / `error`** をどこから来ているか把握する用です。  
パス: `src/lib/hooks/useUserLocation.ts`

- **`navigator.geolocation`** … HTTPS または `localhost` で動かすのが無難（ブラウザ・権限により拒否されうる）。
- **現行**: `userLocation` は **`[経度, 緯度]`**。成功時は `setUserLocation([position.coords.longitude, position.coords.latitude])`。

```ts
'use client'; // Client 専用：Geolocation はブラウザ API のため

import { useState, useEffect } from 'react'; // 座標の state と、マウント時の 1 回取得

// 位置情報が取れない・API 非対応のときのフォールバック [経度, 緯度]（高尾山口付近の目安）
const DEFAULT_LOCATION: [number, number] = [139.262472, 35.629097];

export function useUserLocation() {
  // 取得完了までは null。タプルは [経度, 緯度]（Mapbox と同じ並び）
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true); // true の間はまだ結果が確定していない
  const [error, setError] = useState<string | null>(null); // 失敗時にメッセージ（UI で未使用でもデバッグに使える）

  useEffect(() => {
    if (navigator.geolocation) {
      // 現在位置を 1 回だけ要求（watch ではない）
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // 成功：WGS84 を [経度, 緯度] で保持
          setUserLocation([position.coords.longitude, position.coords.latitude]);
          setLoading(false);
        },
        (error) => {
          // 拒否・タイムアウトなど：エラー文を保存し、地図はデフォルト地点で続行
          setError(error.message);
          setUserLocation(DEFAULT_LOCATION);
          setLoading(false);
        },
        {
          timeout: 5000, // 5 秒で打ち切り → エラーコールバックへ
          maximumAge: 0, // キャッシュされた位置を使わず、毎回なるべく新しい値を取る
          enableHighAccuracy: true, // GPS 優先（端末・環境により電池・時間がかかることがある）
        }
      );
    } else {
      // Geolocation 自体が無いブラウザ向け
      setUserLocation(DEFAULT_LOCATION);
      setLoading(false);
    }
  }, []); // 空配列：マウント時に一度だけ実行

  return { userLocation, loading, error }; // 呼び出し側は分割代入で使う
}
```

### 解説（データの流れ）

| 状態 | `userLocation` | `loading` |
|------|----------------|-----------|
| 初回レンダー直後 | `null` | `true` |
| 取得成功 | `[経度, 緯度]` | `false` |
| 失敗 or API なし | `DEFAULT_LOCATION` | `false` |

`MapContainer` は `loading || !userLocation` が真のあいだ「Loading map...」を出し、**座標が確定してから**地図用の `div` をマウントする想定です。

---

## 付録｜写経用コード（`MapContainer.tsx` 全文）

Step 1〜4 を一通り足し終えたあとの **完成形** です。段階を飛ばして動作確認だけしたいとき、または自分のファイルと **行ごとに突き合わせる** ときに使えます。

- `nameJa` の型は **`string`**（プリミティブ）。`String`（ラッパーオブジェクト）は避ける。
- Step 6 の `fitBounds` は **含めていません**（任意のため）。入れる場合はマーカー追加の直後に挿入。
- 写経でそのまま貼る場合は **`//` 行は削除してもよい**（学習用コメントのため）。

```tsx
'use client'; // Client Component：hooks とブラウザ API を使う

import { useEffect, useRef } from 'react'; // 副作用・ref
import L from 'leaflet'; // 地図ライブラリ
import { useUserLocation } from '../lib/hooks/useUserLocation'; // 現在地取得フック
import '../lib/constants/leaflet'; // デフォルトマーカー画像の修正（実行時に一度だけ効く）

type TrailheadId = string; // ID の型エイリアス

interface Trailhead {
  id: TrailheadId; // 一意キー
  nameJa: string; // 日本語名
  latLng: [number, number]; // [緯度, 経度]
}

const TRAILHEADS: Trailhead[] = [
  {
    id: 'kamikochi',
    nameJa: '上高地',
    latLng: [36.2544, 137.6348],
  },
];

export default function MapContainer() {
  const { userLocation, loading } = useUserLocation(); // 座標とローディング
  const mapElementRef = useRef<HTMLDivElement | null>(null); // 地図コンテナ DOM
  const mapInstanceRef = useRef<L.Map | null>(null); // L.Map インスタンス
  const trailheadMarkersRef = useRef<L.Marker[]>([]); // 登山口マーカー一覧

  useEffect(() => {
    // 位置未取得・DOM 未準備・既に地図があるときは何もしない
    if (!userLocation || !mapElementRef.current || mapInstanceRef.current) {
      return;
    }

    // div に地図を生成し、初期中心とズーム 13
    const map = L.map(mapElementRef.current).setView(userLocation, 13);

    // OpenStreetMap のタイルを読み込み、著作権表記付きで地図に重ねる
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map; // 他の effect から参照できるよう保存

    // 古いマーカーを掃除（Strict Mode 再実行や userLocation 変更対策）
    trailheadMarkersRef.current.forEach((m) => m.remove());
    trailheadMarkersRef.current = [];

    // 仮データごとにマーカーを作成して地図に載せる
    for (const t of TRAILHEADS) {
      const marker = L.marker(t.latLng);
      marker.addTo(map);
      marker.bindPopup(t.nameJa);
      trailheadMarkersRef.current.push(marker);
    }

    return () => {
      // アンマウント時：マーカー → 地図の順で後始末
      trailheadMarkersRef.current.forEach((m) => {
        m.remove();
      });
      trailheadMarkersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [userLocation]); // userLocation が変わると地図を作り直す

  useEffect(() => {
    // 地図はあるが初期化 effect より後に位置だけ更新したい場合
    if (!userLocation || !mapInstanceRef.current) {
      return;
    }

    mapInstanceRef.current.setView(userLocation, 13); // 中心を現在地に合わせる
  }, [userLocation]);

  if (loading || !userLocation) {
    // ジオロケーション待ちの間は地図用 div を出さない
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <p> Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      {/* この div に Leaflet が地図を描画する */}
      <div ref={mapElementRef} className="w-full h-full" />
    </div>
  );
}
```

---

## 変更履歴（このドキュメント）

- 2026-04-11: **現行実装（Mapbox・`lngLat`）**を冒頭に追記。旧 Leaflet 手順を「アーカイブ」として明示。Step 1〜2 の型・サンプル座標を現行の取り決めに合わせて更新
- 2026-03-22: 「写経用｜1つ目と2つ目の `useEffect` をまとめる」を追加（役割表・全文・よくある誤り）
- 2026-03-22: 参考「`useUserLocation.ts` 全文（行ごとのコメント）」を追加
- 2026-03-22: 各写経用コードブロック・付録全文に **行ごとの日本語コメント** を追加
- 2026-03-22: 付録「写経用コード（`MapContainer.tsx` 全文）」を追加
- 2026-03-21: 初版（上高地 1 ピン・写経ステップ）

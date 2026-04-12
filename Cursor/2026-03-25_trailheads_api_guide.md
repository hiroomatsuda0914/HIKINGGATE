# `/api/trailheads` 接続ガイド（写経用）

> **座標の取り決め（2026-04 〜）**: API レスポンスとフロントの型は **`lngLat: [経度, 緯度]`**（WGS84）に揃える。以下の型定義・サンプル座標はその前提。

今日はまず「地図に出す登山口データ」を、フロント側の直書きから API 取得に置き換えるための手順を書きます。

## ゴール
- `src/components/MapContainer.tsx` が `/api/trailheads` を `fetch` して
  - `trailheads` と `summits` を受け取り
  - その配列でピン（マーカー）描画と `fitBounds` を行う

## 事前状況（このガイドに含める意図）
- `MapContainer.tsx` には一旦 `TRAILHEADS` / `SUMMITS` がコード内に直書きされています。
- それを `/api/trailheads` のレスポンスに置き換えます。
- 既にこちらで作った `route.ts` は削除済みなので、**ここに写経用の `route.ts` 内容をそのまま載せます**。

---

## 1) API Route の写経（`route.ts`）
次の場所にファイルを作成します（App Router のルール）:

`src/app/api/trailheads/route.ts`

以下をそのままコピペしてください。

```ts
import type { NextRequest } from 'next/server';

type Trailhead = {
  id: string;
  nameJa: string;
  lngLat: [number, number];
};

type Summit = {
  id: string;
  nameJa: string;
  lngLat: [number, number];
};

const trailheads: Trailhead[] = [
  {
    id: 'kamikochi',
    nameJa: '上高地',
    lngLat: [137.6348, 36.2544],
  },
];

const summits: Summit[] = [
  {
    id: 'yarigatake',
    nameJa: '槍ヶ岳',
    lngLat: [137.6476, 36.3414],
  },
];

export async function GET(_req: NextRequest) {
  return Response.json({ trailheads, summits });
}
```

### 解説（API側）
- `GET` で `trailheads` と `summits` を JSON で返します。
- 最初は固定データでOK（次は Supabase など DB に切り替える前段）。
- `MapContainer` はこのレスポンスを読んで、受け取った座標にピンを置く（Mapbox の `setLngLat` は `lngLat` をそのまま渡せる）。

---

## 2) `MapContainer.tsx` の写経（APIから受け取って描画）

### 2-1) `useState` を追加
`src/components/MapContainer.tsx` の import を変更してください。

変更前:
```ts
import { useEffect, useRef } from 'react';
```

変更後:
```ts
import { useEffect, useRef, useState } from 'react';
```

### 2-2) `TRAILHEADS` / `SUMMITS` を削除
`const TRAILHEADS` / `const SUMMITS` は API 用のデータになるので、削除（または後で切り替えやすいように一旦コメントアウト）してください。

### 2-3) state + fetch を追加
`export default function MapContainer() {` の直後あたりに、以下を追加してください。

```ts
  const [trailheads, setTrailheads] = useState<Trailhead[] | null>(null);
  const [summits, setSummits] = useState<Summit[] | null>(null);
  const [trailheadsError, setTrailheadsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/trailheads', { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: { trailheads: Trailhead[]; summits: Summit[] } = await res.json();
        if (cancelled) return;

        setTrailheads(data.trailheads);
        setSummits(data.summits);
      } catch (e) {
        if (cancelled) return;
        setTrailheadsError(e instanceof Error ? e.message : 'Failed to load trailheads');
        setTrailheads([]);
        setSummits([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);
```

### 2-4) ローディング判定を拡張
現状の
```ts
if (loading || !userLocation) { ... }
```
を、

```ts
if (loading || !userLocation || !trailheads || !summits) { ... }
```
に変更してください。

### 2-5) 地図初期化 useEffect の依存配列を変更
`useEffect(() => { ... }, [userLocation]);` を

```ts
}, [userLocation, trailheads, summits]);
```
にしてください。

あわせて、useEffect 内の `if` で `trailheads/summits` 未取得時に抜けるようにします。

例:
```ts
if (!userLocation || !mapElementRef.current || mapInstanceRef.current || !trailheads || !summits) {
  return;
}
```

### 2-6) 直書き配列を state に差し替え
次の箇所を差し替えます。

- `for (const t of TRAILHEADS)` → `for (const t of trailheads)`
- `for (const s of SUMMITS)` → `for (const s of summits)`
- `fitBounds` の `TRAILHEADS.map((t) => t.lngLat)` → `trailheads.map((t) => t.lngLat)` など（各点は `[経度, 緯度]`）
- `SUMMITS` も同様に `summits.map((s) => s.lngLat)`

---

## 3) 動作確認（短く）
- サーバ起動: `npm run dev`
- ブラウザで `http://localhost:3000/api/trailheads` を開く
  - `trailheads` / `summits` が JSON で返れば OK
- 画面でピン（`上高地` / `槍ヶ岳`）が出れば OK

---

## 補足（この次にやることの方向性）
- 今は固定データなので、次は DB（Supabase）から取得するように `/api/trailheads` を置き換えるのが自然です。
- その時点で `Trailhead` / `Summit` の型をレスポンスに合わせて少しずつ寄せていくと安全です。

